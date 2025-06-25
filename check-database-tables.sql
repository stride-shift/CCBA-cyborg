-- Check what tables actually exist in the database
-- Run this to see the real database structure

-- Step 1: List all tables in the public schema
SELECT 'All tables in public schema:' as info;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Step 2: Check cohorts table structure and data
SELECT 'Cohorts table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cohorts' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Sample cohorts data:' as info;
SELECT * FROM cohorts LIMIT 5;

-- Step 3: Check user_profiles table structure and data
SELECT 'User_profiles table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Sample user_profiles data:' as info;
SELECT * FROM user_profiles LIMIT 5;

-- Step 4: Check what user tracking tables exist
SELECT 'User tracking tables:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%user_%'
ORDER BY table_name;

-- Step 5: Check if user progress tables exist and have data
SELECT 'User challenge completions:' as info;
SELECT COUNT(*) as count FROM user_challenge_completions;
SELECT * FROM user_challenge_completions LIMIT 3;

SELECT 'User reflections:' as info;
SELECT COUNT(*) as count FROM user_reflections;  
SELECT * FROM user_reflections LIMIT 3;

SELECT 'User day completions:' as info;
SELECT COUNT(*) as count FROM user_day_completions;
SELECT * FROM user_day_completions LIMIT 3;

-- Step 6: Check auth.users table
SELECT 'Auth users count:' as info;
SELECT COUNT(*) as count FROM auth.users; 