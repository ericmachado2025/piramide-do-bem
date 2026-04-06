import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import TopBar from '../components/TopBar'
import { useLocalUser } from '../hooks/useLocalUser'
import { generateSeedStudents } from '../data/seed-students'
import { tribes, characters } from '../data/tribes'

/* ---- helpers ---- */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getCharName(tribeId: string, points: number): string {
  const tribeChars = characters
    .filter((c) => c.tribe_id === tribeId)
    .sort((a, b) => b.min_points - a.min_points)
  for (const ch of tribeChars) {
    if (points >= ch.min_points) return ch.name
  }
  return tribeChars[tribeChars.length - 1]?.name ?? ''
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
  {
    id: 'ouro',
    label: 'Excele\u0302ncia',
    icon: '\u{1F451}',
    minPercentile: 95,
    bgClass: 'bg-yellow-50',
    borderClass: 'border-gold',
    textClass: 'text-yellow-700',
  },
  {
    id: 'prata',
    label: 'Destaque',
    icon: '\u{1F948}',
    minPercentile: 90,
    bgClass: 'bg-gray-50',
    borderClass: 'border-silver',
    textClass: 'text-gray-600',
  },
  {
    id: 'bronze',
    label: 'Refer\u00eancia',
    icon: '\u{1F949}',
    minPercentile: 75,
    bgClass: 'bg-orange-50',
    borderClass: 'border-bronze',
    textClass: 'text-orange-700',
  },
  {
    id: 'ativo',
    label: 'Ativo',
    icon: '\u2B50',
    minPercentile: 50,
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-400',
    textClass: 'text-blue-700',
  },
  {
    id: 'crescimento',
    label: 'Em crescimento',
    icon: '\u{1F331}',
    minPercentile: 0,
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-400',
    textClass: 'text-emerald-700',
  },
]

/* ---- student row type for the ranking ---- */
interface RankedStudent {
  id: string
  name: string
  tribeId: string
  tribeIcon: string
  tribeName: string
  charName: string
  tier: number
  totalPoints: number
  percentile: number
  faixaId: string
  isCurrentUser: boolean
}

/* ---- universe tabs ---- */
const UNIVERSE_TABS = [
  { id: 'turma', icon: '\u{1F4DA}', label: 'Turma' },
  { id: 'escola', icon: '\u{1F3EB}', label: 'Escola' },
  { id: 'bairro', icon: '\u{1F3D8}\uFE0F', label: 'Bairro' },
  { id: 'cidade', icon: '\u{1F306}', label: 'Cidade' },
  { id: 'estado', icon: '\u{1F5FA}\uFE0F', label: 'Estado' },
  { id: 'nacional', icon: '\u{1F1E7}\u{1F1F7}', label: 'Nacional' },
  { id: 'tribos', icon: '\u{1F3C5}', label: 'Tribos' },
]

const spotlightActions = [
  'ajudou 3 colegas em matem\u00e1tica',
  'organizou mutir\u00e3o de limpeza na escola',
  'foi monitor de leitura por 5 dias seguidos',
  'acolheu 2 alunos novos na turma',
  'mediou conflito com empatia e respeito',
]

export default function Ranking() {
  const { user } = useLocalUser()
  const [activeTab, setActiveTab] = useState('escola')
  const [openFaixas, setOpenFaixas] = useState<Record<string, boolean>>({ ouro: true, prata: true })

  const seedStudents = useMemo(() => generateSeedStudents(), [])

  /* build ranked list */
  const ranked: RankedStudent[] = useMemo(() => {
    /* merge seed with current user */
    const all: { id: string; name: string; tribeId: string; totalPoints: number; isCurrentUser: boolean }[] =
      seedStudents.map((s) => ({
        id: s.id,
        name: s.name,
        tribeId: s.tribe_id,
        totalPoints: s.total_points,
        isCurrentUser: false,
      }))

    if (user) {
      all.push({
        id: 'current-user',
        name: user.name,
        tribeId: user.tribeId,
        totalPoints: user.totalPoints,
        isCurrentUser: true,
      })
    }

    const sorted = [...all].sort((a, b) => a.totalPoints - b.totalPoints)
    const total = sorted.length

    return sorted.map((s, idx) => {
      const percentile = ((idx + 1) / total) * 100
      const tribe = tribes.find((t) => t.id === s.tribeId)
      let faixaId = 'crescimento'
      for (const f of FAIXAS) {
        if (percentile >= f.minPercentile) {
          faixaId = f.id
          break
        }
      }
      return {
        id: s.id,
        name: s.name,
        tribeId: s.tribeId,
        tribeIcon: tribe?.icon ?? '\u{1F5A4}',
        tribeName: tribe?.name ?? 'Desconhecida',
        charName: getCharName(s.tribeId, s.totalPoints),
        tier: getTier(s.totalPoints),
        totalPoints: s.totalPoints,
        percentile,
        faixaId,
        isCurrentUser: s.isCurrentUser,
      }
    })
  }, [seedStudents, user])

  /* group by faixa + shuffle within */
  const groupedByFaixa = useMemo(() => {
    const map: Record<string, RankedStudent[]> = {}
    for (const f of FAIXAS) map[f.id] = []
    for (const r of ranked) map[r.faixaId].push(r)
    for (const key of Object.keys(map)) map[key] = shuffle(map[key])
    return map
  }, [ranked])

  /* tribe totals */
  const tribeTotals = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of seedStudents) {
      map[s.tribe_id] = (map[s.tribe_id] ?? 0) + s.total_points
    }
    if (user) {
      map[user.tribeId] = (map[user.tribeId] ?? 0) + user.totalPoints
    }
    return tribes
      .map((t) => ({ ...t, total: map[t.id] ?? 0 }))
      .sort((a, b) => b.total - a.total)
  }, [seedStudents, user])

  const maxTribeTotal = tribeTotals[0]?.total ?? 1

  /* spotlight student */
  const spotlight = useMemo(() => {
    const highScorers = seedStudents.filter((s) => s.total_points >= 600)
    if (highScorers.length === 0) return null
    const pick = highScorers[Math.floor(Math.random() * highScorers.length)]
    const tribe = tribes.find((t) => t.id === pick.tribe_id)
    return {
      name: pick.name,
      tribeName: tribe?.name ?? '',
      tribeIcon: tribe?.icon ?? '',
      charName: getCharName(pick.tribe_id, pick.total_points),
      tier: getTier(pick.total_points),
      action: spotlightActions[Math.floor(Math.random() * spotlightActions.length)],
    }
  }, [seedStudents])

  const toggleFaixa = (id: string) =>
    setOpenFaixas((prev) => ({ ...prev, [id]: !prev[id] }))

  if (!user) {
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
          Reconhecimento por faixas de excele\u0302ncia
        </p>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6 -mt-4">
        {/* ===== SPOTLIGHT ===== */}
        {spotlight && (
          <div className="bg-white rounded-2xl border-2 border-gold shadow-lg p-5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-gold to-yellow pointer-events-none" />
            <div className="shimmer absolute top-2 right-3 text-2xl">✨</div>
            <p className="text-sm font-bold text-yellow-700 mb-2">
              ⭐ Spotlight desta semana
            </p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{spotlight.tribeIcon}</span>
              <div>
                <p className="font-bold text-navy text-lg">{spotlight.name}</p>
                <p className="text-sm text-gray-500">
                  {spotlight.tribeName} &mdash; {spotlight.charName} (Tier {spotlight.tier})
                </p>
                <p className="text-xs text-teal mt-1 italic">
                  Recentemente {spotlight.action}
                </p>
              </div>
            </div>
          </div>
        )}

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
            {tribeTotals.map((t, idx) => (
              <div key={t.id} className="bg-white rounded-xl shadow-sm p-4">
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
                              : 'linear-gradient(90deg, #028090, #02C39A)',
                    }}
                  />
                </div>
              </div>
            ))}
          </section>
        ) : (
          /* ===== FAIXA SECTIONS ===== */
          <section className="space-y-3">
            {FAIXAS.map((faixa) => {
              const students = groupedByFaixa[faixa.id] ?? []
              const isOpen = openFaixas[faixa.id] ?? false
              const minLabel =
                faixa.minPercentile > 0
                  ? `Top ${100 - faixa.minPercentile}%`
                  : 'Abaixo de 50%'

              return (
                <div key={faixa.id} className="rounded-xl overflow-hidden shadow-sm">
                  {/* header */}
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
                          ({students.length} alunos)
                        </span>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {/* student list */}
                  {isOpen && (
                    <div className="bg-white divide-y divide-gray-50">
                      {students.length === 0 ? (
                        <p className="text-sm text-gray-400 p-4 text-center">
                          Nenhum aluno nesta faixa
                        </p>
                      ) : (
                        students.map((s) => (
                          <div
                            key={s.id}
                            className={`flex items-center gap-3 px-4 py-3 ${
                              s.isCurrentUser
                                ? 'bg-teal/10 border-l-4 border-teal'
                                : ''
                            }`}
                          >
                            <span className="text-2xl">{s.tribeIcon}</span>
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
                                {s.tribeName} &mdash; {s.charName}
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
      </div>

      <BottomNav />
    </div>
  )
}
