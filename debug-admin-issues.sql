-- Debug Admin Issues - Check database state
-- Run this in your Supabase SQL editor

-- Step 1: Check if user_profiles table exists and its structure
SELECT 'User Profiles Table Structure' as check_type;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Step 2: Check if user_profiles_with_cohort view exists
SELECT 'Views Check' as check_type;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_name IN ('user_profiles_with_cohort', 'cohort_stats');

-- Step 3: Check current users and their roles
SELECT 'Current Users and Roles' as check_type;
SELECT 
    auth.users.id,
    auth.users.email,
    auth.users.created_at as user_created,
    user_profiles.role,
    user_profiles.first_name,
    user_profiles.last_name,
    user_profiles.created_at as profile_created
FROM auth.users
LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
ORDER BY auth.users.created_at DESC;

-- Step 4: Check RLS status
SELECT 'RLS Status' as check_type;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'cohorts');

-- Step 5: Check RLS policies
SELECT 'RLS Policies' as check_type;
SELECT tablename, policyname, cmd, permissive, roles, qual
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'cohorts')
ORDER BY tablename, policyname;

-- Step 6: Test user_profiles_with_cohort view (if it exists)
SELECT 'Testing Views' as check_type;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles_with_cohort'
    ) THEN
        RAISE NOTICE 'user_profiles_with_cohort view exists, testing...';
    ELSE
        RAISE NOTICE 'user_profiles_with_cohort view MISSING!';
    END IF;
END $$;

-- Step 7: Check if there are users without profiles
SELECT 'Users Without Profiles' as check_type;
SELECT 
    auth.users.id,
    auth.users.email,
    'MISSING PROFILE' as issue
FROM auth.users
LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
WHERE user_profiles.user_id IS NULL;

-- Step 8: Fix missing user_profiles_with_cohort view if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles_with_cohort'
    ) THEN
        -- Recreate the view
        EXECUTE 'CREATE VIEW user_profiles_with_cohort AS
        SELECT 
            up.*,
            c.name as cohort_name,
            c.description as cohort_description,
            c.start_date as cohort_start_date,
            c.end_date as cohort_end_date,
            c.status as cohort_status,
            c.cohort_type,
            c.organization_name as cohort_organization_name,
            c.is_active as cohort_is_active,
            c.enrollment_start_date,
            c.enrollment_end_date,
            c.max_participants as cohort_max_participants
        FROM user_profiles up
        LEFT JOIN cohorts c ON up.cohort_id = c.id';
        
        RAISE NOTICE 'Created missing user_profiles_with_cohort view';
    ELSE
        RAISE NOTICE 'user_profiles_with_cohort view already exists';
    END IF;
END $$;

-- Step 9: Ensure RLS policy exists for user_profiles
DO $$
BEGIN
    -- Drop and recreate user_profiles policy to be sure
    DROP POLICY IF EXISTS "Users can view and update own profile" ON user_profiles;
    
    CREATE POLICY "Users can view and update own profile" ON user_profiles
        FOR ALL USING (auth.uid() = user_id);
        
    RAISE NOTICE 'Recreated user_profiles RLS policy';
END $$;

-- Step 10: Create missing user profiles for any users without them
INSERT INTO user_profiles (user_id, role, first_name, last_name)
SELECT 
    auth.users.id,
    'user',
    COALESCE(auth.users.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(auth.users.raw_user_meta_data->>'last_name', '')
FROM auth.users
LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
WHERE user_profiles.user_id IS NULL;

-- Step 11: Final verification
SELECT 'Final Verification' as check_type;
SELECT 
    auth.users.email,
    user_profiles.role,
    CASE 
        WHEN user_profiles.role IN ('admin', 'super_admin') THEN 'HAS ADMIN ACCESS'
        ELSE 'Regular User'
    END as access_level
FROM auth.users
JOIN user_profiles ON auth.users.id = user_profiles.user_id
ORDER BY user_profiles.role DESC, auth.users.created_at; 