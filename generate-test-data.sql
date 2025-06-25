-- Generate test data for testuser8@example.com and testuser5@example.com
-- Run this in your Supabase SQL editor

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

-- Generate test data for both users
DO $$
DECLARE
    user8_id UUID;
    user5_id UUID;
    challenge_ids UUID[];
    challenge_id UUID;
    i INTEGER;
    completion_date TIMESTAMP;
    reflection_text TEXT[];
    video_duration INTEGER;
BEGIN
    -- Get user IDs
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
    
    -- Prepare reflection texts
    reflection_text := ARRAY[
        'Today was challenging but I pushed through. I noticed that when I set my intention in the morning, my day flows much better.',
        'The breathing exercise really helped me center myself. I can see how this practice is building my resilience.',
        'I struggled with consistency today, but I''m learning that progress isn''t always linear. Small steps matter.',
        'The mindfulness practice is becoming more natural. I caught myself being reactive and was able to pause.',
        'Today I felt more aware of my automatic patterns. The reflection questions really help me process.',
        'I''m starting to see connections between my thoughts and emotions. This journey is eye-opening.',
        'The challenge today pushed me outside my comfort zone, but that''s where growth happens.',
        'I noticed more self-compassion today. Being kind to myself is a practice in itself.',
        'The community aspect of this program really motivates me. We''re all growing together.',
        'Today''s insights will stick with me. I feel like I''m developing new neural pathways.'
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
            
            -- Challenge completions
            INSERT INTO user_challenge_completions (
                user_id, challenge_id, challenge_number, completed_at, 
                time_spent_minutes, difficulty_rating, success_rating
            ) VALUES (
                user8_id, challenge_id, i, completion_date,
                15 + (random() * 30)::INTEGER, -- 15-45 minutes
                3 + (random() * 2)::INTEGER,    -- 3-5 difficulty
                4 + (random() * 1)::INTEGER     -- 4-5 success
            );
            
            -- Reflections
            INSERT INTO user_reflections (
                user_id, challenge_id, content, submitted_at, word_count, mood_before, mood_after
            ) VALUES (
                user8_id, challenge_id, 
                reflection_text[(i % 10) + 1], 
                completion_date + INTERVAL '30 minutes',
                80 + (random() * 40)::INTEGER,  -- 80-120 words
                2 + (random() * 2)::INTEGER,    -- 2-4 mood before
                4 + (random() * 1)::INTEGER     -- 4-5 mood after
            );
            
            -- Day completions
            INSERT INTO user_day_completions (
                user_id, challenge_id, completed_at, 
                both_challenges_completed, reflection_submitted, time_spent_minutes
            ) VALUES (
                user8_id, challenge_id, completion_date + INTERVAL '1 hour',
                true, true, 45 + (random() * 30)::INTEGER
            );
            
            -- Video interactions (assuming videos exist)
            INSERT INTO user_video_interactions (
                user_id, video_id, watched_at, watch_duration_seconds, completed_video, liked, rating
            ) VALUES (
                user8_id, gen_random_uuid(), completion_date - INTERVAL '15 minutes',
                300 + (random() * 600)::INTEGER, -- 5-15 minutes
                true, random() > 0.3, 4 + (random() * 1)::INTEGER
            );
        END LOOP;
        
        -- Create journey analytics for user8
        INSERT INTO user_journey_analytics (
            user_id, total_days_completed, total_challenges_completed, 
            total_reflections_submitted, total_videos_watched,
            current_streak_days, longest_streak_days,
            journey_completion_percentage, last_activity_at
        ) VALUES (
            user8_id, 12, 12, 12, 12,
            8, 12, 80.0, NOW() - INTERVAL '6 hours'
        );
    END IF;
    
    -- Generate data for testuser5@example.com (moderate performer)
    IF user5_id IS NOT NULL AND challenge_ids IS NOT NULL THEN
        FOR i IN 1..7 LOOP
            challenge_id := challenge_ids[i];
            completion_date := NOW() - (INTERVAL '1 day' * (10 - i)) + (INTERVAL '1 hour' * random() * 10);
            
            -- Challenge completions (some days missed)
            IF random() > 0.2 THEN -- 80% completion rate
                INSERT INTO user_challenge_completions (
                    user_id, challenge_id, challenge_number, completed_at, 
                    time_spent_minutes, difficulty_rating, success_rating
                ) VALUES (
                    user5_id, challenge_id, i, completion_date,
                    10 + (random() * 25)::INTEGER, -- 10-35 minutes
                    2 + (random() * 3)::INTEGER,    -- 2-5 difficulty
                    3 + (random() * 2)::INTEGER     -- 3-5 success
                );
                
                -- Reflections (sometimes skipped)
                IF random() > 0.3 THEN -- 70% reflection rate
                    INSERT INTO user_reflections (
                        user_id, challenge_id, content, submitted_at, word_count, mood_before, mood_after
                    ) VALUES (
                        user5_id, challenge_id, 
                        reflection_text[(i % 10) + 1], 
                        completion_date + INTERVAL '45 minutes',
                        50 + (random() * 60)::INTEGER,  -- 50-110 words
                        2 + (random() * 3)::INTEGER,    -- 2-5 mood before
                        3 + (random() * 2)::INTEGER     -- 3-5 mood after
                    );
                END IF;
                
                -- Day completions
                INSERT INTO user_day_completions (
                    user_id, challenge_id, completed_at, 
                    both_challenges_completed, reflection_submitted, time_spent_minutes
                ) VALUES (
                    user5_id, challenge_id, completion_date + INTERVAL '30 minutes',
                    true, random() > 0.3, 30 + (random() * 25)::INTEGER
                );
                
                -- Video interactions
                INSERT INTO user_video_interactions (
                    user_id, video_id, watched_at, watch_duration_seconds, completed_video, liked, rating
                ) VALUES (
                    user5_id, gen_random_uuid(), completion_date - INTERVAL '10 minutes',
                    180 + (random() * 420)::INTEGER, -- 3-10 minutes
                    random() > 0.2, random() > 0.4, 3 + (random() * 2)::INTEGER
                );
            END IF;
        END LOOP;
        
        -- Create journey analytics for user5
        INSERT INTO user_journey_analytics (
            user_id, total_days_completed, total_challenges_completed, 
            total_reflections_submitted, total_videos_watched,
            current_streak_days, longest_streak_days,
            journey_completion_percentage, last_activity_at
        ) VALUES (
            user5_id, 6, 6, 4, 6,
            3, 5, 46.7, NOW() - INTERVAL '1 day'
        );
    END IF;
    
    RAISE NOTICE 'Test data generation completed!';
END $$;

-- Verify the generated data
SELECT 'Verification - User Challenge Completions:' as info;
SELECT 
    au.email,
    COUNT(*) as challenge_completions,
    AVG(time_spent_minutes) as avg_time_minutes,
    MAX(completed_at) as latest_completion
FROM user_challenge_completions ucc
JOIN user_profiles up ON ucc.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
GROUP BY au.email
ORDER BY au.email;

SELECT 'Verification - User Reflections:' as info;
SELECT 
    au.email,
    COUNT(*) as reflection_count,
    AVG(word_count) as avg_word_count,
    AVG(mood_after - mood_before) as avg_mood_improvement
FROM user_reflections ur
JOIN user_profiles up ON ur.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
GROUP BY au.email
ORDER BY au.email;

SELECT 'Verification - Journey Analytics:' as info;
SELECT 
    au.email,
    uja.total_days_completed,
    uja.total_challenges_completed,
    uja.total_reflections_submitted,
    uja.current_streak_days,
    uja.journey_completion_percentage,
    uja.last_activity_at
FROM user_journey_analytics uja
JOIN user_profiles up ON uja.user_id = up.user_id
JOIN auth.users au ON up.user_id = au.id
WHERE au.email IN ('testuser8@example.com', 'testuser5@example.com')
ORDER BY au.email; 