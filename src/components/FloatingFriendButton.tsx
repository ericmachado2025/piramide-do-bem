import { useState, useEffect } from 'react'
import { Users, X, Search, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface StudentResult {
  id: string
  name: string
  email: string | null
  school?: { name: string } | null
}

export default function FloatingFriendButton() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StudentResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteContact, setInviteContact] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!user) return
    supabase.from('students').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setStudentId(data.id) })
  }, [user])

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase.from('students').select('id, name, email, school:schools(name)')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', studentId ?? '').limit(10)
      if (data) setResults(data as unknown as StudentResult[])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, studentId])

  const handleAdd = async (s: StudentResult) => {
    if (!studentId) return
    await supabase.from('friendships').insert({
      requester_id: studentId,
      addressee_id: s.id,
      addressee_email: s.email,
      addressee_name: s.name,
      status: 'pending',
    })
    setMsg(`Convite enviado para ${s.name}!`)
    setQuery('')
    setResults([])
  }

  const handleInvite = async () => {
    if (!studentId || !inviteName || !inviteContact) return
    const isEmail = inviteContact.includes('@')
    await supabase.from('friendships').insert({
      requester_id: studentId,
      addressee_email: isEmail ? inviteContact : null,
      addressee_phone: !isEmail ? inviteContact : null,
      addressee_name: inviteName,
      status: 'pending',
    })
    setMsg(`Convite registrado para ${inviteName}!`)
    setInviteName(''); setInviteContact(''); setShowInvite(false)
  }

  if (!user || !studentId) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 bg-teal text-white rounded-full shadow-lg p-3 flex items-center gap-2 hover:bg-teal/90 transition-all">
        <Users className="w-5 h-5" />
        <span className="text-sm font-bold pr-1">Adicionar amigo</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-navy text-lg">Adicionar amigo</h3>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            {!showInvite ? (
              <>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Nome ou email do amigo" value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" autoFocus />
                  {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal animate-spin" />}
                </div>

                {msg && <p className="text-sm text-green mb-2">{msg}</p>}

                {results.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100">
                        <div>
                          <p className="text-sm font-semibold text-navy">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.school?.name || ''}</p>
                        </div>
                        <button onClick={() => handleAdd(s)} className="text-xs bg-teal text-white px-3 py-1.5 rounded-lg font-semibold">Adicionar</button>
                      </div>
                    ))}
                  </div>
                ) : query.length >= 2 && !searching ? (
                  <div className="text-center py-3">
                    <p className="text-sm text-gray-500 mb-2">Não encontrou? Convide pelo nome:</p>
                    <button onClick={() => setShowInvite(true)} className="text-teal text-sm font-semibold">Convidar amigo novo</button>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="space-y-3">
                <input type="text" placeholder="Nome do seu amigo" value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                <input type="text" placeholder="Email ou celular" value={inviteContact}
                  onChange={(e) => setInviteContact(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                {msg && <p className="text-sm text-green">{msg}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowInvite(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm">Voltar</button>
                  <button onClick={handleInvite} disabled={!inviteName || !inviteContact}
                    className="flex-1 py-2 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">Convidar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
