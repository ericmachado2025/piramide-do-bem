import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginQr() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(false)
  const [error, setError] = useState('')
  const [tokenData, setTokenData] = useState<{ operation_type: string; payload: Record<string, unknown>; status: string; is_expired: boolean } | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    if (!token) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate(`/login?return=/login-qr/${token}`, { replace: true })
        return
      }

      setUserEmail(session.user.email || '')

      supabase.rpc('get_operation_token', { p_token: token }).then(({ data, error: rpcErr }) => {
        if (rpcErr || !data) {
          setError('Link invalido ou ja utilizado.')
          setLoading(false)
          return
        }

        const d = data as { operation_type: string; payload: Record<string, unknown>; status: string; is_expired: boolean }

        if (d.operation_type !== 'login_web') {
          setError('Este link nao e de login.')
          setLoading(false)
          return
        }

        if (d.is_expired || d.status !== 'pending') {
          setError(d.is_expired ? 'QR expirado. Gere um novo no computador.' : 'Este login ja foi processado.')
          setLoading(false)
          return
        }

        setTokenData(d)
        setLoading(false)
      })
    })
  }, [token, navigate])

  const handleApprove = async () => {
    if (approving || !token) return
    setApproving(true)
    setError('')

    const { data: result, error: rpcErr } = await supabase.rpc('approve_login_qr', { p_token: token })

    if (rpcErr) {
      setError(rpcErr.message)
      setApproving(false)
      return
    }

    if (result && !result.success) {
      setError(result.error || 'Erro ao aprovar')
      setApproving(false)
      return
    }

    setApproved(true)
    setApproving(false)

    setTimeout(() => window.close(), 5000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal/5 to-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal" />
      </div>
    )
  }

  if (approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#10003;</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Login autorizado!</h2>
          <p className="text-gray-500">Volte ao computador para continuar.</p>
          <p className="text-sm text-gray-400 mt-4">Fechando em 5s...</p>
          <button onClick={() => window.close()} className="mt-3 text-teal underline text-sm">
            Fechar
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#128533;</div>
          <h2 className="text-xl font-bold text-gray-700">{error}</h2>
        </div>
      </div>
    )
  }

  const sessionHint = (tokenData?.payload?.session_hint as string) || 'Navegador desconhecido'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal/5 to-white p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">&#128187;</div>
          <h1 className="text-xl font-bold text-gray-800">Autorizar Login</h1>
          <p className="text-gray-500 mt-2">
            {sessionHint}
          </p>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-gray-600">Entrar com sua conta</p>
          <p className="font-bold text-gray-900">{userEmail}</p>
        </div>

        <p className="text-xs text-red-500 text-center mb-4 font-medium">
          So aprove se foi voce que iniciou o login no computador.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleApprove}
            disabled={approving}
            className={`w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all bg-green-600 hover:bg-green-700 ${
              approving ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {approving ? 'Autorizando...' : 'Autorizar Login'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 rounded-xl font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
