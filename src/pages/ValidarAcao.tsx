import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowLeft, ScanLine, CheckCircle2, XCircle, Clock, User, Shield, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getScoringRule } from '../lib/database'
import BottomNav from '../components/BottomNav'
import ConfettiEffect from '../components/ConfettiEffect'
import { QRCodeSVG } from 'qrcode.react'
import { Html5Qrcode } from 'html5-qrcode'

type Tab = 'validar' | 'minhas'

interface PendingItem {
  id: string
  authorName: string
  actionTypeName: string
  actionIcon: string
  beneficiaryName: string
  points: number
  createdAt: string
}

interface MyPendingAction {
  id: string
  actionTypeName: string
  actionIcon: string
  points: number
  createdAt: string
  expiresAt: string
  qrToken: string
  status: string
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
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('validar')
  const [pendingActions, setPendingActions] = useState<PendingItem[]>([])
  const [myActions, setMyActions] = useState<MyPendingAction[]>([])
  const [selectedAction, setSelectedAction] = useState<PendingItem | null>(null)
  const [showResult, setShowResult] = useState<'confirmed' | 'denied' | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showQr, setShowQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)

  // Extract token from QR data (supports raw UUID and full URL)
  function extractToken(data: string): string {
    try {
      const url = new URL(data)
      return url.searchParams.get('token') || data
    } catch {
      return data
    }
  }

  // Auto-process token from URL query param (when scanned by native camera)
  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (!urlToken || !user) return

    async function processUrlToken(token: string) {
      const { data: action, error } = await supabase
        .from('actions')
        .select('id, points_awarded, created_at, author:students!actions_author_id_fkey(name), action_type:action_types(name, icon), beneficiary:students!actions_beneficiary_id_fkey(name)')
        .eq('qr_code_token', token)
        .eq('status', 'pending')
        .single()

      if (error || !action) {
        setScanError('QR Code nao reconhecido ou acao ja validada')
        return
      }
      const a = action as Record<string, unknown>
      setSelectedAction({
        id: a.id as string,
        authorName: (a.author as { name: string } | null)?.name ?? 'Desconhecido',
        actionTypeName: (a.action_type as { name: string; icon: string | null } | null)?.name ?? 'Boa acao',
        actionIcon: (a.action_type as { name: string; icon: string | null } | null)?.icon ?? '\u{1F91D}',
        beneficiaryName: (a.beneficiary as { name: string } | null)?.name ?? 'Colega',
        points: (a.points_awarded as number) ?? 0,
        createdAt: a.created_at as string,
      })
    }
    processUrlToken(urlToken)
  }, [searchParams, user])

  useEffect(() => {
    if (!user) return

    async function loadData() {
      // Get current student
      const { data: me } = await supabase
        .from('students')
        .select('id, school_id')
        .eq('user_id', user!.id)
        .single()

      if (!me) { setLoading(false); return }
      setStudentId(me.id)

      // Load pending actions where I am the beneficiary (not authored by me)
      const { data: pending } = await supabase
        .from('actions')
        .select('id, points_awarded, created_at, author_id, action_type:action_types(name, icon), beneficiary_id')
        .eq('status', 'pending')
        .eq('beneficiary_id', me.id)
        .neq('author_id', me.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (pending) {
        // Fetch author names via students -> users
        const authorIds = [...new Set(pending.map(a => a.author_id).filter(Boolean))]
        const authorNames: Record<string, string> = {}
        if (authorIds.length > 0) {
          const { data: authors } = await supabase.from('students')
            .select('id, user:users!students_users_id_fkey(name)')
            .in('id', authorIds as string[])
          if (authors) {
            for (const a of authors) {
              authorNames[a.id] = ((a.user as unknown as { name: string }) ?? { name: 'Colega' }).name
            }
          }
        }
        setPendingActions(pending.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          authorName: authorNames[a.author_id as string] ?? 'Colega',
          actionTypeName: (a.action_type as { name: string; icon: string | null } | null)?.name ?? 'Boa acao',
          actionIcon: (a.action_type as { name: string; icon: string | null } | null)?.icon ?? '\u{1F91D}',
          beneficiaryName: 'Voce',
          points: (a.points_awarded as number) ?? 0,
          createdAt: a.created_at as string,
        })))
      }

      // Load my pending actions
      const { data: mine } = await supabase
        .from('actions')
        .select('id, points_awarded, created_at, expires_at, qr_code_token, status, action_type:action_types(name, icon)')
        .eq('author_id', me.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (mine) {
        setMyActions(mine.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          actionTypeName: (a.action_type as { name: string; icon: string | null } | null)?.name ?? 'Boa acao',
          actionIcon: (a.action_type as { name: string; icon: string | null } | null)?.icon ?? '\u{1F91D}',
          points: (a.points_awarded as number) ?? 0,
          createdAt: a.created_at as string,
          expiresAt: a.expires_at as string,
          qrToken: a.qr_code_token as string,
          status: a.status as string,
        })))
      }

      setLoading(false)
    }
    loadData()
  }, [user])

  const stopScanner = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState()
        // State 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await html5QrCodeRef.current.stop()
        }
        html5QrCodeRef.current.clear()
        html5QrCodeRef.current = null
      }
    } catch {
      // Ignore cleanup errors
    }
    setScannerActive(false)
    setScanning(false)
  }, [])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState()
          if (state === 2 || state === 3) {
            html5QrCodeRef.current.stop().then(() => {
              html5QrCodeRef.current?.clear()
            })
          } else {
            html5QrCodeRef.current.clear()
          }
        } catch {
          // Ignore cleanup errors on unmount
        }
      }
    }
  }, [])

  function handleScan() {
    setScanError(null)
    setScannerActive(true)
    setScanning(true)

    // Wait for the DOM element to render
    setTimeout(async () => {
      const readerElement = document.getElementById('qr-reader')
      if (!readerElement) {
        setScannerActive(false)
        setScanning(false)
        return
      }

      try {
        const html5QrCode = new Html5Qrcode('qr-reader')
        html5QrCodeRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText: string) => {
            // On successful scan
            try {
              await html5QrCode.stop()
              html5QrCode.clear()
              html5QrCodeRef.current = null
            } catch {
              // Ignore stop errors
            }
            setScanning(false)
            setScannerActive(false)

            // Look up the action by QR token
            const token = extractToken(decodedText)
            const { data: action, error } = await supabase
              .from('actions')
              .select('id, points_awarded, created_at, author:students!actions_author_id_fkey(name), action_type:action_types(name, icon), beneficiary:students!actions_beneficiary_id_fkey(name)')
              .eq('qr_code_token', token)
              .eq('status', 'pending')
              .single()

            if (error || !action) {
              setScanError('QR Code nao reconhecido ou acao ja validada')
              return
            }

            const a = action as Record<string, unknown>
            setSelectedAction({
              id: a.id as string,
              authorName: (a.author as { name: string } | null)?.name ?? 'Desconhecido',
              actionTypeName: (a.action_type as { name: string; icon: string | null } | null)?.name ?? 'Boa acao',
              actionIcon: (a.action_type as { name: string; icon: string | null } | null)?.icon ?? '\u{1F91D}',
              beneficiaryName: (a.beneficiary as { name: string } | null)?.name ?? 'Colega',
              points: (a.points_awarded as number) ?? 0,
              createdAt: a.created_at as string,
            })
          },
          () => {
            // onScanFailure - ignore, camera keeps scanning
          }
        )
      } catch {
        setScanError('Permissao de camera necessaria')
        setScannerActive(false)
        setScanning(false)
      }
    }, 100)
  }

  async function handleConfirm() {
    if (!selectedAction || !studentId) return

    const actionPoints = selectedAction.points

    // Update action status
    await supabase
      .from('actions')
      .update({
        status: 'validated',
        validator_id: studentId,
        validated_at: new Date().toISOString(),
        points_awarded: actionPoints,
      })
      .eq('id', selectedAction.id)

    // Insert validation record
    await supabase.from('validations').insert({
      action_id: selectedAction.id,
      validator_id: studentId,
      result: 'confirmed',
    })

    // Award points to the author
    const { data: authorAction } = await supabase
      .from('actions')
      .select('author_id')
      .eq('id', selectedAction.id)
      .single()

    if (authorAction) {
      const { data: author } = await supabase
        .from('students')
        .select('total_points, available_points')
        .eq('id', authorAction.author_id)
        .single()

      if (author) {
        const newBalance = (author.available_points ?? 0) + actionPoints
        await supabase
          .from('students')
          .update({
            total_points: (author.total_points ?? 0) + actionPoints,
            available_points: newBalance,
            last_action_date: new Date().toISOString(),
          })
          .eq('id', authorAction.author_id)
        await supabase.from('credit_transactions').insert({
          student_id: authorAction.author_id, type: 'earned', amount: actionPoints,
          balance_after: newBalance,
          description: `Boa acao: ${selectedAction.actionTypeName}`,
          related_id: selectedAction.id, related_type: 'action',
        })
      }
    }

    // Award validator bonus from scoring_rules
    const validationRule = await getScoringRule('validation_bonus')
    const validatorBonus = validationRule?.points ?? 15
    const { data: validator } = await supabase
      .from('students')
      .select('total_points, available_points')
      .eq('id', studentId)
      .single()

    if (validator) {
      const newValBalance = (validator.available_points ?? 0) + validatorBonus
      await supabase
        .from('students')
        .update({
          total_points: (validator.total_points ?? 0) + validatorBonus,
          available_points: newValBalance,
        })
        .eq('id', studentId)
      await supabase.from('credit_transactions').insert({
        student_id: studentId, type: 'earned', amount: validatorBonus,
        balance_after: newValBalance,
        description: `Bonus validacao: ${selectedAction.actionTypeName}`,
        related_id: selectedAction.id, related_type: 'validation',
      })
    }

    // Notify the author that their action was validated
    if (authorAction) {
      const { data: authorStudent } = await supabase.from('students').select('user_id').eq('id', authorAction.author_id).single()
      if (authorStudent?.user_id) {
        await supabase.rpc('create_notification', {
          p_user_id: authorStudent.user_id,
          p_type: 'action_validated',
          p_title: 'Acao validada!',
          p_message: `Sua acao "${selectedAction.actionTypeName}" foi validada! +${actionPoints} pontos`,
          p_action_url: '/home',
          p_icon: '\u{1F3AF}',
        })
      }
    }

    setPendingActions((prev) => prev.filter((a) => a.id !== selectedAction.id))
    setShowConfetti(true)
    setShowResult('confirmed')
  }

  async function handleDeny() {
    if (!selectedAction || !studentId) return

    // Update action status
    await supabase
      .from('actions')
      .update({ status: 'denied', validator_id: studentId })
      .eq('id', selectedAction.id)

    // Insert validation record
    await supabase.from('validations').insert({
      action_id: selectedAction.id,
      validator_id: studentId,
      result: 'denied',
    })

    setPendingActions((prev) => prev.filter((a) => a.id !== selectedAction.id))
    setShowResult('denied')
  }

  function handleReset() {
    setSelectedAction(null)
    setShowResult(null)
    setShowConfetti(false)
    setScanError(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
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
                <div className="text-6xl mb-4 float-anim">{'\u{1F389}'}</div>
                <h2 className="text-2xl font-bold text-navy mb-3">Ação validada!</h2>
                <div className="bg-green/10 border border-green/30 rounded-2xl p-4 mb-4">
                  <p className="text-green font-semibold">{selectedAction.authorName} ganhou {selectedAction.points} pts!</p>
                  <p className="text-green/80 text-sm mt-1">Você ganhou <strong>+3 pts</strong> por validar!</p>
                </div>
                <button onClick={handleReset} className="w-full bg-teal text-white font-bold py-3.5 rounded-xl">
                  Validar outra ação
                </button>
              </div>
            )}

            {showResult === 'denied' && (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">{'\u{1F60C}'}</div>
                <h2 className="text-xl font-bold text-navy mb-2">Tudo bem.</h2>
                <p className="text-gray-500 text-sm mb-6">A ação aguardará outro colega.</p>
                <button onClick={handleReset} className="w-full bg-teal text-white font-bold py-3.5 rounded-xl">Voltar</button>
              </div>
            )}

            {!showResult && selectedAction && (
              <div>
                <h2 className="text-lg font-bold text-navy mb-4">Confirmar esta ação?</h2>
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
                    <div className="flex justify-between"><span className="text-gray-500">Quando:</span><span className="font-medium text-navy">{timeAgo(selectedAction.createdAt)} atrás</span></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <button onClick={handleConfirm} className="w-full flex items-center justify-center gap-2 bg-green text-white font-bold py-4 rounded-xl shadow-md active:scale-[0.98]">
                    <CheckCircle2 size={22} /> Sim, confirmo!
                  </button>
                  <button onClick={handleDeny} className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-600 font-medium py-3 rounded-xl active:scale-[0.98]">
                    <XCircle size={18} /> Não posso confirmar
                  </button>
                </div>
              </div>
            )}

            {!showResult && !selectedAction && (
              <>
                {scannerActive && (
                  <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
                    <div className="relative w-full max-w-sm mx-auto px-4">
                      <button
                        onClick={stopScanner}
                        className="absolute -top-12 right-4 z-50 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
                      >
                        <X size={24} />
                      </button>
                      <div className="bg-black rounded-2xl overflow-hidden">
                        <div id="qr-reader" className="w-full" />
                      </div>
                      <p className="text-white/70 text-center text-sm mt-4">Aponte a câmera para o QR Code</p>
                      <button
                        onClick={stopScanner}
                        className="mt-4 w-full py-3 rounded-xl bg-white/20 text-white font-bold text-sm hover:bg-white/30 transition-colors"
                      >
                        Fechar Scanner
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{'\u{1F4F7}'}</span>
                    <h2 className="font-bold text-navy text-lg">Escanear QR Code</h2>
                  </div>
                  {scanError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
                      <p className="text-red-700 text-sm font-medium">{scanError}</p>
                    </div>
                  )}
                  <button onClick={handleScan} disabled={scanning} className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold transition-all ${scanning ? 'bg-teal/50 text-white cursor-wait' : 'bg-teal text-white hover:bg-teal/90 shadow-md'}`}>
                    <ScanLine size={20} className={scanning ? 'animate-pulse' : ''} />
                    {scanning ? 'Escaneando...' : 'Abrir Scanner'}
                  </button>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={18} className="text-yellow" />
                    <h2 className="font-bold text-navy text-sm">Ações para validar</h2>
                  </div>
                  {pendingActions.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                      <span className="text-4xl block mb-3">{'\u2728'}</span>
                      <p className="text-gray-500 text-sm">Nenhuma ação pendente!</p>
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

        {/* ===== TAB: My Pending Actions ===== */}
        {tab === 'minhas' && (
          <>
            {myActions.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <span className="text-4xl block mb-3">{'\u{1F4CB}'}</span>
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

                      <div className="flex gap-3 mb-3">
                        <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border-2 border-gray-200 bg-gray-50">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-400">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500">Validador</p>
                            <p className="text-xs font-bold text-gray-400">Pendente</p>
                          </div>
                        </div>

                        <div className="flex-1 flex items-center gap-2 p-2.5 rounded-xl border-2 border-gray-200 bg-gray-50">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-gray-500">Beneficiado</p>
                            <p className="text-xs font-bold text-gray-400">Pendente</p>
                          </div>
                        </div>
                      </div>

                      {isUrgent && (
                        <div className="bg-red/5 border border-red/20 rounded-lg p-2 mb-3">
                          <p className="text-xs text-red-700 font-semibold">
                            Expira em {hoursLeft}h! Busque um colega para validar.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => setShowQr(showQr === action.id ? null : action.id)}
                        className="w-full py-2.5 rounded-xl border-2 border-teal text-teal font-semibold text-xs hover:bg-teal/5 transition-colors"
                      >
                        {showQr === action.id ? 'Esconder QR Code' : 'Mostrar QR Code para validar'}
                      </button>

                      {showQr === action.id && (
                        <div className="mt-3 flex flex-col items-center">
                          <div className="bg-white p-3 rounded-xl shadow-inner border border-gray-100">
                            <QRCodeSVG value={`${window.location.origin}/validar?token=${action.qrToken}`} size={140} bgColor="#ffffff" fgColor="#1F4E79" level="M" />
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
