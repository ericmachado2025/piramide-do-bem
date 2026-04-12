import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Tag, Star, ChevronRight } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface SponsorData {
  id: string
  business_name: string
  city: string | null
  state: string | null
}

export default function Patrocinadores() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sponsors, setSponsors] = useState<SponsorData[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSponsor, setExpandedSponsor] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from('sponsors')
        .select('id, business_name, city, state')
        .eq('active', true)
        .order('business_name')
      if (data) setSponsors(data)
      setLoading(false)
    }
    loadData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

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
            Descontos exclusivos baseados no seu Nivel!
          </p>
          <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <Star className="w-4 h-4 text-white fill-white" />
            <span className="text-white font-bold text-sm">Parceiros da comunidade</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4 space-y-4">
        {sponsors.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <span className="text-5xl block mb-3">{'\u{1F3EA}'}</span>
            <h2 className="text-lg font-bold text-navy mb-2">Nenhum patrocinador cadastrado</h2>
            <p className="text-gray-400 text-sm">
              Quando comercios locais se tornarem parceiros, eles aparecerao aqui com descontos exclusivos para alunos.
            </p>
          </div>
        ) : (
          sponsors.map((sponsor) => {
            const isExpanded = expandedSponsor === sponsor.id
            return (
              <div key={sponsor.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedSponsor(isExpanded ? null : sponsor.id)}
                  className="w-full p-4 flex items-center gap-3 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl">
                    {'\u{1F3EA}'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-navy text-sm">{sponsor.business_name}</h3>
                    {(sponsor.city || sponsor.state) && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <p className="text-xs text-gray-400">
                          {[sponsor.city, sponsor.state].filter(Boolean).join(' - ')}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Tag className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-600 font-semibold">
                        Parceiro ativo
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500">
                      Descontos e beneficios serao definidos em breve. Fique atento!
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <BottomNav />
    </div>
  )
}
