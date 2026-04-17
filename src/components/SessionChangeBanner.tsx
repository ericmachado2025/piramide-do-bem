import { useState } from 'react'

interface SessionChangeInfo {
  oldEmail: string
  newEmail: string
}

interface Props {
  info: SessionChangeInfo
  onReload: () => void
  onDismiss: () => void
}

export default function SessionChangeBanner({ info, onReload, onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-50 border-b-2 border-yellow-300 px-4 py-3 shadow-md">
      <div className="max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-2 text-sm">
        <p className="text-yellow-800 flex-1 text-center sm:text-left">
          Voce fez login com outra conta (<strong>{info.newEmail}</strong>) em outra aba.
          Esta aba ainda esta com <strong>{info.oldEmail}</strong>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onReload}
            className="px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-colors"
          >
            Atualizar
          </button>
          <button
            onClick={() => { setDismissed(true); onDismiss() }}
            className="px-3 py-1.5 bg-white text-yellow-700 border border-yellow-300 rounded-lg text-xs font-medium hover:bg-yellow-50 transition-colors"
          >
            Manter
          </button>
        </div>
      </div>
    </div>
  )
}
