import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HandHelping, GraduationCap, Check } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Tab = 'pedidos' | 'monitores'

interface HelpRequest {
  id: string
  description: string | null
  visibility: string
  status: string
  created_at: string
  subject: { name: string } | null
  student: { id: string; user: { name: string } | null; school: { name: string; city: string; state: string } | null } | null
}

interface Monitor {
  student_id: string
  subject: { name: string } | null
  student: { user: { name: string } | null; school: { name: string; city: string } | null } | null
}

export default function Monitoria() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('pedidos')
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([])
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [myStudentId, setMyStudentId] = useState<string | null>(null)
  const [mySubjects, setMySubjects] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    setLoading(true)
    const { data: me } = await supabase.from('students').select('id').eq('user_id', user!.id).maybeSingle()
    if (me) {
      setMyStudentId(me.id)
      // Load my monitor subjects
      const { data: myMon } = await supabase.from('monitors').select('subject:subjects(name)').eq('student_id', me.id)
      if (myMon) setMySubjects(new Set(myMon.map(m => ((m.subject as unknown as { name: string }) || {}).name || '').filter(Boolean)))
    }

    // Load open help requests
    const { data: requests } = await supabase.from('help_requests')
      .select('id, description, visibility, status, created_at, subject:subjects(name), student:students(id, user:users!students_users_id_fkey(name), school:schools(name, city, state))')
      .eq('status', 'open').order('created_at', { ascending: false }).limit(50)
    if (requests) setHelpRequests(requests as unknown as HelpRequest[])

    // Load monitors
    const { data: mons } = await supabase.from('monitors')
      .select('student_id, subject:subjects(name), student:students(user:users!students_users_id_fkey(name), school:schools(name, city))')
      .limit(50)
    if (mons) setMonitors(mons as unknown as Monitor[])

    setLoading(false)
  }

  const handleOffer = async (requestId: string) => {
    if (!myStudentId) return
    await supabase.from('help_requests').update({ helper_id: myStudentId, status: 'matched' }).eq('id', requestId)
    loadData()
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <div className="gradient-bg px-5 pt-8 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white"><ArrowLeft /></button>
          <h1 className="text-xl font-bold text-white">Monitoria</h1>
        </div>
        <div className="flex gap-2">
          {([
            { k: 'pedidos' as const, icon: HandHelping, label: 'Pedidos de Ajuda' },
            { k: 'monitores' as const, icon: GraduationCap, label: 'Monitores' },
          ]).map(({ k, label }) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === k ? 'bg-white text-navy' : 'bg-white/20 text-white/80'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Carregando...</div>
        ) : tab === 'pedidos' ? (
          <>
            <p className="text-xs text-gray-400">{helpRequests.length} pedido(s) aberto(s)</p>
            {helpRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <span className="text-5xl block mb-3">{'\u{1F44D}'}</span>
                <h3 className="text-lg font-bold text-navy mb-2">Nenhum pedido aberto</h3>
                <p className="text-gray-400 text-sm">Quando alguem pedir ajuda, aparecera aqui.</p>
              </div>
            ) : (() => {
              const myMateria = mySubjects.size > 0
                ? helpRequests.filter(r => mySubjects.has(r.subject?.name || ''))
                : []
              const outros = mySubjects.size > 0
                ? helpRequests.filter(r => !mySubjects.has(r.subject?.name || ''))
                : helpRequests

              const renderCard = (r: HelpRequest) => (
                <div key={r.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">{r.subject?.name || 'Materia'}</span>
                      <p className="text-sm font-semibold text-navy mt-1">{(r.student as any)?.user?.name || 'Aluno'}</p>
                      <p className="text-[11px] text-gray-400">{(r.student as any)?.school?.state} · {(r.student as any)?.school?.city} · {(r.student as any)?.school?.name}</p>
                    </div>
                    <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  {r.description && <p className="text-sm text-gray-600 mb-3 italic">"{r.description}"</p>}
                  {myStudentId && r.student?.id !== myStudentId && (
                    <button onClick={() => handleOffer(r.id)}
                      className="w-full py-2 rounded-lg bg-teal text-white text-sm font-semibold flex items-center justify-center gap-1">
                      <Check size={14} /> Oferecer ajuda
                    </button>
                  )}
                </div>
              )

              return (
                <>
                  {myMateria.length > 0 && (
                    <>
                      <h3 className="text-sm font-bold text-teal flex items-center gap-1">{'\u{2B50}'} Pedidos nas suas materias ({myMateria.length})</h3>
                      {myMateria.map(renderCard)}
                    </>
                  )}
                  {outros.length > 0 && (
                    <>
                      <h3 className="text-sm font-bold text-gray-500 mt-3">{myMateria.length > 0 ? 'Outros pedidos' : 'Pedidos abertos'} ({outros.length})</h3>
                      {outros.map(renderCard)}
                    </>
                  )}
                </>
              )
            })()}
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400">{monitors.length} monitor(es) disponivel(is)</p>
            {monitors.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <span className="text-5xl block mb-3">{'\u{1F393}'}</span>
                <h3 className="text-lg font-bold text-navy mb-2">Nenhum monitor ainda</h3>
                <p className="text-gray-400 text-sm">Quando alunos se oferecerem como monitores, aparecerao aqui.</p>
              </div>
            ) : (() => {
              // Group monitors by student
              const byStudent: Record<string, { name: string; school: string; subjects: string[] }> = {}
              for (const m of monitors) {
                const key = m.student_id
                if (!byStudent[key]) {
                  byStudent[key] = {
                    name: (m.student as any)?.user?.name || 'Monitor',
                    school: [(m.student as any)?.school?.city, (m.student as any)?.school?.name].filter(Boolean).join(' · '),
                    subjects: [],
                  }
                }
                if (m.subject?.name) byStudent[key].subjects.push(m.subject.name)
              }
              return Object.entries(byStudent).map(([sid, info]) => (
                <div key={sid} className="bg-white rounded-xl shadow-sm p-4">
                  <p className="text-sm font-semibold text-navy">{info.name}</p>
                  <p className="text-[11px] text-gray-400 mb-2">{info.school}</p>
                  <div className="flex flex-wrap gap-1">
                    {info.subjects.map(s => (
                      <span key={s} className="bg-teal/10 text-teal text-[11px] font-semibold px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              ))
            })()}
          </>
        )}

        <div className="bg-teal/5 border border-teal/20 rounded-xl p-3 mt-4">
          <p className="text-xs text-navy">
            <strong>Pontos x2!</strong> Ajudar um colega gera pontos em dobro para ambos.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
