import { useNavigate } from 'react-router-dom'

interface Props {
  onDismiss: () => void
}

export default function TotpTipModal({ onDismiss }: Props) {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">&#128274;</div>
          <h3 className="font-bold text-navy text-lg">Dica de seguranca</h3>
        </div>

        <div className="text-sm text-gray-600 space-y-2 mb-5">
          <p>Ative um autenticador (Google ou Microsoft) para:</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> Aprovacoes instantaneas (sem esperar WhatsApp)</li>
            <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> Camada extra de seguranca na sua conta</li>
            <li className="flex items-center gap-2"><span className="text-green-500">&#10003;</span> Funciona mesmo sem internet no celular</li>
          </ul>
        </div>

        <button
          onClick={() => { navigate('/perfil'); onDismiss() }}
          className="w-full py-3 rounded-xl bg-teal text-white font-bold text-sm hover:bg-teal/90 transition-colors mb-2"
        >
          Ativar agora
        </button>

        <button onClick={onDismiss} className="w-full py-2 text-xs text-gray-400 hover:text-teal text-center">
          Me lembrar em 15 dias
        </button>
      </div>
    </div>
  )
}
