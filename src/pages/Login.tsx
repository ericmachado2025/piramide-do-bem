import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)

    // Try Supabase auth first
    const { error: authError } = await signInWithEmail(email, password)

    if (authError) {
      // Fallback: try localStorage prototype auth
      const stored = localStorage.getItem('piramide-user')
      if (stored) {
        try {
          const user = JSON.parse(stored)
          if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
            setLoading(false)
            navigate(user.tribeId ? '/home' : '/tribo', { replace: true })
            return
          }
        } catch { /* ignore */ }
      }
      setLoading(false)
      setError(translateError(authError))
      return
    }

    // Auth successful — check if profile exists
    const stored = localStorage.getItem('piramide-user')
    if (stored) {
      try {
        const profile = JSON.parse(stored)
        if (profile.tribeId) {
          navigate('/home', { replace: true })
          return
        }
      } catch { /* ignore */ }
    }
    setLoading(false)
    navigate('/home', { replace: true })
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

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar</span>
        </button>
      </div>

      <div
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md"
        style={{ animation: 'fadeSlideIn 0.35s ease-out' }}
      >
        <div className="text-center mb-6">
          <span className="text-5xl">🔑</span>
          <h2 className="text-2xl font-extrabold text-navy mt-2">Entrar</h2>
          <p className="text-gray-400 text-sm mt-1">Acesse sua conta na Piramide do Bem</p>
        </div>

        <div className="space-y-4">
          {/* Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-gray-200 rounded-xl transition-colors font-medium ${
              googleLoading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
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

          <input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
          />

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors pr-12"
              onKeyDown={(e) => e.key === 'Enter' && email && password && handleLogin()}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && (
            <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={!email.includes('@') || password.length < 6 || loading}
            className={`
              w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all duration-200
              ${email.includes('@') && password.length >= 6 && !loading
                ? 'bg-teal text-white hover:bg-teal/90 hover:shadow-lg active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="text-center pt-2">
            <p className="text-gray-400 text-sm">
              Nao tem conta?{' '}
              <Link to="/cadastro" className="text-teal font-semibold hover:underline">
                Cadastre-se
              </Link>
            </p>
          </div>
        </div>
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

function translateError(msg: string): string {
  if (msg.includes('Invalid login')) return 'Email ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (msg.includes('User not found')) return 'Conta nao encontrada. Cadastre-se primeiro.'
  return msg
}
