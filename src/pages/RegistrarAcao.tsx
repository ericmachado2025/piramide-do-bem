import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { actionTypes } from '../data/actions'
import { useLocalUser } from '../hooks/useLocalUser'
import type { Action } from '../types'

const CLASSMATES = [
  { id: 's1', name: 'Maria Silva', tribe: '🦁', role: 'student' as const },
  { id: 's2', name: 'João Pedro', tribe: '🐉', role: 'student' as const },
  { id: 's3', name: 'Ana Luísa', tribe: '🦅', role: 'student' as const },
  { id: 's4', name: 'Pedro Rocha', tribe: '🦁', role: 'student' as const },
  { id: 's5', name: 'Luísa Mendes', tribe: '🐉', role: 'student' as const },
  { id: 's6', name: 'Carlos Eduardo', tribe: '🦅', role: 'student' as const },
  { id: 's7', name: 'Beatriz Santos', tribe: '🦁', role: 'student' as const },
  { id: 's8', name: 'Lucas Oliveira', tribe: '🐉', role: 'student' as const },
  { id: 's9', name: 'Gabriela Costa', tribe: '🦅', role: 'student' as const },
  { id: 's10', name: 'Rafael Almeida', tribe: '🦁', role: 'student' as const },
]

// A12: Separate teacher list for "Ajudei professor" action
const TEACHERS = [
  { id: 't1', name: 'Prof. Ana Rodrigues', tribe: '📋', role: 'teacher' as const },
  { id: 't2', name: 'Prof. Carlos Mendes', tribe: '📋', role: 'teacher' as const },
  { id: 't3', name: 'Prof. Fernanda Lima', tribe: '📋', role: 'teacher' as const },
  { id: 't4', name: 'Prof. Roberto Santos', tribe: '📋', role: 'teacher' as const },
  { id: 't5', name: 'Prof. Patricia Costa', tribe: '📋', role: 'teacher' as const },
]

// (allows_multiple now comes from actionTypes data)

export default function RegistrarAcao() {
  const navigate = useNavigate()
  useLocalUser()
  const [step, setStep] = useState(1)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [qrToken] = useState(() => `piramidebem://validar/${Date.now()}`)

  const selectedActionType = actionTypes.find((a) => a.id === selectedAction)

  // A12: Show teachers for "Ajudei professor" action, students otherwise
  const isTeacherAction = selectedAction === 'act-6'
  const isOtherAction = selectedAction === 'act-other'
  const allowsMultiple = selectedActionType?.allows_multiple ?? false

  const availablePeople = useMemo(() => {
    const list = isTeacherAction ? TEACHERS : CLASSMATES
    return list.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery, isTeacherAction])

  function saveAction() {
    const stored = localStorage.getItem('piramide-actions')
    const actions: Action[] = stored ? JSON.parse(stored) : []

    const newAction: Action = {
      id: `action-${Date.now()}`,
      author_id: 'current-user',
      beneficiary_id: selectedBeneficiaries.join(','),
      action_type_id: selectedAction ?? '',
      description,
      status: 'pending',
      validator_id: '',
      beneficiary_confirmed: false,
      qr_code_token: qrToken,
      expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
      validated_at: '',
      points_awarded: selectedActionType?.points ?? 0,
      created_at: new Date().toISOString(),
    }

    actions.push(newAction)
    localStorage.setItem('piramide-actions', JSON.stringify(actions))
  }

  function handleNext() {
    if (step === 3) {
      saveAction()
      setStep(4)
    } else {
      setStep(step + 1)
    }
  }

  function canProceed() {
    if (step === 1) return selectedAction !== null
    if (step === 2) return selectedBeneficiaries.length > 0
    if (step === 3 && isOtherAction) return customTitle.trim().length >= 3 && description.trim().length >= 5
    return true
  }

  // A19: Auto-advance when action is selected (skip "Proximo" click)
  function handleActionSelect(actionId: string) {
    setSelectedAction(actionId)
    // Reset beneficiaries when action type changes (teacher vs student)
    setSelectedBeneficiaries([])
  }

  function toggleBeneficiary(id: string) {
    if (allowsMultiple) {
      setSelectedBeneficiaries((prev) =>
        prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
      )
    } else {
      setSelectedBeneficiaries([id])
    }
  }

  const stepLabels = ['Tipo', 'Quem', 'Detalhes', 'Pronto!']

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            {step < 4 ? (
              <button
                onClick={() => (step === 1 ? navigate('/home') : setStep(step - 1))}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft size={22} className="text-navy" />
              </button>
            ) : null}
            <h1 className="font-bold text-navy text-lg">
              {step < 4 ? 'Registrar Boa Acao' : 'Acao Registrada!'}
            </h1>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    s === step
                      ? 'bg-teal text-white scale-110 shadow-md'
                      : s < step
                      ? 'bg-green text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {s < step ? <Check size={16} /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-1 rounded-full transition-colors duration-300 ${
                      s < step ? 'bg-green' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 px-1">
            {stepLabels.map((l, i) => (
              <span key={l} className={`text-[10px] ${i + 1 <= step ? 'text-teal font-semibold' : 'text-gray-400'}`}>
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6">
        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">Que boa acao voce fez hoje?</h2>
            <p className="text-gray-500 text-sm mb-5">Escolha o tipo da sua boa acao</p>
            <div className="grid grid-cols-2 gap-3">
              {actionTypes.map((at) => (
                <button
                  key={at.id}
                  onClick={() => {
                    handleActionSelect(at.id)
                    // A19: Auto-advance to step 2 on click
                    setTimeout(() => setStep(2), 200)
                  }}
                  className={`relative bg-white rounded-2xl p-4 text-left transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 ${
                    selectedAction === at.id
                      ? 'border-2 border-teal scale-[1.03] shadow-lg ring-2 ring-teal/20'
                      : 'border-2 border-transparent'
                  }`}
                >
                  <span className="text-3xl block mb-2">{at.icon}</span>
                  <p className="font-semibold text-navy text-sm leading-tight">{at.name}</p>
                  <span className="inline-block mt-2 bg-teal text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    +{at.points} pts
                  </span>
                  {selectedAction === at.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-teal rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">
              {isTeacherAction ? 'Qual professor voce ajudou?' : 'Quem voce ajudou?'}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              {allowsMultiple
                ? 'Selecione um ou mais colegas'
                : isTeacherAction
                  ? 'Selecione o professor'
                  : 'Selecione o colega que recebeu a boa acao'}
            </p>

            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isTeacherAction ? 'Buscar professor...' : 'Buscar colega...'}
                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all"
              />
            </div>

            {allowsMultiple && selectedBeneficiaries.length > 0 && (
              <p className="text-teal text-xs font-semibold mb-2">
                {selectedBeneficiaries.length} selecionado(s)
              </p>
            )}

            <div className="space-y-2">
              {availablePeople.map((c) => {
                const isSelected = selectedBeneficiaries.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleBeneficiary(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 active:scale-[0.98] ${
                      isSelected
                        ? 'bg-teal/10 border-2 border-teal'
                        : 'bg-white border-2 border-transparent shadow-sm hover:shadow-md'
                    }`}
                  >
                    <span className="text-2xl">{c.tribe}</span>
                    <span className="font-medium text-navy text-sm">{c.name}</span>
                    {isSelected && (
                      <Check size={18} className="ml-auto text-teal" />
                    )}
                  </button>
                )
              })}
              {availablePeople.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">Nenhum resultado encontrado</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">
              {isOtherAction ? 'Descreva sua boa acao' : 'Quer descrever o que aconteceu?'}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              {isOtherAction ? 'De um titulo e descreva (obrigatorio)' : 'Opcional - conte mais sobre sua boa acao'}
            </p>

            {isOtherAction && (
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value.slice(0, 50))}
                placeholder="Titulo da acao (max 50 caracteres)"
                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal mb-3"
              />
            )}

            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{selectedActionType?.icon}</span>
                <div>
                  <p className="font-semibold text-navy text-sm">{selectedActionType?.name}</p>
                  <p className="text-teal text-xs font-bold">+{selectedActionType?.points} pts</p>
                </div>
              </div>
              <p className="text-gray-500 text-xs">
                Beneficiado(s): {selectedBeneficiaries
                  .map((id) => [...CLASSMATES, ...TEACHERS].find((c) => c.id === id)?.name)
                  .filter(Boolean)
                  .join(', ') || '---'}
              </p>
            </div>

            <div className="relative">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                placeholder="Ex: Ajudei a Maria a entender a materia de matematica durante o intervalo..."
                rows={5}
                className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all resize-none"
              />
              <span className={`absolute bottom-3 right-3 text-xs ${description.length >= 180 ? 'text-red' : 'text-gray-400'}`}>
                {description.length}/200
              </span>
            </div>
          </div>
        )}

        {/* STEP 4 - Success */}
        {step === 4 && (
          <div className="text-center">
            <div className="text-5xl mb-3 float-anim">✅</div>
            <h2 className="text-2xl font-bold text-navy mb-2">Acao registrada!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Agora peca para um colega escanear o QR Code abaixo para validar sua acao.
            </p>

            <div className="bg-white rounded-2xl shadow-lg p-6 inline-block mb-4">
              <QRCodeSVG
                value={qrToken}
                size={200}
                bgColor="#ffffff"
                fgColor="#1F4E79"
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-3 flex items-center gap-2">
                <span className="text-lg">⏳</span>
                <div className="text-left">
                  <p className="font-bold text-navy text-sm">PENDENTE</p>
                  <p className="text-gray-500 text-xs">Este QR Code expira em 48 horas</p>
                </div>
              </div>

              <div className="bg-teal/5 border border-teal/20 rounded-xl p-3">
                <p className="text-sm text-navy">
                  <strong>Como validar:</strong> peca para qualquer colega abrir o app e escanear este QR Code, ou validar na aba "Validar".
                </p>
              </div>
            </div>

            <Link
              to="/home"
              className="inline-block w-full bg-teal text-white font-bold py-3.5 px-6 rounded-xl hover:bg-teal/90 transition-colors active:scale-[0.98]"
            >
              Voltar para Home
            </Link>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 4 && (
          <div className="mt-8">
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 active:scale-[0.98] ${
                canProceed()
                  ? 'bg-teal shadow-md hover:shadow-lg hover:bg-teal/90'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {step === 3 ? 'Registrar Acao ✅' : 'Proximo →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
