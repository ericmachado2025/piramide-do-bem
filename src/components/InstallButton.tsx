import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showTip, setShowTip] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
      return
    }
    if (sessionStorage.getItem('pwa-dismissed')) {
      setDismissed(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setInstalled(true)
      setDeferredPrompt(null)
    } else {
      setShowTip(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa-dismissed', '1')
  }

  if (installed || dismissed) return null

  return (
    <>
      <div className="relative w-full bg-gradient-to-r from-teal to-[#1F4E79] text-white rounded-xl p-4 flex items-center gap-3 shadow-md">
        <button onClick={handleInstall} className="flex items-center gap-3 flex-1 text-left">
          <Download className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Instalar no celular</p>
            <p className="text-white/70 text-xs">Acesse rapido como um app!</p>
          </div>
        </button>
        <button onClick={handleDismiss} className="p-1 text-white/50 hover:text-white"><X size={16} /></button>
      </div>

      {showTip && (
        <div className="bg-white border border-teal/30 rounded-xl p-4 shadow-sm text-sm text-navy space-y-2">
          <p className="font-bold">Como instalar:</p>
          <p><strong>Android:</strong> Toque nos 3 pontinhos (⋮) do navegador → "Adicionar a tela inicial"</p>
          <p><strong>iPhone:</strong> Toque no botao de compartilhar (↑) → "Adicionar a Tela de Inicio"</p>
          <button onClick={() => setShowTip(false)} className="text-teal text-xs font-semibold mt-1">Entendi</button>
        </div>
      )}
    </>
  )
}
