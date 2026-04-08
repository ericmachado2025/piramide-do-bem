import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { X, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, LogOut } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getCharacterDisplayName, getTierLabel, getStudentStreak, generateReferralCode } from '../lib/database'
import type { Student, Badge, Action, ActionType } from '../types'

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

/* ---- faixa helper ---- */
function getFaixa(totalPoints: number) {
  if (totalPoints >= 1000) return { label: 'Ouro', icon: '\u{1F451}', color: 'gold' }
  if (totalPoints >= 600) return { label: 'Prata', icon: '\u{1F948}', color: 'silver' }
  if (totalPoints >= 300) return { label: 'Bronze', icon: '\u{1F949}', color: 'bronze' }
  if (totalPoints >= 100) return { label: 'Ativo', icon: '\u2B50', color: 'blue' }
  return { label: 'Em crescimento', icon: '\u{1F331}', color: 'green' }
}

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; cls: string }> = {
  validated: { icon: CheckCircle, label: 'Validada', cls: 'text-emerald-600 bg-emerald-50' },
  pending: { icon: Clock, label: 'Pendente', cls: 'text-amber-600 bg-amber-50' },
  denied: { icon: XCircle, label: 'Negada', cls: 'text-red-600 bg-red-50' },
  expired: { icon: AlertCircle, label: 'Expirada', cls: 'text-gray-500 bg-gray-100' },
}

export default function Perfil() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showQrModal, setShowQrModal] = useState(false)
  const [showTribeModal, setShowTribeModal] = useState(false)
  const [student, setStudent] = useState<Student | null>(null)
  const [actions, setActions] = useState<(Action & { action_type?: ActionType })[]>([])
  const [badges, setBadges] = useState<{ badge: Badge; earned_at: string }[]>([])
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCharName, setNextCharName] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    if (!user) return

    async function loadData() {
      // Load student with tribe and character
      const { data: studentData } = await supabase
        .from('students')
        .select('*, community:communities(*), character:characters(*)')
        .eq('user_id', user!.id)
        .single()

      if (studentData) {
        setStudent(studentData as Student)

        // Load next character
        if (studentData.community_id) {
          const currentTier = (studentData as Student).character?.level?.tier ?? 1
          const { data: nextChars } = await supabase
            .from('characters')
            .select('name, level:community_levels!inner(tier)')
            .eq('community_id', studentData.community_id)
            .eq('community_levels.tier', currentTier + 1)
            .limit(1)
          if (nextChars?.[0]) setNextCharName(nextChars[0].name)
        }

        // Load actions
        const { data: actionsData } = await supabase
          .from('actions')
          .select('*, action_type:action_types(*)')
          .eq('author_id', studentData.id)
          .order('created_at', { ascending: false })
          .limit(10)
        if (actionsData) setActions(actionsData as typeof actions)

        // Load earned badges
        const { data: studentBadges } = await supabase
          .from('student_badges')
          .select('earned_at, badge:badges(*)')
          .eq('student_id', studentData.id)
        if (studentBadges) setBadges(studentBadges as unknown as typeof badges)
      }

      // Load all badges
      const { data: allBadgesData } = await supabase
        .from('badges')
        .select('*')
        .order('id')
      if (allBadgesData) setAllBadges(allBadgesData)

      // Load streak and referral code
      if (studentData) {
        getStudentStreak(studentData.id).then(s => setStreak(s))
        generateReferralCode(studentData.id).then(c => setReferralCode(c))
      }

      setLoading(false)
    }

    loadData()
  }, [user])

  if (loading || !student) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

  const tribeIcon = student.community?.icon_class
    ? (ICON_MAP[student.community.icon_class] ?? '\u{1F3AE}')
    : '\u{1F3AE}'
  const tribeName = student.community?.name ?? 'Sem comunidade'
  const charName = student.character ? getCharacterDisplayName(student.character, student.character.level) : 'Aprendiz'
  const tierInfo = getTierInfo(student.total_points)
  const faixa = getFaixa(student.total_points)
  const pointsToNext = tierInfo.next ? tierInfo.next.min - student.total_points : 0

  const earnedBadgeIds = new Set(badges.map((b) => b.badge?.id).filter(Boolean))

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
          <h1 className="text-2xl font-bold text-white">{student.name}</h1>
          <p className="text-white/80 text-sm mt-1 text-center">
            {tribeName} &mdash; {charName} ({getTierLabel(tierInfo.current.tier)})
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
            {tierInfo.next && nextCharName ? (
              <p className="text-white/70 text-xs text-center mt-2">
                Faltam <span className="font-bold text-white">{pointsToNext} pontos</span> para
                se tornar {nextCharName}!
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
              { emoji: '\u{1F3C6}', label: 'Pontos Ganhos', value: student.total_points },
              { emoji: '\u{1F4B0}', label: 'Saldo Dispon\u00edvel', value: student.available_points },
              { emoji: '\u{1F381}', label: 'Pontos Resgatados', value: student.redeemed_points },
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

        {/* ===== STREAK + REFERRAL ===== */}
        <div className="flex gap-3">
          {streak > 0 && (
            <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <span className="text-3xl block">{streak >= 30 ? '\u{1F525}\u{1F525}' : streak >= 7 ? '\u{1F525}' : '\u{1F4AA}'}</span>
              <p className="text-sm font-bold text-navy mt-1">Sequencia de {streak} {streak === 1 ? 'dia' : 'dias'}!</p>
              {streak >= 7 && <p className="text-xs text-orange-600 mt-0.5">Pontos x{streak >= 30 ? '2.0' : '1.5'}!</p>}
            </div>
          )}
          {referralCode && (
            <div className="flex-1 bg-teal/5 border border-teal/20 rounded-xl p-4 text-center">
              <span className="text-3xl block">{'\u{1F517}'}</span>
              <p className="text-xs text-gray-500 mt-1">Convide amigos:</p>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/cadastro/perfil?ref=${referralCode}`
                  navigator.clipboard.writeText(url)
                  alert('Link copiado!')
                }}
                className="mt-1 bg-teal text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                Copiar link
              </button>
              <p className="text-[10px] text-gray-400 mt-1">Codigo: {referralCode}</p>
            </div>
          )}
        </div>

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
            <Link
              to="/ranking"
              className="mt-3 flex items-center gap-1 text-teal font-semibold text-sm hover:underline"
            >
              Ver ranking completo <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShowTribeModal(true)}
              className="mt-3 flex items-center gap-2 text-gray-500 text-sm font-medium border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Trocar de Tribo
            </button>
          </div>
        </section>

        {/* ===== QR CODE ===== */}
        <section className="flex flex-col items-center">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center">
            <QRCodeSVG
              value={`piramide://student/${student.id}`}
              size={100}
              bgColor="#FFFFFF"
              fgColor="#1F4E79"
              level="M"
            />
            <p className="text-[10px] text-gray-400 mt-2">ID: {student.email || student.id}</p>
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
              <span className="text-5xl block mb-2">{'\u{1F4CB}'}</span>
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
              {actions.map((a) => {
                const st = statusConfig[a.status] ?? statusConfig.pending
                const StIcon = st.icon
                const date = new Date(a.created_at)
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3"
                  >
                    <span className="text-2xl">{a.action_type?.icon ?? '\u{1F535}'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">
                        {a.action_type?.name ?? 'A\u00e7\u00e3o'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-navy">
                        +{a.points_awarded ?? 0}
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
          {allBadges.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <p className="text-gray-400 text-sm">Selos serao adicionados em breve.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {allBadges.map((b) => {
                const earned = earnedBadgeIds.has(b.id)
                return (
                  <div
                    key={b.id}
                    className={`rounded-xl p-4 flex flex-col items-center text-center transition-all ${
                      earned
                        ? 'bg-white shadow-md'
                        : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <span className="text-3xl mb-1">{earned ? (b.icon ?? '\u{1F3C5}') : '\u{1F512}'}</span>
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
          )}
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
              value={`piramide://student/${student.id}`}
              size={240}
              bgColor="#FFFFFF"
              fgColor="#1F4E79"
              level="H"
            />
            <p className="text-xs text-gray-400 mt-4">{student.name}</p>
            <p className="text-[10px] text-gray-300">{student.email}</p>
          </div>
        </div>
      )}

      {/* ===== TRIBE CHANGE MODAL ===== */}
      {showTribeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setShowTribeModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTribeModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-4xl mb-3">{'\u{1F504}'}</span>
            <h3 className="text-navy font-bold text-lg mb-2">Trocar de Tribo</h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              Ao trocar de tribo, voc&ecirc; manter&aacute; seus pontos e n&iacute;vel, mas receber&aacute; o personagem equivalente da nova tribo. Deseja continuar?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowTribeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await supabase
                    .from('students')
                    .update({ community_id: null, current_character_id: null })
                    .eq('id', student.id)
                  setShowTribeModal(false)
                  navigate('/tribo')
                }}
                className="flex-1 py-2.5 rounded-xl bg-teal text-white font-semibold text-sm hover:bg-teal/90 transition-colors"
              >
                Sim, trocar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout button */}
      <div className="px-4 mb-24">
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/')
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red/30 text-red font-semibold hover:bg-red/5 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair da conta
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
