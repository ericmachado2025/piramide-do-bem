import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import type { Student, Action, ActionType } from '../types'

const TIERS = ['Aprendiz', 'Guardiao', 'Protetor', 'Heroi', 'Lenda']

const iconClassToEmoji: Record<string, string> = {
  'fa-mask': '🦸',
  'fa-bolt': '⚡',
  'fa-hat-wizard': '🧙',
  'fa-jedi': '⚔️',
  'fa-wind': '🍃',
  'fa-trophy': '🏆',
  'fa-guitar': '🎸',
  'fa-dungeon': '🗡️',
}

function getTribeEmoji(iconClass: string | null): string {
  if (!iconClass) return '⭐'
  for (const [cls, emoji] of Object.entries(iconClassToEmoji)) {
    if (iconClass.includes(cls)) return emoji
  }
  return '⭐'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min atras`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atras`
  const days = Math.floor(hours / 24)
  return `${days}d atras`
}

interface RecentAction extends Omit<Action, 'author' | 'action_type'> {
  action_type: ActionType | null
  author: { name: string } | null
}

export default function Home() {
  const navigate = useNavigate()
  const { user: authUser, loading: authLoading } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [recentActions, setRecentActions] = useState<RecentAction[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!authUser) {
      navigate('/login')
      return
    }

    async function loadData() {
      // Load student with tribe and character
      const { data: studentData } = await supabase
        .from('students')
        .select('*, tribe:tribes(*), character:characters(*)')
        .eq('user_id', authUser!.id)
        .single()

      if (!studentData) {
        navigate('/cadastro/perfil')
        return
      }

      setStudent(studentData)

      // Load recent validated actions
      const { data: actions } = await supabase
        .from('actions')
        .select('*, action_type:action_types(*), author:students!actions_author_id_fkey(name)')
        .eq('status', 'validated')
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentActions((actions as RecentAction[]) || [])

      // Load pending actions count
      const { count } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setPendingCount(count || 0)
      setLoading(false)
    }

    loadData()
  }, [authUser, authLoading])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!student) return null

  const tribeEmoji = getTribeEmoji(student.tribe?.icon_class ?? null)
  const currentTier = student.character?.tier ?? 1
  const tierProgress = Math.min(((student.total_points % 100) / 100) * 100, 100)

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="gradient-bg px-5 pt-8 pb-6 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white">
            Ola, {student.name}! <span className="inline-block animate-bounce">🎮</span>
          </h1>
          <p className="text-white/70 text-sm mt-1">Que boas acoes vamos fazer hoje?</p>

          {/* Mini avatar / stats */}
          <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="text-4xl">{tribeEmoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">{TIERS[currentTier - 1] ?? 'Aprendiz'}</span>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  Tier {currentTier}
                </span>
              </div>
              <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green rounded-full transition-all duration-700"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-white/60 text-xs">{student.total_points} pts</span>
                <span className="text-white/60 text-xs">{student.tribe?.name ?? 'Sem tribo'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6 space-y-4">
        {/* Action Cards */}
        <Link
          to="/registrar"
          className="block gradient-card rounded-2xl shadow-md p-5 text-white group hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤝</span>
              <div>
                <h3 className="font-bold text-lg">Registrar Boa Acao</h3>
                <p className="text-white/70 text-sm">Compartilhe o que voce fez de bom</p>
              </div>
            </div>
            <ChevronRight className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/validar"
          className="block bg-white border-2 border-teal rounded-2xl shadow-md p-5 group hover:shadow-lg transition-all duration-200 active:scale-[0.98] relative"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📷</span>
              <div>
                <h3 className="font-bold text-lg text-navy">Validar Acao de Colega</h3>
                <p className="text-gray-500 text-sm">Confirme boas acoes de colegas</p>
              </div>
            </div>
            <ChevronRight className="text-teal/50 group-hover:translate-x-1 transition-transform" />
          </div>
          {pendingCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-yellow text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-pulse">
              {pendingCount}
            </span>
          )}
        </Link>

        <Link
          to="/ranking"
          className="block bg-white rounded-2xl shadow-md p-5 group hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <h3 className="font-bold text-lg text-navy">Ver Ranking</h3>
                <p className="text-gray-500 text-sm">Veja quem esta liderando</p>
              </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Quick links row */}
        <div className="flex gap-3">
          <Link to="/monitoria" className="flex-1 bg-white rounded-2xl shadow-md p-4 text-center hover:shadow-lg transition-all active:scale-[0.98]">
            <span className="text-2xl block mb-1">📖</span>
            <p className="font-semibold text-navy text-xs">Monitoria</p>
          </Link>
          <Link to="/patrocinadores" className="flex-1 bg-white rounded-2xl shadow-md p-4 text-center hover:shadow-lg transition-all active:scale-[0.98]">
            <span className="text-2xl block mb-1">🏪</span>
            <p className="font-semibold text-navy text-xs">Patrocinadores</p>
          </Link>
          <Link to="/recompensas" className="flex-1 bg-white rounded-2xl shadow-md p-4 text-center hover:shadow-lg transition-all active:scale-[0.98]">
            <span className="text-2xl block mb-1">🎁</span>
            <p className="font-semibold text-navy text-xs">Vales-Premio</p>
          </Link>
        </div>

        {/* Pendentes */}
        {pendingCount > 0 && (
          <div className="bg-yellow/10 border border-yellow/30 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="text-yellow" size={24} />
            <div>
              <p className="text-sm font-semibold text-navy">
                {pendingCount} {pendingCount === 1 ? 'acao pendente' : 'acoes pendentes'}
              </p>
              <p className="text-xs text-gray-500">Aguardando validacao de colegas</p>
            </div>
          </div>
        )}

        {/* Ultimas Acoes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-teal" size={18} />
            <h2 className="font-bold text-navy text-lg">Ultimas Acoes</h2>
          </div>
          <div className="space-y-2">
            {recentActions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <p className="text-gray-400 text-sm">Nenhuma acao ainda</p>
                <p className="text-gray-300 text-xs mt-1">Registre sua primeira boa acao!</p>
              </div>
            ) : (
              recentActions.map((action) => (
                <div
                  key={action.id}
                  className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
                >
                  <span className="text-2xl">{action.action_type?.icon ?? '🤝'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-navy text-sm truncate">
                      {action.author?.name ?? 'Aluno'}
                    </p>
                    <p className="text-gray-500 text-xs truncate">{action.action_type?.name ?? 'Boa acao'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="flex items-center gap-1 text-green text-xs font-medium">
                      <CheckCircle2 size={14} />
                      Validado
                    </span>
                    <span className="text-teal font-bold text-xs">+{action.points_awarded ?? 0} pts</span>
                    <span className="text-gray-400 text-[10px]">{timeAgo(action.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
