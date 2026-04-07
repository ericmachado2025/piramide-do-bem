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

// Fix default marker icon for Leaflet + bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

interface SchoolPin {
  id: string
  name: string
  city: string
  state: string
  latitude: number
  longitude: number
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

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/3" />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <Users className="mx-auto mb-3 opacity-40" size={48} />
      <p className="text-lg">{message}</p>
    </div>
  )
}

export default function Estatisticas() {
  const [loading, setLoading] = useState(true)
  const [totalStudents, setTotalStudents] = useState(0)
  const [totalActions, setTotalActions] = useState(0)
  const [totalSchools, setTotalSchools] = useState(0)
  const [schoolPins, setSchoolPins] = useState<SchoolPin[]>([])
  const [topSchools, setTopSchools] = useState<SchoolRanking[]>([])
  const [topTribes, setTopTribes] = useState<TribeRanking[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // 1 - Total students
        const { count: studentsCount } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })

        // 2 - Total validated actions
        const { count: actionsCount } = await supabase
          .from('actions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'validated')

        // 3 - Distinct active schools
        const { data: distinctSchools } = await supabase
          .from('students')
          .select('school_id')

        const uniqueSchoolIds = new Set(
          (distinctSchools ?? []).map((s: { school_id: string }) => s.school_id)
        )

        // 4 - School pins (schools with students + coordinates)
        const { data: pins } = await supabase.rpc('get_active_schools_with_coords').select('*')

        let finalPins: SchoolPin[] = []
        if (pins && pins.length > 0) {
          finalPins = pins as SchoolPin[]
        } else {
          // Fallback: manual join via JS
          if (uniqueSchoolIds.size > 0) {
            const { data: schoolsData } = await supabase
              .from('schools')
              .select('id, name, city, state, latitude, longitude')
              .in('id', Array.from(uniqueSchoolIds))
              .not('latitude', 'is', null)

            finalPins = (schoolsData ?? []) as SchoolPin[]
          }
        }

        // 5 - Top 10 schools by student count
        const schoolCountMap: Record<string, number> = {}
        for (const s of distinctSchools ?? []) {
          const sid = (s as { school_id: string }).school_id
          schoolCountMap[sid] = (schoolCountMap[sid] || 0) + 1
        }
        const sortedSchoolIds = Object.entries(schoolCountMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)

        let topSchoolsList: SchoolRanking[] = []
        if (sortedSchoolIds.length > 0) {
          const { data: schoolNames } = await supabase
            .from('schools')
            .select('id, name')
            .in(
              'id',
              sortedSchoolIds.map(([id]) => id)
            )

          const nameMap: Record<string, string> = {}
          for (const sn of schoolNames ?? []) {
            nameMap[(sn as { id: string; name: string }).id] = (sn as { id: string; name: string }).name
          }

          topSchoolsList = sortedSchoolIds.map(([id, count]) => ({
            school_id: id,
            school_name: nameMap[id] || 'Escola desconhecida',
            student_count: count,
          }))
        }

        // 6 - Top 3 tribes by student count
        const { data: studentTribes } = await supabase
          .from('students')
          .select('community_id')

        const tribeCountMap: Record<string, number> = {}
        for (const st of studentTribes ?? []) {
          const tid = (st as { community_id: string }).community_id
          if (tid) {
            tribeCountMap[tid] = (tribeCountMap[tid] || 0) + 1
          }
        }
        const sortedTribeIds = Object.entries(tribeCountMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)

        let topTribesList: TribeRanking[] = []
        if (sortedTribeIds.length > 0) {
          const { data: tribeNames } = await supabase
            .from('communities')
            .select('id, name')
            .in(
              'id',
              sortedTribeIds.map(([id]) => id)
            )

          const tribeNameMap: Record<string, string> = {}
          for (const tn of tribeNames ?? []) {
            tribeNameMap[(tn as { id: string; name: string }).id] = (tn as { id: string; name: string }).name
          }

          topTribesList = sortedTribeIds.map(([id, count]) => ({
            community_id: id,
            community_name: tribeNameMap[id] || 'Comunidade desconhecida',
            student_count: count,
          }))
        }

        setTotalStudents(studentsCount ?? 0)
        setTotalActions(actionsCount ?? 0)
        setTotalSchools(uniqueSchoolIds.size)
        setSchoolPins(finalPins)
        setTopSchools(topSchoolsList)
        setTopTribes(topTribesList)
      } catch (err) {
        console.error('Erro ao buscar estatisticas:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const hasData = totalStudents > 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header
        className="px-4 py-6 text-white"
        style={{
          background: 'linear-gradient(135deg, #028090 0%, #1F4E79 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft size={18} />
            <span>Voltar</span>
          </Link>
        </div>
        <div className="max-w-5xl mx-auto mt-3">
          <h1 className="text-2xl md:text-3xl font-bold">
            Impacto da Piramide do Bem
          </h1>
          <p className="text-white/70 text-sm mt-1">
            Acompanhe o crescimento da nossa comunidade em tempo real
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Stat cards */}
        <section>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : !hasData ? (
            <EmptyState message="Ainda nao temos dados. Seja o primeiro a se cadastrar!" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total alunos */}
              <div className="bg-white rounded-2xl shadow-lg p-6 flex items-start gap-4">
                <div
                  className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#028090' }}
                >
                  <Users size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Total de alunos cadastrados
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: '#1F4E79' }}
                  >
                    {totalStudents.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Total acoes */}
              <div className="bg-white rounded-2xl shadow-lg p-6 flex items-start gap-4">
                <div
                  className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#028090' }}
                >
                  <CheckCircle size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Boas acoes validadas
                  </p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: '#1F4E79' }}
                  >
                    {totalActions.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              {/* Total escolas */}
              <div className="bg-white rounded-2xl shadow-lg p-6 flex items-start gap-4">
                <div
                  className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: '#028090' }}
                >
                  <School size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Escolas ativas</p>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: '#1F4E79' }}
                  >
                    {totalSchools.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Map section */}
        {!loading && (
          <section>
            <h2
              className="text-xl font-bold mb-4 flex items-center gap-2"
              style={{ color: '#1F4E79' }}
            >
              <MapPin size={22} style={{ color: '#028090' }} />
              Mapa das Escolas Ativas
            </h2>
            {schoolPins.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <MapContainer
                  center={[-14.235, -51.9253]}
                  zoom={4}
                  className="w-full"
                  style={{ height: 420 }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {schoolPins.map((pin) => (
                    <Marker
                      key={pin.id}
                      position={[pin.latitude, pin.longitude]}
                    >
                      <Popup>
                        <strong>{pin.name}</strong>
                        <br />
                        {pin.city}, {pin.state}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-8 text-center text-gray-400">
                <MapPin className="mx-auto mb-3 opacity-40" size={48} />
                <p>
                  Nenhuma escola ativa ainda. Cadastre-se para aparecer no mapa!
                </p>
              </div>
            )}
          </section>
        )}

        {/* Top 10 escolas */}
        {!loading && hasData && topSchools.length > 0 && (
          <section>
            <h2
              className="text-xl font-bold mb-4 flex items-center gap-2"
              style={{ color: '#1F4E79' }}
            >
              <Trophy size={22} style={{ color: '#028090' }} />
              Top 10 Escolas Mais Engajadas
            </h2>
            <div className="bg-white rounded-2xl shadow-lg divide-y">
              {topSchools.map((school, i) => (
                <div
                  key={school.school_id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <span
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      backgroundColor:
                        i === 0
                          ? '#F59E0B'
                          : i === 1
                            ? '#9CA3AF'
                            : i === 2
                              ? '#CD7F32'
                              : '#028090',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold truncate"
                      style={{ color: '#1F4E79' }}
                    >
                      {school.school_name}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {school.student_count}{' '}
                    {school.student_count === 1 ? 'aluno' : 'alunos'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top 3 tribos */}
        {!loading && hasData && topTribes.length > 0 && (
          <section className="pb-8">
            <h2
              className="text-xl font-bold mb-4 flex items-center gap-2"
              style={{ color: '#1F4E79' }}
            >
              <Flame size={22} style={{ color: '#028090' }} />
              Top 3 Tribos Mais Populares
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topTribes.map((tribe, i) => (
                <div
                  key={tribe.community_id}
                  className="bg-white rounded-2xl shadow-lg p-6 text-center"
                >
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full text-white font-bold text-lg mb-3"
                    style={{
                      backgroundColor:
                        i === 0
                          ? '#F59E0B'
                          : i === 1
                            ? '#9CA3AF'
                            : '#CD7F32',
                    }}
                  >
                    {i + 1}
                  </span>
                  <p
                    className="font-bold text-lg"
                    style={{ color: '#1F4E79' }}
                  >
                    {tribe.community_name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {tribe.student_count}{' '}
                    {tribe.student_count === 1 ? 'aluno' : 'alunos'}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
