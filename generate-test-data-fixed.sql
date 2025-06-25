-- Generate test data for testuser8@example.com and testuser5@example.com
-- Using the correct table schema from database-schema.sql

-- First, let's check if these users exist and get their IDs
SELECT 
    'User check:' as info,
    au.email,
    up.user_id,
    up.first_name,
    up.last_name,
    up.cohort_id
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
ORDER BY au.email;

-- Get some challenge IDs to use for test data
SELECT 'Available challenges:' as info, id, order_index, title 
FROM challenges 
WHERE is_active = true 
ORDER BY order_index 
LIMIT 10;

-- Check available videos
SELECT 'Available videos:' as info, COUNT(*) as video_count
FROM videos;

-- Generate test data for both users
DO $$
DECLARE
    user8_id UUID;
    user5_id UUID;
    challenge_ids UUID[];
    video_ids UUID[];
    challenge_id UUID;
    video_id UUID;
    i INTEGER;
    completion_date TIMESTAMP;
    reflection_texts TEXT[];
    has_videos BOOLEAN := FALSE;
BEGIN
    -- Get user IDs from user_profiles (not users table)
    SELECT up.user_id INTO user8_id 
    FROM auth.users au 
    JOIN user_profiles up ON au.id = up.user_id 
    WHERE au.email = 'testuser8@example.com';
    
    SELECT up.user_id INTO user5_id 
    FROM auth.users au 
    JOIN user_profiles up ON au.id = up.user_id 
    WHERE au.email = 'testuser5@example.com';
    
    -- Get available challenge IDs
    SELECT ARRAY_AGG(id ORDER BY order_index) INTO challenge_ids 
    FROM challenges 
    WHERE is_active = true 
    LIMIT 15;
    
    -- Get available video IDs (if any exist)
    SELECT ARRAY_AGG(id) INTO video_ids 
    FROM videos 
    WHERE is_active = true 
    LIMIT 20;
    
    -- Check if we have videos to work with
    IF video_ids IS NOT NULL AND array_length(video_ids, 1) > 0 THEN
        has_videos := TRUE;
        RAISE NOTICE 'Found % videos to use for interactions', array_length(video_ids, 1);
    ELSE
        RAISE NOTICE 'No videos found - skipping video interactions';
    END IF;
    
    -- Prepare reflection texts
    reflection_texts := ARRAY[
        'Today was challenging but I pushed through. I noticed that when I set my intention in the morning, my day flows much better. The awareness practice is becoming more natural.',
        'The breathing exercise really helped me center myself. I can see how this practice is building my resilience day by day. I felt more grounded throughout the day.',
        'I struggled with consistency today, but I''m learning that progress isn''t always linear. Small steps matter more than I realized. Every effort counts.',
        'The mindfulness practice is becoming more natural. I caught myself being reactive and was able to pause. This is exactly the growth I was hoping for.',
        'Today I felt more aware of my automatic patterns. The reflection questions really help me process my thoughts and emotions more clearly.',
        'I''m starting to see connections between my thoughts and emotions. This journey is eye-opening and transformative in ways I didn''t expect.',
        'The challenge today pushed me outside my comfort zone, but that''s where growth happens. I''m learning to embrace discomfort as a teacher.',
        'I noticed more self-compassion today. Being kind to myself is a practice in itself, and it''s changing how I relate to setbacks.',
        'The community aspect of this program really motivates me. We''re all growing together and supporting each other through this journey.',
        'Today''s insights will stick with me. I feel like I''m developing new neural pathways and ways of thinking about challenges.'
    ];
    
    RAISE NOTICE 'Generating data for user8: %', user8_id;
    RAISE NOTICE 'Generating data for user5: %', user5_id;
    RAISE NOTICE 'Using % challenges', array_length(challenge_ids, 1);
    
    -- Clear existing test data for these users
    DELETE FROM user_journey_analytics WHERE user_id IN (user8_id, user5_id);
    DELETE FROM user_day_completions WHERE user_id IN (user8_id, user5_id);
    DELETE FROM user_reflections WHERE user_id IN (user8_id, user5_id);
    DELETE FROM user_challenge_completions WHERE user_id IN (user8_id, user5_id);
    DELETE FROM user_video_interactions WHERE user_id IN (user8_id, user5_id);
    
    -- Generate data for testuser8@example.com (high performer)
    IF user8_id IS NOT NULL AND challenge_ids IS NOT NULL THEN
        FOR i IN 1..12 LOOP
            challenge_id := challenge_ids[i];
            completion_date := NOW() - (INTERVAL '1 day' * (15 - i)) + (INTERVAL '1 hour' * random() * 8);
            
            -- Challenge 1 completion
            INSERT INTO user_challenge_completions (
                user_id, challenge_id, challenge_number, completed_at, notes
            ) VALUES (
                user8_id, challenge_id, 1, completion_date,
                'Completed morning challenge successfully'
            );
            
            -- Challenge 2 completion (30 minutes later)
            INSERT INTO user_challenge_completions (
                user_id, challenge_id, challenge_number, completed_at, notes
            ) VALUES (
                user8_id, challenge_id, 2, completion_date + INTERVAL '30 minutes',
                'Evening challenge completed with good focus'
            );
            
            -- Reflection
            INSERT INTO user_reflections (
                user_id, challenge_id, reflection_text, submitted_at, word_count
            ) VALUES (
                user8_id, challenge_id, 
                reflection_texts[(i % 10) + 1], 
                completion_date + INTERVAL '45 minutes',
                80 + (random() * 40)::INTEGER  -- 80-120 words
            );
            
            -- Day completion
            INSERT INTO user_day_completions (
                user_id, challenge_id, completed_at, 
                both_challenges_completed, reflection_submitted, time_spent_minutes
            ) VALUES (
                user8_id, challenge_id, completion_date + INTERVAL '1 hour',
                true, true, 45 + (random() * 30)::INTEGER  -- 45-75 minutes
            );
            
            -- Video interactions (only if videos exist)
            IF has_videos THEN
                video_id := video_ids[(i % array_length(video_ids, 1)) + 1];
                INSERT INTO user_video_interactions (
                    user_id, video_id, watched_at, watch_duration_seconds, completed_video, liked, rating
                ) VALUES (
                    user8_id, video_id, completion_date - INTERVAL '15 minutes',
                    300 + (random() * 600)::INTEGER, -- 5-15 minutes
                    true, random() > 0.3, 4 + (random() * 1)::INTEGER  -- rating 4-5
                );
            END IF;
        END LOOP;
        
        -- Create journey analytics for user8 (UPSERT to handle existing records)
        INSERT INTO user_journey_analytics (
            user_id, total_days_completed, total_challenges_completed, 
            total_reflections_submitted, total_videos_watched,
            current_streak_days, longest_streak_days,
            journey_completion_percentage, last_activity_at, updated_at
        ) VALUES (
            user8_id, 12, 24, 12, CASE WHEN has_videos THEN 12 ELSE 0 END,  -- 24 challenges (2 per day)
            8, 12, 80.0, NOW() - INTERVAL '6 hours', NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_days_completed = EXCLUDED.total_days_completed,
            total_challenges_completed = EXCLUDED.total_challenges_completed,
            total_reflections_submitted = EXCLUDED.total_reflections_submitted,
            total_videos_watched = EXCLUDED.total_videos_watched,
            current_streak_days = EXCLUDED.current_streak_days,
            longest_streak_days = EXCLUDED.longest_streak_days,
            journey_completion_percentage = EXCLUDED.journey_completion_percentage,
            last_activity_at = EXCLUDED.last_activity_at,
            updated_at = NOW();
    END IF;
    
    -- Generate data for testuser5@example.com (moderate performer)
    IF user5_id IS NOT NULL AND challenge_ids IS NOT NULL THEN
        FOR i IN 1..8 LOOP
            challenge_id := challenge_ids[i];
            completion_date := NOW() - (INTERVAL '1 day' * (12 - i)) + (INTERVAL '1 hour' * random() * 10);
            
            -- Challenge 1 completion (always completed)
            INSERT INTO user_challenge_completions (
                user_id, challenge_id, challenge_number, completed_at, notes
            ) VALUES (
                user5_id, challenge_id, 1, completion_date,
                'Morning challenge done'
            );
            
            -- Challenge 2 completion (sometimes skipped)
            IF random() > 0.25 THEN -- 75% completion rate for challenge 2
                INSERT INTO user_challenge_completions (
                    user_id, challenge_id, challenge_number, completed_at, notes
                ) VALUES (
                    user5_id, challenge_id, 2, completion_date + INTERVAL '8 hours',
                    'Evening challenge completed'
                );
            END IF;
            
            -- Reflection (sometimes skipped)
            IF random() > 0.3 THEN -- 70% reflection rate
                INSERT INTO user_reflections (
                    user_id, challenge_id, reflection_text, submitted_at, word_count
                ) VALUES (
                    user5_id, challenge_id, 
                    reflection_texts[(i % 10) + 1], 
                    completion_date + INTERVAL '2 hours',
                    50 + (random() * 60)::INTEGER  -- 50-110 words
                );
            END IF;
            
            -- Day completion (based on whether both challenges and reflection done)
            INSERT INTO user_day_completions (
                user_id, challenge_id, completed_at, 
                both_challenges_completed, reflection_submitted, time_spent_minutes
            ) VALUES (
                user5_id, challenge_id, completion_date + INTERVAL '3 hours',
                random() > 0.25, random() > 0.3, 25 + (random() * 25)::INTEGER  -- 25-50 minutes
            );
            
            -- Video interactions (only if videos exist, more sporadic)
            IF has_videos AND random() > 0.2 THEN -- 80% watch rate
                video_id := video_ids[(i % array_length(video_ids, 1)) + 1];
                INSERT INTO user_video_interactions (
                    user_id, video_id, watched_at, watch_duration_seconds, completed_video, liked, rating
                ) VALUES (
                    user5_id, video_id, completion_date - INTERVAL '10 minutes',
                    180 + (random() * 420)::INTEGER, -- 3-10 minutes
                    random() > 0.3, random() > 0.5, 3 + (random() * 2)::INTEGER  -- rating 3-5
                );
            END IF;
        END LOOP;
        
        -- Create journey analytics for user5 (UPSERT to handle existing records)
        INSERT INTO user_journey_analytics (
            user_id, total_days_completed, total_challenges_completed, 
            total_reflections_submitted, total_videos_watched,
            current_streak_days, longest_streak_days,
            journey_completion_percentage, last_activity_at, updated_at
        ) VALUES (
            user5_id, 6, 14, 5, CASE WHEN has_videos THEN 7 ELSE 0 END,  -- fewer completions
            3, 5, 53.3, NOW() - INTERVAL '18 hours', NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_days_completed = EXCLUDED.total_days_completed,
            total_challenges_completed = EXCLUDED.total_challenges_completed,
            total_reflections_submitted = EXCLUDED.total_reflections_submitted,
            total_videos_watched = EXCLUDED.total_videos_watched,
            current_streak_days = EXCLUDED.current_streak_days,
            longest_streak_days = EXCLUDED.longest_streak_days,
            journey_completion_percentage = EXCLUDED.journey_completion_percentage,
            last_activity_at = EXCLUDED.last_activity_at,
            updated_at = NOW();
    END IF;
    
    RAISE NOTICE 'Test data generation completed!';
    IF NOT has_videos THEN
        RAISE NOTICE 'Note: No video interactions created because no videos exist in the database';
    END IF;
END $$;

-- Verify the generated data
SELECT 'Verification - Challenge Completions by User:' as info;
SELECT 
    au.email,
    ucc.challenge_number,
    COUNT(*) as completions,
    MAX(ucc.completed_at) as latest_completion
FROM user_challenge_completions ucc
JOIN user_profiles up ON ucc.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
GROUP BY au.email, ucc.challenge_number
ORDER BY au.email, ucc.challenge_number;

SELECT 'Verification - Reflections:' as info;
SELECT 
    au.email,
    COUNT(*) as reflection_count,
    AVG(ur.word_count) as avg_word_count,
    MAX(ur.submitted_at) as latest_reflection
FROM user_reflections ur
JOIN user_profiles up ON ur.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
GROUP BY au.email
ORDER BY au.email;

SELECT 'Verification - Day Completions:' as info;
SELECT 
    au.email,
    COUNT(*) as total_days,
    SUM(CASE WHEN udc.both_challenges_completed THEN 1 ELSE 0 END) as both_challenges_days,
    SUM(CASE WHEN udc.reflection_submitted THEN 1 ELSE 0 END) as reflection_days,
    AVG(udc.time_spent_minutes) as avg_time_minutes
FROM user_day_completions udc
JOIN user_profiles up ON udc.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
GROUP BY au.email
ORDER BY au.email;

SELECT 'Verification - Video Interactions:' as info;
SELECT 
    au.email,
    COUNT(*) as video_interactions,
    AVG(uvi.watch_duration_seconds) as avg_watch_seconds,
    SUM(CASE WHEN uvi.completed_video THEN 1 ELSE 0 END) as completed_videos
FROM user_video_interactions uvi
JOIN user_profiles up ON uvi.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
GROUP BY au.email
ORDER BY au.email;

SELECT 'Verification - Journey Analytics Summary:' as info;
SELECT 
    au.email,
    uja.total_days_completed,
    uja.total_challenges_completed,
    uja.total_reflections_submitted,
    uja.total_videos_watched,
    uja.current_streak_days,
    uja.longest_streak_days,
    uja.journey_completion_percentage,
    uja.last_activity_at
FROM user_journey_analytics uja
JOIN user_profiles up ON uja.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
ORDER BY au.email; 