import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import CadastroPerfil from './pages/CadastroPerfil'
import Cadastro from './pages/Cadastro'
import AuthCallback from './pages/AuthCallback'
import EscolhaTribo from './pages/EscolhaTribo'
import EscolhaPersonagem from './pages/EscolhaPersonagem'
import Home from './pages/Home'
import RegistrarAcao from './pages/RegistrarAcao'
import ValidarAcao from './pages/ValidarAcao'
import Perfil from './pages/Perfil'
import Ranking from './pages/Ranking'
import ComoFunciona from './pages/ComoFunciona'
import Creditos from './pages/Creditos'
import Mapa from './pages/Mapa'
import Recompensas from './pages/Recompensas'
import Dashboard from './pages/Dashboard'
import RegistrarAusencias from './pages/RegistrarAusencias'
import AreaPais from './pages/AreaPais'
import ValidarProfessor from './pages/ValidarProfessor'
import Monitoria from './pages/Monitoria'
import Notificacoes from './pages/Notificacoes'
import Patrocinadores from './pages/Patrocinadores'
import Estatisticas from './pages/Estatisticas'
import ProfessorCadastro from './pages/ProfessorCadastro'
import ProfessorDashboard from './pages/ProfessorDashboard'
import ResponsavelCadastro from './pages/ResponsavelCadastro'
import ResponsavelDashboard from './pages/ResponsavelDashboard'
import PatrocinadorCadastro from './pages/PatrocinadorCadastro'
import PatrocinadorDashboard from './pages/PatrocinadorDashboard'
import AutorizarResponsavel from './pages/AutorizarResponsavel'
import Confirmar from './pages/Confirmar'
import LoginQr from './pages/LoginQr'
import VerificationGuard from './components/VerificationGuard'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Público */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro/perfil" element={<CadastroPerfil />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/estatisticas" element={<Estatisticas />} />
          <Route path="/autorizar" element={<AutorizarResponsavel />} />
          <Route path="/confirmar/:token" element={<Confirmar />} />
          <Route path="/login-qr/:token" element={<LoginQr />} />

          {/* Aluno — protegido */}
          <Route path="/tribo" element={<EscolhaTribo />} />
          <Route path="/personagem" element={<EscolhaPersonagem />} />
          <Route path="/home" element={<VerificationGuard><Home /></VerificationGuard>} />
          <Route path="/registrar" element={<VerificationGuard><RegistrarAcao /></VerificationGuard>} />
          <Route path="/validar" element={<VerificationGuard><ValidarAcao /></VerificationGuard>} />
          <Route path="/perfil" element={<VerificationGuard><Perfil /></VerificationGuard>} />
          <Route path="/ranking" element={<VerificationGuard><Ranking /></VerificationGuard>} />
          <Route path="/como-funciona" element={<VerificationGuard><ComoFunciona /></VerificationGuard>} />
          <Route path="/creditos" element={<VerificationGuard><Creditos /></VerificationGuard>} />
          <Route path="/mapa" element={<VerificationGuard><Mapa /></VerificationGuard>} />
          <Route path="/recompensas" element={<VerificationGuard><Recompensas /></VerificationGuard>} />
          <Route path="/monitoria" element={<VerificationGuard><Monitoria /></VerificationGuard>} />
          <Route path="/notificacoes" element={<VerificationGuard><Notificacoes /></VerificationGuard>} />
          <Route path="/patrocinadores" element={<VerificationGuard><Patrocinadores /></VerificationGuard>} />

          {/* Professor */}
          <Route path="/professor/cadastro" element={<ProfessorCadastro />} />
          <Route path="/professor/dashboard" element={<ProfessorDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/validar-professor" element={<ValidarProfessor />} />
          <Route path="/ausencias" element={<RegistrarAusencias />} />

          {/* Responsável */}
          <Route path="/responsavel/cadastro" element={<ResponsavelCadastro />} />
          <Route path="/responsavel/dashboard" element={<ResponsavelDashboard />} />
          <Route path="/pais" element={<AreaPais />} />

          {/* Patrocinador */}
          <Route path="/patrocinador/cadastro" element={<PatrocinadorCadastro />} />
          <Route path="/patrocinador/dashboard" element={<PatrocinadorDashboard />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
