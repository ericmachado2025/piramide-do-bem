import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import AuthCallback from './pages/AuthCallback'
import EscolhaTribo from './pages/EscolhaTribo'
import EscolhaPersonagem from './pages/EscolhaPersonagem'
import Home from './pages/Home'
import RegistrarAcao from './pages/RegistrarAcao'
import ValidarAcao from './pages/ValidarAcao'
import Perfil from './pages/Perfil'
import Ranking from './pages/Ranking'
import Mapa from './pages/Mapa'
import Recompensas from './pages/Recompensas'
import Dashboard from './pages/Dashboard'
import RegistrarAusencias from './pages/RegistrarAusencias'
import AreaPais from './pages/AreaPais'
import ValidarProfessor from './pages/ValidarProfessor'
import Monitoria from './pages/Monitoria'
import Notificacoes from './pages/Notificacoes'
import Patrocinadores from './pages/Patrocinadores'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/tribo" element={<EscolhaTribo />} />
          <Route path="/personagem" element={<EscolhaPersonagem />} />
          <Route path="/home" element={<Home />} />
          <Route path="/registrar" element={<RegistrarAcao />} />
          <Route path="/validar" element={<ValidarAcao />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/mapa" element={<Mapa />} />
          <Route path="/recompensas" element={<Recompensas />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ausencias" element={<RegistrarAusencias />} />
          <Route path="/pais" element={<AreaPais />} />
          <Route path="/validar-professor" element={<ValidarProfessor />} />
          <Route path="/monitoria" element={<Monitoria />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/patrocinadores" element={<Patrocinadores />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
