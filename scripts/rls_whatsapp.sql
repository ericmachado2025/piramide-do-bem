-- RLS policies for students
DROP POLICY IF EXISTS "students_select_own" ON students;
CREATE POLICY "students_select_own" ON students FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "students_update_own" ON students;
CREATE POLICY "students_update_own" ON students FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "students_insert_own" ON students;
CREATE POLICY "students_insert_own" ON students FOR INSERT WITH CHECK (auth.uid() = user_id);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
-- WhatsApp columns
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_visibility TEXT DEFAULT 'private' CHECK (whatsapp_visibility IN ('none','private','friends','public'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS whatsapp_country_code TEXT DEFAULT '+55';
