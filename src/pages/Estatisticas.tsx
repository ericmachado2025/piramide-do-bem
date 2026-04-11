import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowLeft, Users, CheckCircle, School, Trophy, Flame, GraduationCap, Building2, Gift } from 'lucide-react'
import { supabase } from '../lib/supabase'

type MapLevel = 'brasil' | 'estado' | 'cidade' | 'bairro'

interface GlobalStats { total_schools: number; total_students: number; total_teachers: number; total_sponsors: number; total_rewards: number; total_actions: number; active_states: number }
interface StateMapData { state: string; total_schools: number; total_students: number; total_teachers: number; total_sponsors: number; total_rewards: number; total_actions: number; lat: number; lng: number }
interface CityMapData { city: string; total_schools: number; total_students: number; total_actions: number; lat: number; lng: number }
interface NeighborhoodMapData { neighborhood: string; total_schools: number; total_students: number; total_actions: number; lat: number; lng: number }
interface SchoolPinData { id: string; name: string; city: string; state: string; neighborhood: string; latitude: number; longitude: number; total_students: number; recent_actions: number }
interface SchoolRanking { school_id: string; school_name: string; student_count: number }
interface TribeRanking { community_id: string; community_name: string; student_count: number }

const STATE_NAMES: Record<string, string> = {
  AC:'Acre',AL:'Alagoas',AM:'Amazonas',AP:'Amapá',BA:'Bahia',CE:'Ceará',
  DF:'Distrito Federal',ES:'Espírito Santo',GO:'Goiás',MA:'Maranhão',
  MG:'Minas Gerais',MS:'Mato Grosso do Sul',MT:'Mato Grosso',PA:'Pará',
  PB:'Paraíba',PE:'Pernambuco',PI:'Piauí',PR:'Paraná',RJ:'Rio de Janeiro',
  RN:'Rio Grande do Norte',RO:'Rondônia',RR:'Roraima',RS:'Rio Grande do Sul',
  SC:'Santa Catarina',SE:'Sergipe',SP:'São Paulo',TO:'Tocantins',
}

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
  return L.divIcon({ className: '', iconSize: [60, 36], iconAnchor: [30, 18],
    html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700;border:${border};box-shadow:${shadow};white-space:nowrap;">${d.state}<br/><span style="font-size:10px;font-weight:400;">${d.total_schools.toLocaleString('pt-BR')} esc.</span></div>` })
}

function getClusterIcon(total_schools: number, total_students: number, total_actions: number): L.DivIcon {
  let color = '#9CA3AF'
  if (total_students > 0 && total_actions === 0) color = '#3B82F6'
  if (total_actions > 0) color = '#10B981'
  const size = Math.min(Math.max(36 + Math.log10(total_schools + 1) * 14, 36), 60)
  return L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;background:${color};color:white;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;flex-direction:column;font-weight:700;font-size:11px;line-height:1.1;text-align:center;"><span>${total_schools}</span><span style="font-size:8px;font-weight:400;">esc.</span></div>` })
}

function getSchoolIcon(students: number, actions: number): L.DivIcon {
  let color = '#9CA3AF'
  if (students > 0 && actions === 0) color = '#3B82F6'
  if (actions > 0) color = '#10B981'
  return L.divIcon({ className: '', iconSize: [14, 14], iconAnchor: [7, 7],
    html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>` })
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Users }) {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-4 flex items-start gap-3">
      <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#028090' }}>
        <Icon size={20} className="text-white" />
      </div>
      <div><p className="text-xs text-gray-500">{label}</p><p className="text-xl font-bold" style={{ color: '#1F4E79' }}>{value}</p></div>
    </div>
  )
}

export default function Estatisticas() {
  const mapRef = useRef<L.Map | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapLevel, setMapLevel] = useState<MapLevel>('brasil')
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null)
  const [stateData, setStateData] = useState<StateMapData[]>([])
  const [cityData, setCityData] = useState<CityMapData[]>([])
  const [neighborhoodData, setNeighborhoodData] = useState<NeighborhoodMapData[]>([])
  const [schoolPins, setSchoolPins] = useState<SchoolPinData[]>([])
  const [loadingLevel, setLoadingLevel] = useState(false)
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [topSchools, setTopSchools] = useState<SchoolRanking[]>([])
  const [topTribes, setTopTribes] = useState<TribeRanking[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [{ data: rpcData }, { data: statsData }] = await Promise.all([
          supabase.rpc('get_map_schools_by_state'),
          supabase.rpc('get_global_stats'),
        ])
        setStateData((rpcData as StateMapData[]) ?? [])
        if (statsData && statsData[0]) setGlobalStats(statsData[0] as GlobalStats)

        const { data: studentSchools } = await supabase.from('students').select('school_id')
        const scm: Record<string, number> = {}
        for (const s of studentSchools ?? []) { const sid = (s as { school_id: string }).school_id; if (sid) scm[sid] = (scm[sid] || 0) + 1 }
        const sorted = Object.entries(scm).sort((a, b) => b[1] - a[1]).slice(0, 10)
        if (sorted.length > 0) {
          const { data: names } = await supabase.from('schools').select('id, name').in('id', sorted.map(([id]) => id))
          const nm: Record<string, string> = {}; for (const n of names ?? []) nm[(n as { id: string; name: string }).id] = (n as { id: string; name: string }).name
          setTopSchools(sorted.map(([id, count]) => ({ school_id: id, school_name: nm[id] || 'Escola', student_count: count })))
        }

        const { data: studentTribes } = await supabase.from('students').select('community_id')
        const tm: Record<string, number> = {}
        for (const t of studentTribes ?? []) { const tid = (t as { community_id: string }).community_id; if (tid) tm[tid] = (tm[tid] || 0) + 1 }
        const st2 = Object.entries(tm).sort((a, b) => b[1] - a[1]).slice(0, 3)
        if (st2.length > 0) {
          const { data: tn } = await supabase.from('communities').select('id, name').in('id', st2.map(([id]) => id))
          const tnm: Record<string, string> = {}; for (const n of tn ?? []) tnm[(n as { id: string; name: string }).id] = (n as { id: string; name: string }).name
          setTopTribes(st2.map(([id, count]) => ({ community_id: id, community_name: tnm[id] || 'Comunidade', student_count: count })))
        }
      } catch (err) { console.error('Erro ao buscar estatísticas:', err) }
      finally { setLoading(false) }
    }
    fetchData()
  }, [])

  async function handleStateClick(state: string) {
    setLoadingLevel(true); setSelectedState(state); setMapLevel('estado')
    const { data } = await supabase.rpc('get_map_cities_by_state', { p_state: state })
    setCityData((data as CityMapData[]) ?? []); setLoadingLevel(false)
    const si = stateData.find(s => s.state === state)
    if (si && mapRef.current) mapRef.current.flyTo([si.lat, si.lng], 7, { duration: 1 })
  }

  async function handleCityClick(city: string, lat: number, lng: number) {
    setLoadingLevel(true); setSelectedCity(city); setMapLevel('cidade')
    const { data } = await supabase.rpc('get_map_neighborhoods_by_city', { p_state: selectedState, p_city: city })
    setNeighborhoodData((data as NeighborhoodMapData[]) ?? []); setLoadingLevel(false)
    if (mapRef.current) mapRef.current.flyTo([lat, lng], 12, { duration: 1 })
  }

  async function handleNeighborhoodClick(neighborhood: string, lat: number, lng: number) {
    setLoadingLevel(true); setSelectedNeighborhood(neighborhood); setMapLevel('bairro')
    const { data } = await supabase.rpc('get_map_schools_by_neighborhood', { p_state: selectedState, p_city: selectedCity, p_neighborhood: neighborhood })
    setSchoolPins((data as SchoolPinData[]) ?? []); setLoadingLevel(false)
    if (mapRef.current) mapRef.current.flyTo([lat, lng], 15, { duration: 1 })
  }

  function handleBack() {
    if (mapLevel === 'bairro') {
      setMapLevel('cidade'); setSelectedNeighborhood(null); setSchoolPins([])
      const ci = cityData.find(c => c.city === selectedCity)
      if (ci && mapRef.current) mapRef.current.flyTo([ci.lat, ci.lng], 12, { duration: 1 })
    } else if (mapLevel === 'cidade') {
      setMapLevel('estado'); setSelectedCity(null); setNeighborhoodData([])
      const si = stateData.find(s => s.state === selectedState)
      if (si && mapRef.current) mapRef.current.flyTo([si.lat, si.lng], 7, { duration: 1 })
    } else if (mapLevel === 'estado') {
      setMapLevel('brasil'); setSelectedState(null); setCityData([])
      if (mapRef.current) mapRef.current.flyTo([-14.235, -51.925], 4, { duration: 1 })
    }
  }

  const currentStats = useMemo(() => {
    if (mapLevel === 'brasil' && globalStats) return { label: 'Brasil', schools: globalStats.total_schools, students: globalStats.total_students, teachers: globalStats.total_teachers, sponsors: globalStats.total_sponsors, rewards: globalStats.total_rewards, actions: globalStats.total_actions }
    if (mapLevel === 'estado' && cityData.length > 0) return { label: `${selectedState} — ${STATE_NAMES[selectedState!] || selectedState}`, schools: cityData.reduce((s, c) => s + c.total_schools, 0), students: cityData.reduce((s, c) => s + c.total_students, 0), teachers: null, sponsors: null, rewards: null, actions: cityData.reduce((s, c) => s + c.total_actions, 0) }
    if (mapLevel === 'cidade' && neighborhoodData.length > 0) return { label: selectedCity!, schools: neighborhoodData.reduce((s, n) => s + n.total_schools, 0), students: neighborhoodData.reduce((s, n) => s + n.total_students, 0), teachers: null, sponsors: null, rewards: null, actions: neighborhoodData.reduce((s, n) => s + n.total_actions, 0) }
    if (mapLevel === 'bairro' && schoolPins.length > 0) return { label: `${selectedNeighborhood} - ${selectedCity}`, schools: schoolPins.length, students: schoolPins.reduce((s, sc) => s + sc.total_students, 0), teachers: null, sponsors: null, rewards: null, actions: schoolPins.reduce((s, sc) => s + sc.recent_actions, 0) }
    return null
  }, [mapLevel, globalStats, cityData, neighborhoodData, schoolPins, selectedState, selectedCity, selectedNeighborhood])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="px-4 py-6 text-white" style={{ background: 'linear-gradient(135deg, #028090 0%, #1F4E79 100%)' }}>
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm"><ArrowLeft size={18} /><span>Voltar</span></Link>
        </div>
        <div className="max-w-5xl mx-auto mt-3">
          <h1 className="text-2xl md:text-3xl font-bold">Impacto da Pirâmide do Bem</h1>
          <p className="text-white/70 text-sm mt-1">Acompanhe o crescimento da nossa comunidade em tempo real</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[1,2,3,4,5,6].map(i => (<div key={i} className="bg-white rounded-2xl shadow-lg p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-2/3 mb-3" /><div className="h-8 bg-gray-200 rounded w-1/3" /></div>))}</div>
          ) : currentStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Escolas" value={currentStats.schools.toLocaleString('pt-BR')} icon={School} />
              <StatCard label="Alunos" value={currentStats.students.toLocaleString('pt-BR')} icon={Users} />
              {currentStats.teachers != null && <StatCard label="Professores" value={currentStats.teachers.toLocaleString('pt-BR')} icon={GraduationCap} />}
              {currentStats.sponsors != null && <StatCard label="Patrocinadores" value={currentStats.sponsors.toLocaleString('pt-BR')} icon={Building2} />}
              {currentStats.rewards != null && <StatCard label="Ofertas" value={currentStats.rewards.toLocaleString('pt-BR')} icon={Gift} />}
              <StatCard label="Ações" value={currentStats.actions.toLocaleString('pt-BR')} icon={CheckCircle} />
            </div>
          ) : null}
        </section>

        {/* Map */}
        {!loading && (
          <section>
            {/* Breadcrumb */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-1 text-sm flex-wrap">
                <button onClick={() => { setMapLevel('brasil'); setSelectedState(null); setCityData([]); setSelectedCity(null); setNeighborhoodData([]); setSelectedNeighborhood(null); setSchoolPins([]); mapRef.current?.flyTo([-14.235, -51.925], 4, { duration: 1 }) }}
                  className="font-semibold" style={mapLevel === 'brasil' ? { color: '#028090' } : { color: '#9CA3AF' }}>
                  Brasil
                </button>
                {selectedState && <><span className="text-gray-300">/</span>
                  <button onClick={() => { if (mapLevel !== 'estado') { setMapLevel('estado'); setSelectedCity(null); setNeighborhoodData([]); setSelectedNeighborhood(null); setSchoolPins([]); const s = stateData.find(x => x.state === selectedState); if (s && mapRef.current) mapRef.current.flyTo([s.lat, s.lng], 7, { duration: 1 }) } }}
                    className="font-semibold" style={mapLevel === 'estado' ? { color: '#028090' } : { color: '#9CA3AF' }}>
                    {selectedState}
                  </button>
                </>}
                {selectedCity && <><span className="text-gray-300">/</span>
                  <button onClick={() => { if (mapLevel !== 'cidade') { setMapLevel('cidade'); setSelectedNeighborhood(null); setSchoolPins([]); const c = cityData.find(x => x.city === selectedCity); if (c && mapRef.current) mapRef.current.flyTo([c.lat, c.lng], 12, { duration: 1 }) } }}
                    className="font-semibold" style={mapLevel === 'cidade' ? { color: '#028090' } : { color: '#9CA3AF' }}>
                    {selectedCity}
                  </button>
                </>}
                {selectedNeighborhood && <><span className="text-gray-300">/</span>
                  <span className="font-semibold" style={{ color: '#028090' }}>{selectedNeighborhood}</span>
                </>}
              </div>
              {mapLevel !== 'brasil' && (
                <button onClick={handleBack} className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg border-2 hover:bg-teal/10 transition-colors"
                  style={{ borderColor: '#028090', color: '#028090' }}>
                  ← Voltar
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ height: 480 }}>
              {loadingLevel && (
                <div className="absolute inset-0 z-[999] bg-white/60 flex items-center justify-center">
                  <div className="animate-spin w-8 h-8 border-4 border-teal border-t-transparent rounded-full" />
                </div>
              )}
              <MapContainer center={[-14.235, -51.925]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                <MapController mapRef={mapRef} />

                {/* N1: Estados */}
                {stateData.map(d => (
                  <Marker key={d.state} position={[d.lat, d.lng]} icon={getStateIcon(d, selectedState === d.state)}
                    eventHandlers={{ click: () => handleStateClick(d.state) }}>
                    <Popup><div className="text-sm space-y-1">
                      <p className="font-bold" style={{ color: '#1F4E79' }}>{d.state} — {STATE_NAMES[d.state]}</p>
                      <p>{d.total_schools.toLocaleString('pt-BR')} escolas</p>
                      <p>{d.total_students} alunos</p>
                      <p>{d.total_actions} ações esta semana</p>
                      <button onClick={() => handleStateClick(d.state)} className="mt-1 text-xs underline" style={{ color: '#028090' }}>Ver cidades →</button>
                    </div></Popup>
                  </Marker>
                ))}

                {/* N2: Cidades */}
                {mapLevel === 'estado' && cityData.map(c => (
                  <Marker key={c.city} position={[c.lat, c.lng]} icon={getClusterIcon(c.total_schools, c.total_students, c.total_actions)}
                    eventHandlers={{ click: () => handleCityClick(c.city, c.lat, c.lng) }}>
                    <Popup><div className="text-sm space-y-1">
                      <p className="font-bold" style={{ color: '#1F4E79' }}>{c.city}</p>
                      <p>{c.total_schools} escolas | {c.total_students} alunos</p>
                      <button onClick={() => handleCityClick(c.city, c.lat, c.lng)} className="mt-1 text-xs underline" style={{ color: '#028090' }}>Ver bairros →</button>
                    </div></Popup>
                  </Marker>
                ))}

                {/* N3: Bairros */}
                {mapLevel === 'cidade' && neighborhoodData.map(n => (
                  <Marker key={n.neighborhood} position={[n.lat, n.lng]} icon={getClusterIcon(n.total_schools, n.total_students, n.total_actions)}
                    eventHandlers={{ click: () => handleNeighborhoodClick(n.neighborhood, n.lat, n.lng) }}>
                    <Popup><div className="text-sm space-y-1">
                      <p className="font-bold" style={{ color: '#1F4E79' }}>{n.neighborhood}</p>
                      <p className="text-gray-500">{selectedCity}</p>
                      <p>{n.total_schools} escolas | {n.total_students} alunos</p>
                      <button onClick={() => handleNeighborhoodClick(n.neighborhood, n.lat, n.lng)} className="mt-1 text-xs underline" style={{ color: '#028090' }}>Ver escolas →</button>
                    </div></Popup>
                  </Marker>
                ))}

                {/* N4: Escolas */}
                {mapLevel === 'bairro' && schoolPins.map(s => (
                  <Marker key={s.id} position={[s.latitude, s.longitude]} icon={getSchoolIcon(s.total_students, s.recent_actions)}>
                    <Popup><div className="text-sm space-y-1">
                      <p className="font-bold" style={{ color: '#1F4E79' }}>{s.name}</p>
                      <p className="text-gray-500">{s.neighborhood} - {s.city}</p>
                      <p>{s.total_students} aluno{s.total_students !== 1 ? 's' : ''}</p>
                      {s.recent_actions > 0 && <p style={{ color: '#10B981' }}>{s.recent_actions} ações esta semana</p>}
                    </div></Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="flex gap-4 text-xs text-gray-500 flex-wrap mt-3">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-gray-400" /><span>Sem alunos</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Com alunos</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500" /><span>Ativa esta semana</span></div>
            </div>
          </section>
        )}

        {/* Top 10 */}
        {!loading && topSchools.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F4E79' }}><Trophy size={22} style={{ color: '#028090' }} />Top 10 Escolas Mais Engajadas</h2>
            <div className="bg-white rounded-2xl shadow-lg divide-y">
              {topSchools.map((s, i) => (
                <div key={s.school_id} className="flex items-center gap-4 px-6 py-4">
                  <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#CD7F32' : '#028090' }}>{i + 1}</span>
                  <div className="flex-1 min-w-0"><p className="font-semibold truncate" style={{ color: '#1F4E79' }}>{s.school_name}</p></div>
                  <span className="text-sm text-gray-500">{s.student_count} {s.student_count === 1 ? 'aluno' : 'alunos'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top 3 tribos */}
        {!loading && topTribes.length > 0 && (
          <section className="pb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1F4E79' }}><Flame size={22} style={{ color: '#028090' }} />Top 3 Tribos Mais Populares</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topTribes.map((t, i) => (
                <div key={t.community_id} className="bg-white rounded-2xl shadow-lg p-6 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg mb-3"
                    style={{ backgroundColor: i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : '#CD7F32' }}>{i + 1}</span>
                  <p className="font-bold text-lg" style={{ color: '#1F4E79' }}>{t.community_name}</p>
                  <p className="text-sm text-gray-500 mt-1">{t.student_count} {t.student_count === 1 ? 'aluno' : 'alunos'}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
