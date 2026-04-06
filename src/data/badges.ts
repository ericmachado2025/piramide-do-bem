import type { Badge } from '../types'

export const badges: Badge[] = [
  {
    id: 'badge-1',
    name: 'Primeira Ação',
    description: 'Realizou sua primeira boa ação na plataforma',
    icon: '🌟',
    criteria: 'Completar 1 ação validada',
  },
  {
    id: 'badge-2',
    name: 'Semana Perfeita',
    description: 'Realizou pelo menos uma boa ação por dia durante 7 dias seguidos',
    icon: '🔥',
    criteria: 'Ações validadas em 7 dias consecutivos',
  },
  {
    id: 'badge-3',
    name: 'Centenário',
    description: 'Alcançou 100 pontos acumulados',
    icon: '💯',
    criteria: 'Acumular 100 pontos no total',
  },
  {
    id: 'badge-4',
    name: 'Acolhedor',
    description: 'Acolheu 5 alunos novos na escola',
    icon: '🤝',
    criteria: 'Completar 5 ações do tipo "Acolhi aluno novo"',
  },
  {
    id: 'badge-5',
    name: 'Monitor',
    description: 'Foi monitor de grupo de estudo 10 vezes',
    icon: '📚',
    criteria: 'Completar 10 ações do tipo "Fui monitor de grupo de estudo"',
  },
  {
    id: 'badge-6',
    name: 'Relâmpago',
    description: 'Realizou 3 boas ações em um único dia',
    icon: '⚡',
    criteria: '3 ações validadas no mesmo dia',
  },
  {
    id: 'badge-7',
    name: 'Top 10%',
    description: 'Está entre os 10% melhores da escola em pontuação',
    icon: '🏆',
    criteria: 'Estar no top 10% de pontuação da escola',
  },
  {
    id: 'badge-8',
    name: 'Top 5%',
    description: 'Está entre os 5% melhores da escola em pontuação',
    icon: '👑',
    criteria: 'Estar no top 5% de pontuação da escola',
  },
]
