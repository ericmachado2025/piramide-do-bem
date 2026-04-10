import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const profiles = [
  {
    emoji: '🎮',
    title: 'Sou Aluno',
    description: 'Participe de missões, ganhe pontos e evolua com sua tribo.',
    path: '/cadastro',
  },
  {
    emoji: '📊',
    title: 'Sou Professor',
    description: 'Acompanhe o engajamento dos alunos e crie atividades.',
    path: '/professor/cadastro',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Sou Responsável',
    description: 'Acompanhe o progresso e as conquistas do seu filho.',
    path: '/responsavel/cadastro',
  },
  {
    emoji: '🏪',
    title: 'Sou Patrocinador',
    description: 'Apoie a educação e acompanhe o impacto do seu investimento.',
    path: '/patrocinador/cadastro',
  },
]

export default function CadastroPerfil() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const emailFromUrl = searchParams.get('email') || ''
  const fromGoogle = searchParams.get('from') === 'google'

  const buildQuery = () => {
    const params = new URLSearchParams()
    if (emailFromUrl) params.set('email', emailFromUrl)
    if (fromGoogle) params.set('from', 'google')
    const qs = params.toString()
    return qs ? `?${qs}` : ''
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
      <div className="w-full max-w-lg">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar</span>
        </button>
      </div>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-navy">Como você quer participar?</h1>
          <p className="text-gray-400 text-sm mt-2">Escolha seu perfil para começar</p>
        </div>

        <div className="grid gap-4">
          {profiles.map((profile) => (
            <button
              key={profile.title}
              onClick={() => navigate(`${profile.path}${buildQuery()}`)}
              className="flex items-center gap-4 bg-white rounded-2xl shadow-md p-5 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-2 border-transparent hover:border-teal/30 text-left"
            >
              <span className="text-4xl">{profile.emoji}</span>
              <div>
                <h2 className="text-lg font-bold text-navy">{profile.title}</h2>
                <p className="text-gray-500 text-sm">{profile.description}</p>
              </div>
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 text-center mt-6 px-2 leading-relaxed">
          Escolha como você quer participar agora. Se você for mais de uma coisa — aluno E professor, por exemplo — não se preocupe: depois de entrar, você pode adicionar outros papéis direto no seu perfil!
        </p>
      </div>
    </div>
  )
}
