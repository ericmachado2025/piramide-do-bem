import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface EvasionAlert {
  id: string
  consecutive_absences: number
  alert_date: string
  resolved: boolean
  student: {
    id: string
    available_points: number
    user: { name: string; phone: string | null; email: string | null } | null
  } | null
}

interface Props {
  teacherId: string
}

export default function StudentsAtRiskPanel({ teacherId }: Props) {
  const [alerts, setAlerts] = useState<EvasionAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadAlerts()
  }, [])

  async function loadAlerts() {
    const { data } = await supabase
      .from('evasion_alerts')
      .select(`
        id, consecutive_absences, alert_date, resolved,
        student:students!evasion_alerts_student_id_fkey (
          id, available_points,
          user:users!students_users_id_fkey (name, phone, email)
        )
      `)
      .eq('resolved', false)
      .order('alert_date', { ascending: false })

    if (data) setAlerts(data as unknown as EvasionAlert[])
    setLoading(false)
  }

  async function handleNotifyFriends(alert: EvasionAlert) {
    if (!alert.student) return
    setActionLoading(alert.id)

    const studentName = (alert.student.user as { name: string })?.name || 'Colega'
    const { data: friends } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${alert.student.id},addressee_id.eq.${alert.student.id}`)
      .eq('status', 'accepted')

    if (friends) {
      const friendIds = friends.map(f =>
        f.requester_id === alert.student!.id ? f.addressee_id : f.requester_id
      ).filter(Boolean)

      for (const fid of friendIds) {
        const { data: friendUser } = await supabase.from('students').select('user_id').eq('id', fid).single()
        if (friendUser?.user_id) {
          await supabase.rpc('create_notification', {
            p_user_id: friendUser.user_id,
            p_type: 'rescue_call',
            p_title: `${studentName} esta faltando`,
            p_message: `${studentName} esta com ${alert.consecutive_absences} faltas consecutivas. Mande uma mensagem!`,
            p_action_url: '/home',
            p_icon: '\u{1F6A8}',
          })
        }
      }
    }

    await supabase.from('rescue_actions').insert({
      evasion_alert_id: alert.id,
      teacher_id: teacherId,
      action_type: 'notified_friends',
    })

    setActionLoading(null)
  }

  async function handleResolved(alert: EvasionAlert) {
    setActionLoading(alert.id)
    await supabase.from('evasion_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alert.id)
    await supabase.from('rescue_actions').insert({
      evasion_alert_id: alert.id,
      teacher_id: teacherId,
      action_type: 'returned',
    })
    setAlerts(prev => prev.filter(a => a.id !== alert.id))
    setActionLoading(null)
  }

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-pulse text-teal">Carregando...</div></div>
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <span className="text-5xl block mb-3">{'\u2705'}</span>
        <h3 className="font-bold text-navy text-lg mb-1">Nenhum aluno em risco</h3>
        <p className="text-sm text-gray-400">Todos os alertas de evasao foram resolvidos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">{alerts.length} aluno(s) em risco</p>
      {alerts.map(alert => {
        const student = alert.student
        const name = (student?.user as { name: string })?.name || 'Aluno'
        const phone = (student?.user as { phone: string | null })?.phone || ''
        const email = (student?.user as { email: string | null })?.email || ''
        const isLoading = actionLoading === alert.id

        return (
          <div key={alert.id} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-navy">{name}</p>
                <p className="text-xs text-red-500 font-semibold">
                  {alert.consecutive_absences} faltas consecutivas
                </p>
                <p className="text-[10px] text-gray-400">
                  Desde {new Date(alert.alert_date).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Pontuacao</p>
                <p className="font-bold text-teal">{student?.available_points ?? 0}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {phone && (
                <>
                  <a href={`tel:${phone}`}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                    {'\u{1F4DE}'} Ligar
                  </a>
                  <a href={`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Oi ${name}, sentimos sua falta na escola!`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                    {'\u{1F4AC}'} WhatsApp
                  </a>
                </>
              )}
              {email && (
                <a href={`mailto:${email}`}
                  className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-medium">
                  {'\u{1F4E7}'} Email
                </a>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleNotifyFriends(alert)}
                disabled={isLoading}
                className="flex-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {'\u{1F4E2}'} Avisar amigos
              </button>
              <button
                onClick={() => handleResolved(alert)}
                disabled={isLoading}
                className="flex-1 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {'\u2705'} Aluno retornou
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
