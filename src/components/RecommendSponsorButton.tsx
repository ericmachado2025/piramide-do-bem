import { useState, useEffect } from 'react'
import { Store, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function RecommendSponsorButton() {
  const { user } = useAuth()
  const [studentId, setStudentId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState('')
  const [contact, setContact] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('students').select('id').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setStudentId(data.id) })
  }, [user])

  const handleSubmit = async () => {
    if (!studentId || !businessName) return
    setSaving(true)
    await supabase.from('sponsor_recommendations').insert({
      student_id: studentId,
      business_name: businessName,
      city,
      contact,
      status: 'pending',
    })
    setMsg('Boa! Vamos entrar em contato com eles. Se virarem patrocinadores, você ganha pontos!')
    setBusinessName(''); setCity(''); setContact('')
    setSaving(false)
  }

  if (!user || !studentId) return null

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 bg-teal text-white rounded-full shadow-lg p-3 flex items-center gap-2 hover:bg-teal/90 transition-all">
        <Store className="w-5 h-5" />
        <span className="text-sm font-bold pr-1">Recomendar loja</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={() => { setOpen(false); setMsg('') }}>
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-navy text-lg">Recomendar loja</h3>
              <button onClick={() => { setOpen(false); setMsg('') }}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">Conhece um lugar legal que poderia oferecer recompensas? Conta pra gente!</p>

            {msg ? (
              <div className="text-center py-4">
                <p className="text-sm text-green font-medium mb-3">{msg}</p>
                <button onClick={() => { setOpen(false); setMsg('') }} className="text-teal text-sm font-semibold">Fechar</button>
              </div>
            ) : (
              <div className="space-y-3">
                <input type="text" placeholder="Nome da loja" value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" autoFocus />
                <input type="text" placeholder="Cidade" value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                <input type="text" placeholder="Email ou telefone de contato" value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                <button onClick={handleSubmit} disabled={saving || !businessName}
                  className="w-full py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">
                  {saving ? 'Enviando...' : 'Recomendar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
