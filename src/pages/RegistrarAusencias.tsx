import type {} from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar } from 'lucide-react'

export default function RegistrarAusencias() {
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/dashboard')} className="p-1 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} className="text-navy" />
            </button>
            <h1 className="font-bold text-navy text-lg">Registrar Ausencias</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{today}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <span className="text-5xl block mb-3">{'\u{1F4CB}'}</span>
          <h2 className="text-lg font-bold text-navy mb-2">Em construcao</h2>
          <p className="text-gray-400 text-sm">
            O sistema de registro de ausencias sera ativado quando turmas e alunos estiverem vinculados ao professor.
          </p>
          <p className="text-gray-400 text-xs mt-3">
            Quando disponivel, voce podera marcar presenca/ausencia de cada aluno e alertas automaticos serao enviados para alunos com faltas consecutivas.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full bg-teal text-white font-bold py-3.5 rounded-xl hover:bg-teal/90 transition-all"
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )
}
