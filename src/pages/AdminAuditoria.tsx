import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Stats {
  tokens_30d: number
  tokens_approved: number
  tokens_expired: number
  login_sessions_30d: number
  failed_attempts_7d: number
}

export default function AdminAuditoria() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    supabase.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) {
          navigate('/')
          return
        }
        setIsAdmin(true)
        loadStats()
      })
  }, [user, navigate])

  async function loadStats() {
    const [tokens, sessions, attempts] = await Promise.all([
      supabase.from('operation_tokens')
        .select('status', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from('login_sessions')
        .select('id', { count: 'exact' })
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from('approve_attempts')
        .select('id', { count: 'exact' })
        .eq('success', false)
        .gte('attempted_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ])

    // Count by status
    const { data: tokenData } = await supabase.from('operation_tokens')
      .select('status')
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())

    const approved = tokenData?.filter(t => t.status === 'approved').length ?? 0
    const expired = tokenData?.filter(t => t.status === 'expired').length ?? 0

    setStats({
      tokens_30d: tokens.count ?? 0,
      tokens_approved: approved,
      tokens_expired: expired,
      login_sessions_30d: sessions.count ?? 0,
      failed_attempts_7d: attempts.count ?? 0,
    })
    setLoading(false)
  }

  if (!isAdmin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-pulse text-teal">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="bg-gradient-to-br from-navy to-teal px-6 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)}><ArrowLeft className="text-white" /></button>
          <h1 className="text-xl font-bold text-white">Auditoria</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-navy">{stats?.tokens_30d ?? 0}</p>
            <p className="text-xs text-gray-500">Tokens 30d</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.tokens_approved ?? 0}</p>
            <p className="text-xs text-gray-500">Aprovados</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats?.tokens_expired ?? 0}</p>
            <p className="text-xs text-gray-500">Expirados</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats?.login_sessions_30d ?? 0}</p>
            <p className="text-xs text-gray-500">Login QR 30d</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">{stats?.failed_attempts_7d ?? 0}</p>
            <p className="text-xs text-gray-500">Falhas 7d</p>
          </div>
        </div>
      </div>
    </div>
  )
}
