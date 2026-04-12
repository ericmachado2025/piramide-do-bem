import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import BottomNav from '../components/BottomNav'
import { ArrowLeft, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Brazilian state centroids (approximate)
const STATE_COORDS: Record<string, [number, number]> = {
  AC: [-8.77, -70.55], AL: [-9.57, -36.78], AM: [-3.07, -61.66], AP: [1.41, -51.77],
  BA: [-12.96, -38.51], CE: [-3.71, -38.54], DF: [-15.83, -47.86], ES: [-19.19, -40.34],
  GO: [-16.64, -49.31], MA: [-2.53, -44.28], MG: [-18.10, -44.38], MS: [-20.51, -54.54],
  MT: [-12.64, -55.42], PA: [-5.53, -52.29], PB: [-7.06, -35.55], PE: [-8.28, -35.07],
  PI: [-8.28, -43.68], PR: [-24.89, -51.55], RJ: [-22.84, -43.15], RN: [-5.22, -36.52],
  RO: [-11.22, -62.80], RR: [1.99, -61.33], RS: [-30.01, -51.22], SC: [-27.33, -49.44],
  SE: [-10.90, -37.07], SP: [-23.55, -46.64], TO: [-10.25, -48.25],
}

interface AggData {
  state: string
  city?: string
  neighborhood?: string
  schoolId?: string
  schoolName?: string
  latitude?: number
  longitude?: number
  students: number
  teachers: number
  sponsors: number
  schools: number
}

interface LegendCounts {
  actions: number
  students: number
  mentors: number
  requests: number
  teachers: number
  sponsors: number
}

// Component to programmatically fly to a location
function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 })
  }, [center, zoom, map])
  return null
}

type DrillLevel = 'states' | 'cities' | 'neighborhoods' | 'schools'

export default function Mapa() {
  const [loading, setLoading] = useState(true)
  const [allSchoolData, setAllSchoolData] = useState<{
    state: string; city: string; neighborhood: string | null;
    school_id: string; school_name: string;
    latitude: number | null; longitude: number | null;
    student_count: number
  }[]>([])

  const [drillLevel, setDrillLevel] = useState<DrillLevel>('states')
  const [selectedState, setSelectedState] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedNeighborhood, setSelectedNeighborhood] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([-14.235, -51.925])
  const [mapZoom, setMapZoom] = useState(4)
  const [legendCounts, setLegendCounts] = useState<LegendCounts>({ actions: 0, students: 0, mentors: 0, requests: 0, teachers: 0, sponsors: 0 })

  useEffect(() => {
    async function load() {
      // Use view for state-level counts (fast, no pagination needed)
      const { data: stateCounts } = await supabase
        .from('school_counts_by_state')
        .select('state, school_count, schools_with_students, total_students')

      if (stateCounts) {
        const mapped = stateCounts.map((s: { state: string; school_count: number; total_students: number }) => ({
          state: s.state,
          city: '',
          neighborhood: null as string | null,
          school_id: '',
          school_name: '',
          latitude: null as number | null,
          longitude: null as number | null,
          student_count: Number(s.total_students) || 0,
          school_count_agg: Number(s.school_count) || 0,
        }))
        setAllSchoolData(mapped)
      }
      setLoading(false)
    }
    load()
  }, [])

  // Load legend counts based on current scope (filtered by drill level)
  useEffect(() => {
    async function loadCounts() {
      const scopeState = (drillLevel !== 'states' && selectedState) ? selectedState : null
      const scopeCity = (drillLevel !== 'states' && drillLevel !== 'cities' && selectedCity) ? selectedCity : null
      const scopeNeighborhood = (drillLevel === 'schools' && selectedNeighborhood) ? selectedNeighborhood : null

      const { data } = await supabase.rpc('get_map_counts', {
        p_state: scopeState,
        p_city: scopeCity,
        p_neighborhood: scopeNeighborhood,
      })

      // Students: sum from allSchoolData filtered by current scope
      let filtered = allSchoolData
      if (scopeState) filtered = filtered.filter(s => s.state === scopeState)
      if (scopeCity) filtered = filtered.filter(s => s.city === scopeCity)
      if (scopeNeighborhood) filtered = filtered.filter(s => (s.neighborhood || 'Sem bairro') === scopeNeighborhood)
      const totalStudents = filtered.reduce((sum, s) => sum + s.student_count, 0)

      setLegendCounts({
        actions: data?.actions ?? 0,
        students: totalStudents,
        mentors: data?.monitors ?? 0,
        requests: 0,
        teachers: data?.teachers ?? 0,
        sponsors: data?.sponsors ?? 0,
      })
    }
    if (!loading) loadCounts()
  }, [allSchoolData, loading, drillLevel, selectedState, selectedCity, selectedNeighborhood])

  // Aggregate by current drill level
  const markers = useMemo((): AggData[] => {
    if (drillLevel === 'states') {
      const byState: Record<string, AggData> = {}
      for (const state of Object.keys(STATE_COORDS)) {
        byState[state] = { state, students: 0, teachers: 0, sponsors: 0, schools: 0 }
      }
      for (const s of allSchoolData) {
        if (!byState[s.state]) {
          byState[s.state] = { state: s.state, students: 0, teachers: 0, sponsors: 0, schools: 0 }
        }
        byState[s.state].students += s.student_count
        byState[s.state].schools += (s as Record<string, unknown>).school_count_agg ? Number((s as Record<string, unknown>).school_count_agg) : 1
      }
      return Object.values(byState)
    }

    if (drillLevel === 'cities') {
      const byCity: Record<string, AggData> = {}
      for (const s of allSchoolData.filter(d => d.state === selectedState && d.city !== '')) {
        if (!byCity[s.city]) {
          byCity[s.city] = { state: s.state, city: s.city, students: 0, teachers: 0, sponsors: 0, schools: 0 }
        }
        byCity[s.city].students += s.student_count
        byCity[s.city].schools += (s as Record<string, unknown>).school_count_agg ? Number((s as Record<string, unknown>).school_count_agg) : 1
      }
      return Object.values(byCity)
    }

    if (drillLevel === 'neighborhoods') {
      const byNhood: Record<string, AggData> = {}
      for (const s of allSchoolData.filter(d => d.state === selectedState && d.city === selectedCity)) {
        const key = s.neighborhood || 'Sem bairro'
        if (!byNhood[key]) {
          byNhood[key] = { state: s.state, city: s.city, neighborhood: key, students: 0, teachers: 0, sponsors: 0, schools: 0 }
        }
        byNhood[key].students += s.student_count
        byNhood[key].schools++
      }
      return Object.values(byNhood)
    }

    // schools level
    return allSchoolData
      .filter(d => d.state === selectedState && d.city === selectedCity &&
        (selectedNeighborhood === '' || (d.neighborhood || 'Sem bairro') === selectedNeighborhood))
      .map(d => ({
        state: d.state,
        city: d.city,
        neighborhood: d.neighborhood || undefined,
        schoolId: d.school_id,
        schoolName: d.school_name,
        latitude: d.latitude ?? undefined,
        longitude: d.longitude ?? undefined,
        students: d.student_count,
        teachers: 0, sponsors: 0, schools: 1,
      }))
  }, [allSchoolData, drillLevel, selectedState, selectedCity, selectedNeighborhood])

  const handleStateClick = (state: string) => {
    setSelectedState(state)
    setDrillLevel('cities')
    const coords = STATE_COORDS[state]
    if (coords) { setMapCenter(coords); setMapZoom(7) }
    // Load city-level data from view
    supabase.from('school_counts_by_city')
      .select('state, city, school_count, total_students')
      .eq('state', state)
      .then(({ data }) => {
        if (data) {
          const cityData = data.map((c: { state: string; city: string; school_count: number; total_students: number }) => ({
            state: c.state, city: c.city, neighborhood: null as string | null,
            school_id: '', school_name: '', latitude: null as number | null, longitude: null as number | null,
            student_count: Number(c.total_students) || 0,
            school_count_agg: Number(c.school_count) || 0,
          }))
          setAllSchoolData(prev => [...prev.filter(s => s.state !== state || s.city === ''), ...cityData])
        }
      })
  }

  const handleCityClick = (city: string) => {
    setSelectedCity(city)
    setDrillLevel('neighborhoods')
    setMapZoom(10)
  }

  const handleNeighborhoodClick = (nhood: string) => {
    setSelectedNeighborhood(nhood)
    setDrillLevel('schools')
    setMapZoom(13)
  }

  const handleBack = () => {
    if (drillLevel === 'cities') {
      setDrillLevel('states')
      setSelectedState('')
      setMapCenter([-14.235, -51.925])
      setMapZoom(4)
    } else if (drillLevel === 'neighborhoods') {
      setDrillLevel('cities')
      setSelectedCity('')
      const coords = STATE_COORDS[selectedState]
      if (coords) { setMapCenter(coords); setMapZoom(7) }
    } else if (drillLevel === 'schools') {
      setDrillLevel('neighborhoods')
      setSelectedNeighborhood('')
      setMapZoom(10)
    }
  }

  const levelLabel: Record<DrillLevel, string> = {
    states: 'Brasil',
    cities: selectedState,
    neighborhoods: selectedCity,
    schools: selectedNeighborhood || selectedCity,
  }

  // For states/cities without coords, generate positions in a grid pattern
  const getMarkerPosition = (item: AggData, index: number): [number, number] => {
    if (drillLevel === 'states') {
      const coords = STATE_COORDS[item.state]
      return coords || [-14 + index, -50 + index]
    }
    if (item.latitude && item.longitude) return [item.latitude, item.longitude]

    // Fallback: spread around the state center
    const stateCoords = STATE_COORDS[item.state] || [-14.235, -51.925]
    const offset = index * 0.15
    const angle = (index * 137.5 * Math.PI) / 180
    return [stateCoords[0] + offset * Math.sin(angle), stateCoords[1] + offset * Math.cos(angle)]
  }

  return (
    <div className="relative h-screen bg-[#F5F7FA]">
      {/* Map */}
      <div className="absolute inset-0 z-0" style={{ bottom: '4rem' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-teal text-lg">Carregando mapa...</div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ background: '#d4e6f1' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyTo center={mapCenter} zoom={mapZoom} />

            {markers.map((item, idx) => {
              const pos = getMarkerPosition(item, idx)
              const radius = drillLevel === 'states'
                ? Math.max(8, Math.min(25, 8 + item.students * 2))
                : Math.max(6, Math.min(20, 6 + item.students))
              const key = `${item.state}-${item.city || ''}-${item.neighborhood || ''}-${item.schoolId || ''}-${idx}`

              return (
                <CircleMarker
                  key={key}
                  center={pos}
                  radius={radius}
                  pathOptions={{
                    color: item.students > 0 ? '#02C39A' : '#94a3b8',
                    fillColor: item.students > 0 ? '#02C39A' : '#cbd5e1',
                    fillOpacity: 0.7,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (drillLevel === 'states') handleStateClick(item.state)
                      else if (drillLevel === 'cities' && item.city) handleCityClick(item.city)
                      else if (drillLevel === 'neighborhoods' && item.neighborhood) handleNeighborhoodClick(item.neighborhood)
                    }
                  }}
                >
                  <Tooltip permanent direction="center" className="map-label"
                    offset={[0, 0]}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#1F4E79', textShadow: '0 0 3px white, 0 0 3px white' }}>
                      {drillLevel === 'states' ? item.state : drillLevel === 'cities' ? (item.city?.length && item.city.length > 12 ? item.city.split(' ')[0] : item.city || '') : drillLevel === 'neighborhoods' ? (item.neighborhood?.split(' ')[0] || '') : ''}
                      <br/><span style={{ fontSize: '9px', fontWeight: 400 }}>{item.schools.toLocaleString()} esc.</span>
                    </span>
                  </Tooltip>
                  <Popup>
                    <div className="font-[Outfit] text-sm min-w-[180px]">
                      <p className="font-bold text-[#1F4E79] text-base mb-1">
                        {drillLevel === 'states' ? item.state
                          : drillLevel === 'cities' ? item.city
                          : drillLevel === 'neighborhoods' ? item.neighborhood
                          : item.schoolName}
                      </p>
                      <div className="space-y-0.5 text-gray-600">
                        <p><span className="font-semibold">Escolas:</span> {item.schools}</p>
                        <p><span className="font-semibold">Alunos:</span> {item.students}</p>
                      </div>
                      {drillLevel !== 'schools' && (
                        <p className="text-teal text-xs mt-2 font-semibold cursor-pointer">Clique para ver detalhes &rarr;</p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        )}
      </div>

      {/* Breadcrumb / Back button */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        {drillLevel !== 'states' && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg text-sm font-semibold text-[#1F4E79] hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        )}
        <div className="px-3 py-2 bg-white/95 backdrop-blur-md rounded-xl shadow-lg text-sm font-semibold text-[#1F4E79]">
          <MapPin className="w-4 h-4 inline mr-1" />
          {levelLabel[drillLevel]}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg px-4 py-3 min-w-[180px]">
        <p className="text-xs font-bold text-[#1F4E79] mb-2">
          {drillLevel === 'states' ? 'Estados' : drillLevel === 'cities' ? 'Cidades' : drillLevel === 'neighborhoods' ? 'Bairros' : 'Escolas'}
          {' '}({markers.length})
        </p>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between"><span>Escolas</span><span className="font-bold text-[#1F4E79]">{markers.reduce((s, m) => s + m.schools, 0).toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Alunos</span><span className="font-bold text-[#1F4E79]">{legendCounts.students.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Boas Acoes</span><span className="font-bold text-[#1F4E79]">{legendCounts.actions.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Professores</span><span className="font-bold text-[#1F4E79]">{legendCounts.teachers.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Monitores</span><span className="font-bold text-[#1F4E79]">{legendCounts.mentors.toLocaleString()}</span></div>
          <div className="flex justify-between"><span>Patrocinadores</span><span className="font-bold text-[#1F4E79]">{legendCounts.sponsors.toLocaleString()}</span></div>
        </div>
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#02C39A]" /><span className="text-[10px] text-gray-500">Com alunos</span></div>
          <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#cbd5e1]" /><span className="text-[10px] text-gray-500">Sem alunos</span></div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
