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
  body: string
  read: boolean
  icon: string | null
  color: string | null
  created_at: string
  action_url: string | null
  action_label: string | null
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return 'Esta semana'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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

  const loadNotifications = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, read, icon, color, created_at, action_url, action_label')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setNotifications(data as Notification[])
    setLoading(false)
  }

  useEffect(() => {
    loadNotifications()
  }, [user])

  // Realtime subscription
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`notifs-page-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        loadNotifications()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = async () => {
    if (!user) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id)
  }

  // Group by date
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const group = formatDateGroup(n.created_at)
    if (!acc[group]) acc[group] = []
    acc[group].push(n)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-bg pb-20">
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
            <button onClick={markAllRead} className="text-xs text-teal font-semibold hover:underline">
              Marcar todas como lidas
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-4 space-y-4">
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
          Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{group}</p>
              <div className="space-y-2">
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      markRead(n.id)
                      if (n.action_url) navigate(n.action_url)
                    }}
                    className={`w-full text-left rounded-xl p-4 border transition-all ${
                      n.read
                        ? 'bg-white border-gray-100 shadow-sm'
                        : 'bg-teal/5 border-teal/20 shadow-sm'
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
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-gray-400">{timeAgo(n.created_at)} atras</p>
                          {n.action_label && (
                            <span className="text-[10px] text-teal font-semibold">{n.action_label}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  )
}
