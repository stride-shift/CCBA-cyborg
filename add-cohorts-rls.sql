-- Add RLS to existing cohorts table and build up features
-- Run this after the minimal cohorts table is created

-- Step 1: Enable RLS on cohorts table
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies first (just in case)
DROP POLICY IF EXISTS "Authenticated users can view cohorts" ON cohorts;
DROP POLICY IF EXISTS "Admins can manage cohorts" ON cohorts;

-- Step 3: Create RLS policies
CREATE POLICY "Authenticated users can view cohorts" ON cohorts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage cohorts" ON cohorts
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE role IN ('admin', 'super_admin')
        )
    );

-- Step 4: Fix user_profiles.cohort_id relationship
-- Clear existing cohort_id values
UPDATE user_profiles SET cohort_id = NULL WHERE cohort_id IS NOT NULL;

-- Change cohort_id to UUID type if it's not already
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'cohort_id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE user_profiles ALTER COLUMN cohort_id TYPE UUID USING NULL;
    END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_cohort_id_fkey;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_cohort_id_fkey 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Step 5: Create basic view
CREATE VIEW cohort_stats AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.start_date,
    c.end_date,
    c.status,
    c.is_active,
    COUNT(up.user_id) as current_participants,
    c.created_at
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.description, c.start_date, c.end_date, c.status, c.is_active, c.created_at;

-- Step 6: Test RLS and relationships
SELECT 'RLS enabled and relationships created!' as status;

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'cohorts';

-- Check policies
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename = 'cohorts';

-- Test cohort_stats view
SELECT * FROM cohort_stats; 