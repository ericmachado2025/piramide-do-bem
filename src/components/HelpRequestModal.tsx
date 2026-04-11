import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import StudentSearch from './StudentSearch'

interface HelpRequestModalProps {
  studentId: string
  schoolId: string | null
  onClose: () => void
  onSent: () => void
}

interface Subject { id: string; name: string }

export default function HelpRequestModal({ studentId, schoolId, onClose, onSent }: HelpRequestModalProps) {
  const [step, setStep] = useState<'subjects' | 'details'>('subjects')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'friends' | 'private'>('public')
  const [targetStudent, setTargetStudent] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    supabase.from('subjects').select('id, name').order('display_order').then(({ data }) => {
      if (!data) return
      const seen = new Set<string>()
      const unique = data.filter(s => {
        const norm = s.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        if (seen.has(norm) || s.name === 'Outros') return false
        seen.add(norm)
        return true
      })
      setSubjects(unique)
    })
  }, [])

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSend = async () => {
    if (selectedSubjects.length === 0) return
    setSending(true)
    for (const subjectId of selectedSubjects) {
      await supabase.from('help_requests').insert({
        student_id: studentId,
        subject_id: subjectId,
        description: description || null,
        visibility,
        target_student_id: targetStudent.length > 0 ? targetStudent[0] : null,
        status: 'open',
      })
    }
    setSending(false)
    onSent()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-navy text-lg">
            {step === 'subjects' ? 'Em que voce precisa de ajuda?' : 'Detalhes do pedido'}
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {step === 'subjects' && (
          <>
            <p className="text-xs text-gray-400 mb-4">Marque as materias em que precisa de ajuda. Monitores e colegas poderao te encontrar.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {subjects.map(s => {
                const sel = selectedSubjects.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleSubject(s.id)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all text-left ${
                      sel ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}>
                    {sel && <Check size={14} className="inline mr-1" />}{s.name}
                  </button>
                )
              })}
            </div>
            {selectedSubjects.length > 0 && (
              <button onClick={() => setStep('details')}
                className="w-full py-3 rounded-xl bg-teal text-white font-bold text-sm">
                Continuar ({selectedSubjects.length} materia(s))
              </button>
            )}
          </>
        )}

        {step === 'details' && (
          <>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-navy block mb-1">Descreva sua dificuldade (opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Nao consigo entender equacoes do 2o grau..."
                  rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-navy block mb-2">Quem pode ver seu pedido?</label>
                <div className="space-y-2">
                  {([
                    { v: 'public' as const, l: 'Todos', d: 'Qualquer aluno ou monitor pode oferecer ajuda' },
                    { v: 'friends' as const, l: 'Apenas amigos', d: 'Somente seus amigos verao o pedido' },
                    { v: 'private' as const, l: 'Privado', d: 'Enviar pedido direto para um colega' },
                  ]).map(opt => (
                    <button key={opt.v} onClick={() => setVisibility(opt.v)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        visibility === opt.v ? 'border-teal bg-teal/5' : 'border-gray-100'
                      }`}>
                      <p className="text-sm font-semibold text-navy">{opt.l}</p>
                      <p className="text-xs text-gray-400">{opt.d}</p>
                    </button>
                  ))}
                </div>
              </div>

              {visibility === 'private' && (
                <StudentSearch
                  mySchoolId={schoolId}
                  myStudentId={studentId}
                  selected={targetStudent}
                  onToggle={(id) => setTargetStudent(prev => prev.includes(id) ? [] : [id])}
                  multiple={false}
                  label="Para quem voce quer pedir ajuda?"
                  sublabel="Selecione um colega"
                />
              )}

              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep('subjects')}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-semibold">Voltar</button>
                <button onClick={handleSend} disabled={sending}
                  className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">
                  {sending ? 'Enviando...' : 'Pedir ajuda'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}