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
    const { to, channel, code, type, childName, referrerName, referralCode, referralUrl } = await req.json()

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const whatsappFrom = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886'
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
        subject = `${referrerName} te convidou para a Piramide do Bem Escolar!`
        html = `
          <h2>${referrerName} te convidou para a Piramide do Bem Escolar!</h2>
          <p>Faca boas acoes, ganhe pontos e evolua seu personagem.</p>
          <p><a href="${referralUrl || `${appUrl}/?ref=${referralCode}`}">Criar minha conta agora</a></p>
          <p>&mdash; Equipe Piramide do Bem Escolar<br>piramidedobem.com.br</p>
        `
      } else if (type === 'phone_changed') {
        subject = 'Seu telefone foi alterado - Piramide do Bem Escolar'
        html = `
          <h2>Telefone atualizado</h2>
          <p>Seu numero de telefone/WhatsApp foi atualizado na Piramide do Bem Escolar.</p>
          <p>Se nao foi voce, acesse <a href="${appUrl}">piramidedobem.com.br</a> imediatamente e entre em contato conosco.</p>
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
      // Use Content Template for WhatsApp
      params.append('ContentSid', 'HX06f396a69a7684990635393d11344a0a')
      params.append('ContentVariables', JSON.stringify({ '1': code }))
    } else {
      // SMS uses Body directly
      let body = ''
      if (type === 'parent_auth') {
        body = `Piramide do Bem Escolar: ${childName} quer entrar na plataforma. Acesse para autorizar: ${appUrl}/autorizar?token=${code}`
      } else if (type === 'delete_account') {
        body = `Piramide do Bem Escolar: Seu codigo para EXCLUIR sua conta e ${code}. Se nao foi voce, ignore esta mensagem.`
      } else {
        body = `Piramide do Bem Escolar: seu codigo de verificacao e *${code}*. Valido por 10 minutos.`
      }
      params.append('Body', body)
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
