import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Star, Gift, Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Tab = 'login' | 'dashboard'
type DashTab = 'resumo' | 'acoes' | 'notificacoes'

export default function AreaPais() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('login')
  const [dashTab, setDashTab] = useState<DashTab>('resumo')

  // Login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  // Child data from Supabase
  const [childData, setChildData] = useState<{
    name: string
    total_points: number
    available_points: number
    redeemed_points: number
  } | null>(null)
  const [childActions, setChildActions] = useState<{ id: string; name: string; points: number; status: string; date: string }[]>([])

  const handleLogin = async () => {
    if (!loginEmail.includes('@') || loginPassword.length < 6) return

    // Attempt sign in via Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      alert('Credenciais invalidas. Tente novamente.')
      return
    }

    setTab('dashboard')
  }

  useEffect(() => {
    if (tab !== 'dashboard') return

    async function loadChildData() {
      // Find parent_student relationship
      const { data: parentData } = await supabase
        .from('parent_students')
        .select('student:students(id, name, total_points, available_points, redeemed_points)')
        .limit(1)
        .single()

      if (parentData?.student) {
        const student = parentData.student as unknown as typeof childData
        setChildData(student)

        // Load recent actions
        const { data: actions } = await supabase
          .from('actions')
          .select('id, points_awarded, status, created_at, action_type:action_types(name)')
          .eq('author_id', (parentData.student as { id: string }).id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (actions) {
          setChildActions(actions.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            name: (a.action_type as { name: string } | null)?.name ?? 'Boa acao',
            points: (a.points_awarded as number) ?? 0,
            status: a.status as string,
            date: (a.created_at as string).split('T')[0],
          })))
        }
      }
    }
    loadChildData()
  }, [tab])

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
            <span className="text-5xl">{'\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'}</span>
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

          {childData ? (
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
              <span className="text-4xl">{'\u{1F393}'}</span>
              <div className="flex-1">
                <h2 className="text-white font-bold">{childData.name}</h2>
                <p className="text-white/70 text-xs">{childData.total_points} pontos totais</p>
              </div>
            </div>
          ) : (
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 text-center">
              <p className="text-white/70 text-sm">Nenhum filho vinculado a sua conta.</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4">
        {/* Dashboard tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-4">
          {[
            { id: 'resumo' as DashTab, label: 'Resumo', icon: Star },
            { id: 'acoes' as DashTab, label: 'Acoes', icon: Gift },
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

        {!childData ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <span className="text-5xl block mb-3">{'\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'}</span>
            <h2 className="text-lg font-bold text-navy mb-2">Nenhum dado disponivel</h2>
            <p className="text-gray-400 text-sm">
              Vincule seu filho a sua conta para acompanhar o progresso dele.
            </p>
          </div>
        ) : (
          <>
            {/* TAB: Summary */}
            {dashTab === 'resumo' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { emoji: '\u{1F3C6}', label: 'Pontos', value: childData.total_points },
                    { emoji: '\u{1F4B0}', label: 'Disponiveis', value: childData.available_points },
                    { emoji: '\u{1F381}', label: 'Resgatados', value: childData.redeemed_points },
                  ].map((c) => (
                    <div key={c.label} className="bg-white rounded-xl shadow-sm p-3 text-center">
                      <span className="text-2xl">{c.emoji}</span>
                      <p className="text-[10px] text-gray-500 mt-1">{c.label}</p>
                      <p className="text-xl font-bold text-navy">{c.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: Actions */}
            {dashTab === 'acoes' && (
              <div className="space-y-2">
                <h3 className="font-bold text-navy text-sm mb-2">Ultimas acoes de {childData.name}</h3>
                {childActions.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                    <p className="text-gray-400 text-sm">Nenhuma acao registrada ainda.</p>
                  </div>
                ) : (
                  childActions.map((a) => (
                    <div key={a.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3">
                      <span className="text-xl">{'\u{1F91D}'}</span>
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
                  ))
                )}
              </div>
            )}

            {/* TAB: Notifications */}
            {dashTab === 'notificacoes' && (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <span className="text-5xl block mb-3">{'\u{1F514}'}</span>
                <h3 className="text-lg font-bold text-navy mb-2">Nenhum alerta</h3>
                <p className="text-gray-400 text-sm">
                  Alertas sobre frequencia e progresso do seu filho aparecerão aqui.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
