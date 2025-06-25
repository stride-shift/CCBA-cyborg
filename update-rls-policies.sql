-- Update RLS policies to work with authenticated users
-- Run this in your Supabase SQL editor

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can manage own challenge completions" ON user_challenge_completions;
DROP POLICY IF EXISTS "Users can manage own reflections" ON user_reflections;
DROP POLICY IF EXISTS "Users can manage own day completions" ON user_day_completions;
DROP POLICY IF EXISTS "Users can manage own video interactions" ON user_video_interactions;
DROP POLICY IF EXISTS "Users can view own analytics" ON user_journey_analytics;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can manage their challenge completions" ON user_challenge_completions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage their reflections" ON user_reflections
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage their day completions" ON user_day_completions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can manage their video interactions" ON user_video_interactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view their analytics" ON user_journey_analytics
    FOR SELECT USING (auth.uid() = user_id);

-- Also allow authenticated users to insert their own analytics
CREATE POLICY "Authenticated users can insert their analytics" ON user_journey_analytics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_challenge_completions', 'user_reflections', 'user_day_completions', 'user_video_interactions', 'user_journey_analytics'); 