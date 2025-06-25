-- Comprehensive RLS cleanup and fix for admin access
-- Run this in your Supabase SQL editor

-- STEP 1: Drop ALL existing policies that might conflict
-- User Journey Analytics
DROP POLICY IF EXISTS "Users can view own analytics or admins can view all" ON user_journey_analytics;
DROP POLICY IF EXISTS "Users can insert own analytics or admins can insert any" ON user_journey_analytics;
DROP POLICY IF EXISTS "Users can update own analytics or admins can update any" ON user_journey_analytics;
DROP POLICY IF EXISTS "users_can_select_own_analytics" ON user_journey_analytics;
DROP POLICY IF EXISTS "users_can_insert_own_analytics" ON user_journey_analytics;
DROP POLICY IF EXISTS "users_can_update_own_analytics" ON user_journey_analytics;
DROP POLICY IF EXISTS "allow_trigger_updates" ON user_journey_analytics;
DROP POLICY IF EXISTS "Authenticated users can view their analytics" ON user_journey_analytics;
DROP POLICY IF EXISTS "Authenticated users can insert their analytics" ON user_journey_analytics;

-- User Challenge Completions
DROP POLICY IF EXISTS "Users can manage own challenges or admins can manage all" ON user_challenge_completions;
DROP POLICY IF EXISTS "allow_authenticated_all" ON user_challenge_completions;
DROP POLICY IF EXISTS "Authenticated users can manage their challenge completions" ON user_challenge_completions;

-- User Reflections
DROP POLICY IF EXISTS "Users can manage own reflections or admins can manage all" ON user_reflections;
DROP POLICY IF EXISTS "allow_authenticated_all" ON user_reflections;
DROP POLICY IF EXISTS "Authenticated users can manage their reflections" ON user_reflections;

-- User Day Completions
DROP POLICY IF EXISTS "Users can manage own day completions or admins can manage all" ON user_day_completions;
DROP POLICY IF EXISTS "allow_authenticated_all" ON user_day_completions;
DROP POLICY IF EXISTS "Authenticated users can manage their day completions" ON user_day_completions;

-- User Video Interactions
DROP POLICY IF EXISTS "Users can manage own video interactions or admins can manage all" ON user_video_interactions;
DROP POLICY IF EXISTS "allow_authenticated_all" ON user_video_interactions;
DROP POLICY IF EXISTS "Authenticated users can manage their video interactions" ON user_video_interactions;

-- STEP 2: Create clean, simple policies that work

-- User Journey Analytics - Allow users to see own data OR admins to see all data
CREATE POLICY "admin_and_self_access" ON user_journey_analytics
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- User Challenge Completions - Allow users to manage own data OR admins to manage all data
CREATE POLICY "admin_and_self_access" ON user_challenge_completions
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- User Reflections - Allow users to manage own data OR admins to manage all data
CREATE POLICY "admin_and_self_access" ON user_reflections
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- User Day Completions - Allow users to manage own data OR admins to manage all data
CREATE POLICY "admin_and_self_access" ON user_day_completions
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- User Video Interactions - Allow users to manage own data OR admins to manage all data
CREATE POLICY "admin_and_self_access" ON user_video_interactions
    FOR ALL TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
    );

-- STEP 3: Verify the new policies
SELECT 
    'After cleanup:' as status,
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
ORDER BY tablename, policyname;

-- STEP 4: Test the policy for your specific case
-- Replace 'your-admin-user-id' with your actual admin user UUID
SELECT 
    'Policy test for user_journey_analytics:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        ) 
        THEN 'ADMIN ACCESS GRANTED' 
        ELSE 'ADMIN ACCESS DENIED'
    END as result; 