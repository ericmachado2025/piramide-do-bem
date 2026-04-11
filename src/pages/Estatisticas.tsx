import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
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
  GraduationCap,
  Building2,
  Gift,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

/* ------------------------------------------------------------------ */
/*  Interfaces                                                         */
/* ------------------------------------------------------------------ */

interface GlobalStats {
  total_schools: number
  total_students: number
  total_teachers: number
  total_sponsors: number
  total_rewards: number
  total_actions: number
  active_states: number
}

interface StateMapData {
  state: string
  total_schools: number
  total_students: number
  total_teachers: number
  total_sponsors: number
  total_rewards: number
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
  total_teachers: number
  total_sponsors: number
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

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATE_NAMES: Record<string, string> = {
  AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapa',BA:'Bahia',CE:'Ceara',
  DF:'Distrito Federal',ES:'Espirito Santo',GO:'Goias',MA:'Maranhao',
  MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',PA:'Para',
  PB:'Paraiba',PE:'Pernambuco',PI:'Piaui',PR:'Parana',RJ:'Rio de Janeiro',
  RN:'Rio Grande do Norte',RO:'Rondonia',RR:'Roraima',RS:'Rio Grande do Sul',
  SC:'Santa Catarina',SE:'Sergipe',SP:'Sao Paulo',TO:'Tocantins',
}

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function MapController({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  return null
}

function getStateIcon(d: StateMapData, isSelected: boolean): L.DivIcon {
  let color = '#9CA3AF'
  if (d.total_students > 0 && d.total_actions === 0) color = '#3B82F6'
  if (d.total_actions > 0) color = '#10B981'
  const border = isSelected ? '3px solid #F59E0B' : '2px solid white'
  const shadow = isSelected ? '0 0 0 3px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.35)' : '0 1px 4px rgba(0,0,0,0.25)'
  return L.divIcon({
    className: '',
    iconSize: [60, 36],
    iconAnchor: [30, 18],
    html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700;border:${border};box-shadow:${shadow};white-space:nowrap;">${d.state}<br/><span style="font-size:10px;font-weight:400;">${d.total_schools.toLocaleString('pt-BR')} esc.</span></div>`,
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
    <div className="bg-white rounded-2xl shadow-lg p-4 flex items-start gap-3">
      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#028090' }}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold" style={{ color: '#1F4E79' }}>{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function Estatisticas() {
  const mapRef = useRef<L.Map | null>(null)

  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [stateData, setStateData] = useState<StateMapData[]>([])
  const [schoolData, setSchoolData] = useState<SchoolMapData[]>([])
  const [loadingDrill, setLoadingDrill] = useState(false)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [topSchools, setTopSchools] = useState<SchoolRanking[]>([])
  const [topTribes, setTopTribes] = useState<TribeRanking[]>([])

  /* ---------- data fetching ---------- */

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: rpcData }, { data: statsData }] = await Promise.all([
          supabase.rpc('get_map_schools_by_state'),
          supabase.rpc('get_global_stats'),
        ])
        setStateData((rpcData as StateMapData[]) ?? [])
        if (statsData && statsData[0]) setGlobalStats(statsData[0] as GlobalStats)

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
        console.error('Erro ao buscar estatisticas:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  /* ---------- map interactions ---------- */

  async function handleStateClick(state: string) {
    setLoadingDrill(true)
    setSelectedState(state)
    const { data } = await supabase.rpc('get_map_schools_by_uf', { p_state: state })
    setSchoolData((data as SchoolMapData[]) ?? [])
    setLoadingDrill(false)
    const si = stateData.find(s => s.state === state)
    if (si && mapRef.current) mapRef.current.flyTo([si.lat, si.lng], 7, { duration: 1.2 })
  }

  function handleBackToBrasil() {
    setSelectedState(null)
    setSchoolData([])
    if (mapRef.current) mapRef.current.flyTo([-14.235, -51.925], 4, { duration: 1.2 })
  }

  /* ---------- derived UF stats ---------- */

  const ufStats = useMemo(() => {
    if (!selectedState || schoolData.length === 0) return null
    return {
      schools: schoolData.length,
      students: schoolData.reduce((s, c) => s + c.total_students, 0),
      teachers: schoolData.reduce((s, c) => s + c.total_teachers, 0),
      sponsors: schoolData.reduce((s, c) => s + c.total_sponsors, 0),
      actions: schoolData.reduce((s, c) => s + c.recent_actions, 0),
    }
  }, [selectedState, schoolData])

  /* ---------- render ---------- */

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
          <h1 className="text-2xl md:text-3xl font-bold">Impacto da Piramide do Bem</h1>
          <p className="text-white/70 text-sm mt-1">Acompanhe o crescimento da nossa comunidade em tempo real</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Stat cards */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : selectedState && ufStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Escolas" value={ufStats.schools.toLocaleString('pt-BR')} icon={School} />
              <StatCard label="Alunos cadastrados" value={ufStats.students.toLocaleString('pt-BR')} icon={Users} />
              <StatCard label="Professores" value={ufStats.teachers.toLocaleString('pt-BR')} icon={GraduationCap} />
              <StatCard label="Patrocinadores" value={ufStats.sponsors.toLocaleString('pt-BR')} icon={Building2} />
              <StatCard label="Acoes esta semana" value={ufStats.actions.toLocaleString('pt-BR')} icon={CheckCircle} />
            </div>
          ) : globalStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Escolas no Brasil" value={globalStats.total_schools.toLocaleString('pt-BR')} icon={School} />
              <StatCard label="Alunos cadastrados" value={globalStats.total_students.toLocaleString('pt-BR')} icon={Users} />
              <StatCard label="Professores" value={globalStats.total_teachers.toLocaleString('pt-BR')} icon={GraduationCap} />
              <StatCard label="Patrocinadores" value={globalStats.total_sponsors.toLocaleString('pt-BR')} icon={Building2} />
              <StatCard label="Ofertas" value={globalStats.total_rewards.toLocaleString('pt-BR')} icon={Gift} />
              <StatCard label="Acoes validadas" value={globalStats.total_actions.toLocaleString('pt-BR')} icon={CheckCircle} />
            </div>
          ) : null}
        </section>

        {/* Mapa */}
        {!loading && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              {selectedState && (
                <button onClick={handleBackToBrasil} className="flex items-center gap-1 text-sm hover:underline" style={{ color: '#028090' }}>
                  <ArrowLeft size={16} /> Voltar
                </button>
              )}
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1F4E79' }}>
                <MapPin size={22} style={{ color: '#028090' }} />
                {selectedState
                  ? `${selectedState} — ${STATE_NAMES[selectedState] ?? selectedState}`
                  : 'Mapa das Escolas'}
              </h2>
              {selectedState && (
                <span className="ml-auto text-sm text-gray-500">
                  {loadingDrill ? 'Carregando...' : `${schoolData.length.toLocaleString('pt-BR')} escolas`}
                </span>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: 480 }}>
              <MapContainer center={[-14.235, -51.925]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapController mapRef={mapRef} />

                {/* State markers — always visible */}
                {stateData.map(d => (
                  <Marker
                    key={d.state}
                    position={[d.lat, d.lng]}
                    icon={getStateIcon(d, d.state === selectedState)}
                    eventHandlers={{ click: () => handleStateClick(d.state) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold" style={{ color: '#1F4E79' }}>{d.state} — {STATE_NAMES[d.state] ?? d.state}</p>
                        <p>{d.total_schools.toLocaleString('pt-BR')} escolas</p>
                        <p>{d.total_students} alunos cadastrados</p>
                        <p>{d.total_actions} acoes esta semana</p>
                        <button onClick={() => handleStateClick(d.state)} className="mt-2 text-xs underline" style={{ color: '#028090' }}>
                          Ver escolas
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* School markers — visible when state selected */}
                {selectedState && schoolData.map(s => (
                  <Marker
                    key={s.id}
                    position={[s.latitude, s.longitude]}
                    icon={getSchoolIcon(s.total_students, s.recent_actions)}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold" style={{ color: '#1F4E79' }}>{s.name}</p>
                        <p className="text-gray-500">{s.city} — {s.state}</p>
                        <p>{s.total_students} aluno{s.total_students !== 1 ? 's' : ''} cadastrado{s.total_students !== 1 ? 's' : ''}</p>
                        {s.recent_actions > 0 && (
                          <p className="text-green-600">{s.recent_actions} acao{s.recent_actions !== 1 ? 'es' : ''} esta semana</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            {!selectedState && (
              <p className="text-xs text-gray-400 mt-3">Clique em um estado para ver as escolas</p>
            )}

            <div className="flex gap-4 text-xs text-gray-500 flex-wrap mt-3">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400" /><span>Sem alunos</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Com alunos</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Ativa esta semana</span></div>
              {selectedState && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ border: '2px solid #F59E0B', backgroundColor: 'transparent' }} />
                  <span>Estado selecionado</span>
                </div>
              )}
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
