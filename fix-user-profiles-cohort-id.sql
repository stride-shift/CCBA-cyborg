-- Fix User Profiles cohort_id type mismatch
-- Run this in your Supabase SQL editor

-- Step 1: Check current user_profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id'
ORDER BY ordinal_position;

-- Step 2: Check if there are any user_profiles with cohort_id values
SELECT cohort_id, COUNT(*) 
FROM user_profiles 
WHERE cohort_id IS NOT NULL 
GROUP BY cohort_id;

-- Step 3: Drop the view that's causing issues (we'll recreate it)
DROP VIEW IF EXISTS cohort_stats;
DROP VIEW IF EXISTS user_profiles_with_cohort;

-- Step 4: Update user_profiles.cohort_id to be UUID type
-- First, clear any invalid cohort_id values
UPDATE user_profiles 
SET cohort_id = NULL 
WHERE cohort_id IS NOT NULL 
AND cohort_id NOT IN (
    SELECT id::text FROM cohorts
);

-- Step 5: Change the column type to UUID
ALTER TABLE user_profiles 
ALTER COLUMN cohort_id TYPE UUID 
USING cohort_id::UUID;

-- Step 6: Add foreign key constraint
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_cohort_id_fkey;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_cohort_id_fkey 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Step 7: Recreate the user_profiles_with_cohort view
CREATE VIEW user_profiles_with_cohort AS
SELECT 
    up.*,
    c.name as cohort_name,
    c.description as cohort_description,
    c.start_date as cohort_start_date,
    c.end_date as cohort_end_date,
    c.is_active as cohort_is_active
FROM user_profiles up
LEFT JOIN cohorts c ON up.cohort_id = c.id;

-- Step 8: Recreate the cohort_stats view
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
    c.facilitator_id,
    auth_users.email as facilitator_email
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
LEFT JOIN auth.users auth_users ON c.facilitator_id = auth_users.id
GROUP BY c.id, c.name, c.start_date, c.end_date, c.status, c.max_participants, c.facilitator_id, auth_users.email;

-- Step 9: Test the views work correctly
SELECT * FROM cohort_stats;

-- Step 10: Verify the fix worked
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id';

-- Step 11: Show successful join
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    c.name as cohort_name
FROM user_profiles up
LEFT JOIN cohorts c ON up.cohort_id = c.id
LIMIT 5; 