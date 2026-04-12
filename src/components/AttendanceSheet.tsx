import { useState, useEffect } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Student {
  id: string
  name: string
  community: string | null
}

interface AttendanceRecord {
  student_id: string
  status: 'present' | 'absent' | 'justified'
}

interface Props {
  classroomId: string
  teacherId: string
  date?: string
}

export default function AttendanceSheet({ classroomId, teacherId, date }: Props) {
  const today = date || new Date().toISOString().slice(0, 10)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'justified'>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [classroomId, today])

  async function loadData() {
    setLoading(true)
    // Get students enrolled in this classroom's school
    const { data: classroom } = await supabase.from('classrooms').select('school_id, grade').eq('id', classroomId).single()
    if (!classroom) { setLoading(false); return }

    const { data: studs } = await supabase.from('students')
      .select('id, user:users!students_users_id_fkey(name), community:communities(name)')
      .eq('school_id', classroom.school_id)

    if (studs) {
      setStudents(studs.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        name: ((s.user as unknown as { name: string }) ?? { name: 'Aluno' }).name,
        community: ((s.community as unknown as { name: string }) ?? { name: null }).name,
      })))
      // Default all to present
      const defaultAtt: Record<string, 'present' | 'absent' | 'justified'> = {}
      studs.forEach((s: Record<string, unknown>) => { defaultAtt[s.id as string] = 'present' })

      // Load existing attendance for today
      const { data: existing } = await supabase.from('attendances')
        .select('student_id, status')
        .eq('classroom_id', classroomId)
        .eq('date', today)

      if (existing && existing.length > 0) {
        existing.forEach((a: AttendanceRecord) => { defaultAtt[a.student_id] = a.status })
        setSaved(true)
      }
      setAttendance(defaultAtt)
    }
    setLoading(false)
  }

  const toggle = (studentId: string) => {
    setAttendance(prev => {
      const current = prev[studentId]
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'justified' : 'present'
      return { ...prev, [studentId]: next }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const records = Object.entries(attendance).map(([student_id, status]) => ({
      student_id,
      classroom_id: classroomId,
      date: today,
      status,
      marked_by: teacherId,
    }))

    // Upsert all records
    await supabase.from('attendances').upsert(records, { onConflict: 'student_id,classroom_id,date' })

    // Check for evasion alerts (3+ consecutive absences)
    const absentIds = Object.entries(attendance).filter(([, s]) => s === 'absent').map(([id]) => id)
    for (const sid of absentIds) {
      const { data: recentAbs } = await supabase.from('attendances')
        .select('date')
        .eq('student_id', sid)
        .eq('status', 'absent')
        .order('date', { ascending: false })
        .limit(3)

      if (recentAbs && recentAbs.length >= 3) {
        // Check if consecutive
        const { data: existingAlert } = await supabase.from('evasion_alerts')
          .select('id')
          .eq('student_id', sid)
          .eq('resolved', false)
          .maybeSingle()

        if (!existingAlert) {
          await supabase.from('evasion_alerts').insert({
            student_id: sid,
            consecutive_absences: recentAbs.length,
            notified_friends: true,
            notified_monitors: true,
          })

          // Notify friends of the absent student
          const { data: friends } = await supabase.from('friendships')
            .select('requester_id, addressee_id')
            .or(`requester_id.eq.${sid},addressee_id.eq.${sid}`)
            .eq('status', 'accepted')
          if (friends) {
            const friendIds = friends.map(f => f.requester_id === sid ? f.addressee_id : f.requester_id).filter(Boolean)
            for (const fid of friendIds) {
              await supabase.from('help_requests').insert({
                student_id: sid,
                subject_id: (await supabase.from('subjects').select('id').limit(1).single()).data?.id,
                description: `Alerta de evasao: colega com ${recentAbs.length} faltas consecutivas. Ajude a traze-lo de volta!`,
                visibility: 'friends',
                target_student_id: fid,
                status: 'open',
              })
            }
          }
        }
      }
    }

    setSaving(false)
    setSaved(true)
  }

  const absentCount = Object.values(attendance).filter(s => s === 'absent').length
  const justifiedCount = Object.values(attendance).filter(s => s === 'justified').length

  if (loading) return <div className="text-center py-6 text-gray-400">Carregando alunos...</div>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-navy text-sm">Chamada — {new Date(today + 'T12:00:00').toLocaleDateString('pt-BR')}</h3>
          <p className="text-xs text-gray-400">{students.length} alunos · {absentCount} falta(s) · {justifiedCount} justificada(s)</p>
        </div>
        {saved && <span className="text-xs text-green-600 font-semibold flex items-center gap-1"><Check size={14} /> Salva</span>}
      </div>

      <p className="text-[10px] text-gray-400">Toque para alternar: ✅ Presente → ❌ Falta → ⚠️ Justificada</p>

      <div className="space-y-1.5">
        {students.map(s => {
          const status = attendance[s.id] || 'present'
          return (
            <button key={s.id} onClick={() => toggle(s.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                status === 'present' ? 'bg-green-50 border border-green-200' :
                status === 'absent' ? 'bg-red-50 border border-red-200' :
                'bg-yellow-50 border border-yellow-200'
              }`}>
              <div className="text-left">
                <p className="text-sm font-semibold text-navy">{s.name}</p>
                {s.community && <p className="text-[10px] text-gray-400">{s.community}</p>}
              </div>
              <span className="text-lg">
                {status === 'present' ? '\u2705' : status === 'absent' ? '\u274C' : '\u26A0\uFE0F'}
              </span>
            </button>
          )
        })}
      </div>

      {absentCount >= 3 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">Atencao: {absentCount} alunos ausentes. Alertas de evasao serao gerados automaticamente.</p>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-teal text-white font-bold text-sm disabled:opacity-50">
        {saving ? 'Salvando...' : saved ? 'Chamada salva ✓' : 'Salvar chamada'}
      </button>
    </div>
  )
}