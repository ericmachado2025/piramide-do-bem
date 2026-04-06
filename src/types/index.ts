export interface School {
  id: string
  name: string
  city: string
  state: string
  neighborhood: string
  latitude: number
  longitude: number
  student_count?: number
  actions_count?: number
}

export interface Classroom {
  id: string
  school_id: string
  grade: string
  section: string
}

export interface Tribe {
  id: string
  name: string
  icon: string
  description: string
  universe: string
}

export interface Character {
  id: string
  tribe_id: string
  tier: number
  name: string
  description: string
  min_points: number
  archetype?: 'hero' | 'villain' | 'neutral'
  gender_filter?: 'male' | 'female' | 'neutral'
}

export interface ActionType {
  id: string
  name: string
  points: number
  icon: string
  description: string
  allows_multiple?: boolean
}

export interface Student {
  id: string
  user_id: string
  name: string
  email: string
  birth_date: string
  school_id: string
  classroom_id: string
  tribe_id: string
  current_character_id: string
  total_points: number
  available_points: number
  redeemed_points: number
  last_action_date: string
  role: string
  parent_consent: boolean
  parent_name: string
  parent_email: string
  created_at: string
}

export interface Action {
  id: string
  author_id: string
  beneficiary_id: string
  action_type_id: string
  description: string
  status: 'pending' | 'validated' | 'denied' | 'expired'
  validator_id: string
  beneficiary_confirmed: boolean
  qr_code_token: string
  expires_at: string
  validated_at: string
  points_awarded: number
  created_at: string
  author?: Student
  beneficiary?: Student
  validator?: Student
  action_type?: ActionType
}

export interface Reward {
  id: string
  name: string
  description: string
  points_cost: number
  icon: string
  category: 'school' | 'sponsor' | 'special'
  sponsor_name: string
  is_active: boolean
  is_temporary: boolean
  expires_at: string
}

export interface Redemption {
  id: string
  student_id: string
  reward_id: string
  points_spent: number
  qr_code_token: string
  status: string
  created_at: string
  reward?: Reward
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  criteria: string
}

export interface StudentBadge {
  student_id: string
  badge_id: string
  earned_at: string
}

export interface FraudAlert {
  id: string
  type: string
  student_a_id: string
  student_b_id: string
  description: string
  reviewed: boolean
  reviewed_by: string
  created_at: string
}

export interface Spotlight {
  id: string
  student_id: string
  school_id: string
  week_start: string
  created_at: string
}
