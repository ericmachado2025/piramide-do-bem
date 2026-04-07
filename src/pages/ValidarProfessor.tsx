import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, ScanLine, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { QRCodeSVG } from 'qrcode.react'

export default function ValidarProfessor() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'status' | 'validate' | 'report'>('status')
  const [scanning, setScanning] = useState(false)
  const [validated, setValidated] = useState<string | null>(null)

  const handleScan = () => {
    setScanning(true)
    setTimeout(() => {
      setScanning(false)
    }, 1500)
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
            <div className="rounded-2xl border-2 p-5 bg-yellow/10 text-yellow-700 border-yellow/30">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6" />
                <div>
                  <h2 className="font-bold text-lg">Validacao Pendente</h2>
                  <p className="text-sm opacity-80">Funcionalidade em construcao</p>
                </div>
              </div>
              <p className="text-xs mt-2 opacity-70">
                O sistema de validacao de professores sera ativado quando o modulo de gestao escolar estiver completo.
              </p>
            </div>

            {/* QR Code */}
            {user && (
              <div className="bg-white rounded-2xl shadow-sm p-5 text-center">
                <h3 className="font-bold text-navy text-sm mb-3">Meu QR Code de Validacao</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Peca para colegas escanearem este codigo para validar voce como professor.
                </p>
                <div className="inline-block bg-white p-3 rounded-xl shadow-md">
                  <QRCodeSVG
                    value={`piramide://validate-teacher/${user.email}`}
                    size={160}
                    bgColor="#ffffff"
                    fgColor="#1F4E79"
                    level="M"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB: Validate Others */}
        {activeTab === 'validate' && (
          <>
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

            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <span className="text-5xl block mb-3">{'\u{1F4CB}'}</span>
              <h3 className="text-lg font-bold text-navy mb-2">Nenhum professor pendente</h3>
              <p className="text-gray-400 text-sm">
                Quando professores solicitarem validacao, eles aparecerão aqui.
              </p>
            </div>
          </>
        )}

        {/* TAB: Reports */}
        {activeTab === 'report' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-navy text-sm mb-2">Sistema de Denuncias</h3>
              <p className="text-xs text-gray-500 mb-4">
                Utilize este recurso apenas para denunciar pessoas que NAO sao professores
                mas se cadastraram como tal. Denuncias falsas resultam em suspensao.
              </p>

              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <span className="text-4xl block mb-2">{'\u2705'}</span>
                <p className="text-gray-400 text-sm">Nenhuma denuncia pendente.</p>
              </div>
            </div>

            <div className="bg-yellow/5 border border-yellow/20 rounded-xl p-3">
              <p className="text-xs text-yellow-700">
                Limite: 1 denuncia por professor por mes. Denuncias falsas podem
                resultar em suspensao de 3 dias, 1 semana, 1 mes ou banimento permanente.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
