import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ArrowLeft,
  Users,
  CheckCircle,
  School,
  Trophy,
  Flame,
  MapPin,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface StateMapData {
  state: string
  total_schools: number
  total_students: number
  total_actions: number
  lat: number
  lng: number
}

interface SchoolMapData {
  id: string
  name: string
  city: string
  state: string
  latitude: number
  longitude: number
  total_students: number
  recent_actions: number
}

interface SchoolRanking {
  school_id: string
  school_name: string
  student_count: number
}

interface TribeRanking {
  community_id: string
  community_name: string
  student_count: number
}

function getStateIcon(d: StateMapData): L.DivIcon {
  let color = '#9CA3AF'
  if (d.total_students > 0 && d.total_actions === 0) color = '#3B82F6'
  if (d.total_actions > 0) color = '#10B981'

  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};color:white;padding:4px 8px;
      border-radius:12px;font-size:11px;font-weight:700;
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.25);
      white-space:nowrap;
    ">${d.state}<br/><span style="font-size:10px;font-weight:400;">${d.total_schools.toLocaleString('pt-BR')} esc.</span></div>`,
    iconSize: [60, 36],
    iconAnchor: [30, 18],
  })
}

function getSchoolIcon(students: number, actions: number): L.DivIcon {
  let color = '#9CA3AF'
  if (students > 0 && actions === 0) color = '#3B82F6'
  if (actions > 0) color = '#10B981'
  const size = Math.min(Math.max(8 + students * 2, 10), 28)

  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};border:2px solid white;
      border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 flex items-start gap-4">
      <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#028090' }}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold" style={{ color: '#1F4E79' }}>{value}</p>
      </div>
    </div>
  )
}

export default function Estatisticas() {
  const [loading, setLoading] = useState(true)
  const [mapMode, setMapMode] = useState<'brasil' | 'estado'>('brasil')
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [stateData, setStateData] = useState<StateMapData[]>([])
  const [schoolData, setSchoolData] = useState<SchoolMapData[]>([])
  const [loadingDrill, setLoadingDrill] = useState(false)
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalActions, setTotalActions] = useState(0)
  const [totalSchools, setTotalSchools] = useState(0)
  const [topSchools, setTopSchools] = useState<SchoolRanking[]>([])
  const [topTribes, setTopTribes] = useState<TribeRanking[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // State-level map data via RPC
        const { data: rpcData } = await supabase.rpc('get_map_schools_by_state')
        setStateData((rpcData as StateMapData[]) ?? [])

        // Totals
        const { count: sc } = await supabase.from('students').select('id', { count: 'exact', head: true })
        const { count: ac } = await supabase.from('actions').select('id', { count: 'exact', head: true }).eq('status', 'validated')
        const { count: sk } = await supabase.from('schools').select('id', { count: 'exact', head: true })
        setTotalStudents(sc ?? 0)
        setTotalActions(ac ?? 0)
        setTotalSchools(sk ?? 0)

        // Top 10 schools
        const { data: studentSchools } = await supabase.from('students').select('school_id')
        const schoolCountMap: Record<string, number> = {}
        for (const s of studentSchools ?? []) {
          const sid = (s as { school_id: string }).school_id
          if (sid) schoolCountMap[sid] = (schoolCountMap[sid] || 0) + 1
        }
        const sorted = Object.entries(schoolCountMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
        if (sorted.length > 0) {
          const { data: names } = await supabase.from('schools').select('id, name').in('id', sorted.map(([id]) => id))
          const nameMap: Record<string, string> = {}
          for (const n of names ?? []) nameMap[(n as { id: string; name: string }).id] = (n as { id: string; name: string }).name
          setTopSchools(sorted.map(([id, count]) => ({ school_id: id, school_name: nameMap[id] || 'Escola', student_count: count })))
        }

        // Top 3 tribes
        const { data: studentTribes } = await supabase.from('students').select('community_id')
        const tribeMap: Record<string, number> = {}
        for (const t of studentTribes ?? []) {
          const tid = (t as { community_id: string }).community_id
          if (tid) tribeMap[tid] = (tribeMap[tid] || 0) + 1
        }
        const sortedTribes = Object.entries(tribeMap).sort((a, b) => b[1] - a[1]).slice(0, 3)
        if (sortedTribes.length > 0) {
          const { data: tNames } = await supabase.from('communities').select('id, name').in('id', sortedTribes.map(([id]) => id))
          const tNameMap: Record<string, string> = {}
          for (const n of tNames ?? []) tNameMap[(n as { id: string; name: string }).id] = (n as { id: string; name: string }).name
          setTopTribes(sortedTribes.map(([id, count]) => ({ community_id: id, community_name: tNameMap[id] || 'Comunidade', student_count: count })))
        }
      } catch (err) {
        console.error('Erro ao buscar estatísticas:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  async function handleStateClick(state: string) {
    setLoadingDrill(true)
    setSelectedState(state)
    setMapMode('estado')
    const { data } = await supabase.rpc('get_map_schools_by_uf', { p_state: state })
    setSchoolData((data as SchoolMapData[]) ?? [])
    setLoadingDrill(false)
  }

  function handleBackToBrasil() {
    setMapMode('brasil')
    setSelectedState(null)
    setSchoolData([])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="px-4 py-6 text-white" style={{ background: 'linear-gradient(135deg, #028090 0%, #1F4E79 100%)' }}>
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm">
            <ArrowLeft size={18} /><span>Voltar</span>
          </Link>
        </div>
        <div className="max-w-5xl mx-auto mt-3">
          <h1 className="text-2xl md:text-3xl font-bold">Impacto da Pirâmide do Bem</h1>
          <p className="text-white/70 text-sm mt-1">Acompanhe o crescimento da nossa comunidade em tempo real</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Stat cards — sempre visíveis */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Escolas no Brasil" value={totalSchools.toLocaleString('pt-BR')} icon={School} />
              <StatCard label="Alunos cadastrados" value={totalStudents.toLocaleString('pt-BR')} icon={Users} />
              <StatCard label="Ações validadas" value={totalActions.toLocaleString('pt-BR')} icon={CheckCircle} />
              <StatCard label="Estados ativos" value={stateData.filter(s => s.total_students > 0).length.toString()} icon={MapPin} />
            </div>
          )}
        </section>

        {/* Mapa */}
        {!loading && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F4E79' }}>
              <MapPin size={22} style={{ color: '#028090' }} />
              Mapa das Escolas
            </h2>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: 480 }}>
              <MapContainer center={[-14.235, -51.925]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

                {mapMode === 'brasil' && stateData.map(d => (
                  <Marker key={d.state} position={[d.lat, d.lng]} icon={getStateIcon(d)}
                    eventHandlers={{ click: () => handleStateClick(d.state) }}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold" style={{ color: '#1F4E79' }}>{d.state}</p>
                        <p>{d.total_schools.toLocaleString('pt-BR')} escolas</p>
                        <p>{d.total_students} alunos cadastrados</p>
                        <p>{d.total_actions} ações esta semana</p>
                        <button onClick={() => handleStateClick(d.state)} className="mt-2 text-xs text-teal underline">
                          Ver escolas →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {mapMode === 'estado' && schoolData.map(s => (
                  <Marker key={s.id} position={[s.latitude, s.longitude]}
                    icon={getSchoolIcon(s.total_students, s.recent_actions)}>
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold" style={{ color: '#1F4E79' }}>{s.name}</p>
                        <p className="text-gray-500">{s.city} — {s.state}</p>
                        <p>{s.total_students} aluno{s.total_students !== 1 ? 's' : ''} cadastrado{s.total_students !== 1 ? 's' : ''}</p>
                        {s.recent_actions > 0 && (
                          <p className="text-green-600">{s.recent_actions} ação{s.recent_actions !== 1 ? 'ões' : ''} esta semana</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="flex items-center justify-between mt-3 mb-6">
              {mapMode === 'estado' ? (
                <button onClick={handleBackToBrasil} className="flex items-center gap-1 text-sm text-teal hover:underline">
                  ← Voltar para visão Brasil
                </button>
              ) : (
                <p className="text-xs text-gray-400">Clique em um estado para ver as escolas</p>
              )}
              {mapMode === 'estado' && selectedState && (
                <span className="text-sm font-semibold" style={{ color: '#1F4E79' }}>
                  {loadingDrill ? 'Carregando...' : `${schoolData.length.toLocaleString('pt-BR')} escolas em ${selectedState}`}
                </span>
              )}
            </div>

            <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400" /><span>Sem alunos</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Com alunos</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Ativa esta semana</span></div>
            </div>
          </section>
        )}

        {/* Top 10 escolas */}
        {!loading && topSchools.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F4E79' }}>
              <Trophy size={22} style={{ color: '#028090' }} />
              Top 10 Escolas Mais Engajadas
            </h2>
            <div className="bg-white rounded-2xl shadow-lg divide-y">
              {topSchools.map((school, i) => (
                <div key={school.school_id} className="flex items-center gap-4 px-6 py-4">
                  <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7F32' : '#028090' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: '#1F4E79' }}>{school.school_name}</p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {school.student_count} {school.student_count === 1 ? 'aluno' : 'alunos'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top 3 tribos */}
        {!loading && topTribes.length > 0 && (
          <section className="pb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F4E79' }}>
              <Flame size={22} style={{ color: '#028090' }} />
              Top 3 Tribos Mais Populares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topTribes.map((tribe, i) => (
                <div key={tribe.community_id} className="bg-white rounded-2xl shadow-lg p-6 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg mb-3"
                    style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#CD7F32' }}>
                    {i + 1}
                  </span>
                  <p className="font-bold text-lg" style={{ color: '#1F4E79' }}>{tribe.community_name}</p>
                  <p className="text-sm text-gray-500 mt-1">{tribe.student_count} {tribe.student_count === 1 ? 'aluno' : 'alunos'}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
