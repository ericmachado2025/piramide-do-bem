import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowLeft, Shield, Skull, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CommunityCategory, CommunityType, Community, Character } from '../types'

type Gender = 'male' | 'female' | 'nonbinary' | ''
type Archetype = 'HERO' | 'ANTI_HERO' | 'VILLAIN' | ''

const genderOptions = [
  { value: 'male' as Gender, label: 'Masculino', icon: '\u2642\uFE0F', dbValue: 'MALE' },
  { value: 'female' as Gender, label: 'Feminino', icon: '\u2640\uFE0F', dbValue: 'FEMALE' },
  { value: 'nonbinary' as Gender, label: 'Nao-binario', icon: '\u26A7\uFE0F', dbValue: 'OTHER' },
]

const iconClassToEmoji: Record<string, string> = {
  'fa-book-open': '\uD83D\uDCDA',
  'fa-film': '\uD83C\uDFAC',
  'fa-dragon': '\uD83D\uDC09',
  'fa-futbol': '\u26BD',
  'fa-dice-d20': '\uD83C\uDFB2',
  'fa-music': '\uD83C\uDFB5',
  'fa-tv': '\uD83D\uDCFA',
  'fa-users': '\uD83D\uDC65',
  'fa-mask': '\uD83E\uDDB8',
  'fa-bolt': '\u26A1',
  'fa-shield-halved': '\uD83D\uDEE1\uFE0F',
  'fa-fire': '\uD83D\uDD25',
  'fa-skull': '\uD83D\uDC80',
  'fa-robot': '\uD83E\uDD16',
  'fa-biohazard': '\u2623\uFE0F',
  'fa-hat-wizard': '\uD83E\uDDD9',
  'fa-jedi': '\u2694\uFE0F',
  'fa-x': '\u2716\uFE0F',
}

function getEmoji(iconClass: string | null): string {
  if (!iconClass) return '\u2B50'
  for (const [cls, emoji] of Object.entries(iconClassToEmoji)) {
    if (iconClass.includes(cls)) return emoji
  }
  return '\u2B50'
}

// Steps: 1=Gender, 2=Category, 3=Type, 4=Community, 5=Archetype, 6=Character
type Step = 1 | 2 | 3 | 4 | 5 | 6

export default function EscolhaTribo() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()

  const [step, setStep] = useState<Step>(1)
  const [, setGender] = useState<Gender>('')
  const [genderDb, setGenderDb] = useState('')

  const [categories, setCategories] = useState<CommunityCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory | null>(null)

  const [types, setTypes] = useState<CommunityType[]>([])
  const [selectedType, setSelectedType] = useState<CommunityType | null>(null)

  const [communities, setCommunities] = useState<Community[]>([])
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null)

  const [selectedArchetype, setSelectedArchetype] = useState<Archetype>('')

  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load categories on mount
  useEffect(() => {
    supabase.from('community_categories').select('*').eq('status', 'ACTIVE').order('display_order')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [])

  // Load types when category selected
  useEffect(() => {
    if (!selectedCategory) return
    setLoading(true)
    supabase.from('community_types').select('*').eq('category_id', selectedCategory.id).eq('status', 'ACTIVE').order('display_order')
      .then(({ data }) => { if (data) setTypes(data); setLoading(false) })
  }, [selectedCategory])

  // Load communities when type selected
  useEffect(() => {
    if (!selectedType) return
    setLoading(true)
    supabase.from('communities').select('*').eq('type_id', selectedType.id).eq('status', 'ACTIVE').order('display_order')
      .then(({ data }) => { if (data) setCommunities(data); setLoading(false) })
  }, [selectedType])

  // Load characters when community + archetype + gender selected
  useEffect(() => {
    if (!selectedCommunity || !selectedArchetype || !genderDb) return
    setLoading(true)
    supabase.from('characters').select('*, level:community_levels(*)')
      .eq('community_id', selectedCommunity.id)
      .eq('archetype', selectedArchetype)
      .eq('gender', genderDb)
      .eq('status', 'ACTIVE')
      .order('display_order')
      .then(({ data }) => {
        if (data) {
          // Sort by level tier
          const sorted = data.sort((a: Character, b: Character) =>
            (a.level?.tier ?? 0) - (b.level?.tier ?? 0)
          )
          setCharacters(sorted)
        }
        setLoading(false)
      })
  }, [selectedCommunity, selectedArchetype, genderDb])

  const handleGenderSelect = (g: Gender) => {
    setGender(g)
    const opt = genderOptions.find(o => o.value === g)
    setGenderDb(opt?.dbValue ?? 'OTHER')
    setStep(2)
  }

  const handleCategorySelect = (cat: CommunityCategory) => {
    setSelectedCategory(cat)
    setSelectedType(null)
    setSelectedCommunity(null)
    setSelectedArchetype('')
    setSelectedCharacter(null)
    setStep(3)
  }

  const handleTypeSelect = (type: CommunityType) => {
    setSelectedType(type)
    setSelectedCommunity(null)
    setSelectedArchetype('')
    setSelectedCharacter(null)
    setStep(4)
  }

  const handleCommunitySelect = (community: Community) => {
    setSelectedCommunity(community)
    setSelectedArchetype('')
    setSelectedCharacter(null)
    setStep(5)
  }

  const handleArchetypeSelect = (arch: Archetype) => {
    setSelectedArchetype(arch)
    setSelectedCharacter(null)
    setStep(6)
  }

  const handleBack = () => {
    if (step === 2) { setStep(1); setGender('') }
    else if (step === 3) { setStep(2); setSelectedCategory(null) }
    else if (step === 4) { setStep(3); setSelectedType(null) }
    else if (step === 5) { setStep(4); setSelectedCommunity(null) }
    else if (step === 6) { setStep(5); setSelectedArchetype('') }
  }

  const handleConfirm = async () => {
    if (!selectedCommunity || !selectedCharacter || !authUser) return
    setSaving(true)
    try {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', authUser.id)
        .single()
      if (!student) { setSaving(false); return }

      await supabase
        .from('students')
        .update({
          community_id: selectedCommunity.id,
          current_character_id: selectedCharacter.id,
          gender: genderDb,
        })
        .eq('id', student.id)

      navigate('/personagem')
    } catch (err) {
      console.error('Error choosing community:', err)
    } finally {
      setSaving(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    1: 'Como voce se identifica?',
    2: 'Qual universo voce curte?',
    3: `${selectedCategory?.name ?? 'Categoria'}`,
    4: `${selectedType?.name ?? 'Tipo'}`,
    5: 'Qual tipo de personagem combina com voce?',
    6: 'Escolha seu personagem!',
  }

  const stepSubtitles: Record<Step, string> = {
    1: 'Isso nos ajuda a personalizar seus personagens',
    2: 'Escolha a categoria que mais combina com voce',
    3: 'Agora escolha o tipo especifico',
    4: 'Qual comunidade voce quer participar?',
    5: 'Heroi, vilao ou anti-heroi?',
    6: 'Seu personagem inicial — evolua com pontos!',
  }

  return (
    <div className="min-h-screen bg-bg pb-8">
      {/* Header */}
      <div className="gradient-bg px-4 pt-10 pb-12 text-center relative">
        {step > 1 && (
          <button
            onClick={handleBack}
            className="absolute top-10 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
          {stepTitles[step]}
        </h1>
        <p className="text-white/70 text-sm max-w-md mx-auto">
          {stepSubtitles[step]}
        </p>
        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mt-4">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div key={s} className={`w-2 h-2 rounded-full transition-all ${
              s <= step ? 'bg-white' : 'bg-white/30'
            } ${s === step ? 'w-6' : ''}`} />
          ))}
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-2xl mx-auto">
        {/* Step 1: Gender */}
        {step === 1 && (
          <div className="grid grid-cols-3 gap-3">
            {genderOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleGenderSelect(opt.value)}
                className="bg-white rounded-2xl shadow-md p-5 text-center hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95"
              >
                <span className="text-4xl block mb-2">{opt.icon}</span>
                <span className="font-semibold text-navy text-sm">{opt.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Category */}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className="bg-white rounded-2xl shadow-md p-5 text-center hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent"
              >
                <span className="text-4xl block mb-2">{getEmoji(cat.icon_class)}</span>
                <h3 className="font-bold text-navy text-sm">{cat.name}</h3>
                <p className="text-gray-400 text-xs mt-1">{cat.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Type */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              <div className="col-span-2 text-center py-8">
                <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              </div>
            ) : types.map((type) => (
              <button
                key={type.id}
                onClick={() => handleTypeSelect(type)}
                className="bg-white rounded-2xl shadow-md p-4 text-center hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent"
              >
                <span className="text-3xl block mb-2">{getEmoji(type.icon_class)}</span>
                <h3 className="font-bold text-navy text-sm">{type.name}</h3>
                <p className="text-gray-400 text-xs mt-1">{type.description}</p>
                {type.color_hex && (
                  <span className="inline-block mt-2 w-4 h-4 rounded-full" style={{ backgroundColor: type.color_hex }} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 4: Community */}
        {step === 4 && (
          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              <div className="col-span-2 text-center py-8">
                <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              </div>
            ) : communities.map((comm) => (
              <button
                key={comm.id}
                onClick={() => handleCommunitySelect(comm)}
                className="bg-white rounded-2xl shadow-md p-4 text-center hover:shadow-lg hover:scale-[1.02] transition-all active:scale-95 border-2 border-transparent"
              >
                <span className="text-3xl block mb-2">{getEmoji(comm.icon_class)}</span>
                <h3 className="font-bold text-navy text-sm">{comm.name}</h3>
                <p className="text-gray-400 text-xs mt-1">{comm.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step 5: Archetype */}
        {step === 5 && (
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => handleArchetypeSelect('HERO')}
              className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg hover:scale-[1.01] transition-all active:scale-[0.99] border-2 border-transparent"
            >
              <div className="w-14 h-14 rounded-full bg-teal/10 flex items-center justify-center">
                <Shield className="w-7 h-7 text-teal" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-navy text-lg">Heroi</h3>
                <p className="text-gray-400 text-sm">Eu gosto de fazer o bem</p>
              </div>
            </button>
            <button
              onClick={() => handleArchetypeSelect('ANTI_HERO')}
              className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg hover:scale-[1.01] transition-all active:scale-[0.99] border-2 border-transparent"
            >
              <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Zap className="w-7 h-7 text-orange-500" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-navy text-lg">Anti-Heroi</h3>
                <p className="text-gray-400 text-sm">Eu faco o bem do meu jeito</p>
              </div>
            </button>
            <button
              onClick={() => handleArchetypeSelect('VILLAIN')}
              className="bg-white rounded-2xl shadow-md p-5 flex items-center gap-4 hover:shadow-lg hover:scale-[1.01] transition-all active:scale-[0.99] border-2 border-transparent"
            >
              <div className="w-14 h-14 rounded-full bg-purple-600/10 flex items-center justify-center">
                <Skull className="w-7 h-7 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-bold text-navy text-lg">Vilao</h3>
                <p className="text-gray-400 text-sm">Eu gosto de desafiar</p>
              </div>
            </button>
          </div>
        )}

        {/* Step 6: Character selection */}
        {step === 6 && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              </div>
            ) : characters.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-8 text-center">
                <p className="text-gray-400">Nenhum personagem disponivel para esta combinacao.</p>
                <button onClick={handleBack} className="mt-4 text-teal font-semibold">Voltar e tentar outra trilha</button>
              </div>
            ) : (
              <>
                {/* Tier 1 characters — selectable */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-sm font-bold text-navy">Personagens disponiveis (Tier 1):</h3>
                  {characters.filter(c => c.level?.tier === 1).map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacter(char)}
                      className={`w-full bg-white rounded-2xl shadow-md p-4 flex items-center gap-4 transition-all ${
                        selectedCharacter?.id === char.id
                          ? 'border-2 border-teal ring-2 ring-teal/20 scale-[1.01]'
                          : 'border-2 border-transparent hover:shadow-lg'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center text-2xl">
                        {getEmoji(selectedCommunity?.icon_class ?? null)}
                      </div>
                      <div className="text-left flex-1">
                        <h4 className="font-bold text-navy">{char.name}</h4>
                        {char.real_name && (
                          <p className="text-gray-400 text-xs">{char.real_name}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-0.5">{char.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Evolution preview */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Progressao na comunidade:</h4>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[1, 2, 3, 4, 5].map(tier => {
                      const tierChars = characters.filter(c => c.level?.tier === tier)
                      return (
                        <div key={tier} className={`flex-shrink-0 w-20 text-center rounded-xl p-2 ${
                          tier === 1 ? 'bg-teal/10 border border-teal/30' : 'bg-white border border-gray-100 opacity-50'
                        }`}>
                          <div className="text-xs font-bold text-gray-600">Tier {tier}</div>
                          <div className="text-[10px] text-gray-400">{tierChars.length} chars</div>
                          <div className="text-[10px] text-teal font-semibold">
                            {[0, 100, 300, 600, 1000][tier - 1]}+ pts
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Confirm button */}
                <button
                  onClick={handleConfirm}
                  disabled={!selectedCharacter || saving}
                  className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                    selectedCharacter && !saving
                      ? 'bg-teal text-white hover:bg-teal/90 active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? 'Salvando...' : 'Confirmar personagem'}
                  {!saving && <ChevronRight className="w-5 h-5" />}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
