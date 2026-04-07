-- ============================================
-- SEED: Action Types, Badges, Rewards
-- ============================================

-- Tipos de ação (conforme prompt)
INSERT INTO action_types (name, points, icon, description, display_order) VALUES
  ('Ajudei colega no dever', 10, '📚', 'Ajudar um colega com tarefas escolares', 1),
  ('Mediei um conflito', 25, '⚖️', 'Ajudar a resolver desentendimentos', 2),
  ('Incluí colega excluído', 20, '🤝', 'Incluir colega que estava sendo excluído', 3),
  ('Fiz silêncio pra alguém estudar', 5, '🤫', 'Respeitar o momento de estudo do colega', 4),
  ('Ensinei algo que sei', 15, '🎓', 'Ensinar algo que domina a um colega', 5),
  ('Ajudei com material', 8, '✏️', 'Emprestar ou compartilhar material escolar', 6),
  ('Defendi colega do bullying', 30, '🛡️', 'Defender colega de situação de bullying', 7),
  ('Organizei algo coletivo', 20, '🗂️', 'Organizar atividade coletiva para a turma', 8);

-- Badges
INSERT INTO badges (name, description, icon, condition_type, condition_value) VALUES
  ('Primeira Ação', 'Primeira boa ação validada', '🌟', 'actions_count', 1),
  ('Semana Perfeita', 'Ação todos os dias da semana', '🔥', 'consecutive_days', 5),
  ('Centenário', '100 pontos acumulados', '💯', 'total_points', 100),
  ('Acolhedor', '3 ações de inclusão', '🤝', 'action_type_count', 3),
  ('Monitor', '5 sessões de ensino', '📚', 'action_type_count', 5),
  ('Relâmpago', '5 ações em um único dia', '⚡', 'actions_same_day', 5),
  ('Top 10%', 'QualiScore >= 90', '🏆', 'qualiscore', 90),
  ('Top 5%', 'QualiScore >= 95', '👑', 'qualiscore', 95);

-- Recompensas escolares
INSERT INTO rewards (name, description, points_cost, category, active) VALUES
  ('Prioridade na biblioteca', 'Acesso prioritário por 1 semana', 50, 'school', true),
  ('Escolher atividade da aula', 'Escolha a atividade da próxima aula', 100, 'school', true),
  ('Escolher lugar na sala', 'Escolha seu lugar por 1 semana', 80, 'school', true),
  ('Destaque no mural', 'Foto e nome no mural da escola', 150, 'school', true),
  ('Certificado de Bom Cidadão', 'Certificado oficial da escola', 200, 'school', true);
