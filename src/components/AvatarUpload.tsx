import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  userId: string
  currentUrl: string | null
  size?: number
  initials?: string
  onUploaded: (url: string) => void
}

export default function AvatarUpload({ userId, currentUrl, size = 80, initials = '?', onUploaded }: Props) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const canvas = document.createElement('canvas')
    canvas.width = 400; canvas.height = 400
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.onload = async () => {
      const s = Math.min(img.width, img.height)
      const sx = (img.width - s) / 2, sy = (img.height - s) / 2
      ctx.drawImage(img, sx, sy, s, s, 0, 0, 400, 400)
      canvas.toBlob(async (blob) => {
        if (!blob) { setUploading(false); return }
        const path = `${userId}/avatar.jpg`
        const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        if (!error) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path)
          const url = `${data.publicUrl}?t=${Date.now()}`
          onUploaded(url)
        }
        setUploading(false)
      }, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  }

  const inputId = `avatar-upload-${userId}`

  return (
    <label htmlFor={inputId} className="relative inline-block cursor-pointer group">
      {currentUrl ? (
        <img src={currentUrl} alt="" className="rounded-full object-cover border-4 border-white/30 shadow-lg group-hover:opacity-80 transition-opacity"
          style={{ width: size, height: size }} />
      ) : (
        <div className="rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white border-4 border-white/30 group-hover:bg-white/30 transition-colors"
          style={{ width: size, height: size }}>
          {initials}
        </div>
      )}
      <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
        <span className="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity">{'\u{1F4F7}'}</span>
      </div>
      {uploading && <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center"><span className="text-white text-xs font-bold">...</span></div>}
      <input type="file" accept="image/*" id={inputId} className="hidden" onChange={handleFile} />
    </label>
  )
}
