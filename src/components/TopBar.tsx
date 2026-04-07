import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const ICON_MAP: Record<string, string> = {
  'fa-mask': '\u{1F9B8}',
  'fa-bolt': '\u26A1',
  'fa-hat-wizard': '\u{1F9D9}',
  'fa-jedi': '\u2694\uFE0F',
  'fa-wind': '\u{1F343}',
  'fa-trophy': '\u{1F3C6}',
  'fa-guitar': '\u{1F3B8}',
  'fa-dungeon': '\u{1F5E1}\uFE0F',
}

export default function TopBar() {
  const { user } = useAuth()
  const [student, setStudent] = useState<{
    name: string
    total_points: number
    tribe?: { icon_class: string | null; name: string } | null
    character?: { name: string; tier: number } | null
  } | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('students')
      .select('name, total_points, tribe:tribes(icon_class, name), character:characters(name, tier)')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setStudent(data as unknown as typeof student)
      })

    // Try to get unread notifications count
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .then(({ count }) => {
        setUnreadCount(count ?? 0)
      })
  }, [user])

  if (!user || !student) return null

  const tribeEmoji = student.tribe?.icon_class
    ? (ICON_MAP[student.tribe.icon_class] ?? '\u{1F3AE}')
    : '\u{1F3AE}'
  const tierNum = student.character?.tier ?? 1
  const charName = student.character?.name ?? 'Aprendiz'

  return (
    <div className="bg-white/95 backdrop-blur-lg border-b border-gray-100 px-4 py-2 sticky top-0 z-20">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Link to="/perfil" className="flex items-center gap-2">
          <span className="text-2xl">{tribeEmoji}</span>
          <div>
            <p className="text-xs font-bold text-navy leading-tight">{student.name}</p>
            <p className="text-[10px] text-gray-400">Tier {tierNum} &mdash; {charName}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/perfil"
            className="flex items-center gap-1.5 bg-teal/10 px-3 py-1.5 rounded-full"
          >
            <span className="text-xs">{'\u{1F3C6}'}</span>
            <span className="text-xs font-bold text-teal">{student.total_points}</span>
          </Link>

          <Link to="/notificacoes" className="relative p-1.5">
            <Bell className="w-5 h-5 text-gray-500" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}
