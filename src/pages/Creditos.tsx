import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, QrCode } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import BottomNav from '../components/BottomNav'

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

  // Scan states
  const [showScan, setShowScan] = useState(false)
  const [scanInput, setScanInput] = useState('')
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

  const handleTransferGenerate = () => {
    const amt = parseInt(transferAmount)
    if (!amt || amt <= 0 || amt > credits) return
    const code = crypto.randomUUID().slice(0, 8).toUpperCase()
    setTransferQrCode(code)
    const confirmPIN = String(Math.floor(100000 + Math.random() * 900000))
    setTransferConfirmCode(confirmPIN)
    setTransferGenerated(confirmPIN)
  }

  const handleTransferConfirm = async () => {
    if (transferConfirmCode !== transferGenerated) return
    const amt = parseInt(transferAmount)
    if (!studentId || !amt) return

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

    setCredits(prev => prev - amt)
    setShowTransfer(false)
    setTransferAmount('')
    setTransferQrCode(null)
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
          <button onClick={() => setShowTransfer(true)}
            className="flex-1 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Send size={14} /> Transferir
          </button>
          <button onClick={() => { setShowScan(true); const c = String(Math.floor(100000 + Math.random() * 900000)); setConfirmGenerated(c); setConfirmCode(c) }}
            className="flex-1 py-2.5 rounded-xl bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-2">
            <QrCode size={14} /> Usar beneficio
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4 space-y-4">
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
            {!transferQrCode ? (
              <>
                <h3 className="font-bold text-navy text-lg mb-3">Transferir creditos</h3>
                <p className="text-xs text-gray-400 mb-3">Digite o valor e gere um QR Code para o amigo escanear.</p>
                <input type="number" placeholder="Quantidade de creditos" value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)} min={1} max={credits}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:outline-none text-center text-lg mb-2" />
                <p className="text-xs text-gray-400 text-center mb-3">Saldo: {credits} creditos</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowTransfer(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={handleTransferGenerate} disabled={!transferAmount || parseInt(transferAmount) > credits || parseInt(transferAmount) <= 0}
                    className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Gerar codigo</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-navy text-lg mb-2">Codigo gerado!</h3>
                <p className="text-xs text-gray-400 mb-3">Peca para seu amigo digitar este codigo na area "Usar beneficio".</p>
                <div className="bg-gray-50 rounded-xl p-6 text-center mb-3">
                  <p className="text-3xl font-mono font-bold text-navy tracking-widest">{transferQrCode}</p>
                  <p className="text-sm text-teal font-bold mt-2">{transferAmount} creditos</p>
                </div>
                <p className="text-xs text-red-500 text-center font-semibold mb-2">Codigo exibido na tela no MVP (aguardando ativacao do WhatsApp - prazo: 1 a 7 dias)</p>
                <p className="text-xs text-gray-500 text-center mb-2">Confirme com seu codigo de verificacao:</p>
                <input type="text" inputMode="numeric" value={transferConfirmCode}
                  onChange={e => setTransferConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg tracking-widest mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowTransfer(false); setTransferQrCode(null) }}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={handleTransferConfirm} disabled={transferConfirmCode !== transferGenerated}
                    className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Confirmar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Scan/Use benefit Modal */}
      {showScan && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {!scanResult ? (
              <>
                <h3 className="font-bold text-navy text-lg mb-3">Usar beneficio ou receber creditos</h3>
                <p className="text-xs text-gray-400 mb-3">Digite o codigo do beneficio ou da transferencia.</p>
                <input type="text" placeholder="Digite o codigo" value={scanInput}
                  onChange={e => setScanInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal focus:outline-none text-center text-lg tracking-widest mb-3" />
                <div className="flex gap-2">
                  <button onClick={() => setShowScan(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm">Cancelar</button>
                  <button onClick={() => {
                    // Simulate finding the transfer/promo
                    setScanResult({ desc: `Transferencia recebida (codigo: ${scanInput})`, amount: 10, id: scanInput })
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
                <p className="text-xs text-red-500 text-center font-semibold mb-2">Codigo exibido na tela no MVP (aguardando ativacao do WhatsApp - prazo: 1 a 7 dias)</p>
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