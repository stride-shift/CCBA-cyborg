-- Migration: Create challenge_sets and prepare schema
-- This is step 1 of the database simplification refactor

-- Create challenge_sets table
CREATE TABLE IF NOT EXISTS challenge_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert the 3 initial challenge sets
INSERT INTO challenge_sets (name, description) VALUES
  ('Standard', 'Default challenge set for general audiences'),
  ('Sales', 'Tailored challenge set for sales professionals'),
  ('Executive', 'Tailored challenge set for executive leadership')
ON CONFLICT (name) DO NOTHING;

-- Add challenge_set_id to challenges table (nullable for now during migration)
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS challenge_set_id UUID REFERENCES challenge_sets(id);

-- Add video URLs to challenges table (merging from customized_challenges)
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS video_url_1 TEXT,
  ADD COLUMN IF NOT EXISTS video_url_2 TEXT;

-- Add challenge_set_id to cohorts table (nullable for now)
ALTER TABLE cohorts
  ADD COLUMN IF NOT EXISTS challenge_set_id UUID REFERENCES challenge_sets(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_challenges_challenge_set_id ON challenges(challenge_set_id);
CREATE INDEX IF NOT EXISTS idx_challenges_set_order ON challenges(challenge_set_id, order_index);
CREATE INDEX IF NOT EXISTS idx_cohorts_challenge_set_id ON cohorts(challenge_set_id);

-- Add RLS policy for challenge_sets (admins can manage, everyone can view active)
ALTER TABLE challenge_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active challenge sets" ON challenge_sets;
CREATE POLICY "Anyone can view active challenge sets"
  ON challenge_sets FOR SELECT
  TO public
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage challenge sets" ON challenge_sets;
CREATE POLICY "Admins can manage challenge sets"
  ON challenge_sets FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );
