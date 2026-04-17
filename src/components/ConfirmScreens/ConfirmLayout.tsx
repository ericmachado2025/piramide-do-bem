import { useState, useEffect } from 'react'

interface ConfirmLayoutProps {
  title: string
  children: React.ReactNode
  onApprove: () => Promise<void>
  onCancel?: () => void
  approveLabel?: string
  cancelLabel?: string
  approveColor?: string
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'used'
  successMessage?: string
}

function AutoCloseTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          window.close()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const progress = ((seconds - remaining) / seconds) * 100

  return (
    <div className="mt-6 text-center">
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-gray-500">
        {remaining > 0
          ? `Fechando em ${remaining}s...`
          : 'Pode fechar esta aba'}
      </p>
      {remaining === 0 && (
        <button
          onClick={() => window.close()}
          className="mt-2 text-teal underline text-sm"
        >
          Fechar
        </button>
      )}
    </div>
  )
}

export default function ConfirmLayout({
  title,
  children,
  onApprove,
  onCancel,
  approveLabel = 'Aprovar',
  cancelLabel = 'Cancelar',
  approveColor = 'bg-green-600 hover:bg-green-700',
  status,
  successMessage = 'Operacao aprovada',
}: ConfirmLayoutProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(status === 'approved')

  if (approved || status === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-green-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#10003;</div>
          <h2 className="text-xl font-bold text-green-700 mb-2">{successMessage}</h2>
          <AutoCloseTimer seconds={5} />
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#10007;</div>
          <h2 className="text-xl font-bold text-red-700">Operacao recusada</h2>
          <p className="text-gray-500 mt-2">Esta operacao foi recusada.</p>
        </div>
      </div>
    )
  }

  if (status === 'expired' || status === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">&#9203;</div>
          <h2 className="text-xl font-bold text-gray-700">
            {status === 'expired' ? 'Operacao expirada' : 'Link ja utilizado'}
          </h2>
          <p className="text-gray-500 mt-2">Solicite um novo link.</p>
        </div>
      </div>
    )
  }

  const handleApprove = async () => {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      await onApprove()
      setApproved(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao aprovar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal/5 to-white p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">{title}</h1>

        <div className="mb-6">{children}</div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-lg text-white transition-all ${approveColor} ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Processando...' : approveLabel}
          </button>

          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
