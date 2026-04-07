import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Star, Lock, ArrowLeft, Shield, Skull } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Tribe, Character } from '../types'

type Gender = 'male' | 'female' | 'nonbinary' | ''
type Archetype = 'HERO' | 'ANTI_HERO' | 'VILLAIN' | ''

const genderOptions = [
  { value: 'male' as Gender, label: 'Masculino', icon: '♂️' },
  { value: 'female' as Gender, label: 'Feminino', icon: '♀️' },
  { value: 'nonbinary' as Gender, label: 'Nao-binario', icon: '⚧️' },
]

const iconClassToEmoji: Record<string, string> = {
  'fa-mask': '🦸',
  'fa-bolt': '⚡',
  'fa-hat-wizard': '🧙',
  'fa-jedi': '⚔️',
  'fa-wind': '🍃',
  'fa-trophy': '🏆',
  'fa-guitar': '🎸',
  'fa-dungeon': '🗡️',
}

function getTribeEmoji(iconClass: string | null): string {
  if (!iconClass) return '⭐'
  for (const [cls, emoji] of Object.entries(iconClassToEmoji)) {
    if (iconClass.includes(cls)) return emoji
  }
  return '⭐'
}

export default function EscolhaTribo() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const [gender, setGender] = useState<Gender>('')
  const [selectedTribe, setSelectedTribe] = useState<string | null>(null)
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>('')
  const [expandedTribe, setExpandedTribe] = useState<string | null>(null)
  const [tribes, setTribes] = useState<Tribe[]>([])
  const [tribeCharacters, setTribeCharacters] = useState<Record<string, Character[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // C15: Must select gender first
  const showTribes = gender !== ''

  // Map local gender to DB gender
  const genderFilter = gender === 'nonbinary' ? 'NEUTRAL' : gender === 'male' ? 'MALE' : gender === 'female' ? 'FEMALE' : ''

  // Load tribes on mount
  useEffect(() => {
    async function loadTribes() {
      const { data } = await supabase
        .from('tribes')
        .select('*')
        .order('display_order')
      if (data) setTribes(data)
      setLoading(false)
    }
    loadTribes()
  }, [])

  // Load characters when a tribe is expanded
  useEffect(() => {
    if (!expandedTribe || tribeCharacters[expandedTribe]) return
    async function loadCharacters() {
      const { data } = await supabase
        .from('characters')
        .select('*')
        .eq('tribe_id', expandedTribe!)
        .order('tier')
      if (data) {
        setTribeCharacters((prev) => ({ ...prev, [expandedTribe!]: data }))
      }
    }
    loadCharacters()
  }, [expandedTribe])

  // Get characters filtered by gender + archetype for a tribe
  const getFilteredCharacters = (tribeId: string, archetype: string) => {
    const chars = tribeCharacters[tribeId] || []
    return chars
      .filter((c) => {
        if (c.archetype !== archetype) return false
        if (c.gender !== 'NEUTRAL' && c.gender !== genderFilter) return false
        return true
      })
      .sort((a, b) => a.tier - b.tier)
  }

  // Get available archetypes for a tribe (based on gender)
  const getAvailableArchetypes = (tribeId: string): string[] => {
    const chars = tribeCharacters[tribeId] || []
    const filtered = chars.filter(
      (c) => c.gender === 'NEUTRAL' || c.gender === genderFilter
    )
    return [...new Set(filtered.map((c) => c.archetype).filter(Boolean))] as string[]
  }

  // Currently displayed characters
  const displayedCharacters = useMemo(() => {
    if (!selectedTribe || !selectedArchetype) return []
    return getFilteredCharacters(selectedTribe, selectedArchetype)
  }, [selectedTribe, selectedArchetype, gender, tribeCharacters])

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

  const handleChoose = async () => {
    if (!selectedTribe || displayedCharacters.length === 0 || !authUser) return
    setSaving(true)
    try {
      // Get student record
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', authUser.id)
        .single()
      if (!student) {
        console.error('Student record not found')
        setSaving(false)
        return
      }
      // Get tier 1 character for selected tribe+archetype+gender
      const { data: chars } = await supabase
        .from('characters')
        .select('*')
        .eq('tribe_id', selectedTribe)
        .eq('archetype', selectedArchetype)
        .eq('gender', genderFilter)
        .order('tier')
        .limit(1)
      // Update student
      await supabase
        .from('students')
        .update({
          tribe_id: selectedTribe,
          current_character_id: chars?.[0]?.id ?? null,
        })
        .eq('id', student.id)
      navigate('/personagem')
    } catch (err) {
      console.error('Error choosing tribe:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando tribos...</p>
        </div>
      </div>
    )
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
                const tribeEmoji = getTribeEmoji(tribe.icon_class)
                const accentStyle = tribe.color_hex
                  ? { backgroundColor: `${tribe.color_hex}15`, color: tribe.color_hex }
                  : {}

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
                          {tribeEmoji}
                        </span>
                        <div className={isExpanded ? 'flex-1' : ''}>
                          <h3 className="font-bold text-navy text-base leading-tight">{tribe.name}</h3>
                          <p className="text-gray-400 text-xs mt-1 leading-snug">{tribe.description}</p>
                          <span
                            className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={accentStyle}
                          >
                            {tribe.slug}
                          </span>
                        </div>
                      </div>

                      {/* Expanded: archetype selection + characters */}
                      {isExpanded && (
                        <div className="mt-5 pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                          {/* Archetype selector */}
                          <h4 className="text-sm font-bold text-navy mb-3">Escolha sua trilha:</h4>
                          <div className="flex gap-2 mb-4">
                            {archetypes.includes('HERO') && (
                              <button
                                onClick={() => setSelectedArchetype('HERO')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                  selectedArchetype === 'HERO'
                                    ? 'bg-teal text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <Shield className="w-4 h-4" />
                                Heroi
                              </button>
                            )}
                            {archetypes.includes('ANTI_HERO') && (
                              <button
                                onClick={() => setSelectedArchetype('ANTI_HERO')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                  selectedArchetype === 'ANTI_HERO'
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <Shield className="w-4 h-4" />
                                Anti-Heroi
                              </button>
                            )}
                            {archetypes.includes('VILLAIN') && (
                              <button
                                onClick={() => setSelectedArchetype('VILLAIN')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                  selectedArchetype === 'VILLAIN'
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
                                      {char.tier === 1 ? tribeEmoji : <Lock className="w-5 h-5 mx-auto text-gray-300" />}
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
                                disabled={saving}
                                className="mt-4 w-full bg-teal text-white font-bold py-3 rounded-xl hover:bg-teal/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                              >
                                {saving ? 'Salvando...' : 'Escolher esta tribo'}
                                {!saving && <ChevronRight className="w-5 h-5" />}
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
