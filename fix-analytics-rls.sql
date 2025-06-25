-- Fix RLS policy for user_journey_analytics to work with database triggers
-- Run this in your Supabase SQL editor

-- STEP 1: Drop existing policies on user_journey_analytics
DROP POLICY IF EXISTS "allow_authenticated_select" ON user_journey_analytics;
DROP POLICY IF EXISTS "allow_authenticated_insert" ON user_journey_analytics;
DROP POLICY IF EXISTS "Authenticated users can view their analytics" ON user_journey_analytics;
DROP POLICY IF EXISTS "Authenticated users can insert their analytics" ON user_journey_analytics;

-- STEP 2: Create new policies that work with triggers
-- Allow authenticated users to select their own analytics
CREATE POLICY "users_can_select_own_analytics" ON user_journey_analytics
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow authenticated users to insert their own analytics
CREATE POLICY "users_can_insert_own_analytics" ON user_journey_analytics
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to update their own analytics
CREATE POLICY "users_can_update_own_analytics" ON user_journey_analytics
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- IMPORTANT: Allow the trigger functions to bypass RLS
-- This is needed because triggers run with different permissions
ALTER TABLE user_journey_analytics FORCE ROW LEVEL SECURITY;

-- Create a policy that allows the trigger functions to work
-- This allows the database functions to update analytics regardless of auth context
CREATE POLICY "allow_trigger_updates" ON user_journey_analytics
    FOR ALL TO postgres WITH CHECK (true);

-- Alternative approach: Disable RLS for this table since it's managed by triggers
-- Uncomment the next line if the above doesn't work:
-- ALTER TABLE user_journey_analytics DISABLE ROW LEVEL SECURITY;

-- STEP 3: Update the trigger function to use SECURITY DEFINER
-- This makes the function run with the permissions of the function owner (postgres)
CREATE OR REPLACE FUNCTION update_user_analytics(target_user_id UUID)
RETURNS void AS $$
DECLARE
    days_completed INTEGER;
    challenges_completed INTEGER;
    reflections_submitted INTEGER;
    total_active_challenges INTEGER;
    completion_percentage DECIMAL(5,2);
BEGIN
    -- Count completed days (both challenges + reflection)
    SELECT COUNT(*) INTO days_completed
    FROM user_day_completions
    WHERE user_id = target_user_id 
        AND both_challenges_completed = true 
        AND reflection_submitted = true;

    -- Count total challenge completions
    SELECT COUNT(*) INTO challenges_completed
    FROM user_challenge_completions
    WHERE user_id = target_user_id;

    -- Count total reflections submitted
    SELECT COUNT(*) INTO reflections_submitted
    FROM user_reflections
    WHERE user_id = target_user_id;

    -- Get total active challenges for percentage calculation
    SELECT COUNT(*) INTO total_active_challenges
    FROM challenges
    WHERE is_active = true;

    -- Calculate completion percentage
    IF total_active_challenges > 0 THEN
        completion_percentage := (days_completed::DECIMAL / total_active_challenges) * 100;
    ELSE
        completion_percentage := 0;
    END IF;

    -- Upsert the analytics record
    INSERT INTO user_journey_analytics (
        user_id,
        total_days_completed,
        total_challenges_completed,
        total_reflections_submitted,
        journey_completion_percentage,
        last_activity_at,
        updated_at
    ) VALUES (
        target_user_id,
        days_completed,
        challenges_completed,
        reflections_submitted,
        completion_percentage,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_days_completed = EXCLUDED.total_days_completed,
        total_challenges_completed = EXCLUDED.total_challenges_completed,
        total_reflections_submitted = EXCLUDED.total_reflections_submitted,
        journey_completion_percentage = EXCLUDED.journey_completion_percentage,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = NOW();

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 4: Update trigger functions to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION trigger_update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the affected user
    PERFORM update_user_analytics(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION trigger_update_user_analytics_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the affected user (using OLD for deletes)
    PERFORM update_user_analytics(OLD.user_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_journey_analytics'
ORDER BY policyname; 