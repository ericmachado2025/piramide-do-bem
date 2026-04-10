import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Plus,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AuthStep from '../components/AuthStep'
import SchoolSelector, { type SchoolSelectorValue } from '../components/SchoolSelector'
import { usePhoneVerification } from '../hooks/usePhoneVerification'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_STEPS = 5

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

/** Maps schoolType values to the teacher-facing levels they include */
const SCHOOL_TYPE_TO_LEVELS: Record<string, string[]> = {
  fundamental: ['fundamental1', 'fundamental2'],
  medio: ['medio'],
  superior: ['superior'],
  infantil: ['infantil'],
  tecnico: ['tecnico'],
  eja: ['eja'],
}

const LEVEL_LABELS: Record<string, string> = {
  fundamental1: 'Fundamental 1',
  fundamental2: 'Fundamental 2',
  medio: 'Medio',
  superior: 'Superior',
  infantil: 'Infantil',
  tecnico: 'Tecnico',
  eja: 'EJA',
}

const GRADES_BY_LEVEL: Record<string, string[]> = {
  infantil: ['Pre I', 'Pre II'],
  fundamental1: ['1o ano', '2o ano', '3o ano', '4o ano', '5o ano'],
  fundamental2: ['6o ano', '7o ano', '8o ano', '9o ano'],
  medio: ['1o EM', '2o EM', '3o EM'],
  tecnico: ['1o Tecnico', '2o Tecnico', '3o Tecnico', '4o Tecnico'],
  eja: ['EJA Fundamental', 'EJA Medio'],
  superior: ['1o sem', '2o sem', '3o sem', '4o sem', '5o sem', '6o sem', '7o sem', '8o sem', '9o sem', '10o sem'],
}

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'N/A']

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Subject {
  id: string
  name: string
  level: string
  display_order: number
}

interface Classroom {
  id: string
  school_id: string
  grade: string
  section: string
}

interface SchoolEntry {
  school: SchoolSelectorValue
  level: string
  subjectIds: string[]
}

interface SchoolClassroomState {
  schoolId: string
  schoolName: string
  classrooms: Classroom[]
  selectedClassroomIds: string[]
  newGrade: string
  newSection: string
  creatingClass: boolean
}

interface FormState {
  nome: string
  phone: string
  phoneCountryCode: string
  cpf: string
  schoolEntries: SchoolEntry[]
  classroomStates: SchoolClassroomState[]
}

const STORAGE_KEY = 'professor_cadastro_backup'

function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProfessorCadastro() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const phoneVerification = usePhoneVerification()

  // Auth state
  const [authUserId, setAuthUserId] = useState('')
  const [authEmail, setAuthEmail] = useState('')

  // Step control
  const [step, setStep] = useState(1)

  // Form state
  const [form, setForm] = useState<FormState>(() => {
    try {
      const backup = sessionStorage.getItem(STORAGE_KEY)
      if (backup) return JSON.parse(backup) as FormState
    } catch { /* ignore */ }
    return {
      nome: '',
      phone: '',
      phoneCountryCode: '+55',
      cpf: '',
      schoolEntries: [{ school: { stateAbbr: '', cityId: '', cityName: '', schoolId: '', schoolName: '', schoolType: '' }, level: '', subjectIds: [] }],
      classroomStates: [],
    }
  })

  // Step 3 subjects per school entry
  const [subjectsByLevel, setSubjectsByLevel] = useState<Record<string, Subject[]>>({})

  // Step 5 email verification
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  const emailPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  /* ---------- sessionStorage backup ---------- */

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form))
    } catch { /* ignore */ }
  }, [form])

  /* ---------- popstate handler ---------- */

  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      e.preventDefault()
      if (step > 1) {
        setStep((s) => s - 1)
        window.history.pushState(null, '', window.location.href)
      }
    }
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [step])

  /* ---------- Email verification polling (step 5) ---------- */

  useEffect(() => {
    if (step !== 5) return
    // Check if already confirmed
    if (user?.email_confirmed_at) {
      setEmailConfirmed(true)
      return
    }
    emailPollRef.current = setInterval(async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user?.email_confirmed_at) {
        setEmailConfirmed(true)
        if (emailPollRef.current) clearInterval(emailPollRef.current)
      }
    }, 3000)
    return () => {
      if (emailPollRef.current) clearInterval(emailPollRef.current)
    }
  }, [step, user?.email_confirmed_at])

  /* ---------- Load subjects when level changes ---------- */

  const loadSubjects = useCallback(async (level: string) => {
    if (!level || subjectsByLevel[level]) return
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .eq('level', level)
      .order('display_order')
    if (data) {
      setSubjectsByLevel((prev) => ({ ...prev, [level]: data as Subject[] }))
    }
  }, [subjectsByLevel])

  /* ---------- Load classrooms for step 4 ---------- */

  const loadClassroomsForSchools = useCallback(async () => {
    const uniqueSchoolIds = [...new Set(form.schoolEntries.map((e) => e.school.schoolId).filter(Boolean))]
    const states: SchoolClassroomState[] = []
    for (const schoolId of uniqueSchoolIds) {
      const entry = form.schoolEntries.find((e) => e.school.schoolId === schoolId)
      const { data } = await supabase
        .from('classrooms')
        .select('*')
        .eq('school_id', schoolId)
        .order('grade')
      states.push({
        schoolId,
        schoolName: entry?.school.schoolName || '',
        classrooms: (data || []) as Classroom[],
        selectedClassroomIds: [],
        newGrade: '',
        newSection: '',
        creatingClass: false,
      })
    }
    setForm((prev) => ({ ...prev, classroomStates: states }))
  }, [form.schoolEntries])

  useEffect(() => {
    if (step === 4) {
      loadClassroomsForSchools()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  /* ---------- Helpers ---------- */

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function updateSchoolEntry(index: number, patch: Partial<SchoolEntry>) {
    setForm((prev) => {
      const entries = [...prev.schoolEntries]
      entries[index] = { ...entries[index], ...patch }
      return { ...prev, schoolEntries: entries }
    })
  }

  function addSchoolEntry() {
    setForm((prev) => ({
      ...prev,
      schoolEntries: [...prev.schoolEntries, { school: { stateAbbr: '', cityId: '', cityName: '', schoolId: '', schoolName: '', schoolType: '' }, level: '', subjectIds: [] }],
    }))
  }

  function removeSchoolEntry(index: number) {
    setForm((prev) => ({
      ...prev,
      schoolEntries: prev.schoolEntries.filter((_, i) => i !== index),
    }))
  }

  function getLevelsForSchoolType(schoolType: string): string[] {
    if (!schoolType) return []
    const types = schoolType.split(',').map((t) => t.trim())
    const levels: string[] = []
    for (const t of types) {
      const mapped = SCHOOL_TYPE_TO_LEVELS[t]
      if (mapped) levels.push(...mapped)
    }
    return [...new Set(levels)]
  }

  function updateClassroomState(schoolId: string, patch: Partial<SchoolClassroomState>) {
    setForm((prev) => ({
      ...prev,
      classroomStates: prev.classroomStates.map((cs) =>
        cs.schoolId === schoolId ? { ...cs, ...patch } : cs
      ),
    }))
  }

  function toggleClassroom(schoolId: string, classroomId: string) {
    setForm((prev) => ({
      ...prev,
      classroomStates: prev.classroomStates.map((cs) => {
        if (cs.schoolId !== schoolId) return cs
        const selected = cs.selectedClassroomIds.includes(classroomId)
          ? cs.selectedClassroomIds.filter((id) => id !== classroomId)
          : [...cs.selectedClassroomIds, classroomId]
        return { ...cs, selectedClassroomIds: selected }
      }),
    }))
  }

  const createNewClassroom = useCallback(async (schoolId: string) => {
    const cs = form.classroomStates.find((c) => c.schoolId === schoolId)
    if (!cs || !cs.newGrade || !cs.newSection) return
    updateClassroomState(schoolId, { creatingClass: true })
    const { data, error } = await supabase
      .from('classrooms')
      .insert({ school_id: schoolId, grade: cs.newGrade, section: cs.newSection })
      .select()
      .single()
    if (!error && data) {
      setForm((prev) => ({
        ...prev,
        classroomStates: prev.classroomStates.map((c) =>
          c.schoolId === schoolId
            ? {
                ...c,
                classrooms: [...c.classrooms, data as Classroom],
                selectedClassroomIds: [...c.selectedClassroomIds, (data as Classroom).id],
                newGrade: '',
                newSection: '',
                creatingClass: false,
              }
            : c
        ),
      }))
    } else {
      updateClassroomState(schoolId, { creatingClass: false })
    }
  }, [form.classroomStates])

  /* ---------- Submit ---------- */

  const handleSubmit = useCallback(async () => {
    if (!authUserId) return
    setSubmitting(true)
    setGlobalError('')

    try {
      // 1. Insert into users table
      const { data: userData, error: userErr } = await supabase
        .from('users')
        .insert({
          auth_id: authUserId,
          name: form.nome,
          email: authEmail,
          phone: `${form.phoneCountryCode}${form.phone.replace(/\D/g, '')}`,
          cpf: form.cpf.replace(/\D/g, '') || null,
        })
        .select()
        .single()

      if (userErr || !userData) {
        setGlobalError(userErr?.message || 'Erro ao criar registro de usuario.')
        setSubmitting(false)
        return
      }

      // 2. Insert into teachers table
      const { data: teacher, error: teacherErr } = await supabase
        .from('teachers')
        .insert({
          user_id: authUserId,
          users_id: userData.id,
        })
        .select()
        .single()

      if (teacherErr || !teacher) {
        setGlobalError(teacherErr?.message || 'Erro ao criar registro de professor.')
        setSubmitting(false)
        return
      }

      // 3. Insert teacher_assignments for each school/level/subject + classroom combos
      const assignments: Array<{
        teacher_id: string
        classroom_id: string
        subject_id: string
        school_id: string
      }> = []

      for (const entry of form.schoolEntries) {
        if (!entry.school.schoolId || !entry.level || entry.subjectIds.length === 0) continue
        const cs = form.classroomStates.find((c) => c.schoolId === entry.school.schoolId)
        const classroomIds = cs?.selectedClassroomIds || []
        for (const classroomId of classroomIds) {
          for (const subjectId of entry.subjectIds) {
            assignments.push({
              teacher_id: teacher.id,
              classroom_id: classroomId,
              subject_id: subjectId,
              school_id: entry.school.schoolId,
            })
          }
        }
      }

      if (assignments.length > 0) {
        await supabase.from('teacher_assignments').insert(assignments)
      }

      // Clear sessionStorage
      sessionStorage.removeItem(STORAGE_KEY)
      setSubmitting(false)
      navigate('/professor/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cadastro.'
      setGlobalError(message)
      setSubmitting(false)
    }
  }, [authUserId, authEmail, form, navigate])

  /* ---------- Step validation ---------- */

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return true // AuthStep handles its own validation
      case 2:
        return form.nome.trim().length > 2 && form.phone.replace(/\D/g, '').length >= 10 && form.cpf.replace(/\D/g, '').length === 11
      case 3:
        return form.schoolEntries.every(
          (e) => e.school.schoolId && e.level && e.subjectIds.length > 0
        )
      case 4:
        return form.classroomStates.some((cs) => cs.selectedClassroomIds.length > 0)
      case 5:
        return emailConfirmed && phoneVerification.status === 'verified'
      default:
        return false
    }
  }

  function nextStep() {
    if (step === TOTAL_STEPS) {
      handleSubmit()
      return
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1))
  }

  /* ---------- Render helpers ---------- */

  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg transition-colors'

  const labelClass = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5'

  /* ---------- Render ---------- */

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 px-4 pb-8" style={{ backgroundColor: '#f0fdfa' }}>
      {/* Step indicator dots */}
      <div className="flex items-center gap-0 mb-8 max-w-xs w-full justify-center">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
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
            {s < TOTAL_STEPS && (
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

        {/* ---- Step 1: Account (AuthStep) ---- */}
        {step === 1 && (
          <AuthStep
            title="Cadastro do Professor"
            subtitle="Crie sua conta para continuar"
            showGoogle={false}
            onAuth={(userId, email) => {
              setAuthUserId(userId)
              setAuthEmail(email)
              setStep(2)
            }}
            onAlreadyLoggedIn={(userId, email) => {
              setAuthUserId(userId)
              setAuthEmail(email)
              setStep(2)
            }}
          />
        )}

        {/* ---- Step 2: Personal Data ---- */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Dados pessoais</h2>
              <p className="text-gray-400 text-sm mt-1">Suas informações de contato</p>
            </div>

            <div>
              <label className={labelClass}>Nome completo</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Maria da Silva"
                value={form.nome}
                onChange={(e) => updateForm('nome', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canAdvance() && nextStep()}
                autoFocus
              />
            </div>

            <div>
              <label className={labelClass}>Telefone</label>
              <div className="flex gap-2">
                <select
                  className={`${inputClass} w-40 flex-shrink-0`}
                  value={form.phoneCountryCode}
                  onChange={(e) => updateForm('phoneCountryCode', e.target.value)}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  className={inputClass}
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => updateForm('phone', formatPhone(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && canAdvance() && nextStep()}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>CPF</label>
              <input
                type="text"
                className={inputClass}
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => updateForm('cpf', formatCPF(e.target.value))}
                onKeyDown={(e) => e.key === 'Enter' && canAdvance() && nextStep()}
                maxLength={14}
              />
            </div>
          </div>
        )}

        {/* ---- Step 3: School + Level + Subjects ---- */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Escola e Matérias</h2>
              <p className="text-gray-400 text-sm mt-1">Selecione onde e o que você leciona</p>
            </div>

            {form.schoolEntries.map((entry, idx) => (
              <div key={idx} className="space-y-4 border-2 border-gray-100 rounded-xl p-4">
                {form.schoolEntries.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: '#1F4E79' }}>Escola {idx + 1}</span>
                    <button
                      onClick={() => removeSchoolEntry(idx)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold"
                    >
                      Remover
                    </button>
                  </div>
                )}

                {/* SchoolSelector */}
                <SchoolSelector
                  value={entry.school}
                  onChange={(val: SchoolSelectorValue) => {
                    updateSchoolEntry(idx, { school: val, level: '', subjectIds: [] })
                  }}
                />

                {/* Level selection - only show levels the school offers */}
                {entry.school.schoolId && (() => {
                  const availableLevels = getLevelsForSchoolType(entry.school.schoolType)
                  if (availableLevels.length === 0) return null
                  return (
                    <div>
                      <label className={labelClass}>Nível de ensino</label>
                      <div className="space-y-2">
                        {availableLevels.map((lvl) => (
                          <label
                            key={lvl}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                              entry.level === lvl
                                ? 'border-[#028090] bg-[#028090]/5'
                                : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`nivel-${idx}`}
                              value={lvl}
                              checked={entry.level === lvl}
                              onChange={() => {
                                updateSchoolEntry(idx, { level: lvl, subjectIds: [] })
                                loadSubjects(lvl)
                              }}
                              className="accent-[#028090]"
                            />
                            <span className="text-sm text-gray-700 font-medium">
                              {LEVEL_LABELS[lvl] || lvl}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Subjects checkboxes */}
                {entry.level && (() => {
                  const subjects = subjectsByLevel[entry.level] || []
                  return (
                    <div>
                      <label className={labelClass}>Matérias</label>
                      {subjects.length === 0 ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 italic py-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Carregando matérias...
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {subjects.map((sub) => (
                            <label
                              key={sub.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                                entry.subjectIds.includes(sub.id)
                                  ? 'border-[#028090] bg-[#028090]/5'
                                  : 'border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={entry.subjectIds.includes(sub.id)}
                                onChange={(e) => {
                                  const newIds = e.target.checked
                                    ? [...entry.subjectIds, sub.id]
                                    : entry.subjectIds.filter((id) => id !== sub.id)
                                  updateSchoolEntry(idx, { subjectIds: newIds })
                                }}
                                className="accent-[#028090]"
                              />
                              <span className="text-sm text-gray-700 font-medium">{sub.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            ))}

            <button
              onClick={addSchoolEntry}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-[#028090]/40 text-[#028090] text-sm font-semibold hover:bg-[#028090]/5 transition"
            >
              <Plus className="w-4 h-4" />
              Adicionar outra escola
            </button>
          </div>
        )}

        {/* ---- Step 4: Classrooms ---- */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Turmas</h2>
              <p className="text-gray-400 text-sm mt-1">Selecione as turmas que voce leciona</p>
            </div>

            {form.classroomStates.map((cs) => {
              const entry = form.schoolEntries.find((e) => e.school.schoolId === cs.schoolId)
              const availableGrades = entry?.level ? (GRADES_BY_LEVEL[entry.level] || []) : []
              return (
                <div key={cs.schoolId} className="space-y-3 border-2 border-gray-100 rounded-xl p-4">
                  <h3 className="text-sm font-bold" style={{ color: '#1F4E79' }}>{cs.schoolName}</h3>

                  {cs.classrooms.length === 0 && (
                    <p className="text-sm text-gray-400 italic">Nenhuma turma cadastrada para esta escola.</p>
                  )}

                  <div className="space-y-2">
                    {cs.classrooms.map((c) => (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                          cs.selectedClassroomIds.includes(c.id)
                            ? 'border-[#028090] bg-[#028090]/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={cs.selectedClassroomIds.includes(c.id)}
                          onChange={() => toggleClassroom(cs.schoolId, c.id)}
                          className="accent-[#028090]"
                        />
                        <span className="text-sm text-gray-700 font-medium">
                          {c.grade} - Turma {c.section}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Create new classroom */}
                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Nova turma
                    </p>
                    <div className="flex gap-2">
                      <select
                        className={`${inputClass} flex-1 text-sm`}
                        value={cs.newGrade}
                        onChange={(e) => updateClassroomState(cs.schoolId, { newGrade: e.target.value })}
                      >
                        <option value="">Série...</option>
                        {availableGrades.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                      <select
                        className={`${inputClass} w-24 text-sm`}
                        value={cs.newSection}
                        onChange={(e) => updateClassroomState(cs.schoolId, { newSection: e.target.value })}
                      >
                        <option value="">Turma</option>
                        {SECTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => createNewClassroom(cs.schoolId)}
                        disabled={cs.creatingClass || !cs.newGrade || !cs.newSection}
                        className="px-4 py-3 rounded-xl bg-[#028090] text-white hover:bg-[#028090]/90 transition
                          disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {cs.creatingClass ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ---- Step 5: Verification ---- */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Verificacao</h2>
              <p className="text-gray-400 text-sm mt-1">Confirme seu email e telefone</p>
            </div>

            {/* Email verification */}
            <div className={`rounded-xl border-2 p-4 ${emailConfirmed ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className={`w-5 h-5 ${emailConfirmed ? 'text-green-500' : 'text-blue-500'}`} />
                <span className={`text-sm font-semibold ${emailConfirmed ? 'text-green-700' : 'text-blue-700'}`}>Email</span>
              </div>
              {emailConfirmed ? (
                <p className="text-sm text-green-600 font-medium">Email verificado com sucesso!</p>
              ) : (
                <p className="text-sm text-blue-600">
                  Verificacao enviada para {authEmail}. Confira sua caixa de entrada.
                </p>
              )}
            </div>

            {/* Phone verification */}
            <div className={`rounded-xl border-2 p-4 space-y-3 ${
              phoneVerification.status === 'verified'
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className={`w-5 h-5 ${
                  phoneVerification.status === 'verified' ? 'text-green-500' : 'text-gray-400'
                }`} />
                <span className="text-sm font-semibold text-gray-700">Telefone</span>
              </div>

              {phoneVerification.status === 'idle' && (
                <button
                  onClick={() => {
                    const fullPhone = `${form.phoneCountryCode}${form.phone.replace(/\D/g, '')}`
                    phoneVerification.sendCode(fullPhone, 'whatsapp')
                  }}
                  className="w-full py-3 rounded-xl bg-[#028090] text-white text-sm font-semibold hover:bg-[#028090]/90 transition"
                >
                  Enviar codigo no WhatsApp
                </button>
              )}

              {phoneVerification.status === 'sending' && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <Loader2 className="w-5 h-5 text-[#028090] animate-spin" />
                  <span className="text-sm text-gray-500">Enviando codigo...</span>
                </div>
              )}

              {(phoneVerification.status === 'sent' || phoneVerification.status === 'error') && (
                <PhoneCodeInput
                  onVerify={(code) => phoneVerification.verifyCode(code)}
                  error={phoneVerification.error}
                  onResendWhatsApp={() => {
                    const fullPhone = `${form.phoneCountryCode}${form.phone.replace(/\D/g, '')}`
                    phoneVerification.sendCode(fullPhone, 'whatsapp')
                  }}
                  onResendSMS={() => {
                    const fullPhone = `${form.phoneCountryCode}${form.phone.replace(/\D/g, '')}`
                    phoneVerification.sendCode(fullPhone, 'sms')
                  }}
                />
              )}

              {phoneVerification.status === 'verified' && (
                <p className="text-sm text-green-600 font-medium">Telefone verificado com sucesso!</p>
              )}
            </div>
          </div>
        )}

        {/* Global error */}
        {globalError && (
          <div className="mt-4 p-3 rounded-xl text-sm text-center" style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {globalError}
          </div>
        )}

        {/* Navigation buttons */}
        {step > 1 && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={prevStep}
              className="flex items-center justify-center gap-1 px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Voltar
            </button>
            <button
              onClick={nextStep}
              disabled={!canAdvance() || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-lg text-white transition-all disabled:opacity-50"
              style={{
                backgroundColor: canAdvance() && !submitting ? '#028090' : '#e5e7eb',
                color: canAdvance() && !submitting ? '#fff' : '#9ca3af',
              }}
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {step === TOTAL_STEPS
                ? (emailConfirmed && phoneVerification.status === 'verified' ? 'Concluir' : 'Aguardando verificacao...')
                : 'Proximo'}
              {step < TOTAL_STEPS && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-gray-400 text-sm">Passo {step} de {TOTAL_STEPS}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PhoneCodeInput (inline sub-component)                              */
/* ------------------------------------------------------------------ */

function PhoneCodeInput({
  onVerify,
  error,
  onResendWhatsApp,
  onResendSMS,
}: {
  onVerify: (code: string) => boolean
  error: string
  onResendWhatsApp: () => void
  onResendSMS: () => void
}) {
  const [code, setCode] = useState('')
  const inputClass =
    'w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-[#028090] focus:outline-none text-lg text-center tracking-widest transition-colors'

  const handleSubmit = () => {
    if (code.length === 6) {
      onVerify(code)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Digite o codigo de 6 digitos enviado para seu telefone
      </p>
      <input
        type="text"
        className={inputClass}
        placeholder="000000"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSubmit()
          }
        }}
        autoFocus
      />
      {error && <p className="text-sm text-center" style={{ color: '#dc2626' }}>{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={code.length !== 6}
        className="w-full py-3 rounded-xl bg-[#028090] text-white text-sm font-semibold hover:bg-[#028090]/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Verificar
      </button>
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={onResendWhatsApp}
          className="underline"
          style={{ color: '#028090' }}
        >
          Reenviar no WhatsApp
        </button>
        <button
          onClick={onResendSMS}
          className="underline text-gray-400 hover:text-gray-600"
        >
          Nao tem WhatsApp? Receber por SMS
        </button>
      </div>
    </div>
  )
}
