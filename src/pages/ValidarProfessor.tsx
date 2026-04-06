import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, AlertTriangle, CheckCircle2, ScanLine, Flag } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

type TeacherStatus = 'pending' | 'validated' | 'suspended' | 'banned'

interface TeacherProfile {
  name: string
  email: string
  status: TeacherStatus
  validationsCount: number
  validationsNeeded: number
  reportsCount: number
  subjects: string[]
}

// Simulated teacher data (prototype)
const SIMULATED_TEACHER: TeacherProfile = {
  name: 'Prof. Carlos Mendes',
  email: 'carlos.mendes@escola.com',
  status: 'pending',
  validationsCount: 2,
  validationsNeeded: 5,
  reportsCount: 0,
  subjects: ['Matematica', 'Fisica'],
}

const PENDING_TEACHERS = [
  { id: 't1', name: 'Prof. Ana Rodrigues', subjects: ['Portugues', 'Literatura'], validations: 3 },
  { id: 't2', name: 'Prof. Roberto Santos', subjects: ['Historia'], validations: 1 },
  { id: 't3', name: 'Prof. Fernanda Lima', subjects: ['Biologia', 'Quimica'], validations: 4 },
]

export default function ValidarProfessor() {
  const navigate = useNavigate()
  const [teacher] = useState(SIMULATED_TEACHER)
  const [activeTab, setActiveTab] = useState<'status' | 'validate' | 'report'>('status')
  const [scanning, setScanning] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportTarget, setReportTarget] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [reportConfirm, setReportConfirm] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [validated, setValidated] = useState<string | null>(null)

  const handleScan = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
      // Simulate finding a pending teacher
      setValidated(PENDING_TEACHERS[0]?.id || null)
    }, 1500)
  }

  const handleValidate = (teacherId: string) => {
    setValidated(teacherId)
    // In production: POST to teacher_validations table
  }

  const handleSubmitReport = () => {
    if (reportReason.length < 20 || !reportConfirm || !reportTarget) return
    // In production: POST to reports table with IP, user agent, device info
    setReportSent(true)
    setTimeout(() => {
      setShowReport(false)
      setReportSent(false)
      setReportReason('')
      setReportConfirm(false)
      setReportTarget(null)
    }, 2000)
  }

  const statusColor = {
    pending: 'bg-yellow/10 text-yellow-700 border-yellow/30',
    validated: 'bg-green/10 text-green-700 border-green/30',
    suspended: 'bg-red/10 text-red-700 border-red/30',
    banned: 'bg-red/20 text-red-800 border-red/40',
  }

  const statusLabel = {
    pending: 'Pendente',
    validated: 'Validado',
    suspended: 'Suspenso',
    banned: 'Banido',
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
            <h1 className="font-bold text-navy text-lg">Validacao de Professor</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: 'status' as const, label: 'Meu Status' },
              { id: 'validate' as const, label: 'Validar Colega' },
              { id: 'report' as const, label: 'Denuncias' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-navy shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-6 space-y-4">
        {/* TAB: My Status */}
        {activeTab === 'status' && (
          <>
            {/* Status card */}
            <div className={`rounded-2xl border-2 p-5 ${statusColor[teacher.status]}`}>
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6" />
                <div>
                  <h2 className="font-bold text-lg">{teacher.name}</h2>
                  <p className="text-sm opacity-80">Status: {statusLabel[teacher.status]}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Validacoes recebidas</span>
                  <span className="font-bold">{teacher.validationsCount}/{teacher.validationsNeeded}</span>
                </div>
                <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal rounded-full transition-all duration-500"
                    style={{ width: `${(teacher.validationsCount / teacher.validationsNeeded) * 100}%` }}
                  />
                </div>
                <p className="text-xs mt-2 opacity-70">
                  Faltam {teacher.validationsNeeded - teacher.validationsCount} validacoes para liberar o dashboard completo.
                </p>
              </div>
            </div>

            {/* Subjects */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <h3 className="font-bold text-navy text-sm mb-3">Disciplinas que leciono</h3>
              <div className="flex flex-wrap gap-2">
                {teacher.subjects.map((s) => (
                  <span key={s} className="bg-teal/10 text-teal text-xs font-semibold px-3 py-1.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* QR Code for others to validate me */}
            <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
              <h3 className="font-bold text-navy text-sm mb-3">Meu QR Code de Validacao</h3>
              <p className="text-xs text-gray-500 mb-4">
                Peca para 5 colegas (professores ou alunos) escanearem este codigo para validar voce.
              </p>
              <div className="inline-block bg-white p-3 rounded-xl shadow-md">
                <QRCodeSVG
                  value={`piramide://validate-teacher/${teacher.email}`}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#1F4E79"
                  level="M"
                />
              </div>
            </div>

            {/* Reports received */}
            {teacher.reportsCount > 0 && (
              <div className="bg-red/5 border border-red/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red" />
                  <span className="font-bold text-red text-sm">{teacher.reportsCount} denuncia(s) recebida(s)</span>
                </div>
                <button className="text-xs text-teal font-semibold hover:underline">
                  Solicitar Revisao
                </button>
              </div>
            )}
          </>
        )}

        {/* TAB: Validate Others */}
        {activeTab === 'validate' && (
          <>
            {/* QR Scanner */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <ScanLine className="w-5 h-5 text-teal" />
                <h3 className="font-bold text-navy text-sm">Escanear QR Code</h3>
              </div>
              <button
                onClick={handleScan}
                disabled={scanning}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  scanning
                    ? 'bg-teal/50 text-white cursor-wait'
                    : 'bg-teal text-white hover:bg-teal/90'
                }`}
              >
                {scanning ? 'Escaneando...' : 'Abrir Scanner'}
              </button>
            </div>

            {/* Validated confirmation */}
            {validated && (
              <div className="bg-green/10 border border-green/30 rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-green mx-auto mb-2" />
                <p className="text-green-700 font-semibold text-sm">
                  Validacao registrada com sucesso!
                </p>
                <button
                  onClick={() => setValidated(null)}
                  className="mt-3 text-xs text-teal font-semibold hover:underline"
                >
                  Validar outro professor
                </button>
              </div>
            )}

            {/* Pending teachers list */}
            {!validated && (
              <div>
                <h3 className="font-bold text-navy text-sm mb-3">Professores aguardando validacao</h3>
                <div className="space-y-2">
                  {PENDING_TEACHERS.map((t) => (
                    <div key={t.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center text-xl">
                        📋
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-navy text-sm">{t.name}</p>
                        <p className="text-xs text-gray-500">{t.subjects.join(', ')}</p>
                        <p className="text-xs text-teal">{t.validations}/5 validacoes</p>
                      </div>
                      <button
                        onClick={() => handleValidate(t.id)}
                        className="bg-teal text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-teal/90"
                      >
                        Validar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB: Reports */}
        {activeTab === 'report' && (
          <>
            {!showReport ? (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <h3 className="font-bold text-navy text-sm mb-2">Sistema de Denuncias</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Utilize este recurso apenas para denunciar pessoas que NAO sao professores
                    mas se cadastraram como tal. Denuncias falsas resultam em suspensao.
                  </p>

                  <h4 className="font-semibold text-navy text-xs mb-2">Professores para denunciar:</h4>
                  <div className="space-y-2">
                    {PENDING_TEACHERS.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <span className="text-xl">📋</span>
                        <span className="flex-1 text-sm text-navy">{t.name}</span>
                        <button
                          onClick={() => { setReportTarget(t.id); setShowReport(true) }}
                          className="text-xs text-red font-semibold flex items-center gap-1 hover:underline"
                        >
                          <Flag className="w-3 h-3" />
                          Denunciar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-3">
                  <p className="text-xs text-yellow-700">
                    Limite: 1 denuncia por professor por mes. Denuncias falsas podem
                    resultar em suspensao de 3 dias, 1 semana, 1 mes ou banimento permanente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                {reportSent ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="w-12 h-12 text-green mx-auto mb-3" />
                    <h3 className="font-bold text-navy text-lg">Denuncia enviada</h3>
                    <p className="text-xs text-gray-500 mt-1">Sera analisada pela comunidade.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red" />
                      <h3 className="font-bold text-red text-sm">Registrar Denuncia</h3>
                    </div>

                    <div className="bg-red/5 border border-red/20 rounded-xl p-3 mb-4">
                      <p className="text-xs text-red-700 font-semibold">
                        ATENCAO: Sua denuncia sera registrada com seu IP, data/hora e dispositivo.
                        Denuncias falsas resultam em suspensao.
                      </p>
                    </div>

                    <textarea
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Motivo da denuncia (minimo 20 caracteres)..."
                      rows={4}
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red/30 focus:border-red resize-none mb-3"
                    />
                    <p className={`text-xs mb-3 ${reportReason.length < 20 ? 'text-red' : 'text-gray-400'}`}>
                      {reportReason.length}/20 caracteres minimos
                    </p>

                    <label className="flex items-start gap-2 mb-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={reportConfirm}
                        onChange={(e) => setReportConfirm(e.target.checked)}
                        className="mt-1 w-4 h-4 accent-red"
                      />
                      <span className="text-xs text-gray-700">
                        Confirmo que esta denuncia e verdadeira e estou ciente das consequencias de denuncias falsas.
                      </span>
                    </label>

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowReport(false); setReportReason(''); setReportConfirm(false) }}
                        className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSubmitReport}
                        disabled={reportReason.length < 20 || !reportConfirm}
                        className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                          reportReason.length >= 20 && reportConfirm
                            ? 'bg-red text-white hover:bg-red/90'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Enviar Denuncia
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
