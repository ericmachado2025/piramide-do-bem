import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const profiles = [
  {
    emoji: '🎮',
    title: 'Sou Aluno',
    description: 'Participe de missoes, ganhe pontos e evolua com sua tribo.',
    to: '/cadastro',
  },
  {
    emoji: '📊',
    title: 'Sou Professor',
    description: 'Acompanhe o engajamento dos alunos e crie atividades.',
    to: '/professor/cadastro',
  },
  {
    emoji: '👨‍👩‍👧',
    title: 'Sou Responsavel',
    description: 'Acompanhe o progresso e as conquistas do seu filho.',
    to: '/responsavel/cadastro',
  },
  {
    emoji: '🏪',
    title: 'Sou Patrocinador',
    description: 'Apoie a educacao e acompanhe o impacto do seu investimento.',
    to: '/patrocinador/cadastro',
  },
]

export default function CadastroPerfil() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-start pt-8 px-4 pb-8">
      <div className="w-full max-w-lg">
        <Link
          to="/"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar</span>
        </Link>
      </div>

      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-navy">Como voce quer participar?</h1>
          <p className="text-gray-400 text-sm mt-2">Escolha seu perfil para comecar</p>
        </div>

        <div className="grid gap-4">
          {profiles.map((profile) => (
            <Link
              key={profile.title}
              to={profile.to}
              className="flex items-center gap-4 bg-white rounded-2xl shadow-md p-5 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-2 border-transparent hover:border-teal/30"
            >
              <span className="text-4xl">{profile.emoji}</span>
              <div>
                <h2 className="text-lg font-bold text-navy">{profile.title}</h2>
                <p className="text-gray-500 text-sm">{profile.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
