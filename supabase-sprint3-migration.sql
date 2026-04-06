-- ============================================
-- PIRÂMIDE DO BEM ESCOLAR — Sprint 3 Migration
-- Execute APÓS sprint2 migration
-- ============================================

-- ===== B6: Ações expandidas =====
ALTER TABLE action_types ADD COLUMN IF NOT EXISTS allows_multiple BOOLEAN DEFAULT FALSE;

-- Novas ações
INSERT INTO action_types (name, points, icon, description, allows_multiple) VALUES
  ('Resgatei colega que faltava', 30, '🔔', 'Fui atrás de colega que estava faltando', false),
  ('Ofereci ajuda proativamente', 20, '💡', 'Ofereceu ajuda antes de ser pedido', false),
  ('Trouxe material extra', 10, '✏️', 'Lápis, borracha, caderno para colega', false),
  ('Incluí colega em grupo', 15, '👥', 'Incluiu colega que estava sozinho', false),
  ('Organizei grupo de estudo', 25, '📖', 'Mínimo 3 participantes', true),
  ('Ajudei colega PcD', 20, '♿', 'Inclusão ativa de colega com necessidades especiais', false),
  ('Limpei/organizei sala', 10, '🧹', 'Organização voluntária da sala', false),
  ('Outra boa ação', 10, '✨', 'Ação livre descrita pelo aluno', false)
ON CONFLICT DO NOTHING;

-- ===== B9: Patrocinadores =====
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj VARCHAR(14),
  address TEXT,
  city TEXT,
  state CHAR(2),
  contact_email TEXT,
  contact_phone TEXT,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsor_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES sponsors(id),
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  benefit_description TEXT NOT NULL,
  discount_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== B10: Anos letivos =====
-- (Tabelas já criadas no sprint 2, aqui apenas dados iniciais)

-- ===== RLS =====
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON sponsors FOR SELECT USING (true);
CREATE POLICY "Public read" ON sponsor_benefits FOR SELECT USING (true);

-- ===== Seed: Patrocinadores de exemplo =====
INSERT INTO sponsors (name, cnpj, address, city, state, contact_email, category) VALUES
  ('Papelaria Criativa', '12345678000101', 'Rua das Flores, 123', 'Porto Alegre', 'RS', 'contato@papelaria.com', 'papelaria'),
  ('Lanchonete do Bairro', '12345678000102', 'Av. Central, 456', 'Porto Alegre', 'RS', 'contato@lanchonete.com', 'lanchonete'),
  ('CineMax', '12345678000103', 'Shopping Centro, Loja 42', 'Porto Alegre', 'RS', 'contato@cinemax.com', 'cinema'),
  ('Livraria Saber', '12345678000104', 'Rua do Conhecimento, 789', 'Porto Alegre', 'RS', 'contato@livraria.com', 'livraria'),
  ('Arena Sports', '12345678000105', 'Parque Esportivo, 321', 'Porto Alegre', 'RS', 'contato@arena.com', 'esportes');
