import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  User,
  School,
  Star,
  Shield,
  Trophy,
  Clock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ChildData {
  id: string
  student_id: string
  name: string
  school_name: string
  tribe_name: string
  tier: number
  total_points: number
  available_points: number
  redeemed_points: number
  consent_given: boolean
  parent_student_id: string
}

interface ActionItem {
  id: string
  description: string
  points: number
  created_at: string
  action_type_name: string
}

export default function ResponsavelDashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [parentName, setParentName] = useState('')
  const [children, setChildren] = useState<ChildData[]>([])
  const [selectedChildIdx, setSelectedChildIdx] = useState(0)
  const [actions, setActions] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionsLoading, setActionsLoading] = useState(false)
  const [error, setError] = useState('')
  const [consentLoading, setConsentLoading] = useState(false)

  const selectedChild = children[selectedChildIdx] || null

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      // Get parent record
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('id, full_name')
        .eq('user_id', user.id)
        .single()

      if (parentError) throw parentError
      setParentName(parentData.full_name)

      // Get linked students
      const { data: links, error: linksError } = await supabase
        .from('parent_students')
        .select(`
          id,
          student_id,
          consent_given,
          students (
            id,
            name,
            total_points,
            available_points,
            redeemed_points,
            tier,
            schools ( name ),
            communities ( name )
          )
        `)
        .eq('parent_id', parentData.id)

      if (linksError) throw linksError

      const mapped: ChildData[] = (links || []).map((link: Record<string, unknown>) => {
        const student = link.students as Record<string, unknown> | null
        const school = student?.schools as Record<string, unknown> | null
        const tribe = student?.communities as Record<string, unknown> | null
        return {
          id: (student?.id as string) || '',
          student_id: link.student_id as string,
          name: (student?.name as string) || 'Aluno',
          school_name: (school?.name as string) || '',
          tribe_name: (tribe?.name as string) || '',
          tier: (student?.tier as number) || 1,
          total_points: (student?.total_points as number) || 0,
          available_points: (student?.available_points as number) || 0,
          redeemed_points: (student?.redeemed_points as number) || 0,
          consent_given: link.consent_given as boolean,
          parent_student_id: link.id as string,
        }
      })

      setChildren(mapped)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados.'
      setError(message)
    }
    setLoading(false)
  }, [user])

  // Fetch child actions
  const fetchActions = useCallback(async () => {
    if (!selectedChild) {
      setActions([])
      return
    }
    setActionsLoading(true)
    try {
      const { data, error: actError } = await supabase
        .from('actions')
        .select('id, description, points, created_at, action_types ( name )')
        .eq('author_id', selectedChild.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (actError) throw actError

      setActions(
        (data || []).map((a: Record<string, unknown>) => {
          const actionType = a.action_types as Record<string, unknown> | null
          return {
            id: a.id as string,
            description: (a.description as string) || '',
            points: (a.points as number) || 0,
            created_at: a.created_at as string,
            action_type_name: (actionType?.name as string) || '',
          }
        })
      )
    } catch {
      setActions([])
    }
    setActionsLoading(false)
  }, [selectedChild])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  const handleConsent = async () => {
    if (!selectedChild) return
    setConsentLoading(true)
    try {
      const { error: updateError } = await supabase
        .from('parent_students')
        .update({ consent_given: true, consent_date: new Date().toISOString() })
        .eq('id', selectedChild.parent_student_id)

      if (updateError) throw updateError

      setChildren((prev) =>
        prev.map((c, i) =>
          i === selectedChildIdx ? { ...c, consent_given: true } : c
        )
      )
    } catch {
      alert('Erro ao autorizar. Tente novamente.')
    }
    setConsentLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0fdfa' }}>
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#028090' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#f0fdfa' }}>
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#dc2626' }} />
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={fetchData} className="px-6 py-2 rounded-xl text-white font-bold" style={{ backgroundColor: '#028090' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8" style={{ backgroundColor: '#f0fdfa' }}>
      {/* Header */}
      <div className="text-white px-4 py-6" style={{ background: 'linear-gradient(135deg, #1F4E79 0%, #028090 100%)' }}>
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Area do Responsavel</p>
            <h1 className="text-xl font-extrabold">{parentName}</h1>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-sm font-semibold">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* Child tabs */}
        {children.length > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
            {children.map((child, i) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildIdx(i)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  backgroundColor: i === selectedChildIdx ? '#028090' : 'transparent',
                  color: i === selectedChildIdx ? '#fff' : '#6b7280',
                }}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}

        {children.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#9ca3af' }} />
            <p className="text-gray-500">Nenhum aluno vinculado.</p>
          </div>
        ) : selectedChild && (
          <>
            {/* Profile card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: '#028090' }}>
                  {selectedChild.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-extrabold" style={{ color: '#1F4E79' }}>{selectedChild.name}</h2>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <School className="w-4 h-4" /> {selectedChild.school_name || 'Escola'}
                  </div>
                  {selectedChild.tribe_name && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <User className="w-4 h-4" /> {selectedChild.tribe_name}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm mt-0.5" style={{ color: '#028090' }}>
                    <Star className="w-4 h-4" /> Tier {selectedChild.tier}
                  </div>
                </div>
              </div>
            </div>

            {/* Points summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold mb-3" style={{ color: '#1F4E79' }}>Pontos</h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0fdfa' }}>
                  <Trophy className="w-5 h-5 mx-auto mb-1" style={{ color: '#028090' }} />
                  <p className="text-xl font-extrabold" style={{ color: '#1F4E79' }}>{selectedChild.total_points}</p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0fdfa' }}>
                  <Star className="w-5 h-5 mx-auto mb-1" style={{ color: '#02C39A' }} />
                  <p className="text-xl font-extrabold" style={{ color: '#1F4E79' }}>{selectedChild.available_points}</p>
                  <p className="text-xs text-gray-400">Disponiveis</p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#f0fdfa' }}>
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1" style={{ color: '#6b7280' }} />
                  <p className="text-xl font-extrabold" style={{ color: '#1F4E79' }}>{selectedChild.redeemed_points}</p>
                  <p className="text-xs text-gray-400">Resgatados</p>
                </div>
              </div>
            </div>

            {/* Consent section */}
            {!selectedChild.consent_given && (
              <div className="bg-white rounded-2xl shadow-lg p-6 border-2" style={{ borderColor: '#f59e0b' }}>
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                  <div className="flex-1">
                    <h3 className="font-bold" style={{ color: '#1F4E79' }}>Consentimento LGPD</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Autorizo a coleta e tratamento dos dados do menor de acordo com a
                      Lei Geral de Protecao de Dados (LGPD). Os dados serao usados
                      exclusivamente para o funcionamento da plataforma educacional
                      Piramide do Bem.
                    </p>
                    <button
                      onClick={handleConsent}
                      disabled={consentLoading}
                      className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold transition-all disabled:opacity-50"
                      style={{ backgroundColor: '#02C39A' }}
                    >
                      {consentLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Autorizar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-bold mb-3" style={{ color: '#1F4E79' }}>Ações recentes</h3>
              {actionsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#028090' }} />
                </div>
              ) : actions.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Nenhuma acao registrada ainda.</p>
              ) : (
                <div className="space-y-3">
                  {actions.map((action) => (
                    <div key={action.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                      <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#028090' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: '#1F4E79' }}>
                          {action.action_type_name || action.description}
                        </p>
                        {action.description && action.action_type_name && (
                          <p className="text-xs text-gray-400 truncate">{action.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(action.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: '#02C39A' }}>
                        +{action.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
