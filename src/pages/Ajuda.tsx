import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Search, X, ChevronLeft, Sparkles, Calculator, Backpack, GraduationCap, Heart, Store, Shield, HelpCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Sparkles, Calculator, Backpack, GraduationCap, Heart, Store, Shield, HelpCircle,
}

interface HelpSection {
  id: string
  slug: string
  title: string
  icon: string | null
  target_audience: string[]
  display_order: number
  content_markdown: string
}

export default function Ajuda() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [sections, setSections] = useState<HelpSection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState<string>('all')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) { setUserRole('all'); return }
    async function loadRole() {
      const { data: student } = await supabase.from('students').select('id').eq('user_id', user!.id).maybeSingle()
      if (student) { setUserRole('student'); return }
      const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', user!.id).maybeSingle()
      if (teacher) { setUserRole('teacher'); return }
      const { data: parent } = await supabase.from('parents').select('id').eq('user_id', user!.id).maybeSingle()
      if (parent) { setUserRole('parent'); return }
      const { data: sponsor } = await supabase.from('sponsors').select('id').eq('user_id', user!.id).maybeSingle()
      if (sponsor) { setUserRole('sponsor'); return }
      setUserRole('all')
    }
    loadRole()
  }, [user])

  useEffect(() => {
    supabase
      .from('help_sections')
      .select('id,slug,title,icon,target_audience,display_order,content_markdown')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (data) setSections(data as HelpSection[])
        setLoading(false)
      })
  }, [])

  const visibleSections = useMemo(() => {
    return sections.filter(s =>
      s.target_audience.includes('all') || s.target_audience.includes(userRole)
    )
  }, [sections, userRole])

  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return visibleSections
    const term = searchTerm.toLowerCase()
    return visibleSections.filter(s =>
      s.title.toLowerCase().includes(term) || s.content_markdown.toLowerCase().includes(term)
    )
  }, [visibleSections, searchTerm])

  const activeSection = useMemo(() => {
    if (slug) return filteredSections.find(s => s.slug === slug) || filteredSections[0]
    return filteredSections[0]
  }, [slug, filteredSections])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-pulse text-teal text-lg">Carregando ajuda...</div>
      </div>
    )
  }

  if (filteredSections.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-8">
        <div className="text-center">
          <p className="text-gray-500">Nenhuma secao encontrada.</p>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="mt-3 text-teal underline text-sm">
              Limpar busca
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-extrabold text-navy">Ajuda</h1>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar no manual..."
            className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-teal focus:outline-none bg-white"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-6">
          <nav>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-full py-3 px-4 bg-white rounded-xl flex items-center justify-between mb-4 shadow-sm"
            >
              <span className="font-semibold text-navy">
                {activeSection?.title || 'Secoes'}
              </span>
              <span className={`transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`}>&#9660;</span>
            </button>
            <div className={`space-y-1 ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
              {filteredSections.map(section => {
                const Icon = section.icon && ICON_MAP[section.icon] ? ICON_MAP[section.icon] : HelpCircle
                const isActive = activeSection?.id === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => { navigate(`/ajuda/${section.slug}`); setMobileMenuOpen(false) }}
                    className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                      isActive ? 'bg-teal text-white' : 'hover:bg-gray-100 text-navy bg-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium text-sm">{section.title}</span>
                  </button>
                )
              })}
            </div>
          </nav>

          <article className="bg-white rounded-2xl shadow-sm p-6 md:p-8 prose prose-sm md:prose-base max-w-none prose-headings:text-navy prose-a:text-teal">
            {activeSection && (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{activeSection.content_markdown}</ReactMarkdown>
            )}
          </article>
        </div>
      </div>
    </div>
  )
}
