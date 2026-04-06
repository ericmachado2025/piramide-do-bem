import { useState, useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { schools } from '../data/schools'
import { tribes } from '../data/tribes'
import BottomNav from '../components/BottomNav'
import { ChevronUp, ChevronDown, Trophy } from 'lucide-react'

/* ---------- seeded random for deterministic data ---------- */
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

interface SchoolData {
  id: string
  name: string
  city: string
  state: string
  neighborhood: string
  latitude: number
  longitude: number
  students: number
  actionsWeek: number
  popularTribe: string
  score: number
  color: string
}

function generateSchoolData(): SchoolData[] {
  return schools.map((s, i) => {
    const rng = seededRandom(42 + i)
    const students = Math.floor(rng() * 46) + 5 // 5-50
    const actionsWeek = Math.floor(rng() * students * 3) + 1
    const tribeIdx = Math.floor(rng() * tribes.length)
    const popularTribe = tribes[tribeIdx].name
    const score = Math.floor(rng() * 5000) + 500

    // Color assignment: 60% green, 30% yellow, 10% gray
    const roll = rng()
    const color = roll < 0.6 ? '#02C39A' : roll < 0.9 ? '#F59E0B' : '#9CA3AF'

    return {
      ...s,
      students,
      actionsWeek,
      popularTribe,
      score,
      color,
    }
  })
}

type RankTab = 'bairro' | 'cidade' | 'estado' | 'brasil'

export default function Mapa() {
  const [showRankings, setShowRankings] = useState(false)
  const [rankTab, setRankTab] = useState<RankTab>('brasil')

  const schoolData = useMemo(() => generateSchoolData(), [])

  const rankedSchools = useMemo(() => {
    const sorted = [...schoolData].sort((a, b) => b.score - a.score)
    switch (rankTab) {
      case 'bairro':
        // Simulate: filter to same neighborhood as first school
        return sorted.filter((s) => s.neighborhood === 'Centro').slice(0, 10)
      case 'cidade':
        return sorted.filter((s) => s.city === 'São Paulo' || s.city === 'Porto Alegre').slice(0, 10)
      case 'estado':
        return sorted.filter((s) => s.state === 'SP').slice(0, 10)
      case 'brasil':
      default:
        return sorted.slice(0, 10)
    }
  }, [schoolData, rankTab])

  const tabs: { key: RankTab; label: string }[] = [
    { key: 'bairro', label: 'Bairro' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'estado', label: 'Estado' },
    { key: 'brasil', label: 'Brasil' },
  ]

  return (
    <div className="relative h-screen bg-[#F5F7FA]">
      {/* Map */}
      <div className="absolute inset-0 z-0" style={{ bottom: '4rem' }}>
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
          {schoolData.map((school) => (
            <CircleMarker
              key={school.id}
              center={[school.latitude, school.longitude]}
              radius={Math.max(6, school.students / 4)}
              pathOptions={{
                color: school.color,
                fillColor: school.color,
                fillOpacity: 0.7,
                weight: 2,
              }}
            >
              <Popup>
                <div className="font-[Outfit] text-sm min-w-[200px]">
                  <p className="font-bold text-[#1F4E79] text-base mb-1">{school.name}</p>
                  <p className="text-gray-600">
                    {school.city}/{school.state} &mdash; {school.neighborhood}
                  </p>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-semibold">Alunos:</span> {school.students}
                    </p>
                    <p>
                      <span className="font-semibold">Ações/semana:</span> {school.actionsWeek}
                    </p>
                    <p>
                      <span className="font-semibold">Tribo mais popular:</span>{' '}
                      {school.popularTribe}
                    </p>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Rankings Panel */}
      <div
        className={`
          absolute left-0 right-0 z-10 transition-all duration-500 ease-in-out
          ${showRankings ? 'bottom-16' : '-bottom-[26rem]'}
        `}
        style={{ maxHeight: 'calc(100vh - 8rem)' }}
      >
        {/* Toggle Button */}
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

        {/* Panel Content */}
        <div className="bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRankTab(tab.key)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors
                  ${rankTab === tab.key
                    ? 'text-[#028090] border-b-2 border-[#028090]'
                    : 'text-gray-400 hover:text-gray-600'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* School List */}
          <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-2">
            {rankedSchools.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">Nenhuma escola encontrada nesta categoria.</p>
            )}
            {rankedSchools.map((school, idx) => (
              <div
                key={school.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                {/* Rank badge */}
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
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1F4E79] text-sm truncate">{school.name}</p>
                  <p className="text-xs text-gray-500">
                    {school.city}/{school.state}
                  </p>
                </div>
                {/* Stats */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[#028090]">{school.score.toLocaleString()} pts</p>
                  <p className="text-[10px] text-gray-400">
                    {school.students} alunos &middot; {school.actionsWeek} ações/sem
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-xl shadow-lg px-4 py-3">
        <p className="text-xs font-bold text-[#1F4E79] mb-2">Atividade</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#02C39A]" />
            <span className="text-xs text-gray-600">Alta</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
            <span className="text-xs text-gray-600">Média</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#9CA3AF]" />
            <span className="text-xs text-gray-600">Baixa</span>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
