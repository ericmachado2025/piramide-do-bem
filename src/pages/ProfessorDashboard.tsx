import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LogOut,
  Users,
  Handshake,
  TrendingUp,
  Trophy,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import AttendanceSheet from '../components/AttendanceSheet'
import AvatarUpload from '../components/AvatarUpload'
import EditProfileModal from '../components/EditProfileModal'
import StudentsAtRiskPanel from '../components/StudentsAtRiskPanel'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Assignment {
  id: string
  classroom_id: string
  subject_id: string
  classroom: { id: string; grade: string; section: string; school_id: string }
  subject: { id: string; name: string }
}

interface FraudAlert {
  id: string
  description: string
  student_names: string
  reviewed: boolean
  classroom_id: string
}

interface TribeRank {
  tribe_name: string
  total_points: number
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProfessorDashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [loading, setLoading] = useState(true)
  const [teacherName, setTeacherName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState('')
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [teacherPhone, setTeacherPhone] = useState('')

  // Metrics
  const [totalAlunos, setTotalAlunos] = useState(0)
  const [acoesEstaSemana, setAcoesEstaSemana] = useState(0)
  const [crescimento, setCrescimento] = useState(0)
  const [triboLider, setTriboLider] = useState('')

  // Fraud alerts
  const [alerts, setAlerts] = useState<FraudAlert[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chamada' | 'risco'>('dashboard')

  // Tribe ranking
  const [tribeRanking, setTribeRanking] = useState<TribeRank[]>([])

  /* ---------- Load teacher data ---------- */

  useEffect(() => {
    if (!user) { navigate('/login'); return }

    async function load() {
      // Get teacher record
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, name, school_id, user:users!teachers_users_id_fkey(name, email, phone)')
        .eq('user_id', user!.id)
        .single()

      if (!teacher) { setLoading(false); return }

      setTeacherId(teacher.id)
      setTeacherName((teacher as any).user?.name || teacher.name)
      setTeacherPhone((teacher as any).user?.phone || '')

      // Get school name
      const { data: school } = await supabase
        .from('schools')
        .select('name')
        .eq('id', teacher.school_id)
        .single()

      if (school) setSchoolName(school.name)

      // Get assignments with classroom + subject info
      const { data: assignData } = await supabase
        .from('teacher_assignments')
        .select('id, classroom_id, subject_id, classroom:classrooms(id, grade, section, school_id), subject:subjects(id, name)')
        .eq('teacher_id', teacher.id)

      if (assignData) {
        const parsed = assignData as unknown as Assignment[]
        setAssignments(parsed)
        if (parsed.length > 0) setSelectedAssignment(parsed[0].id)
      }

      setLoading(false)
    }

    load()
  }, [user, navigate])

  /* ---------- Derived selected data ---------- */

  const currentAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignment),
    [assignments, selectedAssignment],
  )

  const currentClassroomId = currentAssignment?.classroom_id

  /* ---------- Load metrics when assignment changes ---------- */

  useEffect(() => {
    if (!currentClassroomId) return

    async function loadMetrics() {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const startOfLastWeek = new Date(startOfWeek)
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7)

      const weekIso = startOfWeek.toISOString()
      const lastWeekIso = startOfLastWeek.toISOString()

      // Total students in this classroom
      const { count: studentCount } = await supabase
        .from('student_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('classroom_id', currentClassroomId)

      setTotalAlunos(studentCount ?? 0)

      // Get student IDs for this classroom
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('classroom_id', currentClassroomId)

      const studentIds = enrollments?.map((e: { student_id: string }) => e.student_id) ?? []

      if (studentIds.length > 0) {
        // Actions this week
        const { count: thisWeekCount } = await supabase
          .from('actions')
          .select('id', { count: 'exact', head: true })
          .in('student_id', studentIds)
          .gte('created_at', weekIso)

        setAcoesEstaSemana(thisWeekCount ?? 0)

        // Actions last week (for growth)
        const { count: lastWeekCount } = await supabase
          .from('actions')
          .select('id', { count: 'exact', head: true })
          .in('student_id', studentIds)
          .gte('created_at', lastWeekIso)
          .lt('created_at', weekIso)

        const lw = lastWeekCount ?? 0
        const tw = thisWeekCount ?? 0
        const growth = lw > 0 ? Math.round(((tw - lw) / lw) * 100) : tw > 0 ? 100 : 0
        setCrescimento(growth)

        // Leading tribe — group students by tribe, count them
        const { data: students } = await supabase
          .from('students')
          .select('community_id')
          .in('id', studentIds)

        if (students && students.length > 0) {
          const tribeCounts: Record<string, number> = {}
          students.forEach((s: { community_id: string | null }) => {
            if (s.community_id) tribeCounts[s.community_id] = (tribeCounts[s.community_id] || 0) + 1
          })
          const leadingTribeId = Object.entries(tribeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
          if (leadingTribeId) {
            const { data: community } = await supabase
              .from('communities')
              .select('name')
              .eq('id', leadingTribeId)
              .single()
            setTriboLider(community?.name ?? '-')
          } else {
            setTriboLider('-')
          }
        } else {
          setTriboLider('-')
        }

        // Tribe ranking by total points
        const { data: studentPoints } = await supabase
          .from('students')
          .select('community_id, points')
          .in('id', studentIds)

        if (studentPoints) {
          const tribeMap: Record<string, number> = {}
          const tribeNameMap: Record<string, string> = {}

          for (const sp of studentPoints as { community_id: string | null; points: number }[]) {
            if (!sp.community_id) continue
            tribeMap[sp.community_id] = (tribeMap[sp.community_id] || 0) + (sp.points || 0)
          }

          const tribeIds = Object.keys(tribeMap)
          if (tribeIds.length > 0) {
            const { data: tribeNames } = await supabase
              .from('communities')
              .select('id, name')
              .in('id', tribeIds)

            if (tribeNames) {
              tribeNames.forEach((t: { id: string; name: string }) => {
                tribeNameMap[t.id] = t.name
              })
            }
          }

          const ranking: TribeRank[] = Object.entries(tribeMap)
            .map(([id, pts]) => ({
              tribe_name: tribeNameMap[id] || id,
              total_points: pts,
            }))
            .sort((a, b) => b.total_points - a.total_points)

          setTribeRanking(ranking)
        }
      } else {
        setAcoesEstaSemana(0)
        setCrescimento(0)
        setTriboLider('-')
        setTribeRanking([])
      }
    }

    loadMetrics()
  }, [currentClassroomId])

  /* ---------- Load fraud alerts ---------- */

  useEffect(() => {
    if (!currentClassroomId) return

    async function loadAlerts() {
      const { data } = await supabase
        .from('fraud_alerts')
        .select('*')
        .eq('classroom_id', currentClassroomId)
        .eq('reviewed', false)

      if (data) setAlerts(data as FraudAlert[])
    }

    loadAlerts()
  }, [currentClassroomId])

  /* ---------- Handlers ---------- */

  const handleSignOut = useCallback(async () => {
    await signOut()
    navigate('/login')
  }, [signOut, navigate])

  const markReviewed = useCallback(async (id: string) => {
    await supabase.from('fraud_alerts').update({ reviewed: true }).eq('id', id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }, [])

  /* ---------- Helpers ---------- */

  const assignmentLabel = (a: Assignment) =>
    `${a.classroom.grade} ${a.classroom.section} - ${a.subject.name}`

  const maxTribePoints = tribeRanking.length > 0 ? tribeRanking[0].total_points : 1

  const tribeColors = ['#028090', '#02C39A', '#F59E0B', '#1F4E79', '#E11D48', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

  /* ---------- Metric cards ---------- */

  const metricCards = [
    {
      icon: Users,
      label: 'Total alunos',
      value: String(totalAlunos),
      color: 'from-[#028090] to-[#02C39A]',
    },
    {
      icon: Handshake,
      label: 'Acoes esta semana',
      value: String(acoesEstaSemana),
      color: 'from-[#1F4E79] to-[#028090]',
    },
    {
      icon: TrendingUp,
      label: 'Crescimento',
      value: `${crescimento >= 0 ? '+' : ''}${crescimento}%`,
      color: 'from-[#02C39A] to-[#028090]',
    },
    {
      icon: Trophy,
      label: 'Tribo lider',
      value: triboLider || '-',
      color: 'from-[#F59E0B] to-[#F97316]',
    },
  ]

  /* ---------- Render ---------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#028090] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1F4E79] to-[#028090] px-6 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AvatarUpload userId={user?.id || ''} currentUrl={null} size={56}
              initials={teacherName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'P'}
              onUploaded={() => {}} />
            <div>
              <h1 className="text-2xl font-bold text-white">{teacherName || 'Professor'}</h1>
              <p className="text-white/70 text-sm mt-1">{schoolName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => setShowEditProfile(true)}
              className="text-white/80 hover:text-white text-xs transition-colors">Editar</button>
            <button onClick={handleSignOut}
              className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 -mt-4 pb-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {([
            { k: 'dashboard' as const, label: 'Painel' },
            { k: 'chamada' as const, label: 'Chamada' },
            { k: 'risco' as const, label: 'Alunos em Risco' },
          ]).map(({ k, label }) => (
            <button key={k} onClick={() => setActiveTab(k)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === k ? 'bg-white text-navy shadow-sm' : 'bg-white/30 text-white/80'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'risco' && teacherId && (
          <StudentsAtRiskPanel teacherId={teacherId} />
        )}

        {activeTab === 'chamada' && (
          <>
            {/* Assignment selector for attendance */}
            {assignments.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Selecione a turma
                </label>
                <select
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#028090]/40"
                  value={selectedAssignment}
                  onChange={(e) => setSelectedAssignment(e.target.value)}>
                  {assignments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.classroom.grade} {a.classroom.section} - {a.subject.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentClassroomId && teacherId ? (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <AttendanceSheet classroomId={currentClassroomId} teacherId={teacherId} />
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
                <p className="text-gray-400">Selecione uma turma para fazer a chamada.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'dashboard' && (
        <>
        {/* Assignment selector */}
        {assignments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-6">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
              Turma / Materia
            </label>
            <select
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800
                focus:outline-none focus:ring-2 focus:ring-[#028090]/40 focus:border-[#028090] transition"
              value={selectedAssignment}
              onChange={(e) => setSelectedAssignment(e.target.value)}
            >
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {assignmentLabel(a)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs text-gray-500 font-medium">{card.label}</span>
              </div>
              <p className="text-xl font-bold text-[#1F4E79]">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Fraud alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
              <h2 className="text-base font-bold text-[#1F4E79]">Alertas anti-fraude</h2>
              <span className="ml-auto text-xs font-semibold text-white bg-red-500 rounded-full px-2 py-0.5">
                {alerts.length}
              </span>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl p-4 bg-amber-50 border border-amber-200"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">&#x26A0;&#xFE0F;</span>
                    <div className="flex-1">
                      {alert.student_names && (
                        <p className="text-xs font-semibold text-amber-700 mb-1">{alert.student_names}</p>
                      )}
                      <p className="text-sm text-amber-800">{alert.description}</p>
                      <button
                        onClick={() => markReviewed(alert.id)}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[#028090]
                          hover:text-[#028090]/80 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Revisar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tribe ranking */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
          <h2 className="text-base font-bold text-[#1F4E79] mb-4">Ranking de tribos</h2>

          {tribeRanking.length === 0 && (
            <p className="text-sm text-gray-400 italic">Nenhum dado disponivel para esta turma.</p>
          )}

          <div className="space-y-3">
            {tribeRanking.map((tribe, index) => (
              <div key={tribe.tribe_name} className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#1F4E79] w-6 text-right">{index + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{tribe.tribe_name}</span>
                    <span className="text-xs font-semibold text-gray-500">{tribe.total_points} pts</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max((tribe.total_points / maxTribePoints) * 100, 2)}%`,
                        backgroundColor: tribeColors[index % tribeColors.length],
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* LGPD notice */}
        <div className="bg-gray-100 rounded-xl p-4 mb-8 text-center">
          <p className="text-xs text-gray-500">
            Dados agregados — sem informacoes individuais de alunos (LGPD)
          </p>
        </div>
        </>
        )}
      </div>

      {showEditProfile && user && teacherId && (
        <EditProfileModal
          userId={user.id}
          tableName="teachers"
          recordId={teacherId}
          fields={[
            { key: 'name', label: 'Nome', value: teacherName || '' },
            { key: 'phone', label: 'Telefone', value: teacherPhone },
          ]}
          onClose={() => setShowEditProfile(false)}
          onSaved={(v) => { setTeacherName(v.name || teacherName); setShowEditProfile(false) }}
        />
      )}
    </div>
  )
}
