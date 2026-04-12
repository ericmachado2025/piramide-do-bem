import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getScoringRule } from '../lib/database'
import StudentSearch from '../components/StudentSearch'
import type { ActionType } from '../types'

export default function RegistrarAcao() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [qrToken, setQrToken] = useState(() => crypto.randomUUID())
  const [beneficiaryNames, setBeneficiaryNames] = useState<Record<string, string>>({})

  const [actionTypes, setActionTypes] = useState<ActionType[]>([])
  const [studentId, setStudentId] = useState<string | null>(null)
  const [mySchoolId, setMySchoolId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadData() {
      // Get current student
      const { data: me } = await supabase
        .from('students')
        .select('id, school_id')
        .eq('user_id', user!.id)
        .single()

      if (me) {
        setStudentId(me.id)
        setMySchoolId(me.school_id)
      }

      // Load action types with scoring_rule_key (only active)
      const { data: types } = await supabase
        .from('action_types')
        .select('*, scoring_rule_key')
        .eq('active', true)
        .order('display_order')
      if (types) setActionTypes(types as ActionType[])

      setLoading(false)
    }
    loadData()
  }, [user])

  const selectedActionType = actionTypes.find((a) => a.id === selectedAction)
  const isOtherAction = selectedActionType?.name?.toLowerCase().includes('outr') ?? false
  const allowsMultiple = true // allow selecting multiple beneficiaries

  async function saveAction() {
    if (!studentId || !selectedAction) return

    // Calculate points using scoring_rules with multiplier
    let finalPoints = selectedActionType?.points ?? 0
    const ruleKey = selectedActionType?.scoring_rule_key
    if (ruleKey) {
      const rule = await getScoringRule(ruleKey)
      if (rule) {
        finalPoints = Math.round(rule.points * (rule.multiplier ?? 1))
      }
    }

    const beneficiaries = selectedBeneficiaries.length > 0 ? selectedBeneficiaries : [null]
    for (const bId of beneficiaries) {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('actions').insert({
        author_id: studentId,
        beneficiary_id: bId,
        action_type_id: selectedAction,
        description: isOtherAction ? `${customTitle}: ${description}` : description || null,
        status: 'pending',
        qr_code_token: token,
        expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
        points_awarded: finalPoints,
      })
      if (error) console.error('Erro ao salvar ação:', error.message)
      else setQrToken(token)
    }
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
    if (step === 3 && isOtherAction) return customTitle.trim().length >= 3 && description.trim().length >= 10
    return true
  }

  function handleActionSelect(actionId: string) {
    setSelectedAction(actionId)
    setSelectedBeneficiaries([])
  }

  function toggleBeneficiary(id: string, name?: string) {
    if (name) setBeneficiaryNames(prev => ({ ...prev, [id]: name }))
    if (allowsMultiple) {
      setSelectedBeneficiaries((prev) =>
        prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
      )
    } else {
      setSelectedBeneficiaries([id])
    }
  }

  const stepLabels = ['Tipo', 'Quem', 'Detalhes', 'Pronto!']

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

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
              {step < 4 ? 'O que você fez? 🌟' : 'Acao Registrada!'}
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
            {actionTypes.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-gray-400 text-sm">Nenhum tipo de acao cadastrado ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {actionTypes.map((at) => (
                  <button
                    key={at.id}
                    onClick={() => {
                      handleActionSelect(at.id)
                      const isOutra = at.name?.toLowerCase().includes('outr') ?? false
                      if (!isOutra) {
                        setTimeout(() => setStep(2), 200)
                      }
                    }}
                    className={`relative bg-white rounded-2xl p-4 text-left transition-all duration-200 shadow-sm hover:shadow-md active:scale-95 ${
                      selectedAction === at.id
                        ? 'border-2 border-teal scale-[1.03] shadow-lg ring-2 ring-teal/20'
                        : 'border-2 border-transparent'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{at.icon ?? '\u{1F91D}'}</span>
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
            )}

            {/* Custom action fields shown inline when "outra" is selected */}
            {isOtherAction && selectedAction && (
              <div className="mt-5 space-y-3 animate-fade-in">
                <h3 className="font-semibold text-navy text-sm">Descreva sua boa acao personalizada:</h3>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value.slice(0, 50))}
                  placeholder="Titulo da acao (min 3 caracteres)"
                  className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
                />
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                    placeholder="Descreva o que voce fez (min 10 caracteres)..."
                    rows={4}
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal resize-none"
                  />
                  <span className={`absolute bottom-3 right-3 text-xs ${description.length >= 180 ? 'text-red' : 'text-gray-400'}`}>
                    {description.length}/200
                  </span>
                </div>
                <button
                  onClick={() => setStep(2)}
                  disabled={customTitle.trim().length < 3 || description.trim().length < 10}
                  className={`w-full py-3.5 rounded-xl font-bold text-white transition-all duration-200 active:scale-[0.98] ${
                    customTitle.trim().length >= 3 && description.trim().length >= 10
                      ? 'bg-teal shadow-md hover:shadow-lg hover:bg-teal/90'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Proximo {'\u2192'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <StudentSearch
            mySchoolId={mySchoolId}
            myStudentId={studentId}
            selected={selectedBeneficiaries}
            onToggle={toggleBeneficiary}
            multiple={true}
            label="Quem você ajudou?"
            sublabel="Selecione o(s) colega(s) que receberam a boa ação"
          />
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold text-navy mb-1">
              {isOtherAction ? 'Confirme sua boa acao' : 'Quer descrever o que aconteceu?'}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              {isOtherAction ? 'Revise os detalhes antes de registrar' : 'Opcional - conte mais sobre sua boa acao'}
            </p>

            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{selectedActionType?.icon ?? '\u{1F91D}'}</span>
                <div>
                  <p className="font-semibold text-navy text-sm">
                    {isOtherAction ? customTitle : selectedActionType?.name}
                  </p>
                  <p className="text-teal text-xs font-bold">+{selectedActionType?.points} pts</p>
                </div>
              </div>
              <p className="text-gray-500 text-xs">
                Beneficiado(s): {selectedBeneficiaries
                  .map((id) => beneficiaryNames[id])
                  .filter(Boolean)
                  .join(', ') || '---'}
              </p>
              {isOtherAction && (
                <p className="text-gray-600 text-xs mt-2 italic">{description}</p>
              )}
            </div>

            {!isOtherAction && (
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
            )}
          </div>
        )}

        {/* STEP 4 - Success */}
        {step === 4 && (
          <div className="text-center">
            <div className="text-5xl mb-3 float-anim">{'\u2705'}</div>
            <h2 className="text-2xl font-bold text-navy mb-2">Acao registrada!</h2>
            <p className="text-gray-500 text-sm mb-6">
              Mostre esse QR Code para um colega que viu o que você fez — ele confirma em segundos!
            </p>

            <div className="bg-white rounded-2xl shadow-lg p-6 inline-block mb-4">
              <QRCodeSVG
                value={`${window.location.origin}/validar?token=${qrToken}`}
                size={200}
                bgColor="#ffffff"
                fgColor="#1F4E79"
                level="M"
                includeMargin={false}
              />
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-3 flex items-center gap-2">
                <span className="text-lg">{'\u23F3'}</span>
                <div className="text-left">
                  <p className="font-bold text-navy text-sm">Aguardando confirmação</p>
                  <p className="text-gray-500 text-xs">{`Esse QR expira em 48h — corre lá falar com um colega! 😄`}</p>
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
        {step < 4 && !(step === 1 && isOtherAction) && step !== 1 && (
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
              {step === 3 ? 'Registrar Acao \u2705' : 'Proximo \u2192'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
