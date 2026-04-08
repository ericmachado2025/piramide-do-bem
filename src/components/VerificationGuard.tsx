import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface VerificationGuardProps {
  children: React.ReactNode
}

export default function VerificationGuard({ children }: VerificationGuardProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/'); return }

    async function check() {
      // Check if user has a student record with community (completed registration)
      const { data: student } = await supabase
        .from('students')
        .select('id, community_id, parent_authorized, birth_date')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (!student) {
        // Not a student - check other profiles
        const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user!.id).maybeSingle()
        const { data: sponsor } = await supabase.from('sponsors').select('id').eq('user_id', user!.id).maybeSingle()
        const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user!.id).maybeSingle()

        if (teacher || sponsor || parent) {
          setVerified(true)
        } else {
          navigate('/cadastro')
        }
        setChecking(false)
        return
      }

      // Student exists - allow access (verification will be enforced later when Twilio is fully configured)
      setVerified(true)
      setChecking(false)
    }

    check()
  }, [user, navigate])

  if (checking) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Verificando...</div>
      </div>
    )
  }

  return verified ? <>{children}</> : null
}
