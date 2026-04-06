import { Link, useLocation } from 'react-router-dom'
import { Home, Trophy, Plus, Map, User } from 'lucide-react'

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/ranking', icon: Trophy, label: 'Ranking' },
  { path: '/registrar', icon: Plus, label: 'Acao', isCenter: true },
  { path: '/mapa', icon: Map, label: 'Mapa' },
  { path: '/perfil', icon: User, label: 'Perfil' },
]

export default function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 h-16 relative">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon

          if (item.isCenter) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative -mt-7 flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal to-green flex items-center justify-center shadow-lg shadow-teal/30 hover:scale-110 active:scale-95 transition-transform">
                  <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-semibold text-teal mt-0.5">{item.label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200
                ${isActive
                  ? 'text-teal'
                  : 'text-gray-400 hover:text-gray-600'
                }
              `}
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-teal" />
                )}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-teal' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
