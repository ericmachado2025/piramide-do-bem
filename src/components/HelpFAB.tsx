import { HelpCircle } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const CONTEXT_MAP: Record<string, string> = {
  '/home': 'como-funciona',
  '/creditos': 'como-pontuacao-funciona',
  '/perfil': 'seguranca-e-privacidade',
  '/recompensas': 'para-alunos',
  '/professor/dashboard': 'para-professores',
  '/responsavel/dashboard': 'para-pais',
  '/patrocinador/dashboard': 'para-patrocinadores',
  '/notificacoes': 'como-funciona',
  '/ranking': 'como-pontuacao-funciona',
  '/validar': 'como-pontuacao-funciona',
  '/registrar': 'para-alunos',
}

export default function HelpFAB() {
  const location = useLocation()
  const navigate = useNavigate()

  if (location.pathname.startsWith('/ajuda')) return null
  if (location.pathname === '/' || location.pathname === '/login') return null

  function handleClick() {
    const contextSlug = CONTEXT_MAP[location.pathname]
    navigate(contextSlug ? `/ajuda/${contextSlug}` : '/ajuda')
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Ajuda"
      className="fixed bottom-20 right-4 z-40 w-11 h-11 rounded-full bg-teal/90 text-white shadow-lg hover:bg-teal flex items-center justify-center transition-all"
    >
      <HelpCircle size={22} />
    </button>
  )
}
