-- Fix RLS policies to allow admins to view other users' data
-- Run this in your Supabase SQL editor

-- Drop existing restrictive policies that block admin access
DROP POLICY IF EXISTS "Authenticated users can view their analytics" ON user_journey_analytics;
DROP POLICY IF EXISTS "Authenticated users can insert their analytics" ON user_journey_analytics;
DROP POLICY IF EXISTS "Authenticated users can manage their challenge completions" ON user_challenge_completions;
DROP POLICY IF EXISTS "Authenticated users can manage their reflections" ON user_reflections;
DROP POLICY IF EXISTS "Authenticated users can manage their day completions" ON user_day_completions;
DROP POLICY IF EXISTS "Authenticated users can manage their video interactions" ON user_video_interactions;

-- Create new policies that allow both self-access and admin access

-- User Journey Analytics policies
CREATE POLICY "Users can view own analytics or admins can view all" ON user_journey_analytics
    FOR SELECT USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can insert own analytics or admins can insert any" ON user_journey_analytics
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Users can update own analytics or admins can update any" ON user_journey_analytics
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- User Challenge Completions policies
CREATE POLICY "Users can manage own challenges or admins can manage all" ON user_challenge_completions
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- User Reflections policies
CREATE POLICY "Users can manage own reflections or admins can manage all" ON user_reflections
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- User Day Completions policies
CREATE POLICY "Users can manage own day completions or admins can manage all" ON user_day_completions
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- User Video Interactions policies
CREATE POLICY "Users can manage own video interactions or admins can manage all" ON user_video_interactions
    FOR ALL USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Verify the policies are in place
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN (
    'user_journey_analytics', 
    'user_challenge_completions', 
    'user_reflections', 
    'user_day_completions', 
    'user_video_interactions'
)
ORDER BY tablename, policyname; 