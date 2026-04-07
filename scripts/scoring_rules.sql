CREATE TABLE IF NOT EXISTS scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT UNIQUE NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('action', 'validation', 'bonus', 'penalty', 'multiplier')),
  description TEXT NOT NULL,
  points INT NOT NULL,
  multiplier DECIMAL(3,1) DEFAULT 1.0,
  active BOOLEAN DEFAULT TRUE,
  min_interval_hours INT,
  max_daily INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS scoring_rules_read ON scoring_rules;
CREATE POLICY scoring_rules_read ON scoring_rules FOR SELECT USING (true);
INSERT INTO scoring_rules (rule_key, rule_type, description, points, multiplier, max_daily, notes) VALUES
('action_silencio', 'action', 'Fiz silencio pra alguem estudar', 25, 1.0, 3, 'Acao simples, frequente'),
('action_material', 'action', 'Ajudei com material', 40, 1.0, 5, 'Emprestar lapis, caderno'),
('action_dever', 'action', 'Ajudei colega no dever', 50, 1.0, 5, 'Acao mais comum'),
('action_compartilhei', 'action', 'Compartilhei material de estudo', 50, 1.0, 5, 'Compartilhar resumos'),
('action_limpeza', 'action', 'Limpei/organizei sala voluntariamente', 50, 1.0, 2, 'Acao civica'),
('action_ensinar', 'action', 'Ensinei algo que sei', 75, 1.0, 3, 'Tutoria informal'),
('action_acolher', 'action', 'Acolhi aluno novo na turma', 75, 1.0, 3, 'Inclusao de novatos'),
('action_professor', 'action', 'Ajudei professor a organizar atividade', 75, 1.0, 3, 'Colaboracao com docente'),
('action_inclusao', 'action', 'Inclui colega excluido', 100, 1.0, 3, 'Combate a exclusao'),
('action_monitor', 'action', 'Fui monitor de grupo de estudo', 100, 1.0, 2, 'Lideranca academica'),
('action_projeto', 'action', 'Participei de projeto coletivo', 100, 1.0, 2, 'Trabalho em equipe'),
('action_atividade', 'action', 'Organizei atividade coletiva', 100, 1.0, 2, 'Lideranca social'),
('action_proativo', 'action', 'Ofereci ajuda proativamente', 100, 2.0, 2, 'Multiplicador x2 por proatividade'),
('action_conflito', 'action', 'Mediei um conflito', 125, 1.0, 2, 'Pacificacao'),
('action_bullying', 'action', 'Defendi colega do bullying', 150, 1.0, 2, 'Coragem e empatia'),
('action_representar', 'action', 'Representei a turma em evento', 150, 1.0, 1, 'Representatividade'),
('action_resgatar', 'action', 'Resgatei colega que estava faltando', 150, 1.0, 2, 'Anti-evasao direta'),
('action_outra', 'action', 'Outra boa acao (personalizada)', 50, 1.0, 3, 'Acao livre definida pelo aluno'),
('validation_bonus', 'validation', 'Bonus por validar acao de colega', 15, 1.0, 10, 'Incentivo para validar'),
('referral_1_5', 'bonus', 'Indicacao (1a a 5a)', 25, 1.0, NULL, 'Primeiras 5 indicacoes'),
('referral_6_10', 'bonus', 'Indicacao (6a a 10a)', 15, 1.0, NULL, 'Indicacoes 6-10'),
('referral_11_plus', 'bonus', 'Indicacao (11a em diante)', 5, 1.0, NULL, 'Indicacoes 11+'),
('penalty_false_report', 'penalty', 'Denuncia falsa comprovada', -100, 1.0, NULL, 'Perda de pontos'),
('decay_monthly', 'penalty', 'Decaimento mensal por inatividade', -10, 1.0, NULL, 'Perde 10% apos 30 dias sem acao'),
('multiplier_streak_7', 'multiplier', 'Bonus sequencia 7 dias', 0, 1.5, NULL, 'Acoes todos os dias por 7 dias = 50% extra'),
('multiplier_streak_30', 'multiplier', 'Bonus sequencia 30 dias', 0, 2.0, NULL, 'Acoes todos os dias por 30 dias = 100% extra')
ON CONFLICT (rule_key) DO UPDATE SET
  points = EXCLUDED.points,
  multiplier = EXCLUDED.multiplier,
  description = EXCLUDED.description,
  max_daily = EXCLUDED.max_daily,
  notes = EXCLUDED.notes,
  updated_at = NOW();
ALTER TABLE action_types ADD COLUMN IF NOT EXISTS scoring_rule_key TEXT;
UPDATE action_types SET scoring_rule_key = 'action_dever' WHERE name ILIKE '%dever%';
UPDATE action_types SET scoring_rule_key = 'action_conflito' WHERE name ILIKE '%conflito%';
UPDATE action_types SET scoring_rule_key = 'action_inclusao' WHERE name ILIKE '%exclu%';
UPDATE action_types SET scoring_rule_key = 'action_silencio' WHERE name ILIKE '%sil_ncio%' OR name ILIKE '%silencio%';
UPDATE action_types SET scoring_rule_key = 'action_ensinar' WHERE name ILIKE '%ensinei%';
UPDATE action_types SET scoring_rule_key = 'action_material' WHERE name ILIKE '%material%' AND name NOT ILIKE '%compartilhei%';
UPDATE action_types SET scoring_rule_key = 'action_bullying' WHERE name ILIKE '%bullying%';
UPDATE action_types SET scoring_rule_key = 'action_atividade' WHERE name ILIKE '%atividade coletiva%';
UPDATE action_types SET scoring_rule_key = 'action_outra' WHERE name ILIKE '%outra%';
UPDATE action_types SET scoring_rule_key = 'action_monitor' WHERE name ILIKE '%monitor%';
UPDATE action_types SET scoring_rule_key = 'action_acolher' WHERE name ILIKE '%acolhi%';
UPDATE action_types SET scoring_rule_key = 'action_projeto' WHERE name ILIKE '%projeto%';
UPDATE action_types SET scoring_rule_key = 'action_professor' WHERE name ILIKE '%professor%';
UPDATE action_types SET scoring_rule_key = 'action_compartilhei' WHERE name ILIKE '%compartilhei%';
UPDATE action_types SET scoring_rule_key = 'action_representar' WHERE name ILIKE '%representei%';
UPDATE action_types SET scoring_rule_key = 'action_resgatar' WHERE name ILIKE '%resgatei%';
UPDATE action_types SET scoring_rule_key = 'action_proativo' WHERE name ILIKE '%proativ%';
UPDATE action_types SET scoring_rule_key = 'action_limpeza' WHERE name ILIKE '%limp%';
UPDATE action_types SET points = sr.points FROM scoring_rules sr WHERE action_types.scoring_rule_key = sr.rule_key;
