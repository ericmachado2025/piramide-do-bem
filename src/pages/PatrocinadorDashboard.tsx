import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  Gift,
  Plus,
  X,
  Loader2,
  AlertCircle,
  Trophy,
  CheckCircle2,
  Star,
  Package,
  Users,
  Calendar,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Reward {
  id: string
  name: string
  description: string
  points_cost: number
  category: string
  is_spotlight: boolean
}

interface Redemption {
  id: string
  student_name: string
  reward_name: string
  created_at: string
  status: string
}

const CATEGORIES = [
  { value: 'school', label: 'Escolar' },
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'special', label: 'Especial' },
]

export default function PatrocinadorDashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [businessName, setBusinessName] = useState('')
  const [sponsorId, setSponsorId] = useState('')
  const [rewards, setRewards] = useState<Reward[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'rewards' | 'promotions'>('rewards')

  // Promotions
  const [promotions, setPromotions] = useState<{ id: string; title: string; description: string | null; discount_percent: number | null; active: boolean }[]>([])
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [promoTitle, setPromoTitle] = useState('')
  const [promoDesc, setPromoDesc] = useState('')
  const [promoDiscount, setPromoDiscount] = useState('')
  const [promoMinTier, setPromoMinTier] = useState(1)

  // New reward form
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPoints, setFormPoints] = useState('')
  const [formCategory, setFormCategory] = useState('school')
  const [formSpotlight, setFormSpotlight] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')

    try {
      // Get sponsor record
      const { data: sponsorData, error: sponsorError } = await supabase
        .from('sponsors')
        .select('id, business_name, user:users!sponsors_users_id_fkey(name, email, phone)')
        .eq('user_id', user.id)
        .single()

      if (sponsorError) throw sponsorError
      setBusinessName(sponsorData.business_name)
      setSponsorId(sponsorData.id)

      // Get rewards
      const { data: rewardData, error: rewardError } = await supabase
        .from('rewards')
        .select('id, name, description, points_cost, category, is_spotlight')
        .eq('sponsor_id', sponsorData.id)
        .order('created_at', { ascending: false })

      if (rewardError) throw rewardError
      setRewards(rewardData || [])

      // Get redemptions
      const { data: redemptionData, error: redemptionError } = await supabase
        .from('redemptions')
        .select(`
          id,
          created_at,
          status,
          students ( name ),
          rewards!inner ( name, sponsor_id )
        `)
        .eq('rewards.sponsor_id', sponsorData.id)
        .order('created_at', { ascending: false })

      if (redemptionError) throw redemptionError

      setRedemptions(
        (redemptionData || []).map((r: Record<string, unknown>) => {
          const student = r.students as Record<string, unknown> | null
          const reward = r.rewards as Record<string, unknown> | null
          return {
            id: r.id as string,
            student_name: (student?.name as string) || 'Aluno',
            reward_name: (reward?.name as string) || 'Recompensa',
            created_at: r.created_at as string,
            status: (r.status as string) || 'pending',
          }
        })
      )

      // Load promotions
      const { data: promos } = await supabase.from('promotions')
        .select('id, title, description, discount_percent, active')
        .eq('sponsor_id', sponsorData.id)
        .order('created_at', { ascending: false })
      if (promos) setPromotions(promos)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar dados.'
      setError(message)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateReward = async () => {
    if (!formName.trim() || !formPoints) return
    setFormSaving(true)
    setFormError('')

    try {
      const { error: insertError } = await supabase
        .from('rewards')
        .insert({
          sponsor_id: sponsorId,
          name: formName.trim(),
          description: formDesc.trim(),
          points_cost: parseInt(formPoints),
          category: formCategory,
          is_spotlight: formSpotlight,
        })

      if (insertError) throw insertError

      // Reset form
      setFormName('')
      setFormDesc('')
      setFormPoints('')
      setFormCategory('school')
      setFormSpotlight(false)
      setShowForm(false)

      // Refresh rewards
      const { data } = await supabase
        .from('rewards')
        .select('id, name, description, points_cost, category, is_spotlight')
        .eq('sponsor_id', sponsorId)
        .order('created_at', { ascending: false })

      setRewards(data || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar recompensa.'
      setFormError(message)
    }
    setFormSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleCreatePromo = async () => {
    if (!promoTitle.trim() || !sponsorId) return
    const { data } = await supabase.from('promotions').insert({
      sponsor_id: sponsorId,
      title: promoTitle,
      description: promoDesc || null,
      discount_percent: promoDiscount ? parseInt(promoDiscount) : null,
      min_tier: promoMinTier,
      active: true,
    }).select().single()
    if (data) setPromotions(prev => [data, ...prev])
    setPromoTitle(''); setPromoDesc(''); setPromoDiscount(''); setShowPromoForm(false)
  }

  const handleTogglePromo = async (promoId: string, currentActive: boolean) => {
    await supabase.from('promotions').update({ active: !currentActive }).eq('id', promoId)
    setPromotions(prev => prev.map(p => p.id === promoId ? { ...p, active: !currentActive } : p))
  }

  const handleDeletePromo = async (promoId: string) => {
    await supabase.from('promotions').delete().eq('id', promoId)
    setPromotions(prev => prev.filter(p => p.id !== promoId))
  }

  const totalRewards = rewards.length
  const totalRedeemed = redemptions.length

  const getCategoryLabel = (cat: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente'
      case 'approved': return 'Aprovado'
      case 'delivered': return 'Entregue'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b'
      case 'approved': return '#028090'
      case 'delivered': return '#02C39A'
      case 'cancelled': return '#dc2626'
      default: return '#6b7280'
    }
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
            <p className="text-sm opacity-80">Area do Patrocinador</p>
            <h1 className="text-xl font-extrabold">{businessName}</h1>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors text-sm font-semibold">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <Gift className="w-6 h-6 mx-auto mb-2" style={{ color: '#028090' }} />
            <p className="text-2xl font-extrabold" style={{ color: '#1F4E79' }}>{totalRewards}</p>
            <p className="text-xs text-gray-400">Recompensas oferecidas</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-5 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2" style={{ color: '#02C39A' }} />
            <p className="text-2xl font-extrabold" style={{ color: '#1F4E79' }}>{totalRedeemed}</p>
            <p className="text-xs text-gray-400">Total resgatadas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('rewards')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'rewards' ? 'bg-teal text-white' : 'bg-gray-100 text-gray-500'}`}>
            Recompensas
          </button>
          <button onClick={() => setActiveTab('promotions')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'promotions' ? 'bg-teal text-white' : 'bg-gray-100 text-gray-500'}`}>
            Promocoes
          </button>
        </div>

        {activeTab === 'promotions' ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg" style={{ color: '#1F4E79' }}>Minhas Promocoes</h3>
              <button onClick={() => setShowPromoForm(true)} className="text-sm font-semibold text-teal">+ Nova</button>
            </div>

            {showPromoForm && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <input type="text" placeholder="Titulo da promocao" value={promoTitle}
                  onChange={e => setPromoTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                <textarea placeholder="Descricao (opcional)" value={promoDesc}
                  onChange={e => setPromoDesc(e.target.value)} rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm resize-none" />
                <div className="flex gap-2">
                  <input type="number" placeholder="% desconto" value={promoDiscount}
                    onChange={e => setPromoDiscount(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                  <select value={promoMinTier} onChange={e => setPromoMinTier(Number(e.target.value))}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm">
                    <option value={1}>Tier 1+</option>
                    <option value={2}>Tier 2+</option>
                    <option value={3}>Tier 3+</option>
                    <option value={4}>Tier 4+</option>
                    <option value={5}>Tier 5+</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowPromoForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={handleCreatePromo} disabled={!promoTitle.trim()}
                    className="flex-1 py-2 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Criar</button>
                </div>
              </div>
            )}

            {promotions.length === 0 && !showPromoForm ? (
              <div className="text-center py-6">
                <span className="text-4xl block mb-2">{'\u{1F381}'}</span>
                <p className="text-gray-400 text-sm">Nenhuma promocao ainda. Crie sua primeira!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {promotions.map(p => (
                  <div key={p.id} className={`rounded-xl p-3 border ${p.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-navy">{p.title}</p>
                        {p.description && <p className="text-xs text-gray-500">{p.description}</p>}
                        {p.discount_percent && <span className="text-xs font-bold text-teal">{p.discount_percent}% OFF</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleTogglePromo(p.id, p.active)}
                          className={`text-xs px-2 py-1 rounded ${p.active ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {p.active ? 'Pausar' : 'Ativar'}
                        </button>
                        <button onClick={() => handleDeletePromo(p.id)}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">Excluir</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
        <>

        {/* My Rewards */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg" style={{ color: '#1F4E79' }}>Recompensas que ofereci</h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
              style={{ backgroundColor: '#02C39A' }}
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Cancelar' : 'Oferecer Nova Recompensa'}
            </button>
          </div>

          {/* New reward form */}
          {showForm && (
            <div className="mb-4 p-4 rounded-xl space-y-3" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <input
                type="text"
                placeholder="Nome da recompensa"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none text-base transition-colors"
                onFocus={(e) => (e.target.style.borderColor = '#028090')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                autoFocus
              />
              <textarea
                placeholder="Descricao"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none text-base transition-colors resize-none"
                onFocus={(e) => (e.target.style.borderColor = '#028090')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              />
              <input
                type="number"
                placeholder="Custo em pontos"
                value={formPoints}
                onChange={(e) => setFormPoints(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none text-base transition-colors"
                onFocus={(e) => (e.target.style.borderColor = '#028090')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                min={1}
              />
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none text-base transition-colors bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={{
                    backgroundColor: formSpotlight ? '#028090' : '#fff',
                    borderColor: formSpotlight ? '#028090' : '#d1d5db',
                  }}
                >
                  {formSpotlight && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={formSpotlight}
                  onChange={(e) => setFormSpotlight(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-sm text-gray-700">Sexta do Patrocinador (destaque)</span>
              </label>
              {formError && <p className="text-sm" style={{ color: '#dc2626' }}>{formError}</p>}
              <button
                onClick={handleCreateReward}
                disabled={formSaving || !formName.trim() || !formPoints}
                className="w-full py-3 rounded-xl font-bold text-white text-base transition-all disabled:opacity-50"
                style={{ backgroundColor: '#028090' }}
              >
                {formSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Salvar recompensa'}
              </button>
            </div>
          )}

          {/* Rewards list */}
          {rewards.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Você ainda não ofereceu nenhuma recompensa. Que tal começar agora?</p>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => (
                <div key={reward.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                  <Package className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#028090' }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1F4E79' }}>{reward.name}</p>
                      {reward.is_spotlight && (
                        <Star className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
                      )}
                    </div>
                    {reward.description && (
                      <p className="text-xs text-gray-400 truncate">{reward.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{getCategoryLabel(reward.category)}</p>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: '#02C39A' }}>
                    {reward.points_cost} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Redemptions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-lg mb-4" style={{ color: '#1F4E79' }}>Resgates</h3>
          {redemptions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum aluno resgatou ainda — assim que acontecer, você verá aqui!</p>
          ) : (
            <div className="space-y-3">
              {redemptions.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ backgroundColor: '#f9fafb' }}>
                  <Users className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#028090' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: '#1F4E79' }}>{r.student_name}</p>
                    <p className="text-xs text-gray-400">{r.reward_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: getStatusColor(r.status) + '20', color: getStatusColor(r.status) }}
                  >
                    {getStatusLabel(r.status)}
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
