-- =====================================================
-- MIGRATION: Communities Refactor + School Fixes + Action Types
-- Date: 2026-04-07
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DROP OLD TABLES (tribes, characters)
-- =====================================================

-- Remove FK constraints from students first
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_tribe_id_fkey;
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_current_character_id_fkey;

-- Drop old tables
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS tribes CASCADE;

-- =====================================================
-- 2. CREATE NEW COMMUNITY TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS community_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon_class TEXT,
  color_hex VARCHAR(7),
  display_order INT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID UNIQUE NOT NULL,
  category_id UUID REFERENCES community_categories(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon_class TEXT,
  color_hex VARCHAR(7),
  display_order INT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID UNIQUE NOT NULL,
  type_id UUID REFERENCES community_types(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon_class TEXT,
  color_hex VARCHAR(7),
  display_order INT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID UNIQUE NOT NULL,
  community_id UUID REFERENCES communities(id) NOT NULL,
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  min_points INT NOT NULL DEFAULT 0,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, tier)
);

CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id UUID UNIQUE NOT NULL,
  community_id UUID REFERENCES communities(id) NOT NULL,
  level_id UUID REFERENCES community_levels(id) NOT NULL,
  name TEXT NOT NULL,
  real_name TEXT,
  description TEXT,
  archetype TEXT NOT NULL CHECK (archetype IN ('HERO', 'VILLAIN', 'ANTI_HERO', 'ENTITY', 'NEUTRAL')),
  gender TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  display_order INT NOT NULL,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. UPDATE STUDENTS TABLE
-- =====================================================

-- Rename tribe_id to community_id
ALTER TABLE students RENAME COLUMN tribe_id TO community_id;

-- Add FK constraints
ALTER TABLE students ADD CONSTRAINT students_community_id_fkey
  FOREIGN KEY (community_id) REFERENCES communities(id);
ALTER TABLE students ADD CONSTRAINT students_current_character_id_fkey
  FOREIGN KEY (current_character_id) REFERENCES characters(id);

-- Add whatsapp column
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(15);

-- Add gender column if not exists (for character filtering)
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender TEXT;

-- =====================================================
-- 4. FIX SCHOOLS - school_type to support multiple types
-- =====================================================

-- Change school_type to TEXT to support comma-separated values
-- e.g. 'fundamental_I,fundamental_II,medio'
ALTER TABLE schools ALTER COLUMN school_type TYPE TEXT;

-- =====================================================
-- 5. ADD MISSING ACTION TYPES
-- =====================================================

INSERT INTO action_types (name, points, icon, description, display_order) VALUES
('Fui monitor de grupo de estudo', 20, '🎓', 'Ajudei colegas em grupo de estudo', 10),
('Acolhi aluno novo na turma', 15, '🤝', 'Recebi e orientei aluno novo', 11),
('Participei de projeto coletivo', 20, '🏗️', 'Contribuí em projeto da turma', 12),
('Ajudei professor a organizar atividade', 15, '📋', 'Auxiliei o professor', 13),
('Compartilhei material de estudo', 10, '📤', 'Emprestei ou compartilhei material', 14),
('Representei a turma em evento', 30, '🎤', 'Representei colegas', 15),
('Resgatei colega que estava faltando', 30, '🔔', 'Fui atrás de colega ausente', 16),
('Ofereci ajuda proativamente', 20, '🙋', 'Me ofereci antes de ser pedido', 17),
('Limpei/organizei sala voluntariamente', 10, '🧹', 'Ação cívica voluntária', 18)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read community_categories" ON community_categories FOR SELECT USING (true);
CREATE POLICY "Public read community_types" ON community_types FOR SELECT USING (true);
CREATE POLICY "Public read communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Public read community_levels" ON community_levels FOR SELECT USING (true);
CREATE POLICY "Public read characters" ON characters FOR SELECT USING (true);

-- =====================================================
-- 7. INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_community_types_category ON community_types(category_id);
CREATE INDEX IF NOT EXISTS idx_communities_type ON communities(type_id);
CREATE INDEX IF NOT EXISTS idx_community_levels_community ON community_levels(community_id);
CREATE INDEX IF NOT EXISTS idx_characters_community ON characters(community_id);
CREATE INDEX IF NOT EXISTS idx_characters_level ON characters(level_id);
CREATE INDEX IF NOT EXISTS idx_characters_archetype_gender ON characters(archetype, gender);
CREATE INDEX IF NOT EXISTS idx_students_community ON students(community_id);

COMMIT;
