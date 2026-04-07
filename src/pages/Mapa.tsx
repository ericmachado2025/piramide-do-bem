import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import BottomNav from '../components/BottomNav'
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface SchoolPin {
  id: string
  name: string
  city: string
  state: string
  latitude: number
  longitude: number
  studentCount: number
}

export default function Mapa() {
  const [showRankings, setShowRankings] = useState(false)
  const [schools, setSchools] = useState<SchoolPin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSchools() {
      // Get schools that have students with coordinates
      const { data } = await supabase
        .from('students')
        .select('school:schools(id, name, city, state, latitude, longitude)')
        .not('school_id', 'is', null)

      if (data) {
        const schoolMap: Record<string, SchoolPin> = {}
        for (const row of data) {
          const school = row.school as unknown as { id: string; name: string; city: string; state: string; latitude: number | null; longitude: number | null } | null
          if (!school || !school.latitude || !school.longitude) continue
          if (!schoolMap[school.id]) {
            schoolMap[school.id] = {
              id: school.id,
              name: school.name,
              city: school.city,
              state: school.state,
              latitude: school.latitude,
              longitude: school.longitude,
              studentCount: 0,
            }
          }
          schoolMap[school.id].studentCount++
        }
        setSchools(Object.values(schoolMap))
      }
      setLoading(false)
    }
    loadSchools()
  }, [])

  const rankedSchools = useMemo(() => {
    return [...schools].sort((a, b) => b.studentCount - a.studentCount).slice(0, 10)
  }, [schools])

  const hasValidPins = schools.length > 0

  return (
    <div className="relative h-screen bg-[#F5F7FA]">
      {/* Map */}
      <div className="absolute inset-0 z-0" style={{ bottom: '4rem' }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-teal text-lg">Carregando mapa...</div>
          </div>
        ) : !hasValidPins ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <span className="text-6xl mb-4">{'\u{1F5FA}\uFE0F'}</span>
            <h2 className="text-xl font-bold text-navy mb-2">Nenhuma escola ativa ainda</h2>
            <p className="text-gray-500 text-sm max-w-md">
              Seja o primeiro! Cadastre-se e sua escola aparecera no mapa.
            </p>
          </div>
        ) : (
          <MapContainer
            center={[-14.235, -51.925]}
            zoom={4}
            scrollWheelZoom={true}
            className="h-full w-full"
            style={{ background: '#d4e6f1' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {schools.map((school) => (
              <CircleMarker
                key={school.id}
                center={[school.latitude, school.longitude]}
                radius={Math.max(6, school.studentCount / 2)}
                pathOptions={{
                  color: '#02C39A',
                  fillColor: '#02C39A',
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="font-[Outfit] text-sm min-w-[200px]">
                    <p className="font-bold text-[#1F4E79] text-base mb-1">{school.name}</p>
                    <p className="text-gray-600">
                      {school.city}/{school.state}
                    </p>
                    <div className="mt-2">
                      <p>
                        <span className="font-semibold">Alunos:</span> {school.studentCount}
                      </p>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Rankings Panel */}
      {hasValidPins && (
        <div
          className={`
            absolute left-0 right-0 z-10 transition-all duration-500 ease-in-out
            ${showRankings ? 'bottom-16' : '-bottom-[26rem]'}
          `}
          style={{ maxHeight: 'calc(100vh - 8rem)' }}
        >
          <div className="flex justify-center">
            <button
              onClick={() => setShowRankings(!showRankings)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1F4E79] text-white rounded-t-2xl shadow-lg
                         font-semibold text-sm hover:bg-[#1F4E79]/90 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              Rankings
              {showRankings ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          <div className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden">
            <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-2">
              {rankedSchools.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">Nenhuma escola encontrada.</p>
              )}
              {rankedSchools.map((school, idx) => (
                <div
                  key={school.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                      ${idx === 0 ? 'bg-yellow-400 text-yellow-900'
                        : idx === 1 ? 'bg-gray-300 text-gray-700'
                        : idx === 2 ? 'bg-amber-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                      }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1F4E79] text-sm truncate">{school.name}</p>
                    <p className="text-xs text-gray-500">
                      {school.city}/{school.state}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-gray-400">
                      {school.studentCount} alunos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {hasValidPins && (
        <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg px-4 py-3">
          <p className="text-xs font-bold text-[#1F4E79] mb-2">Escolas ativas</p>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#02C39A]" />
            <span className="text-xs text-gray-600">Com alunos cadastrados</span>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
