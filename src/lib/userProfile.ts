import { supabase } from './supabase'

export async function getStudentWithUser(authUserId: string) {
  const { data } = await supabase
    .from('students')
    .select(`
      *,
      user:users!students_users_id_fkey(
        name, email, phone, whatsapp,
        whatsapp_visibility, whatsapp_country_code,
        verified_email, verified_phone
      )
    `)
    .eq('user_id', authUserId)
    .maybeSingle()
  return data
}

export async function ensureUserRecord(authUserId: string, email: string, name?: string) {
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUserId)
    .maybeSingle()

  if (existing) return existing

  const { data: created } = await supabase
    .from('users')
    .insert({ auth_id: authUserId, email, name: name || email.split('@')[0] })
    .select('id')
    .single()

  return created
}
