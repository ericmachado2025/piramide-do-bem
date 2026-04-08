import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, channel, code, type, childName } = await req.json()

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const whatsappFrom = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886'
    const smsFrom = Deno.env.get('TWILIO_SMS_NUMBER') || '+14155238886'
    const appUrl = Deno.env.get('APP_URL') || 'https://piramidedobem.com.br'

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = type === 'parent_auth'
      ? `Piramide do Bem Escolar: ${childName} quer entrar na plataforma. Acesse para autorizar: ${appUrl}/autorizar?token=${code}`
      : `Piramide do Bem Escolar: seu codigo de verificacao e *${code}*. Valido por 10 minutos.`

    const from = channel === 'whatsapp' ? whatsappFrom : smsFrom
    const toFormatted = channel === 'whatsapp' ? `whatsapp:${to}` : to

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: from, To: toFormatted, Body: body }),
      }
    )

    const result = await response.json()
    return new Response(
      JSON.stringify({ success: !result.error_code, sid: result.sid, error: result.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
