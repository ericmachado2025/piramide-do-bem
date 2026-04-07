-- RPC function: escolas com alunos
CREATE OR REPLACE FUNCTION get_schools_with_students()
RETURNS TABLE(id UUID, name TEXT, city TEXT, state CHAR(2), latitude DECIMAL(10,7), longitude DECIMAL(10,7), student_count BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT s.id, s.name, s.city, s.state, s.latitude, s.longitude, COUNT(st.id) as student_count
  FROM schools s
  INNER JOIN students st ON st.school_id = s.id
  GROUP BY s.id, s.name, s.city, s.state, s.latitude, s.longitude
  ORDER BY student_count DESC;
$$;

-- RPC function: estatísticas públicas
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS TABLE(total_students BIGINT, total_actions BIGINT, total_active_schools BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT
    (SELECT COUNT(*) FROM students) as total_students,
    (SELECT COUNT(*) FROM actions WHERE status = 'validated') as total_actions,
    (SELECT COUNT(DISTINCT school_id) FROM students WHERE school_id IS NOT NULL) as total_active_schools;
$$;

-- RPC function: top escolas
CREATE OR REPLACE FUNCTION get_top_schools(lim INT DEFAULT 10)
RETURNS TABLE(school_id UUID, school_name TEXT, city TEXT, state CHAR(2), student_count BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT s.id as school_id, s.name as school_name, s.city, s.state, COUNT(st.id) as student_count
  FROM schools s
  INNER JOIN students st ON st.school_id = s.id
  GROUP BY s.id, s.name, s.city, s.state
  ORDER BY student_count DESC
  LIMIT lim;
$$;

-- RPC function: top tribos
CREATE OR REPLACE FUNCTION get_top_tribes(lim INT DEFAULT 3)
RETURNS TABLE(tribe_id UUID, tribe_name TEXT, color_hex TEXT, student_count BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT t.id as tribe_id, t.name as tribe_name, t.color_hex, COUNT(st.id) as student_count
  FROM tribes t
  INNER JOIN students st ON st.tribe_id = t.id
  GROUP BY t.id, t.name, t.color_hex
  ORDER BY student_count DESC
  LIMIT lim;
$$;
