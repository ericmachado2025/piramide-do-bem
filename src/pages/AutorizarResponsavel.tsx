import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AutorizarResponsavel() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [student, setStudent] = useState<{ id: string; name: string; school_name: string; grade: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setError('Token invalido.'); setLoading(false); return }

    supabase
      .from('students')
      .select('id, name, school:schools(name)')
      .eq('parent_authorization_token', token)
      .eq('parent_authorized', false)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Token invalido ou ja utilizado.')
        } else {
          setStudent({
            id: data.id,
            name: data.name,
            school_name: (data as any).school?.name || '',
            grade: '',
          })
        }
        setLoading(false)
      })
  }, [token])

  const handleAuthorize = async () => {
    if (!student) return
    const { error: updateErr } = await supabase
      .from('students')
      .update({ parent_authorized: true })
      .eq('id', student.id)

    if (updateErr) {
      setError('Erro ao autorizar. Tente novamente.')
    } else {
      setAuthorized(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md text-center">
        {error ? (
          <>
            <p className="text-red text-lg font-bold mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="text-teal font-semibold">Ir para o inicio</button>
          </>
        ) : authorized ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green mx-auto mb-4" />
            <h2 className="text-2xl font-extrabold text-navy mb-2">Autorizado!</h2>
            <p className="text-gray-500 mb-6">{student?.name} agora pode usar a plataforma.</p>
            <button
              onClick={() => navigate('/responsavel/cadastro')}
              className="w-full bg-teal text-white font-bold py-3.5 rounded-xl hover:bg-teal/90 transition-colors"
            >
              Criar minha conta de responsavel
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-extrabold text-navy mb-2">Autorizar acesso</h2>
            <p className="text-gray-500 mb-4"><strong>{student?.name}</strong> quer entrar na Piramide do Bem Escolar.</p>
            {student?.school_name && <p className="text-gray-400 text-sm mb-6">Escola: {student.school_name}</p>}
            <button
              onClick={handleAuthorize}
              className="w-full bg-teal text-white font-bold py-3.5 rounded-xl hover:bg-teal/90 transition-colors"
            >
              Autorizar
            </button>
          </>
        )}
      </div>
    </div>
  )
}
