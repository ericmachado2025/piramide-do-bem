import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ICON_MAP: Record<string, string> = {
  'fa-mask': '\u{1F9B8}',
  'fa-bolt': '\u26A1',
  'fa-hat-wizard': '\u{1F9D9}',
  'fa-jedi': '\u2694\uFE0F',
  'fa-wind': '\u{1F343}',
  'fa-trophy': '\u{1F3C6}',
  'fa-guitar': '\u{1F3B8}',
  'fa-dungeon': '\u{1F5E1}\uFE0F',
}

const tribeColors = ['#028090', '#02C39A', '#F59E0B', '#1F4E79', '#E11D48', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

interface FraudAlertData {
  id: string
  description: string | null
  reviewed: boolean
}

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<FraudAlertData[]>([])
  const [studentCount, setStudentCount] = useState(0)
  const [actionCount, setActionCount] = useState(0)
  const [tribeRanking, setTribeRanking] = useState<{ name: string; icon: string; pontos: number; color: string }[]>([])

  useEffect(() => {
    if (!user) return

    async function loadData() {
      const { count: sCount } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
      setStudentCount(sCount ?? 0)

      const { count: aCount } = await supabase
        .from('actions')
        .select('id', { count: 'exact', head: true })
      setActionCount(aCount ?? 0)

      const { data: alertsData } = await supabase
        .from('fraud_alerts')
        .select('id, description, reviewed')
        .order('created_at', { ascending: false })
        .limit(10)
      if (alertsData) setAlerts(alertsData)

      const { data: students } = await supabase
        .from('students')
        .select('total_points, community:communities(name, icon_class, color_hex)')
        .not('community_id', 'is', null)

      if (students) {
        const tribeMap: Record<string, { name: string; icon: string; pontos: number; color: string }> = {}
        for (const s of students) {
          const community = s.community as unknown as { name: string; icon_class: string | null; color_hex: string | null } | null
          if (!community) continue
          if (!tribeMap[community.name]) {
            tribeMap[community.name] = {
              name: community.name,
              icon: community.icon_class ? (ICON_MAP[community.icon_class] ?? '\u{1F5A4}') : '\u{1F5A4}',
              pontos: 0,
              color: community.color_hex ?? tribeColors[Object.keys(tribeMap).length % tribeColors.length],
            }
          }
          tribeMap[community.name].pontos += s.total_points
        }
        setTribeRanking(Object.values(tribeMap).sort((a, b) => b.pontos - a.pontos))
      }

      setLoading(false)
    }
    loadData()
  }, [user])

  async function markReviewed(id: string) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, reviewed: true } : a)))
    await supabase.from('fraud_alerts').update({ reviewed: true }).eq('id', id)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

  const metricCards = [
    { label: 'Alunos cadastrados', value: String(studentCount), emoji: '\u{1F465}', color: 'from-[#028090] to-[#02C39A]' },
    { label: 'Acoes registradas', value: String(actionCount), emoji: '\u{1F91D}', color: 'from-[#1F4E79] to-[#028090]' },
    { label: 'Tribos ativas', value: String(tribeRanking.length), emoji: '\u{1F4C8}', color: 'from-[#02C39A] to-[#028090]' },
    { label: 'Tribo lider', value: tribeRanking[0]?.name ?? 'N/A', emoji: '\u{1F3C6}', color: 'from-[#F59E0B] to-[#F97316]' },
  ]

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <header className="bg-gradient-to-r from-[#1F4E79] to-[#028090] px-6 pt-12 pb-6">
        <Link to="/home" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-white">Dashboard do Professor</h1>
        <p className="text-white/70 text-sm mt-1">Acompanhe o engajamento da plataforma</p>
      </header>

      <div className="max-w-4xl mx-auto px-4 -mt-4 pb-12">
        <div className="flex gap-3 mb-6">
          <Link
            to="/ausencias"
            className="flex-1 bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E11D48] to-[#F59E0B] flex items-center justify-center">
              <span className="text-lg">{'\u{1F4CB}'}</span>
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
              <span className="text-lg">{'\u2705'}</span>
            </div>
            <div>
              <p className="font-bold text-[#1F4E79] text-sm">Validar Professor</p>
              <p className="text-xs text-gray-500">Confirmar colegas</p>
            </div>
          </Link>
        </div>

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

        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-base font-bold text-[#1F4E79]">Alertas anti-fraude</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="text-center py-4">
              <span className="text-3xl block mb-2">{'\u2728'}</span>
              <p className="text-gray-400 text-sm">Nenhum alerta no momento. Tudo tranquilo!</p>
            </div>
          ) : (
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
                      {alert.reviewed ? '\u2705' : '\u26A0\uFE0F'}
                    </span>
                    <div className="flex-1">
                      <p className={`text-sm ${alert.reviewed ? 'text-green-700' : 'text-amber-800'}`}>
                        {alert.description ?? 'Alerta sem descricao'}
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
          )}
        </div>

        {tribeRanking.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <h2 className="text-base font-bold text-[#1F4E79] mb-4">Ranking de tribos</h2>
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
        )}

        <div className="bg-gray-100 rounded-xl p-4 mb-8 text-center">
          <p className="text-xs text-gray-500">
            {'\u{1F512}'} Dados agregados — sem informacoes individuais de alunos (LGPD)
          </p>
        </div>

        <footer className="text-center pb-8">
          <p className="text-sm text-[#1F4E79]/60 italic font-medium">
            "O aluno que se sente parte de algo nao abandona a escola."
          </p>
        </footer>
      </div>
    </div>
  )
}
