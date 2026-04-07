import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const grades = [
  '1o ano', '2o ano', '3o ano', '4o ano', '5o ano',
  '6o ano', '7o ano', '8o ano', '9o ano',
  '1o EM', '2o EM', '3o EM',
]
const sections = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function getDaysInMonth(month: number, year: number): number {
  if (!month || !year) return 31
  return new Date(year, month, 0).getDate()
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
  schoolId: string
  grade: string
  section: string
  parentName: string
  parentEmail: string
  lgpdConsent: boolean
  schoolSearch: string
}

export default function Cadastro() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signInWithGoogle, signUpWithEmail } = useAuth()
  const fromGoogle = searchParams.get('from') === 'google'
  const initialStep = fromGoogle ? parseInt(searchParams.get('step') || '1') : 1

  // Redirect if already has a student record
  useEffect(() => {
    if (!user) return
    supabase
      .from('students')
      .select('id, tribe_id')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.tribe_id) {
          navigate('/home', { replace: true })
        }
      })
  }, [user, navigate])

  const [step, setStep] = useState(initialStep)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<FormData>({
    name: '',
    email: '',
    birthDay: '',
    birthMonth: '',
    birthYear: '',
    birthDate: '',
    password: '',
    confirmPassword: '',
    state: '',
    city: '',
    schoolId: '',
    grade: '',
    section: '',
    parentName: '',
    parentEmail: '',
    lgpdConsent: false,
    schoolSearch: '',
  })

  // Dynamic school data from Supabase
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [schoolsList, setSchoolsList] = useState<{ id: string; name: string }[]>([])

  // Load states on mount
  useEffect(() => {
    supabase
      .from('schools')
      .select('state')
      .limit(1000)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((r: { state: string }) => r.state))].sort()
          setStates(unique)
        }
      })
  }, [])

  // Load cities when state changes
  useEffect(() => {
    if (!form.state) { setCities([]); return }
    supabase
      .from('schools')
      .select('city')
      .eq('state', form.state)
      .limit(1000)
      .then(({ data }) => {
        if (data) {
          const unique = [...new Set(data.map((r: { city: string }) => r.city))].sort()
          setCities(unique)
        }
      })
  }, [form.state])

  // Load schools when city changes or search changes
  useEffect(() => {
    if (!form.state || !form.city) { setSchoolsList([]); return }
    let query = supabase
      .from('schools')
      .select('id, name')
      .eq('state', form.state)
      .eq('city', form.city)
      .order('name')
      .limit(50)

    if (form.schoolSearch.trim()) {
      query = query.ilike('name', `%${form.schoolSearch.trim()}%`)
    }

    query.then(({ data }) => {
      if (data) setSchoolsList(data)
    })
  }, [form.state, form.city, form.schoolSearch])

  const totalSteps = 6

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

  // Update birthDate string whenever parts change
  useMemo(() => {
    if (birthDateValid) {
      const y = form.birthYear.padStart(4, '0')
      const m = form.birthMonth.padStart(2, '0')
      const d = form.birthDay.padStart(2, '0')
      form.birthDate = `${y}-${m}-${d}`
    } else {
      form.birthDate = ''
    }
  }, [form.birthYear, form.birthMonth, form.birthDay, birthDateValid])

  const isMinor = useMemo(() => {
    if (!birthDateValid) return true
    const birth = new Date(form.birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1 < 18
    }
    return age < 18
  }, [form.birthDate, birthDateValid])

  const update = (field: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const canAdvance = () => {
    switch (step) {
      case 1: return form.name.trim().length >= 2
      case 2: return form.email.includes('@') && !emailError
      case 3: return birthDateValid
      case 4: return form.password.length >= 6 && form.password === form.confirmPassword
      case 5: return form.schoolId !== '' && form.grade !== '' && form.section !== ''
      case 6: return !isMinor || (form.parentName.trim().length >= 2 && form.parentEmail.includes('@') && form.lgpdConsent)
      default: return false
    }
  }

  const handleNext = () => {
    if (step < totalSteps) {
      // Skip LGPD step for adults
      if (step === 5 && !isMinor) {
        handleComplete()
        return
      }
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }

  const handleComplete = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      let authUserId = user?.id

      // Create Supabase account if not from Google
      if (!fromGoogle && form.email && form.password) {
        const { error, user: newUser } = await signUpWithEmail(form.email, form.password)
        if (error && !error.includes('already registered')) {
          alert(`Erro no cadastro: ${error}`)
          setSubmitting(false)
          return
        }
        if (newUser) authUserId = newUser.id
      }

      if (!authUserId) {
        alert('Erro: usuario nao autenticado. Tente novamente.')
        setSubmitting(false)
        return
      }

      // Create student record in Supabase
      const { error: studentError } = await supabase.from('students').insert({
        user_id: authUserId,
        name: form.name,
        email: form.email,
        birth_date: form.birthDate || null,
        school_id: form.schoolId || null,
        parent_name: form.parentName || null,
        parent_email: form.parentEmail || null,
        parent_consent: form.lgpdConsent,
        total_points: 0,
        available_points: 0,
        redeemed_points: 0,
        role: 'student',
      })

      if (studentError) {
        // If student already exists, just proceed
        if (!studentError.message.includes('duplicate')) {
          alert(`Erro ao salvar perfil: ${studentError.message}`)
          setSubmitting(false)
          return
        }
      }

      navigate('/tribo')
    } catch (err) {
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

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8 max-w-xs w-full justify-center">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`
                w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300
                ${s < step
                  ? 'bg-green text-white'
                  : s === step
                    ? 'bg-teal text-white shadow-lg scale-110'
                    : 'bg-gray-200 text-gray-400'
                }
              `}
            >
              {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
            </div>
            {s < totalSteps && (
              <div
                className={`w-6 h-1 rounded-full transition-colors duration-300 ${
                  s < step ? 'bg-green' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div
        className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md transition-all duration-300"
        style={{
          animation: 'fadeSlideIn 0.35s ease-out',
        }}
        key={step}
      >
        {/* Step 1: Name */}
        {step === 1 && (
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

        {/* Step 2: Email */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F4E7}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Qual seu email?</h2>
              <p className="text-gray-400 text-sm mt-1">Voce pode usar o Google para entrar mais rapido</p>
            </div>
            <input
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => {
                const val = e.target.value
                update('email', val)
                setEmailError('')
              }}
              className={`w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none text-lg transition-colors ${
                emailError ? 'border-red focus:border-red' : 'border-gray-200 focus:border-teal'
              }`}
              autoFocus
            />
            {emailError && (
              <p className="text-red text-sm">{emailError}</p>
            )}
            <div className="relative flex items-center my-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="px-3 text-gray-400 text-sm">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              onClick={handleGoogleSignIn}
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
              Entrar com Google
            </button>
          </div>
        )}

        {/* Step 3: Age */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F382}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Quantos anos voce tem?</h2>
              <p className="text-gray-400 text-sm mt-1">Selecione sua data de nascimento</p>
            </div>
            <div className="flex gap-3">
              <select
                value={form.birthDay}
                onChange={(e) => update('birthDay', e.target.value)}
                className="flex-1 px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white"
              >
                <option value="">Dia</option>
                {Array.from({ length: getDaysInMonth(parseInt(form.birthMonth) || 12, parseInt(form.birthYear) || 2000) }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>
              <select
                value={form.birthMonth}
                onChange={(e) => update('birthMonth', e.target.value)}
                className="flex-[1.5] px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white"
              >
                <option value="">Mes</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <select
                value={form.birthYear}
                onChange={(e) => update('birthYear', e.target.value)}
                className="flex-1 px-3 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white"
              >
                <option value="">Ano</option>
                {Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i).map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
            {form.birthYear && (parseInt(form.birthYear) < minYear || parseInt(form.birthYear) > maxYear) && (
              <p className="text-red text-sm">Ano de nascimento invalido.</p>
            )}
            {birthDateValid && isMinor && (
              <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-3 text-sm text-yellow-800">
                <strong>Menor de 18 anos?</strong> Voce precisara do consentimento de um responsavel (LGPD).
              </div>
            )}
          </div>
        )}

        {/* Step 4: Password */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F512}'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Crie uma senha</h2>
              <p className="text-gray-400 text-sm mt-1">Minimo 6 caracteres</p>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors pr-12"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirme a senha"
                value={form.confirmPassword}
                onChange={(e) => update('confirmPassword', e.target.value)}
                className={`w-full px-4 py-3.5 rounded-xl border-2 focus:outline-none text-lg transition-colors pr-12 ${
                  form.confirmPassword && form.confirmPassword !== form.password
                    ? 'border-red focus:border-red'
                    : 'border-gray-200 focus:border-teal'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {form.confirmPassword && form.confirmPassword !== form.password && (
              <p className="text-red text-sm">As senhas nao coincidem</p>
            )}
            {/* Password strength */}
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    form.password.length >= i * 3
                      ? i <= 1 ? 'bg-red' : i <= 2 ? 'bg-yellow' : 'bg-green'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
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
            <select
              value={form.state}
              onChange={(e) => {
                update('state', e.target.value)
                update('city', '')
                update('schoolId', '')
              }}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors bg-white"
            >
              <option value="">Selecione o estado</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={form.city}
              onChange={(e) => {
                update('city', e.target.value)
                update('schoolId', '')
              }}
              disabled={!form.state}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors bg-white disabled:opacity-50"
            >
              <option value="">Selecione a cidade</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {form.city && (
              <input
                type="text"
                placeholder="Buscar escola pelo nome..."
                value={form.schoolSearch}
                onChange={(e) => update('schoolSearch', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors"
              />
            )}

            <select
              value={form.schoolId}
              onChange={(e) => update('schoolId', e.target.value)}
              disabled={!form.city}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors bg-white disabled:opacity-50"
            >
              <option value="">Selecione a escola</option>
              {schoolsList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <select
                value={form.grade}
                onChange={(e) => update('grade', e.target.value)}
                className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white"
              >
                <option value="">Serie</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                value={form.section}
                onChange={(e) => update('section', e.target.value)}
                className="w-24 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white"
              >
                <option value="">Turma</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 6: LGPD */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F6E1}\uFE0F'}</span>
              <h2 className="text-2xl font-extrabold text-navy mt-2">Consentimento do Responsavel</h2>
              <p className="text-gray-400 text-sm mt-1">
                Conforme a LGPD, menores de 18 anos precisam de autorizacao
              </p>
            </div>
            <input
              type="text"
              placeholder="Nome do responsavel"
              value={form.parentName}
              onChange={(e) => update('parentName', e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
              autoFocus
            />
            <input
              type="email"
              placeholder="Email do responsavel"
              value={form.parentEmail}
              onChange={(e) => update('parentEmail', e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
            />
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
              form.lgpdConsent ? 'border-teal bg-teal/5' : 'border-gray-200 hover:border-teal/50'
            }`}>
              <div className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                form.lgpdConsent
                  ? 'bg-teal border-teal'
                  : 'bg-white border-gray-400'
              }`}>
                {form.lgpdConsent && (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
              </div>
              <input
                type="checkbox"
                checked={form.lgpdConsent}
                onChange={(e) => update('lgpdConsent', e.target.checked)}
                className="sr-only"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                Autorizo a coleta e tratamento dos dados do menor de acordo com a
                Lei Geral de Protecao de Dados (LGPD). Os dados serao usados
                exclusivamente para o funcionamento da plataforma educacional.
              </span>
            </label>
          </div>
        )}

        {/* Navigation buttons */}
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
            disabled={!canAdvance() || submitting}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg transition-all duration-200
              ${canAdvance() && !submitting
                ? 'bg-teal text-white hover:bg-teal/90 hover:shadow-lg active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {submitting ? 'Salvando...' : step === totalSteps || (step === 5 && !isMinor) ? 'Concluir' : 'Proximo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress text */}
      <p className="mt-4 text-gray-400 text-sm">
        Passo {step} de {isMinor ? totalSteps : totalSteps - 1}
      </p>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
