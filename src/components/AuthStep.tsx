import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import PasswordInput, { validatePassword } from './PasswordInput'

export interface AuthStepProps {
  title: string
  subtitle: string
  showGoogle?: boolean
  onAuth: (userId: string, email: string) => void
  onAlreadyLoggedIn?: (userId: string, email: string) => void
}

export default function AuthStep({
  title,
  subtitle,
  showGoogle = false,
  onAuth,
  onAlreadyLoggedIn,
}: AuthStepProps) {
  const { user, signInWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  const calledRef = useRef(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // If user is already logged in, call onAlreadyLoggedIn immediately
  useEffect(() => {
    if (user && !calledRef.current) {
      calledRef.current = true
      if (onAlreadyLoggedIn) {
        onAlreadyLoggedIn(user.id, user.email || '')
      }
    }
  }, [user, onAlreadyLoggedIn])

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const translateError = useCallback((msg: string): string => {
    const lower = msg.toLowerCase()
    if (lower.includes('email rate limit exceeded') || lower.includes('rate limit')) {
      return 'Muitas tentativas. Aguarde alguns minutos.'
    }
    if (lower.includes('already registered') || lower.includes('user already registered')) {
      return 'Email ja cadastrado. Faca login.'
    }
    if (lower.includes('email not confirmed') || lower.includes('not confirmed')) {
      return 'Confirme seu email. Reenviamos o link.'
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid login')) {
      // This is expected when we try signIn first — not an error to show
      return ''
    }
    return msg
  }, [])

  const startConfirmationPolling = useCallback((emailAddr: string) => {
    setAwaitingConfirmation(true)
    pollingRef.current = setInterval(async () => {
      const { data } = await supabase.auth.signInWithPassword({
        email: emailAddr,
        password,
      })
      if (data?.session && data?.user) {
        if (pollingRef.current) clearInterval(pollingRef.current)
        setAwaitingConfirmation(false)
        onAuth(data.user.id, data.user.email || '')
      }
    }, 3000)
  }, [password, onAuth])

  const handleSubmit = async () => {
    if (submitting) return

    const validation = validatePassword(password)
    if (!validation.valid) {
      setError('Senha nao atende os requisitos minimos.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas nao coincidem.')
      return
    }
    if (!email.includes('@')) {
      setError('Email invalido.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Try signIn first (reuse existing account)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (!signInError && signInData?.session && signInData?.user) {
        onAuth(signInData.user.id, signInData.user.email || '')
        return
      }

      // signIn failed — try signUp
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        const translated = translateError(signUpError.message)
        if (translated) setError(translated)
        setSubmitting(false)
        return
      }

      if (signUpData?.session && signUpData?.user) {
        // Session available immediately — call onAuth
        onAuth(signUpData.user.id, signUpData.user.email || '')
        return
      }

      // No session — email confirmation required
      startConfirmationPolling(email)
      setSubmitting(false)
    } catch {
      setError('Erro inesperado. Tente novamente.')
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch {
      setGoogleLoading(false)
      setError('Erro ao conectar com Google. Tente novamente.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Already logged in state
  if (user) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-navy mt-2">{title}</h2>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="bg-teal/10 border-2 border-teal/30 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-700">
            Voce ja esta autenticado como <span className="font-semibold text-navy">{user.email}</span>
          </p>
        </div>
      </div>
    )
  }

  // Awaiting email confirmation
  if (awaitingConfirmation) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-navy mt-2">{title}</h2>
          <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-teal animate-spin mx-auto" />
          <p className="text-sm text-gray-700">
            Enviamos um link de confirmacao para <span className="font-semibold">{email}</span>.
          </p>
          <p className="text-xs text-gray-500">
            Abra seu email e clique no link. Esta pagina atualizara automaticamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown}>
      <div className="text-center">
        <h2 className="text-2xl font-extrabold text-navy mt-2">{title}</h2>
        <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
      </div>

      {/* Google sign-in */}
      {showGoogle && (
        <>
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className={`w-full flex items-center justify-center gap-3 py-4 px-4 bg-white border-2 border-teal rounded-xl transition-all font-bold text-lg ${
              googleLoading ? 'opacity-50 cursor-wait' : 'hover:bg-teal/5 hover:shadow-md text-navy'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {googleLoading ? 'Conectando...' : 'Entrar com Google'}
          </button>
          <div className="relative flex items-center my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="px-3 text-gray-400 text-sm">ou cadastre com email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        </>
      )}

      {/* Email */}
      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setError('')
        }}
        className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
        autoFocus
      />

      {/* Password */}
      <PasswordInput
        password={password}
        confirmPassword={confirmPassword}
        onPasswordChange={(v) => {
          setPassword(v)
          setError('')
        }}
        onConfirmChange={(v) => {
          setConfirmPassword(v)
          setError('')
        }}
        onEnterAdvance={handleSubmit}
      />

      {/* Error message */}
      {error && (
        <p className="text-red text-sm text-center">{error}</p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all duration-200 ${
          submitting
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-teal text-white hover:bg-teal/90 hover:shadow-lg active:scale-[0.98]'
        }`}
      >
        {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
        {submitting ? 'Entrando...' : 'Continuar'}
      </button>
    </div>
  )
}
