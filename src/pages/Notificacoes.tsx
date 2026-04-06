import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell } from 'lucide-react'
import BottomNav from '../components/BottomNav'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  icon: string
  color: string
  createdAt: string
  actionUrl?: string
}

const NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'help_offer', title: 'Oferta de ajuda!', message: 'Maria Silva se ofereceu para te ajudar em Matematica.', read: false, icon: '💡', color: 'bg-purple-50 border-purple-200', createdAt: new Date(Date.now() - 1800000).toISOString(), actionUrl: '/monitoria' },
  { id: 'n2', type: 'validation_pending', title: 'Acao para validar', message: 'Pedro Rocha registrou "Mediei conflito" e precisa de validacao.', read: false, icon: '📷', color: 'bg-teal/5 border-teal/20', createdAt: new Date(Date.now() - 3600000).toISOString(), actionUrl: '/validar' },
  { id: 'n3', type: 'my_action_validated', title: 'Sua acao foi validada!', message: '"Ajudei colega no dever" foi confirmada. Voce ganhou +10 pontos!', read: false, icon: '✅', color: 'bg-green/5 border-green/20', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'n4', type: 'tier_proximity', title: 'Faltam 20 pontos!', message: 'Voce esta perto do Tier 3! Veja quem precisa de ajuda.', read: false, icon: '🔥', color: 'bg-yellow/5 border-yellow/20', createdAt: new Date(Date.now() - 14400000).toISOString(), actionUrl: '/monitoria' },
  { id: 'n5', type: 'tribe_absence', title: 'Colega da tribo faltou', message: 'Diego Santos da sua tribo faltou hoje. Que tal ir atras dele?', read: false, icon: '🔔', color: 'bg-red/5 border-red/20', createdAt: new Date(Date.now() - 28800000).toISOString() },
  { id: 'n6', type: 'tier_up', title: 'Subiu de Tier!', message: 'Parabens! Voce alcancou o Tier 2 — Super Saiyajin!', read: true, icon: '⭐', color: 'bg-yellow/5 border-yellow/20', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'n7', type: 'badge', title: 'Selo conquistado!', message: 'Voce ganhou o selo "Centenario" por atingir 100 pontos!', read: true, icon: '🏆', color: 'bg-yellow/5 border-yellow/20', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'n8', type: 'spotlight', title: 'Destaque da semana!', message: 'Voce foi escolhido como destaque da semana na sua escola!', read: true, icon: '🌟', color: 'bg-purple-50 border-purple-200', createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: 'n9', type: 'reward', title: 'Sexta do Patrocinador', message: 'Novas recompensas disponiveis! Confira os descontos especiais.', read: true, icon: '🎁', color: 'bg-orange-50 border-orange-200', createdAt: new Date(Date.now() - 432000000).toISOString(), actionUrl: '/recompensas' },
]

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function Notificacoes() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/home')} className="p-1 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} className="text-navy" />
            </button>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-navy" />
              <h1 className="font-bold text-navy text-lg">Notificacoes</h1>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-teal font-semibold hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-4 space-y-2">
        {unreadCount > 0 && (
          <p className="text-xs text-gray-500 mb-2">{unreadCount} nao lida(s)</p>
        )}

        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              markRead(n.id)
              if (n.actionUrl) navigate(n.actionUrl)
            }}
            className={`w-full text-left rounded-xl p-4 border transition-all ${
              n.read
                ? 'bg-white border-gray-100 shadow-sm'
                : `${n.color} shadow-sm`
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${n.read ? 'text-gray-600' : 'text-navy'}`}>
                    {n.title}
                  </p>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)} atras</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
