import type { ActionType } from '../types'

export const actionTypes: ActionType[] = [
  // Original actions
  { id: 'act-1', name: 'Ajudei colega no dever', points: 10, icon: '📚', description: 'Ajudar um colega com tarefas escolares', allows_multiple: false },
  { id: 'act-2', name: 'Fui monitor de grupo de estudo', points: 20, icon: '🎓', description: 'Liderar ou participar como monitor', allows_multiple: true },
  { id: 'act-3', name: 'Acolhi aluno novo', points: 15, icon: '🤝', description: 'Receber e incluir um aluno novo na turma', allows_multiple: false },
  { id: 'act-4', name: 'Participei de projeto coletivo', points: 20, icon: '🏗️', description: 'Colaborar em projeto da turma ou escola', allows_multiple: true },
  { id: 'act-5', name: 'Mediei conflito', points: 25, icon: '⚖️', description: 'Ajudar a resolver desentendimentos', allows_multiple: false },
  { id: 'act-6', name: 'Ajudei professor', points: 15, icon: '📋', description: 'Auxiliar professor em atividade', allows_multiple: false },
  { id: 'act-7', name: 'Compartilhei material', points: 10, icon: '📤', description: 'Compartilhar material de estudo', allows_multiple: false },
  { id: 'act-8', name: 'Representei a turma', points: 30, icon: '🎤', description: 'Representar a turma em evento', allows_multiple: false },

  // B6: New expanded actions
  { id: 'act-9', name: 'Resgatei colega que faltava', points: 30, icon: '🔔', description: 'Fui atras de colega que estava faltando', allows_multiple: false },
  { id: 'act-10', name: 'Ofereci ajuda proativamente', points: 20, icon: '💡', description: 'Ofereceu ajuda antes de ser pedido', allows_multiple: false },
  { id: 'act-11', name: 'Trouxe material extra', points: 10, icon: '✏️', description: 'Lapis, borracha, caderno para colega', allows_multiple: false },
  { id: 'act-12', name: 'Inclui colega em grupo', points: 15, icon: '👥', description: 'Incluiu colega que estava sozinho', allows_multiple: false },
  { id: 'act-13', name: 'Organizei grupo de estudo', points: 25, icon: '📖', description: 'Minimo 3 participantes', allows_multiple: true },
  { id: 'act-14', name: 'Ajudei colega com necessidades especiais', points: 20, icon: '♿', description: 'Inclusao ativa de colega PcD', allows_multiple: false },
  { id: 'act-15', name: 'Limpei/organizei sala', points: 10, icon: '🧹', description: 'Organizacao voluntaria da sala', allows_multiple: false },

  // B6: "Outros" — free-text action
  { id: 'act-other', name: 'Outra boa acao', points: 10, icon: '✨', description: 'Descreva sua boa acao', allows_multiple: false },
]
