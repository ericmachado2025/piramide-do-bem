#!/usr/bin/env node
/**
 * Pirâmide do Bem — Setup completo do banco de dados no Supabase
 * Executa via: node scripts/setup-database.js
 */

const SUPABASE_URL = 'https://frdpscbdtudaulscexyp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZHBzY2JkdHVkYXVsc2NleHlwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIzNDgzMSwiZXhwIjoyMDkwODEwODMxfQ.wAYn2tQIr35DCRrFoKBcU6QXPycW5riz1fqAcophM4s';

async function sql(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) {
    // Try the SQL endpoint instead
    const res2 = await fetch(`${SUPABASE_URL}/pg`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query })
    });
    return res2;
  }
  return res;
}

async function execSQL(query, label) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql_text: query })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[ERRO] ${label}: ${res.status} - ${text}`);
    return false;
  }
  console.log(`[OK] ${label}`);
  return true;
}

async function main() {
  console.log('=== PIRÂMIDE DO BEM — Setup do Banco de Dados ===\n');

  // Primeiro, criar a função exec_sql se não existir
  console.log('Criando função exec_sql...');
  const createFn = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql_text: 'SELECT 1' })
  });

  if (!createFn.ok) {
    console.log('Função exec_sql não existe. Criando via SQL Editor API...');
    // Use the Supabase Management API or direct SQL
    // We'll use the /pg endpoint for raw SQL execution
  }

  // ==============================
  // STEP 1: Drop tabelas antigas
  // ==============================
  console.log('\n--- STEP 1: Removendo tabelas antigas ---');

  const dropSQL = `
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
  `;

  await execSQL(dropSQL, 'Drop tabelas antigas');

  // ==============================
  // STEP 2: Criar tabelas novas
  // ==============================
  console.log('\n--- STEP 2: Criando tabelas novas ---');

  // Schools
  await execSQL(`
    CREATE TABLE IF NOT EXISTS schools (
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
  `, 'Tabela schools');

  // Tribes (IDs manuais - do Communities.sql)
  await execSQL(`
    CREATE TABLE IF NOT EXISTS tribes (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      icon_class TEXT,
      color_hex TEXT,
      description TEXT,
      display_order INT
    );
  `, 'Tabela tribes');

  // Characters (IDs manuais - do Communities.sql)
  await execSQL(`
    CREATE TABLE IF NOT EXISTS characters (
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
  `, 'Tabela characters');

  // Teachers
  await execSQL(`
    CREATE TABLE IF NOT EXISTS teachers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      verified_email BOOLEAN DEFAULT FALSE,
      verified_phone BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela teachers');

  // Subjects
  await execSQL(`
    CREATE TABLE IF NOT EXISTS subjects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      level TEXT NOT NULL,
      display_order INT,
      is_custom BOOLEAN DEFAULT FALSE,
      created_by_teacher_id UUID REFERENCES teachers(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela subjects');

  // Classrooms
  await execSQL(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id UUID REFERENCES schools(id),
      grade TEXT NOT NULL,
      section CHAR(2),
      year INT DEFAULT EXTRACT(YEAR FROM NOW()),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(school_id, grade, section, year)
    );
  `, 'Tabela classrooms');

  // Teacher assignments
  await execSQL(`
    CREATE TABLE IF NOT EXISTS teacher_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      teacher_id UUID REFERENCES teachers(id),
      school_id UUID REFERENCES schools(id),
      classroom_id UUID REFERENCES classrooms(id),
      subject_id UUID REFERENCES subjects(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(teacher_id, classroom_id, subject_id)
    );
  `, 'Tabela teacher_assignments');

  // Students
  await execSQL(`
    CREATE TABLE IF NOT EXISTS students (
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
  `, 'Tabela students');

  // Student enrollments
  await execSQL(`
    CREATE TABLE IF NOT EXISTS student_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id),
      classroom_id UUID REFERENCES classrooms(id),
      teacher_id UUID REFERENCES teachers(id),
      subject_id UUID REFERENCES subjects(id),
      enrolled_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(student_id, classroom_id, subject_id)
    );
  `, 'Tabela student_enrollments');

  // Parents
  await execSQL(`
    CREATE TABLE IF NOT EXISTS parents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      verified_email BOOLEAN DEFAULT FALSE,
      verified_phone BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela parents');

  // Parent-students
  await execSQL(`
    CREATE TABLE IF NOT EXISTS parent_students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      parent_id UUID REFERENCES parents(id),
      student_id UUID REFERENCES students(id),
      relationship TEXT DEFAULT 'responsavel',
      consent_given BOOLEAN DEFAULT FALSE,
      consent_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela parent_students');

  // Sponsors
  await execSQL(`
    CREATE TABLE IF NOT EXISTS sponsors (
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
  `, 'Tabela sponsors');

  // Action types
  await execSQL(`
    CREATE TABLE IF NOT EXISTS action_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      points INT NOT NULL,
      icon TEXT,
      description TEXT,
      display_order INT
    );
  `, 'Tabela action_types');

  // Actions
  await execSQL(`
    CREATE TABLE IF NOT EXISTS actions (
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
  `, 'Tabela actions');

  // Validations
  await execSQL(`
    CREATE TABLE IF NOT EXISTS validations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      action_id UUID REFERENCES actions(id),
      validator_id UUID REFERENCES students(id),
      result TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela validations');

  // Rewards
  await execSQL(`
    CREATE TABLE IF NOT EXISTS rewards (
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
  `, 'Tabela rewards');

  // Redemptions
  await execSQL(`
    CREATE TABLE IF NOT EXISTS redemptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id),
      reward_id UUID REFERENCES rewards(id),
      qr_code_token UUID DEFAULT gen_random_uuid(),
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela redemptions');

  // Badges
  await execSQL(`
    CREATE TABLE IF NOT EXISTS badges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      condition_type TEXT,
      condition_value INT
    );
  `, 'Tabela badges');

  // Student badges
  await execSQL(`
    CREATE TABLE IF NOT EXISTS student_badges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id),
      badge_id UUID REFERENCES badges(id),
      earned_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela student_badges');

  // Fraud alerts
  await execSQL(`
    CREATE TABLE IF NOT EXISTS fraud_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_a_id UUID REFERENCES students(id),
      student_b_id UUID REFERENCES students(id),
      description TEXT,
      reviewed BOOLEAN DEFAULT FALSE,
      reviewed_by UUID REFERENCES teachers(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela fraud_alerts');

  // Spotlights
  await execSQL(`
    CREATE TABLE IF NOT EXISTS spotlights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES students(id),
      school_id UUID REFERENCES schools(id),
      week_start DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `, 'Tabela spotlights');

  // Phone verifications
  await execSQL(`
    CREATE TABLE IF NOT EXISTS phone_verifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id),
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
    );
  `, 'Tabela phone_verifications');

  // ==============================
  // STEP 3: RLS
  // ==============================
  console.log('\n--- STEP 3: Habilitando RLS ---');

  const tables = ['schools','tribes','characters','teachers','subjects','classrooms',
    'teacher_assignments','students','student_enrollments','parents','parent_students',
    'sponsors','action_types','actions','validations','rewards','redemptions','badges',
    'student_badges','fraud_alerts','spotlights','phone_verifications'];

  for (const t of tables) {
    await execSQL(`
      ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Public read ${t}" ON ${t};
      CREATE POLICY "Public read ${t}" ON ${t} FOR SELECT USING (true);
      DROP POLICY IF EXISTS "Public insert ${t}" ON ${t};
      CREATE POLICY "Public insert ${t}" ON ${t} FOR INSERT WITH CHECK (true);
      DROP POLICY IF EXISTS "Public update ${t}" ON ${t};
      CREATE POLICY "Public update ${t}" ON ${t} FOR UPDATE USING (true);
    `, `RLS ${t}`);
  }

  console.log('\n=== Schema criado com sucesso! ===');
}

main().catch(console.error);
