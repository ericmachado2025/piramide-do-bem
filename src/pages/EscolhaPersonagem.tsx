import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Star, Zap, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getCharacterDisplayName, getTierLabel } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'
import type { Tribe, Character, Student } from '../types'

const tierColors = [
  'from-teal to-green',
  'from-blue-400 to-blue-600',
  'from-purple-400 to-purple-600',
  'from-yellow to-orange-500',
  'from-red to-pink-600',
]

const tierBgColors = [
  'bg-teal/10 border-teal/30',
  'bg-blue-50 border-blue-200',
  'bg-purple-50 border-purple-200',
  'bg-yellow/10 border-yellow/30',
  'bg-red/10 border-red/30',
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

export default function EscolhaPersonagem() {
  const navigate = useNavigate()
  const { user: authUser } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [tribe, setTribe] = useState<Tribe | null>(null)
  const [tribeCharacters, setTribeCharacters] = useState<Character[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authUser) return
    async function loadData() {
      // Get student with tribe and character
      const { data: studentData } = await supabase
        .from('students')
        .select('*, community:communities(*), character:characters(*)')
        .eq('user_id', authUser!.id)
        .single()

      if (!studentData || !studentData.community_id) {
        navigate('/tribo')
        return
      }

      setStudent(studentData)
      setTribe(studentData.community as Tribe)

      // Load characters for the tribe matching student's character archetype and gender
      const currentChar = studentData.character as Character | null
      const archetype = currentChar?.archetype || 'HERO'
      const gender = currentChar?.gender || 'NEUTRAL'

      const { data: chars } = await supabase
        .from('characters')
        .select('*, level:community_levels(*)')
        .eq('community_id', studentData.community_id)
        .eq('archetype', archetype)
        .eq('status', 'ACTIVE')
        .order('display_order')

      // Filter by gender: show matching gender or OTHER (neutral)
      const filtered = (chars || []).filter(
        (c) => c.gender === 'OTHER' || c.gender === gender
      )
      // Sort by tier
      filtered.sort((a: Character, b: Character) =>
        (a.level?.tier ?? 0) - (b.level?.tier ?? 0)
      )
      setTribeCharacters(filtered)
      setLoading(false)
    }
    loadData()
  }, [authUser])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Carregando personagens...</p>
        </div>
      </div>
    )
  }

  if (!tribe || !student) return null

  const tribeEmoji = getTribeEmoji(tribe.icon_class)
  const currentPoints = student.total_points || 0
  const tier1Char = tribeCharacters[0]
  const nextTierPoints = tribeCharacters[1]?.level?.min_points || 1000
  const progress = nextTierPoints > 0 ? Math.min((currentPoints / nextTierPoints) * 100, 100) : 0
  const nextLevel = tribeCharacters[1]?.level
  const nextLevelDisplay = nextLevel ? `${nextLevel.name} (${getTierLabel(nextLevel.tier)})` : 'Aprendiz'

  const handleStart = () => {
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-bg pb-10">
      {/* Header */}
      <div className="gradient-bg px-4 pt-10 pb-14 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute bottom-2 left-6 w-12 h-12 rounded-full bg-white/5" />

        <span className="text-5xl block mb-2">{tribeEmoji}</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-1">
          Conheca seus personagens!
        </h1>
        <p className="text-white/70 text-sm max-w-sm mx-auto">
          Tribo: <strong className="text-white">{tribe.name}</strong> — Evolua fazendo boas acoes!
        </p>
      </div>

      {/* Characters */}
      <div className="px-4 -mt-8 max-w-lg mx-auto">
        {tribeCharacters.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <p className="text-gray-500">Nenhum personagem encontrado. Volte e escolha outra tribo.</p>
            <button
              onClick={() => navigate('/tribo')}
              className="mt-4 bg-teal text-white font-bold py-2 px-6 rounded-xl"
            >
              Voltar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tribeCharacters.map((char, index) => {
              const isActive = index === 0

              return (
                <div
                  key={char.id}
                  className={`relative rounded-2xl border-2 p-4 transition-all duration-300 ${
                    isActive
                      ? `${tierBgColors[index]} shadow-lg`
                      : 'bg-white/60 border-gray-200 opacity-70'
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-3 left-4 bg-green text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                      <Zap className="w-3 h-3" />
                      VOCE ESTA AQUI
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isActive
                          ? `bg-gradient-to-br ${tierColors[index]} shadow-md`
                          : 'bg-gray-200'
                      }`}
                    >
                      {isActive ? (
                        <span className="text-3xl">{tribeEmoji}</span>
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isActive ? `bg-gradient-to-r ${tierColors[index]} text-white` : 'bg-gray-200 text-gray-400'
                        }`}
                          style={char.level?.color_hex ? { backgroundColor: isActive ? char.level.color_hex : undefined } : undefined}
                        >
                          {char.level?.name || `Tier ${char.level?.tier ?? 0}`} ({getTierLabel(char.level?.tier ?? 1)})
                        </span>
                        {[...Array((char.level?.tier ?? 0))].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${isActive ? 'text-yellow fill-yellow' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <h3 className={`font-bold text-lg mt-1 ${isActive ? 'text-navy' : 'text-gray-400'}`}>
                        {getCharacterDisplayName(char, char.level)}
                      </h3>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>
                        {char.description}
                      </p>
                      <p className={`text-xs mt-1 font-semibold ${isActive ? 'text-teal' : 'text-gray-300'}`}>
                        {(char.level?.min_points ?? 0).toLocaleString('pt-BR')}+ pontos
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Progress bar */}
        {tribeCharacters.length > 0 && (
          <>
            <div className="mt-8 bg-white rounded-2xl shadow-md p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold text-navy">Seu progresso</span>
                <span className="text-sm font-bold text-teal">
                  {currentPoints.toLocaleString('pt-BR')}/{nextTierPoints.toLocaleString('pt-BR')} pts
                </span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal to-green rounded-full transition-all duration-700 relative"
                  style={{ width: `${Math.max(progress, 3)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 shimmer rounded-full" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">
                Faltam <strong className="text-teal">{(nextTierPoints - currentPoints).toLocaleString('pt-BR')}</strong> pontos para <strong>{nextLevelDisplay}</strong>
              </p>
            </div>

            <button
              onClick={handleStart}
              className="mt-6 w-full bg-gradient-to-r from-teal to-green text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Comecar minha jornada como {tier1Char?.name || 'Heroi'}!
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
