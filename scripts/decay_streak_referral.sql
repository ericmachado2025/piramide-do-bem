-- P4: Monthly decay function
CREATE OR REPLACE FUNCTION apply_monthly_decay() RETURNS void AS $$
DECLARE
  decay_pct INT;
BEGIN
  SELECT ABS(points) INTO decay_pct FROM scoring_rules WHERE rule_key = 'decay_monthly' AND active = true;
  IF decay_pct IS NULL THEN decay_pct := 10; END IF;
  UPDATE students
  SET total_points = GREATEST(0, FLOOR(total_points * (1.0 - decay_pct / 100.0))),
      available_points = GREATEST(0, FLOOR(available_points * (1.0 - decay_pct / 100.0)))
  WHERE last_action_date < NOW() - INTERVAL '30 days'
    AND total_points > 0;
END;
$$ LANGUAGE plpgsql;
-- P5: Streak calculation function
CREATE OR REPLACE FUNCTION calc_streak(p_student_id UUID) RETURNS INT AS $$
DECLARE
  streak INT := 0;
  check_date DATE := CURRENT_DATE;
  found BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM actions
      WHERE author_id = p_student_id
        AND status = 'validated'
        AND DATE(created_at) = check_date
    ) INTO found;
    IF NOT found AND check_date < CURRENT_DATE THEN EXIT; END IF;
    IF found THEN streak := streak + 1; END IF;
    check_date := check_date - 1;
    IF streak = 0 AND NOT found THEN EXIT; END IF;
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql;
-- P6: Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES students(id),
  referred_id UUID REFERENCES students(id),
  referral_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'credited')),
  points_awarded INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_select_own" ON referrals;
CREATE POLICY "referrals_select_own" ON referrals FOR SELECT USING (auth.uid() IN (SELECT user_id FROM students WHERE id = referrer_id OR id = referred_id));
DROP POLICY IF EXISTS "referrals_insert" ON referrals;
CREATE POLICY "referrals_insert" ON referrals FOR INSERT WITH CHECK (true);
-- Add referral_code to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES students(id);
