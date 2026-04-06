-- ============================================
-- PIRÂMIDE DO BEM ESCOLAR — Sprint 2 Migration
-- Execute APÓS o schema base (supabase-schema.sql)
-- ============================================

-- ===== B5: Gênero + Personagens Expandidos =====
ALTER TABLE characters ADD COLUMN IF NOT EXISTS archetype TEXT DEFAULT 'hero'
  CHECK (archetype IN ('hero', 'anti-hero', 'villain', 'neutral'));
ALTER TABLE characters ADD COLUMN IF NOT EXISTS gender_filter TEXT DEFAULT 'neutral'
  CHECK (gender_filter IN ('male', 'female', 'neutral'));

ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IN ('male', 'female', 'nonbinary', NULL));

-- ===== B3: Validação de Professor =====
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_status TEXT DEFAULT 'pending'
  CHECK (teacher_status IN ('pending', 'validated', 'suspended', 'banned'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_validations_count INT DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS teacher_reports_count INT DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS subjects_taught TEXT[];

CREATE TABLE IF NOT EXISTS teacher_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES students(id),
  validator_id UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, validator_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES students(id),
  target_id UUID REFERENCES students(id),
  target_type TEXT CHECK (target_type IN ('teacher', 'action')),
  reason TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_cookie TEXT,
  device_uuid TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'reviewed', 'discredited', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_blacklist (
  email TEXT PRIMARY KEY,
  reason TEXT,
  device_cookie TEXT,
  device_uuid TEXT,
  banned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  reason TEXT,
  suspended_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== B4: Registro de Ausências =====
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  classroom_id UUID REFERENCES classrooms(id),
  date DATE NOT NULL,
  present BOOLEAN NOT NULL,
  registered_by UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ===== B2: Área de Pais =====
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  cpf VARCHAR(11) UNIQUE,
  email TEXT UNIQUE NOT NULL,
  phone VARCHAR(15),
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  relationship TEXT CHECK (relationship IN ('pai', 'mae', 'tutor', 'responsavel')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parent_student (
  parent_id UUID REFERENCES parents(id),
  student_id UUID REFERENCES students(id),
  authorized BOOLEAN DEFAULT FALSE,
  authorized_at TIMESTAMPTZ,
  PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS family_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id),
  student_id UUID REFERENCES students(id),
  name TEXT NOT NULL,
  description TEXT,
  criteria_type TEXT CHECK (criteria_type IN ('tier', 'points', 'attendance', 'streak')),
  criteria_value INT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'delivered', 'cancelled')),
  achieved_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== B8: Notificações =====
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== B10: Anos Letivos =====
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year INT DEFAULT 2026;

CREATE TABLE IF NOT EXISTS student_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  academic_year INT NOT NULL,
  school_id UUID REFERENCES schools(id),
  classroom_id UUID REFERENCES classrooms(id),
  tribe_id UUID REFERENCES tribes(id),
  final_character_id UUID REFERENCES characters(id),
  total_points INT,
  total_actions INT,
  qualiscore DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_classrooms (
  teacher_id UUID REFERENCES students(id),
  classroom_id UUID REFERENCES classrooms(id),
  academic_year INT NOT NULL,
  PRIMARY KEY (teacher_id, classroom_id, academic_year)
);

-- ===== B7: Sistema de Monitoria =====
CREATE TABLE IF NOT EXISTS student_subjects (
  student_id UUID REFERENCES students(id),
  subject TEXT NOT NULL,
  strength BOOLEAN DEFAULT FALSE,
  weakness BOOLEAN DEFAULT FALSE,
  willing_to_mentor BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (student_id, subject)
);

CREATE TABLE IF NOT EXISTS mentoring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES students(id),
  mentor_id UUID REFERENCES students(id),
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== RLS Policies =====
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_validations ENABLE ROW LEVEL SECURITY;

-- Public read for prototype (tighten in production)
CREATE POLICY "Public read" ON attendance FOR SELECT USING (true);
CREATE POLICY "Public read" ON parents FOR SELECT USING (true);
CREATE POLICY "Public read" ON notifications FOR SELECT USING (true);
CREATE POLICY "Public read" ON teacher_validations FOR SELECT USING (true);
CREATE POLICY "Public read" ON reports FOR SELECT USING (true);
CREATE POLICY "Public read" ON family_rewards FOR SELECT USING (true);

-- Insert policies
CREATE POLICY "Auth insert" ON attendance FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert" ON teacher_validations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert" ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Auth insert" ON family_rewards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
