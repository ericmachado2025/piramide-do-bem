import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Phone,
  Building2,
  MapPin,
  Loader2,
  Search,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

const COUNTRY_CODES = [
  { value: '+55', label: '+55 Brasil' },
  { value: '+1', label: '+1 EUA/Canadá' },
  { value: '+351', label: '+351 Portugal' },
  { value: '+54', label: '+54 Argentina' },
]

const BR_STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
}

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

const inputClass = "w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg transition-colors"

export default function PatrocinadorCadastro() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signUpWithEmail } = useAuth()

  const [step, setStep] = useState(user ? 2 : 1)
  const totalSteps = 4

  // Step 1
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Step 2
  const [personType, setPersonType] = useState<'PJ' | 'PF'>('PJ')
  const [businessName, setBusinessName] = useState('')
  const [document, setDocument] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneCountryCode, setPhoneCountryCode] = useState('+55')

  // Step 3
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<string[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [neighborhood, setNeighborhood] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)

  // Step 4
  const [verificationCode, setVerificationCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [codeError, setCodeError] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // City autocomplete — uses cities table via states FK
  const fetchCities = useCallback(async (st: string, query?: string) => {
    setCityLoading(true)
    const { data: stateRow } = await supabase.from('states').select('id').eq('abbreviation', st).single()
    if (stateRow) {
      let q = supabase.from('cities').select('name').eq('state_id', stateRow.id)
      if (query && query.length >= 3) q = q.ilike('name', `${query}%`)
      q = q.order('name')
      const { data } = await q
      if (data) setCitySuggestions(data.map((r: { name: string }) => r.name))
    }
    setCityLoading(false)
    setShowCityDropdown(true)
  }, [])

  const searchCities = useCallback((st: string, query: string) => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    if (!st || query.length < 3) { setCitySuggestions([]); return }
    cityDebounceRef.current = setTimeout(() => fetchCities(st, query), 300)
  }, [fetchCities])

  // GPS — usar Nominatim para reverse geocoding
  const useGpsLocation = () => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=pt-BR`)
        const data = await res.json()
        const addr = data.address || {}
        const uf = (addr.state_code || addr['ISO3166-2-lvl4'] || '').toString().slice(-2).toUpperCase()
        const cityName = addr.city || addr.town || addr.village || addr.municipality || ''
        const bairro = addr.suburb || addr.neighbourhood || addr.quarter || ''
        if (uf) setState(uf)
        if (cityName) { setCity(cityName); setCitySearch('') }
        if (bairro) setNeighborhood(bairro)
      } catch { /* ignore */ }
      setGpsLoading(false)
    }, () => setGpsLoading(false), { timeout: 10000 })
  }

  // Step 1: Auth — try signIn first, then signUp
  const handleAuth = async () => {
    setAuthError('')
    setAuthLoading(true)
    try {
      // Try login first (handles existing accounts)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInErr) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { setStep(2); setAuthLoading(false); return }
      }
      if (signInErr && !signInErr.message.includes('Invalid login')) {
        const msg = signInErr.message.includes('rate limit') ? 'Muitas tentativas. Aguarde alguns minutos.' : signInErr.message
        setAuthError(msg)
        setAuthLoading(false)
        return
      }
      // Create new account
      const { error } = await signUpWithEmail(email, password)
      if (error && !error.includes('already registered')) {
        setAuthError(error)
        setAuthLoading(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signInWithPassword({ email, password })
      }
      setStep(2)
    } catch {
      setAuthError('Erro ao criar conta. Tente novamente.')
    }
    setAuthLoading(false)
  }

  // Re-check auth when user changes (for session propagation)
  useEffect(() => {
    if (user && step === 1) setStep(2)
  }, [user, step])

  // Browser back support + sessionStorage
  useEffect(() => {
    window.history.pushState({ step }, '')
    sessionStorage.setItem('patrocinador_backup', JSON.stringify({ step, personType, businessName, document, contactName, phone, state, city }))
  }, [step, personType, businessName, document, contactName, phone, state, city])

  useEffect(() => {
    const handlePop = () => setStep(prev => prev > 1 ? prev - 1 : prev)
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // Step 4: Phone verification
  const handleSendCode = async () => {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setGeneratedCode(code)

    try {
      await supabase.from('phone_verifications').insert({
        phone,
        code,
        verified: false,
        created_at: new Date().toISOString(),
      })
    } catch {
      // continue even if insert fails
    }

    // Code sent via Edge Function — no console logging
    setCodeSent(true)
    setCodeError('')
  }

  const handleVerifyCode = () => {
    if (verificationCode === generatedCode) {
      setCodeVerified(true)
      setCodeError('')
    } else {
      setCodeError('Código incorreto. Tente novamente.')
    }
  }

  // Submit — with retry auth
  const handleSubmit = async () => {
    setSubmitting(true)
    setGlobalError('')

    try {
      let userId = user?.id

      // If user is null, try to re-authenticate
      if (!userId) {
        if (email && password) {
          const { data } = await supabase.auth.signInWithPassword({ email, password })
          userId = data.user?.id
        }
        if (!userId) {
          setGlobalError('Você precisa estar autenticado. Clique novamente para tentar.')
          setSubmitting(false)
          return
        }
      }

      // Ensure users record exists
      const { data: existingUser } = await supabase.from('users').select('id').eq('auth_id', userId).maybeSingle()
      let usersRowId = existingUser?.id
      if (!usersRowId) {
        const { data: newUser } = await supabase.from('users').insert({
          auth_id: userId,
          name: contactName,
          email: user?.email || email,
          phone,
        }).select('id').single()
        usersRowId = newUser?.id
      }
      // Update users record with latest data
      if (usersRowId) {
        await supabase.from('users').update({ name: contactName, phone }).eq('id', usersRowId)
      }

      const { error: sponsorError } = await supabase
        .from('sponsors')
        .insert({
          user_id: userId,
          users_id: usersRowId || null,
          business_name: businessName,
          contact_name: contactName,
          city,
          state,
          person_type: personType,
          document: document.replace(/\D/g, '') || null,
        })

      if (sponsorError) throw sponsorError

      navigate('/patrocinador/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cadastro.'
      setGlobalError(message)
    }
    setSubmitting(false)
  }

  const canAdvance = () => {
    switch (step) {
      case 1: return email.includes('@') && validatePassword(password).valid && password === confirmPassword
      case 2: return businessName.trim().length >= 2 && contactName.trim().length >= 2 && phone.trim().length >= 10
      case 3: return city.trim().length >= 2 && state !== ''
      case 4: return codeVerified
      default: return false
    }
  }

  const handleNext = () => {
    if (step === 1 && !user) {
      handleAuth()
      return
    }
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleSubmit()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4 pb-8" style={{ backgroundColor: '#f0fdfa' }}>
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 max-w-xs w-full justify-center">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
              style={{
                backgroundColor: s < step ? '#02C39A' : s === step ? '#028090' : '#e5e7eb',
                color: s <= step ? '#fff' : '#9ca3af',
                transform: s === step ? 'scale(1.1)' : 'scale(1)',
                boxShadow: s === step ? '0 4px 12px rgba(2,128,144,0.3)' : 'none',
              }}
            >
              {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < totalSteps && (
              <div
                className="w-6 h-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: s < step ? '#02C39A' : '#e5e7eb' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md" key={step}>
        {/* Step 1: Auth */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <Building2 className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Cadastro de Patrocinador</h2>
              <p className="text-gray-400 text-sm mt-1">Crie sua conta para oferecer recompensas</p>
            </div>
            {user ? (
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#f0fdfa', border: '1px solid #02C39A' }}>
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: '#02C39A' }} />
                <p className="text-sm" style={{ color: '#1F4E79' }}>Você já está autenticado como <strong>{user.email}</strong></p>
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()}
                  autoFocus
                />
                <PasswordInput
                  password={password}
                  confirmPassword={confirmPassword}
                  onPasswordChange={setPassword}
                  onConfirmChange={setConfirmPassword}
                  onEnterAdvance={() => canAdvance() && handleNext()}
                />
                {authError && <p className="text-sm" style={{ color: '#dc2626' }}>{authError}</p>}
              </>
            )}
          </div>
        )}

        {/* Step 2: Business info */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <Building2 className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Dados do patrocinador</h2>
              <p className="text-gray-400 text-sm mt-1">Informações sobre você ou seu negócio</p>
            </div>

            {/* PF/PJ toggle */}
            <div className="flex gap-2">
              {(['PJ', 'PF'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setPersonType(t); setDocument('') }}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border-2 ${
                    personType === t
                      ? 'border-[#028090] bg-[#028090]/5 text-[#028090]'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {t === 'PJ' ? 'Pessoa Juridica (PJ)' : 'Pessoa Fisica (PF)'}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder={personType === 'PJ' ? 'Nome da empresa' : 'Nome completo'}
              value={businessName}
              onChange={(e) => { setBusinessName(e.target.value); if (personType === 'PF') setContactName(e.target.value) }}
              className={inputClass}
              onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()}
              autoFocus
            />
            <input
              type="text"
              placeholder={personType === 'PJ' ? 'CNPJ' : 'CPF'}
              value={document}
              onChange={(e) => setDocument(personType === 'PJ' ? formatCNPJ(e.target.value) : formatCPF(e.target.value))}
              className={inputClass}
              onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()}
            />
            {personType === 'PF' ? (
              <input value={businessName} disabled placeholder="Preenchido automaticamente"
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-500 text-lg" />
            ) : (
              <input type="text" placeholder="Nome do contato" value={contactName}
                onChange={(e) => setContactName(e.target.value)} className={inputClass}
                onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()} />
            )}
            <div className="flex gap-2">
              <select value={phoneCountryCode} onChange={(e) => setPhoneCountryCode(e.target.value)}
                className="w-40 flex-shrink-0 px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-base transition-colors bg-white">
                {COUNTRY_CODES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="tel" placeholder="(61) 99999-9999" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="flex-1 min-w-0 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()} />
            </div>
          </div>
        )}

        {/* Step 3: Location — State first, then City autocomplete */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Localização</h2>
              <p className="text-gray-400 text-sm mt-1">Estado, cidade e bairro</p>
            </div>
            <button type="button" onClick={useGpsLocation} disabled={gpsLoading}
              className="w-full py-2.5 rounded-xl border-2 border-[#028090] text-[#028090] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '📍'} Usar minha localização
            </button>
            <select
              value={state}
              onChange={(e) => { setState(e.target.value); setCity(''); setCitySearch(''); setCitySuggestions([]) }}
              className={`${inputClass} bg-white`}
            >
              <option value="">Selecione o estado</option>
              {BR_STATES.map((s) => (
                <option key={s} value={s}>{s} - {STATE_NAMES[s]}</option>
              ))}
            </select>

            {state && (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Digite 3+ letras ou Enter para ver todas"
                    value={city || citySearch}
                    onChange={(e) => {
                      const val = e.target.value
                      setCitySearch(val)
                      if (city) setCity('')
                      searchCities(state, val)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); fetchCities(state) }
                    }}
                    onFocus={() => citySuggestions.length > 0 && setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg transition-colors"
                    autoFocus
                  />
                  {cityLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#028090] animate-spin" />}
                </div>
                {showCityDropdown && citySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {citySuggestions.map((c) => (
                      <button key={c} type="button"
                        onMouseDown={() => { setCity(c); setCitySearch(''); setShowCityDropdown(false) }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#028090]/10 text-sm transition-colors">
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {city && (
              <input type="text" placeholder="Bairro (opcional)" value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className={inputClass} />
            )}
          </div>
        )}

        {/* Step 4: Phone verification */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <Phone className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Verificar telefone</h2>
              <p className="text-gray-400 text-sm mt-1">Enviaremos um código para {phone}</p>
            </div>
            {!codeSent ? (
              <button
                onClick={handleSendCode}
                className="w-full py-3.5 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90"
                style={{ backgroundColor: '#028090' }}
              >
                Enviar código
              </button>
            ) : !codeVerified ? (
              <>
                <p className="text-sm text-gray-500 text-center bg-gray-50 rounded-xl p-3">
                  Código enviado para {phone}. Se não receber em 1 minuto, use o código de teste exibido no console do navegador (F12).
                </p>
                <input
                  type="text"
                  placeholder="Digite o código de 6 dígitos"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && verificationCode.length === 6 && handleVerifyCode()}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg text-center tracking-widest transition-colors"
                  autoFocus
                  maxLength={6}
                />
                {codeError && <p className="text-sm text-center" style={{ color: '#dc2626' }}>{codeError}</p>}
                <button
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-lg transition-all disabled:opacity-50"
                  style={{ backgroundColor: '#028090' }}
                >
                  Verificar
                </button>
                <button
                  onClick={handleSendCode}
                  className="w-full text-sm underline"
                  style={{ color: '#028090' }}
                >
                  Reenviar código
                </button>
              </>
            ) : (
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#f0fdfa', border: '1px solid #02C39A' }}>
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#02C39A' }} />
                <p className="font-semibold" style={{ color: '#1F4E79' }}>Telefone verificado!</p>
              </div>
            )}
          </div>
        )}

        {/* Global error */}
        {globalError && (
          <div className="mt-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {globalError}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Voltar
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance() || authLoading || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: canAdvance() ? '#028090' : '#e5e7eb', color: canAdvance() ? '#fff' : '#9ca3af' }}
          >
            {(authLoading || submitting) && <Loader2 className="w-5 h-5 animate-spin" />}
            {step === totalSteps ? 'Concluir cadastro' : step === 1 && !user ? 'Criar conta' : 'Próximo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-gray-400 text-sm">Passo {step} de {totalSteps}</p>
    </div>
  )
}
