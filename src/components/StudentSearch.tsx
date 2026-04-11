import { useState, useEffect } from 'react'
import { Search, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Scope = 'escola' | 'bairro' | 'cidade' | 'estado' | 'brasil'

interface StudentResult {
  id: string
  name: string
  school_name: string | null
  school_city: string | null
  school_state: string | null
  school_neighborhood: string | null
}

interface SchoolGeo {
  id: string
  name: string
  city: string
  state: string
  neighborhood: string | null
  city_id: string | null
  state_id: string | null
  neighborhood_id: string | null
}

interface StudentSearchProps {
  mySchoolId: string | null
  myStudentId: string | null
  selected: string[]
  onToggle: (id: string) => void
  multiple?: boolean
  label?: string
  sublabel?: string
}

const PAGE_SIZE = 20
const SCOPES: { key: Scope; label: string }[] = [
  { key: 'escola', label: 'Minha Escola' },
  { key: 'bairro', label: 'Meu Bairro' },
  { key: 'cidade', label: 'Minha Cidade' },
  { key: 'estado', label: 'Meu Estado' },
  { key: 'brasil', label: 'Todo o Brasil' },
]

export default function StudentSearch({
  mySchoolId, myStudentId, selected, onToggle,
  label = 'Quem você ajudou?', sublabel,
}: StudentSearchProps) {
  const [scope, setScope] = useState<Scope>('escola')
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<StudentResult[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [mySchool, setMySchool] = useState<SchoolGeo | null>(null)

  // Load school geo data
  useEffect(() => {
    if (!mySchoolId) return
    supabase.from('schools')
      .select('id, name, city, state, neighborhood, city_id, state_id, neighborhood_id')
      .eq('id', mySchoolId).single()
      .then(({ data }) => { if (data) setMySchool(data as SchoolGeo) })
  }, [mySchoolId])

  // Reset on scope/query change
  useEffect(() => { setPage(0); setResults([]) }, [scope, searchQuery])

  // Fetch students
  useEffect(() => {
    if (!mySchool && scope !== 'brasil') return
    const timer = setTimeout(() => fetchStudents(page), page === 0 ? 300 : 0)
    return () => clearTimeout(timer)
  }, [scope, searchQuery, page, mySchool])

  async function fetchStudents(p: number) {
    setLoading(true)

    // Step 1: Get school IDs for the scope
    let schoolIds: string[] | null = null
    if (scope === 'escola' && mySchool) {
      schoolIds = [mySchool.id]
    } else if (scope === 'bairro' && mySchool?.neighborhood_id) {
      const { data } = await supabase.from('schools').select('id').eq('neighborhood_id', mySchool.neighborhood_id)
      schoolIds = data?.map(s => s.id) ?? []
    } else if (scope === 'cidade' && mySchool?.city_id) {
      const { data } = await supabase.from('schools').select('id').eq('city_id', mySchool.city_id)
      schoolIds = data?.map(s => s.id) ?? []
    } else if (scope === 'estado' && mySchool?.state_id) {
      const { data } = await supabase.from('schools').select('id').eq('state_id', mySchool.state_id)
      schoolIds = data?.map(s => s.id) ?? []
    }

    // Step 2: Search students with name filter via users table
    let q = supabase.from('students')
      .select('id, user:users!students_users_id_fkey(name), school:schools(name, city, state, neighborhood)', { count: 'exact' })
      .neq('id', myStudentId ?? '')

    if (schoolIds) {
      if (schoolIds.length === 0) { setResults([]); setTotal(0); setLoading(false); return }
      q = q.in('school_id', schoolIds)
    }

    // Name search via users table (2-step if needed)
    if (searchQuery.length >= 2) {
      const { data: matchingUsers } = await supabase.from('users').select('auth_id').ilike('name', `%${searchQuery}%`).limit(100)
      if (matchingUsers && matchingUsers.length > 0) {
        q = q.in('user_id', matchingUsers.map(u => u.auth_id))
      } else {
        if (p === 0) setResults([])
        setTotal(0); setLoading(false); return
      }
    }

    q = q.range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)
    const { data, count } = await q

    if (data) {
      const mapped: StudentResult[] = data.map((s: Record<string, unknown>) => {
        const user = s.user as Record<string, unknown> | null
        const school = s.school as Record<string, unknown> | null
        return {
          id: s.id as string,
          name: (user?.name as string) || 'Aluno',
          school_name: (school?.name as string) || null,
          school_city: (school?.city as string) || null,
          school_state: (school?.state as string) || null,
          school_neighborhood: (school?.neighborhood as string) || null,
        }
      })
      // Sort client-side: state → city → neighborhood → school → name
      mapped.sort((a, b) => {
        const cmp = (x: string | null, y: string | null) => (x || '').localeCompare(y || '')
        return cmp(a.school_state, b.school_state) || cmp(a.school_city, b.school_city) ||
          cmp(a.school_neighborhood, b.school_neighborhood) || cmp(a.school_name, b.school_name) ||
          cmp(a.name, b.name)
      })
      if (p === 0) setResults(mapped)
      else setResults(prev => [...prev, ...mapped])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-navy mb-1">{label}</h2>
      {sublabel && <p className="text-gray-500 text-sm mb-3">{sublabel}</p>}

      {/* Scope pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {SCOPES.map(({ key, label: lbl }) => (
          <button key={key} onClick={() => setScope(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              scope === key ? 'bg-teal text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Search input */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome... (deixe vazio para ver todos)"
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all" />
      </div>

      {selected.length > 0 && (
        <p className="text-teal text-xs font-semibold mb-2">{selected.length} selecionado(s)</p>
      )}

      {/* Results */}
      <div className="space-y-1.5">
        {loading && results.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-sm">Buscando...</div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-5 text-center">
            <p className="text-gray-400 text-sm">
              {scope === 'escola' && !mySchool
                ? 'Escola não encontrada. Tente um escopo maior.'
                : 'Nenhum resultado. Tente ampliar o escopo ou digitar um nome.'}
            </p>
          </div>
        ) : (
          <>
            {results.map((s) => {
              const isSelected = selected.includes(s.id)
              const locParts = [s.school_state, s.school_city, s.school_neighborhood, s.school_name].filter(Boolean)
              const locText = locParts.join(' · ')
              return (
                <button key={s.id} onClick={() => onToggle(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-150 active:scale-[0.98] text-left ${
                    isSelected ? 'bg-teal/10 border-2 border-teal' : 'bg-white border-2 border-transparent shadow-sm hover:shadow-md'
                  }`}>
                  <span className="text-xl flex-shrink-0">{'\u{1F464}'}</span>
                  <div className="flex-1 min-w-0">
                    {locText && <p className="text-[11px] text-gray-400 truncate leading-tight mb-0.5">{locText}</p>}
                    <p className="text-sm font-semibold text-navy truncate">{s.name}</p>
                  </div>
                  {isSelected && <Check size={16} className="flex-shrink-0 text-teal" />}
                </button>
              )
            })}
            {results.length < total && (
              <button onClick={() => setPage(p => p + 1)} disabled={loading}
                className="w-full py-2.5 text-sm text-teal hover:text-teal/80 font-medium text-center border border-teal/30 rounded-xl hover:bg-teal/5 transition-all">
                {loading ? 'Carregando...' : `Carregar mais (${results.length} de ${total})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
