-- Comprehensive fix for cohorts and user_profiles UUID compatibility (v2)
-- Run this in your Supabase SQL editor

-- Step 1: Check current table structures
SELECT 'cohorts' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cohorts'
ORDER BY ordinal_position;

SELECT 'user_profiles' as table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id';

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
SELECT * FROM cohorts LIMIT 5;

-- Step 7: Fix cohorts table - change id from VARCHAR to UUID
-- First, clear any data and recreate with proper UUID
DELETE FROM cohorts; -- Clear existing data to avoid conversion issues

-- Change cohorts.id to UUID with proper default
ALTER TABLE cohorts 
ALTER COLUMN id TYPE UUID 
USING gen_random_uuid();

ALTER TABLE cohorts 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 8: Insert sample cohort data using only basic columns that should exist
-- Using a more conservative approach with just essential columns
INSERT INTO cohorts (id, name, description, start_date, end_date)
VALUES 
(gen_random_uuid(), 'Spring 2024 Cohort', 'Foundational habits program', '2024-03-01'::date, '2024-05-31'::date),
(gen_random_uuid(), 'Summer 2024 Accelerated', 'Intensive 6-week program', '2024-06-01'::date, '2024-07-15'::date),
(gen_random_uuid(), 'Fall 2024 Beginner', 'Gentle introduction to habit formation', '2024-09-01'::date, '2024-11-30'::date);

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

-- User profiles policies
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Step 13: Recreate views with available columns
CREATE VIEW user_profiles_with_cohort AS
SELECT 
    up.*,
    c.name as cohort_name,
    c.description as cohort_description,
    c.start_date as cohort_start_date,
    c.end_date as cohort_end_date
FROM user_profiles up
LEFT JOIN cohorts c ON up.cohort_id = c.id;

CREATE VIEW cohort_stats AS
SELECT 
    c.id,
    c.name,
    c.start_date,
    c.end_date,
    COUNT(up.user_id) as current_participants
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.start_date, c.end_date;

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

-- Step 19: Show all cohorts columns for reference
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'cohorts'
ORDER BY ordinal_position; 