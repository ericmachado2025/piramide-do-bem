import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Search,
  Plus,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface School {
  id: string
  name: string
}

interface Classroom {
  id: string
  school_id: string
  grade: string
  section: string
}

interface Subject {
  id: string
  name: string
  level: string
  is_custom: boolean
  display_order: number
}

const LEVEL_MAP: Record<string, string> = {
  'Fundamental 1': 'fundamental1',
  'Fundamental 2': 'fundamental2',
  'Medio': 'medio',
  'Superior': 'superior',
  'Outro': 'outro',
}

const LEVELS = Object.keys(LEVEL_MAP)

const TOTAL_STEPS = 6

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProfessorCadastro() {
  const navigate = useNavigate()
  const { user, signUpWithEmail } = useAuth()

  // Step control
  const [step, setStep] = useState(user ? 2 : 1)

  // Step 1 — Account
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Step 2 — Personal info
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')

  // Step 3 — School selection
  const [states, setStates] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [schoolSearch, setSchoolSearch] = useState('')
  const [nivel, setNivel] = useState('')

  // Step 4 — Subjects
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [customSubject, setCustomSubject] = useState('')

  // Step 5 — Verification
  const [phoneCode, setPhoneCode] = useState('')
  const [sentCode, setSentCode] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  // Step 6 — Classes
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([])
  const [newGrade, setNewGrade] = useState('')
  const [newSection, setNewSection] = useState('')
  const [creatingClass, setCreatingClass] = useState(false)

  const [submitting, setSubmitting] = useState(false)

  // Skip step 1 if already authenticated
  useEffect(() => {
    if (user && step === 1) setStep(2)
  }, [user, step])

  /* ---------- Data loaders ---------- */

  // Load states
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('schools').select('state')
      if (data) {
        const unique = [...new Set(data.map((r: { state: string }) => r.state))].sort()
        setStates(unique)
      }
    }
    load()
  }, [])

  // Load cities when state changes
  useEffect(() => {
    if (!selectedState) { setCities([]); setSelectedCity(''); return }
    async function load() {
      const { data } = await supabase.from('schools').select('city').eq('state', selectedState)
      if (data) {
        const unique = [...new Set(data.map((r: { city: string }) => r.city))].sort()
        setCities(unique)
      }
    }
    load()
    setSelectedCity('')
    setSelectedSchoolId('')
    setSchools([])
  }, [selectedState])

  // Load schools when city changes
  useEffect(() => {
    if (!selectedCity || !selectedState) { setSchools([]); return }
    async function load() {
      const { data } = await supabase
        .from('schools')
        .select('id, name')
        .eq('state', selectedState)
        .eq('city', selectedCity)
        .order('name')
        .limit(50)
      if (data) setSchools(data)
    }
    load()
    setSelectedSchoolId('')
  }, [selectedCity, selectedState])

  // Load subjects when level changes
  useEffect(() => {
    if (!nivel) { setSubjects([]); return }
    const levelKey = LEVEL_MAP[nivel]
    async function load() {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('level', levelKey)
        .eq('is_custom', false)
        .order('display_order')
      if (data) setSubjects(data)
    }
    load()
    setSelectedSubjects([])
  }, [nivel])

  // Load classrooms when school changes
  useEffect(() => {
    if (!selectedSchoolId) { setClassrooms([]); return }
    async function load() {
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('school_id', selectedSchoolId)
        .order('grade')
      if (data) setClassrooms(data)
    }
    load()
    setSelectedClassrooms([])
  }, [selectedSchoolId])

  // Filtered schools by search
  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return schools
    const q = schoolSearch.toLowerCase()
    return schools.filter((s) => s.name.toLowerCase().includes(q))
  }, [schools, schoolSearch])

  /* ---------- Handlers ---------- */

  const handleSignUp = useCallback(async () => {
    setAuthError('')
    setAuthLoading(true)
    const { error } = await signUpWithEmail(email, password)
    setAuthLoading(false)
    if (error) {
      setAuthError(error)
      return
    }
    setStep(2)
  }, [email, password, signUpWithEmail])

  const sendPhoneCode = useCallback(async () => {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    setSentCode(code)
    console.log('Codigo de verificacao:', code)
    alert(`Seu codigo de verificacao: ${code}`)

    const userId = user?.id
    if (userId) {
      await supabase.from('phone_verifications').insert({
        user_id: userId,
        phone: telefone,
        code,
        verified: false,
      })
    }
  }, [telefone, user])

  const verifyPhone = useCallback(async () => {
    setVerifyError('')
    if (phoneCode !== sentCode) {
      setVerifyError('Codigo incorreto. Tente novamente.')
      return
    }
    if (user?.id) {
      await supabase
        .from('phone_verifications')
        .update({ verified: true })
        .eq('user_id', user.id)
        .eq('code', sentCode)
    }
    setPhoneVerified(true)
  }, [phoneCode, sentCode, user])

  const createNewClassroom = useCallback(async () => {
    if (!newGrade.trim() || !newSection.trim() || !selectedSchoolId) return
    setCreatingClass(true)
    const { data, error } = await supabase
      .from('classrooms')
      .insert({ school_id: selectedSchoolId, grade: newGrade.trim(), section: newSection.trim() })
      .select()
      .single()
    setCreatingClass(false)
    if (!error && data) {
      setClassrooms((prev) => [...prev, data])
      setSelectedClassrooms((prev) => [...prev, data.id])
      setNewGrade('')
      setNewSection('')
    }
  }, [newGrade, newSection, selectedSchoolId])

  const handleSubmit = useCallback(async () => {
    if (!user) return
    setSubmitting(true)

    // 1. Create teacher record
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .insert({
        user_id: user.id,
        name: nome,
        email: user.email || email,
        phone: telefone,
        school_id: selectedSchoolId,
        level: LEVEL_MAP[nivel] || nivel,
      })
      .select()
      .single()

    if (teacherErr || !teacher) {
      console.error('Erro ao criar professor:', teacherErr)
      setSubmitting(false)
      return
    }

    // 2. If custom subject, create it
    let allSubjectIds = [...selectedSubjects]
    if (customSubject.trim()) {
      const { data: customSub } = await supabase
        .from('subjects')
        .insert({
          name: customSubject.trim(),
          level: LEVEL_MAP[nivel] || nivel,
          is_custom: true,
          display_order: 999,
        })
        .select()
        .single()
      if (customSub) allSubjectIds.push(customSub.id)
    }

    // 3. Create teacher_assignments for each classroom+subject combo
    const assignments = selectedClassrooms.flatMap((classroomId) =>
      allSubjectIds.map((subjectId) => ({
        teacher_id: teacher.id,
        classroom_id: classroomId,
        subject_id: subjectId,
        school_id: selectedSchoolId,
      }))
    )

    if (assignments.length > 0) {
      await supabase.from('teacher_assignments').insert(assignments)
    }

    setSubmitting(false)
    navigate('/professor/dashboard')
  }, [
    user, nome, email, telefone, selectedSchoolId, nivel,
    selectedSubjects, customSubject, selectedClassrooms, navigate,
  ])

  /* ---------- Step validation ---------- */

  function canAdvance(): boolean {
    switch (step) {
      case 1: return email.length > 3 && password.length >= 6
      case 2: return nome.trim().length > 2 && telefone.trim().length > 7
      case 3: return !!selectedSchoolId && !!nivel
      case 4: return selectedSubjects.length > 0 || customSubject.trim().length > 0
      case 5: return phoneVerified
      case 6: return selectedClassrooms.length > 0
      default: return false
    }
  }

  function nextStep() {
    if (step === 1) { handleSignUp(); return }
    if (step === 5 && !sentCode) { sendPhoneCode() }
    if (step === TOTAL_STEPS) { handleSubmit(); return }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, user ? 2 : 1))
  }

  /* ---------- Render ---------- */

  const inputClass =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 ' +
    'placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#028090]/40 focus:border-[#028090] transition'

  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5'

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1F4E79] to-[#028090] px-6 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">Cadastro do Professor</h1>
        <p className="text-white/70 text-sm mt-1">
          Passo {step} de {TOTAL_STEPS}
        </p>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#02C39A] rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </header>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {/* ---- Step 1: Account ---- */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1F4E79]">Criar conta</h2>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                className={inputClass}
                placeholder="professor@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputClass}
                  placeholder="Minimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && <p className="text-sm text-red-500">{authError}</p>}
          </div>
        )}

        {/* ---- Step 2: Personal Info ---- */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1F4E79]">Dados pessoais</h2>

            <div>
              <label className={labelClass}>Nome completo</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Maria da Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Telefone</label>
              <input
                type="tel"
                className={inputClass}
                placeholder="(11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">Formato: (DDD) XXXXX-XXXX</p>
            </div>
          </div>
        )}

        {/* ---- Step 3: School Selection ---- */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1F4E79]">Escola</h2>

            <div>
              <label className={labelClass}>Estado (UF)</label>
              <select
                className={inputClass}
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">Selecione...</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {selectedState && (
              <div>
                <label className={labelClass}>Cidade</label>
                <select
                  className={inputClass}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedCity && (
              <div>
                <label className={labelClass}>Buscar escola</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className={`${inputClass} pl-9`}
                    placeholder="Filtrar por nome..."
                    value={schoolSearch}
                    onChange={(e) => setSchoolSearch(e.target.value)}
                  />
                </div>
                <select
                  className={inputClass}
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  size={Math.min(filteredSchools.length + 1, 6)}
                >
                  <option value="">Selecione a escola...</option>
                  {filteredSchools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Nivel de ensino</label>
              <div className="space-y-2">
                {LEVELS.map((l) => (
                  <label
                    key={l}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                      ${nivel === l ? 'border-[#028090] bg-[#028090]/5' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <input
                      type="radio"
                      name="nivel"
                      value={l}
                      checked={nivel === l}
                      onChange={() => setNivel(l)}
                      className="accent-[#028090]"
                    />
                    <span className="text-sm text-gray-700 font-medium">{l}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ---- Step 4: Subjects ---- */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1F4E79]">Materias</h2>
            <p className="text-sm text-gray-500">Selecione as materias que voce leciona</p>

            {subjects.length === 0 && (
              <p className="text-sm text-gray-400 italic">Nenhuma materia encontrada para este nivel.</p>
            )}

            <div className="space-y-2">
              {subjects.map((sub) => (
                <label
                  key={sub.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                    ${selectedSubjects.includes(sub.id) ? 'border-[#028090] bg-[#028090]/5' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(sub.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSubjects((prev) => [...prev, sub.id])
                      } else {
                        setSelectedSubjects((prev) => prev.filter((id) => id !== sub.id))
                      }
                    }}
                    className="accent-[#028090]"
                  />
                  <span className="text-sm text-gray-700 font-medium">{sub.name}</span>
                </label>
              ))}
            </div>

            <div>
              <label className={labelClass}>Outra materia (opcional)</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Ex: Robotica, Musica..."
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ---- Step 5: Verification ---- */}
        {step === 5 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <h2 className="text-lg font-bold text-[#1F4E79]">Verificacao</h2>

            {/* Email verification */}
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">Email</span>
              </div>
              <p className="text-sm text-blue-600">
                Verificacao enviada para seu email. Confira sua caixa de entrada.
              </p>
            </div>

            {/* Phone verification */}
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                {phoneVerified ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm font-semibold text-gray-700">Telefone</span>
              </div>

              {!sentCode && (
                <button
                  onClick={sendPhoneCode}
                  className="w-full py-2.5 rounded-xl bg-[#028090] text-white text-sm font-semibold hover:bg-[#028090]/90 transition"
                >
                  Enviar codigo de verificacao
                </button>
              )}

              {sentCode && !phoneVerified && (
                <>
                  <p className="text-sm text-gray-500">
                    Digite o codigo de 6 digitos enviado para {telefone}
                  </p>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="000000"
                    maxLength={6}
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, ''))}
                  />
                  {verifyError && <p className="text-sm text-red-500">{verifyError}</p>}
                  <button
                    onClick={verifyPhone}
                    className="w-full py-2.5 rounded-xl bg-[#028090] text-white text-sm font-semibold hover:bg-[#028090]/90 transition"
                  >
                    Verificar
                  </button>
                </>
              )}

              {phoneVerified && (
                <p className="text-sm text-green-600 font-medium">Telefone verificado com sucesso!</p>
              )}
            </div>
          </div>
        )}

        {/* ---- Step 6: Classes ---- */}
        {step === 6 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#1F4E79]">Turmas</h2>
            <p className="text-sm text-gray-500">Selecione ou crie as turmas que voce leciona</p>

            {classrooms.length === 0 && (
              <p className="text-sm text-gray-400 italic">Nenhuma turma cadastrada para esta escola.</p>
            )}

            <div className="space-y-2">
              {classrooms.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition
                    ${selectedClassrooms.includes(c.id) ? 'border-[#028090] bg-[#028090]/5' : 'border-gray-200 hover:bg-gray-50'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedClassrooms.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClassrooms((prev) => [...prev, c.id])
                      } else {
                        setSelectedClassrooms((prev) => prev.filter((id) => id !== c.id))
                      }
                    }}
                    className="accent-[#028090]"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {c.grade} - Turma {c.section}
                  </span>
                </label>
              ))}
            </div>

            {/* Create new classroom */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Criar nova turma
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={`${inputClass} flex-1`}
                  placeholder="Serie (ex: 9o ano)"
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                />
                <input
                  type="text"
                  className={`${inputClass} w-24`}
                  placeholder="Turma"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                />
                <button
                  onClick={createNewClassroom}
                  disabled={creatingClass || !newGrade.trim() || !newSection.trim()}
                  className="px-4 py-3 rounded-xl bg-[#028090] text-white hover:bg-[#028090]/90 transition
                    disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {creatingClass ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- Navigation buttons ---- */}
        <div className="flex gap-3 mt-6">
          {step > (user ? 2 : 1) && (
            <button
              onClick={prevStep}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200
                bg-white text-gray-600 text-sm font-semibold hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          <button
            onClick={nextStep}
            disabled={!canAdvance() || authLoading || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              bg-gradient-to-r from-[#028090] to-[#02C39A] text-white text-sm font-semibold
              hover:shadow-lg hover:shadow-[#028090]/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {(authLoading || submitting) && <Loader2 className="w-4 h-4 animate-spin" />}
            {step === TOTAL_STEPS ? 'Finalizar cadastro' : 'Proximo'}
            {step < TOTAL_STEPS && !authLoading && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
