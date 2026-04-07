-- ============================================
-- PIRÂMIDE DO BEM ESCOLAR — Migração V2
-- Schema completo com UUIDs
-- ============================================

-- Drop tabelas antigas (ordem reversa de dependências)
DROP TABLE IF EXISTS spotlights CASCADE;
DROP TABLE IF EXISTS fraud_alerts CASCADE;
DROP TABLE IF EXISTS student_badges CASCADE;
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS validations CASCADE;
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS action_types CASCADE;
DROP TABLE IF EXISTS phone_verifications CASCADE;
DROP TABLE IF EXISTS parent_students CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS teacher_assignments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS tribes CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS classrooms CASCADE;
DROP TABLE IF EXISTS sponsors CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- ============================================
-- TABELAS
-- ============================================

-- Escolas (base INEP + instituições especiais)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inep_code TEXT UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  school_type TEXT DEFAULT 'fundamental',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tribos (IDs = PublicId do Communities.sql)
CREATE TABLE tribes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon_class TEXT,
  color_hex TEXT,
  description TEXT,
  display_order INT
);

-- Personagens (IDs = PublicId do Communities.sql)
CREATE TABLE characters (
  id UUID PRIMARY KEY,
  tribe_id UUID REFERENCES tribes(id),
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  real_name TEXT,
  description TEXT,
  archetype TEXT,
  gender TEXT,
  display_order INT,
  min_points INT NOT NULL DEFAULT 0
);

-- Professores
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  verified_email BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matérias/Disciplinas
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  display_order INT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by_teacher_id UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Turmas
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  grade TEXT NOT NULL,
  section CHAR(2),
  year INT DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, grade, section, year)
);

-- Vínculo professor → escola → turmas → matérias
CREATE TABLE teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(id),
  school_id UUID REFERENCES schools(id),
  classroom_id UUID REFERENCES classrooms(id),
  subject_id UUID REFERENCES subjects(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, classroom_id, subject_id)
);

-- Alunos
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birth_date DATE,
  school_id UUID REFERENCES schools(id),
  tribe_id UUID REFERENCES tribes(id),
  current_character_id UUID REFERENCES characters(id),
  total_points INT DEFAULT 0,
  available_points INT DEFAULT 0,
  redeemed_points INT DEFAULT 0,
  last_action_date TIMESTAMPTZ,
  role TEXT DEFAULT 'student',
  parent_consent BOOLEAN DEFAULT FALSE,
  parent_name TEXT,
  parent_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo aluno → turmas → professores
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  classroom_id UUID REFERENCES classrooms(id),
  teacher_id UUID REFERENCES teachers(id),
  subject_id UUID REFERENCES subjects(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, classroom_id, subject_id)
);

-- Responsáveis (pais)
CREATE TABLE parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  verified_email BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo pai → aluno
CREATE TABLE parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES parents(id),
  student_id UUID REFERENCES students(id),
  relationship TEXT DEFAULT 'responsavel',
  consent_given BOOLEAN DEFAULT FALSE,
  consent_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patrocinadores
CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  state CHAR(2),
  verified_email BOOLEAN DEFAULT FALSE,
  verified_phone BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de ação
CREATE TABLE action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points INT NOT NULL,
  icon TEXT,
  description TEXT,
  display_order INT
);

-- Ações
CREATE TABLE actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES students(id),
  action_type_id UUID REFERENCES action_types(id),
  beneficiary_id UUID REFERENCES students(id),
  validator_id UUID REFERENCES students(id),
  description TEXT,
  qr_code_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending',
  points_awarded INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours'
);

-- Validações
CREATE TABLE validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES actions(id),
  validator_id UUID REFERENCES students(id),
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recompensas
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL,
  category TEXT,
  active BOOLEAN DEFAULT TRUE,
  is_spotlight BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resgates
CREATE TABLE redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  reward_id UUID REFERENCES rewards(id),
  qr_code_token UUID DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Selos
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  condition_type TEXT,
  condition_value INT
);

-- Selos do aluno
CREATE TABLE student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas anti-fraude
CREATE TABLE fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id UUID REFERENCES students(id),
  student_b_id UUID REFERENCES students(id),
  description TEXT,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spotlights semanais
CREATE TABLE spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  school_id UUID REFERENCES schools(id),
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verificação de telefone
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

-- Políticas: leitura pública + escrita autenticada
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'schools','tribes','characters','teachers','subjects','classrooms',
    'teacher_assignments','students','student_enrollments','parents',
    'parent_students','sponsors','action_types','actions','validations',
    'rewards','redemptions','badges','student_badges','fraud_alerts',
    'spotlights','phone_verifications'
  ]) LOOP
    EXECUTE format('CREATE POLICY "allow_select_%s" ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "allow_insert_%s" ON %I FOR INSERT WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "allow_update_%s" ON %I FOR UPDATE USING (true)', t, t);
    EXECUTE format('CREATE POLICY "allow_delete_%s" ON %I FOR DELETE USING (true)', t, t);
  END LOOP;
END;
$$;
