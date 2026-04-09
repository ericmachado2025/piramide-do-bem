import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
]

const STATE_NAMES: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia',
  CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso',
  PA: 'Pará', PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná',
  RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima',
  RS: 'Rio Grande do Sul', SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
}

const GRADES_BY_TYPE: Record<string, string[]> = {
  infantil: ['Pre I', 'Pre II'],
  fundamental: ['1o ano', '2o ano', '3o ano', '4o ano', '5o ano', '6o ano', '7o ano', '8o ano', '9o ano'],
  medio: ['1o EM', '2o EM', '3o EM'],
  tecnico: ['1o Tecnico', '2o Tecnico', '3o Tecnico', '4o Tecnico'],
  eja: ['EJA Fundamental', 'EJA Medio'],
  superior: ['1o sem', '2o sem', '3o sem', '4o sem', '5o sem', '6o sem', '7o sem', '8o sem', '9o sem', '10o sem'],
}

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'Nao se aplica']

export interface SchoolSelectorValue {
  stateAbbr: string
  cityId: string
  cityName: string
  schoolId: string
  schoolName: string
  schoolType: string
}

export interface SchoolSelectorProps {
  value: SchoolSelectorValue
  onChange: (value: SchoolSelectorValue) => void
  showGradeSection?: boolean
  grade?: string
  section?: string
  onGradeChange?: (grade: string) => void
  onSectionChange?: (section: string) => void
}

export default function SchoolSelector({
  value,
  onChange,
  showGradeSection = false,
  grade = '',
  section = '',
  onGradeChange,
  onSectionChange,
}: SchoolSelectorProps) {
  // City data
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])
  const [citiesLoading, setCitiesLoading] = useState(false)

  // School autocomplete
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schoolSuggestions, setSchoolSuggestions] = useState<{ id: string; name: string; school_type: string }[]>([])
  const [schoolLoading, setSchoolLoading] = useState(false)
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false)
  const schoolDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch cities when state changes
  useEffect(() => {
    if (!value.stateAbbr) {
      setCities([])
      return
    }

    let cancelled = false
    const fetchCities = async () => {
      setCitiesLoading(true)
      // Get state_id from abbreviation
      const { data: stateRow } = await supabase
        .from('states')
        .select('id')
        .eq('abbreviation', value.stateAbbr)
        .single()

      if (!stateRow || cancelled) {
        setCitiesLoading(false)
        return
      }

      // Get all cities for this state
      const { data: citiesData } = await supabase
        .from('cities')
        .select('id, name')
        .eq('state_id', stateRow.id)
        .order('name')

      if (!cancelled && citiesData) {
        setCities(citiesData)
      }
      setCitiesLoading(false)
    }

    fetchCities()
    return () => { cancelled = true }
  }, [value.stateAbbr])

  // School search with debounce
  const fetchSchools = useCallback(async (cityId: string, query?: string) => {
    setSchoolLoading(true)
    let q = supabase
      .from('schools')
      .select('id, name, school_type')
      .eq('city_id', cityId)

    if (query && query.length >= 3) {
      q = q.ilike('name', `%${query}%`)
    }

    q = q.order('name').limit(query && query.length >= 3 ? 50 : 100)

    const { data } = await q
    if (data) setSchoolSuggestions(data)
    setSchoolLoading(false)
    setShowSchoolDropdown(true)
  }, [])

  const searchSchools = useCallback((cityId: string, query: string) => {
    if (schoolDebounceRef.current) clearTimeout(schoolDebounceRef.current)
    if (!cityId || query.length < 3) {
      setSchoolSuggestions([])
      return
    }
    schoolDebounceRef.current = setTimeout(() => fetchSchools(cityId, query), 300)
  }, [fetchSchools])

  // Available grades based on school type
  const availableGrades = (() => {
    if (!value.schoolType) return []
    const types = value.schoolType.split(',').map(t => t.trim())
    const grades: string[] = []
    for (const type of types) {
      if (GRADES_BY_TYPE[type]) grades.push(...GRADES_BY_TYPE[type])
    }
    return grades
  })()

  const handleStateChange = (abbr: string) => {
    onChange({
      stateAbbr: abbr,
      cityId: '',
      cityName: '',
      schoolId: '',
      schoolName: '',
      schoolType: '',
    })
    setSchoolSearch('')
    setSchoolSuggestions([])
    if (onGradeChange) onGradeChange('')
    if (onSectionChange) onSectionChange('')
  }

  const handleCityChange = (cityId: string) => {
    const city = cities.find(c => c.id === cityId)
    onChange({
      ...value,
      cityId,
      cityName: city?.name || '',
      schoolId: '',
      schoolName: '',
      schoolType: '',
    })
    setSchoolSearch('')
    setSchoolSuggestions([])
    if (onGradeChange) onGradeChange('')
    if (onSectionChange) onSectionChange('')
  }

  const handleSchoolSelect = (school: { id: string; name: string; school_type: string }) => {
    onChange({
      ...value,
      schoolId: school.id,
      schoolName: school.name,
      schoolType: school.school_type,
    })
    setSchoolSearch(school.name)
    setShowSchoolDropdown(false)
    if (onGradeChange) onGradeChange('')
  }

  return (
    <div className="space-y-4">
      {/* State select */}
      <select
        value={value.stateAbbr}
        onChange={(e) => handleStateChange(e.target.value)}
        className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors bg-white"
      >
        <option value="">Selecione o estado</option>
        {BRAZILIAN_STATES.map((s) => (
          <option key={s} value={s}>{s} - {STATE_NAMES[s]}</option>
        ))}
      </select>

      {/* City select */}
      {value.stateAbbr && (
        <div className="relative">
          {citiesLoading ? (
            <div className="flex items-center justify-center py-3.5">
              <Loader2 className="w-5 h-5 text-teal animate-spin" />
              <span className="ml-2 text-sm text-gray-400">Carregando cidades...</span>
            </div>
          ) : (
            <select
              value={value.cityId}
              onChange={(e) => handleCityChange(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors bg-white"
            >
              <option value="">Selecione a cidade</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* School autocomplete */}
      {value.cityId && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Digite o nome da escola ou pressione Enter para ver todas"
              value={value.schoolId ? value.schoolName : schoolSearch}
              onChange={(e) => {
                const val = e.target.value
                setSchoolSearch(val)
                if (value.schoolId) {
                  onChange({
                    ...value,
                    schoolId: '',
                    schoolName: '',
                    schoolType: '',
                  })
                  if (onGradeChange) onGradeChange('')
                }
                searchSchools(value.cityId, val)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  fetchSchools(value.cityId)
                }
              }}
              onFocus={() => {
                if (value.schoolId) {
                  setSchoolSearch('')
                  onChange({
                    ...value,
                    schoolId: '',
                    schoolName: '',
                    schoolType: '',
                  })
                  if (onGradeChange) onGradeChange('')
                }
                if (schoolSuggestions.length > 0) setShowSchoolDropdown(true)
              }}
              onBlur={() => setTimeout(() => setShowSchoolDropdown(false), 200)}
              className="w-full pl-10 pr-10 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-lg transition-colors"
            />
            {schoolLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal animate-spin" />
            )}
          </div>
          {showSchoolDropdown && schoolSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {schoolSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onMouseDown={() => handleSchoolSelect(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-teal/10 text-sm transition-colors"
                >
                  {s.name}
                  <span className="text-xs text-gray-400 ml-2">({s.school_type})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grade + Section */}
      {showGradeSection && value.schoolId && availableGrades.length > 0 && (
        <div className="flex gap-3">
          <select
            value={grade}
            onChange={(e) => onGradeChange?.(e.target.value)}
            className="flex-1 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white"
          >
            <option value="">Série</option>
            {availableGrades.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={section}
            onChange={(e) => onSectionChange?.(e.target.value)}
            className="w-24 px-4 py-3.5 rounded-xl border-2 border-gray-200 focus:border-teal focus:outline-none text-base transition-colors bg-white"
          >
            <option value="">Turma</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
