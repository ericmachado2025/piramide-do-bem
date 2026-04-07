import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  icon: string
  color: string
  created_at: string
  action_url?: string
}

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
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setNotifications(data as Notification[])
        }
        setLoading(false)
      })
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true }).eq('id', id)
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-teal text-lg">Carregando...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <span className="text-5xl block mb-3">{'\u{1F514}'}</span>
            <h2 className="text-lg font-bold text-navy mb-2">Nenhuma notificacao ainda</h2>
            <p className="text-gray-400 text-sm">
              Quando houver novidades sobre suas acoes, tribos ou recompensas, elas aparecerao aqui.
            </p>
          </div>
        ) : (
          <>
            {unreadCount > 0 && (
              <p className="text-xs text-gray-500 mb-2">{unreadCount} nao lida(s)</p>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  markRead(n.id)
                  if (n.action_url) navigate(n.action_url)
                }}
                className={`w-full text-left rounded-xl p-4 border transition-all ${
                  n.read
                    ? 'bg-white border-gray-100 shadow-sm'
                    : `${n.color || 'bg-teal/5 border-teal/20'} shadow-sm`
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{n.icon || '\u{1F514}'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${n.read ? 'text-gray-600' : 'text-navy'}`}>
                        {n.title}
                      </p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-teal flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.created_at)} atras</p>
                  </div>
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
