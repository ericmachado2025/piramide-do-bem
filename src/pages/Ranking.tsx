import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import TopBar from '../components/TopBar'
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

function getTier(points: number): number {
  if (points >= 1000) return 5
  if (points >= 600) return 4
  if (points >= 300) return 3
  if (points >= 100) return 2
  return 1
}

/* ---- faixa definitions ---- */
interface Faixa {
  id: string
  label: string
  icon: string
  minPercentile: number
  bgClass: string
  borderClass: string
  textClass: string
}

const FAIXAS: Faixa[] = [
  { id: 'ouro', label: 'Excel\u00eancia', icon: '\u{1F451}', minPercentile: 95, bgClass: 'bg-yellow-50', borderClass: 'border-gold', textClass: 'text-yellow-700' },
  { id: 'prata', label: 'Destaque', icon: '\u{1F948}', minPercentile: 90, bgClass: 'bg-gray-50', borderClass: 'border-silver', textClass: 'text-gray-600' },
  { id: 'bronze', label: 'Refer\u00eancia', icon: '\u{1F949}', minPercentile: 75, bgClass: 'bg-orange-50', borderClass: 'border-bronze', textClass: 'text-orange-700' },
  { id: 'ativo', label: 'Ativo', icon: '\u2B50', minPercentile: 50, bgClass: 'bg-blue-50', borderClass: 'border-blue-400', textClass: 'text-blue-700' },
  { id: 'crescimento', label: 'Em crescimento', icon: '\u{1F331}', minPercentile: 0, bgClass: 'bg-emerald-50', borderClass: 'border-emerald-400', textClass: 'text-emerald-700' },
]

interface RankedStudent {
  id: string
  name: string
  communityIcon: string
  communityName: string
  communityColor: string | null
  tier: number
  totalPoints: number
  percentile: number
  faixaId: string
  isCurrentUser: boolean
}

const UNIVERSE_TABS = [
  { id: 'escola', icon: '\u{1F3EB}', label: 'Escola' },
  { id: 'cidade', icon: '\u{1F306}', label: 'Cidade' },
  { id: 'estado', icon: '\u{1F5FA}\uFE0F', label: 'Estado' },
  { id: 'nacional', icon: '\u{1F1E7}\u{1F1F7}', label: 'Nacional' },
  { id: 'tribos', icon: '\u{1F3C5}', label: 'Tribos' },
]

export default function Ranking() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('escola')
  const [openFaixas, setOpenFaixas] = useState<Record<string, boolean>>({ ouro: true, prata: true })
  const [students, setStudents] = useState<RankedStudent[]>([])
  const [, setCurrentStudentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tribeTotals, setTribeTotals] = useState<{ name: string; icon: string; total: number; color: string }[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        // Get current user's student with school info
        let myStudentId: string | null = null
        let mySchoolId: string | null = null
        let myCity: string | null = null
        let myState: string | null = null
        if (user) {
          const { data: me, error: meError } = await supabase
            .from('students')
            .select('id, school_id, school:schools(city, state)')
            .eq('user_id', user.id)
            .single()
          if (meError) {
            console.error('Ranking: error loading current student:', meError)
          }
          if (me) {
            myStudentId = me.id
            setCurrentStudentId(me.id)
            mySchoolId = me.school_id
            const sch = me.school as unknown as { city: string; state: string } | null
            myCity = sch?.city || null
            myState = sch?.state || null
          }
        }

        // Load students with tribe info — filtered by scope
        let q = supabase
          .from('students')
          .select('id, total_points, school_id, user:users!students_users_id_fkey(name), community:communities!left(name, icon_class, color_hex), school:schools!left(city, state)')
          .order('total_points', { ascending: false })
          .limit(200)

        if (activeTab === 'escola' && mySchoolId) {
          q = q.eq('school_id', mySchoolId)
        } else if (activeTab === 'cidade' && myCity) {
          // Filter by city via school join — need to get school IDs first
          const { data: citySchools } = await supabase.from('schools').select('id').eq('city', myCity)
          if (citySchools && citySchools.length > 0) {
            q = q.in('school_id', citySchools.map(s => s.id))
          }
        } else if (activeTab === 'estado' && myState) {
          const { data: stateSchools } = await supabase.from('schools').select('id').eq('state', myState)
          if (stateSchools && stateSchools.length > 0) {
            q = q.in('school_id', stateSchools.map(s => s.id))
          }
        }
        // 'nacional' = no filter

        const { data, error: queryError } = await q

        if (queryError) {
          console.error('Ranking: error loading students:', queryError)
          setError('Erro ao carregar ranking. Tente novamente mais tarde.')
          return
        }

        if (data && data.length > 0) {
          const total = data.length
          const sorted = [...data].sort((a, b) => a.total_points - b.total_points)

          const ranked: RankedStudent[] = sorted.map((s, idx) => {
            const percentile = ((idx + 1) / total) * 100
            const community = s.community as unknown as { name: string; icon_class: string | null; color_hex: string | null } | null
            let faixaId = 'crescimento'
            for (const f of FAIXAS) {
              if (percentile >= f.minPercentile) { faixaId = f.id; break }
            }
            return {
              id: s.id,
              name: ((s.user as unknown as { name: string }) ?? { name: 'Aluno' }).name,
              communityIcon: community?.icon_class ? (ICON_MAP[community.icon_class] ?? '\u{1F5A4}') : '\u{1F5A4}',
              communityName: community?.name ?? 'Desconhecida',
              communityColor: community?.color_hex ?? null,
              tier: getTier(s.total_points),
              totalPoints: s.total_points,
              percentile,
              faixaId,
              isCurrentUser: s.id === myStudentId,
            }
          })
          setStudents(ranked)

          // Calculate tribe totals
          const tribeMap: Record<string, { name: string; icon: string; total: number; color: string }> = {}
          for (const s of data) {
            const community = s.community as unknown as { name: string; icon_class: string | null; color_hex: string | null } | null
            if (!community) continue
            const key = community.name
            if (!tribeMap[key]) {
              tribeMap[key] = {
                name: community.name,
                icon: community.icon_class ? (ICON_MAP[community.icon_class] ?? '\u{1F5A4}') : '\u{1F5A4}',
                total: 0,
                color: community.color_hex ?? '#028090',
              }
            }
            tribeMap[key].total += s.total_points
          }
          setTribeTotals(Object.values(tribeMap).sort((a, b) => b.total - a.total))
        }
      } catch (err) {
        console.error('Ranking: unexpected error:', err)
        setError('Erro inesperado ao carregar ranking.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user, activeTab])

  const groupedByFaixa = useMemo(() => {
    const map: Record<string, RankedStudent[]> = {}
    for (const f of FAIXAS) map[f.id] = []
    for (const r of students) map[r.faixaId].push(r)
    return map
  }, [students])

  const maxTribeTotal = tribeTotals[0]?.total ?? 1

  const toggleFaixa = (id: string) =>
    setOpenFaixas((prev) => ({ ...prev, [id]: !prev[id] }))

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <TopBar />
      {/* ===== HEADER ===== */}
      <div className="gradient-bg px-6 pt-10 pb-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold text-white text-center">QualiRanking</h1>
        <p className="text-white/70 text-sm text-center mt-1">
          Reconhecimento por faixas de excel&ecirc;ncia
        </p>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6 -mt-4">
        {error ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center mt-8">
            <span className="text-5xl block mb-3">{'\u26A0\uFE0F'}</span>
            <h2 className="text-lg font-bold text-navy mb-2">Ops, algo deu errado</h2>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center mt-8">
            <span className="text-5xl block mb-3">{'\u{1F3C6}'}</span>
            <h2 className="text-lg font-bold text-navy mb-2">Ranking em breve</h2>
            <p className="text-gray-400 text-sm">
              Ranking ser&aacute; exibido quando mais alunos participarem.
            </p>
          </div>
        ) : (
          <>
            {/* ===== TABS ===== */}
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-1 min-w-max">
                {UNIVERSE_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-teal text-white shadow-md'
                        : 'bg-white text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ===== TRIBOS TAB ===== */}
            {activeTab === 'tribos' ? (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-navy">Ranking de Tribos</h2>
                {tribeTotals.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">Nenhuma tribo com pontos ainda.</p>
                ) : (
                  tribeTotals.map((t, idx) => (
                    <div key={t.name} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{t.icon}</span>
                        <span className="font-semibold text-navy flex-1">{t.name}</span>
                        <span className="text-sm font-bold text-teal">
                          {t.total.toLocaleString('pt-BR')} pts
                        </span>
                      </div>
                      <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(t.total / maxTribeTotal) * 100}%`,
                            background:
                              idx === 0
                                ? 'linear-gradient(90deg, #FFD700, #F59E0B)'
                                : idx === 1
                                  ? 'linear-gradient(90deg, #C0C0C0, #9CA3AF)'
                                  : idx === 2
                                    ? 'linear-gradient(90deg, #CD7F32, #D97706)'
                                    : `linear-gradient(90deg, ${t.color}, #02C39A)`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </section>
            ) : (
              /* ===== FAIXA SECTIONS ===== */
              <section className="space-y-3">
                {FAIXAS.map((faixa) => {
                  const faixaStudents = groupedByFaixa[faixa.id] ?? []
                  const isOpen = openFaixas[faixa.id] ?? false
                  const minLabel =
                    faixa.minPercentile > 0
                      ? `Top ${100 - faixa.minPercentile}%`
                      : 'Abaixo de 50%'

                  return (
                    <div key={faixa.id} className="rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => toggleFaixa(faixa.id)}
                        className={`w-full flex items-center justify-between px-4 py-3 border-l-4 ${faixa.borderClass} ${faixa.bgClass}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{faixa.icon}</span>
                          <div className="text-left">
                            <span className={`font-bold text-sm ${faixa.textClass}`}>
                              {minLabel} &mdash; {faixa.label}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              ({faixaStudents.length} alunos)
                            </span>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="bg-white divide-y divide-gray-50">
                          {faixaStudents.length === 0 ? (
                            <p className="text-sm text-gray-400 p-4 text-center">
                              Nenhum aluno nesta faixa
                            </p>
                          ) : (
                            faixaStudents.map((s) => (
                              <div
                                key={s.id}
                                className={`flex items-center gap-3 px-4 py-3 ${
                                  s.isCurrentUser
                                    ? 'bg-teal/10 border-l-4 border-teal'
                                    : ''
                                }`}
                              >
                                <span className="text-2xl">{s.communityIcon}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-navy truncate">
                                    {s.name}
                                    {s.isCurrentUser && (
                                      <span className="ml-2 text-[10px] bg-teal text-white rounded-full px-2 py-0.5">
                                        Voc&ecirc;
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">
                                    {s.communityName}
                                  </p>
                                </div>
                                <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                                  Tier {s.tier}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
