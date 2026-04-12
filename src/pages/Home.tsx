import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, Clock, CheckCircle2, Sparkles, ScanLine } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getCharacterDisplayName, getTierLabel } from '../lib/database'
import { generateCharacterAvatar } from '../lib/avatarGenerator'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import QrScanner from '../components/QrScanner'
import FloatingFriendButton from '../components/FloatingFriendButton'
import RecommendSponsorButton from '../components/RecommendSponsorButton'
import InstallButton from '../components/InstallButton'
import HelpRequestModal from '../components/HelpRequestModal'
import type { Student, Action, ActionType } from '../types'

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
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [friendRequests, setFriendRequests] = useState<{ id: string; name: string; created_at: string }[]>([])
  const [showSmartScanner, setShowSmartScanner] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [transferMsg, setTransferMsg] = useState('')

  // Auto-process transfer from URL (camera nativa escaneia QR → abre /home?transfer=CODE)
  useEffect(() => {
    const transferCode = searchParams.get('transfer')
    if (!transferCode || !student) return
    // Remove param from URL immediately to prevent re-processing on refresh
    setSearchParams({}, { replace: true })
    async function processTransfer(code: string) {
      const { data: pt, error } = await supabase.from('pending_transfers')
        .select('id, sender_id, amount, status').eq('code', code).eq('status', 'waiting').single()
      if (error || !pt) { setTransferMsg('Codigo de transferencia invalido ou expirado.'); return }
      await supabase.from('pending_transfers')
        .update({ status: 'scanned', receiver_id: (student as any).id, scanned_at: new Date().toISOString() })
        .eq('id', pt.id)
      setTransferMsg(`Transferencia de ${pt.amount} creditos registrada! Aguarde a confirmacao do remetente.`)
    }
    processTransfer(transferCode)
  }, [searchParams, student, setSearchParams])

  const handleSmartScan = useCallback(async (data: string) => {
    setShowSmartScanner(false)
    try {
      const url = new URL(data)
      const path = url.pathname
      const params = url.searchParams

      // Validar ação de colega
      if (params.get('token') || path.includes('/validar')) {
        const token = params.get('token')
        navigate(token ? `/validar?token=${token}` : '/validar')
        return
      }
      // Receber transferência de créditos — processar direto
      if (params.get('transfer') || path.includes('/creditos')) {
        const code = params.get('transfer')
        if (code && student) {
          try {
            const { data: pt, error } = await supabase.from('pending_transfers')
              .select('id, sender_id, amount, status').eq('code', code).eq('status', 'waiting').single()
            if (error || !pt) {
              setTransferMsg('Codigo de transferencia invalido ou expirado.')
              return
            }
            await supabase.from('pending_transfers')
              .update({ status: 'scanned', receiver_id: (student as any).id, scanned_at: new Date().toISOString() })
              .eq('id', pt.id)
            setTransferMsg(`Transferencia de ${pt.amount} creditos registrada! Aguarde a confirmacao do remetente.`)
          } catch {
            setTransferMsg('Erro ao processar transferencia. Tente novamente.')
          }
        } else {
          navigate('/creditos')
        }
        return
      }
      // Perfil de aluno
      if (path.includes('/aluno/')) {
        navigate(path)
        return
      }
      // Benefício de patrocinador
      if (params.get('code') || path.includes('/beneficio') || path.includes('/recompensas')) {
        const code = params.get('code')
        navigate(code ? `/recompensas?code=${code}` : '/recompensas')
        return
      }
    } catch {
      // Não é URL — pode ser UUID puro (QR antigo de ação)
      if (/^[0-9a-f-]{36}$/i.test(data)) {
        navigate(`/validar?token=${data}`)
        return
      }
    }
    setTransferMsg('QR Code nao reconhecido.')
  }, [navigate, student])

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
        .select('*, user:users!students_users_id_fkey(name, email, phone, whatsapp), community:communities(*), character:characters(*)')
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

      // Load pending actions count — apenas as do próprio aluno
      const { count } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('author_id', studentData.id)

      setPendingCount(count || 0)

      // Load pending friend requests (where I am the addressee)
      const { data: friendReqs } = await supabase.from('friendships')
        .select('id, created_at, requester:students!friendships_requester_id_fkey(user:users!students_users_id_fkey(name))')
        .eq('addressee_id', studentData.id).eq('status', 'pending').order('created_at', { ascending: false })
      if (friendReqs) {
        setFriendRequests(friendReqs.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: ((r.requester as Record<string, unknown>)?.user as Record<string, unknown>)?.name as string || 'Colega',
          created_at: r.created_at as string,
        })))
      }

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

  if (!student) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <p className="text-gray-500 text-sm mb-4">Nao foi possivel carregar seu perfil.</p>
      <button onClick={() => window.location.reload()} className="bg-teal text-white font-bold py-3 px-6 rounded-xl">
        Recarregar
      </button>
      <button onClick={() => window.location.href = '/login'} className="mt-3 text-gray-400 text-sm">
        Ir para o login
      </button>
    </div>
  )

  const tribeEmoji = getTribeEmoji(student.community?.icon_class ?? null)
  const currentTier = student.character?.level?.tier ?? 1
  const tierProgress = Math.min(((student.total_points % 100) / 100) * 100, 100)

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="gradient-bg px-5 pt-8 pb-6 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Ola, {(student as any).user?.name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || 'Heroi'}! <span className="inline-block animate-bounce">🎮</span>
              </h1>
              <p className="text-white/70 text-sm mt-1">O que você vai aprontar hoje?</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSmartScanner(true)} className="p-2 text-white/60 hover:text-white" title="Escanear QR Code">
                <ScanLine className="w-5 h-5" />
              </button>
              <Link to="/como-funciona" className="p-2 text-white/60 hover:text-white text-lg font-bold">?</Link>
              {(() => {
                const totalNotifs = pendingCount + friendRequests.length
                return totalNotifs > 0 ? (
                  <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
                    className="relative p-2">
                    <span className="text-2xl">{'\u{1F514}'}</span>
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{totalNotifs}</span>
                  </button>
                ) : (
                  <span className="text-2xl opacity-40 p-2">{'\u{1F514}'}</span>
                )
              })()}
            </div>
          </div>

          {/* Mini avatar / stats */}
          <div className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
            <div className="relative">
              {(student as unknown as Record<string, unknown>).avatar_url ? (
                <img src={(student as unknown as Record<string, unknown>).avatar_url as string} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
              ) : student.character ? (
                <div className="w-12 h-12 flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: generateCharacterAvatar({
                    name: student.character.name ?? '',
                    archetype: student.character.archetype ?? null,
                    tier: student.character.level?.tier ?? 1,
                    communityColor: student.community?.color_hex ?? null
                  }, 48) }}
                />
              ) : (
                <div className="text-4xl">{tribeEmoji}</div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold text-sm">
                  {student.character ? getCharacterDisplayName(student.character, student.character.level) : 'Aprendiz'}
                </span>
                <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                  {getTierLabel(currentTier)}
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
                <Link to="/creditos" className="text-green text-xs font-semibold hover:text-white transition-colors">
                  {'\u{1F4B0}'} {student.available_points ?? 0} creditos
                </Link>
                <span className="text-white/60 text-xs">{student.community?.name ?? 'Sem comunidade'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-6 space-y-4">
        {/* PWA Install */}
        <InstallButton />

        {/* Transfer notification banner */}
        {transferMsg && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center">
            <span className="text-2xl block mb-1">{'\u{1F389}'}</span>
            <p className="text-green-800 font-semibold text-sm">{transferMsg}</p>
            <button onClick={() => setTransferMsg('')} className="mt-2 text-xs text-gray-400">Fechar</button>
          </div>
        )}

        {/* Friend Requests */}
        {friendRequests.length > 0 && (
          <div className="bg-white border-2 border-purple-300 rounded-2xl shadow-md p-4">
            <h3 className="font-bold text-navy text-sm mb-2">{'\u{1F465}'} Pedidos de amizade ({friendRequests.length})</h3>
            <div className="space-y-2">
              {friendRequests.map(fr => (
                <div key={fr.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-semibold text-navy">{fr.name}</p>
                    <p className="text-[10px] text-gray-400">{new Date(fr.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      await supabase.from('friendships').update({ status: 'accepted', points_awarded: true }).eq('id', fr.id)
                      // Award 10 pts to both (me = addressee, fr = requester)
                      const { data: friendship } = await supabase.from('friendships').select('requester_id, addressee_id').eq('id', fr.id).single()
                      if (friendship) {
                        for (const sid of [friendship.requester_id, friendship.addressee_id]) {
                          if (!sid) continue
                          const { data: s } = await supabase.from('students').select('total_points, available_points').eq('id', sid).single()
                          if (s) {
                            const newBalance = (s.available_points ?? 0) + 10
                            await supabase.from('students').update({
                              total_points: (s.total_points ?? 0) + 10,
                              available_points: newBalance,
                            }).eq('id', sid)
                            await supabase.from('credit_transactions').insert({
                              student_id: sid, type: 'earned', amount: 10,
                              balance_after: newBalance,
                              description: 'Amizade aceita (+10 pts)',
                              related_id: fr.id, related_type: 'friendship',
                            })
                          }
                        }
                      }
                      setFriendRequests(prev => prev.filter(r => r.id !== fr.id))
                    }} className="bg-teal text-white text-xs font-bold px-3 py-1.5 rounded-lg">Aceitar</button>
                    <button onClick={async () => {
                      await supabase.from('friendships').update({ status: 'rejected' }).eq('id', fr.id)
                      setFriendRequests(prev => prev.filter(r => r.id !== fr.id))
                    }} className="bg-gray-200 text-gray-500 text-xs font-bold px-3 py-1.5 rounded-lg">Recusar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Cards */}
        <Link
          to="/registrar"
          className="block gradient-card rounded-2xl shadow-md p-5 text-white group hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤝</span>
              <div>
                <h3 className="font-bold text-lg">Fiz uma boa ação! 🤝</h3>
                <p className="text-white/70 text-sm">Compartilhe o que voce fez de bom</p>
              </div>
            </div>
            <ChevronRight className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Help Request Card */}
        <button onClick={() => setShowHelpModal(true)}
          className="w-full block bg-white border-2 border-orange-300 rounded-2xl shadow-md p-5 group hover:shadow-lg transition-all duration-200 active:scale-[0.98] text-left">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{'\u{1F64B}'}</span>
              <div>
                <h3 className="font-bold text-lg text-navy">Preciso de ajuda!</h3>
                <p className="text-gray-500 text-sm">Peca ajuda a colegas ou monitores</p>
              </div>
            </div>
            <ChevronRight className="text-orange-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* See help requests from others */}
        <Link to="/monitoria"
          className="w-full block bg-white border-2 border-purple-300 rounded-2xl shadow-md p-5 group hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{'\u{1F4D6}'}</span>
              <div>
                <h3 className="font-bold text-lg text-navy">Pedidos de ajuda</h3>
                <p className="text-gray-500 text-sm">Veja quem precisa de ajuda e ofereca a sua</p>
              </div>
            </div>
            <ChevronRight className="text-purple-400 group-hover:translate-x-1 transition-transform" />
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
                <h3 className="font-bold text-lg text-navy">Confirmar acao de um colega</h3>
                <p className="text-gray-500 text-sm">Alguém precisa do seu ok!</p>
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

        {/* Convide amigos */}
        <Link to="/perfil"
          className="block bg-gradient-to-r from-purple-600 to-pink-500 rounded-2xl shadow-md p-5 text-white group hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{'\u{1F4E8}'}</span>
              <div>
                <h3 className="font-bold text-lg">Convide amigos para a Piramide!</h3>
                <p className="text-white/70 text-sm">Ganhe ate 25 pts por convite aceito</p>
              </div>
            </div>
            <ChevronRight className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link to="/mapa"
          className="block bg-gradient-to-r from-[#1F4E79] to-teal rounded-2xl shadow-md p-5 text-white group hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{'\u{1F30E}'}</span>
              <div>
                <h3 className="font-bold text-lg">Nosso impacto no Brasil</h3>
                <p className="text-white/70 text-sm">Veja o que a Piramide ja construiu</p>
              </div>
            </div>
            <ChevronRight className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Quick links row */}
        <div className="flex gap-3">
          <Link to="/monitoria" className="flex-1 bg-white rounded-2xl shadow-md p-4 text-center hover:shadow-lg transition-all active:scale-[0.98]">
            <span className="text-2xl block mb-1">{'\u{1F4D6}'}</span>
            <p className="font-semibold text-navy text-xs">Monitoria</p>
            <p className="text-[10px] text-teal">Pedidos de ajuda</p>
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
          <Link to="/validar" className="bg-yellow/10 border border-yellow/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-yellow/20 transition-colors">
            <Clock className="text-yellow" size={24} />
            <div>
              <p className="text-sm font-semibold text-navy">
                {pendingCount} {pendingCount === 1 ? 'ação esperando um colega' : 'ações esperando um colega'}
              </p>
              <p className="text-xs text-gray-500">Toque aqui para acompanhar →</p>
            </div>
          </Link>
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
                <p className="text-gray-400 text-sm">Sua primeira boa ação está esperando por você! Que tal agora?</p>
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

      {showHelpModal && student && (
        <HelpRequestModal
          studentId={student.id}
          schoolId={student.school_id}
          onClose={() => setShowHelpModal(false)}
          onSent={() => setShowHelpModal(false)}
        />
      )}
      <FloatingFriendButton />
      <RecommendSponsorButton />
      {showSmartScanner && (
        <QrScanner onScan={(data) => {
          setShowSmartScanner(false)
          // Pequeno delay para garantir que o scanner desmontou antes de processar
          setTimeout(() => handleSmartScan(data), 200)
        }} onClose={() => setShowSmartScanner(false)} />
      )}

      <BottomNav />
    </div>
  )
}
