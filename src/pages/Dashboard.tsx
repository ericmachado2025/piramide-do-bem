import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts'
import { ArrowLeft, Users, Handshake, TrendingUp, Trophy, AlertTriangle, CheckCircle } from 'lucide-react'
import { tribes } from '../data/tribes'

/* ---------- simulated data ---------- */
const turmas = ['9ºA', '9ºB', '1ºEM-A']

const metricsPerTurma: Record<string, { ativos: number; total: number; acoes: number; crescimento: string; triboLider: string }> = {
  '9ºA': { ativos: 28, total: 32, acoes: 47, crescimento: '+12%', triboLider: 'Marvel Heroes' },
  '9ºB': { ativos: 25, total: 30, acoes: 38, crescimento: '+8%', triboLider: 'Guerreiros Saiyajin' },
  '1ºEM-A': { ativos: 31, total: 35, acoes: 55, crescimento: '+15%', triboLider: 'Ordem Jedi' },
}

const weeklyData = [
  { semana: 'Sem 1', acoes: 12 },
  { semana: 'Sem 2', acoes: 18 },
  { semana: 'Sem 3', acoes: 15 },
  { semana: 'Sem 4', acoes: 24 },
  { semana: 'Sem 5', acoes: 30 },
  { semana: 'Sem 6', acoes: 35 },
  { semana: 'Sem 7', acoes: 42 },
  { semana: 'Sem 8', acoes: 47 },
]

const tribeColors = ['#028090', '#02C39A', '#F59E0B', '#1F4E79', '#E11D48', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

function getTribeRanking(turma: string) {
  const rng = turma.charCodeAt(0) + turma.charCodeAt(1)
  return tribes.map((t, i) => ({
    name: t.name,
    icon: t.icon,
    pontos: Math.floor(((rng * (i + 1) * 17) % 400) + 100),
    color: tribeColors[i % tribeColors.length],
  })).sort((a, b) => b.pontos - a.pontos)
}

interface FraudAlertData {
  id: string
  message: string
  reviewed: boolean
}

const initialAlerts: FraudAlertData[] = [
  { id: 'fa-1', message: 'Joao e Pedro validaram um ao outro no mesmo dia (2x esta semana)', reviewed: false },
  { id: 'fa-2', message: 'Maria registrou 5 acoes em 10 minutos — padrao incomum', reviewed: false },
  { id: 'fa-3', message: 'Lucas e Ana usaram o mesmo dispositivo para validacoes cruzadas', reviewed: false },
]

export default function Dashboard() {
  const [turma, setTurma] = useState('9ºA')
  const [alerts, setAlerts] = useState(initialAlerts)
  const metrics = metricsPerTurma[turma]
  const tribeRanking = getTribeRanking(turma)

  function markReviewed(id: string) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, reviewed: true } : a)))
  }

  const metricCards = [
    { icon: Users, label: 'Alunos ativos', value: `${metrics.ativos}/${metrics.total}`, emoji: '👥', color: 'from-[#028090] to-[#02C39A]' },
    { icon: Handshake, label: 'Acoes esta semana', value: String(metrics.acoes), emoji: '🤝', color: 'from-[#1F4E79] to-[#028090]' },
    { icon: TrendingUp, label: 'Crescimento', value: metrics.crescimento, emoji: '📈', color: 'from-[#02C39A] to-[#028090]' },
    { icon: Trophy, label: 'Tribo lider', value: metrics.triboLider, emoji: '🏆', color: 'from-[#F59E0B] to-[#F97316]' },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1F4E79] to-[#028090] px-6 pt-12 pb-6">
        <Link to="/home" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-white">Dashboard do Professor</h1>
        <p className="text-white/70 text-sm mt-1">Acompanhe o engajamento da sua turma</p>
      </header>

      <div className="max-w-4xl mx-auto px-4 -mt-4 pb-12">
        {/* Quick actions */}
        <div className="flex gap-3 mb-6">
          <Link
            to="/ausencias"
            className="flex-1 bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E11D48] to-[#F59E0B] flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <div>
              <p className="font-bold text-[#1F4E79] text-sm">Registrar Ausencias</p>
              <p className="text-xs text-gray-500">Chamada de hoje</p>
            </div>
          </Link>
          <Link
            to="/validar-professor"
            className="flex-1 bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#028090] to-[#02C39A] flex items-center justify-center">
              <span className="text-lg">✅</span>
            </div>
            <div>
              <p className="font-bold text-[#1F4E79] text-sm">Validar Professor</p>
              <p className="text-xs text-gray-500">Confirmar colegas</p>
            </div>
          </Link>
        </div>

        {/* Class selector */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Selecionar turma
          </label>
          <div className="flex gap-2">
            {turmas.map((t) => (
              <button
                key={t}
                onClick={() => setTurma(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${turma === t
                    ? 'bg-[#1F4E79] text-white shadow-md shadow-[#1F4E79]/20'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <span className="text-sm">{card.emoji}</span>
                </div>
                <span className="text-xs text-gray-500 font-medium">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-[#1F4E79]">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Evolution chart */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-base font-bold text-[#1F4E79] mb-4">Evolucao semanal de acoes</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: '13px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="acoes"
                  stroke="#028090"
                  strokeWidth={3}
                  dot={{ fill: '#028090', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#02C39A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Anti-fraud alerts */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-base font-bold text-[#1F4E79]">Alertas anti-fraude</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl p-4 transition-all ${
                  alert.reviewed
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">
                    {alert.reviewed ? '✅' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm ${alert.reviewed ? 'text-green-700' : 'text-amber-800'}`}>
                      {alert.message}
                    </p>
                    {!alert.reviewed && (
                      <button
                        onClick={() => markReviewed(alert.id)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#028090]
                                   hover:text-[#028090]/80 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Marcar como revisado
                      </button>
                    )}
                    {alert.reviewed && (
                      <p className="text-xs text-green-600 mt-1 font-medium">Revisado</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tribe ranking */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-base font-bold text-[#1F4E79] mb-4">Ranking de tribos — {turma}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tribeRanking} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="pontos" radius={[0, 8, 8, 0]} barSize={20}>
                  {tribeRanking.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LGPD notice */}
        <div className="bg-gray-100 rounded-xl p-4 mb-8 text-center">
          <p className="text-xs text-gray-500">
            🔒 Dados agregados — sem informacoes individuais de alunos (LGPD)
          </p>
        </div>

        {/* Footer */}
        <footer className="text-center pb-8">
          <p className="text-sm text-[#1F4E79]/60 italic font-medium">
            "O aluno que se sente parte de algo nao abandona a escola."
          </p>
        </footer>
      </div>
    </div>
  )
}
