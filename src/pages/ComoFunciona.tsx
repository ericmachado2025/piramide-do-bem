import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import BottomNav from '../components/BottomNav'

const SECTIONS = [
  {
    title: 'Boas Acoes',
    icon: '\u{1F91D}',
    description: 'Registre boas acoes e ganhe pontos quando um colega confirmar.',
    items: [
      { name: 'Ajudei colega no dever', pts: 50 },
      { name: 'Compartilhei material de estudo', pts: 50 },
      { name: 'Ajudei com material', pts: 40 },
      { name: 'Fiz silencio pra alguem estudar', pts: 25 },
      { name: 'Limpei/organizei sala', pts: 50 },
      { name: 'Ensinei algo que sei', pts: 75 },
      { name: 'Acolhi aluno novo', pts: 75 },
      { name: 'Ajudei professor', pts: 75 },
      { name: 'Inclui colega excluido', pts: 100 },
      { name: 'Organizei atividade coletiva', pts: 100 },
      { name: 'Participei de projeto coletivo', pts: 100 },
      { name: 'Fui monitor de grupo de estudo', pts: 100 },
      { name: 'Mediei um conflito', pts: 125 },
      { name: 'Defendi colega do bullying', pts: 150 },
      { name: 'Representei a turma em evento', pts: 150 },
      { name: 'Resgatei colega que estava faltando', pts: 150 },
      { name: 'Ofereci ajuda proativamente', pts: 200, note: 'x2 multiplicador!' },
    ],
  },
  {
    title: 'Validacao',
    icon: '\u2705',
    description: 'Quando voce confirma a boa acao de um colega, ambos ganham!',
    items: [
      { name: 'Autor da boa acao', pts: 0, note: 'Recebe os pontos da acao' },
      { name: 'Quem validou (confirmou)', pts: 15, note: 'Bonus por validar' },
    ],
  },
  {
    title: 'Monitoria',
    icon: '\u{1F393}',
    description: 'Monitores ganham pontos em dobro ao ajudar colegas nas materias que dominam.',
    items: [
      { name: 'Acao de monitor', pts: 0, note: 'Pontos da acao x2!' },
      { name: 'Oferecer ajuda a pedido', pts: 0, note: 'Pontos da acao x2!' },
    ],
  },
  {
    title: 'Amizades',
    icon: '\u{1F465}',
    description: 'Adicione amigos e ambos ganham pontos quando a amizade e aceita.',
    items: [
      { name: 'Amizade aceita', pts: 10, note: 'Ambos recebem 10 pts' },
    ],
  },
  {
    title: 'Convites',
    icon: '\u{1F4E8}',
    description: 'Convide amigos para a Piramide e ganhe pontos quando eles se cadastrarem.',
    items: [
      { name: '1o ao 5o convite', pts: 25 },
      { name: '6o ao 10o convite', pts: 15 },
      { name: '11o em diante', pts: 5 },
    ],
  },
  {
    title: 'Sequencia (Streak)',
    icon: '\u{1F525}',
    description: 'Faca boas acoes todos os dias para ganhar multiplicadores!',
    items: [
      { name: '7 dias seguidos', pts: 0, note: 'Todos os pontos x1.5' },
      { name: '30 dias seguidos', pts: 0, note: 'Todos os pontos x2.0!' },
    ],
  },
  {
    title: 'Penalidades',
    icon: '\u26A0\uFE0F',
    description: 'Cuidado! Comportamentos negativos reduzem pontos.',
    items: [
      { name: 'Inatividade mensal', pts: -10, note: 'Perde 10 pts por mes parado' },
      { name: 'Denuncia falsa', pts: -100 },
    ],
  },
]

export default function ComoFunciona() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="gradient-bg px-5 pt-8 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white"><ArrowLeft /></button>
          <h1 className="text-xl font-bold text-white">Como funciona a pontuacao?</h1>
        </div>
        <p className="text-white/70 text-sm">Entenda como cada acao gera pontos na Piramide do Bem</p>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4 space-y-4">
        {SECTIONS.map(section => (
          <div key={section.title} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{section.icon}</span>
              <h2 className="font-bold text-navy text-base">{section.title}</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">{section.description}</p>
            <div className="space-y-2">
              {section.items.map(item => (
                <div key={item.name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm text-navy">{item.name}</p>
                    {item.note && <p className="text-[10px] text-teal font-semibold">{item.note}</p>}
                  </div>
                  <span className={`text-sm font-bold ${item.pts >= 0 ? 'text-teal' : 'text-red-500'}`}>
                    {item.pts > 0 ? `+${item.pts}` : item.pts < 0 ? item.pts : '--'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}