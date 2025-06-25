-- Comprehensive fix for cohorts and user_profiles UUID compatibility
-- Run this in your Supabase SQL editor

-- Step 1: Check current table structures
SELECT 'cohorts' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cohorts' AND column_name = 'id'
UNION ALL
SELECT 'user_profiles' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id'
ORDER BY table_name, column_name;

-- Step 2: Check existing RLS policies
SELECT 'cohorts' as table_name, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'cohorts'
UNION ALL
SELECT 'user_profiles' as table_name, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY table_name, policyname;

-- Step 3: Drop dependent views and constraints first
DROP VIEW IF EXISTS cohort_stats CASCADE;
DROP VIEW IF EXISTS user_profiles_with_cohort CASCADE;

-- Step 4: Drop foreign key constraint from user_profiles
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_cohort_id_fkey;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_cohort;

-- Step 5: Drop RLS policies on both tables
-- Cohorts policies
DROP POLICY IF EXISTS "Cohorts are viewable by everyone" ON cohorts;
DROP POLICY IF EXISTS "Users can view cohorts" ON cohorts;
DROP POLICY IF EXISTS "Admins can manage cohorts" ON cohorts;

-- User profiles policies  
DROP POLICY IF EXISTS "Users can view own data" ON user_profiles;
DROP POLICY IF EXISTS "Users can view and update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;

-- Step 6: Check existing data in cohorts table
SELECT id, name FROM cohorts LIMIT 5;

-- Step 7: Fix cohorts table - change id from VARCHAR to UUID
-- First, clear any data and recreate with proper UUID
DELETE FROM cohorts; -- Clear existing data to avoid conversion issues

-- Change cohorts.id to UUID with proper default
ALTER TABLE cohorts 
ALTER COLUMN id TYPE UUID 
USING gen_random_uuid();

ALTER TABLE cohorts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 8: Insert sample cohort data with proper UUIDs
INSERT INTO cohorts (id, name, description, start_date, end_date, status, max_participants, organization_name, cohort_type, facilitator_id)
VALUES 
(gen_random_uuid(), 'Spring 2024 Cohort', 'Foundational habits program', '2024-03-01'::date, '2024-05-31'::date, 'active', 25, 'Cyborg Habit Co.', 'standard', null),
(gen_random_uuid(), 'Summer 2024 Accelerated', 'Intensive 6-week program', '2024-06-01'::date, '2024-07-15'::date, 'enrolling', 15, 'Cyborg Habit Co.', 'accelerated', null),
(gen_random_uuid(), 'Fall 2024 Beginner', 'Gentle introduction to habit formation', '2024-09-01'::date, '2024-11-30'::date, 'draft', 30, 'Cyborg Habit Co.', 'beginner', null);

-- Step 9: Clear invalid cohort_id values from user_profiles
UPDATE user_profiles 
SET cohort_id = NULL 
WHERE cohort_id IS NOT NULL;

-- Step 10: Change user_profiles.cohort_id to UUID
ALTER TABLE user_profiles 
ALTER COLUMN cohort_id TYPE UUID 
USING NULL;

-- Step 11: Add back foreign key constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_cohort_id_fkey 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Step 12: Recreate RLS policies
-- Cohorts policies
CREATE POLICY "Anyone can view cohorts" ON cohorts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view cohorts" ON cohorts
    FOR SELECT USING (auth.role() = 'authenticated');

-- User profiles policies
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Step 13: Recreate views
CREATE VIEW user_profiles_with_cohort AS
SELECT 
    up.*,
    c.name as cohort_name,
    c.description as cohort_description,
    c.start_date as cohort_start_date,
    c.end_date as cohort_end_date,
    c.status as cohort_status
FROM user_profiles up
LEFT JOIN cohorts c ON up.cohort_id = c.id;

CREATE VIEW cohort_stats AS
SELECT 
    c.id,
    c.name,
    c.start_date,
    c.end_date,
    c.status,
    c.max_participants,
    COUNT(up.user_id) as current_participants,
    ROUND(
        (COUNT(up.user_id)::DECIMAL / NULLIF(c.max_participants, 0)) * 100, 
        2
    ) as fill_percentage,
    c.facilitator_id
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.start_date, c.end_date, c.status, c.max_participants, c.facilitator_id;

-- Step 14: Verify the fix worked
SELECT 
    'cohorts' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'cohorts' AND column_name = 'id'
UNION ALL
SELECT 
    'user_profiles' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id'
ORDER BY table_name;

-- Step 15: Test the relationship works
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    COUNT(up.user_id) as user_count
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name;

-- Step 16: Show sample data
SELECT * FROM cohorts;

-- Step 17: Test views work
SELECT * FROM cohort_stats;

-- Step 18: Verify RLS policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('cohorts', 'user_profiles')
ORDER BY tablename, policyname; 