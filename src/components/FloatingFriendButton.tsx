import { useState, useEffect } from 'react'
import { Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StudentSearch from './StudentSearch'

export default function FloatingFriendButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('students').select('id, school_id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) { setStudentId(data.id); setSchoolId(data.school_id) } })
  }, [user])

  const handleToggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSend = async () => {
    if (!studentId || selected.length === 0) return
    setSending(true)
    setMsg('')
    let sent = 0
    for (const friendId of selected) {
      const { error } = await supabase.from('friendships').insert({
        requester_id: studentId,
        addressee_id: friendId,
        status: 'pending',
      })
      if (!error) sent++
    }
    setMsg(`${sent} pedido(s) de amizade enviado(s)!`)
    setSelected([])
    setSending(false)
    setTimeout(() => setOpen(false), 1500)
  }

  if (!user || !studentId) return null

  return (
    <>
      <button onClick={() => { setOpen(true); setMsg(''); setSelected([]) }}
        className="fixed bottom-20 left-4 z-40 bg-teal text-white rounded-full shadow-lg p-3 flex items-center gap-2 hover:bg-teal/90 transition-all">
        <Users className="w-5 h-5" />
        <span className="text-sm font-bold pr-1">Adicionar amigo</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-navy text-lg">Adicionar amigo</h3>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <StudentSearch
              mySchoolId={schoolId}
              myStudentId={studentId}
              selected={selected}
              onToggle={handleToggle}
              multiple={true}
              label="Buscar colegas"
              sublabel="Selecione quem voce quer adicionar como amigo"
            />

            {msg && <p className="text-sm text-green-600 mt-3">{msg}</p>}

            {selected.length > 0 && (
              <button onClick={handleSend} disabled={sending}
                className="w-full mt-3 py-3 rounded-xl bg-teal text-white font-bold text-sm disabled:opacity-50">
                {sending ? 'Enviando...' : `Enviar ${selected.length} pedido(s) de amizade`}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
