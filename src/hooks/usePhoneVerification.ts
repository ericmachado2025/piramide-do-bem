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
      // Save code to DB
      await supabase.from('phone_verifications').insert({
        phone,
        code,
        verified: false,
        created_at: new Date().toISOString(),
      })

      // Try Edge Function for Twilio
      const { data, error: fnError } = await supabase.functions.invoke('send-verification', {
        body: { to: phone, channel, code, type: 'verification' },
      })

      if (fnError || !data?.success) {
        // Fallback: code saved in DB, show message to check console
        console.log(`[Piramide do Bem] Codigo: ${code}`)
      }

      setStatus('sent')
    } catch {
      // Fallback mode
      console.log(`[Piramide do Bem] Codigo: ${code}`)
      setStatus('sent')
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
      setStatus('sent') // fallback - token already saved
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
      setError('Codigo incorreto. Tente novamente.')
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
