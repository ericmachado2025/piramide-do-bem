import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, HandHelping, GraduationCap } from 'lucide-react'
import BottomNav from '../components/BottomNav'

type Tab = 'encontrar' | 'oferecer'

const SUBJECTS = [
  'Matematica', 'Portugues', 'Historia', 'Geografia', 'Ciencias',
  'Fisica', 'Quimica', 'Biologia', 'Ingles', 'Educacao Fisica',
]

// Simulated available mentors
const MENTORS = [
  { id: 'm1', name: 'Maria Silva', tribe: '🦸', subjects: ['Matematica', 'Fisica'], grade: '9o A' },
  { id: 'm2', name: 'Lucas Oliveira', tribe: '⚡', subjects: ['Portugues', 'Historia'], grade: '9o A' },
  { id: 'm3', name: 'Gabriela Costa', tribe: '🧙', subjects: ['Quimica', 'Biologia'], grade: '9o B' },
  { id: 'm4', name: 'Pedro Rocha', tribe: '⚔️', subjects: ['Ingles', 'Geografia'], grade: '1o EM' },
  { id: 'm5', name: 'Ana Luisa', tribe: '🍃', subjects: ['Matematica', 'Ciencias'], grade: '9o A' },
]

// Simulated students needing help
const NEED_HELP = [
  { id: 'h1', name: 'Joao Pedro', tribe: '🐉', subjects: ['Matematica'], grade: '9o A' },
  { id: 'h2', name: 'Beatriz Santos', tribe: '🦸', subjects: ['Fisica', 'Quimica'], grade: '9o A' },
  { id: 'h3', name: 'Carlos Eduardo', tribe: '🦅', subjects: ['Portugues'], grade: '9o B' },
  { id: 'h4', name: 'Rafaela Gomes', tribe: '🎸', subjects: ['Historia', 'Geografia'], grade: '9o B' },
]

export default function Monitoria() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('encontrar')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [requestSent, setRequestSent] = useState<string | null>(null)
  const [offerSent, setOfferSent] = useState<string | null>(null)

  const filteredMentors = MENTORS.filter((m) => {
    if (selectedSubject && !m.subjects.includes(selectedSubject)) return false
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const filteredNeedHelp = NEED_HELP.filter((s) => {
    if (selectedSubject && !s.subjects.includes(selectedSubject)) return false
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

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
              onClick={() => { setTab('encontrar'); setRequestSent(null); setOfferSent(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'encontrar' ? 'bg-white text-navy shadow-sm' : 'text-gray-500'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Encontrar Monitor
            </button>
            <button
              onClick={() => { setTab('oferecer'); setRequestSent(null); setOfferSent(null) }}
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

        {/* TAB: Find Mentor */}
        {tab === 'encontrar' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <GraduationCap className="w-5 h-5 text-teal" />
              <h2 className="font-bold text-navy text-sm">Monitores disponiveis</h2>
              <span className="text-xs text-gray-400 ml-auto">{filteredMentors.length} encontrado(s)</span>
            </div>

            {filteredMentors.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <p className="text-gray-400 text-sm">Nenhum monitor encontrado para esta disciplina.</p>
              </div>
            ) : (
              filteredMentors.map((m) => (
                <div key={m.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                  <span className="text-2xl">{m.tribe}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-navy text-sm">{m.name}</p>
                    <p className="text-xs text-gray-400">{m.grade}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {m.subjects.map((s) => (
                        <span key={s} className="text-[10px] bg-teal/10 text-teal px-2 py-0.5 rounded-full font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  {requestSent === m.id ? (
                    <span className="text-xs text-green font-semibold">Enviado!</span>
                  ) : (
                    <button
                      onClick={() => setRequestSent(m.id)}
                      className="bg-teal text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-teal/90 active:scale-95"
                    >
                      Pedir ajuda
                    </button>
                  )}
                </div>
              ))
            )}

            <div className="bg-teal/5 border border-teal/20 rounded-xl p-3 mt-4">
              <p className="text-xs text-navy">
                <strong>Multiplicador x2!</strong> Quando a monitoria se concretizar, ambos ganham pontos em dobro.
              </p>
            </div>
          </div>
        )}

        {/* TAB: Offer Help */}
        {tab === 'oferecer' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <HandHelping className="w-5 h-5 text-purple-600" />
              <h2 className="font-bold text-navy text-sm">Alunos precisando de ajuda</h2>
              <span className="text-xs text-gray-400 ml-auto">{filteredNeedHelp.length} encontrado(s)</span>
            </div>

            {filteredNeedHelp.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <p className="text-gray-400 text-sm">Nenhum aluno encontrado precisando de ajuda nesta disciplina.</p>
              </div>
            ) : (
              filteredNeedHelp.map((s) => (
                <div key={s.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                  <span className="text-2xl">{s.tribe}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-navy text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.grade}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.subjects.map((sub) => (
                        <span key={sub} className="text-[10px] bg-red/10 text-red px-2 py-0.5 rounded-full font-medium">
                          Precisa: {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                  {offerSent === s.id ? (
                    <span className="text-xs text-green font-semibold">Enviado!</span>
                  ) : (
                    <button
                      onClick={() => setOfferSent(s.id)}
                      className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-500 active:scale-95"
                    >
                      Oferecer
                    </button>
                  )}
                </div>
              ))
            )}

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
