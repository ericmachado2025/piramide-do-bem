import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { X, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, LogOut, Edit3, Save } from 'lucide-react'
import BottomNav from '../components/BottomNav'
import ReauthGuard from '../components/ReauthGuard'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { getCharacterDisplayName, getTierLabel, getStudentStreak, generateReferralCode } from '../lib/database'
import type { Student, Badge, Action, ActionType } from '../types'

const ICON_MAP: Record<string, string> = {
  'fa-mask': '\u{1F9B8}',
  'fa-bolt': '\u26A1',
  'fa-hat-wizard': '\u{1F9D9}',
  'fa-jedi': '\u2694\uFE0F',
  'fa-wind': '\u{1F343}',
  'fa-trophy': '\u{1F3C6}',
  'fa-guitar': '\u{1F3B8}',
  'fa-dungeon': '\u{1F5E1}\uFE0F',
}

/* ---- tier helpers ---- */
const TIER_THRESHOLDS = [
  { tier: 1, min: 0, max: 99 },
  { tier: 2, min: 100, max: 299 },
  { tier: 3, min: 300, max: 599 },
  { tier: 4, min: 600, max: 999 },
  { tier: 5, min: 1000, max: Infinity },
]

function getTierInfo(points: number) {
  const current = TIER_THRESHOLDS.find(
    (t) => points >= t.min && points <= t.max,
  )!
  const next = TIER_THRESHOLDS.find((t) => t.tier === current.tier + 1)
  const progress = next
    ? ((points - current.min) / (next.min - current.min)) * 100
    : 100
  return { current, next, progress: Math.min(progress, 100) }
}

/* ---- faixa helper ---- */
function getFaixa(totalPoints: number) {
  if (totalPoints >= 1000) return { label: 'Ouro', icon: '\u{1F451}', color: 'gold' }
  if (totalPoints >= 600) return { label: 'Prata', icon: '\u{1F948}', color: 'silver' }
  if (totalPoints >= 300) return { label: 'Bronze', icon: '\u{1F949}', color: 'bronze' }
  if (totalPoints >= 100) return { label: 'Ativo', icon: '\u2B50', color: 'blue' }
  return { label: 'Em crescimento', icon: '\u{1F331}', color: 'green' }
}

const statusConfig: Record<string, { icon: typeof CheckCircle; label: string; cls: string }> = {
  validated: { icon: CheckCircle, label: 'Validada', cls: 'text-emerald-600 bg-emerald-50' },
  pending: { icon: Clock, label: 'Pendente', cls: 'text-amber-600 bg-amber-50' },
  denied: { icon: XCircle, label: 'Negada', cls: 'text-red-600 bg-red-50' },
  expired: { icon: AlertCircle, label: 'Expirada', cls: 'text-gray-500 bg-gray-100' },
}

export default function Perfil() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showQrModal, setShowQrModal] = useState(false)
  const [showTribeModal, setShowTribeModal] = useState(false)
  const [student, setStudent] = useState<Student | null>(null)
  const [actions, setActions] = useState<(Action & { action_type?: ActionType })[]>([])
  const [badges, setBadges] = useState<{ badge: Badge; earned_at: string }[]>([])
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [nextCharName, setNextCharName] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [referralCode, setReferralCode] = useState('')
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')
  const [editVisibility, setEditVisibility] = useState('private')
  const [saving, setSaving] = useState(false)

  // Referrals
  const [refTab, setRefTab] = useState<'confirmed' | 'pending'>('confirmed')
  const [confirmedRefs, setConfirmedRefs] = useState<{ id: string; referred_email: string; points_awarded: number; referral_position: number; confirmed_at: string }[]>([])
  const [pendingRefs, setPendingRefs] = useState<{ id: string; referred_email: string; referral_code: string; created_at: string }[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteSending, setInviteSending] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')

  // Security
  const [showReauth, setShowReauth] = useState(false)
  const [reauthAction, setReauthAction] = useState<string>('')
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [googleLinked, setGoogleLinked] = useState(false)
  const [hasEmailIdentity, setHasEmailIdentity] = useState(false)

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Multi-profile support
  const [profileType, setProfileType] = useState<'student' | 'teacher' | 'sponsor' | 'parent' | null>(null)
  const [teacherData, setTeacherData] = useState<{ id: string; name: string; phone: string; cpf: string } | null>(null)
  const [sponsorData, setSponsorData] = useState<{ id: string; business_name: string; contact_name: string; phone: string; document: string; city: string } | null>(null)
  const [parentData, setParentData] = useState<{ id: string; name: string; phone: string; cpf: string } | null>(null)
  const [editPhone, setEditPhone] = useState('')
  const [editCpf, setEditCpf] = useState('')
  const [editBusiness, setEditBusiness] = useState('')
  const [editCity, setEditCity] = useState('')

  useEffect(() => {
    if (!user) return

    async function loadData() {
      // Load student with tribe and character
      const { data: studentData } = await supabase
        .from('students')
        .select('*, community:communities(*), character:characters(*)')
        .eq('user_id', user!.id)
        .single()

      // Detect profile type
      if (!studentData) {
        // Check other profiles
        const { data: tData } = await supabase.from('teachers').select('id, name, phone, cpf').eq('user_id', user!.id).maybeSingle()
        if (tData) { setTeacherData(tData); setProfileType('teacher'); setLoading(false); return }
        const { data: sData } = await supabase.from('sponsors').select('id, business_name, contact_name, phone, document, city').eq('user_id', user!.id).maybeSingle()
        if (sData) { setSponsorData(sData); setProfileType('sponsor'); setLoading(false); return }
        const { data: pData } = await supabase.from('parents').select('id, name, phone, cpf').eq('user_id', user!.id).maybeSingle()
        if (pData) { setParentData(pData); setProfileType('parent'); setLoading(false); return }
        setLoading(false); return
      }

      setProfileType('student')
      if (studentData) {
        setStudent(studentData as Student)

        // Load next character
        if (studentData.community_id) {
          const currentTier = (studentData as Student).character?.level?.tier ?? 1
          const { data: nextChars } = await supabase
            .from('characters')
            .select('name, level:community_levels!inner(tier)')
            .eq('community_id', studentData.community_id)
            .eq('community_levels.tier', currentTier + 1)
            .limit(1)
          if (nextChars?.[0]) setNextCharName(nextChars[0].name)
        }

        // Load actions
        const { data: actionsData } = await supabase
          .from('actions')
          .select('*, action_type:action_types(*)')
          .eq('author_id', studentData.id)
          .order('created_at', { ascending: false })
          .limit(10)
        if (actionsData) setActions(actionsData as typeof actions)

        // Load earned badges
        const { data: studentBadges } = await supabase
          .from('student_badges')
          .select('earned_at, badge:badges(*)')
          .eq('student_id', studentData.id)
        if (studentBadges) setBadges(studentBadges as unknown as typeof badges)
      }

      // Load all badges
      const { data: allBadgesData } = await supabase
        .from('badges')
        .select('*')
        .order('id')
      if (allBadgesData) setAllBadges(allBadgesData)

      // Load streak and referral code
      if (studentData) {
        getStudentStreak(studentData.id).then(s => setStreak(s))
        generateReferralCode(studentData.id).then(c => setReferralCode(c))
      }

      // Load referrals
      if (studentData) {
        const { data: cRefs } = await supabase.from('referrals').select('id, referred_email, points_awarded, referral_position, confirmed_at').eq('referrer_id', studentData.id).eq('status', 'confirmed').order('confirmed_at', { ascending: false })
        if (cRefs) setConfirmedRefs(cRefs)
        const { data: pRefs } = await supabase.from('referrals').select('id, referred_email, referral_code, created_at').eq('referrer_id', studentData.id).eq('status', 'pending').order('created_at', { ascending: false })
        if (pRefs) setPendingRefs(pRefs)
      }

      // Check Google link status
      try {
        const { data: identities } = await supabase.auth.getUserIdentities()
        if (identities?.identities) {
          setGoogleLinked(identities.identities.some(i => i.provider === 'google'))
          setHasEmailIdentity(identities.identities.some(i => i.provider === 'email'))
        }
      } catch {}

      setLoading(false)
    }

    loadData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="animate-pulse text-teal text-lg">Carregando...</div>
      </div>
    )
  }

  // Non-student profile pages
  if (profileType && profileType !== 'student') {
    const data = profileType === 'teacher' ? teacherData : profileType === 'sponsor' ? sponsorData : parentData
    const profileLabel = profileType === 'teacher' ? 'Professor' : profileType === 'sponsor' ? 'Patrocinador' : 'Responsavel'
    return (
      <div className="min-h-screen bg-bg pb-24">
        <div className="gradient-bg px-6 pt-10 pb-8 rounded-b-3xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-white">{(data as Record<string, string>)?.name || (data as Record<string, string>)?.contact_name || 'Perfil'}</h1>
          <p className="text-white/80 text-sm mt-1">{profileLabel}</p>
        </div>
        <div className="px-4 mt-4 max-w-lg mx-auto space-y-4">
          {!editing ? (
            <button onClick={() => {
              if (profileType === 'teacher' && teacherData) { setEditName(teacherData.name || ''); setEditPhone(teacherData.phone || ''); setEditCpf(teacherData.cpf || '') }
              else if (profileType === 'sponsor' && sponsorData) { setEditName(sponsorData.contact_name || ''); setEditBusiness(sponsorData.business_name || ''); setEditPhone(sponsorData.phone || ''); setEditCpf(sponsorData.document || ''); setEditCity(sponsorData.city || '') }
              else if (profileType === 'parent' && parentData) { setEditName(parentData.name || ''); setEditPhone(parentData.phone || ''); setEditCpf(parentData.cpf || '') }
              setEditing(true)
            }} className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl shadow-md text-navy font-semibold text-sm hover:bg-gray-50">
              <Edit3 className="w-4 h-4" /> Editar meus dados
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
              <h3 className="font-bold text-navy text-sm">Editar dados</h3>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nome"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
              {profileType === 'sponsor' && (
                <>
                  <input type="text" value={editBusiness} onChange={(e) => setEditBusiness(e.target.value)} placeholder="Nome da empresa"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                  <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Cidade"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                </>
              )}
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))} placeholder="Telefone"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
              <input type="text" value={editCpf} onChange={(e) => setEditCpf(e.target.value)} placeholder={profileType === 'sponsor' ? 'CNPJ/CPF' : 'CPF'}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-semibold">Cancelar</button>
                <button disabled={saving} onClick={async () => {
                  setSaving(true)
                  if (profileType === 'teacher' && teacherData) {
                    await supabase.from('teachers').update({ name: editName, phone: editPhone, cpf: editCpf }).eq('id', teacherData.id)
                    setTeacherData({ ...teacherData, name: editName, phone: editPhone, cpf: editCpf })
                  } else if (profileType === 'sponsor' && sponsorData) {
                    await supabase.from('sponsors').update({ contact_name: editName, business_name: editBusiness, phone: editPhone, document: editCpf, city: editCity }).eq('id', sponsorData.id)
                    setSponsorData({ ...sponsorData, contact_name: editName, business_name: editBusiness, phone: editPhone, document: editCpf, city: editCity })
                  } else if (profileType === 'parent' && parentData) {
                    await supabase.from('parents').update({ name: editName, phone: editPhone, cpf: editCpf }).eq('id', parentData.id)
                    setParentData({ ...parentData, name: editName, phone: editPhone, cpf: editCpf })
                  }
                  setEditing(false); setSaving(false)
                }} className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); navigate('/') }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red/30 text-red font-semibold hover:bg-red/5">
            <LogOut className="w-5 h-5" /> Sair da conta
          </button>
        </div>
        <BottomNav />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-gray-500">Perfil nao encontrado.</div>
      </div>
    )
  }

  const tribeIcon = student.community?.icon_class
    ? (ICON_MAP[student.community.icon_class] ?? '\u{1F3AE}')
    : '\u{1F3AE}'
  const tribeName = student.community?.name ?? 'Sem comunidade'
  const charName = student.character ? getCharacterDisplayName(student.character, student.character.level) : 'Aprendiz'
  const tierInfo = getTierInfo(student.total_points)
  const faixa = getFaixa(student.total_points)
  const pointsToNext = tierInfo.next ? tierInfo.next.min - student.total_points : 0

  const earnedBadgeIds = new Set(badges.map((b) => b.badge?.id).filter(Boolean))

  const faixaBorderColors: Record<string, string> = {
    gold: 'border-gold bg-yellow-50',
    silver: 'border-silver bg-gray-50',
    bronze: 'border-bronze bg-orange-50',
    blue: 'border-blue-400 bg-blue-50',
    green: 'border-emerald-400 bg-emerald-50',
  }

  const handleInvite = async () => {
    if (!inviteEmail.includes('@') || !student) return
    if (pendingRefs.length >= 3) return
    setInviteSending(true)
    setInviteMsg('')
    await supabase.from('referrals').insert({
      referrer_id: student.id,
      referred_email: inviteEmail,
      referral_code: referralCode,
      status: 'pending',
    })
    // Send email via Edge Function
    await supabase.functions.invoke('send-verification', {
      body: { type: 'referral_invite', to: inviteEmail, referrerName: student.name, referralCode, referralUrl: `https://piramidedobem.com.br/?ref=${referralCode}` },
    })
    setInviteMsg(`Convite enviado para ${inviteEmail}!`)
    setInviteEmail('')
    setInviteSending(false)
    // Reload pending
    const { data } = await supabase.from('referrals').select('id, referred_email, referral_code, created_at').eq('referrer_id', student.id).eq('status', 'pending').order('created_at', { ascending: false })
    if (data) setPendingRefs(data)
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* ===== HEADER ===== */}
      <div className="gradient-bg px-6 pt-10 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex flex-col items-center">
          <div className="relative inline-block mb-2">
            {(student as any).avatar_url ? (
              <img src={(student as any).avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold text-white border-4 border-white/30">
                {student.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-lg">{tribeIcon}</span>
            <input type="file" accept="image/*" id="avatar-upload" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !student) return
              setAvatarUploading(true)
              // Resize to 400x400
              const canvas = document.createElement('canvas')
              canvas.width = 400; canvas.height = 400
              const ctx = canvas.getContext('2d')!
              const img = new Image()
              img.onload = async () => {
                const size = Math.min(img.width, img.height)
                const sx = (img.width - size) / 2, sy = (img.height - size) / 2
                ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
                canvas.toBlob(async (blob) => {
                  if (!blob) { setAvatarUploading(false); return }
                  const { error: upErr } = await supabase.storage.from('avatars').upload(`${student.id}/avatar.jpg`, blob, { upsert: true, contentType: 'image/jpeg' })
                  if (!upErr) {
                    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(`${student.id}/avatar.jpg`)
                    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
                    await supabase.from('students').update({ avatar_url: newUrl }).eq('id', student.id)
                    setStudent({ ...student, avatar_url: newUrl } as typeof student)
                  }
                  setAvatarUploading(false)
                }, 'image/jpeg', 0.85)
              }
              img.src = URL.createObjectURL(file)
            }} />
          </div>
          <label htmlFor="avatar-upload" className="text-white/60 text-xs cursor-pointer hover:text-white/80 transition-colors">
            {avatarUploading ? 'Enviando...' : 'clique para alterar foto'}
          </label>
          <h1 className="text-2xl font-bold text-white">{student.name}</h1>
          <p className="text-white/80 text-sm mt-1 text-center">
            {tribeName} &mdash; {charName} ({getTierLabel(tierInfo.current.tier)})
          </p>

          {/* progress bar */}
          <div className="w-full max-w-xs mt-5">
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${tierInfo.progress}%`,
                  background: 'linear-gradient(90deg, #028090, #02C39A)',
                }}
              />
            </div>
            {tierInfo.next && nextCharName ? (
              <p className="text-white/70 text-xs text-center mt-2">
                Faltam <span className="font-bold text-white">{pointsToNext} pontos</span> para
                se tornar {nextCharName}!
              </p>
            ) : (
              <p className="text-white/70 text-xs text-center mt-2">
                Tier m&aacute;ximo atingido! Voc&ecirc; &eacute; lend&aacute;rio!
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-6 max-w-lg mx-auto">
        {/* ===== EDITAR DADOS ===== */}
        <section>
          {!editing ? (
            <button
              onClick={() => {
                setEditName(student.name)
                setEditWhatsapp(student.whatsapp || '')
                setEditVisibility(student.whatsapp_visibility || 'private')
                setEditing(true)
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white rounded-xl shadow-md text-navy font-semibold text-sm hover:bg-gray-50 transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Editar meus dados
            </button>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
              <h3 className="font-bold text-navy text-sm">Editar dados</h3>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
              <input type="tel" value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value.replace(/\D/g, ''))}
                placeholder="WhatsApp (apenas numeros)" className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Visibilidade:</p>
                {[
                  { v: 'private', l: 'Privado' },
                  { v: 'friends', l: 'Amigos' },
                  { v: 'public', l: 'Publico' },
                ].map(o => (
                  <label key={o.v} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${editVisibility === o.v ? 'bg-teal/5 border border-teal' : 'border border-gray-100'}`}>
                    <input type="radio" checked={editVisibility === o.v} onChange={() => setEditVisibility(o.v)} className="accent-teal" />
                    {o.l}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-semibold">Cancelar</button>
                <button
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true)
                    await supabase.from('students').update({
                      name: editName,
                      whatsapp: editWhatsapp || null,
                      whatsapp_visibility: editVisibility,
                    }).eq('id', student.id)
                    setStudent({ ...student, name: editName, whatsapp: editWhatsapp || null, whatsapp_visibility: editVisibility } as typeof student)
                    setEditing(false)
                    setSaving(false)
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold flex items-center justify-center gap-1 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===== INDICACOES ===== */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-navy">Minhas Indicacoes</h2>
            <button onClick={() => setShowInviteModal(true)} disabled={pendingRefs.length >= 3}
              className="text-sm font-semibold text-teal disabled:text-gray-400">
              + Indicar amigo
            </button>
          </div>

          {confirmedRefs.length === 0 && pendingRefs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <p className="text-gray-500 text-sm mb-3">Indique amigos e ganhe ate 25 pts por cada cadastro confirmado!</p>
              <button onClick={() => setShowInviteModal(true)} className="bg-teal text-white text-sm font-bold px-4 py-2 rounded-lg">Indicar meu primeiro amigo</button>
              <p className="text-[10px] text-gray-400 mt-3">1a-5a: 25pts | 6a-10a: 15pts | 11a-20a: 8pts | 21a+: 4pts</p>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                {(['confirmed', 'pending'] as const).map(tab => (
                  <button key={tab} onClick={() => setRefTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${refTab === tab ? 'bg-teal text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {tab === 'confirmed' ? `Confirmadas (${confirmedRefs.length})` : `Pendentes (${pendingRefs.length})`}
                  </button>
                ))}
              </div>

              {refTab === 'confirmed' && (
                <div className="space-y-2">
                  {confirmedRefs.map(r => (
                    <div key={r.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-navy font-medium">{r.referred_email}</p>
                        <p className="text-xs text-gray-400">Cadastrou-se em {new Date(r.confirmed_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="text-sm font-bold text-green">+{r.points_awarded} pts</span>
                    </div>
                  ))}
                  {confirmedRefs.length > 0 && (
                    <p className="text-xs text-gray-500 text-right mt-1">
                      Total: <strong className="text-navy">{confirmedRefs.reduce((s, r) => s + (r.points_awarded || 0), 0)} pts</strong>
                    </p>
                  )}
                </div>
              )}

              {refTab === 'pending' && (
                <div className="space-y-2">
                  {pendingRefs.map(r => (
                    <div key={r.id} className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-navy font-medium">{r.referred_email}</p>
                        <p className="text-xs text-gray-400">Enviado em {new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <button onClick={() => { navigator.clipboard.writeText(`https://piramidedobem.com.br/?ref=${r.referral_code}`); }}
                        className="text-xs text-teal font-semibold">Copiar link</button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-gray-400 mt-2">1a-5a: 25pts | 6a-10a: 15pts | 11a-20a: 8pts | 21a+: 4pts</p>
            </>
          )}
        </section>

        {/* ===== COFRINHOS ===== */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3 mt-6">Cofrinhos Digitais</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '\u{1F3C6}', label: 'Pontos Ganhos', value: student.total_points },
              { emoji: '\u{1F4B0}', label: 'Saldo Dispon\u00edvel', value: student.available_points },
              { emoji: '\u{1F381}', label: 'Pontos Resgatados', value: student.redeemed_points },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center text-center"
              >
                <span className="text-3xl mb-1">{c.emoji}</span>
                <span className="text-[11px] text-gray-500 leading-tight">{c.label}</span>
                <span className="text-2xl font-bold text-navy mt-1">{c.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== STREAK + REFERRAL ===== */}
        <div className="flex gap-3">
          {streak > 0 && (
            <div className="flex-1 bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <span className="text-3xl block">{streak >= 30 ? '\u{1F525}\u{1F525}' : streak >= 7 ? '\u{1F525}' : '\u{1F4AA}'}</span>
              <p className="text-sm font-bold text-navy mt-1">Sequencia de {streak} {streak === 1 ? 'dia' : 'dias'}!</p>
              {streak >= 7 && <p className="text-xs text-orange-600 mt-0.5">Pontos x{streak >= 30 ? '2.0' : '1.5'}!</p>}
            </div>
          )}
          {referralCode && (
            <div className="flex-1 bg-teal/5 border border-teal/20 rounded-xl p-4 text-center">
              <span className="text-3xl block">{'\u{1F517}'}</span>
              <p className="text-xs text-gray-500 mt-1">Convide amigos:</p>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/cadastro/perfil?ref=${referralCode}`
                  navigator.clipboard.writeText(url)
                  alert('Link copiado!')
                }}
                className="mt-1 bg-teal text-white text-xs font-bold px-3 py-1.5 rounded-lg"
              >
                Copiar link
              </button>
              <p className="text-[10px] text-gray-400 mt-1">Codigo: {referralCode}</p>
            </div>
          )}
        </div>

        {/* ===== QUALISCORE ===== */}
        <section>
          <div
            className={`rounded-xl border-2 p-5 ${faixaBorderColors[faixa.color] ?? 'border-gray-200 bg-white'}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{faixa.icon}</span>
              <div>
                <h3 className="font-bold text-navy text-lg">QualiScore</h3>
                <p className="text-sm text-gray-600">Faixa: {faixa.label}</p>
              </div>
            </div>
            <Link
              to="/ranking"
              className="mt-3 flex items-center gap-1 text-teal font-semibold text-sm hover:underline"
            >
              Ver ranking completo <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setShowTribeModal(true)}
              className="mt-3 flex items-center gap-2 text-gray-500 text-sm font-medium border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Trocar de Tribo
            </button>
          </div>
        </section>

        {/* ===== QR CODE ===== */}
        <section className="flex flex-col items-center">
          <div className="bg-white rounded-xl shadow-md p-4 flex flex-col items-center">
            <QRCodeSVG
              value={`piramide://student/${student.id}`}
              size={100}
              bgColor="#FFFFFF"
              fgColor="#1F4E79"
              level="M"
            />
            <p className="text-[10px] text-gray-400 mt-2">ID: {student.email || student.id}</p>
          </div>
          <button
            onClick={() => setShowQrModal(true)}
            className="mt-2 text-teal font-semibold text-sm hover:underline"
          >
            Ampliar QR Code
          </button>
        </section>

        {/* ===== HISTORICO ===== */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Hist&oacute;rico de a&ccedil;&otilde;es</h2>
          {actions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <span className="text-5xl block mb-2">{'\u{1F4CB}'}</span>
              <p className="text-gray-500 text-sm">
                Nenhuma a&ccedil;&atilde;o registrada ainda. Que tal come&ccedil;ar agora?
              </p>
              <Link
                to="/registrar"
                className="mt-3 inline-block bg-teal text-white rounded-full px-5 py-2 text-sm font-semibold"
              >
                Registrar a&ccedil;&atilde;o
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((a) => {
                const st = statusConfig[a.status] ?? statusConfig.pending
                const StIcon = st.icon
                const date = new Date(a.created_at)
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3"
                  >
                    <span className="text-2xl">{a.action_type?.icon ?? '\u{1F535}'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">
                        {a.action_type?.name ?? 'A\u00e7\u00e3o'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {date.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <span className="text-xs font-bold text-navy">
                        +{a.points_awarded ?? 0}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${st.cls}`}
                      >
                        <StIcon className="w-3 h-3" />
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ===== SELOS ===== */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Selos conquistados</h2>
          {allBadges.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center">
              <p className="text-gray-400 text-sm">Selos serao adicionados em breve.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {allBadges.map((b) => {
                const earned = earnedBadgeIds.has(b.id)
                return (
                  <div
                    key={b.id}
                    className={`rounded-xl p-4 flex flex-col items-center text-center transition-all ${
                      earned
                        ? 'bg-white shadow-md'
                        : 'bg-gray-100 opacity-60'
                    }`}
                  >
                    <span className="text-3xl mb-1">{earned ? (b.icon ?? '\u{1F3C5}') : '\u{1F512}'}</span>
                    <span
                      className={`text-[11px] leading-tight font-medium ${
                        earned ? 'text-navy' : 'text-gray-400'
                      }`}
                    >
                      {b.name}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ===== SEGURANCA ===== */}
        <section>
          <h2 className="text-lg font-bold text-navy mb-3">Seguranca</h2>
          <div className="bg-white rounded-xl shadow-md p-4 space-y-3">
            {/* Google link */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-navy">Conta Google</p>
                <p className="text-xs text-gray-400">{googleLinked ? 'Vinculada' : 'Nao vinculada'}</p>
              </div>
              {googleLinked && hasEmailIdentity ? (
                <button onClick={() => { setReauthAction('unlink_google'); setShowReauth(true) }}
                  className="text-xs text-red font-semibold">Desvincular</button>
              ) : !googleLinked ? (
                <button onClick={async () => {
                  await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })
                }} className="text-xs text-teal font-semibold">Vincular</button>
              ) : null}
            </div>

            <hr className="border-gray-100" />

            {/* Change password */}
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-navy">Senha</p>
                <button onClick={() => { setReauthAction('change_password'); setShowReauth(true) }}
                  className="text-xs text-teal font-semibold">Alterar senha</button>
              </div>
              {showChangePassword && (
                <div className="mt-3 space-y-2">
                  <input type="password" placeholder="Nova senha (min 8 chars)" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                  <input type="password" placeholder="Confirmar nova senha" value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && newPassword.length >= 8 && newPassword === confirmNewPassword && (async () => {
                      setPasswordSaving(true)
                      const { error } = await supabase.auth.updateUser({ password: newPassword })
                      setPasswordMsg(error ? error.message : 'Senha alterada com sucesso!')
                      setPasswordSaving(false)
                      if (!error) { setShowChangePassword(false); setNewPassword(''); setConfirmNewPassword('') }
                    })()}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm" />
                  <button onClick={async () => {
                    if (newPassword.length < 8 || newPassword !== confirmNewPassword) return
                    setPasswordSaving(true)
                    const { error } = await supabase.auth.updateUser({ password: newPassword })
                    setPasswordMsg(error ? error.message : 'Senha alterada com sucesso!')
                    setPasswordSaving(false)
                    if (!error) { setShowChangePassword(false); setNewPassword(''); setConfirmNewPassword('') }
                  }} disabled={passwordSaving || newPassword.length < 8 || newPassword !== confirmNewPassword}
                    className="w-full py-2 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">
                    {passwordSaving ? 'Salvando...' : 'Salvar nova senha'}
                  </button>
                  {passwordMsg && <p className={`text-xs ${passwordMsg.includes('sucesso') ? 'text-green' : 'text-red'}`}>{passwordMsg}</p>}
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* Delete account */}
            <button onClick={() => { setReauthAction('delete_account'); setShowReauth(true) }}
              className="w-full text-left text-sm text-red font-semibold">
              Excluir minha conta
            </button>
          </div>
        </section>
      </div>

      {/* ===== QR MODAL ===== */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-navy font-bold text-lg mb-4">Meu QR Code</h3>
            <QRCodeSVG
              value={`piramide://student/${student.id}`}
              size={240}
              bgColor="#FFFFFF"
              fgColor="#1F4E79"
              level="H"
            />
            <p className="text-xs text-gray-400 mt-4">{student.name}</p>
            <p className="text-[10px] text-gray-300">{student.email}</p>
          </div>
        </div>
      )}

      {/* ===== TRIBE CHANGE MODAL ===== */}
      {showTribeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-6"
          onClick={() => setShowTribeModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 flex flex-col items-center max-w-sm w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTribeModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-4xl mb-3">{'\u{1F504}'}</span>
            <h3 className="text-navy font-bold text-lg mb-2">Trocar de Tribo</h3>
            <p className="text-gray-500 text-sm text-center mb-6">
              Ao trocar de tribo, voc&ecirc; manter&aacute; seus pontos e n&iacute;vel, mas receber&aacute; o personagem equivalente da nova tribo. Deseja continuar?
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowTribeModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await supabase
                    .from('students')
                    .update({ community_id: null, current_character_id: null })
                    .eq('id', student.id)
                  setShowTribeModal(false)
                  navigate('/tribo')
                }}
                className="flex-1 py-2.5 rounded-xl bg-teal text-white font-semibold text-sm hover:bg-teal/90 transition-colors"
              >
                Sim, trocar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout button */}
      <div className="px-4 mb-24">
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            navigate('/')
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red/30 text-red font-semibold hover:bg-red/5 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sair da conta
        </button>
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-navy text-lg mb-3">Indicar amigo</h3>
            <input type="email" placeholder="Email do amigo" value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-teal focus:outline-none text-sm mb-3" autoFocus />
            {inviteMsg && <p className="text-sm text-green mb-2">{inviteMsg}</p>}
            {pendingRefs.length >= 3 && <p className="text-sm text-red mb-2">Aguarde seus amigos se cadastrarem antes de indicar mais.</p>}
            <div className="flex gap-2">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-semibold">Cancelar</button>
              <button onClick={handleInvite} disabled={inviteSending || !inviteEmail.includes('@') || pendingRefs.length >= 3}
                className="flex-1 py-2.5 rounded-lg bg-teal text-white text-sm font-semibold disabled:opacity-50">
                {inviteSending ? 'Enviando...' : 'Enviar convite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ReauthGuard */}
      {showReauth && (
        <ReauthGuard
          reason={reauthAction === 'change_password' ? 'para alterar sua senha' : reauthAction === 'delete_account' ? 'para excluir sua conta' : 'para desvincular o Google'}
          onCancel={() => setShowReauth(false)}
          onConfirmed={async () => {
            setShowReauth(false)
            if (reauthAction === 'change_password') setShowChangePassword(true)
            else if (reauthAction === 'delete_account') setShowDeleteModal(true)
            else if (reauthAction === 'unlink_google') {
              const { data: identities } = await supabase.auth.getUserIdentities()
              const googleId = identities?.identities?.find(i => i.provider === 'google')
              if (googleId) {
                await supabase.auth.unlinkIdentity(googleId)
                setGoogleLinked(false)
              }
            }
          }}
        />
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-red text-lg mb-2">Excluir conta</h3>
            <p className="text-sm text-gray-600 mb-4">Esta acao e irreversivel. Todos os seus dados serao removidos.</p>
            <label className="flex items-start gap-2 mb-4 cursor-pointer">
              <input type="checkbox" checked={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.checked)} className="accent-red mt-0.5" />
              <span className="text-sm text-gray-600">Entendo que perderei todos os meus pontos e historico</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm(false) }}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-500 text-sm font-semibold">Cancelar</button>
              <button disabled={!deleteConfirm} onClick={async () => {
                if (student) await supabase.from('students').update({ deleted_at: new Date().toISOString() } as Record<string, string>).eq('id', student.id)
                await supabase.auth.signOut()
                navigate('/')
              }} className="flex-1 py-2.5 rounded-lg bg-red text-white text-sm font-semibold disabled:opacity-50">
                Confirmar exclusao
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
