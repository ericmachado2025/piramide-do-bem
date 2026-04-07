import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    async function checkProfile() {
      // Check if user already has a student record
      const { data: student } = await supabase
        .from('students')
        .select('id, community_id')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (student?.community_id) {
        // Perfil completo — direto para home
        navigate('/home', { replace: true })
      } else if (student && !student.community_id) {
        // Tem registro mas falta tribo
        navigate('/tribo', { replace: true })
      } else {
        // Usuário novo via Google — precisa completar cadastro
        // Passa from=google para pular passos de nome/email/senha
        navigate('/cadastro?from=google', { replace: true })
      }
    }

    checkProfile()
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-teal border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-navy font-semibold">Autenticando...</p>
        <p className="text-gray-400 text-sm mt-1">Aguarde um momento</p>
      </div>
    </div>
  )
}
