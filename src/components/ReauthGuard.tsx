import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ReauthGuardProps {
  reason: string
  onConfirmed: () => void
  onCancel: () => void
}

export default function ReauthGuard({ reason, onConfirmed, onCancel }: ReauthGuardProps) {
  const { user } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [verifying, setVerifying] = useState(false)

  // Send OTP on mount
  useEffect(() => {
    async function sendOtp() {
      setSending(true)
      const { error: reErr } = await supabase.auth.reauthenticate()
      if (reErr) {
        setError(`Erro ao enviar codigo: ${reErr.message}`)
      } else {
        setSent(true)
      }
      setSending(false)
    }
    sendOtp()
  }, [])

  const handleVerify = async () => {
    if (code.length !== 6) return
    setVerifying(true)
    setError('')

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      type: 'email',
      token: code,
      email: user?.email || '',
    })

    if (verifyErr) {
      setError('Codigo incorreto. Tente novamente.')
      setVerifying(false)
    } else {
      onConfirmed()
    }
  }

  const maskedEmail = user?.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : '***'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-4">
          <span className="text-4xl block mb-2">{'\uD83D\uDD10'}</span>
          <h3 className="text-lg font-bold text-navy">Confirme sua identidade</h3>
          <p className="text-gray-500 text-sm mt-1">{reason}</p>
        </div>

        {sending && (
          <div className="flex items-center justify-center gap-2 py-4 text-teal">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Enviando codigo...</span>
          </div>
        )}

        {sent && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Enviamos um codigo para <strong>{maskedEmail}</strong>
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && handleVerify()}
              placeholder="Codigo de 6 digitos"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg text-center tracking-widest"
              autoFocus
              maxLength={6}
            />
            {error && <p className="text-sm text-center text-red">{error}</p>}
          </div>
        )}

        {!sending && !sent && error && (
          <p className="text-sm text-center text-red mb-3">{error}</p>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleVerify}
            disabled={code.length !== 6 || verifying || !sent}
            className="flex-1 py-3 rounded-xl bg-teal text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1">
            {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
