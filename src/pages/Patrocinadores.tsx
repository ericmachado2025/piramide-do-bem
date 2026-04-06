import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Tag, Star, ChevronRight } from 'lucide-react'
import BottomNav from '../components/BottomNav'

interface Sponsor {
  id: string
  name: string
  category: string
  categoryIcon: string
  address: string
  city: string
  benefits: { tier: number; description: string; discount: number }[]
}

const SPONSORS: Sponsor[] = [
  {
    id: 'sp1',
    name: 'Papelaria Criativa',
    category: 'Papelaria',
    categoryIcon: '✏️',
    address: 'Rua das Flores, 123',
    city: 'Porto Alegre - RS',
    benefits: [
      { tier: 1, description: '5% em material escolar', discount: 5 },
      { tier: 2, description: '10% em material escolar', discount: 10 },
      { tier: 3, description: '15% em material escolar + borracha gratis', discount: 15 },
      { tier: 4, description: '20% em material escolar + kit escolar', discount: 20 },
      { tier: 5, description: '25% em tudo + mochila de brinde', discount: 25 },
    ],
  },
  {
    id: 'sp2',
    name: 'Lanchonete do Bairro',
    category: 'Alimentacao',
    categoryIcon: '🍔',
    address: 'Av. Central, 456',
    city: 'Porto Alegre - RS',
    benefits: [
      { tier: 1, description: '5% no lanche', discount: 5 },
      { tier: 2, description: '10% no lanche', discount: 10 },
      { tier: 3, description: '15% + suco gratis', discount: 15 },
      { tier: 4, description: '20% + sobremesa gratis', discount: 20 },
      { tier: 5, description: '25% + combo especial', discount: 25 },
    ],
  },
  {
    id: 'sp3',
    name: 'CineMax',
    category: 'Entretenimento',
    categoryIcon: '🎬',
    address: 'Shopping Centro, Loja 42',
    city: 'Porto Alegre - RS',
    benefits: [
      { tier: 1, description: '5% no ingresso', discount: 5 },
      { tier: 2, description: '10% no ingresso', discount: 10 },
      { tier: 3, description: '15% + pipoca pequena', discount: 15 },
      { tier: 4, description: '20% + combo pipoca', discount: 20 },
      { tier: 5, description: '25% + sessao VIP', discount: 25 },
    ],
  },
  {
    id: 'sp4',
    name: 'Livraria Saber',
    category: 'Livraria',
    categoryIcon: '📚',
    address: 'Rua do Conhecimento, 789',
    city: 'Porto Alegre - RS',
    benefits: [
      { tier: 1, description: '5% em livros', discount: 5 },
      { tier: 2, description: '10% em livros', discount: 10 },
      { tier: 3, description: '15% + marcador de paginas', discount: 15 },
      { tier: 4, description: '20% + livro de bolso gratis', discount: 20 },
      { tier: 5, description: '25% + livro a escolha', discount: 25 },
    ],
  },
  {
    id: 'sp5',
    name: 'Arena Sports',
    category: 'Esportes',
    categoryIcon: '⚽',
    address: 'Parque Esportivo, 321',
    city: 'Porto Alegre - RS',
    benefits: [
      { tier: 1, description: '5% na mensalidade', discount: 5 },
      { tier: 2, description: '10% na mensalidade', discount: 10 },
      { tier: 3, description: '15% + 1 aula experimental', discount: 15 },
      { tier: 4, description: '20% + camiseta', discount: 20 },
      { tier: 5, description: '25% + kit esportivo', discount: 25 },
    ],
  },
]

const CATEGORIES = ['Todos', 'Papelaria', 'Alimentacao', 'Entretenimento', 'Livraria', 'Esportes']

export default function Patrocinadores() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [expandedSponsor, setExpandedSponsor] = useState<string | null>(null)

  // Get current user tier (prototype)
  const userTier = 2

  const filtered = selectedCategory === 'Todos'
    ? SPONSORS
    : SPONSORS.filter((s) => s.category === selectedCategory)

  return (
    <div className="min-h-screen bg-bg pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#F59E0B] to-[#F97316] px-5 pt-10 pb-8 rounded-b-3xl">
        <div className="max-w-md mx-auto">
          <button onClick={() => navigate('/home')} className="flex items-center gap-1 text-white/80 hover:text-white mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-white">Patrocinadores</h1>
          <p className="text-white/80 text-sm mt-1">
            Descontos exclusivos baseados no seu Tier!
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <Star className="w-4 h-4 text-white fill-white" />
            <span className="text-white font-bold text-sm">Seu Tier: {userTier}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4 space-y-4">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 text-xs px-3 py-2 rounded-full font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sponsor cards */}
        {filtered.map((sponsor) => {
          const isExpanded = expandedSponsor === sponsor.id
          const currentBenefit = sponsor.benefits.find((b) => b.tier === userTier)

          return (
            <div key={sponsor.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedSponsor(isExpanded ? null : sponsor.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl">
                  {sponsor.categoryIcon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-navy text-sm">{sponsor.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-400">{sponsor.city}</p>
                  </div>
                  {currentBenefit && (
                    <div className="flex items-center gap-1 mt-1">
                      <Tag className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-600 font-semibold">
                        -{currentBenefit.discount}% para voce!
                      </span>
                    </div>
                  )}
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-3">{sponsor.address}</p>
                  <h4 className="text-xs font-bold text-navy mb-2">Beneficios por Tier:</h4>
                  <div className="space-y-1.5">
                    {sponsor.benefits.map((b) => (
                      <div
                        key={b.tier}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                          b.tier === userTier
                            ? 'bg-amber-50 border border-amber-200 font-semibold'
                            : b.tier < userTier
                              ? 'text-gray-400'
                              : 'text-gray-500'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          b.tier <= userTier ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {b.tier}
                        </span>
                        <span className="flex-1">{b.description}</span>
                        {b.tier === userTier && (
                          <span className="text-amber-600 font-bold">Voce!</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <BottomNav />
    </div>
  )
}
