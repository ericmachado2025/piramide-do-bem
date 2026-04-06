import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, AlertTriangle, Calendar, Users } from 'lucide-react'

// Simulated students per class (prototype)
const STUDENTS_BY_CLASS: Record<string, { id: string; name: string; tribe: string; consecutiveAbsences: number }[]> = {
  '9oA': [
    { id: 's1', name: 'Ana Beatriz Silva', tribe: '🦸', consecutiveAbsences: 0 },
    { id: 's2', name: 'Bruno Costa', tribe: '⚡', consecutiveAbsences: 2 },
    { id: 's3', name: 'Camila Rodrigues', tribe: '🧙', consecutiveAbsences: 0 },
    { id: 's4', name: 'Diego Santos', tribe: '⚔️', consecutiveAbsences: 4 },
    { id: 's5', name: 'Eduarda Lima', tribe: '🍃', consecutiveAbsences: 0 },
    { id: 's6', name: 'Felipe Oliveira', tribe: '🦸', consecutiveAbsences: 1 },
    { id: 's7', name: 'Gabriela Martins', tribe: '🎸', consecutiveAbsences: 0 },
    { id: 's8', name: 'Henrique Souza', tribe: '⚡', consecutiveAbsences: 0 },
    { id: 's9', name: 'Isabela Ferreira', tribe: '🗡️', consecutiveAbsences: 3 },
    { id: 's10', name: 'Joao Pedro Almeida', tribe: '🏆', consecutiveAbsences: 0 },
    { id: 's11', name: 'Karla Mendes', tribe: '🦸', consecutiveAbsences: 0 },
    { id: 's12', name: 'Lucas Pereira', tribe: '⚡', consecutiveAbsences: 0 },
  ],
  '9oB': [
    { id: 's13', name: 'Maria Clara Souza', tribe: '🧙', consecutiveAbsences: 0 },
    { id: 's14', name: 'Nicolas Barros', tribe: '⚔️', consecutiveAbsences: 1 },
    { id: 's15', name: 'Olivia Castro', tribe: '🍃', consecutiveAbsences: 0 },
    { id: 's16', name: 'Pedro Henrique Dias', tribe: '🦸', consecutiveAbsences: 5 },
    { id: 's17', name: 'Rafaela Gomes', tribe: '🎸', consecutiveAbsences: 0 },
    { id: 's18', name: 'Samuel Ribeiro', tribe: '⚡', consecutiveAbsences: 0 },
    { id: 's19', name: 'Tatiana Lopes', tribe: '🗡️', consecutiveAbsences: 2 },
    { id: 's20', name: 'Vinicius Moreira', tribe: '🏆', consecutiveAbsences: 0 },
  ],
  '1oEMA': [
    { id: 's21', name: 'Amanda Nunes', tribe: '🦸', consecutiveAbsences: 0 },
    { id: 's22', name: 'Bernardo Teixeira', tribe: '⚡', consecutiveAbsences: 0 },
    { id: 's23', name: 'Carolina Vieira', tribe: '🧙', consecutiveAbsences: 1 },
    { id: 's24', name: 'Daniel Fonseca', tribe: '⚔️', consecutiveAbsences: 0 },
    { id: 's25', name: 'Emanuela Rocha', tribe: '🍃', consecutiveAbsences: 3 },
    { id: 's26', name: 'Fernando Carvalho', tribe: '🎸', consecutiveAbsences: 0 },
  ],
}

const CLASSES = [
  { id: '9oA', label: '9o A' },
  { id: '9oB', label: '9o B' },
  { id: '1oEMA', label: '1o EM-A' },
]

export default function RegistrarAusencias() {
  const navigate = useNavigate()
  const [selectedClass, setSelectedClass] = useState(CLASSES[0].id)
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState(false)

  const students = STUDENTS_BY_CLASS[selectedClass] || []
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const alertStudents = useMemo(() => {
    return students.filter((s) => s.consecutiveAbsences >= 3)
  }, [students])

  const toggleAbsent = (studentId: string) => {
    setAbsentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const handleSave = () => {
    // Save to localStorage (prototype). In production → Supabase attendance table
    const key = `piramide-attendance-${selectedClass}-${new Date().toISOString().split('T')[0]}`
    const record = {
      classId: selectedClass,
      date: new Date().toISOString().split('T')[0],
      absentIds: [...absentIds],
      registeredAt: new Date().toISOString(),
    }
    localStorage.setItem(key, JSON.stringify(record))

    // Check consecutive absences for notifications
    const newAbsentStudents = students.filter((s) => absentIds.has(s.id))
    newAbsentStudents.forEach((s) => {
      const newConsecutive = s.consecutiveAbsences + 1
      if (newConsecutive >= 3) {
        // In production: send notification to tribe members + parents
        console.log(`ALERTA: ${s.name} faltou ${newConsecutive} dias consecutivos`)
      }
    })

    setSaved(true)
  }

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId)
    setAbsentIds(new Set())
    setSaved(false)
  }

  if (saved) {
    const absentStudents = students.filter((s) => absentIds.has(s.id))
    return (
      <div className="min-h-screen bg-bg">
        <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-4 sticky top-0 z-10">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="p-1 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} className="text-navy" />
            </button>
            <h1 className="font-bold text-navy text-lg">Ausencias Registradas</h1>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-6 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-navy mb-2">Registro salvo!</h2>
          <p className="text-gray-500 text-sm mb-6">
            {students.length - absentIds.size} presentes, {absentIds.size} ausente(s)
          </p>

          {absentStudents.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 text-left">
              <h3 className="font-semibold text-navy text-sm mb-3">Alunos ausentes hoje:</h3>
              {absentStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5">
                  <span className="text-lg">{s.tribe}</span>
                  <span className="text-sm text-gray-700">{s.name}</span>
                  {s.consecutiveAbsences >= 2 && (
                    <span className="ml-auto text-xs bg-red/10 text-red-700 px-2 py-0.5 rounded-full">
                      {s.consecutiveAbsences + 1} dias seguidos
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Alerts for tribe members */}
          {absentStudents.some((s) => s.consecutiveAbsences >= 2) && (
            <div className="bg-yellow/10 border border-yellow/30 rounded-xl p-4 mb-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-700" />
                <span className="font-semibold text-yellow-800 text-sm">Alertas enviados</span>
              </div>
              <p className="text-xs text-yellow-700">
                Os membros da tribo dos alunos com 3+ faltas consecutivas foram notificados.
                Os pais tambem receberam alerta.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setSaved(false); setAbsentIds(new Set()) }}
              className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50"
            >
              Registrar outra turma
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-teal text-white font-bold py-3 rounded-xl hover:bg-teal/90"
            >
              Voltar ao Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 pt-6 pb-4 sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/dashboard')} className="p-1 rounded-full hover:bg-gray-100">
              <ArrowLeft size={22} className="text-navy" />
            </button>
            <h1 className="font-bold text-navy text-lg">Registrar Ausencias</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span className="capitalize">{today}</span>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* Class selector */}
        <div className="flex gap-2">
          {CLASSES.map((cls) => (
            <button
              key={cls.id}
              onClick={() => handleClassChange(cls.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                selectedClass === cls.id
                  ? 'bg-navy text-white shadow-md'
                  : 'bg-white text-gray-500 hover:bg-gray-50 shadow-sm'
              }`}
            >
              {cls.label}
            </button>
          ))}
        </div>

        {/* Alerts for students with many absences */}
        {alertStudents.length > 0 && (
          <div className="bg-red/5 border border-red/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red" />
              <span className="font-bold text-red text-sm">Alunos em risco de evasao</span>
            </div>
            {alertStudents.map((s) => (
              <p key={s.id} className="text-xs text-red-700 ml-7">
                {s.name} — {s.consecutiveAbsences} faltas consecutivas
              </p>
            ))}
          </div>
        )}

        {/* Student list with checkboxes */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-teal" />
              <span className="font-bold text-navy text-sm">{students.length} alunos</span>
            </div>
            <span className="text-xs text-gray-400">
              {absentIds.size} ausente(s) marcado(s)
            </span>
          </div>

          <p className="text-xs text-gray-400 mb-3">
            Todos marcados como presentes por padrao. Desmarque quem faltou.
          </p>

          <div className="space-y-1">
            {students.map((student) => {
              const isAbsent = absentIds.has(student.id)
              const hasAlert = student.consecutiveAbsences >= 3

              return (
                <button
                  key={student.id}
                  onClick={() => toggleAbsent(student.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-[0.98] ${
                    isAbsent
                      ? 'bg-red/5 border-2 border-red/30'
                      : 'bg-green/5 border-2 border-green/20'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isAbsent
                      ? 'bg-white border-red/40'
                      : 'bg-green border-green'
                  }`}>
                    {!isAbsent && <Check className="w-4 h-4 text-white" />}
                  </div>

                  <span className="text-lg">{student.tribe}</span>
                  <span className={`flex-1 text-left text-sm font-medium ${isAbsent ? 'text-red-700 line-through' : 'text-navy'}`}>
                    {student.name}
                  </span>

                  {hasAlert && (
                    <span className="text-[10px] bg-red/10 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                      {student.consecutiveAbsences}d
                    </span>
                  )}

                  <span className={`text-xs font-semibold ${isAbsent ? 'text-red' : 'text-green'}`}>
                    {isAbsent ? 'Faltou' : 'Presente'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full bg-teal text-white font-bold py-4 rounded-xl hover:bg-teal/90 active:scale-[0.98] transition-all shadow-md"
        >
          Confirmar Registro ({students.length - absentIds.size} presentes, {absentIds.size} ausente{absentIds.size !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  )
}
