import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Phone,
  Search,
  UserPlus,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface StudentResult {
  id: string
  name: string
  school: { name: string } | null
}

export default function ResponsavelCadastro() {
  const navigate = useNavigate()
  const { user, signUpWithEmail } = useAuth()

  const [step, setStep] = useState(user ? 2 : 1)
  const totalSteps = 4

  // Step 1
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  // Step 2
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Step 3
  const [verificationCode, setVerificationCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [codeError, setCodeError] = useState('')

  // Step 4
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentResult[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // Step 1: Auth
  const handleAuth = async () => {
    setAuthError('')
    setAuthLoading(true)
    try {
      const { error } = await signUpWithEmail(email, password)
      if (error && !error.includes('already registered')) {
        setAuthError(error)
        setAuthLoading(false)
        return
      }
      setStep(2)
    } catch {
      setAuthError('Erro ao criar conta. Tente novamente.')
    }
    setAuthLoading(false)
  }

  // Step 3: Phone verification
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

    console.log(`[Piramide do Bem] Codigo de verificacao: ${code}`)
    alert(`Codigo de verificacao enviado! (DEV: ${code})`)
    setCodeSent(true)
    setCodeError('')
  }

  const handleVerifyCode = () => {
    if (verificationCode === generatedCode) {
      setCodeVerified(true)
      setCodeError('')
    } else {
      setCodeError('Codigo incorreto. Tente novamente.')
    }
  }

  // Step 4: Search students
  const handleSearchStudents = async () => {
    if (studentQuery.trim().length < 2) return
    setSearchLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, school:schools(name)')
        .ilike('name', `%${studentQuery.trim()}%`)
        .limit(10)

      if (error) throw error
      setStudentResults((data as unknown as StudentResult[]) || [])
    } catch {
      setStudentResults([])
    }
    setSearchLoading(false)
  }

  // Submit
  const handleSubmit = async () => {
    if (!selectedStudent) return
    setSubmitting(true)
    setGlobalError('')

    try {
      const userId = user?.id
      if (!userId) {
        setGlobalError('Voce precisa estar autenticado.')
        setSubmitting(false)
        return
      }

      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .insert({
          user_id: userId,
          full_name: fullName,
          phone,
          email: user.email || email,
        })
        .select('id')
        .single()

      if (parentError) throw parentError

      const { error: linkError } = await supabase
        .from('parent_students')
        .insert({
          parent_id: parentData.id,
          student_id: selectedStudent.id,
          relationship: 'responsavel',
          consent_given: false,
        })

      if (linkError) throw linkError

      navigate('/responsavel/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cadastro.'
      setGlobalError(message)
    }
    setSubmitting(false)
  }

  const canAdvance = () => {
    switch (step) {
      case 1: return email.includes('@') && password.length >= 6
      case 2: return fullName.trim().length >= 2 && phone.trim().length >= 10
      case 3: return codeVerified
      case 4: return selectedStudent !== null
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
              <UserPlus className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Cadastro de Responsavel</h2>
              <p className="text-gray-400 text-sm mt-1">Crie sua conta para acompanhar seu filho(a)</p>
            </div>
            {user ? (
              <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#f0fdfa', border: '1px solid #02C39A' }}>
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: '#02C39A' }} />
                <p className="text-sm" style={{ color: '#1F4E79' }}>Voce ja esta autenticado como <strong>{user.email}</strong></p>
              </div>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none text-lg transition-colors"
                  style={{ borderColor: undefined }}
                  onFocus={(e) => (e.target.style.borderColor = '#028090')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  autoFocus
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha (min. 6 caracteres)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none text-lg transition-colors pr-12"
                    onFocus={(e) => (e.target.style.borderColor = '#028090')}
                    onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {authError && <p className="text-sm" style={{ color: '#dc2626' }}>{authError}</p>}
              </>
            )}
          </div>
        )}

        {/* Step 2: Personal info */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <UserPlus className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Seus dados</h2>
              <p className="text-gray-400 text-sm mt-1">Preencha seu nome completo e telefone</p>
            </div>
            <input
              type="text"
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none text-lg transition-colors"
              onFocus={(e) => (e.target.style.borderColor = '#028090')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
              autoFocus
            />
            <input
              type="tel"
              placeholder="Telefone (ex: 51999999999)"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none text-lg transition-colors"
              onFocus={(e) => (e.target.style.borderColor = '#028090')}
              onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
        )}

        {/* Step 3: Phone verification */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center">
              <Phone className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Verificar telefone</h2>
              <p className="text-gray-400 text-sm mt-1">Enviaremos um codigo para {phone}</p>
            </div>
            {!codeSent ? (
              <button
                onClick={handleSendCode}
                className="w-full py-3.5 rounded-xl font-bold text-white text-lg transition-all hover:opacity-90"
                style={{ backgroundColor: '#028090' }}
              >
                Enviar codigo
              </button>
            ) : !codeVerified ? (
              <>
                <input
                  type="text"
                  placeholder="Digite o codigo de 6 digitos"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none text-lg text-center tracking-widest transition-colors"
                  onFocus={(e) => (e.target.style.borderColor = '#028090')}
                  onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
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
                  Reenviar codigo
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

        {/* Step 4: Link student */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto" style={{ color: '#028090' }} />
              <h2 className="text-2xl font-extrabold mt-2" style={{ color: '#1F4E79' }}>Vincular aluno</h2>
              <p className="text-gray-400 text-sm mt-1">Busque o aluno pelo nome</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome do aluno"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:outline-none text-lg transition-colors"
                onFocus={(e) => (e.target.style.borderColor = '#028090')}
                onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchStudents()}
                autoFocus
              />
              <button
                onClick={handleSearchStudents}
                disabled={searchLoading || studentQuery.trim().length < 2}
                className="px-4 py-3.5 rounded-xl text-white font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: '#028090' }}
              >
                {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>

            {studentResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {studentResults.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="w-full text-left p-3 rounded-xl border-2 transition-all"
                    style={{
                      borderColor: selectedStudent?.id === s.id ? '#02C39A' : '#e5e7eb',
                      backgroundColor: selectedStudent?.id === s.id ? '#f0fdfa' : '#fff',
                    }}
                  >
                    <p className="font-semibold" style={{ color: '#1F4E79' }}>{s.name}</p>
                    <p className="text-sm text-gray-400">{s.school?.name || 'Escola nao informada'}</p>
                  </button>
                ))}
              </div>
            )}

            {selectedStudent && (
              <div className="p-3 rounded-xl flex items-center gap-3" style={{ backgroundColor: '#f0fdfa', border: '1px solid #02C39A' }}>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#02C39A' }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1F4E79' }}>{selectedStudent.name}</p>
                  <p className="text-xs text-gray-400">{selectedStudent.school?.name || ''}</p>
                </div>
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
            {step === totalSteps ? 'Concluir cadastro' : step === 1 && !user ? 'Criar conta' : 'Proximo'}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <p className="mt-4 text-gray-400 text-sm">Passo {step} de {totalSteps}</p>
    </div>
  )
}
