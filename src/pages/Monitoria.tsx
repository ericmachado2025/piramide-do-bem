import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, HandHelping, GraduationCap } from 'lucide-react'
import BottomNav from '../components/BottomNav'

type Tab = 'encontrar' | 'oferecer'

const SUBJECTS = [
  'Matematica', 'Portugues', 'Historia', 'Geografia', 'Ciencias',
  'Fisica', 'Quimica', 'Biologia', 'Ingles', 'Educacao Fisica',
]

export default function Monitoria() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('encontrar')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/home')} className="p-1 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} className="text-navy" />
            </button>
            <h1 className="font-bold text-navy text-lg">Monitoria</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTab('encontrar')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'encontrar' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Encontrar Monitor
            </button>
            <button
              onClick={() => setTab('oferecer')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'oferecer' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'
              }`}
            >
              <HandHelping className="w-3.5 h-3.5" />
              Oferecer Ajuda
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-4 space-y-4">
        {/* Subject filter */}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-2 block">Filtrar por disciplina:</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject('')}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                !selectedSubject ? 'bg-teal text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </button>
            {SUBJECTS.map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSubject(selectedSubject === s ? '' : s)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all ${
                  selectedSubject === s ? 'bg-teal text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome..."
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30"
          />
        </div>

        {/* Empty state */}
        {tab === 'encontrar' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-5 h-5 text-teal" />
              <h2 className="font-bold text-navy text-sm">Monitores disponiveis</h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <span className="text-5xl block mb-3">{'\u{1F393}'}</span>
              <h3 className="text-lg font-bold text-navy mb-2">Em breve!</h3>
              <p className="text-gray-400 text-sm">
                O sistema de monitoria sera ativado quando mais alunos se cadastrarem na plataforma.
              </p>
            </div>
            <div className="bg-teal/5 border border-teal/20 rounded-xl p-3 mt-4">
              <p className="text-xs text-navy">
                <strong>Multiplicador x2!</strong> Quando a monitoria se concretizar, ambos ganham pontos em dobro.
              </p>
            </div>
          </div>
        )}

        {tab === 'oferecer' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <HandHelping className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-navy text-sm">Alunos precisando de ajuda</h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <span className="text-5xl block mb-3">{'\u{1F4DA}'}</span>
              <h3 className="text-lg font-bold text-navy mb-2">Nenhum pedido de ajuda</h3>
              <p className="text-gray-400 text-sm">
                Quando colegas pedirem ajuda, os pedidos aparecerão aqui.
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mt-4">
              <p className="text-xs text-purple-700">
                <strong>Multiplicador x2!</strong> Ajudar um colega que precisa gera pontos em dobro para voce.
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
