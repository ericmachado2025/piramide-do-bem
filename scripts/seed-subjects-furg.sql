-- ============================================
-- SEED: Matérias do currículo brasileiro + FURG
-- ============================================

-- Fundamental 1 (1º ao 5º ano)
INSERT INTO subjects (name, level, display_order, is_custom) VALUES
  ('Português', 'fundamental1', 1, false),
  ('Matemática', 'fundamental1', 2, false),
  ('Ciências', 'fundamental1', 3, false),
  ('História', 'fundamental1', 4, false),
  ('Geografia', 'fundamental1', 5, false),
  ('Arte', 'fundamental1', 6, false),
  ('Educação Física', 'fundamental1', 7, false),
  ('Inglês', 'fundamental1', 8, false),
  ('Outros', 'fundamental1', 99, false);

-- Fundamental 2 (6º ao 9º ano)
INSERT INTO subjects (name, level, display_order, is_custom) VALUES
  ('Português', 'fundamental2', 1, false),
  ('Matemática', 'fundamental2', 2, false),
  ('Ciências', 'fundamental2', 3, false),
  ('História', 'fundamental2', 4, false),
  ('Geografia', 'fundamental2', 5, false),
  ('Arte', 'fundamental2', 6, false),
  ('Educação Física', 'fundamental2', 7, false),
  ('Inglês', 'fundamental2', 8, false),
  ('Espanhol', 'fundamental2', 9, false),
  ('Redação', 'fundamental2', 10, false),
  ('Outros', 'fundamental2', 99, false);

-- Ensino Médio
INSERT INTO subjects (name, level, display_order, is_custom) VALUES
  ('Português', 'medio', 1, false),
  ('Literatura', 'medio', 2, false),
  ('Redação', 'medio', 3, false),
  ('Matemática', 'medio', 4, false),
  ('Física', 'medio', 5, false),
  ('Química', 'medio', 6, false),
  ('Biologia', 'medio', 7, false),
  ('História', 'medio', 8, false),
  ('Geografia', 'medio', 9, false),
  ('Filosofia', 'medio', 10, false),
  ('Sociologia', 'medio', 11, false),
  ('Arte', 'medio', 12, false),
  ('Educação Física', 'medio', 13, false),
  ('Inglês', 'medio', 14, false),
  ('Espanhol', 'medio', 15, false),
  ('Outros', 'medio', 99, false);

-- Superior: só "Outros" (professores criam as suas)
INSERT INTO subjects (name, level, display_order, is_custom) VALUES
  ('Outros', 'superior', 99, false);

-- ============================================
-- FURG
-- ============================================
INSERT INTO schools (name, city, state, school_type, latitude, longitude, inep_code)
VALUES (
  'Universidade Federal do Rio Grande (FURG)',
  'Rio Grande',
  'RS',
  'superior',
  -32.0793000,
  -52.1627000,
  NULL
);
