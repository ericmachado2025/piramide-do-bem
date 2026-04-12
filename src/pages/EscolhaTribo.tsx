import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowLeft, Shield, Skull, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getCharacterDisplayName, getTierLabel } from '../lib/database'
import { generateCharacterAvatar } from '../lib/avatarGenerator'
import { calcAge } from '../lib/utils'
import { useAuth } from '../contexts/AuthContext'
import type { CommunityCategory, CommunityType, Community, Character } from '../types'

type Gender = 'male' | 'female' | 'nonbinary' | ''
type Archetype = 'HERO' | 'ANTI_HERO' | 'VILLAIN' | 'NEUTRAL' | ''

const genderOptions = [
  { value: 'male' as Gender, label: 'Masculino', icon: '\u2642\uFE0F', dbValue: 'MALE' },
  { value: 'female' as Gender, label: 'Feminino', icon: '\u2640\uFE0F', dbValue: 'FEMALE' },
  { value: 'nonbinary' as Gender, label: 'Não-binário', icon: '\u26A7\uFE0F', dbValue: 'OTHER' },
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
  'fa-x': '\uD83E\uDDB8',
  'fa-a': '\u2728',
  'fa-4': '\uD83D\uDC65',
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
  const [studentAge, setStudentAge] = useState<number | null>(null)
  const [availableArchetypes, setAvailableArchetypes] = useState<Set<string>>(new Set())

  // Load categories (only those with characters) + student age on mount
  useEffect(() => {
    async function loadCategories() {
      // Get communities that have characters
      const { data: charComms } = await supabase.from('characters').select('community_id').eq('status', 'ACTIVE')
      const commIds = new Set((charComms || []).map((c: { community_id: string }) => c.community_id))
      // Get types for those communities
      const { data: comms } = await supabase.from('communities').select('id, type_id').eq('status', 'ACTIVE')
      const typeIds = new Set((comms || []).filter(c => commIds.has(c.id)).map((c: { type_id: string }) => c.type_id))
      // Get categories for those types
      const { data: types } = await supabase.from('community_types').select('id, category_id').eq('status', 'ACTIVE')
      const catIds = new Set((types || []).filter(t => typeIds.has(t.id)).map((t: { category_id: string }) => t.category_id))
      // Now load categories filtered
      const { data: cats } = await supabase.from('community_categories').select('*').eq('status', 'ACTIVE').order('display_order')
      if (cats) setCategories(cats.filter(c => catIds.has(c.id)))
    }
    loadCategories()
    if (authUser) {
      supabase.from('students').select('birth_date').eq('user_id', authUser.id).single()
        .then(({ data }) => { if (data?.birth_date) setStudentAge(calcAge(data.birth_date)) })
    }
  }, [authUser])

  // Load available archetypes when community is selected
  useEffect(() => {
    if (!selectedCommunity?.id) { setAvailableArchetypes(new Set()); return }
    console.log('[EscolhaTribo] Loading archetypes for community:', selectedCommunity.id, selectedCommunity.name)
    supabase.from('characters').select('archetype').eq('community_id', selectedCommunity.id).eq('status', 'ACTIVE')
      .then(({ data, error }) => {
        if (error) {
          console.error('[EscolhaTribo] Archetypes query error:', error)
          return
        }
        console.log('[EscolhaTribo] Archetypes loaded:', data?.length, data)
        if (data) setAvailableArchetypes(new Set(data.map((c: { archetype: string }) => c.archetype)))
      })
  }, [selectedCommunity])

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
    if (!selectedCommunity?.id || !selectedArchetype || !genderDb) return
    setLoading(true)
    console.log('[EscolhaTribo] Loading characters:', { community: selectedCommunity.id, archetype: selectedArchetype, gender: genderDb })
    async function loadCharacters() {
      // First try with gender filter
      let { data } = await supabase.from('characters').select('*, level:community_levels(*)')
        .eq('community_id', selectedCommunity!.id)
        .eq('archetype', selectedArchetype)
        .eq('gender', genderDb)
        .eq('status', 'ACTIVE')
        .order('display_order')

      // Fallback 1: if no results with this gender, try without gender filter
      if (!data || data.length === 0) {
        console.log('[EscolhaTribo] No characters with gender filter, retrying without...')
        const fallback = await supabase.from('characters').select('*, level:community_levels(*)')
          .eq('community_id', selectedCommunity!.id)
          .eq('archetype', selectedArchetype)
          .eq('status', 'ACTIVE')
          .order('display_order')
        data = fallback.data
      }

      // Fallback 2: if still no results, try without archetype filter (community may use different archetypes)
      if (!data || data.length === 0) {
        console.log('[EscolhaTribo] No characters with archetype filter, loading all from community...')
        const fallback2 = await supabase.from('characters').select('*, level:community_levels(*)')
          .eq('community_id', selectedCommunity!.id)
          .eq('status', 'ACTIVE')
          .order('display_order')
        data = fallback2.data
      }

      console.log('[EscolhaTribo] Characters loaded:', data?.length)
      if (data) {
        const sorted = data.sort((a: Character, b: Character) =>
          (a.level?.tier ?? 0) - (b.level?.tier ?? 0)
        )
        setCharacters(sorted)
      }
      setLoading(false)
    }
    loadCharacters()
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

  const [confirmError, setConfirmError] = useState('')

  const handleConfirm = async () => {
    console.log('handleConfirm called', { selectedCommunity, selectedCharacter, authUser })
    if (!selectedCommunity || !selectedCharacter || !authUser) {
      setConfirmError('Selecione um personagem antes de confirmar.')
      return
    }
    setSaving(true)
    setConfirmError('')
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const uid = currentUser?.id || authUser.id

      let { data: student, error: studentErr } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!student && !studentErr) {
        const { data: newStudent, error: insertErr } = await supabase
          .from('students')
          .insert({ user_id: uid, total_points: 0, available_points: 0, redeemed_points: 0, role: 'student' })
          .select('id')
          .single()
        if (insertErr) {
          console.error('Student insert fallback error:', insertErr)
          setConfirmError('Erro ao carregar seu perfil. Tente novamente.')
          setSaving(false)
          return
        }
        student = newStudent
      }

      if (studentErr || !student) {
        console.error('Student fetch error:', studentErr)
        setConfirmError('Erro ao carregar seu perfil. Tente novamente.')
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase
        .from('students')
        .update({
          community_id: selectedCommunity.id,
          current_character_id: selectedCharacter.id,
          gender: genderDb,
        })
        .eq('id', student.id)

      if (updateError) {
        console.error('handleConfirm updateError:', updateError)
        setConfirmError(`Erro ao salvar: ${updateError.message}`)
        setSaving(false)
        return
      }
      navigate('/personagem')
    } catch (err) {
      console.error('Error choosing community:', err)
      setConfirmError('Erro inesperado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const stepTitles: Record<Step, string> = {
    1: 'Agora, vamos escolher um personagem que representa você?',
    2: 'Qual é o seu universo? ⚡',
    3: 'Qual universo você curte mais?',
    4: 'Agora escolha a sua tribo!',
    5: 'Qual tipo de personagem combina com você?',
    6: 'Esse é você por agora — mas cada ação sua te leva mais longe! 🚀',
  }

  const stepSubtitles: Record<Step, string> = {
    1: 'Como seus personagens aparecem?',
    2: 'Com qual dessas tribos você se identifica?',
    3: 'Agora escolha o tipo específico',
    4: '',
    5: '',
    6: 'Escolha seu personagem inicial',
  }

  return (
    <div className="min-h-screen bg-bg pb-8">
      {/* Header */}
      <div className="gradient-bg px-4 pt-10 pb-12 text-center relative">
        <button
          onClick={() => step > 1 ? handleBack() : navigate('/home')}
          className="absolute top-10 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
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
          <div className={`grid gap-3 ${studentAge !== null && studentAge < 13 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {genderOptions.filter(opt => opt.value !== 'nonbinary' || studentAge === null || studentAge >= 13).map((opt) => (
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
            ) : types.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl shadow-md p-8 text-center">
                <p className="text-gray-400">Nenhum tipo disponivel nesta categoria.</p>
                <button onClick={handleBack} className="mt-4 text-teal font-semibold">Voltar e escolher outra categoria</button>
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
            ) : communities.length === 0 ? (
              <div className="col-span-2 bg-white rounded-2xl shadow-md p-8 text-center">
                <p className="text-gray-400">Nenhuma comunidade disponivel neste tipo.</p>
                <button onClick={handleBack} className="mt-4 text-teal font-semibold">Voltar e escolher outro tipo</button>
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
            {[
              { value: 'HERO' as Archetype, icon: Shield, label: 'Herói', desc: 'Eu gosto de fazer o bem', color: 'teal' },
              { value: 'ANTI_HERO' as Archetype, icon: Zap, label: 'Anti-Herói', desc: 'Eu faço o bem do meu jeito', color: 'orange-500' },
              { value: 'VILLAIN' as Archetype, icon: Skull, label: 'Vilão', desc: 'Eu gosto de desafiar', color: 'purple-600' },
              { value: 'NEUTRAL' as unknown as Archetype, icon: Shield, label: 'Neutro', desc: 'Eu sigo meu próprio caminho', color: 'gray-500' },
            ].map(arch => {
              const isAvailable = availableArchetypes.has(arch.value as string)
              return (
                <button key={arch.value as string}
                  onClick={() => isAvailable && handleArchetypeSelect(arch.value)}
                  disabled={!isAvailable}
                  className={`bg-white rounded-2xl shadow-md p-5 flex items-center gap-4 transition-all border-2 border-transparent ${
                    isAvailable ? 'hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]' : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-full bg-${arch.color}/10 flex items-center justify-center`}>
                    <arch.icon className={`w-7 h-7 text-${arch.color}`} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-navy text-lg">{arch.label}</h3>
                    <p className="text-gray-500 text-sm">{arch.desc}</p>
                    {!isAvailable && <p className="text-xs text-gray-400 mt-0.5">(não disponível nesta tribo)</p>}
                  </div>
                </button>
              )
            })}
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
                  <h3 className="text-sm font-bold text-navy">Personagens disponiveis (Nivel 1):</h3>
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
                      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0"
                        dangerouslySetInnerHTML={{ __html: generateCharacterAvatar({
                          name: char.name,
                          archetype: char.archetype,
                          tier: char.level?.tier ?? 1,
                          communityColor: selectedCommunity?.color_hex ?? null
                        }, 48) }}
                      />
                      <div className="text-left flex-1">
                        <h4 className="font-bold text-navy">{getCharacterDisplayName(char, char.level)}</h4>
                        {char.real_name && (
                          <p className="text-gray-400 text-xs">{char.real_name}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-0.5">{char.description}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {confirmError && <p className="text-sm text-red text-center mb-2">{confirmError}</p>}
                {/* Confirm button — right after character selection */}
                <button
                  onClick={handleConfirm}
                  disabled={!selectedCharacter || saving}
                  className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 mb-6 ${
                    selectedCharacter && !saving
                      ? 'bg-teal text-white hover:bg-teal/90 active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? 'Salvando...' : `Comecar minha jornada como ${selectedCharacter?.name || 'Heroi'}!`}
                  {!saving && <ChevronRight className="w-5 h-5" />}
                </button>

                {/* Evolution preview — below the confirm button */}
                <p className="text-xs text-gray-400 text-center mb-3">Confira abaixo as possibilidades de evolucao do seu personagem:</p>
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Progressao na comunidade:</h4>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {[1, 2, 3, 4, 5].map(tier => {
                      const tierChars = characters.filter(c => c.level?.tier === tier)
                      const tierLevel = tierChars[0]?.level
                      const levelName = tierLevel?.name || getTierLabel(tier)
                      const label = getTierLabel(tier)
                      return (
                        <div key={tier} className={`flex-shrink-0 w-24 text-center rounded-xl p-2 ${
                          tier === 1 ? 'bg-teal/10 border border-teal/30' : 'bg-white border border-gray-100 opacity-50'
                        }`}>
                          <div className="flex justify-center mb-1"
                            dangerouslySetInnerHTML={{ __html: generateCharacterAvatar({
                              name: tierChars[0]?.name ?? '?',
                              archetype: tierChars[0]?.archetype ?? null,
                              tier,
                              communityColor: selectedCommunity?.color_hex ?? null
                            }, 36) }}
                          />
                          <div className="text-xs font-bold text-gray-600">{levelName}</div>
                          <div className="text-[10px] text-gray-400">({label})</div>
                          <div className="text-[10px] text-teal font-semibold">
                            {[0, 1000, 5000, 15000, 50000][tier - 1].toLocaleString('pt-BR')}+ pts
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
