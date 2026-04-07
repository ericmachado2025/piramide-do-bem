INSERT INTO action_types (name, points, icon, description, display_order)
VALUES ('Outra boa ação', 10, '✨', 'Descreva uma boa ação personalizada', 99)
ON CONFLICT DO NOTHING;
