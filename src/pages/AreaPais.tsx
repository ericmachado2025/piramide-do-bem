import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Trophy, Star, Calendar, Gift, Bell, Plus } from 'lucide-react'

type Tab = 'login' | 'dashboard'
type DashTab = 'resumo' | 'acoes' | 'premios' | 'notificacoes'

// Simulated child data
const CHILD_DATA = {
  name: 'Eric Machado',
  tribe: '⚡',
  tribeName: 'Guerreiros Saiyajin',
  character: 'Super Saiyajin',
  tier: 2,
  totalPoints: 145,
  availablePoints: 95,
  redeemedPoints: 50,
  attendance: { present: 18, absent: 2, total: 20 },
  recentActions: [
    { id: 'a1', name: 'Ajudei colega no dever', points: 10, status: 'validated', date: '2026-04-04' },
    { id: 'a2', name: 'Mediei conflito', points: 25, status: 'validated', date: '2026-04-03' },
    { id: 'a3', name: 'Compartilhei material', points: 10, status: 'pending', date: '2026-04-02' },
    { id: 'a4', name: 'Acolhi aluno novo', points: 15, status: 'validated', date: '2026-04-01' },
    { id: 'a5', name: 'Fui monitor de grupo', points: 20, status: 'validated', date: '2026-03-30' },
  ],
  weeklyProgress: [12, 18, 25, 30, 35, 28, 42],
}

const NOTIFICATIONS = [
  { id: 'n1', title: 'Subiu de Tier!', message: 'Eric alcancou o Tier 2 — Super Saiyajin!', date: '2026-04-03', read: false },
  { id: 'n2', title: 'Acao validada', message: 'A acao "Mediei conflito" (+25pts) foi validada.', date: '2026-04-03', read: false },
  { id: 'n3', title: 'Selo conquistado', message: 'Eric conquistou o selo "Centenario" (100+ pontos)!', date: '2026-04-01', read: true },
  { id: 'n4', title: 'Frequencia', message: 'Eric esteve presente em todas as aulas esta semana.', date: '2026-03-28', read: true },
]

export default function AreaPais() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [dashTab, setDashTab] = useState<DashTab>('resumo')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Family rewards
  const [familyRewards, setFamilyRewards] = useState([
    { id: 'fr1', name: 'Cinema em familia', criteria: 'Tier 3', status: 'active' as const },
    { id: 'fr2', name: '1h extra de videogame', criteria: '100% frequencia no mes', status: 'active' as const },
  ])
  const [showNewReward, setShowNewReward] = useState(false)
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardCriteria, setNewRewardCriteria] = useState('')

  const child = CHILD_DATA
  const tierProgress = Math.min(((child.totalPoints % 200) / 200) * 100, 100)

  const handleLogin = () => {
    // Prototype: accept any valid-looking login
    if (loginEmail.includes('@') && loginPassword.length >= 6) {
      setTab('dashboard')
    }
  }

  const handleAddReward = () => {
    if (!newRewardName || !newRewardCriteria) return
    setFamilyRewards((prev) => [
      ...prev,
      { id: `fr${Date.now()}`, name: newRewardName, criteria: newRewardCriteria, status: 'active' as const },
    ])
    setNewRewardName('')
    setNewRewardCriteria('')
    setShowNewReward(false)
  }

  // LOGIN SCREEN
  if (tab === 'login') {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
        <div className="w-full max-w-md">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md" style={{ animation: 'fadeSlideIn 0.35s ease-out' }}>
          <div className="text-center mb-6">
            <span className="text-5xl">👨‍👩‍👧</span>
            <h2 className="text-2xl font-extrabold text-navy mt-2">Area de Pais</h2>
            <p className="text-gray-400 text-sm mt-1">Acompanhe o progresso do seu filho</p>
          </div>

          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email do responsavel"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg"
              autoFocus
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Senha"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg pr-12"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={handleLogin}
              disabled={!loginEmail.includes('@') || loginPassword.length < 6}
              className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all ${
                loginEmail.includes('@') && loginPassword.length >= 6
                  ? 'bg-teal text-white hover:bg-teal/90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Entrar
            </button>
          </div>
        </div>

        <style>{`@keyframes fadeSlideIn { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }`}</style>
      </div>
    )
  }

  // DASHBOARD
  return (
    <div className="min-h-screen bg-bg pb-8">
      {/* Header */}
      <div className="gradient-bg px-5 pt-8 pb-6 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setTab('login')} className="p-1 rounded-full bg-white/10 hover:bg-white/20">
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Area de Pais</h1>
          </div>

          {/* Child mini profile */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
            <span className="text-4xl">{child.tribe}</span>
            <div className="flex-1">
              <h2 className="text-white font-bold">{child.name}</h2>
              <p className="text-white/70 text-xs">{child.tribeName} — {child.character} (Tier {child.tier})</p>
              <div className="mt-2 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-green rounded-full" style={{ width: `${tierProgress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4">
        {/* Dashboard tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-4">
          {[
            { id: 'resumo' as DashTab, label: 'Resumo', icon: Star },
            { id: 'acoes' as DashTab, label: 'Acoes', icon: Trophy },
            { id: 'premios' as DashTab, label: 'Premios', icon: Gift },
            { id: 'notificacoes' as DashTab, label: 'Alertas', icon: Bell },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setDashTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                dashTab === t.id ? 'bg-teal text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB: Summary */}
        {dashTab === 'resumo' && (
          <div className="space-y-4">
            {/* Cofrinhos */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { emoji: '🏆', label: 'Pontos', value: child.totalPoints },
                { emoji: '💰', label: 'Disponiveis', value: child.availablePoints },
                { emoji: '🎁', label: 'Resgatados', value: child.redeemedPoints },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-xl shadow-sm p-3 text-center">
                  <span className="text-2xl">{c.emoji}</span>
                  <p className="text-[10px] text-gray-500 mt-1">{c.label}</p>
                  <p className="text-xl font-bold text-navy">{c.value}</p>
                </div>
              ))}
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-teal" />
                <h3 className="font-bold text-navy text-sm">Frequencia Escolar</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green rounded-full"
                      style={{ width: `${(child.attendance.present / child.attendance.total) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold text-navy">
                  {Math.round((child.attendance.present / child.attendance.total) * 100)}%
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {child.attendance.present} presencas, {child.attendance.absent} faltas em {child.attendance.total} dias
              </p>
            </div>

            {/* Weekly mini chart */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-bold text-navy text-sm mb-3">Evolucao Semanal (pontos)</h3>
              <div className="flex items-end gap-1.5 h-20">
                {child.weeklyProgress.map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-teal/20 rounded-t"
                      style={{ height: `${(v / 45) * 100}%`, minHeight: 4 }}
                    >
                      <div className="w-full h-full bg-teal rounded-t" />
                    </div>
                    <span className="text-[9px] text-gray-400">
                      {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Actions */}
        {dashTab === 'acoes' && (
          <div className="space-y-2">
            <h3 className="font-bold text-navy text-sm mb-2">Ultimas acoes de {child.name}</h3>
            {child.recentActions.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                <span className="text-xl">🤝</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-navy">{a.name}</p>
                  <p className="text-xs text-gray-400">{a.date}</p>
                </div>
                <div className="text-right">
                  <span className="text-teal font-bold text-xs">+{a.points}</span>
                  <p className={`text-[10px] font-medium ${a.status === 'validated' ? 'text-green' : 'text-yellow-600'}`}>
                    {a.status === 'validated' ? 'Validada' : 'Pendente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: Family Rewards */}
        {dashTab === 'premios' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-navy text-sm">Premios Familiares</h3>
              <button
                onClick={() => setShowNewReward(!showNewReward)}
                className="flex items-center gap-1 text-xs text-teal font-semibold"
              >
                <Plus className="w-4 h-4" />
                Novo
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Crie recompensas proprias para motivar seu filho! Quando ele atingir o criterio, voce sera notificado.
            </p>

            {/* New reward form */}
            {showNewReward && (
              <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
                <input
                  type="text"
                  placeholder='Ex: "Vamos ao cinema"'
                  value={newRewardName}
                  onChange={(e) => setNewRewardName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-teal focus:outline-none text-sm"
                />
                <select
                  value={newRewardCriteria}
                  onChange={(e) => setNewRewardCriteria(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-teal focus:outline-none text-sm bg-white"
                >
                  <option value="">Criterio para ganhar...</option>
                  <option value="Atingir Tier 3">Atingir Tier 3</option>
                  <option value="Atingir Tier 4">Atingir Tier 4</option>
                  <option value="Acumular 300 pontos">Acumular 300 pontos</option>
                  <option value="Acumular 500 pontos">Acumular 500 pontos</option>
                  <option value="100% frequencia no mes">100% frequencia no mes</option>
                  <option value="10 acoes validadas">10 acoes validadas</option>
                </select>
                <button
                  onClick={handleAddReward}
                  disabled={!newRewardName || !newRewardCriteria}
                  className={`w-full py-2.5 rounded-xl font-semibold text-sm ${
                    newRewardName && newRewardCriteria
                      ? 'bg-teal text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Criar Premio
                </button>
              </div>
            )}

            {/* Rewards list */}
            {familyRewards.map((r) => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div className="flex-1">
                  <p className="font-semibold text-navy text-sm">{r.name}</p>
                  <p className="text-xs text-gray-500">Criterio: {r.criteria}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  r.status === 'active' ? 'bg-teal/10 text-teal' : 'bg-green/10 text-green'
                }`}>
                  {r.status === 'active' ? 'Ativo' : 'Conquistado'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* TAB: Notifications */}
        {dashTab === 'notificacoes' && (
          <div className="space-y-2">
            {NOTIFICATIONS.map((n) => (
              <div key={n.id} className={`rounded-xl p-4 flex items-start gap-3 ${
                n.read ? 'bg-white shadow-sm' : 'bg-teal/5 border border-teal/20 shadow-sm'
              }`}>
                <Bell className={`w-5 h-5 mt-0.5 ${n.read ? 'text-gray-400' : 'text-teal'}`} />
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${n.read ? 'text-gray-600' : 'text-navy'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{n.date}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-teal mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
