import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface Props {
  onScan: (data: string) => void
  onClose: () => void
}

export default function QrScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scanningRef = useRef(false)

  useEffect(() => {
    const startScanner = async () => {
      if (scanningRef.current) return
      scanningRef.current = true

      try {
        const scanner = new Html5Qrcode('qr-reader')
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText)
            scanner.stop().catch(() => {})
          },
          () => {} // ignore scan failures
        )
      } catch (err) {
        setError('Nao foi possivel acessar a camera. Verifique as permissoes.')
        scanningRef.current = false
      }
    }

    startScanner()

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current = null
      }
      scanningRef.current = false
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-4 w-full max-w-sm">
        <h3 className="font-bold text-navy text-lg mb-2 text-center">Escanear QR Code</h3>
        <p className="text-xs text-gray-400 text-center mb-3">Aponte a camera para o QR Code</p>

        <div id="qr-reader" ref={containerRef} className="rounded-xl overflow-hidden mb-3" style={{ minHeight: 280 }} />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
            <p className="text-xs text-red-700">{error}</p>
            <p className="text-xs text-gray-500 mt-1">Dica: Em celulares, permita o acesso a camera nas configuracoes do navegador.</p>
          </div>
        )}

        <button onClick={() => {
          if (scannerRef.current) scannerRef.current.stop().catch(() => {})
          onClose()
        }} className="w-full py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-semibold">
          Cancelar
        </button>
      </div>
    </div>
  )
}
