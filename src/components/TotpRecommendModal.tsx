import { useNavigate } from 'react-router-dom'

interface Props {
  onDismiss: () => void
}

export default function TotpRecommendModal({ onDismiss }: Props) {
  const navigate = useNavigate()
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isAndroid = /Android/.test(ua)

  const googleUrl = isIOS
    ? 'https://apps.apple.com/app/google-authenticator/id388497605'
    : 'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2'

  const microsoftUrl = isIOS
    ? 'https://apps.apple.com/app/microsoft-authenticator/id983156458'
    : 'https://play.google.com/store/apps/details?id=com.azure.authenticator'

  const handleOpenStore = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">&#9989;</div>
          <h3 className="font-bold text-navy text-lg">Operacao concluida!</h3>
        </div>

        <p className="text-sm text-gray-600 text-center mb-4">
          Gostaria de ativar um autenticador e ter aprovacoes instantaneas sem depender de WhatsApp?
        </p>

        <div className="space-y-2 mb-4">
          <button
            onClick={() => handleOpenStore(googleUrl)}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
          >
            Ativar Google Authenticator
          </button>
          <button
            onClick={() => handleOpenStore(microsoftUrl)}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            Ativar Microsoft Authenticator
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mb-3">
          {isAndroid || isIOS
            ? 'Apos instalar, volte e va em Perfil > Seguranca > Ativar Autenticador'
            : 'Instale no seu celular e ative em Perfil > Seguranca'}
        </p>

        <button
          onClick={() => { navigate('/perfil'); onDismiss() }}
          className="w-full py-2 rounded-xl border border-teal text-teal font-semibold text-sm hover:bg-teal/5 transition-colors mb-2"
        >
          Ir para Perfil agora
        </button>

        <button onClick={onDismiss} className="w-full py-2 text-xs text-gray-400 hover:text-teal text-center">
          Ignorar por enquanto
        </button>
      </div>
    </div>
  )
}
