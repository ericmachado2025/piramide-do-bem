import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Already in standalone mode = already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true)
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
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
  }

  if (installed || !deferredPrompt) return null

  return (
    <button onClick={handleInstall}
      className="w-full bg-gradient-to-r from-teal to-[#1F4E79] text-white rounded-xl p-4 flex items-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.98]">
      <Download className="w-6 h-6 flex-shrink-0" />
      <div className="text-left">
        <p className="font-bold text-sm">Instalar no celular</p>
        <p className="text-white/70 text-xs">Acesse rapido como um app!</p>
      </div>
    </button>
  )
}
