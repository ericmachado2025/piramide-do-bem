-- ============================================
-- PIRÂMIDE DO BEM ESCOLAR — Schema Completo
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Escolas
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7)
);

-- Turmas
CREATE TABLE IF NOT EXISTS classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id),
  grade TEXT NOT NULL,
  section CHAR(1) NOT NULL,
  UNIQUE(school_id, grade, section)
);

-- Tribos
CREATE TABLE IF NOT EXISTS tribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  description TEXT,
  universe TEXT
);

-- Personagens por tier
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id UUID REFERENCES tribes(id),
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  description TEXT,
  min_points INT NOT NULL
);

-- Tipos de ação
CREATE TABLE IF NOT EXISTS action_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points INT NOT NULL,
  icon TEXT,
  description TEXT
);

-- Alunos
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  school_id UUID REFERENCES schools(id),
  classroom_id UUID REFERENCES classrooms(id),
  tribe_id UUID REFERENCES tribes(id),
  current_character_id UUID REFERENCES characters(id),
  total_points INT DEFAULT 0,
  available_points INT DEFAULT 0,
  redeemed_points INT DEFAULT 0,
  last_action_date TIMESTAMPTZ,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  parent_consent BOOLEAN DEFAULT FALSE,
  parent_name TEXT,
  parent_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ações registradas
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES students(id),
  beneficiary_id UUID REFERENCES students(id),
  action_type_id UUID REFERENCES action_types(id),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'denied', 'expired')),
  validator_id UUID REFERENCES students(id),
  beneficiary_confirmed BOOLEAN,
  qr_code_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '48 hours',
  validated_at TIMESTAMPTZ,
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validações (histórico para anti-fraude)
CREATE TABLE IF NOT EXISTS validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES actions(id),
  validator_id UUID REFERENCES students(id),
  author_id UUID REFERENCES students(id),
  result TEXT CHECK (result IN ('confirmed', 'denied')),
  week_number INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recompensas
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  points_cost INT NOT NULL,
  icon TEXT,
  category TEXT CHECK (category IN ('school', 'sponsor', 'special')),
  sponsor_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_temporary BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ
);

-- Resgates
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  reward_id UUID REFERENCES rewards(id),
  points_spent INT NOT NULL,
  qr_code_token TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Selos/badges
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  criteria TEXT
);

-- Selos conquistados por aluno
CREATE TABLE IF NOT EXISTS student_badges (
  student_id UUID REFERENCES students(id),
  badge_id UUID REFERENCES badges(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (student_id, badge_id)
);

-- Alertas anti-fraude
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  student_a_id UUID REFERENCES students(id),
  student_b_id UUID REFERENCES students(id),
  description TEXT,
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by UUID REFERENCES students(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Spotlights semanais
CREATE TABLE IF NOT EXISTS spotlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  school_id UUID REFERENCES schools(id),
  week_start DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS (Row Level Security) básico
-- ============================================
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura (protótipo)
CREATE POLICY "Public read" ON schools FOR SELECT USING (true);
CREATE POLICY "Public read" ON classrooms FOR SELECT USING (true);
CREATE POLICY "Public read" ON tribes FOR SELECT USING (true);
CREATE POLICY "Public read" ON characters FOR SELECT USING (true);
CREATE POLICY "Public read" ON action_types FOR SELECT USING (true);
CREATE POLICY "Public read" ON students FOR SELECT USING (true);
CREATE POLICY "Public read" ON actions FOR SELECT USING (true);
CREATE POLICY "Public read" ON rewards FOR SELECT USING (true);
CREATE POLICY "Public read" ON badges FOR SELECT USING (true);

-- ============================================
-- SEED DATA — Tribos e Personagens
-- ============================================
INSERT INTO tribes (name, icon, description, universe) VALUES
  ('Marvel Heroes', '🦸', 'Evolua de recruta a super-herói', 'Comic Books'),
  ('Marvel Heroines', '🦸‍♀️', 'Evolua de recruta a super-heroína', 'Comic Books'),
  ('Guerreiros Saiyajin', '⚡', 'Liberte seu poder Saiyajin', 'Anime'),
  ('Bruxos de Hogwarts', '🧙', 'De primeiro ano a lenda', 'Filmes/Livros'),
  ('Ordem Jedi', '⚔️', 'Do templo ao conselho', 'Filmes'),
  ('Ninjas de Konoha', '🍃', 'De genin a Hokage', 'Anime'),
  ('Atletas', '🏆', 'De iniciante a platina', 'Esportes'),
  ('Rockstars', '🎸', 'Da garagem ao Hall of Fame', 'Música'),
  ('Aventureiros', '🗡️', 'De aldeão a lenda', 'Games/RPG');

-- Tipos de ação
INSERT INTO action_types (name, points, icon, description) VALUES
  ('Ajudei colega no dever', 10, '📚', 'Ajudar um colega com tarefas escolares'),
  ('Fui monitor de grupo de estudo', 20, '🎓', 'Liderar ou participar como monitor'),
  ('Acolhi aluno novo', 15, '🤝', 'Receber e incluir um aluno novo na turma'),
  ('Participei de projeto coletivo', 20, '🏗️', 'Colaborar em projeto da turma ou escola'),
  ('Mediei conflito', 25, '⚖️', 'Ajudar a resolver desentendimentos'),
  ('Ajudei professor', 15, '📋', 'Auxiliar professor em atividade'),
  ('Compartilhei material', 10, '📤', 'Compartilhar material de estudo'),
  ('Representei a turma', 30, '🎤', 'Representar a turma em evento');

-- Recompensas
INSERT INTO rewards (name, description, points_cost, icon, category, sponsor_name) VALUES
  ('Prioridade na biblioteca', 'Acesso prioritário por 1 semana', 50, '📖', 'school', NULL),
  ('Escolher atividade da aula', 'Escolha a atividade da próxima aula', 100, '🎯', 'school', NULL),
  ('Escolher lugar na sala', 'Escolha seu lugar por 1 semana', 80, '💺', 'school', NULL),
  ('Destaque no mural', 'Foto e nome no mural da escola', 150, '🏆', 'school', NULL),
  ('Certificado de Bom Cidadão', 'Certificado oficial da escola', 200, '📜', 'school', NULL),
  ('Desconto 10% material escolar', 'Válido em qualquer compra', 100, '🎒', 'sponsor', 'Papelaria Criativa'),
  ('Lanche grátis', 'Um lanche completo', 200, '🍔', 'sponsor', 'Lanchonete do Bairro'),
  ('Ingresso de cinema', 'Sessão à escolha', 500, '🎬', 'sponsor', 'CineMax'),
  ('Livro de presente', 'Escolha um livro', 400, '📖', 'sponsor', 'Livraria Saber'),
  ('Desconto no transporte', 'Desconto mensal', 300, '🚌', 'sponsor', 'Prefeitura');

-- Badges
INSERT INTO badges (name, description, icon, criteria) VALUES
  ('Primeira Ação', 'Primeira boa ação validada', '🌟', '1 ação validada'),
  ('Semana Perfeita', 'Ação todos os dias da semana', '🔥', '5 ações em dias consecutivos'),
  ('Centenário', '100 pontos acumulados', '💯', '100+ pontos'),
  ('Acolhedor', '3 alunos novos acolhidos', '🤝', '3 ações de acolhimento'),
  ('Monitor', '5 sessões de monitoria', '📚', '5 ações de monitoria'),
  ('Relâmpago', '5 ações em um único dia', '⚡', '5 ações no mesmo dia'),
  ('Top 10%', 'Entrou na faixa Prata', '🏆', 'QualiScore >= 90'),
  ('Top 5%', 'Entrou na faixa Ouro', '👑', 'QualiScore >= 95');
