import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import PasswordInput, { validatePassword } from '../components/PasswordInput'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const [mode, setMode] = useState<'loading' | 'choose' | 'new_password' | 'expired'>('loading')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return

    // Check if this is a password recovery flow
    const hash = window.location.hash
    const isRecovery = hash.includes('type=recovery') || hash.includes('type=magiclink')

    if (isRecovery && user) {
      setMode('choose')
      return
    }

    if (!user) {
      // Check if there's a hash with error (expired link)
      if (hash.includes('error')) {
        setMode('expired')
        return
      }
      navigate('/login', { replace: true })
      return
    }

    // Normal OAuth callback — check profile
    async function checkProfile() {
      // Ensure public.users record exists (Google OAuth may skip trigger)
      const meta = user!.user_metadata
      const { data: existingUser } = await supabase.from('users').select('id').eq('auth_id', user!.id).maybeSingle()
      if (!existingUser) {
        await supabase.from('users').insert({
          auth_id: user!.id,
          name: meta?.full_name || meta?.name || user!.email?.split('@')[0] || 'Usuário',
          email: user!.email,
        })
      }

      const { data: student } = await supabase
        .from('students')
        .select('id, community_id')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (student?.community_id) {
        navigate('/home', { replace: true })
        return
      }
      if (student && !student.community_id) {
        navigate('/tribo', { replace: true })
        return
      }

      // Verificar outros perfis
      const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user!.id).maybeSingle()
      if (teacher) { navigate('/professor/dashboard', { replace: true }); return }
      const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user!.id).maybeSingle()
      if (parent) { navigate('/responsavel/dashboard', { replace: true }); return }
      const { data: sponsor } = await supabase.from('sponsors').select('id').eq('user_id', user!.id).maybeSingle()
      if (sponsor) { navigate('/patrocinador/dashboard', { replace: true }); return }

      // Nenhum perfil — escolher tipo de cadastro
      const isNewSignup = window.location.hash.includes('type=signup')
      if (isNewSignup) {
        navigate('/login', { replace: true })
        return
      }
      navigate('/cadastro/perfil?from=google', { replace: true })
    }

    checkProfile()
  }, [user, loading, navigate])

  const handleSavePassword = async () => {
    if (!validatePassword(newPassword).valid) {
      setError('Senha deve ter no minimo 8 caracteres com variedade.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setSaving(true)
    setError('')
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    if (updateErr) {
      setError(updateErr.message)
      setSaving(false)
    } else {
      navigate('/home', { replace: true })
    }
  }

  if (mode === 'expired') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm text-center">
          <span className="text-5xl block mb-3">{'\u23F3'}</span>
          <h2 className="text-xl font-bold text-navy mb-2">Link expirado</h2>
          <p className="text-gray-500 text-sm mb-6">Este link ja foi usado ou expirou. Solicite um novo.</p>
          <button onClick={() => navigate('/login')}
            className="w-full bg-teal text-white font-bold py-3 rounded-xl hover:bg-teal/90">
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'choose') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
          <div className="text-center mb-6">
            <span className="text-5xl block mb-2">{'\u{1F44B}'}</span>
            <h2 className="text-xl font-bold text-navy">Ola, {user?.user_metadata?.name || user?.email}!</h2>
            <p className="text-gray-500 text-sm mt-1">Como deseja continuar?</p>
          </div>

          <div className="space-y-3">
            <button onClick={() => navigate('/home', { replace: true })}
              className="w-full bg-teal text-white font-bold py-3.5 rounded-xl hover:bg-teal/90 transition-colors">
              Entrar diretamente
            </button>
            <button onClick={() => setMode('new_password')}
              className="w-full border-2 border-teal text-teal font-bold py-3.5 rounded-xl hover:bg-teal/5 transition-colors">
              Criar nova senha
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'new_password') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm space-y-4">
          <div className="text-center">
            <span className="text-5xl block mb-2">{'\uD83D\uDD12'}</span>
            <h2 className="text-xl font-bold text-navy">Criar nova senha</h2>
            <p className="text-gray-500 text-sm mt-1">Defina uma senha para proximos acessos</p>
          </div>
          <PasswordInput
            password={newPassword}
            confirmPassword={confirmPassword}
            onPasswordChange={setNewPassword}
            onConfirmChange={setConfirmPassword}
            onEnterAdvance={() => validatePassword(newPassword).valid && newPassword === confirmPassword && handleSavePassword()}
          />
          {error && <p className="text-sm text-red text-center">{error}</p>}
          <button onClick={handleSavePassword}
            disabled={saving || !validatePassword(newPassword).valid || newPassword !== confirmPassword}
            className="w-full bg-teal text-white font-bold py-3.5 rounded-xl hover:bg-teal/90 disabled:opacity-50 transition-colors">
            {saving ? 'Salvando...' : 'Salvar senha'}
          </button>
        </div>
      </div>
    )
  }

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
