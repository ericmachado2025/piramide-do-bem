import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TEMPLATES WHATSAPP:
// UTILITY (sem janela 24h): confirmacao_operacao_pt — HX3ed7f77c5f07218022b0bc381f4649b6
//   Body: "Piramide do Bem Escolar: Confirmar operacao com {{1}} - Nao compartilhe essa mensagem."
//   Botao: "Aprovar Operacao" -> URL com {{2}}
// UTILITY (pendente aprovacao): notificacao_utility_pt — HX243a4b350810f508b36b1a1cde43584e
//   Body: "Piramide do Bem Escolar: {{1}}"
//   Botao: "Ver detalhes"
// MARKETING (precisa janela 24h - NAO usar como default): copy_notificacao_piramide_pt — HX382a080c077f7f27dc6a65cdb8b3c67b
//
// NOVOS TEMPLATES (submetidos 2026-04-17, pendentes aprovacao Meta):
// confirmacao_detalhada_pt — HX1c53262d2ce44b2b1384436705bce1f5 — UTILITY call-to-action com descricao enriquecida
// aprovacao_inline_pt — HX01de1887c012f8228a82865c74fad7d3 — UTILITY Quick Reply (Opcao 3)

const TEMPLATE_UTILITY_CONFIRM = 'HX3ed7f77c5f07218022b0bc381f4649b6'  // Sempre funciona
const TEMPLATE_UTILITY_NOTIFY  = 'HX243a4b350810f508b36b1a1cde43584e'  // Pendente aprovacao
const TEMPLATE_MARKETING       = 'HX382a080c077f7f27dc6a65cdb8b3c67b'  // Precisa janela 24h

// Env-based template overrides (ativados quando Meta aprovar os novos templates)
const TEMPLATE_DETALHADA_SID = Deno.env.get('TWILIO_TEMPLATE_DETALHADA_SID') || null
const TEMPLATE_INLINE_SID = Deno.env.get('TWILIO_TEMPLATE_APROVACAO_INLINE') || null

// Tipos que sao confirmacao de operacao (codigo + botao Aprovar)
const CONFIRM_TYPES = ['verification', 'transfer_confirm', 'benefit_confirm',
  'parent_auth', 'delete_account', 'resgate_confirm', 'phone_verify', 'operation_confirm']

// Tipos que sao notificacao informativa
const NOTIFY_TYPES = ['notification', 'action_validated', 'credits_received',
  'level_up', 'help_offered', 'friendship_accepted', 'cadastro_approved']

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { to, channel, code, type, childName, referrerName, referralCode, referralUrl,
            ContentSid, ContentVariables, message, confirmUrl, descricao } = body

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const whatsappFrom = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+556181247083'
    const smsFrom = Deno.env.get('TWILIO_SMS_NUMBER') || '+14155238886'
    const appUrl = Deno.env.get('APP_URL') || 'https://piramidedobem.com.br'
    const resendKey = Deno.env.get('RESEND_API_KEY')

    // Email-based types use Resend
    if (type === 'referral_invite' || type === 'phone_changed') {
      if (!resendKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'Resend not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      let subject = ''
      let html = ''

      if (type === 'referral_invite') {
        subject = `${referrerName || 'Um amigo'} te convidou para a Piramide do Bem Escolar!`
        html = `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1F4E79 0%, #028090 100%); border-radius: 16px; padding: 30px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">Piramide do Bem Escolar</h1>
              <p style="opacity: 0.8; margin: 8px 0 0;">Gamificacao de boas acoes</p>
            </div>
            <div style="padding: 24px 0;">
              <h2 style="color: #1F4E79; margin: 0 0 12px;">${referrerName || 'Um amigo'} te convidou!</h2>
              <p style="color: #555; line-height: 1.6;">Faca boas acoes na escola, ganhe pontos, evolua personagens de universos como Marvel, Dragon Ball, Harry Potter e muito mais!</p>
              <div style="text-align: center; margin: 24px 0;">
                <a href="${referralUrl || `${appUrl}/?ref=${referralCode}`}" style="background: #028090; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">Criar minha conta agora</a>
              </div>
              <p style="color: #999; font-size: 12px; text-align: center;">Ao se cadastrar pelo link, ${referrerName || 'seu amigo'} ganha pontos bonus!</p>
            </div>
            <div style="border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
              <p style="color: #999; font-size: 12px;">&mdash; Equipe Piramide do Bem Escolar<br>piramidedobem.com.br</p>
            </div>
          </div>
        `
      } else if (type === 'phone_changed') {
        subject = 'Seu telefone foi alterado - Piramide do Bem Escolar'
        html = `
          <h2>Telefone atualizado</h2>
          <p>Seu numero de telefone/WhatsApp foi atualizado na Piramide do Bem Escolar.</p>
          <p>Se nao foi voce, acesse <a href="${appUrl}">piramidedobem.com.br</a> imediatamente.</p>
          <p>&mdash; Equipe Piramide do Bem Escolar</p>
        `
      }

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Piramide do Bem Escolar <noreply@piramidedobem.com.br>',
          to: [to],
          subject,
          html,
        }),
      })

      const emailResult = await emailRes.json()
      return new Response(
        JSON.stringify({ success: emailRes.ok, id: emailResult.id, error: emailResult.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // WhatsApp/SMS types use Twilio
    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const from = channel === 'whatsapp' ? whatsappFrom : smsFrom
    const toFormatted = channel === 'whatsapp' ? `whatsapp:${to}` : to

    const params = new URLSearchParams()
    params.append('From', from)
    params.append('To', toFormatted)

    if (channel === 'whatsapp') {
      // Se o frontend passou ContentSid/ContentVariables explicitos, usar esses
      if (ContentSid && ContentVariables) {
        params.append('ContentSid', ContentSid)
        params.append('ContentVariables', typeof ContentVariables === 'string' ? ContentVariables : JSON.stringify(ContentVariables))
      }
      // Confirmacao de operacao (UTILITY - funciona sem janela 24h)
      else if (CONFIRM_TYPES.includes(type)) {
        // Se template detalhado estiver disponivel (aprovado pela Meta), usar ele
        const templateSid = TEMPLATE_DETALHADA_SID || TEMPLATE_UTILITY_CONFIRM
        params.append('ContentSid', templateSid)
        params.append('ContentVariables', JSON.stringify({
          '1': descricao || code || message || 'Codigo',
          '2': confirmUrl || `${appUrl}/confirmar/${code || ''}`
        }))
      }
      // Notificacao informativa — usar UTILITY confirm como fallback
      else {
        params.append('ContentSid', TEMPLATE_UTILITY_CONFIRM)
        params.append('ContentVariables', JSON.stringify({
          '1': code || message || 'Notificacao',
          '2': `${appUrl}/home`
        }))
      }
    } else {
      let smsBody = ''
      if (type === 'parent_auth') {
        smsBody = `Piramide do Bem Escolar: ${childName} quer entrar na plataforma. Acesse para autorizar: ${appUrl}/autorizar?token=${code}`
      } else if (type === 'delete_account') {
        smsBody = `Piramide do Bem Escolar: Seu codigo para EXCLUIR sua conta e ${code}. Se nao foi voce, ignore esta mensagem.`
      } else {
        smsBody = `Piramide do Bem Escolar: seu codigo de verificacao e *${code}*. Valido por 10 minutos.`
      }
      params.append('Body', smsBody)
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
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
