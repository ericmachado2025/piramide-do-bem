export interface School {
  id: string
  inep_code: string | null
  name: string
  city: string
  state: string
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  school_type: string
  active: boolean
  created_at: string
}

export interface Tribe {
  id: string
  name: string
  slug: string
  icon_class: string | null
  color_hex: string | null
  description: string | null
  display_order: number | null
}

export interface Character {
  id: string
  tribe_id: string
  tier: number
  name: string
  real_name: string | null
  description: string | null
  archetype: string | null
  gender: string | null
  display_order: number | null
  min_points: number
}

export interface Teacher {
  id: string
  user_id: string | null
  name: string
  email: string
  phone: string | null
  verified_email: boolean
  verified_phone: boolean
  created_at: string
}

export interface Subject {
  id: string
  name: string
  level: string
  display_order: number | null
  is_custom: boolean
  created_by_teacher_id: string | null
  created_at: string
}

export interface Classroom {
  id: string
  school_id: string
  grade: string
  section: string | null
  year: number
  created_at: string
}

export interface TeacherAssignment {
  id: string
  teacher_id: string
  school_id: string
  classroom_id: string
  subject_id: string
  created_at: string
  teacher?: Teacher
  school?: School
  classroom?: Classroom
  subject?: Subject
}

export interface Student {
  id: string
  user_id: string | null
  name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  school_id: string | null
  tribe_id: string | null
  current_character_id: string | null
  total_points: number
  available_points: number
  redeemed_points: number
  last_action_date: string | null
  role: string
  parent_consent: boolean
  parent_name: string | null
  parent_email: string | null
  created_at: string
  school?: School
  tribe?: Tribe
  character?: Character
}

export interface StudentEnrollment {
  id: string
  student_id: string
  classroom_id: string
  teacher_id: string
  subject_id: string
  enrolled_at: string
}

export interface Parent {
  id: string
  user_id: string | null
  name: string
  email: string
  phone: string | null
  verified_email: boolean
  verified_phone: boolean
  created_at: string
}

export interface ParentStudent {
  id: string
  parent_id: string
  student_id: string
  relationship: string
  consent_given: boolean
  consent_date: string | null
  created_at: string
  student?: Student
}

export interface Sponsor {
  id: string
  user_id: string | null
  business_name: string
  contact_name: string
  email: string
  phone: string | null
  city: string | null
  state: string | null
  verified_email: boolean
  verified_phone: boolean
  active: boolean
  created_at: string
}

export interface ActionType {
  id: string
  name: string
  points: number
  icon: string | null
  description: string | null
  display_order: number | null
}

export interface Action {
  id: string
  author_id: string
  action_type_id: string
  beneficiary_id: string | null
  validator_id: string | null
  description: string | null
  qr_code_token: string
  status: string
  points_awarded: number | null
  created_at: string
  validated_at: string | null
  expires_at: string
  author?: Student
  beneficiary?: Student
  validator?: Student
  action_type?: ActionType
}

export interface Validation {
  id: string
  action_id: string
  validator_id: string
  result: string | null
  created_at: string
}

export interface Reward {
  id: string
  sponsor_id: string | null
  name: string
  description: string | null
  points_cost: number
  category: string | null
  active: boolean
  is_spotlight: boolean
  expires_at: string | null
  created_at: string
  sponsor?: Sponsor
}

export interface Redemption {
  id: string
  student_id: string
  reward_id: string
  qr_code_token: string
  status: string
  created_at: string
  reward?: Reward
}

export interface Badge {
  id: string
  name: string
  description: string | null
  icon: string | null
  condition_type: string | null
  condition_value: number | null
}

export interface StudentBadge {
  id: string
  student_id: string
  badge_id: string
  earned_at: string
  badge?: Badge
}

export interface FraudAlert {
  id: string
  student_a_id: string
  student_b_id: string | null
  description: string | null
  reviewed: boolean
  reviewed_by: string | null
  created_at: string
}

export interface Spotlight {
  id: string
  student_id: string
  school_id: string
  week_start: string
  created_at: string
  student?: Student
  school?: School
}

export interface PhoneVerification {
  id: string
  user_id: string
  phone: string
  code: string
  verified: boolean
  created_at: string
  expires_at: string
}
