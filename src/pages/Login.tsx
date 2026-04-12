import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const COUNTRY_CODES = [
  { value: '+55', label: '+55 Brasil' },
  { value: '+1', label: '+1 EUA/Canadá' },
  { value: '+351', label: '+351 Portugal' },
  { value: '+54', label: '+54 Argentina' },
  { value: '+598', label: '+598 Uruguai' },
]

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

type LoginStep = 'email' | 'senha' | 'confirmar-email' | 'criar-senha' | 'telefone'

export default function Login() {
  const navigate = useNavigate()
  const { signInWithEmail, signInWithGoogle } = useAuth()

  const [step, setStep] = useState<LoginStep>('email')
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

  // New user states
  const [emailOtpCode, setEmailOtpCode] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailVerifError, setEmailVerifError] = useState('')
  const [emailVerifLoading, setEmailVerifLoading] = useState(false)

  // Phone
  const [phone, setPhone] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+55')
  const [phoneOtpSent, setPhoneOtpSent] = useState(false)
  const [phoneOtpCode, setPhoneOtpCode] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [generatedCode, setGeneratedCode] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [phoneSending, setPhoneSending] = useState(false)

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

    // Check if user exists
    const { data: userRec } = await supabase.from('users').select('name').eq('email', email).maybeSingle()
    
    if (userRec) {
      // Existing user — go directly to password step
      setUserName(userRec.name || '')
      setStep('senha')
      setLoading(false)
      return
    }

    // New user — send OTP for registration
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (otpErr) {
      setError('Erro ao enviar codigo. Tente novamente.')
      setLoading(false)
      return
    }
    setOtpEmail(email)
    setStep('confirmar-email')
    setLoading(false)
  }

  async function handleLogin() {
    setLoading(true); setError('')
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

  async function handleEmailVerified() {
    if (emailOtpCode.length < 6) return
    setEmailVerifLoading(true)
    setEmailVerifError('')
    const { data, error } = await supabase.auth.verifyOtp({
      email: otpEmail || email,
      token: emailOtpCode.trim().replace(/\D/g, ''),
      type: 'email',
    })
    if (data?.session) {
      if (userName) {
        // Usuário existente já confirmado — redirecionar direto
        await redirectByRole(data.session.user.id)
      } else {
        // Novo usuário — criar senha
        setStep('criar-senha')
      }
    } else {
      const msg = error?.message?.toLowerCase() || ''
      if (msg.includes('invalid') || msg.includes('expired') || msg.includes('token')) {
        setEmailVerifError('Código incorreto ou expirado. Solicite um novo.')
      } else {
        setEmailVerifError('Erro ao verificar. Tente novamente.')
      }
    }
    setEmailVerifLoading(false)
  }

  async function handleResendEmail() {
    setEmailOtpCode('')
    setEmailVerifError('')
    await supabase.auth.signInWithOtp({ email: otpEmail || email, options: { shouldCreateUser: true } })
    setEmailVerifError('Novo código enviado para ' + email)
  }

  async function handleCreatePassword() {
    if (newPassword.length < 8) return
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    if (err) { setError('Erro ao salvar senha. Tente novamente.'); setLoading(false); return }
    setStep('telefone')
    setLoading(false)
  }

  async function handleSendPhoneCode() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) return
    setPhoneSending(true); setPhoneError('')
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setGeneratedCode(code)
    setPhoneOtpCode(code)  // DEV: preenche automaticamente
    await supabase.from('phone_verifications').insert({ phone: phoneCountryCode + digits, code, verified: false, created_at: new Date().toISOString() })
    const { data: r } = await supabase.functions.invoke('send-verification', { body: { to: phoneCountryCode + digits, channel: 'whatsapp', code, type: 'verification' } })
    if (!r?.success) {
      await supabase.functions.invoke('send-verification', { body: { to: phoneCountryCode + digits, channel: 'sms', code, type: 'verification' } })
    }
    setPhoneOtpSent(true); setPhoneSending(false)
  }

  function handleVerifyPhone() {
    if (phoneOtpCode === generatedCode) { setPhoneVerified(true); setPhoneError('') }
    else setPhoneError('Código incorreto. Tente novamente.')
  }

  function handlePhoneContinue() {
    const fullPhone = phoneCountryCode + phone.replace(/\D/g, '')
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        supabase.from('users').upsert({ auth_id: data.user.id, email, phone: fullPhone, whatsapp: fullPhone, updated_at: new Date().toISOString() }, { onConflict: 'auth_id' })
      }
    })
    navigate(`/cadastro/perfil?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(fullPhone)}&from=verified`)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try { await signInWithGoogle() } catch { setGoogleLoading(false); setError('Erro ao conectar com Google.') }
  }

  const handleForgotPassword = async () => {
    setForgotLoading(true)
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback` })
    setForgotSent(true); setForgotLoading(false)
  }

  const handleBack = () => {
    if (step === 'senha' || step === 'confirmar-email') { setStep('email'); setError(''); setForgotMode(false); setForgotSent(false) }
    else if (step === 'criar-senha') setStep('confirmar-email')
    else if (step === 'telefone') setStep('criar-senha')
    else navigate('/')
  }

  const googleSvg = (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
      <div className="w-full max-w-md">
        <button onClick={handleBack} className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" /><span className="text-sm font-medium">{step === 'email' ? 'Voltar' : '← Voltar'}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md" style={{ animation: 'fadeSlideIn 0.35s ease-out' }} key={step}>
        {/* STEP: email */}
        {step === 'email' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy">Entrar na Pirâmide</h2>
              <p className="text-gray-400 text-sm mt-1">Digite seu email para continuar</p>
            </div>
            <button onClick={handleGoogleLogin} disabled={googleLoading}
              className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-gray-200 rounded-xl transition-colors font-medium ${googleLoading ? 'bg-gray-100 text-gray-400 cursor-wait' : 'hover:bg-gray-50 text-gray-700'}`}>
              {googleSvg}{googleLoading ? 'Conectando...' : 'Entrar com Google'}
            </button>
            <div className="relative flex items-center"><div className="flex-1 h-px bg-gray-200" /><span className="px-3 text-gray-400 text-sm">ou</span><div className="flex-1 h-px bg-gray-200" /></div>
            <input type="email" placeholder="Seu email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && email.includes('@') && handleContinue()}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors" autoFocus />
            {error && <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-sm text-red">{error}</div>}
            <button onClick={handleContinue} disabled={!email.includes('@') || loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all ${email.includes('@') && !loading ? 'bg-teal text-white hover:bg-teal/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {loading ? 'Verificando...' : 'Continuar'}<ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP: senha (existente) */}
        {step === 'senha' && !forgotMode && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy">{userName ? `Bem-vindo de volta, ${userName.split(' ')[0]}!` : 'Bem-vindo de volta!'}</h2>
              <p className="text-gray-400 text-sm mt-1">{email}</p>
            </div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} placeholder="Sua senha" value={password}
                onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && password.length >= 6 && handleLogin()}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors pr-12" autoFocus />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {error && <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-sm text-red">{error}</div>}
            <button onClick={handleLogin} disabled={password.length < 6 || loading}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all ${password.length >= 6 && !loading ? 'bg-teal text-white hover:bg-teal/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <div className="text-center"><button type="button" onClick={() => setForgotMode(true)} className="text-gray-400 text-sm hover:text-teal">Esqueceu a senha?</button></div>
          </div>
        )}

        {/* Esqueceu a senha */}
        {step === 'senha' && forgotMode && (
          <div className="space-y-4">
            <div className="text-center mb-2"><h2 className="text-xl font-extrabold text-navy">Recuperar senha</h2><p className="text-gray-400 text-sm mt-1">Enviaremos um link para {email}</p></div>
            {!forgotSent ? (
              <button onClick={handleForgotPassword} disabled={forgotLoading} className="w-full py-3.5 rounded-xl bg-teal text-white font-bold text-lg disabled:opacity-50">
                {forgotLoading ? 'Enviando...' : 'Enviar link de acesso'}
              </button>
            ) : <p className="text-sm text-green font-medium text-center">Link enviado! Verifique sua caixa de entrada.</p>}
            <div className="text-center"><button onClick={() => { setForgotMode(false); setForgotSent(false) }} className="text-gray-400 text-sm hover:text-teal">Voltar ao login</button></div>
          </div>
        )}

        {/* STEP: confirmar email (novo) */}
        {step === 'confirmar-email' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <span className="text-5xl">📧</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Confirme seu email</h2>
              <p className="text-gray-400 text-sm mt-1">
                Enviamos um link de verificação para <strong>{email}</strong>
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Código recebido"
              value={emailOtpCode}
              onChange={(e) => { setEmailOtpCode(e.target.value.replace(/\s/g,'').slice(0, 8)); setEmailVerifError('') }}
              onKeyDown={(e) => e.key === 'Enter' && emailOtpCode.length >= 6 && handleEmailVerified()}
              className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-3xl text-center tracking-widest font-bold transition-colors"
              autoFocus
            />
            <button
              onClick={handleEmailVerified}
              disabled={emailOtpCode.length < 6 || emailVerifLoading}
              className={`w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all ${emailOtpCode.length >= 6 && !emailVerifLoading ? 'opacity-100' : 'opacity-50 cursor-not-allowed'}`}
              style={{ backgroundColor: '#028090' }}
            >
              {emailVerifLoading ? 'Verificando...' : 'Confirmar código →'}
            </button>
            {emailVerifError && (
              <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-sm text-red text-center">{emailVerifError}</div>
            )}
            <button onClick={handleResendEmail} className="w-full text-sm text-gray-400 hover:text-teal text-center transition-colors">
              Reenviar código
            </button>
          </div>
        )}

        {/* STEP: criar senha (novo) */}
        {step === 'criar-senha' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy mt-2">Crie sua senha</h2>
              <p className="text-gray-400 text-sm mt-1">Mínimo 8 caracteres</p>
            </div>
            <div className="relative">
              <input type={showNewPassword ? 'text' : 'password'} placeholder="Crie uma senha segura" value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && newPassword.length >= 8 && document.getElementById('confirm-pw')?.focus()}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors pr-12" autoFocus />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {newPassword.length > 0 && (() => {
              const hasUpper = /[A-Z]/.test(newPassword)
              const hasNumber = /\d/.test(newPassword)
              const hasSpecial = /[!@#$%^&*]/.test(newPassword)
              const len = newPassword.length
              const score = (len >= 8 ? 1 : 0) + (len >= 12 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0)
              const labels = ['', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito forte']
              const colors = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-teal', 'bg-green-500']
              return (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-gray-200'}`} />
                    ))}
                  </div>
                  <p className={`text-xs font-medium ${score <= 1 ? 'text-red-400' : score <= 2 ? 'text-orange-400' : 'text-teal'}`}>{labels[score] || ''}</p>
                </div>
              )
            })()}
            <div className="relative">
              <input id="confirm-pw" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirme a senha" value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && newPassword.length >= 8 && confirmPassword.length >= 8 && handleCreatePassword()}
                className={`w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none text-lg transition-colors pr-12 ${
                  confirmPassword.length > 0 && confirmPassword !== newPassword ? 'border-red-400 focus:border-red-400' : 'border-gray-200 focus:border-teal'
                }`} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {confirmPassword.length > 0 && confirmPassword !== newPassword && <p className="text-xs text-red-400">As senhas não coincidem</p>}
            {error && <div className="bg-red/10 border border-red/30 rounded-xl p-3 text-sm text-red">{error}</div>}
            <button onClick={handleCreatePassword} disabled={newPassword.length < 8 || newPassword !== confirmPassword || loading}
              className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all ${
                newPassword.length >= 8 && newPassword === confirmPassword && !loading ? 'bg-teal text-white hover:bg-teal/90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}>
              {loading ? 'Salvando...' : 'Continuar →'}
            </button>
          </div>
        )}

        {/* STEP: telefone (novo) */}
        {step === 'telefone' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-extrabold text-navy mt-2">Seu WhatsApp</h2>
              <p className="text-gray-400 text-sm mt-1">Para te avisarmos quando algo legal acontecer</p>
            </div>
            {!phoneVerified ? (
              <>
                <div className="flex gap-2">
                  <select value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="w-36 flex-shrink-0 px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base bg-white">
                    {COUNTRY_CODES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <input type="tel" placeholder="(61) 99999-9999" value={phone}
                    onChange={(e) => { setPhone(formatPhone(e.target.value)); setPhoneOtpSent(false); setPhoneOtpCode(''); setPhoneVerified(false) }}
                    className="flex-1 min-w-0 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors" />
                </div>
                {phone.replace(/\D/g, '').length >= 10 && !phoneOtpSent && (
                  <button onClick={handleSendPhoneCode} disabled={phoneSending}
                    className="w-full py-3 rounded-xl border-2 font-semibold text-sm transition-colors disabled:opacity-50" style={{ borderColor: '#028090', color: '#028090' }}>
                    {phoneSending ? 'Enviando...' : 'Enviar código no WhatsApp'}
                  </button>
                )}
                {phoneOtpSent && (
                  <div className="space-y-3">
                    <p className="text-xs text-red-500 text-center font-semibold">Codigo exibido na tela no MVP (aguardando ativacao do WhatsApp - prazo: 1 a 7 dias)</p>
                    <p className="text-xs text-gray-500 text-center">Código enviado para {phoneCountryCode} {phone}</p>
                    <input type="text" inputMode="numeric" placeholder="000000" value={phoneOtpCode}
                      onChange={(e) => setPhoneOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={(e) => e.key === 'Enter' && phoneOtpCode.length === 6 && handleVerifyPhone()}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-2xl text-center tracking-widest font-bold" />
                    <button onClick={handleVerifyPhone} disabled={phoneOtpCode.length !== 6}
                      className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50" style={{ backgroundColor: '#028090' }}>
                      Verificar código
                    </button>
                    {phoneError && <p className="text-sm text-red text-center">{phoneError}</p>}
                    <button onClick={handleSendPhoneCode} className="w-full text-xs text-gray-400 hover:text-teal text-center">Reenviar código</button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <span className="text-green-500 text-xl">✓</span>
                  <p className="text-sm font-semibold text-green-700">WhatsApp verificado!</p>
                </div>
                <button onClick={handlePhoneContinue} className="w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all hover:opacity-90" style={{ backgroundColor: '#028090' }}>
                  Continuar para o cadastro →
                </button>
              </div>
            )}
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
