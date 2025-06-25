-- Automated User Journey Analytics
-- This will automatically update analytics whenever underlying data changes

-- STEP 1: Create a function to calculate and update user analytics
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
$$ LANGUAGE plpgsql;

-- STEP 2: Create trigger function that calls the analytics update
CREATE OR REPLACE FUNCTION trigger_update_user_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the affected user
    PERFORM update_user_analytics(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_analytics_challenge_completion ON user_challenge_completions;
DROP TRIGGER IF EXISTS trigger_analytics_reflection ON user_reflections;
DROP TRIGGER IF EXISTS trigger_analytics_day_completion ON user_day_completions;

-- STEP 4: Create triggers on all relevant tables
CREATE TRIGGER trigger_analytics_challenge_completion
    AFTER INSERT OR UPDATE OR DELETE ON user_challenge_completions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics();

CREATE TRIGGER trigger_analytics_reflection
    AFTER INSERT OR UPDATE OR DELETE ON user_reflections
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics();

CREATE TRIGGER trigger_analytics_day_completion
    AFTER INSERT OR UPDATE OR DELETE ON user_day_completions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics();

-- STEP 5: Handle DELETE operations (need OLD.user_id)
CREATE OR REPLACE FUNCTION trigger_update_user_analytics_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics for the affected user (using OLD for deletes)
    PERFORM update_user_analytics(OLD.user_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Update triggers to handle deletes properly
DROP TRIGGER IF EXISTS trigger_analytics_challenge_completion ON user_challenge_completions;
DROP TRIGGER IF EXISTS trigger_analytics_reflection ON user_reflections;
DROP TRIGGER IF EXISTS trigger_analytics_day_completion ON user_day_completions;

-- Create separate triggers for INSERT/UPDATE and DELETE
CREATE TRIGGER trigger_analytics_challenge_completion_insert_update
    AFTER INSERT OR UPDATE ON user_challenge_completions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics();

CREATE TRIGGER trigger_analytics_challenge_completion_delete
    AFTER DELETE ON user_challenge_completions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics_delete();

CREATE TRIGGER trigger_analytics_reflection_insert_update
    AFTER INSERT OR UPDATE ON user_reflections
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics();

CREATE TRIGGER trigger_analytics_reflection_delete
    AFTER DELETE ON user_reflections
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics_delete();

CREATE TRIGGER trigger_analytics_day_completion_insert_update
    AFTER INSERT OR UPDATE ON user_day_completions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics();

CREATE TRIGGER trigger_analytics_day_completion_delete
    AFTER DELETE ON user_day_completions
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_analytics_delete();

-- STEP 6: Initialize analytics for existing users
-- Run this to populate analytics for any existing users
INSERT INTO user_journey_analytics (user_id, created_at)
SELECT DISTINCT user_id, NOW()
FROM user_challenge_completions
WHERE user_id NOT IN (SELECT user_id FROM user_journey_analytics)
ON CONFLICT (user_id) DO NOTHING;

-- Update all existing user analytics
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM user_challenge_completions LOOP
        PERFORM update_user_analytics(user_record.user_id);
    END LOOP;
END $$;

-- STEP 7: Test the function manually (replace with actual user ID)
-- SELECT update_user_analytics('your-user-id-here');

-- STEP 8: Verify triggers are working
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('user_challenge_completions', 'user_reflections', 'user_day_completions')
ORDER BY event_object_table, trigger_name; 