import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send, QrCode } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'
import QrScanner from '../components/QrScanner'

interface Transaction {
  id: string
  type: string
  amount: number
  balance_after: number
  description: string | null
  created_at: string
}

type FilterPeriod = '15d' | '30d' | 'month' | 'custom'

export default function Creditos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [credits, setCredits] = useState(0)
  const [totalPoints, setTotalPoints] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<FilterPeriod>('15d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Transfer states
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferQrCode, setTransferQrCode] = useState<string | null>(null)
  const [transferConfirmCode, setTransferConfirmCode] = useState('')
  const [transferGenerated, setTransferGenerated] = useState('')
  const [transferStep, setTransferStep] = useState<'amount' | 'qr' | 'confirm'>('amount')
  const [transferTimer, setTransferTimer] = useState(30)
  const [transferExpired, setTransferExpired] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // State for incoming transfer notification
  const [incomingTransfer, setIncomingTransfer] = useState<{ amount: number; senderName: string } | null>(null)

  // Auto-process transfer code from URL (when friend scans QR with native camera)
  useEffect(() => {
    const transferCode = searchParams.get('transfer')
    if (!transferCode || !studentId) return

    async function processIncomingTransfer(code: string) {
      const { data: pt, error } = await supabase
        .from('pending_transfers')
        .select('id, sender_id, amount, status')
        .eq('code', code)
        .eq('status', 'waiting')
        .single()

      if (error || !pt) {
        alert('Codigo de transferencia invalido ou expirado.')
        return
      }

      // Get sender name
      const { data: sender } = await supabase.from('students')
        .select('user:users!students_users_id_fkey(name)').eq('id', pt.sender_id).single()
      const senderName = Array.isArray(sender?.user) ? sender.user[0]?.name : ((sender?.user as unknown as {name:string}) || {}).name || 'Colega'

      // Update status to scanned + set receiver
      await supabase.from('pending_transfers')
        .update({ status: 'scanned', receiver_id: studentId, scanned_at: new Date().toISOString() })
        .eq('id', pt.id)

      setIncomingTransfer({ amount: pt.amount, senderName })
    }
    processIncomingTransfer(transferCode)
  }, [searchParams, studentId])

  // Scan states
  const [showScan, setShowScan] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [scanInput, setScanInput] = useState('')

  // Transfer history
  const [myTransfers, setMyTransfers] = useState<{ id: string; code: string; amount: number; status: string; created_at: string }[]>([])

  async function loadMyTransfers() {
    if (!studentId) return
    const { data } = await supabase.from('pending_transfers')
      .select('id, code, amount, status, created_at')
      .eq('sender_id', studentId)
      .in('status', ['waiting', 'scanned', 'confirmed', 'expired'])
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setMyTransfers(data)
  }
  const [scanResult, setScanResult] = useState<{ desc: string; amount: number; id: string } | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [confirmGenerated, setConfirmGenerated] = useState('')

  const PAGE_SIZE = 20

  useEffect(() => {
    if (!user) return
    loadStudent()
  }, [user])

  useEffect(() => {
    if (!studentId) return
    setPage(0)
    setTransactions([])
    loadTransactions(0, true)
  }, [studentId, filter, customStart, customEnd])

  async function loadStudent() {
    const { data } = await supabase.from('students').select('id, total_points, available_points')
      .eq('user_id', user!.id).single()
    if (data) {
      setStudentId(data.id)
      setCredits(data.available_points ?? 0)
      setTotalPoints(data.total_points ?? 0)
    }
    // Load phone (users.phone > students.whatsapp > students.phone como fallback)
    const { data: u } = await supabase.from('users').select('phone, whatsapp').eq('auth_id', user!.id).single()
    if (u?.phone) setUserPhone(u.phone)
    else if (u?.whatsapp) setUserPhone(u.whatsapp)
    else if (data) {
      const { data: st } = await supabase.from('students').select('whatsapp, phone').eq('id', data.id).single()
      if (st?.whatsapp) setUserPhone(st.whatsapp)
      else if (st?.phone) setUserPhone(st.phone)
    }
    setLoading(false)
  }

  function getDateFilter(): string {
    const now = new Date()
    if (filter === '15d') return new Date(now.getTime() - 15 * 86400000).toISOString()
    if (filter === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString()
    if (filter === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return first.toISOString()
    }
    if (filter === 'custom' && customStart) return new Date(customStart).toISOString()
    return new Date(now.getTime() - 15 * 86400000).toISOString()
  }

  async function loadTransactions(p: number, reset = false) {
    if (!studentId) return
    let q = supabase.from('credit_transactions')
      .select('id, type, amount, balance_after, description, created_at')
      .eq('student_id', studentId)
      .gte('created_at', getDateFilter())
      .order('created_at', { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)

    if (filter === 'custom' && customEnd) {
      q = q.lte('created_at', new Date(customEnd + 'T23:59:59').toISOString())
    }

    const { data } = await q
    if (data) {
      if (reset) setTransactions(data as Transaction[])
      else setTransactions(prev => [...prev, ...(data as Transaction[])])
      setHasMore(data.length === PAGE_SIZE)
    }
  }

  const handleTransferGenerate = useCallback(async () => {
    const amt = parseInt(transferAmount)
    if (!amt || amt <= 0 || amt > credits) return
    const code = `TRNF-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    setTransferQrCode(code)
    setTransferStep('qr')
    setTransferExpired(false)
    setTransferTimer(30)

    // Insert pending transfer in DB
    await supabase.from('pending_transfers').insert({
      code,
      sender_id: studentId,
      amount: amt,
      status: 'waiting',
      expires_at: new Date(Date.now() + 30000).toISOString(),
    })

    // Start 30s countdown + poll for scan
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(async () => {
      setTransferTimer(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setTransferExpired(true)
          // Mark as expired in DB
          supabase.from('pending_transfers').update({ status: 'expired' }).eq('code', code)
          return 0
        }
        return prev - 1
      })
      // Poll: check if someone scanned
      const { data: pt } = await supabase.from('pending_transfers')
        .select('status, receiver_id').eq('code', code).single()
      if (pt?.status === 'scanned') {
        // Friend scanned! Move to confirm step
        if (timerRef.current) clearInterval(timerRef.current)
        const confirmPIN = String(Math.floor(100000 + Math.random() * 900000))
        setTransferConfirmCode('')
        setTransferGenerated(confirmPIN)
        // Enviar código via WhatsApp
        if (userPhone) {
          const phoneNum = userPhone.replace(/\D/g, '')
          const formattedPhone = phoneNum.startsWith('+') ? phoneNum : `+${phoneNum}`
          fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://frdpscbdtudaulscexyp.supabase.co'}/functions/v1/send-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ4MzEsImV4cCI6MjA5MDgxMDgzMX0.acvN82Uwmcfy7v5WQfQ-lSLGuYZp7UI2Oyxvbaxlt3o'}` },
            body: JSON.stringify({ to: formattedPhone, channel: 'whatsapp', code: confirmPIN, type: 'transfer_confirm' })
          }).catch(() => {})
        }
        setTransferStep('confirm')
      }
    }, 2000)
  }, [transferAmount, credits, studentId])

  const resetTransfer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setShowTransfer(false)
    setTransferStep('amount')
    setTransferAmount('')
    setTransferQrCode(null)
    setTransferExpired(false)
    setTransferTimer(30)
  }, [])

  const handleTransferConfirm = async () => {
    if (transferConfirmCode !== transferGenerated) return
    const amt = parseInt(transferAmount)
    if (!studentId || !amt || !transferQrCode) return

    // Get receiver from pending_transfers
    const { data: pt } = await supabase.from('pending_transfers')
      .select('receiver_id').eq('code', transferQrCode).single()

    // Deduct from sender
    await supabase.from('students').update({
      available_points: credits - amt,
      redeemed_points: (totalPoints - credits) + amt,
    }).eq('id', studentId)

    await supabase.from('credit_transactions').insert({
      student_id: studentId,
      type: 'transferred_out',
      amount: -amt,
      balance_after: credits - amt,
      description: `Transferencia enviada (codigo: ${transferQrCode})`,
    })

    // Credit receiver
    if (pt?.receiver_id) {
      const { data: recv } = await supabase.from('students')
        .select('available_points').eq('id', pt.receiver_id).single()
      if (recv) {
        await supabase.from('students').update({
          available_points: (recv.available_points ?? 0) + amt,
        }).eq('id', pt.receiver_id)
        await supabase.from('credit_transactions').insert({
          student_id: pt.receiver_id,
          type: 'transferred_in',
          amount: amt,
          balance_after: (recv.available_points ?? 0) + amt,
          description: `Transferencia recebida (codigo: ${transferQrCode})`,
        })
      }
    }

    // Mark transfer as confirmed
    await supabase.from('pending_transfers').update({
      status: 'confirmed', confirmed_at: new Date().toISOString(),
    }).eq('code', transferQrCode)

    setCredits(prev => prev - amt)
    resetTransfer()
    loadTransactions(0, true)
  }

  const handleScanConfirm = async () => {
    if (confirmCode !== confirmGenerated || !scanResult || !studentId) return

    // Credit receiver
    await supabase.from('students').update({
      available_points: credits + scanResult.amount,
    }).eq('id', studentId)

    await supabase.from('credit_transactions').insert({
      student_id: studentId,
      type: scanResult.id.startsWith('promo') ? 'redeemed' : 'transferred_in',
      amount: scanResult.amount,
      balance_after: credits + scanResult.amount,
      description: scanResult.desc,
    })

    setCredits(prev => prev + scanResult.amount)
    setShowScan(false)
    setScanResult(null)
    loadTransactions(0, true)
  }

  const isCredit = (type: string) => type === 'earned' || type === 'transferred_in'

  // Group transactions by date
  const grouped: Record<string, Transaction[]> = {}
  for (const tx of transactions) {
    const date = new Date(tx.created_at).toLocaleDateString('pt-BR')
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(tx)
  }

  if (loading) return <div className="min-h-screen bg-bg flex items-center justify-center"><p className="text-gray-400">Carregando...</p></div>

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="gradient-bg px-5 pt-8 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white"><ArrowLeft /></button>
          <h1 className="text-xl font-bold text-white">Meus Creditos</h1>
        </div>
        <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 text-center">
          <p className="text-white/70 text-sm">Saldo disponivel</p>
          <p className="text-4xl font-bold text-white mt-1">{credits}</p>
          <p className="text-white/50 text-xs mt-1">de {totalPoints} pontos ganhos</p>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => { setShowTransfer(true); loadMyTransfers() }}
            className="flex-1 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Send size={14} /> Transferir
          </button>
          <button onClick={() => { setShowScan(true); setConfirmCode(''); setConfirmGenerated(''); setScanResult(null); setScanInput('') }}
            className="flex-1 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <QrCode size={14} /> Usar beneficio
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4 space-y-4">
        {/* Incoming transfer notification */}
        {incomingTransfer && (
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center">
            <span className="text-3xl block mb-2">{'\u{1F389}'}</span>
            <p className="text-green-800 font-bold text-lg">{incomingTransfer.senderName} quer te enviar {incomingTransfer.amount} creditos!</p>
            <p className="text-green-600 text-sm mt-1">Aguarde a confirmacao do remetente para receber.</p>
            <button onClick={() => setIncomingTransfer(null)} className="mt-3 text-xs text-gray-400">Fechar</button>
          </div>
        )}
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { k: '15d' as FilterPeriod, l: '15 dias' },
            { k: '30d' as FilterPeriod, l: '30 dias' },
            { k: 'month' as FilterPeriod, l: 'Este mes' },
            { k: 'custom' as FilterPeriod, l: 'Periodo' },
          ]).map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === k ? 'bg-teal text-white' : 'bg-gray-100 text-gray-600'
              }`}>{l}</button>
          ))}
        </div>

        {filter === 'custom' && (
          <div className="flex gap-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
          </div>
        )}

        {/* Transactions grouped by date */}
        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-400 text-sm">Nenhuma movimentacao neste periodo.</p>
          </div>
        ) : Object.entries(grouped).map(([date, txs]) => {
          const dayTotal = txs.reduce((s, t) => s + t.amount, 0)
          return (
            <div key={date}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-navy">{date}</p>
                <p className={`text-xs font-bold ${dayTotal >= 0 ? 'text-teal' : 'text-red-500'}`}>
                  {dayTotal >= 0 ? '+' : ''}{dayTotal}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50">
                {txs.map(tx => (
                  <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-navy">{tx.description || tx.type}</p>
                      <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isCredit(tx.type) ? 'text-blue-600' : 'text-red-500'}`}>
                        {isCredit(tx.type) ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-[10px] text-gray-400">Saldo: {tx.balance_after}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {hasMore && transactions.length > 0 && (
          <button onClick={() => { const next = page + 1; setPage(next); loadTransactions(next) }}
            className="w-full py-2.5 text-sm text-teal font-semibold border border-teal/30 rounded-xl hover:bg-teal/5">
            Mostrar mais
          </button>
        )}
      </div>

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>

            {transferStep === 'amount' && (
              <>
                <h3 className="font-bold text-navy text-lg mb-3">Transferir creditos</h3>
                <p className="text-xs text-gray-400 mb-3">Digite o valor e gere um QR Code para o amigo escanear.</p>
                <input type="number" placeholder="Quantidade de creditos" value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)} min={1} max={credits}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:outline-none text-center text-lg mb-2" />
                <p className="text-xs text-gray-400 text-center mb-3">Saldo: {credits} creditos</p>
                <div className="flex gap-2 mb-4">
                  <button onClick={resetTransfer} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={handleTransferGenerate} disabled={!transferAmount || parseInt(transferAmount) > credits || parseInt(transferAmount) <= 0}
                    className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Gerar QR Code</button>
                </div>

                {myTransfers.length > 0 && (
                  <div className="border-t border-gray-100 pt-3">
                    <h4 className="text-xs font-bold text-navy mb-2">Historico de transferencias</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {myTransfers.map(t => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                          <div>
                            <span className="font-semibold text-navy">{t.amount} pts</span>
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              t.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                              t.status === 'scanned' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {t.status === 'confirmed' ? 'Confirmada' : t.status === 'waiting' ? 'Aguardando' : t.status === 'scanned' ? 'Escaneado' : 'Expirada'}
                            </span>
                          </div>
                          {(t.status === 'waiting' || t.status === 'expired') && (
                            <div className="flex gap-1">
                              <button onClick={async () => {
                                await supabase.from('pending_transfers').delete().eq('id', t.id)
                                loadMyTransfers()
                              }} className="p-1 text-red-400 hover:text-red-600" title="Excluir">
                                {'\u{1F5D1}'}
                              </button>
                              <button onClick={async () => {
                                // Reset status to waiting and extend expiry
                                await supabase.from('pending_transfers').update({
                                  status: 'waiting',
                                  expires_at: new Date(Date.now() + 30000).toISOString(),
                                  receiver_id: null,
                                }).eq('id', t.id)
                                setTransferAmount(String(t.amount))
                                setTransferQrCode(t.code)
                                setTransferStep('qr')
                                setTransferExpired(false)
                                setTransferTimer(30)
                                if (timerRef.current) clearInterval(timerRef.current)
                                timerRef.current = setInterval(async () => {
                                  setTransferTimer(prev => {
                                    if (prev <= 1) {
                                      if (timerRef.current) clearInterval(timerRef.current)
                                      setTransferExpired(true)
                                      supabase.from('pending_transfers').update({ status: 'expired' }).eq('code', t.code)
                                      return 0
                                    }
                                    return prev - 1
                                  })
                                  const { data: pt } = await supabase.from('pending_transfers')
                                    .select('status, receiver_id').eq('code', t.code).single()
                                  if (pt?.status === 'scanned') {
                                    if (timerRef.current) clearInterval(timerRef.current)
                                    const pin = String(Math.floor(100000 + Math.random() * 900000))
                                    setTransferConfirmCode(pin)
                                    setTransferGenerated(pin)
                                    setTransferStep('confirm')
                                  }
                                }, 2000)
                              }} className="p-1 text-teal hover:text-teal/80" title="Reabrir QR Code">
                                {'\u{1F4F1}'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {transferStep === 'qr' && !transferExpired && (
              <>
                <h3 className="font-bold text-navy text-lg mb-2">QR Code gerado!</h3>
                <p className="text-xs text-gray-400 mb-3">Peca para seu amigo escanear este codigo para prosseguir com a transferencia.</p>
                <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center mb-3">
                  <QRCodeSVG value={`${window.location.origin}/home?transfer=${transferQrCode || ''}`} size={180} level="M" />
                  <p className="text-sm text-teal font-bold mt-3">{transferAmount} creditos</p>
                </div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className={`text-2xl font-bold font-mono ${transferTimer <= 10 ? 'text-red-500' : 'text-navy'}`}>
                    00:{transferTimer.toString().padStart(2, '0')}
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 text-center mb-3">O codigo expira em {transferTimer} segundos</p>
                <p className="text-xs text-gray-500 text-center mb-3">Aguardando seu amigo escanear o QR Code...</p>
                <button onClick={resetTransfer} className="w-full py-2 text-gray-400 text-sm">Cancelar</button>
              </>
            )}

            {transferStep === 'qr' && transferExpired && (
              <>
                <div className="text-center py-6">
                  <span className="text-5xl block mb-3">{'\u23F0'}</span>
                  <h3 className="font-bold text-navy text-lg mb-2">Tempo expirado!</h3>
                  <p className="text-sm text-gray-400">O codigo nao foi escaneado em 30 segundos. Gere um novo codigo para tentar novamente.</p>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={resetTransfer} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Fechar</button>
                  <button onClick={() => { setTransferStep('amount'); setTransferExpired(false) }}
                    className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold">Tentar novamente</button>
                </div>
              </>
            )}

            {transferStep === 'confirm' && (
              <>
                <h3 className="font-bold text-navy text-lg mb-2">Confirmar transferencia</h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-3">
                  <p className="text-sm text-navy">Transferencia de</p>
                  <p className="text-2xl font-bold text-teal">{transferAmount} creditos</p>
                </div>
                <p className="text-xs text-gray-500 text-center mb-1">
                  Confirme a transferencia com o codigo enviado para seu WhatsApp
                </p>
                <p className="text-xs text-navy font-semibold text-center mb-2">
                  {userPhone ? `+${userPhone.replace(/^\+/, '').replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, '$1 $2 $3-$4')}` : 'Cadastre seu WhatsApp no perfil'}
                </p>
                <input type="text" inputMode="numeric" value={transferConfirmCode}
                  onChange={e => setTransferConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg tracking-widest mb-3" />
                <div className="flex gap-2">
                  <button onClick={resetTransfer} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={handleTransferConfirm} disabled={transferConfirmCode !== transferGenerated}
                    className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Confirmar</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* QR Camera Scanner */}
      {showCamera && (
        <QrScanner
          onScan={async (data) => {
            setShowCamera(false)
            setScanInput(data)
            // Look up in pending_transfers
            const { data: pt } = await supabase.from('pending_transfers')
              .select('id, code, sender_id, amount, status')
              .eq('code', data).eq('status', 'waiting').single()
            if (pt && studentId) {
              // Mark as scanned with my ID
              await supabase.from('pending_transfers').update({
                status: 'scanned', receiver_id: studentId, scanned_at: new Date().toISOString(),
              }).eq('id', pt.id)
              // Get sender name
              const { data: sender } = await supabase.from('students')
                .select('user:users!students_users_id_fkey(name)').eq('id', pt.sender_id).single()
              const senderName = ((sender?.user as unknown as {name:string})?.name) || 'Aluno'
              setScanResult({ desc: `Transferencia de ${senderName}`, amount: pt.amount, id: pt.code })
              const pin = String(Math.floor(100000 + Math.random() * 900000))
              setConfirmCode(''); setConfirmGenerated(pin)
              // Enviar código via WhatsApp
              if (userPhone) {
                const phoneNum = userPhone.replace(/\D/g, '')
                const formattedPhone = phoneNum.startsWith('+') ? phoneNum : `+${phoneNum}`
                fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://frdpscbdtudaulscexyp.supabase.co'}/functions/v1/send-verification`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ4MzEsImV4cCI6MjA5MDgxMDgzMX0.acvN82Uwmcfy7v5WQfQ-lSLGuYZp7UI2Oyxvbaxlt3o'}` },
                  body: JSON.stringify({ to: formattedPhone, channel: 'whatsapp', code: pin, type: 'benefit_confirm' })
                }).catch(() => {})
              }
              setShowScan(true)
            } else {
              // Not found — maybe a promo code? Show error
              setScanResult(null)
              setShowScan(true)
              alert('Codigo nao encontrado ou expirado.')
            }
          }}
          onClose={() => setShowCamera(false)}
        />
      )}

      {/* Scan/Use benefit Modal */}
      {showScan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {!scanResult ? (
              <>
                <h3 className="font-bold text-navy text-lg mb-3">Usar beneficio ou receber creditos</h3>
                <p className="text-xs text-gray-400 mb-3">Escaneie o QR Code ou digite o codigo manualmente.</p>
                <button onClick={() => { setShowScan(false); setShowCamera(true) }}
                  className="w-full py-3 rounded-xl bg-teal text-white font-bold text-sm flex items-center justify-center gap-2 mb-3">
                  <QrCode size={18} /> Escanear QR Code
                </button>
                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-gray-200 flex-1" />
                  <span className="px-3 text-xs text-gray-400">ou</span>
                  <div className="border-t border-gray-200 flex-1" />
                </div>
                <input type="text" placeholder="Digite o codigo manualmente" value={scanInput}
                  onChange={e => setScanInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:outline-none text-center text-lg tracking-widest mb-3 mt-2" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowScan(false); setScanInput('') }} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={async () => {
                    if (!scanInput || !studentId) return
                    const { data: pt } = await supabase.from('pending_transfers')
                      .select('id, code, sender_id, amount, status')
                      .eq('code', scanInput).eq('status', 'waiting').single()
                    if (pt) {
                      await supabase.from('pending_transfers').update({
                        status: 'scanned', receiver_id: studentId, scanned_at: new Date().toISOString(),
                      }).eq('id', pt.id)
                      const { data: sender } = await supabase.from('students')
                        .select('user:users!students_users_id_fkey(name)').eq('id', pt.sender_id).single()
                      const senderName = ((sender?.user as unknown as {name:string})?.name) || 'Aluno'
                      setScanResult({ desc: `Transferencia de ${senderName}`, amount: pt.amount, id: pt.code })
                      const pin = String(Math.floor(100000 + Math.random() * 900000))
                      setConfirmCode(''); setConfirmGenerated(pin)
                      if (userPhone) {
                        const phoneNum = userPhone.replace(/\D/g, '')
                        const formattedPhone = phoneNum.startsWith('+') ? phoneNum : `+${phoneNum}`
                        fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://frdpscbdtudaulscexyp.supabase.co'}/functions/v1/send-verification`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMzQ4MzEsImV4cCI6MjA5MDgxMDgzMX0.acvN82Uwmcfy7v5WQfQ-lSLGuYZp7UI2Oyxvbaxlt3o'}` },
                          body: JSON.stringify({ to: formattedPhone, channel: 'whatsapp', code: pin, type: 'benefit_confirm' })
                        }).catch(() => {})
                      }
                    } else {
                      alert('Codigo nao encontrado ou expirado.')
                    }
                  }} disabled={!scanInput}
                    className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Buscar</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-navy text-lg mb-2">Confirmar operacao</h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-3">
                  <p className="text-sm text-navy font-semibold">{scanResult.desc}</p>
                  <p className="text-2xl font-bold text-teal mt-1">+{scanResult.amount} creditos</p>
                </div>
                <p className="text-xs text-gray-500 text-center mb-1">
                  Confirme com o codigo enviado para seu WhatsApp
                </p>
                <p className="text-xs text-navy font-semibold text-center mb-2">
                  {userPhone ? `+${userPhone.replace(/^\+/, '').replace(/^(\d{2})(\d{2})(\d{5})(\d{4})$/, '$1 $2 $3-$4')}` : 'Cadastre seu WhatsApp no perfil'}
                </p>
                <input type="text" inputMode="numeric" value={confirmCode}
                  onChange={e => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg tracking-widest mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowScan(false); setScanResult(null) }}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={handleScanConfirm} disabled={confirmCode !== confirmGenerated}
                    className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
