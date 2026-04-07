import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import { QRCodeSVG } from 'qrcode.react'
import { Gift, Clock, X, CheckCircle, Sparkles } from 'lucide-react'
import type { Reward, Student } from '../types'

export default function Recompensas() {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [rewards, setRewards] = useState<(Reward & { sponsor?: { business_name: string } | null })[]>([])
  const [selectedReward, setSelectedReward] = useState<typeof rewards[0] | null>(null)
  const [redeemed, setRedeemed] = useState<typeof rewards[0] | null>(null)
  const [qrToken, setQrToken] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    async function loadData() {
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user!.id)
        .single()
      if (studentData) setStudent(studentData as Student)

      const { data: rewardsData } = await supabase
        .from('rewards')
        .select('*, sponsor:sponsors(business_name)')
        .eq('active', true)
        .order('points_cost')
      if (rewardsData) setRewards(rewardsData as typeof rewards)

      setLoading(false)
    }
    loadData()
  }, [user])

  if (loading || !student) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#028090] border-t-transparent rounded-full" />
      </div>
    )
  }

  const availablePoints = student.available_points

  function handleRedeem(reward: typeof rewards[0]) {
    setSelectedReward(reward)
  }

  async function confirmRedeem() {
    if (!selectedReward || !student) return
    const token = `VP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    setQrToken(token)

    // Insert redemption record
    await supabase.from('redemptions').insert({
      student_id: student.id,
      reward_id: selectedReward.id,
      qr_code_token: token,
      status: 'pending',
    })

    // Update student points
    const newAvailable = student.available_points - selectedReward.points_cost
    const newRedeemed = student.redeemed_points + selectedReward.points_cost
    await supabase
      .from('students')
      .update({ available_points: newAvailable, redeemed_points: newRedeemed })
      .eq('id', student.id)

    setStudent({ ...student, available_points: newAvailable, redeemed_points: newRedeemed })
    setRedeemed(selectedReward)
    setSelectedReward(null)
  }

  function categoryTag(cat: string | null) {
    switch (cat) {
      case 'school':
        return { label: 'Escolar', bg: 'bg-blue-100', text: 'text-blue-700' }
      case 'sponsor':
        return { label: 'Patrocinador', bg: 'bg-orange-100', text: 'text-orange-700' }
      case 'special':
        return { label: 'Especial', bg: 'bg-purple-100', text: 'text-purple-700' }
      default:
        return { label: cat || 'Geral', bg: 'bg-gray-100', text: 'text-gray-700' }
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#028090] to-[#02C39A] px-6 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-1">
          <Gift className="w-7 h-7 text-white/90" />
          <h1 className="text-2xl font-bold text-white">Vales-Premio</h1>
        </div>
        <p className="text-white/80 text-sm">Troque seus pontos por recompensas!</p>

        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          <span className="text-white font-bold text-lg">{availablePoints}</span>
          <span className="text-white/80 text-sm">pontos disponiveis</span>
        </div>
      </div>

      {/* Sexta do Patrocinador banner */}
      <div className="mx-4 -mt-4 relative z-10">
        <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 rounded-2xl p-4 shadow-lg shadow-amber-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-900 text-base">
                <span className="mr-1">{'\u{1F389}'}</span> Sexta do Patrocinador
              </p>
              <p className="text-amber-800 text-sm mt-0.5">Ofertas especiais dos parceiros!</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/40 rounded-full px-3 py-1.5">
              <Clock className="w-4 h-4 text-amber-900" />
              <span className="text-xs font-semibold text-amber-900">Confira!</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rewards grid */}
      <div className="px-4 mt-6">
        {rewards.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <span className="text-5xl block mb-3">{'\u{1F381}'}</span>
            <h2 className="text-lg font-bold text-navy mb-2">Nenhuma recompensa disponivel</h2>
            <p className="text-gray-400 text-sm">Novas recompensas serao adicionadas em breve!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rewards.map((reward) => {
              const canAfford = availablePoints >= reward.points_cost
              const tag = categoryTag(reward.category)
              const deficit = reward.points_cost - availablePoints
              const sponsorName = reward.sponsor?.business_name

              return (
                <div
                  key={reward.id}
                  className="bg-white rounded-2xl shadow-sm shadow-gray-200/80 p-4 flex flex-col items-center text-center
                             hover:shadow-md transition-shadow"
                >
                  <span className="text-4xl mb-2">{'\u{1F381}'}</span>
                  <p className="font-semibold text-[#1F4E79] text-sm leading-tight mb-1.5">
                    {reward.name}
                  </p>
                  <div className="bg-[#028090]/10 rounded-full px-3 py-1 mb-2">
                    <span className="text-[#028090] font-bold text-xs">{reward.points_cost} pts</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tag.bg} ${tag.text} mb-1`}>
                    {tag.label}
                  </span>
                  {sponsorName && (
                    <p className="text-[10px] text-gray-400 mb-2">{sponsorName}</p>
                  )}
                  {canAfford ? (
                    <button
                      onClick={() => handleRedeem(reward)}
                      className="mt-auto w-full py-2 rounded-xl bg-[#028090] text-white text-xs font-bold
                                 hover:bg-[#028090]/90 active:scale-95 transition-all"
                    >
                      Resgatar
                    </button>
                  ) : (
                    <div className="mt-auto w-full">
                      <p className="text-[10px] text-red-500 font-semibold mb-1">
                        Faltam {deficit} pontos
                      </p>
                      <button
                        disabled
                        className="w-full py-2 rounded-xl bg-gray-200 text-gray-400 text-xs font-bold cursor-not-allowed"
                      >
                        Resgatar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="text-center">
              <span className="text-5xl">{'\u{1F381}'}</span>
              <h3 className="text-lg font-bold text-[#1F4E79] mt-3">Confirmar resgate?</h3>
              <p className="text-gray-500 text-sm mt-2">
                Trocar <span className="font-bold text-[#028090]">{selectedReward.points_cost} pontos</span> por:
              </p>
              <p className="font-semibold text-[#1F4E79] mt-1">{selectedReward.name}</p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedReward(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold text-sm
                           hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRedeem}
                className="flex-1 py-3 rounded-xl bg-[#028090] text-white font-semibold text-sm
                           hover:bg-[#028090]/90 active:scale-95 transition-all"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with QR */}
      {redeemed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => { setRedeemed(null); setQrToken('') }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#02C39A]/10 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-[#02C39A]" />
              </div>
              <h3 className="text-lg font-bold text-[#1F4E79] mt-3">Resgate confirmado!</h3>
              <div className="mt-4 bg-gradient-to-br from-[#028090] to-[#02C39A] rounded-2xl p-5 text-white">
                <p className="text-xs uppercase tracking-wider opacity-80">Vale-Premio</p>
                <span className="text-4xl block my-2">{'\u{1F381}'}</span>
                <p className="font-bold text-base">{redeemed.name}</p>
                {redeemed.sponsor?.business_name && (
                  <p className="text-xs opacity-80 mt-0.5">por {redeemed.sponsor.business_name}</p>
                )}
                <div className="bg-white rounded-xl p-3 mt-4 inline-block">
                  <QRCodeSVG value={qrToken} size={120} level="M" />
                </div>
                <p className="text-[10px] opacity-70 mt-2 font-mono">{qrToken}</p>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Apresente este QR code na escola para resgatar.
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
