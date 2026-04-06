import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useLocalUser } from '../hooks/useLocalUser'

// C1: Points + mini-avatar visible in header of all screens
// B8: Bell icon with notification badge
export default function TopBar() {
  const { user } = useLocalUser()

  if (!user) return null

  // Simulated unread count (prototype)
  const unreadCount = 5

  return (
    <div className="bg-white/95 backdrop-blur-lg border-b border-gray-100 px-4 py-2 sticky top-0 z-20">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <Link to="/perfil" className="flex items-center gap-2">
          <span className="text-2xl">{user.tribeEmoji || '🎮'}</span>
          <div>
            <p className="text-xs font-bold text-navy leading-tight">{user.name}</p>
            <p className="text-[10px] text-gray-400">Tier {user.characterTier} — {user.characterName || 'Aprendiz'}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/perfil"
            className="flex items-center gap-1.5 bg-teal/10 px-3 py-1.5 rounded-full"
          >
            <span className="text-xs">🏆</span>
            <span className="text-xs font-bold text-teal">{user.totalPoints}</span>
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
