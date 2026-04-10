import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuth()

  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)

  async function redirectByRole(userId: string) {
    const { data: student } = await supabase.from('students').select('id').eq('user_id', userId).maybeSingle()
    if (student) { navigate('/home', { replace: true }); return }
    const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).maybeSingle()
    if (teacher) { navigate('/professor/dashboard', { replace: true }); return }
    const { data: parent } = await supabase.from('parents').select('id').eq('user_id', userId).maybeSingle()
    if (parent) { navigate('/responsavel/dashboard', { replace: true }); return }
    const { data: sponsor } = await supabase.from('sponsors').select('id').eq('user_id', userId).maybeSingle()
    if (sponsor) { navigate('/patrocinador/dashboard', { replace: true }); return }
    navigate('/cadastro/perfil', { replace: true })
  }

  async function handleContinue() {
    if (!email.includes('@')) return
    setLoading(true)
    setError('')
    const { data: user } = await supabase
      .from('users')
      .select('id, name')
      .eq('email', email)
      .maybeSingle()
    if (user) {
      setUserName(user.name || '')
      setStep(2)
    } else {
      navigate(`/cadastro/perfil?email=${encodeURIComponent(email)}`)
    }
    setLoading(false)
  }

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error: authError } = await signInWithEmail(email, password)
    if (!authError) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await redirectByRole(user.id)
    } else {
      setError('Senha incorreta. Tente novamente ou use "Esqueceu a senha?".')
      setPassword('')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      setGoogleLoading(false)
      setError('Erro ao conectar com Google.')
    }
  }

  const handleForgotPassword = async () => {
    setForgotLoading(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` })
    setForgotSent(true)
    setForgotLoading(false)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
      <div className="w-full max-w-md">
        <button onClick={() => step === 2 ? (setStep(1), setPassword(''), setError(''), setForgotMode(false), setForgotSent(false)) : navigate('/')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{step === 2 ? 'Usar outro email' : 'Voltar'}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md" style={{ animation: 'fadeSlideIn 0.35s ease-out' }} key={step}>
        {/* Etapa 1: Email + Google */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy mt-2">Entrar na Pirâmide</h2>
              <p className="text-gray-400 text-sm mt-1">Digite seu email para continuar</p>
            </div>

            <button onClick={handleGoogleLogin} disabled={googleLoading}
              className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-gray-200 rounded-xl transition-colors font-medium ${
                googleLoading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'hover:bg-gray-50 text-gray-700'
              }`}>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              {googleLoading ? 'Conectando...' : 'Entrar com Google'}
            </button>

            <div className="relative flex items-center">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3 text-gray-400 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <input type="email" placeholder="Seu email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && handleContinue()}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
              autoFocus />

            {error && (
              <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-sm text-red">{error}</div>
            )}

            <button onClick={handleContinue}
              disabled={!email.includes('@') || loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all duration-200 ${
                email.includes('@') && !loading ? 'bg-teal text-white hover:bg-teal/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {loading ? 'Verificando...' : 'Continuar'}
              {!loading && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Etapa 2: Senha */}
        {step === 2 && !forgotMode && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy">
                {userName ? `Bem-vindo de volta, ${userName.split(' ')[0]}!` : 'Bem-vindo de volta!'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{email}</p>
            </div>

            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Sua senha" value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && password.length >= 6 && handleLogin()}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors pr-12"
                autoFocus />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && (
              <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-sm text-red">{error}</div>
            )}

            <button onClick={handleLogin}
              disabled={password.length < 6 || loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all duration-200 ${
                password.length >= 6 && !loading ? 'bg-teal text-white hover:bg-teal/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center">
              <button type="button" onClick={() => setForgotMode(true)}
                className="text-gray-400 text-sm hover:text-teal transition-colors">
                Esqueceu a senha?
              </button>
            </div>
          </div>
        )}

        {/* Esqueceu a senha */}
        {step === 2 && forgotMode && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-xl font-extrabold text-navy">Recuperar senha</h2>
              <p className="text-gray-400 text-sm mt-1">Enviaremos um link para {email}</p>
            </div>
            {!forgotSent ? (
              <button onClick={handleForgotPassword} disabled={forgotLoading}
                className="w-full py-3.5 rounded-xl bg-teal text-white font-bold text-lg disabled:opacity-50">
                {forgotLoading ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            ) : (
              <p className="text-sm text-green font-medium text-center">Link enviado! Verifique sua caixa de entrada.</p>
            )}
            <div className="text-center">
              <button onClick={() => { setForgotMode(false); setForgotSent(false) }}
                className="text-gray-400 text-sm hover:text-teal">Voltar ao login</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
