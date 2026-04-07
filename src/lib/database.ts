import { supabase } from './supabase'
import type { School, Tribe, Character, ActionType, Badge, Reward, Student, Action, Teacher, Subject, Classroom, Sponsor, TeacherAssignment, Parent, ParentStudent, FraudAlert, Redemption } from '../types'

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

// === Tribes & Characters ===
export async function getTribes() {
  const { data } = await supabase.from('tribes').select('*').order('display_order')
  return (data ?? []) as Tribe[]
}

export async function getCharactersByTribe(tribeId: string) {
  const { data } = await supabase.from('characters').select('*').eq('tribe_id', tribeId).order('tier').order('display_order')
  return (data ?? []) as Character[]
}

export async function getCharactersFiltered(tribeId: string, archetype?: string, gender?: string) {
  let q = supabase.from('characters').select('*').eq('tribe_id', tribeId)
  if (archetype) q = q.eq('archetype', archetype)
  if (gender) q = q.eq('gender', gender)
  const { data } = await q.order('tier')
  return (data ?? []) as Character[]
}

export async function getAvailableArchetypes(tribeId: string) {
  const { data } = await supabase.from('characters').select('archetype').eq('tribe_id', tribeId)
  return [...new Set((data ?? []).map((d: { archetype: string }) => d.archetype))]
}

export async function getAvailableGenders(tribeId: string, archetype: string) {
  const { data } = await supabase.from('characters').select('gender').eq('tribe_id', tribeId).eq('archetype', archetype)
  return [...new Set((data ?? []).map((d: { gender: string }) => d.gender))]
}

// === Action Types ===
export async function getActionTypes() {
  const { data } = await supabase.from('action_types').select('*').order('display_order')
  return (data ?? []) as ActionType[]
}

// === Students ===
export async function getStudentByUserId(userId: string) {
  const { data } = await supabase.from('students').select('*, tribe:tribes(*), character:characters(*)').eq('user_id', userId).single()
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
  const { data } = await supabase.from('students').select('*, tribe:tribes(name, slug, color_hex)').eq('school_id', schoolId).order('total_points', { ascending: false })
  return (data ?? []) as Student[]
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
  const { data } = await supabase.from('actions').select('*, action_type:action_types(*), author:students!actions_author_id_fkey(name, tribe_id)').eq('status', 'validated').order('created_at', { ascending: false }).limit(limit)
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
  const { data } = await supabase.from('parent_students').select('*, student:students(*, tribe:tribes(*), school:schools(name))').eq('parent_id', parentId)
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
  let q = supabase.from('fraud_alerts').select('*, student_a:students!fraud_alerts_student_a_id_fkey(name), student_b:students!fraud_alerts_student_b_id_fkey(name)').eq('reviewed', false)
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
  alert(`Código de verificação: ${code}`)
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
