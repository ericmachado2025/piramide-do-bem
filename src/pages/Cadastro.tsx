import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, CheckCircle2, Search, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { findOrCreateClassroom, createStudentEnrollment, sendLgpdConsentEmail } from '../lib/database'
import { calcAge } from '../lib/utils'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

const COUNTRY_CODES = [
  { value: '+55', label: '+55 Brasil' },
  { value: '+1', label: '+1 EUA/Canada' },
  { value: '+351', label: '+351 Portugal' },
  { value: '+54', label: '+54 Argentina' },
  { value: '+598', label: '+598 Uruguai' },
  { value: '+595', label: '+595 Paraguai' },
  { value: '+56', label: '+56 Chile' },
  { value: '+57', label: '+57 Colombia' },
  { value: '+58', label: '+58 Venezuela' },
  { value: '+34', label: '+34 Espanha' },
  { value: '+39', label: '+39 Italia' },
  { value: '+49', label: '+49 Alemanha' },
  { value: '+33', label: '+33 Franca' },
  { value: '+44', label: '+44 Reino Unido' },
  { value: '+81', label: '+81 Japao' },
]

// 27 Brazilian states
const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapa', BA: 'Bahia',
  CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
  MA: 'Maranhao', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Para', PB: 'Paraiba', PE: 'Pernambuco', PI: 'Piaui', PR: 'Parana',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondonia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'Sao Paulo', TO: 'Tocantins',
}

// Grades by school type
const GRADES_BY_TYPE: Record<string, string[]> = {
  infantil: ['Pre I', 'Pre II'],
  fundamental: ['1o ano', '2o ano', '3o ano', '4o ano', '5o ano', '6o ano', '7o ano', '8o ano', '9o ano'],
  medio: ['1o EM', '2o EM', '3o EM'],
  tecnico: ['1o Tecnico', '2o Tecnico', '3o Tecnico', '4o Tecnico'],
  eja: ['EJA Fundamental', 'EJA Medio'],
  superior: ['1o sem', '2o sem', '3o sem', '4o sem', '5o sem', '6o sem', '7o sem', '8o sem', '9o sem', '10o sem'],
}

const ALL_GRADES = [
  'Pre I', 'Pre II',
  '1o ano', '2o ano', '3o ano', '4o ano', '5o ano',
  '6o ano', '7o ano', '8o ano', '9o ano',
  '1o EM', '2o EM', '3o EM',
]
const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'N/A']

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function getDaysInMonth(month: number, year: number): number {
  if (!month || !year) return 31
  return new Date(year, month, 0).getDate()
}

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatPhone(value: string): string {
  return formatWhatsApp(value)
}

interface FormData {
  name: string
  email: string
  birthDay: string
  birthMonth: string
  birthYear: string
  birthDate: string
  password: string
  confirmPassword: string
  state: string
  city: string
  citySearch: string
  schoolId: string
  schoolSearch: string
  schoolType: string
  grade: string
  section: string
  whatsapp: string
  whatsappCountryCode: string
  whatsappVisibility: string
  parentEmail: string
  parentPhone: string
  parentRelation: string
  lgpdConsent: boolean
}

// Normal flow: 1=Email, 2=Nome, 3=Senha, 4=Nascimento, 5=Escola, 6=WhatsApp, 7=LGPD
// Google flow: 4=Nascimento, 5=Escola, 6=WhatsApp, 7=LGPD
const NORMAL_STEPS = [1, 2, 3, 4, 5, 6, 7]
const GOOGLE_STEPS = [4, 5, 6, 7]

export default function Cadastro() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signInWithGoogle, signUpWithEmail } = useAuth()
  const fromGoogle = searchParams.get('from') === 'google'

  // Capture referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref') || new URLSearchParams(window.location.search).get('ref')
    if (refCode) sessionStorage.setItem('referral_code', refCode)
  }, [searchParams])

  // Redirect if already has a student record
  useEffect(() => {
    if (!user) return
    supabase
      .from('students')
      .select('id, community_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.community_id) {
          navigate('/home', { replace: true })
        }
      })
  }, [user, navigate])

  const stepSequence = fromGoogle ? GOOGLE_STEPS : NORMAL_STEPS
  const [stepIndex, setStepIndex] = useState(0)
  const step = stepSequence[stepIndex] ?? stepSequence[0]

  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const makeDefaultForm = (): FormData => ({
    name: fromGoogle && user ? (user.user_metadata?.full_name || user.user_metadata?.name || '') : '',
    email: fromGoogle && user ? (user.email || '') : '',
    birthDay: '', birthMonth: '', birthYear: '', birthDate: '',
    password: '', confirmPassword: '',
    state: '', city: '', citySearch: '',
    schoolId: '', schoolSearch: '', schoolType: '',
    grade: '', section: '',
    whatsapp: '', whatsappCountryCode: '+55', whatsappVisibility: 'private',
    parentEmail: '', parentPhone: '', parentRelation: '',
    lgpdConsent: false,
  })

  const [form, setForm] = useState<FormData>(() => {
    try {
      const backup = sessionStorage.getItem('cadastro_backup')
      if (backup) {
        const { form: saved, fromGoogle: savedFrom } = JSON.parse(backup)
        if (savedFrom === fromGoogle) return { ...makeDefaultForm(), ...saved }
      }
    } catch { /* ignore */ }
    return makeDefaultForm()
  })

  // Pre-fill from Google
  useEffect(() => {
    if (fromGoogle && user && !form.name) {
      setForm(prev => ({
        ...prev,
        name: user.user_metadata?.full_name || user.user_metadata?.name || prev.name,
        email: user.email || prev.email,
      }))
    }
  }, [user, fromGoogle])

  // Browser back support + sessionStorage backup
  useEffect(() => {
    window.history.pushState({ step: stepIndex }, '')
    sessionStorage.setItem('cadastro_backup', JSON.stringify({ form, stepIndex, fromGoogle }))
  }, [stepIndex, form, fromGoogle])

  useEffect(() => {
    const handlePopState = () => {
      setStepIndex(prev => {
        if (prev > 0) return prev - 1
        navigate('/')
        return prev
      })
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [navigate])

  // City autocomplete
  const [citySuggestions, setCitySuggestions] = useState<string[]>([])
  const [cityLoading, setCityLoading] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCities = useCallback(async (state: string, query?: string) => {
    setCityLoading(true)
    // Use cities table via states FK (fixes Rio Grande-RS truncation bug)
    const { data: stateRow } = await supabase.from('states').select('id').eq('abbreviation', state).single()
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

  const searchCities = useCallback((state: string, query: string) => {
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    if (!state || query.length < 3) { setCitySuggestions([]); return }
    cityDebounceRef.current = setTimeout(() => fetchCities(state, query), 300)
  }, [fetchCities])

  // School autocomplete
  const [schoolSuggestions, setSchoolSuggestions] = useState<{ id: string; name: string; school_type: string }[]>([])
  const [schoolLoading, setSchoolLoading] = useState(false)
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false)
  const schoolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchSchools = useCallback(async (state: string, city: string, query?: string) => {
    setSchoolLoading(true)
    let q = supabase.from('schools').select('id, name, school_type').eq('state', state).eq('city', city)
    if (query && query.length >= 3) q = q.ilike('name', `%${query}%`)
    q = q.order('name').limit(100)
    const { data } = await q
    if (data) setSchoolSuggestions(data)
    setSchoolLoading(false)
    setShowSchoolDropdown(true)
  }, [])

  const searchSchools = useCallback((state: string, city: string, query: string) => {
    if (schoolDebounceRef.current) clearTimeout(schoolDebounceRef.current)
    if (!state || !city || query.length < 3) { setSchoolSuggestions([]); return }
    schoolDebounceRef.current = setTimeout(() => fetchSchools(state, city, query), 300)
  }, [fetchSchools])

  // Get available grades based on selected school type
  const availableGrades = useMemo(() => {
    if (!form.schoolType) return ALL_GRADES
    const types = form.schoolType.split(',').map(t => t.trim())
    const grades: string[] = []
    for (const type of types) {
      if (GRADES_BY_TYPE[type]) grades.push(...GRADES_BY_TYPE[type])
    }
    return grades.length > 0 ? grades : ALL_GRADES
  }, [form.schoolType])

  const currentYear = new Date().getFullYear()
  const minYear = currentYear - 80
  const maxYear = currentYear - 5

  const birthDateValid = useMemo(() => {
    const y = parseInt(form.birthYear)
    const m = parseInt(form.birthMonth)
    const d = parseInt(form.birthDay)
    if (!y || !m || !d) return false
    if (y < minYear || y > maxYear) return false
    if (d > getDaysInMonth(m, y)) return false
    return true
  }, [form.birthYear, form.birthMonth, form.birthDay, minYear, maxYear])

  // Compute birth date string
  const birthDate = useMemo(() => {
    if (!birthDateValid) return ''
    const y = form.birthYear.padStart(4, '0')
    const m = form.birthMonth.padStart(2, '0')
    const d = form.birthDay.padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [form.birthYear, form.birthMonth, form.birthDay, birthDateValid])

  // Age calculation — LGPD only for < 12
  const age = useMemo(() => {
    if (!birthDateValid || !birthDate) return null
    return calcAge(birthDate)
  }, [birthDate, birthDateValid])

  const needsConsent = age !== null && age < 12

  const passwordValidation = useMemo(() => validatePassword(form.password), [form.password])

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Determine how many steps to show (skip LGPD if not needed)
  const effectiveSteps = useMemo(() => {
    if (needsConsent) return stepSequence
    return stepSequence.filter(s => s !== 7)
  }, [stepSequence, needsConsent])

  const totalVisibleSteps = effectiveSteps.length

  const canAdvance = () => {
    switch (step) {
      case 1: return form.email.includes('@') && !emailError
      case 2: return form.name.trim().length >= 2
      case 3: return passwordValidation.valid && form.password === form.confirmPassword
      case 4: return birthDateValid
      case 5: return form.schoolId !== '' && form.grade !== '' && form.section !== ''
      case 6: return form.whatsapp.replace(/\D/g, '').length >= 10
      case 7: return form.parentEmail.includes('@') && form.parentPhone.replace(/\D/g, '').length >= 10 && form.parentRelation !== '' && form.lgpdConsent
      default: return false
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canAdvance()) handleNext()
  }

  const handleNext = () => {
    // Skip LGPD step if consent not needed
    if (step === 6 && !needsConsent) {
      handleComplete()
      return
    }

    const currentEffectiveIndex = effectiveSteps.indexOf(step)
    if (currentEffectiveIndex < effectiveSteps.length - 1) {
      const nextStep = effectiveSteps[currentEffectiveIndex + 1]
      const realIndex = stepSequence.indexOf(nextStep)
      setStepIndex(realIndex)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (stepIndex > 0) {
      // Find previous effective step
      const currentEffectiveIndex = effectiveSteps.indexOf(step)
      if (currentEffectiveIndex > 0) {
        const prevStep = effectiveSteps[currentEffectiveIndex - 1]
        const realIndex = stepSequence.indexOf(prevStep)
        setStepIndex(realIndex)
      }
    }
  }

  const handleComplete = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      let authUserId = user?.id

      if (!fromGoogle && form.email && form.password) {
        // Try signIn first (handles existing accounts / rate limit avoidance)
        const { error: signInErr, data: signInData } = await supabase.auth.signInWithPassword({
          email: form.email, password: form.password
        })
        if (!signInErr && signInData.user) {
          authUserId = signInData.user.id
        } else {
          const { error, user: newUser } = await signUpWithEmail(form.email, form.password)
          if (error && !error.includes('already registered')) {
            setEmailError(error.includes('rate limit') ? 'Muitas tentativas. Aguarde alguns minutos.' : error)
            setSubmitting(false)
            return
          }
          if (newUser) authUserId = newUser.id
          // Ensure session
          if (!authUserId) {
            const { data } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
            authUserId = data.user?.id
          }
        }
      }

      if (!authUserId) {
        setEmailError('Erro: usuario nao autenticado. Tente novamente.')
        setSubmitting(false)
        return
      }

      const { data: studentData, error: studentError } = await supabase.from('students').insert({
        user_id: authUserId,
        name: form.name,
        email: form.email,
        birth_date: birthDate || null,
        school_id: form.schoolId || null,
        parent_name: null,
        parent_email: form.parentEmail || null,
        parent_phone: form.parentPhone.replace(/\D/g, '') || null,
        parent_consent: form.lgpdConsent,
        whatsapp: form.whatsapp.replace(/\D/g, '') ? (form.whatsappCountryCode + form.whatsapp.replace(/\D/g, '')) : null,
        whatsapp_country_code: form.whatsappCountryCode,
        whatsapp_visibility: form.whatsappVisibility,
        total_points: 0,
        available_points: 0,
        redeemed_points: 0,
        role: 'student',
      }).select('id').single()

      if (studentError) {
        if (!studentError.message.includes('duplicate')) {
          alert(`Erro ao salvar perfil: ${studentError.message}`)
          setSubmitting(false)
          return
        }
      }

      // Create classroom and enrollment
      if (form.schoolId && form.grade && form.section) {
        try {
          const classroom = await findOrCreateClassroom(form.schoolId, form.grade, form.section)
          const studentId = studentData?.id
          if (studentId && classroom) {
            await createStudentEnrollment(studentId, classroom.id)
          }
        } catch (err) {
          console.error('Error creating enrollment:', err)
        }
      }

      // Send LGPD consent email if minor
      if (needsConsent && form.parentEmail && studentData?.id) {
        sendLgpdConsentEmail(form.parentEmail, form.name, studentData.id)
      }

      // Confirm referral if exists
      const refCode = sessionStorage.getItem('referral_code')
      if (refCode && studentData?.id) {
        const { data: pendingRef } = await supabase
          .from('referrals')
          .select('id')
          .eq('referral_code', refCode)
          .eq('status', 'pending')
          .limit(1)
          .maybeSingle()
        if (pendingRef) {
          await supabase.from('referrals').update({
            status: 'confirmed',
            referred_id: studentData.id,
            confirmed_at: new Date().toISOString(),
          }).eq('id', pendingRef.id)
        }
        sessionStorage.removeItem('referral_code')
      }

      sessionStorage.removeItem('cadastro_backup')
      navigate('/tribo')
    } catch {
      alert('Erro inesperado. Tente novamente.')
      setSubmitting(false)
    }
  }

  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch {
      setGoogleLoading(false)
      alert('Erro ao conectar com Google. Tente novamente.')
    }
  }

  // Check duplicate email
  const checkEmailExists = useCallback(async (email: string) => {
    if (!email.includes('@')) return
    const { data } = await supabase.from('students').select('id').eq('email', email).maybeSingle()
    if (data) {
      setEmailError('Este email ja esta cadastrado. Faca login.')
    }
  }, [])

  const effectiveIndex = effectiveSteps.indexOf(step)

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 max-w-xs w-full justify-center">
        {effectiveSteps.map((_, i) => (
          <div key={i} className="flex items-center">
            <div
              className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${i < effectiveIndex
                  ? 'bg-green text-white'
                  : i === effectiveIndex
                    ? 'bg-teal text-white shadow-lg scale-110'
                    : 'bg-gray-200 text-gray-400'
                }
              `}
            >
              {i < effectiveIndex ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
            </div>
            {i < effectiveSteps.length - 1 && (
              <div className={`w-6 h-1 rounded-full transition-colors duration-300 ${
                i < effectiveIndex ? 'bg-green' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md transition-all duration-300"
        style={{ animation: 'fadeSlideIn 0.35s ease-out' }}
        key={step}
        onKeyDown={handleKeyDown}
      >
        {/* Step 1: Email + Google */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F4E7}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Vamos comecar!</h2>
              <p className="text-gray-400 text-sm mt-1">Entre com Google ou cadastre com email</p>
            </div>
            {/* Google first — more prominent */}
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
            <input
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => {
                update('email', e.target.value)
                setEmailError('')
              }}
              onBlur={(e) => checkEmailExists(e.target.value)}
              className={`w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none text-lg transition-colors ${
                emailError ? 'border-red focus:border-red' : 'border-gray-200 focus:border-teal'
              }`}
              autoFocus
            />
            {emailError && (
              <div className="text-sm">
                <p className="text-red">{emailError}</p>
                {emailError.includes('cadastrado') && (
                  <button onClick={() => navigate('/auth/callback')} className="text-teal font-semibold mt-1">
                    Ir para login
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-gray-400 text-center">Confira se o email esta correto. Voce precisara dele para recuperar sua senha.</p>
          </div>
        )}

        {/* Step 2: Name */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F44B}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Como voce se chama?</h2>
              <p className="text-gray-400 text-sm mt-1">Esse nome aparecera no seu perfil</p>
            </div>
            <input
              type="text"
              placeholder="Seu nome completo"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
              autoFocus
            />
          </div>
        )}

        {/* Step 3: Password */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F512}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Crie uma senha forte</h2>
              <p className="text-gray-400 text-sm mt-1">Minimo 8 caracteres com variedade</p>
            </div>
            <PasswordInput
              password={form.password}
              confirmPassword={form.confirmPassword}
              onPasswordChange={(v) => update('password', v)}
              onConfirmChange={(v) => update('confirmPassword', v)}
              onEnterAdvance={() => canAdvance() && handleNext()}
            />
          </div>
        )}

        {/* Step 4: Birth date */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F382}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Quantos anos voce tem?</h2>
              <p className="text-gray-400 text-sm mt-1">Selecione sua data de nascimento</p>
            </div>
            <div className="flex gap-3">
              <select value={form.birthDay} onChange={(e) => update('birthDay', e.target.value)}
                className="flex-1 px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white">
                <option value="">Dia</option>
                {Array.from({ length: getDaysInMonth(parseInt(form.birthMonth) || 12, parseInt(form.birthYear) || 2000) }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>
              <select value={form.birthMonth} onChange={(e) => update('birthMonth', e.target.value)}
                className="flex-[1.5] px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white">
                <option value="">Mes</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <select value={form.birthYear} onChange={(e) => update('birthYear', e.target.value)}
                className="flex-1 px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white">
                <option value="">Ano</option>
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            {form.birthYear && (parseInt(form.birthYear) < minYear || parseInt(form.birthYear) > maxYear) && (
              <p className="text-red text-sm">Ano de nascimento invalido.</p>
            )}
          </div>
        )}

        {/* Step 5: School */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F3EB}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Sua escola</h2>
              <p className="text-gray-400 text-sm mt-1">Selecione estado, cidade e escola</p>
            </div>

            {/* State select */}
            <select value={form.state} onChange={(e) => {
              update('state', e.target.value)
              update('city', ''); update('citySearch', '')
              update('schoolId', ''); update('schoolSearch', '')
              update('grade', ''); update('schoolType', '')
              setCitySuggestions([]); setSchoolSuggestions([])
            }}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors bg-white">
              <option value="">Selecione o estado</option>
              {BRAZILIAN_STATES.map((s) => (
                <option key={s} value={s}>{s} - {STATE_NAMES[s]}</option>
              ))}
            </select>

            {/* City autocomplete */}
            {form.state && (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Digite o nome ou pressione Enter para ver todas"
                    value={form.city || form.citySearch}
                    onChange={(e) => {
                      const val = e.target.value
                      update('citySearch', val)
                      if (form.city) {
                        update('city', '')
                        update('schoolId', ''); update('schoolSearch', '')
                        update('grade', ''); update('schoolType', '')
                      }
                      searchCities(form.state, val)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); fetchCities(form.state) }
                    }}
                    onFocus={() => citySuggestions.length > 0 && setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
                  />
                  {cityLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal animate-spin" />}
                </div>
                {showCityDropdown && citySuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {citySuggestions.map((c) => (
                      <button key={c} type="button"
                        onMouseDown={() => {
                          update('city', c); update('citySearch', '')
                          setShowCityDropdown(false)
                          setSchoolSuggestions([])
                          update('schoolId', ''); update('schoolSearch', '')
                          update('grade', ''); update('schoolType', '')
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-teal/10 text-sm transition-colors">
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* School autocomplete */}
            {form.city && (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Digite o nome ou pressione Enter para ver todas"
                    value={form.schoolId ? schoolSuggestions.find(s => s.id === form.schoolId)?.name || form.schoolSearch : form.schoolSearch}
                    onChange={(e) => {
                      const val = e.target.value
                      update('schoolSearch', val)
                      if (form.schoolId) {
                        update('schoolId', ''); update('grade', ''); update('schoolType', '')
                      }
                      searchSchools(form.state, form.city, val)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); fetchSchools(form.state, form.city) }
                    }}
                    onFocus={() => {
                      if (form.schoolId) {
                        update('schoolSearch', '')
                        update('schoolId', ''); update('grade', ''); update('schoolType', '')
                      }
                      schoolSuggestions.length > 0 && setShowSchoolDropdown(true)
                    }}
                    onBlur={() => setTimeout(() => setShowSchoolDropdown(false), 200)}
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
                  />
                  {schoolLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal animate-spin" />}
                </div>
                {showSchoolDropdown && schoolSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {schoolSuggestions.map((s) => (
                      <button key={s.id} type="button"
                        onMouseDown={() => {
                          update('schoolId', s.id)
                          update('schoolSearch', s.name)
                          update('schoolType', s.school_type)
                          update('grade', '')
                          setShowSchoolDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-teal/10 text-sm transition-colors">
                        {s.name}
                        <span className="text-xs text-gray-400 ml-2">({s.school_type})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grade + Section */}
            {form.schoolId && (
              <div className="flex gap-3">
                <select value={form.grade} onChange={(e) => update('grade', e.target.value)}
                  className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white">
                  <option value="">Serie</option>
                  {availableGrades.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
                <select value={form.section} onChange={(e) => update('section', e.target.value)}
                  className="w-24 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white">
                  <option value="">Turma</option>
                  {sections.map((s) => (<option key={s} value={s}>{s === 'N/A' ? 'Nao se aplica' : s}</option>))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Step 6: WhatsApp (optional) */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F4F1}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Seu WhatsApp</h2>
              <p className="text-gray-400 text-sm mt-1">Opcional — para notificacoes e comunicacao</p>
            </div>
            <div className="flex gap-2">
              <select value={form.whatsappCountryCode} onChange={(e) => update('whatsappCountryCode', e.target.value)}
                className="w-32 px-2 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-sm transition-colors bg-white">
                {COUNTRY_CODES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
              <input type="tel" placeholder="(XX) XXXXX-XXXX" value={form.whatsapp}
                onChange={(e) => update('whatsapp', formatWhatsApp(e.target.value))}
                className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
                autoFocus />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">Visibilidade do WhatsApp:</p>
              {[
                { value: 'private', label: 'Privado (apenas notificacoes do App)' },
                { value: 'friends', label: 'Amigos (notificacoes + visivel para amigos)' },
                ...(age !== null && age >= 12 ? [{ value: 'public', label: 'Publico' }] : []),
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  form.whatsappVisibility === opt.value ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-teal/50'
                }`}>
                  <input type="radio" name="whatsappVis" value={opt.value} checked={form.whatsappVisibility === opt.value}
                    onChange={() => update('whatsappVisibility', opt.value)} className="accent-teal" />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center">Informe seu telefone para receber notificacoes</p>
          </div>
        )}

        {/* Step 7: LGPD (only for < 12 years old) */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F389}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Voce esta quase la!</h2>
              <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                Como voce tem menos de 12 anos, precisamos que informe o contato de um responsavel para tudo ficar certinho com a LGPD.
              </p>
            </div>
            <input type="email" placeholder="Email do responsavel" value={form.parentEmail}
              onChange={(e) => update('parentEmail', e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
              autoFocus />
            <input type="tel" placeholder="Telefone com DDD do responsavel" value={form.parentPhone}
              onChange={(e) => update('parentPhone', formatPhone(e.target.value))}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors" />
            <select value={form.parentRelation} onChange={(e) => update('parentRelation', e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors bg-white">
              <option value="">Relacao com o responsavel</option>
              <option value="pai">Pai</option>
              <option value="mae">Mae</option>
              <option value="tutor">Tutor(a)</option>
              <option value="responsavel">Outro responsavel</option>
            </select>
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
              form.lgpdConsent ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-teal/50'
            }`}>
              <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                form.lgpdConsent ? 'bg-teal border-teal' : 'bg-white border-gray-400'
              }`}>
                {form.lgpdConsent && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
              <input type="checkbox" checked={form.lgpdConsent} onChange={(e) => update('lgpdConsent', e.target.checked)} className="sr-only" />
              <span className="text-sm text-gray-700 leading-relaxed">
                Autorizo a coleta e tratamento dos dados do menor de acordo com a Lei Geral de Protecao de Dados (LGPD).
                Os dados serao usados exclusivamente para o funcionamento da plataforma educacional.
              </span>
            </label>
            <p className="text-xs text-gray-400 text-center">
              Enviaremos uma mensagem pedindo a autorizacao. Enquanto isso, voce ja pode explorar a plataforma!
            </p>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-6">
          {effectiveIndex > 0 && (
            <button onClick={handleBack}
              className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-5 h-5" /> Voltar
            </button>
          )}
          <button onClick={handleNext} disabled={!canAdvance() || submitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all duration-200
              ${canAdvance() && !submitting
                ? 'bg-teal text-white hover:bg-teal/90 hover:shadow-lg active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
            {submitting ? 'Salvando...' : effectiveIndex === effectiveSteps.length - 1 || (step === 6 && !needsConsent) ? 'Concluir' : 'Proximo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-gray-400 text-sm">
        Passo {effectiveIndex + 1} de {totalVisibleSteps}
      </p>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
