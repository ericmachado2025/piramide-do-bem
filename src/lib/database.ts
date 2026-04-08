import { supabase } from './supabase'
import type { School, Character, ActionType, Badge, Reward, Student, Action, Teacher, Subject, Classroom, Sponsor, TeacherAssignment, Parent, ParentStudent, FraudAlert, Redemption, CommunityCategory, CommunityType, Community, CommunityLevel } from '../types'

// === Character Display Name ===
const TIER_LABELS = ['Iniciante', 'Aprendiz', 'Destaque', 'Lider', 'Lenda']

export function getCharacterDisplayName(character: Character, level?: CommunityLevel | null): string {
  if (!level) return character.name
  const prefix = level.display_prefix || level.name
  const connector = level.prefix_connector || ' '
  return `${prefix}${connector}${character.name}`
}

export function getTierLabel(tier: number): string {
  return TIER_LABELS[(tier || 1) - 1] || ''
}

// === Schools ===
export async function searchSchools(state: string, city?: string, query?: string) {
  let q = supabase.from('schools').select('*').eq('state', state).eq('active', true)
  if (city) q = q.eq('city', city)
  if (query) q = q.ilike('name', `%${query}%`)
  const { data } = await q.order('name').limit(50)
  return (data ?? []) as School[]
}

export async function getSchoolStates() {
  const { data } = await supabase.from('schools').select('state').order('state')
  const unique = [...new Set((data ?? []).map((d: { state: string }) => d.state))]
  return unique
}

export async function getSchoolCities(state: string) {
  const { data } = await supabase.from('schools').select('city').eq('state', state).order('city')
  const unique = [...new Set((data ?? []).map((d: { city: string }) => d.city))]
  return unique
}

export async function getSchoolsWithStudents() {
  const { data } = await supabase.rpc('get_schools_with_students')
  return data ?? []
}

export async function getSchoolById(schoolId: string) {
  const { data } = await supabase.from('schools').select('*').eq('id', schoolId).single()
  return data as School | null
}

// === Community Categories ===
export async function getCommunityCategories() {
  const { data } = await supabase.from('community_categories').select('*').eq('status', 'ACTIVE').order('display_order')
  return (data ?? []) as CommunityCategory[]
}

// === Community Types ===
export async function getCommunityTypesByCategory(categoryId: string) {
  const { data } = await supabase.from('community_types').select('*').eq('category_id', categoryId).eq('status', 'ACTIVE').order('display_order')
  return (data ?? []) as CommunityType[]
}

// === Communities ===
export async function getCommunitiesByType(typeId: string) {
  const { data } = await supabase.from('communities').select('*').eq('type_id', typeId).eq('status', 'ACTIVE').order('display_order')
  return (data ?? []) as Community[]
}

export async function getCommunityById(communityId: string) {
  const { data } = await supabase.from('communities').select('*, community_type:community_types(*, category:community_categories(*))').eq('id', communityId).single()
  return data as Community | null
}

// === Community Levels ===
export async function getCommunityLevels(communityId: string) {
  const { data } = await supabase.from('community_levels').select('*').eq('community_id', communityId).order('tier')
  return (data ?? []) as CommunityLevel[]
}

// === Characters ===
export async function getCharactersByCommunity(communityId: string) {
  const { data } = await supabase.from('characters').select('*, level:community_levels(*)').eq('community_id', communityId).eq('status', 'ACTIVE').order('display_order')
  return (data ?? []) as Character[]
}

export async function getCharactersFiltered(communityId: string, archetype?: string, gender?: string) {
  let q = supabase.from('characters').select('*, level:community_levels(*)').eq('community_id', communityId).eq('status', 'ACTIVE')
  if (archetype) q = q.eq('archetype', archetype)
  if (gender) q = q.eq('gender', gender)
  const { data } = await q.order('display_order')
  return (data ?? []) as Character[]
}

export async function getAvailableArchetypes(communityId: string, gender?: string) {
  let q = supabase.from('characters').select('archetype').eq('community_id', communityId).eq('status', 'ACTIVE')
  if (gender) q = q.eq('gender', gender)
  const { data } = await q
  return [...new Set((data ?? []).map((d: { archetype: string }) => d.archetype))]
}

// === Scoring Rules ===
export async function getScoringRule(ruleKey: string) {
  const { data } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('rule_key', ruleKey)
    .eq('active', true)
    .single()
  return data
}

export async function getActionScoringRules() {
  const { data } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('rule_type', 'action')
    .eq('active', true)
    .order('points', { ascending: true })
  return data ?? []
}

// === Action Types ===
export async function getActionTypes() {
  const { data } = await supabase.from('action_types').select('*').order('display_order')
  return (data ?? []) as ActionType[]
}

// === Students ===
export async function getStudentByUserId(userId: string) {
  const { data } = await supabase.from('students').select('*, community:communities(*, community_type:community_types(*, category:community_categories(*))), character:characters(*, level:community_levels(*))').eq('user_id', userId).single()
  return data as Student | null
}

export async function createStudent(student: Partial<Student>) {
  const { data, error } = await supabase.from('students').insert(student).select().single()
  if (error) throw error
  return data as Student
}

export async function updateStudent(id: string, updates: Partial<Student>) {
  const { data, error } = await supabase.from('students').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data as Student
}

export async function getStudentsBySchool(schoolId: string) {
  const { data } = await supabase.from('students').select('*, community:communities(name, slug, color_hex)').eq('school_id', schoolId).order('total_points', { ascending: false })
  return (data ?? []) as Student[]
}

export async function searchStudents(query: string) {
  const { data } = await supabase.from('students').select('id, name, email, whatsapp, school_id').or(`name.ilike.%${query}%,email.ilike.%${query}%,whatsapp.ilike.%${query}%`).limit(20)
  return (data ?? []) as Partial<Student>[]
}

// === Actions ===
export async function createAction(action: Partial<Action>) {
  const { data, error } = await supabase.from('actions').insert(action).select().single()
  if (error) throw error
  return data as Action
}

export async function getActionsByAuthor(authorId: string) {
  const { data } = await supabase.from('actions').select('*, action_type:action_types(*), beneficiary:students!actions_beneficiary_id_fkey(name)').eq('author_id', authorId).order('created_at', { ascending: false })
  return (data ?? []) as Action[]
}

export async function getPendingActionsForValidator(studentId: string, _schoolId?: string) {
  const { data } = await supabase.from('actions').select('*, action_type:action_types(*), author:students!actions_author_id_fkey(name)').eq('status', 'pending').neq('author_id', studentId).order('created_at', { ascending: false }).limit(20)
  return (data ?? []) as Action[]
}

export async function validateAction(actionId: string, validatorId: string, result: 'confirmed' | 'denied', pointsAwarded: number) {
  const updates: Record<string, unknown> = {
    validator_id: validatorId,
    validated_at: new Date().toISOString()
  }
  if (result === 'confirmed') {
    updates.status = 'validated'
    updates.points_awarded = pointsAwarded
  } else {
    updates.status = 'denied'
    updates.points_awarded = 0
  }
  const { error } = await supabase.from('actions').update(updates).eq('id', actionId)
  if (error) throw error

  await supabase.from('validations').insert({
    action_id: actionId,
    validator_id: validatorId,
    result
  })
}

export async function getRecentActions(limit = 20) {
  const { data } = await supabase.from('actions').select('*, action_type:action_types(*), author:students!actions_author_id_fkey(name, community_id)').eq('status', 'validated').order('created_at', { ascending: false }).limit(limit)
  return (data ?? []) as Action[]
}

// === Badges ===
export async function getBadges() {
  const { data } = await supabase.from('badges').select('*')
  return (data ?? []) as Badge[]
}

export async function getStudentBadges(studentId: string) {
  const { data } = await supabase.from('student_badges').select('*, badge:badges(*)').eq('student_id', studentId)
  return data ?? []
}

// === Rewards ===
export async function getRewards() {
  const { data } = await supabase.from('rewards').select('*, sponsor:sponsors(business_name)').eq('active', true).order('points_cost')
  return (data ?? []) as Reward[]
}

export async function redeemReward(studentId: string, rewardId: string) {
  const { data, error } = await supabase.from('redemptions').insert({
    student_id: studentId,
    reward_id: rewardId,
    status: 'pending'
  }).select().single()
  if (error) throw error
  return data as Redemption
}

// === Teachers ===
export async function getTeacherByUserId(userId: string) {
  const { data } = await supabase.from('teachers').select('*').eq('user_id', userId).single()
  return data as Teacher | null
}

export async function createTeacher(teacher: Partial<Teacher>) {
  const { data, error } = await supabase.from('teachers').insert(teacher).select().single()
  if (error) throw error
  return data as Teacher
}

export async function getTeacherAssignments(teacherId: string) {
  const { data } = await supabase.from('teacher_assignments').select('*, classroom:classrooms(*), subject:subjects(*), school:schools(name, city, state)').eq('teacher_id', teacherId)
  return (data ?? []) as TeacherAssignment[]
}

// === Subjects ===
export async function getSubjectsByLevel(level: string) {
  const { data } = await supabase.from('subjects').select('*').eq('level', level).eq('is_custom', false).order('display_order')
  return (data ?? []) as Subject[]
}

// === Classrooms ===
export async function getClassroomsBySchool(schoolId: string) {
  const { data } = await supabase.from('classrooms').select('*').eq('school_id', schoolId).order('grade').order('section')
  return (data ?? []) as Classroom[]
}

export async function createClassroom(classroom: Partial<Classroom>) {
  const { data, error } = await supabase.from('classrooms').insert(classroom).select().single()
  if (error) throw error
  return data as Classroom
}

export async function findOrCreateClassroom(schoolId: string, grade: string, section: string) {
  // Try to find existing classroom
  const { data: existing } = await supabase.from('classrooms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('grade', grade)
    .eq('section', section)
    .eq('year', new Date().getFullYear())
    .maybeSingle()

  if (existing) return existing as Classroom

  // Create new classroom
  const { data, error } = await supabase.from('classrooms').insert({
    school_id: schoolId,
    grade,
    section,
    year: new Date().getFullYear()
  }).select().single()
  if (error) throw error
  return data as Classroom
}

export async function createStudentEnrollment(studentId: string, classroomId: string) {
  const { error } = await supabase.from('student_enrollments').insert({
    student_id: studentId,
    classroom_id: classroomId,
    academic_year: new Date().getFullYear()
  })
  if (error && !error.message.includes('duplicate')) throw error
}

// === Parents ===
export async function getParentByUserId(userId: string) {
  const { data } = await supabase.from('parents').select('*').eq('user_id', userId).single()
  return data as Parent | null
}

export async function createParent(parent: Partial<Parent>) {
  const { data, error } = await supabase.from('parents').insert(parent).select().single()
  if (error) throw error
  return data as Parent
}

export async function getParentStudents(parentId: string) {
  const { data } = await supabase.from('parent_students').select('*, student:students(*, community:communities(*), school:schools(name))').eq('parent_id', parentId)
  return (data ?? []) as ParentStudent[]
}

// === Sponsors ===
export async function getSponsorByUserId(userId: string) {
  const { data } = await supabase.from('sponsors').select('*').eq('user_id', userId).single()
  return data as Sponsor | null
}

export async function createSponsor(sponsor: Partial<Sponsor>) {
  const { data, error } = await supabase.from('sponsors').insert(sponsor).select().single()
  if (error) throw error
  return data as Sponsor
}

// === Fraud Alerts ===
export async function getFraudAlerts(_schoolId?: string) {
  const q = supabase.from('fraud_alerts').select('*, student_a:students!fraud_alerts_student_a_id_fkey(name), student_b:students!fraud_alerts_student_b_id_fkey(name)').eq('reviewed', false)
  const { data } = await q.order('created_at', { ascending: false })
  return (data ?? []) as FraudAlert[]
}

// === Statistics (public) ===
export async function getPublicStats() {
  const [students, actions, schools] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }),
    supabase.from('actions').select('id', { count: 'exact', head: true }).eq('status', 'validated'),
    supabase.from('students').select('school_id').not('school_id', 'is', null)
  ])

  const uniqueSchools = new Set((schools.data ?? []).map((s: { school_id: string }) => s.school_id))

  return {
    totalStudents: students.count ?? 0,
    totalActions: actions.count ?? 0,
    totalActiveSchools: uniqueSchools.size
  }
}

// === Streak ===
export async function getStudentStreak(studentId: string): Promise<number> {
  const { data } = await supabase
    .from('actions')
    .select('created_at')
    .eq('author_id', studentId)
    .eq('status', 'validated')
    .order('created_at', { ascending: false })
    .limit(60)
  if (!data || data.length === 0) return 0

  const actionDates = new Set(data.map(a => new Date(a.created_at).toISOString().slice(0, 10)))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    if (actionDates.has(dateStr)) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

// === Referral ===
export async function generateReferralCode(studentId: string): Promise<string> {
  // Check if student already has a code
  const { data: student } = await supabase
    .from('students')
    .select('referral_code')
    .eq('id', studentId)
    .single()
  if (student?.referral_code) return student.referral_code

  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  await supabase.from('students').update({ referral_code: code }).eq('id', studentId)
  return code
}

export async function applyReferral(referralCode: string, newStudentId: string) {
  const { data: referrer } = await supabase
    .from('students')
    .select('id')
    .eq('referral_code', referralCode)
    .single()
  if (!referrer) return null

  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', newStudentId)
    .maybeSingle()
  if (existing) return null

  // Count existing referrals
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id)
    .eq('status', 'credited')

  const n = (count ?? 0) + 1
  let ruleKey = 'referral_1_5'
  if (n > 10) ruleKey = 'referral_11_plus'
  else if (n > 5) ruleKey = 'referral_6_10'

  const rule = await getScoringRule(ruleKey)
  const pts = rule?.points ?? 25

  await supabase.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newStudentId,
    referral_code: referralCode + '-' + newStudentId.slice(0, 8),
    status: 'credited',
    points_awarded: pts,
  })

  // Credit points to referrer
  await supabase.rpc('increment_points', { student_id: referrer.id, pts })

  return { referrerId: referrer.id, points: pts }
}

// === LGPD Email ===
export async function sendLgpdConsentEmail(parentEmail: string, studentName: string, studentId: string) {
  const consentUrl = `${window.location.origin}/lgpd/consent?student=${studentId}`
  // Use Supabase Edge Function or fallback to auth email
  try {
    const { error } = await supabase.functions.invoke('send-lgpd-email', {
      body: { parentEmail, studentName, consentUrl },
    })
    if (error) {
      console.error('Edge function error, using auth fallback:', error)
      // Fallback: use Supabase Auth magic link to the parent email
      await supabase.auth.signInWithOtp({
        email: parentEmail,
        options: { data: { type: 'lgpd_consent', student_id: studentId, student_name: studentName } },
      })
    }
    return true
  } catch {
    console.error('Failed to send LGPD email')
    return false
  }
}

// === Phone Verification ===
export async function createPhoneVerification(userId: string, phone: string) {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const { error } = await supabase.from('phone_verifications').insert({
    user_id: userId,
    phone,
    code,
    verified: false
  })
  if (error) throw error
  console.log(`[PHONE VERIFICATION] Code for ${phone}: ${code}`)
  alert(`Codigo de verificacao: ${code}`)
  return code
}

export async function verifyPhoneCode(userId: string, code: string) {
  const { data } = await supabase.from('phone_verifications')
    .select('*')
    .eq('user_id', userId)
    .eq('code', code)
    .eq('verified', false)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return false

  await supabase.from('phone_verifications').update({ verified: true }).eq('id', data.id)
  return true
}
