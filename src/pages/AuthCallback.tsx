import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (user) {
      // Check if user has completed profile setup
      const stored = localStorage.getItem('piramide-user')
      if (stored) {
        try {
          const profile = JSON.parse(stored)
          if (profile.tribeId) {
            navigate('/home', { replace: true })
            return
          }
        } catch { /* ignore */ }
      }

      // User authenticated via Google but needs to complete profile
      // Pre-fill what we can from Google profile
      const googleProfile = {
        name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        email: user.email || '',
        birthDay: '',
        birthMonth: '',
        birthYear: '',
        birthDate: '',
        schoolId: '',
        classroomGrade: '',
        classroomSection: '',
        parentName: '',
        parentEmail: '',
        tribeId: '',
        tribeEmoji: '',
        tribeName: '',
        characterTier: 1,
        characterName: '',
        totalPoints: 0,
        availablePoints: 0,
        redeemedPoints: 0,
      }
      localStorage.setItem('piramide-user', JSON.stringify(googleProfile))
      // Skip name + email steps, go to birth date (step 3)
      navigate('/cadastro?step=3&from=google', { replace: true })
    } else {
      navigate('/login', { replace: true })
    }
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
