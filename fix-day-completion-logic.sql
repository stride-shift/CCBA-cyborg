-- Fix Day Completion Logic and Clean Up Inconsistent Data
-- Run this in Supabase SQL Editor

-- STEP 1: Create function to recalculate and fix user day completions
CREATE OR REPLACE FUNCTION fix_user_day_completions()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    challenge_record RECORD;
    challenge_1_exists BOOLEAN;
    challenge_2_exists BOOLEAN;
    reflection_exists BOOLEAN;
    both_completed BOOLEAN;
BEGIN
    -- Loop through all users from auth.users (the main user table)
    FOR user_record IN 
        SELECT DISTINCT id FROM auth.users 
    LOOP
        -- Loop through all challenges for this user
        FOR challenge_record IN 
            SELECT id FROM challenges WHERE is_active = true
        LOOP
            -- Check if challenge 1 is completed
            SELECT EXISTS(
                SELECT 1 FROM user_challenge_completions 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id 
                AND challenge_number = 1
            ) INTO challenge_1_exists;
            
            -- Check if challenge 2 is completed  
            SELECT EXISTS(
                SELECT 1 FROM user_challenge_completions 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id 
                AND challenge_number = 2
            ) INTO challenge_2_exists;
            
            -- Check if reflection exists
            SELECT EXISTS(
                SELECT 1 FROM user_reflections 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id
            ) INTO reflection_exists;
            
            -- Determine if both challenges are completed
            both_completed := challenge_1_exists AND challenge_2_exists;
            
            -- Only create/update day completion if there's actual progress
            IF challenge_1_exists OR challenge_2_exists OR reflection_exists THEN
                -- Upsert the correct completion status
                INSERT INTO user_day_completions (
                    user_id,
                    challenge_id,
                    both_challenges_completed,
                    reflection_submitted,
                    updated_at
                ) VALUES (
                    user_record.id,
                    challenge_record.id,
                    both_completed,
                    reflection_exists,
                    NOW()
                )
                ON CONFLICT (user_id, challenge_id) 
                DO UPDATE SET
                    both_challenges_completed = EXCLUDED.both_challenges_completed,
                    reflection_submitted = EXCLUDED.reflection_submitted,
                    updated_at = NOW();
            ELSE
                -- Delete any existing record if no progress
                DELETE FROM user_day_completions 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Day completion data fixed for all users';
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Run the fix function
SELECT fix_user_day_completions();

-- STEP 3: Create function to debug a specific user's progress
CREATE OR REPLACE FUNCTION debug_user_progress(target_user_id UUID)
RETURNS TABLE (
    challenge_day INTEGER,
    challenge_1_completed BOOLEAN,
    challenge_2_completed BOOLEAN,
    reflection_submitted BOOLEAN,
    day_marked_complete BOOLEAN,
    should_be_complete BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.order_index as challenge_day,
        EXISTS(
            SELECT 1 FROM user_challenge_completions ucc1 
            WHERE ucc1.user_id = target_user_id 
            AND ucc1.challenge_id = c.id 
            AND ucc1.challenge_number = 1
        ) as challenge_1_completed,
        EXISTS(
            SELECT 1 FROM user_challenge_completions ucc2 
            WHERE ucc2.user_id = target_user_id 
            AND ucc2.challenge_id = c.id 
            AND ucc2.challenge_number = 2
        ) as challenge_2_completed,
        EXISTS(
            SELECT 1 FROM user_reflections ur 
            WHERE ur.user_id = target_user_id 
            AND ur.challenge_id = c.id
        ) as reflection_submitted,
        COALESCE(udc.both_challenges_completed AND udc.reflection_submitted, false) as day_marked_complete,
        (
            EXISTS(
                SELECT 1 FROM user_challenge_completions ucc1 
                WHERE ucc1.user_id = target_user_id 
                AND ucc1.challenge_id = c.id 
                AND ucc1.challenge_number = 1
            ) AND
            EXISTS(
                SELECT 1 FROM user_challenge_completions ucc2 
                WHERE ucc2.user_id = target_user_id 
                AND ucc2.challenge_id = c.id 
                AND ucc2.challenge_number = 2
            ) AND
            EXISTS(
                SELECT 1 FROM user_reflections ur 
                WHERE ur.user_id = target_user_id 
                AND ur.challenge_id = c.id
            )
        ) as should_be_complete
    FROM challenges c
    LEFT JOIN user_day_completions udc ON (
        udc.user_id = target_user_id 
        AND udc.challenge_id = c.id
    )
    WHERE c.is_active = true
    ORDER BY c.order_index;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Update analytics for all users  
SELECT update_user_analytics(id) FROM auth.users;

-- STEP 5: Grant permissions
GRANT EXECUTE ON FUNCTION debug_user_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fix_user_day_completions() TO authenticated;

-- All done! Day completion logic has been fixed and analytics updated for all users 