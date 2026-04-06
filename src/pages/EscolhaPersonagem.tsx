import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Star, Zap, ChevronRight } from 'lucide-react'
import { tribes, characters } from '../data/tribes'

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

export default function EscolhaPersonagem() {
  const navigate = useNavigate()

  const user = useMemo(() => {
    return JSON.parse(localStorage.getItem('piramide-user') || '{}')
  }, [])

  const tribe = useMemo(() => {
    return tribes.find((t) => t.id === user.tribeId) || tribes[0]
  }, [user.tribeId])

  // Filter characters by tribe + gender + archetype
  const tribeCharacters = useMemo(() => {
    const gender = user.gender === 'nonbinary' ? 'neutral' : (user.gender || 'neutral')
    const archetype = user.archetype || 'hero'
    return characters
      .filter((c) => {
        if (c.tribe_id !== tribe.id) return false
        if (c.archetype !== archetype) return false
        if (c.gender_filter !== 'neutral' && c.gender_filter !== gender) return false
        return true
      })
      .sort((a, b) => a.tier - b.tier)
  }, [tribe.id, user.gender, user.archetype])

  const currentPoints = user.totalPoints || 0
  const tier1Char = tribeCharacters[0]
  const nextTierPoints = tribeCharacters[1]?.min_points || 100
  const progress = Math.min((currentPoints / nextTierPoints) * 100, 100)

  const handleStart = () => {
    const updated = {
      ...user,
      currentCharacterId: tier1Char?.id,
      characterTier: 1,
      characterName: tier1Char?.name ?? '',
    }
    localStorage.setItem('piramide-user', JSON.stringify(updated))
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-bg pb-10">
      {/* Header */}
      <div className="gradient-bg px-4 pt-10 pb-14 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute bottom-2 left-6 w-12 h-12 rounded-full bg-white/5" />

        <span className="text-5xl block mb-2">{tribe.icon}</span>
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
                        <span className="text-3xl">{tribe.icon}</span>
                      ) : (
                        <Lock className="w-6 h-6 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isActive ? `bg-gradient-to-r ${tierColors[index]} text-white` : 'bg-gray-200 text-gray-400'
                        }`}>
                          TIER {char.tier}
                        </span>
                        {[...Array(char.tier)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${isActive ? 'text-yellow fill-yellow' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <h3 className={`font-bold text-lg mt-1 ${isActive ? 'text-navy' : 'text-gray-400'}`}>
                        {char.name}
                      </h3>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>
                        {char.description}
                      </p>
                      <p className={`text-xs mt-1 font-semibold ${isActive ? 'text-teal' : 'text-gray-300'}`}>
                        {char.min_points}+ pontos
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
                  {currentPoints}/{nextTierPoints} pts
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
                Faltam <strong className="text-teal">{nextTierPoints - currentPoints}</strong> pontos para o proximo tier
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
