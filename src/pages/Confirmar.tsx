import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ConfirmLayout,
  ConfirmTransfer,
  ConfirmRewardRedeem,
  ConfirmActionValidation,
  ConfirmLoginWeb,
  ConfirmProfileChange,
  ConfirmDeleteAccount,
  ConfirmParentAuth,
  ConfirmPhoneVerify,
} from '../components/ConfirmScreens'

interface TokenData {
  id: string
  operation_type: string
  payload: Record<string, unknown>
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'used'
  expires_at: string
  is_expired: boolean
  created_at: string
}

export default function Confirmar() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!token) {
      setNotFound(true)
      setLoading(false)
      return
    }

    supabase.rpc('get_operation_token', { p_token: token }).then(({ data: result, error }) => {
      if (error || !result) {
        setNotFound(true)
      } else {
        setData(result as TokenData)
      }
      setLoading(false)
    })
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal/5 to-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal" />
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#128533;</div>
          <h2 className="text-xl font-bold text-gray-700">Link invalido ou ja utilizado</h2>
          <p className="text-gray-500 mt-2">
            Se acredita que isso e um erro, fale com o remetente.
          </p>
        </div>
      </div>
    )
  }

  const effectiveStatus: TokenData['status'] = data.is_expired && data.status === 'pending'
    ? 'expired'
    : data.status

  const handleApprove = async () => {
    const { data: result, error } = await supabase.rpc('approve_operation', {
      p_token: token,
      p_user_agent: navigator.userAgent,
    })
    if (error) throw new Error(error.message)
    if (result && !result.success) throw new Error(result.error || 'Erro desconhecido')
  }

  const handleReject = async () => {
    await supabase.rpc('approve_operation', { p_token: token })
    // For now, rejection just closes the page
    window.close()
  }

  const renderContent = () => {
    const payload = data.payload as Record<string, unknown>
    switch (data.operation_type) {
      case 'transfer':
        return <ConfirmTransfer payload={payload} />
      case 'reward_redeem':
        return <ConfirmRewardRedeem payload={payload} />
      case 'action_validation':
        return <ConfirmActionValidation payload={payload} />
      case 'login_web':
        return <ConfirmLoginWeb payload={payload} />
      case 'profile_change':
        return <ConfirmProfileChange payload={payload} />
      case 'delete_account':
        return <ConfirmDeleteAccount />
      case 'parent_auth':
        return <ConfirmParentAuth payload={payload} />
      case 'phone_verify':
        return <ConfirmPhoneVerify payload={payload} />
      default:
        return (
          <div className="text-center text-gray-500">
            <p>Tipo de operacao nao suportado.</p>
          </div>
        )
    }
  }

  const titleMap: Record<string, string> = {
    transfer: 'Confirmar Transferencia',
    reward_redeem: 'Resgatar Recompensa',
    action_validation: 'Validar Acao',
    login_web: 'Autorizar Login',
    profile_change: 'Alterar Perfil',
    delete_account: 'Excluir Conta',
    parent_auth: 'Autorizar Responsavel',
    phone_verify: 'Verificar WhatsApp',
  }

  return (
    <ConfirmLayout
      title={titleMap[data.operation_type] || 'Confirmar Operacao'}
      status={effectiveStatus}
      onApprove={handleApprove}
      onCancel={effectiveStatus === 'pending' ? handleReject : undefined}
      approveLabel={data.operation_type === 'delete_account' ? 'Confirmar Exclusao' : 'Aprovar'}
      approveColor={
        data.operation_type === 'delete_account'
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-green-600 hover:bg-green-700'
      }
      successMessage={
        data.operation_type === 'transfer'
          ? 'Transferencia aprovada!'
          : data.operation_type === 'login_web'
            ? 'Login autorizado! Volte ao computador.'
            : 'Operacao aprovada!'
      }
    >
      {renderContent()}
    </ConfirmLayout>
  )
}
