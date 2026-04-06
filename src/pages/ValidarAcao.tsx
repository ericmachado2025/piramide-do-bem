import { useState } from 'react'
import { ArrowLeft, ScanLine, CheckCircle2, XCircle, Clock, User, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLocalUser } from '../hooks/useLocalUser'
import BottomNav from '../components/BottomNav'
import ConfettiEffect from '../components/ConfettiEffect'
import { QRCodeSVG } from 'qrcode.react'
import type { Action } from '../types'
import { actionTypes } from '../data/actions'

type Tab = 'validar' | 'minhas'

interface PendingItem {
  id: string
  authorName: string
  actionTypeName: string
  actionIcon: string
  beneficiaryName: string
  points: number
  createdAt: string
  fromStorage: boolean
}

interface MyPendingAction {
  id: string
  actionTypeName: string
  actionIcon: string
  beneficiaryName: string
  points: number
  validatorConfirmed: boolean
  beneficiaryConfirmed: boolean
  createdAt: string
  expiresAt: string
  qrToken: string
}

function getPendingToValidate(): PendingItem[] {
  const stored = localStorage.getItem('piramide-actions')
  const actions: Action[] = stored ? JSON.parse(stored) : []
  const validatedIds = new Set(
    actions.filter((a) => a.status === 'validated' || a.status === 'denied').map((a) => a.id)
  )

  const simulated: PendingItem[] = [
    { id: 'sim-1', authorName: 'Maria Silva', actionTypeName: 'Ajudei colega no dever', actionIcon: '📚', beneficiaryName: 'Ana Luisa', points: 10, createdAt: new Date(Date.now() - 1800000).toISOString(), fromStorage: false },
    { id: 'sim-2', authorName: 'Pedro Rocha', actionTypeName: 'Mediei conflito', actionIcon: '⚖️', beneficiaryName: 'Joao Pedro', points: 25, createdAt: new Date(Date.now() - 5400000).toISOString(), fromStorage: false },
    { id: 'sim-3', authorName: 'Lucas Oliveira', actionTypeName: 'Organizei grupo de estudo', actionIcon: '📖', beneficiaryName: 'Varios', points: 25, createdAt: new Date(Date.now() - 10800000).toISOString(), fromStorage: false },
  ]

  return simulated.filter((s) => !validatedIds.has(s.id))
}

function getMyPendingActions(): MyPendingAction[] {
  const stored = localStorage.getItem('piramide-actions')
  const actions: Action[] = stored ? JSON.parse(stored) : []

  return actions
    .filter((a) => a.status === 'pending')
    .map((a) => {
      const at = actionTypes.find((t) => t.id === a.action_type_id)
      const hoursLeft = Math.max(0, Math.round((new Date(a.expires_at).getTime() - Date.now()) / 3600000))
      return {
        id: a.id,
        actionTypeName: at?.name ?? 'Boa acao',
        actionIcon: at?.icon ?? '🤝',
        beneficiaryName: 'Colega',
        points: a.points_awarded,
        validatorConfirmed: false,
        beneficiaryConfirmed: false,
        createdAt: a.created_at,
        expiresAt: a.expires_at,
        qrToken: a.qr_code_token,
        hoursLeft,
      }
    })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function ValidarAcao() {
  const navigate = useNavigate()
  const { user, setUser } = useLocalUser()
  const [tab, setTab] = useState<Tab>('validar')
  const [pendingActions, setPendingActions] = useState(getPendingToValidate)
  const [myActions] = useState(getMyPendingActions)
  const [selectedAction, setSelectedAction] = useState<PendingItem | null>(null)
  const [showResult, setShowResult] = useState<'confirmed' | 'denied' | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showQr, setShowQr] = useState<string | null>(null)

  function handleScan() {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      if (pendingActions.length > 0) setSelectedAction(pendingActions[0])
    }, 1500)
  }

  function handleConfirm() {
    if (!selectedAction) return
    if (selectedAction.fromStorage) {
      const stored = localStorage.getItem('piramide-actions')
      const actions: Action[] = stored ? JSON.parse(stored) : []
      const updated = actions.map((a) =>
        a.id === selectedAction.id ? { ...a, status: 'validated' as const, validated_at: new Date().toISOString() } : a
      )
      localStorage.setItem('piramide-actions', JSON.stringify(updated))
    }
    if (user) {
      setUser((prev) => ({ ...prev, totalPoints: prev.totalPoints + 3, availablePoints: prev.availablePoints + 3 }))
    }
    setPendingActions((prev) => prev.filter((a) => a.id !== selectedAction.id))
    setShowConfetti(true)
    setShowResult('confirmed')
  }

  function handleDeny() {
    if (selectedAction) setPendingActions((prev) => prev.filter((a) => a.id !== selectedAction.id))
    setShowResult('denied')
  }

  function handleReset() {
    setSelectedAction(null)
    setShowResult(null)
    setShowConfetti(false)
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <ConfettiEffect show={showConfetti} />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/home')} className="p-1 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} className="text-navy" />
            </button>
            <h1 className="font-bold text-navy text-lg">Validar Acoes</h1>
          </div>

          {/* C9: Two tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => { setTab('validar'); handleReset() }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'validar' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'
              }`}
            >
              Para eu validar ({pendingActions.length})
            </button>
            <button
              onClick={() => { setTab('minhas'); handleReset() }}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'minhas' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'
              }`}
            >
              Minhas aguardando ({myActions.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* ===== TAB: Validate Others ===== */}
        {tab === 'validar' && (
          <>
            {showResult === 'confirmed' && selectedAction && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4 float-anim">🎉</div>
                <h2 className="text-2xl font-bold text-navy mb-3">Acao validada!</h2>
                <div className="bg-green/10 border border-green/30 rounded-2xl p-4 mb-4">
                  <p className="text-green font-semibold">{selectedAction.authorName} ganhou {selectedAction.points} pts!</p>
                  <p className="text-green/80 text-sm mt-1">Voce ganhou <strong>+3 pts</strong> por validar!</p>
                </div>
                <button onClick={handleReset} className="w-full bg-teal text-white font-bold py-3.5 rounded-xl">
                  Validar outra acao
                </button>
              </div>
            )}

            {showResult === 'denied' && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">😌</div>
                <h2 className="text-xl font-bold text-navy mb-2">Tudo bem.</h2>
                <p className="text-gray-500 text-sm mb-6">A acao aguardara outro colega.</p>
                <button onClick={handleReset} className="w-full bg-teal text-white font-bold py-3.5 rounded-xl">Voltar</button>
              </div>
            )}

            {!showResult && selectedAction && (
              <div>
                <h2 className="text-lg font-bold text-navy mb-4">Confirmar esta acao?</h2>
                <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{selectedAction.actionIcon}</span>
                    <div>
                      <p className="font-bold text-navy">{selectedAction.actionTypeName}</p>
                      <p className="text-teal text-sm font-semibold">+{selectedAction.points} pts</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Por:</span><span className="font-medium text-navy">{selectedAction.authorName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Beneficiado:</span><span className="font-medium text-navy">{selectedAction.beneficiaryName}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Quando:</span><span className="font-medium text-navy">{timeAgo(selectedAction.createdAt)} atras</span></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <button onClick={handleConfirm} className="w-full flex items-center justify-center gap-2 bg-green text-white font-bold py-4 rounded-xl shadow-md active:scale-[0.98]">
                    <CheckCircle2 size={22} /> Sim, confirmo!
                  </button>
                  <button onClick={handleDeny} className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-600 font-medium py-3 rounded-xl active:scale-[0.98]">
                    <XCircle size={18} /> Nao posso confirmar
                  </button>
                </div>
              </div>
            )}

            {!showResult && !selectedAction && (
              <>
                {/* Scanner */}
                <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📷</span>
                    <h2 className="font-bold text-navy text-lg">Escanear QR Code</h2>
                  </div>
                  <button onClick={handleScan} disabled={scanning} className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all ${scanning ? 'bg-teal/50 text-white cursor-wait' : 'bg-teal text-white hover:bg-teal/90 shadow-md'}`}>
                    <ScanLine size={20} className={scanning ? 'animate-pulse' : ''} />
                    {scanning ? 'Escaneando...' : 'Abrir Scanner'}
                  </button>
                </div>

                {/* Pending list */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={18} className="text-yellow" />
                    <h2 className="font-bold text-navy text-sm">Acoes para validar</h2>
                  </div>
                  {pendingActions.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                      <span className="text-4xl block mb-3">✨</span>
                      <p className="text-gray-500 text-sm">Nenhuma acao pendente!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pendingActions.map((item) => (
                        <button key={item.id} onClick={() => setSelectedAction(item)} className="w-full bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 hover:shadow-md active:scale-[0.98] text-left">
                          <span className="text-2xl">{item.actionIcon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-navy text-sm">{item.authorName}</p>
                            <p className="text-gray-500 text-xs truncate">{item.actionTypeName}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-teal font-bold text-xs">+{item.points}</span>
                            <span className="text-gray-400 text-[10px]">{timeAgo(item.createdAt)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* ===== TAB: My Pending Actions (C9/C10/B12) ===== */}
        {tab === 'minhas' && (
          <>
            {myActions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <span className="text-4xl block mb-3">📋</span>
                <p className="text-gray-500 text-sm">Nenhuma acao aguardando validacao.</p>
                <p className="text-xs text-gray-400 mt-1">Registre uma boa acao para comecar!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myActions.map((action) => {
                  const hoursLeft = Math.max(0, Math.round((new Date(action.expiresAt).getTime() - Date.now()) / 3600000))
                  const isUrgent = hoursLeft <= 12

                  return (
                    <div key={action.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{action.actionIcon}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-navy text-sm">{action.actionTypeName}</p>
                          <p className="text-teal text-xs font-bold">+{action.points} pts</p>
                        </div>
                        <span className="text-gray-400 text-[10px]">{timeAgo(action.createdAt)}</span>
                      </div>

                      {/* C10: Two visual stamps */}
                      <div className="flex gap-3 mb-3">
                        <div className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border-2 ${
                          action.validatorConfirmed ? 'border-green/30 bg-green/5' : 'border-gray-200 bg-gray-50'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            action.validatorConfirmed ? 'bg-green text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500">Validador</p>
                            <p className={`text-xs font-bold ${action.validatorConfirmed ? 'text-green' : 'text-gray-400'}`}>
                              {action.validatorConfirmed ? 'Confirmado' : 'Pendente'}
                            </p>
                          </div>
                        </div>

                        <div className={`flex-1 flex items-center gap-2 p-2.5 rounded-xl border-2 ${
                          action.beneficiaryConfirmed ? 'border-green/30 bg-green/5' : 'border-gray-200 bg-gray-50'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            action.beneficiaryConfirmed ? 'bg-green text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500">Beneficiado</p>
                            <p className={`text-xs font-bold ${action.beneficiaryConfirmed ? 'text-green' : 'text-gray-400'}`}>
                              {action.beneficiaryConfirmed ? 'Confirmado' : 'Pendente'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expiration alert */}
                      {isUrgent && (
                        <div className="bg-red/5 border border-red/20 rounded-lg p-2 mb-3">
                          <p className="text-xs text-red-700 font-semibold">
                            Expira em {hoursLeft}h! Busque um colega para validar.
                          </p>
                        </div>
                      )}

                      {/* Show QR button */}
                      <button
                        onClick={() => setShowQr(showQr === action.id ? null : action.id)}
                        className="w-full py-2.5 rounded-xl border-2 border-teal text-teal font-semibold text-xs hover:bg-teal/5 transition-colors"
                      >
                        {showQr === action.id ? 'Esconder QR Code' : 'Mostrar QR Code para validar'}
                      </button>

                      {showQr === action.id && (
                        <div className="mt-3 flex flex-col items-center">
                          <div className="bg-white p-3 rounded-xl shadow-inner border border-gray-100">
                            <QRCodeSVG value={action.qrToken} size={140} bgColor="#ffffff" fgColor="#1F4E79" level="M" />
                          </div>
                          <p className="text-[10px] text-gray-400 mt-2">Peca para um colega escanear</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
