import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Search,
  UserPlus,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
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

function formatCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

interface StudentResult {
  id: string
  name: string
  school: { name: string } | null
}

const inputClass = "w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg transition-colors"

export default function ResponsavelCadastro() {
  const navigate = useNavigate()
  const { user, signUpWithEmail } = useAuth()

  const [step, setStep] = useState(user ? 2 : 1)
  const totalSteps = 3

  // Step 1
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Step 2
  const [fullName, setFullName] = useState('')
  const [cpf, setCpf] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+55')

  // Step 3 — Link students
  const [autoLinkedStudents, setAutoLinkedStudents] = useState<StudentResult[]>([])
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [selectedStudents, setSelectedStudents] = useState<StudentResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // Step 1: Auth — try signIn first, then signUp
  const handleAuth = async () => {
    setAuthError('')
    setAuthLoading(true)
    try {
      // Try login first
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInErr) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) { setStep(2); setAuthLoading(false); return }
      }

      // If not "Invalid login", show error
      if (signInErr && !signInErr.message.includes('Invalid login')) {
        const msg = signInErr.message.includes('rate limit') ? 'Muitas tentativas. Aguarde alguns minutos.' : signInErr.message
        setAuthError(msg)
        setAuthLoading(false)
        return
      }

      // Create account
      const { error } = await signUpWithEmail(email, password)
      if (error && !error.includes('already registered')) {
        setAuthError(error)
        setAuthLoading(false)
        return
      }
      // Wait for session
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

  useEffect(() => { if (user && step === 1) setStep(2) }, [user, step])

  // Auto-detect linked students when reaching step 3
  useEffect(() => {
    if (step !== 3 || !user) return
    const userEmail = user.email || email
    if (!userEmail) return

    supabase
      .from('students')
      .select('id, name, school:schools(name)')
      .eq('parent_email', userEmail)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const students = data as unknown as StudentResult[]
          setAutoLinkedStudents(students)
          setSelectedStudents(students)
        }
      })
  }, [step, user, email])

  // Search students
  useEffect(() => {
    if (!showAllStudents && studentQuery.length < 2) { setStudentResults([]); return }
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      let q = supabase.from('students').select('id, name, school:schools(name)')
      if (studentQuery.length >= 2) {
        q = q.ilike('name', `%${studentQuery}%`).limit(10)
      } else {
        q = q.order('name').limit(30)
      }
      const { data } = await q
      if (data) setStudentResults(data as unknown as StudentResult[])
      setSearchLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [studentQuery, showAllStudents])

  const toggleStudent = (s: StudentResult) => {
    setSelectedStudents(prev =>
      prev.some(p => p.id === s.id) ? prev.filter(p => p.id !== s.id) : [...prev, s]
    )
  }

  // Submit
  const handleSubmit = async () => {
    if (selectedStudents.length === 0) return
    setSubmitting(true)
    setGlobalError('')

    try {
      let userId = user?.id
      if (!userId) {
        if (email && password) {
          const { data } = await supabase.auth.signInWithPassword({ email, password })
          userId = data.user?.id
        }
        if (!userId) { setGlobalError('Voce precisa estar autenticado.'); setSubmitting(false); return }
      }

      // Insert users record
      const { data: usersRow } = await supabase.from('users').insert({
        auth_id: userId,
        name: fullName,
        email: user?.email || email,
        phone: countryCode + phone,
        cpf: cpf.replace(/\D/g, '') || null,
        phone_country_code: countryCode,
      }).select('id').single()

      // Insert parent
      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .insert({
          user_id: userId,
          users_id: usersRow?.id || null,
          name: fullName,
          email: user?.email || email,
          phone: countryCode + phone,
          cpf: cpf.replace(/\D/g, '') || null,
        })
        .select('id')
        .single()

      if (parentError) throw parentError

      // Link students
      for (const s of selectedStudents) {
        await supabase.from('parent_students').insert({
          parent_id: parentData.id,
          student_id: s.id,
          relationship: 'responsavel',
          consent_given: false,
        }) // ignore duplicate if any
      }

      navigate('/responsavel/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cadastro.'
      setGlobalError(message)
    }
    setSubmitting(false)
  }

  const canAdvance = () => {
    switch (step) {
      case 1: return email.includes('@') && validatePassword(password).valid && password === confirmPassword
      case 2: return fullName.trim().length >= 2 && phone.trim().length >= 10
      case 3: return selectedStudents.length > 0
      default: return false
    }
  }

  const handleNext = () => {
    if (step === 1 && !user) { handleAuth(); return }
    if (step < totalSteps) { setStep(step + 1) } else { handleSubmit() }
  }

  // Browser back support
  useEffect(() => {
    window.history.pushState({ step }, '')
    sessionStorage.setItem('responsavel_backup', JSON.stringify({ step, fullName, cpf, phone, countryCode }))
  }, [step, fullName, cpf, phone, countryCode])

  useEffect(() => {
    const handlePop = () => setStep(prev => prev > 1 ? prev - 1 : prev)
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

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
              <div className="w-6 h-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: s < step ? '#02C39A' : '#e5e7eb' }} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md" key={step}>
        {/* Step 1: Auth */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <UserPlus className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Cadastro de Responsavel</h2>
              <p className="text-gray-400 text-sm mt-1">Crie sua conta para acompanhar seu filho(a)</p>
            </div>
            {user ? (
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#f0fdfa', border: '1px solid #02C39A' }}>
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: '#02C39A' }} />
                <p className="text-sm" style={{ color: '#1F4E79' }}>Autenticado como <strong>{user.email}</strong></p>
              </div>
            ) : (
              <>
                <input type="email" placeholder="Seu email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()}
                  autoFocus />
                <PasswordInput password={password} confirmPassword={confirmPassword}
                  onPasswordChange={setPassword} onConfirmChange={setConfirmPassword}
                  onEnterAdvance={() => canAdvance() && handleNext()} />
                {authError && <p className="text-sm" style={{ color: '#dc2626' }}>{authError}</p>}
              </>
            )}
          </div>
        )}

        {/* Step 2: Personal data */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <UserPlus className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Seus dados</h2>
              <p className="text-gray-400 text-sm mt-1">Nome, CPF e telefone</p>
            </div>
            <input type="text" placeholder="Nome completo" value={fullName}
              onChange={(e) => setFullName(e.target.value)} className={inputClass}
              onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()} autoFocus />
            <input type="text" placeholder="CPF" value={cpf}
              onChange={(e) => setCpf(formatCPF(e.target.value))} className={inputClass}
              onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()} />
            <div className="flex gap-2">
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                className="w-32 px-2 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-sm bg-white">
                {COUNTRY_CODES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="tel" placeholder="Telefone (ex: 51999999999)" value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className={`flex-1 ${inputClass}`}
                onKeyDown={(e) => e.key === 'Enter' && canAdvance() && handleNext()} />
            </div>
          </div>
        )}

        {/* Step 3: Link students */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Vincular filho(a)</h2>
              <p className="text-gray-400 text-sm mt-1">Selecione seu filho(a) na plataforma</p>
            </div>

            {autoLinkedStudents.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Alunos que indicaram seu email:</p>
                {autoLinkedStudents.map(s => (
                  <div key={s.id} className="p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: '#f0fdfa', border: '1px solid #02C39A' }}>
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#02C39A' }} />
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#1F4E79' }}>{s.name}</p>
                      <p className="text-xs text-gray-400">{s.school?.name || ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={studentQuery}
                onChange={(e) => { setStudentQuery(e.target.value); setShowAllStudents(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && studentQuery.length < 2) { e.preventDefault(); setShowAllStudents(true) } }}
                placeholder="Buscar aluno ou Enter para ver todos"
                className="w-full pl-10 pr-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg transition-colors" />
              {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#028090] animate-spin" />}
            </div>

            {studentResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {studentResults.map(s => {
                  const isSelected = selectedStudents.some(p => p.id === s.id)
                  return (
                    <button key={s.id} onClick={() => toggleStudent(s)}
                      className="w-full text-left p-3 rounded-xl border-2 transition-all"
                      style={{ borderColor: isSelected ? '#02C39A' : '#e5e7eb', backgroundColor: isSelected ? '#f0fdfa' : '#fff' }}>
                      <div className="flex items-center gap-2">
                        {isSelected && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#02C39A' }} />}
                        <div>
                          <p className="font-semibold text-sm" style={{ color: '#1F4E79' }}>{s.name}</p>
                          <p className="text-xs text-gray-400">{s.school?.name || ''}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {selectedStudents.length > 0 && (
              <p className="text-xs font-semibold" style={{ color: '#02C39A' }}>
                {selectedStudents.length} aluno(s) selecionado(s)
              </p>
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
            <button onClick={() => setStep(step - 1)}
              className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-5 h-5" /> Voltar
            </button>
          )}
          <button onClick={handleNext}
            disabled={!canAdvance() || authLoading || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: canAdvance() ? '#028090' : '#e5e7eb', color: canAdvance() ? '#fff' : '#9ca3af' }}>
            {(authLoading || submitting) && <Loader2 className="w-5 h-5 animate-spin" />}
            {step === totalSteps ? 'Concluir cadastro' : step === 1 && !user ? 'Criar conta' : 'Proximo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-gray-400 text-sm">Passo {step} de {totalSteps}</p>
    </div>
  )
}
