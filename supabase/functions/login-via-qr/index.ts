import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token obrigatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find the approved login token
    const { data: opToken, error: fetchErr } = await supabaseAdmin
      .from('operation_tokens')
      .select('id, user_id, status, operation_type, expires_at')
      .eq('token', token)
      .single();

    if (fetchErr || !opToken) {
      return new Response(JSON.stringify({ error: 'Token nao encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (opToken.operation_type !== 'login_web') {
      return new Response(JSON.stringify({ error: 'Token nao e de login' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (opToken.status !== 'approved') {
      return new Response(JSON.stringify({ error: 'Token nao foi aprovado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!opToken.user_id) {
      return new Response(JSON.stringify({ error: 'Nenhum usuario associado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user email for magic link generation
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.admin.getUserById(opToken.user_id);
    if (userErr || !user?.email) {
      return new Response(JSON.stringify({ error: 'Usuario nao encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate magic link to create a session
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
    });

    if (linkErr || !linkData) {
      return new Response(JSON.stringify({ error: 'Erro ao gerar sessao: ' + (linkErr?.message || 'unknown') }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract the token hash from the link and verify OTP to get session tokens
    const url = new URL(linkData.properties.action_link);
    const tokenHash = url.searchParams.get('token') || url.hash?.split('token=')[1]?.split('&')[0];

    // Use verifyOtp with token_hash to get actual session tokens
    const { data: verifyData, error: verifyErr } = await supabaseAdmin.auth.verifyOtp({
      token_hash: tokenHash || '',
      type: 'magiclink',
    });

    if (verifyErr || !verifyData?.session) {
      return new Response(JSON.stringify({ error: 'Erro ao criar sessao: ' + (verifyErr?.message || 'no session') }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark token as used
    await supabaseAdmin
      .from('operation_tokens')
      .update({ status: 'used' })
      .eq('id', opToken.id);

    return new Response(JSON.stringify({
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno: ' + (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
