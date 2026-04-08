-- Fix dangerous RLS policies (allow_* with qual=true bypass auth)
DROP POLICY IF EXISTS "allow_update_students" ON students;
DROP POLICY IF EXISTS "allow_delete_students" ON students;
-- Remove IES duplicates - keep the one that has FK references, or if none, keep first
DELETE FROM schools WHERE school_type = 'superior' AND id IN (
  SELECT s.id FROM schools s
  WHERE school_type = 'superior'
  AND NOT EXISTS (SELECT 1 FROM classrooms c WHERE c.school_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM students st WHERE st.school_id = s.id)
  AND EXISTS (
    SELECT 1 FROM schools s2
    WHERE s2.id != s.id
    AND UPPER(s2.name) = UPPER(s.name)
    AND s2.city = s.city
    AND s2.state = s.state
  )
);
