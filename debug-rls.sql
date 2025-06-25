-- Debug and fix RLS policies
-- Run this step by step in your Supabase SQL editor

-- STEP 1: Check what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_challenge_completions', 'user_reflections', 'user_day_completions', 'user_video_interactions', 'user_journey_analytics')
ORDER BY tablename, policyname;

-- STEP 2: Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('user_challenge_completions', 'user_reflections', 'user_day_completions', 'user_video_interactions', 'user_journey_analytics');

-- STEP 3: Drop ALL existing policies (run this after checking step 1)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('user_challenge_completions', 'user_reflections', 'user_day_completions', 'user_video_interactions', 'user_journey_analytics')) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- STEP 4: Create simple, working policies
CREATE POLICY "allow_authenticated_all" ON user_challenge_completions
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_all" ON user_reflections
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_all" ON user_day_completions
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_all" ON user_video_interactions
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_select" ON user_journey_analytics
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_insert" ON user_journey_analytics
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- STEP 5: Test if a user can insert (replace with your actual user ID)
-- First, check what your user ID is:
SELECT auth.uid() as current_user_id;

-- STEP 6: Verify policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_challenge_completions', 'user_reflections', 'user_day_completions', 'user_video_interactions', 'user_journey_analytics')
ORDER BY tablename, policyname; 