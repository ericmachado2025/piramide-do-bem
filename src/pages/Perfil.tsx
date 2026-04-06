import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { X, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { useLocalUser } from '../hooks/useLocalUser'
import { tribes, characters } from '../data/tribes'
import { badges } from '../data/badges'
import { actionTypes } from '../data/actions'

/* ---- tier helpers ---- */
const TIER_THRESHOLDS = [
  { tier: 1, min: 0, max: 99 },
  { tier: 2, min: 100, max: 299 },
  { tier: 3, min: 300, max: 599 },
  { tier: 4, min: 600, max: 999 },
  { tier: 5, min: 1000, max: Infinity },
]

function getTierInfo(points: number) {
  const current = TIER_THRESHOLDS.find(
    (t) => points >= t.min && points <= t.max,
  )!
  const next = TIER_THRESHOLDS.find((t) => t.tier === current.tier + 1)
  const progress = next
    ? ((points - current.min) / (next.min - current.min)) * 100
    : 100
  return { current, next, progress: Math.min(progress, 100) }
}

function getCharacterForTribe(tribeId: string, tier: number) {
  return characters.find((c) => c.tribe_id === tribeId && c.tier === tier)
}

function getNextCharacterForTribe(tribeId: string, tier: number) {
  return characters.find((c) => c.tribe_id === tribeId && c.tier === tier + 1)
}

/* ---- faixa helper ---- */
function getFaixa(totalPoints: number, allPoints: number[]) {
  const below = allPoints.filter((p) => p <= totalPoints).length
  const percentile = (below / allPoints.length) * 100
  if (percentile >= 95) return { label: 'Ouro', icon: '\u{1F451}', color: 'gold' }
  if (percentile >= 90) return { label: 'Prata', icon: '\u{1F948}', color: 'silver' }
  if (percentile >= 75) return { label: 'Bronze', icon: '\u{1F949}', color: 'bronze' }
  if (percentile >= 50) return { label: 'Ativo', icon: '\u2B50', color: 'blue' }
  return { label: 'Em crescimento', icon: '\u{1F331}', color: 'green' }
}

/* ---- stored action type ---- */
interface StoredAction {
  id: string
  actionTypeId: string
  beneficiaryName: string
  status: 'pending' | 'validated' | 'denied' | 'expired'
  pointsAwarded: number
  createdAt: string
}

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; cls: string }> = {
  validated: { icon: CheckCircle, label: 'Validada', cls: 'text-emerald-600 bg-emerald-50' },
  pending: { icon: Clock, label: 'Pendente', cls: 'text-amber-600 bg-amber-50' },
  denied: { icon: XCircle, label: 'Negada', cls: 'text-red-600 bg-red-50' },
  expired: { icon: AlertCircle, label: 'Expirada', cls: 'text-gray-500 bg-gray-100' },
}

/* ---- badge earned logic (simple) ---- */
function getEarnedBadgeIds(totalPoints: number, actionsCount: number): string[] {
  const earned: string[] = []
  if (actionsCount >= 1) earned.push('badge-1')
  if (actionsCount >= 7) earned.push('badge-2')
  if (totalPoints >= 100) earned.push('badge-3')
  if (actionsCount >= 5) earned.push('badge-4')
  if (actionsCount >= 10) earned.push('badge-5')
  if (actionsCount >= 3) earned.push('badge-6')
  // badge-7 and badge-8 are percentile-based, approximate
  if (totalPoints >= 500) earned.push('badge-7')
  if (totalPoints >= 800) earned.push('badge-8')
  return earned
}

export default function Perfil() {
  const { user } = useLocalUser()
  const [showQrModal, setShowQrModal] = useState(false)
  const [actions, setActions] = useState<StoredAction[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('piramide-actions')
      if (raw) setActions(JSON.parse(raw))
    } catch {
      /* empty */
    }
  }, [])

  /* simulate school points for faixa calculation */
  const allSchoolPoints = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 150; i++) {
      pts.push(Math.floor(Math.random() * 1200))
    }
    if (user) pts.push(user.totalPoints)
    return pts
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

  const tribe = tribes.find((t) => t.id === user.tribeId)
  const tribeIcon = tribe?.icon ?? user.tribeEmoji
  const tribeName = tribe?.name ?? user.tribeName

  const tierInfo = getTierInfo(user.totalPoints)
  const currentChar = getCharacterForTribe(user.tribeId, tierInfo.current.tier)
  const nextChar = getNextCharacterForTribe(user.tribeId, tierInfo.current.tier)
  const charName = currentChar?.name ?? user.characterName

  const faixa = getFaixa(user.totalPoints, allSchoolPoints)
  const percentile = Math.round(
    (allSchoolPoints.filter((p) => p <= user.totalPoints).length / allSchoolPoints.length) * 100,
  )
  const topPercent = 100 - percentile

  const pointsToNext = tierInfo.next ? tierInfo.next.min - user.totalPoints : 0

  const earnedBadgeIds = getEarnedBadgeIds(user.totalPoints, actions.length)

  const faixaBorderColors: Record<string, string> = {
    gold: 'border-gold bg-yellow-50',
    silver: 'border-silver bg-gray-50',
    bronze: 'border-bronze bg-orange-50',
    blue: 'border-blue-400 bg-blue-50',
    green: 'border-emerald-400 bg-emerald-50',
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* ===== HEADER ===== */}
      <div className="gradient-bg px-6 pt-10 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex flex-col items-center">
          <span className="text-7xl mb-2 drop-shadow-lg">{tribeIcon}</span>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-white/80 text-sm mt-1 text-center">
            {tribeName} &mdash; {charName} (Tier {tierInfo.current.tier})
          </p>

          {/* progress bar */}
          <div className="w-full max-w-xs mt-5">
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${tierInfo.progress}%`,
                  background: 'linear-gradient(90deg, #028090, #02C39A)',
                }}
              />
            </div>
            {tierInfo.next && nextChar ? (
              <p className="text-white/70 text-xs text-center mt-2">
                Faltam <span className="font-bold text-white">{pointsToNext} pontos</span> para
                se tornar {nextChar.name}!
              </p>
            ) : (
              <p className="text-white/70 text-xs text-center mt-2">
                Tier m&aacute;ximo atingido! Voc&ecirc; &eacute; lend&aacute;rio!
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6 max-w-lg mx-auto">
        {/* ===== COFRINHOS ===== */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3 mt-6">Cofrinhos Digitais</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '\u{1F3C6}', label: 'Pontos Ganhos', value: user.totalPoints },
              { emoji: '\u{1F4B0}', label: 'Saldo Dispon\u00edvel', value: user.availablePoints },
              { emoji: '\u{1F381}', label: 'Pontos Resgatados', value: user.redeemedPoints },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center text-center"
              >
                <span className="text-3xl mb-1">{c.emoji}</span>
                <span className="text-[11px] text-gray-500 leading-tight">{c.label}</span>
                <span className="text-2xl font-bold text-navy mt-1">{c.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== QUALISCORE ===== */}
        <section>
          <div
            className={`rounded-xl border-2 p-5 ${faixaBorderColors[faixa.color] ?? 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{faixa.icon}</span>
              <div>
                <h3 className="font-bold text-navy text-lg">QualiScore</h3>
                <p className="text-sm text-gray-600">Faixa: {faixa.label}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mt-2">
              Voc&ecirc; est&aacute; no{' '}
              <span className="font-bold text-teal">Top {topPercent > 0 ? topPercent : 1}%</span>{' '}
              da sua escola
            </p>
            <Link
              to="/ranking"
              className="mt-3 flex items-center gap-1 text-teal font-semibold text-sm hover:underline"
            >
              Ver ranking completo <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ===== QR CODE ===== */}
        <section className="flex flex-col items-center">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center">
            <QRCodeSVG
              value={`piramide://student/${user.email}`}
              size={100}
              bgColor="#FFFFFF"
              fgColor="#1F4E79"
              level="M"
            />
            <p className="text-[10px] text-gray-400 mt-2">ID: {user.email}</p>
          </div>
          <button
            onClick={() => setShowQrModal(true)}
            className="mt-2 text-teal font-semibold text-sm hover:underline"
          >
            Ampliar QR Code
          </button>
        </section>

        {/* ===== HISTORICO ===== */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Hist&oacute;rico de a&ccedil;&otilde;es</h2>
          {actions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <span className="text-5xl block mb-2">📋</span>
              <p className="text-gray-500 text-sm">
                Nenhuma a&ccedil;&atilde;o registrada ainda. Que tal come&ccedil;ar agora?
              </p>
              <Link
                to="/registrar"
                className="mt-3 inline-block bg-teal text-white rounded-full px-5 py-2 text-sm font-semibold"
              >
                Registrar a&ccedil;&atilde;o
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.slice(0, 10).map((a) => {
                const at = actionTypes.find((t) => t.id === a.actionTypeId)
                const st = statusConfig[a.status] ?? statusConfig.pending
                const StIcon = st.icon
                const date = new Date(a.createdAt)
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3"
                  >
                    <span className="text-2xl">{at?.icon ?? '🔵'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">
                        {at?.name ?? 'A\u00e7\u00e3o'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {a.beneficiaryName} &middot;{' '}
                        {date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-navy">
                        +{a.pointsAwarded}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${st.cls}`}
                      >
                        <StIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ===== SELOS ===== */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Selos conquistados</h2>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((b) => {
              const earned = earnedBadgeIds.includes(b.id)
              return (
                <div
                  key={b.id}
                  className={`rounded-xl p-4 flex flex-col items-center text-center transition-all ${
                    earned
                      ? 'bg-white shadow-md'
                      : 'bg-gray-100 opacity-60'
                  }`}
                >
                  <span className="text-3xl mb-1">{earned ? b.icon : '\u{1F512}'}</span>
                  <span
                    className={`text-[11px] leading-tight font-medium ${
                      earned ? 'text-navy' : 'text-gray-400'
                    }`}
                  >
                    {b.name}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* ===== QR MODAL ===== */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-navy font-bold text-lg mb-4">Meu QR Code</h3>
            <QRCodeSVG
              value={`piramide://student/${user.email}`}
              size={240}
              bgColor="#FFFFFF"
              fgColor="#1F4E79"
              level="H"
            />
            <p className="text-xs text-gray-400 mt-4">{user.name}</p>
            <p className="text-[10px] text-gray-300">{user.email}</p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
