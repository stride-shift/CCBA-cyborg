-- Diagnose and fix admin access issues
-- Run this in your Supabase SQL editor

-- STEP 1: Check current user and their role
SELECT 
    'Current user info:' as check_type,
    auth.uid() as current_user_id,
    up.first_name,
    up.last_name, 
    up.role,
    up.user_id
FROM user_profiles up 
WHERE up.user_id = auth.uid();

-- STEP 2: Check all admin users
SELECT 
    'All admin users:' as check_type,
    au.email,
    up.first_name,
    up.last_name,
    up.role,
    up.user_id
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE up.role IN ('admin', 'super_admin')
ORDER BY up.role DESC;

-- STEP 3: If your current user is not admin, make them admin
-- UNCOMMENT the line below and replace YOUR_EMAIL with your actual email
-- UPDATE user_profiles SET role = 'super_admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com');

-- STEP 4: Clean up existing policies (safe to run multiple times)
DO $$ 
DECLARE 
    policy_record RECORD;
BEGIN
    -- Drop all policies on target tables
    FOR policy_record IN 
        SELECT policyname, tablename
        FROM pg_policies 
        WHERE tablename IN ('user_journey_analytics', 'user_challenge_completions', 'user_reflections', 'user_day_completions', 'user_video_interactions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, policy_record.tablename);
    END LOOP;
END $$;

-- STEP 5: Create simple admin-friendly policies
CREATE POLICY "admin_and_self_access" ON user_journey_analytics
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "admin_and_self_access" ON user_challenge_completions
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "admin_and_self_access" ON user_reflections
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "admin_and_self_access" ON user_day_completions
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "admin_and_self_access" ON user_video_interactions
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- STEP 6: Test admin access again
SELECT 
    'Admin access test:' as test,
    auth.uid() as your_user_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        ) 
        THEN 'ADMIN ACCESS GRANTED ✓' 
        ELSE 'ADMIN ACCESS DENIED ✗ - You need admin role'
    END as result;

-- STEP 7: Test if you can access the specific user data that was failing
SELECT 
    'Test access to user 3e035343-a1de-4efe-8c2d-3b6c57f4e679:' as test,
    CASE 
        WHEN auth.uid() = '3e035343-a1de-4efe-8c2d-3b6c57f4e679'::uuid OR
             EXISTS (
                 SELECT 1 FROM user_profiles 
                 WHERE user_profiles.user_id = auth.uid() 
                 AND user_profiles.role IN ('admin', 'super_admin')
             )
        THEN 'ACCESS GRANTED ✓'
        ELSE 'ACCESS DENIED ✗'
    END as result;

-- STEP 8: Show final policy status
SELECT 
    'Final policy status:' as status,
    tablename, 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename IN (
    'user_journey_analytics', 
    'user_challenge_completions', 
    'user_reflections', 
    'user_day_completions', 
    'user_video_interactions'
)
ORDER BY tablename; 