import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Star, Lock, ArrowLeft, Shield, Skull } from 'lucide-react'
import { tribes, characters } from '../data/tribes'

type Gender = 'male' | 'female' | 'nonbinary' | ''
type Archetype = 'hero' | 'villain' | ''

const universeColors: Record<string, string> = {
  Marvel: 'bg-red/10 text-red',
  'Dragon Ball': 'bg-yellow/10 text-yellow-700',
  'Harry Potter': 'bg-purple-100 text-purple-700',
  'Star Wars': 'bg-blue-100 text-blue-700',
  Naruto: 'bg-orange-100 text-orange-700',
  Esportes: 'bg-green/10 text-green-700',
  Musica: 'bg-pink-100 text-pink-700',
  Fantasia: 'bg-indigo-100 text-indigo-700',
}

const genderOptions = [
  { value: 'male' as Gender, label: 'Masculino', icon: '♂️' },
  { value: 'female' as Gender, label: 'Feminino', icon: '♀️' },
  { value: 'nonbinary' as Gender, label: 'Nao-binario', icon: '⚧️' },
]

export default function EscolhaTribo() {
  const navigate = useNavigate()
  const [gender, setGender] = useState<Gender>('')
  const [selectedTribe, setSelectedTribe] = useState<string | null>(null)
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>('')
  const [expandedTribe, setExpandedTribe] = useState<string | null>(null)

  // C15: Must select gender first
  const showTribes = gender !== ''

  // Get characters filtered by gender + archetype for a tribe
  const getFilteredCharacters = (tribeId: string, archetype: string) => {
    const genderFilter = gender === 'nonbinary' ? 'neutral' : gender
    return characters
      .filter((c) => {
        if (c.tribe_id !== tribeId) return false
        if (c.archetype !== archetype) return false
        // Show characters that match gender OR are neutral
        if (c.gender_filter !== 'neutral' && c.gender_filter !== genderFilter) return false
        return true
      })
      .sort((a, b) => a.tier - b.tier)
  }

  // Get available archetypes for a tribe (based on gender)
  const getAvailableArchetypes = (tribeId: string) => {
    const genderFilter = gender === 'nonbinary' ? 'neutral' : gender
    const tribeChars = characters.filter((c) =>
      c.tribe_id === tribeId &&
      (c.gender_filter === 'neutral' || c.gender_filter === genderFilter)
    )
    const archetypes = [...new Set(tribeChars.map((c) => c.archetype))]
    return archetypes
  }

  // Currently displayed characters
  const displayedCharacters = useMemo(() => {
    if (!selectedTribe || !selectedArchetype) return []
    return getFilteredCharacters(selectedTribe, selectedArchetype)
  }, [selectedTribe, selectedArchetype, gender])

  const handleTribeClick = (tribeId: string) => {
    if (expandedTribe === tribeId) {
      setExpandedTribe(null)
      setSelectedArchetype('')
    } else {
      setExpandedTribe(tribeId)
      setSelectedTribe(tribeId)
      setSelectedArchetype('')
    }
  }

  const handleChoose = () => {
    if (!selectedTribe || displayedCharacters.length === 0) return
    const tribe = tribes.find((t) => t.id === selectedTribe)
    const user = JSON.parse(localStorage.getItem('piramide-user') || '{}')
    user.tribeId = selectedTribe
    user.tribeName = tribe?.name
    user.tribeEmoji = tribe?.icon
    user.gender = gender
    user.archetype = selectedArchetype
    // Store the first character ID for this path
    const firstChar = displayedCharacters[0]
    if (firstChar) {
      user.characterName = firstChar.name
      user.characterTier = 1
    }
    localStorage.setItem('piramide-user', JSON.stringify(user))
    navigate('/personagem')
  }

  return (
    <div className="min-h-screen bg-bg pb-8">
      {/* Header */}
      <div className="gradient-bg px-4 pt-10 pb-12 text-center relative">
        <button
          onClick={() => navigate('/cadastro')}
          className="absolute top-10 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
          {!showTribes ? 'Como voce se identifica?' : 'Escolha sua Tribo!'}
        </h1>
        <p className="text-white/70 text-base max-w-md mx-auto">
          {!showTribes
            ? 'Isso nos ajuda a personalizar seus personagens'
            : 'Cada tribo tem herois, viloes e anti-herois. Escolha!'
          }
        </p>
      </div>

      <div className="px-4 -mt-6 max-w-2xl mx-auto">
        {/* C15: Gender selection */}
        {!showTribes && (
          <div className="grid grid-cols-3 gap-3">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGender(opt.value)}
                className="bg-white rounded-2xl shadow-md p-5 text-center hover:shadow-lg hover:scale-[1.02] transition-all border-2 border-transparent active:scale-95"
              >
                <span className="text-4xl block mb-2">{opt.icon}</span>
                <span className="font-semibold text-navy text-sm">{opt.label}</span>
              </button>
            ))}
            <button
              onClick={() => setGender('nonbinary')}
              className="col-span-3 bg-white rounded-2xl shadow-md p-3 text-center hover:shadow-lg transition-all border-2 border-transparent"
            >
              <span className="text-gray-500 text-sm">Prefiro nao dizer</span>
            </button>
          </div>
        )}

        {/* Tribe grid */}
        {showTribes && (
          <>
            {/* Gender badge */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <button
                onClick={() => { setGender(''); setExpandedTribe(null); setSelectedArchetype('') }}
                className="text-xs bg-white rounded-full px-3 py-1.5 shadow-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                {genderOptions.find((g) => g.value === gender)?.icon}{' '}
                {genderOptions.find((g) => g.value === gender)?.label || 'Neutro'} — trocar
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {tribes.map((tribe) => {
                const isExpanded = expandedTribe === tribe.id
                const isSelected = selectedTribe === tribe.id
                const archetypes = getAvailableArchetypes(tribe.id)
                const colorClass = universeColors[tribe.universe] || 'bg-gray-100 text-gray-600'

                return (
                  <div
                    key={tribe.id}
                    className={`${isExpanded ? 'col-span-2 md:col-span-3' : ''} transition-all duration-300`}
                  >
                    <div
                      onClick={() => handleTribeClick(tribe.id)}
                      className={`bg-white rounded-2xl shadow-md p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                        isSelected ? 'border-2 border-teal ring-2 ring-teal/20' : 'border-2 border-transparent'
                      }`}
                    >
                      <div className={`${isExpanded ? 'flex items-center gap-4' : 'text-center'}`}>
                        <span className={`${isExpanded ? 'text-5xl' : 'text-5xl block mb-2'}`}>
                          {tribe.icon}
                        </span>
                        <div className={isExpanded ? 'flex-1' : ''}>
                          <h3 className="font-bold text-navy text-base leading-tight">{tribe.name}</h3>
                          <p className="text-gray-400 text-xs mt-1 leading-snug">{tribe.description}</p>
                          <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
                            {tribe.universe}
                          </span>
                        </div>
                      </div>

                      {/* Expanded: archetype selection + characters */}
                      {isExpanded && (
                        <div className="mt-5 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                          {/* Archetype selector */}
                          <h4 className="text-sm font-bold text-navy mb-3">Escolha sua trilha:</h4>
                          <div className="flex gap-2 mb-4">
                            {archetypes.includes('hero') && (
                              <button
                                onClick={() => setSelectedArchetype('hero')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                  selectedArchetype === 'hero'
                                    ? 'bg-teal text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <Shield className="w-4 h-4" />
                                Heroi
                              </button>
                            )}
                            {archetypes.includes('villain') && (
                              <button
                                onClick={() => setSelectedArchetype('villain')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                  selectedArchetype === 'villain'
                                    ? 'bg-purple-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <Skull className="w-4 h-4" />
                                Vilao
                              </button>
                            )}
                          </div>

                          {/* Characters display */}
                          {selectedArchetype && displayedCharacters.length > 0 && (
                            <>
                              <h4 className="text-sm font-bold text-navy mb-3 flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow" />
                                Personagens (5 tiers)
                              </h4>
                              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                                {displayedCharacters.map((char) => (
                                  <div
                                    key={char.id}
                                    className={`flex-shrink-0 w-28 rounded-xl p-3 text-center ${
                                      char.tier === 1
                                        ? 'bg-teal/10 border-2 border-teal/30'
                                        : 'bg-gray-50 border border-gray-100 opacity-60'
                                    }`}
                                  >
                                    <div className="text-2xl mb-1">
                                      {char.tier === 1 ? tribe.icon : <Lock className="w-5 h-5 mx-auto text-gray-300" />}
                                    </div>
                                    <div className="text-xs font-bold text-navy truncate">{char.name}</div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                      Tier {char.tier} | {char.min_points}+ pts
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={handleChoose}
                                className="mt-4 w-full bg-teal text-white font-bold py-3 rounded-xl hover:bg-teal/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                              >
                                Escolher esta tribo
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </>
                          )}

                          {selectedArchetype && displayedCharacters.length === 0 && (
                            <p className="text-gray-400 text-sm text-center py-4">
                              Nenhum personagem disponivel para esta combinacao.
                            </p>
                          )}

                          {!selectedArchetype && (
                            <p className="text-gray-400 text-sm text-center py-2">
                              Selecione uma trilha acima para ver os personagens
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
