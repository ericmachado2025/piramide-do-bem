import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

type VerificationStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error'

export function usePhoneVerification() {
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [error, setError] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')

  const sendCode = useCallback(async (phone: string, channel: 'whatsapp' | 'sms' = 'whatsapp') => {
    setStatus('sending')
    setError('')
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setGeneratedCode(code)

    try {
      await supabase.from('phone_verifications').insert({
        phone, code, verified: false, created_at: new Date().toISOString(),
      })

      const { data, error: fnError } = await supabase.functions.invoke('send-verification', {
        body: { to: phone, channel, code, type: 'verification' },
      })

      if (fnError || !data?.success) {
        if (channel === 'whatsapp') {
          const { data: smsData } = await supabase.functions.invoke('send-verification', {
            body: { to: phone, channel: 'sms', code, type: 'verification' },
          })
          if (!smsData?.success) {
            setError('Não foi possível enviar o código. Verifique o número e tente novamente.')
          }
        } else {
          setError('Não foi possível enviar o código. Tente via WhatsApp.')
        }
      }
      setStatus('sent')
    } catch {
      setError('Erro ao enviar código. Verifique sua conexão.')
      setStatus('error')
    }
  }, [])

  const sendParentAuth = useCallback(async (phone: string, childName: string, token: string, channel: 'whatsapp' | 'sms' = 'whatsapp') => {
    setStatus('sending')
    setError('')
    try {
      await supabase.functions.invoke('send-verification', {
        body: { to: phone, channel, code: token, type: 'parent_auth', childName },
      })
      setStatus('sent')
    } catch {
      setStatus('sent')
    }
  }, [])

  const verifyCode = useCallback((input: string) => {
    setStatus('verifying')
    if (input === generatedCode) {
      setStatus('verified')
      setError('')
      return true
    } else {
      setStatus('error')
      setError('Código incorreto. Tente novamente.')
      return false
    }
  }, [generatedCode])

  const reset = useCallback(() => {
    setStatus('idle')
    setError('')
    setGeneratedCode('')
  }, [])

  return { sendCode, sendParentAuth, verifyCode, reset, status, error }
}
