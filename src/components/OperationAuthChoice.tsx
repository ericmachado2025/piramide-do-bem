import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  hasTotp: boolean
  operationDescription: string
  onConfirm: (method: 'totp' | 'whatsapp') => void
  onCancel: () => void
}

export default function OperationAuthChoice({ hasTotp, operationDescription, onConfirm, onCancel }: Props) {
  const [showTotpInput, setShowTotpInput] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [totpError, setTotpError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleTotpVerify = async () => {
    if (totpCode.length !== 6) return
    setVerifying(true)
    setTotpError('')

    try {
      // Get first TOTP factor
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totpFactor = factors?.totp?.[0]
      if (!totpFactor) {
        setTotpError('Nenhum autenticador configurado')
        setVerifying(false)
        return
      }

      // Create challenge
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })
      if (challengeErr || !challenge) {
        setTotpError('Erro ao criar desafio')
        setVerifying(false)
        return
      }

      // Verify
      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: totpCode,
      })

      if (verifyErr) {
        setTotpError('Codigo invalido. Tente novamente.')
        setTotpCode('')
        setVerifying(false)
        return
      }

      // Sync has_totp
      await supabase.rpc('sync_has_totp_for_user')
      onConfirm('totp')
    } catch {
      setTotpError('Erro ao verificar codigo')
    }
    setVerifying(false)
  }

  if (showTotpInput) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg font-bold text-gray-800 mb-1">Codigo do Autenticador</p>
          <p className="text-sm text-gray-500">{operationDescription}</p>
        </div>
        <input
          type="text"
          inputMode="numeric"
          placeholder="000000"
          value={totpCode}
          onChange={(e) => { setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setTotpError('') }}
          onKeyDown={(e) => e.key === 'Enter' && totpCode.length === 6 && handleTotpVerify()}
          className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-3xl text-center tracking-widest font-bold"
          autoFocus
        />
        {totpError && <p className="text-sm text-red-500 text-center">{totpError}</p>}
        <button
          onClick={handleTotpVerify}
          disabled={totpCode.length !== 6 || verifying}
          className="w-full py-3.5 rounded-xl font-bold text-lg text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-all"
        >
          {verifying ? 'Verificando...' : 'Confirmar'}
        </button>
        <button onClick={() => { setShowTotpInput(false); setTotpCode(''); setTotpError('') }}
          className="w-full py-2 text-sm text-gray-400 hover:text-teal">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <p className="text-lg font-bold text-gray-800 mb-1">Confirmar operacao</p>
        <p className="text-sm text-gray-500">{operationDescription}</p>
      </div>

      {hasTotp ? (
        <>
          <button
            onClick={() => setShowTotpInput(true)}
            className="w-full py-3.5 rounded-xl font-bold text-lg text-white bg-green-600 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
          >
            <span>&#128274;</span> Usar Autenticador
          </button>
          <button
            onClick={() => onConfirm('whatsapp')}
            className="w-full py-2 text-sm text-gray-400 hover:text-teal text-center"
          >
            ou receber por WhatsApp
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onConfirm('whatsapp')}
            className="w-full py-3.5 rounded-xl font-bold text-lg text-white bg-green-600 hover:bg-green-700 transition-all flex items-center justify-center gap-2"
          >
            <span>&#128172;</span> Receber codigo no WhatsApp
          </button>
          <p className="text-xs text-gray-400 text-center">
            Ative o autenticador no seu perfil para aprovacoes instantaneas
          </p>
        </>
      )}

      <button onClick={onCancel} className="w-full py-2 text-sm text-gray-400 hover:text-teal text-center">
        Cancelar
      </button>
    </div>
  )
}
