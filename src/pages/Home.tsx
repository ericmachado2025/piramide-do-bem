import { Link } from 'react-router-dom'
import { ChevronRight, Clock, CheckCircle2, Sparkles } from 'lucide-react'
import { useLocalUser } from '../hooks/useLocalUser'
import BottomNav from '../components/BottomNav'
import type { Action } from '../types'
import { actionTypes } from '../data/actions'

const TIERS = ['Aprendiz', 'Guardião', 'Protetor', 'Herói', 'Lenda']

function getSimulatedActions(): (Action & { authorName: string; actionTypeName: string; actionIcon: string })[] {
  const stored = localStorage.getItem('piramide-actions')
  const userActions: Action[] = stored ? JSON.parse(stored) : []

  const simulated = [
    { authorName: 'Maria S.', actionTypeName: 'Ajudei colega no dever', actionIcon: '📚', status: 'validated' as const, points_awarded: 10, created_at: new Date(Date.now() - 3600000).toISOString() },
    { authorName: 'João P.', actionTypeName: 'Mediei conflito', actionIcon: '⚖️', status: 'pending' as const, points_awarded: 25, created_at: new Date(Date.now() - 7200000).toISOString() },
    { authorName: 'Ana L.', actionTypeName: 'Acolhi aluno novo', actionIcon: '🤝', status: 'validated' as const, points_awarded: 15, created_at: new Date(Date.now() - 86400000).toISOString() },
    { authorName: 'Pedro R.', actionTypeName: 'Compartilhei material', actionIcon: '📤', status: 'pending' as const, points_awarded: 10, created_at: new Date(Date.now() - 100000000).toISOString() },
    { authorName: 'Luísa M.', actionTypeName: 'Participei de projeto coletivo', actionIcon: '🏗️', status: 'validated' as const, points_awarded: 20, created_at: new Date(Date.now() - 150000000).toISOString() },
  ]

  const mapped = userActions.slice(-3).map((a) => {
    const at = actionTypes.find((t) => t.id === a.action_type_id)
    return {
      ...a,
      authorName: 'Você',
      actionTypeName: at?.name ?? 'Boa ação',
      actionIcon: at?.icon ?? '🤝',
    }
  })

  const combined = [...mapped.reverse(), ...simulated]
  return combined.slice(0, 5) as (Action & { authorName: string; actionTypeName: string; actionIcon: string })[]
}

function getPendingCount(): number {
  const stored = localStorage.getItem('piramide-actions')
  const actions: Action[] = stored ? JSON.parse(stored) : []
  const userPending = actions.filter((a) => a.status === 'pending').length
  return userPending + 2 // add simulated pending
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

export default function Home() {
  const { user } = useLocalUser()
  const actions = getSimulatedActions()
  const pendingCount = getPendingCount()
  const tierProgress = user ? Math.min(((user.totalPoints % 100) / 100) * 100, 100) : 0

  if (!user) return null

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="gradient-bg px-5 pt-8 pb-6 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-white">
            Ola, {user.name}! <span className="inline-block animate-bounce">🎮</span>
          </h1>
          <p className="text-white/70 text-sm mt-1">Que boas ações vamos fazer hoje?</p>

          {/* Mini avatar / stats */}
          <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="text-4xl">{user.tribeEmoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">{TIERS[user.characterTier - 1] ?? 'Aprendiz'}</span>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  Tier {user.characterTier}
                </span>
              </div>
              <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green rounded-full transition-all duration-700"
                  style={{ width: `${tierProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-white/60 text-xs">{user.totalPoints} pts</span>
                <span className="text-white/60 text-xs">Top 12% da sua escola</span>
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
            {actions.map((action, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">{action.actionIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy text-sm truncate">
                    {action.authorName}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{action.actionTypeName}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {action.status === 'validated' ? (
                    <span className="flex items-center gap-1 text-green text-xs font-medium">
                      <CheckCircle2 size={14} />
                      Validado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow text-xs font-medium">
                      <Clock size={14} />
                      Pendente
                    </span>
                  )}
                  <span className="text-teal font-bold text-xs">+{action.points_awarded} pts</span>
                  <span className="text-gray-400 text-[10px]">{timeAgo(action.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
