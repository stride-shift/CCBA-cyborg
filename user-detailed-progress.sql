-- Secure function to get detailed progress for a specific user
-- Shows which challenges and reflections are completed vs missing

CREATE OR REPLACE FUNCTION get_user_detailed_progress(target_user_id UUID)
RETURNS TABLE (
    -- Challenge details
    challenge_id UUID,
    challenge_title TEXT,
    challenge_day INTEGER,
    challenge_1_completed BOOLEAN,
    challenge_1_completed_at TIMESTAMPTZ,
    challenge_2_completed BOOLEAN,  
    challenge_2_completed_at TIMESTAMPTZ,
    
    -- Reflection details
    reflection_completed BOOLEAN,
    reflection_submitted_at TIMESTAMPTZ,
    reflection_word_count INTEGER,
    
    -- Day completion
    day_completed BOOLEAN,
    day_completed_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT 
        c.id as challenge_id,
        c.title as challenge_title,
        c.order_index as challenge_day,
        
        -- Challenge 1 completion
        (cc1.id IS NOT NULL) as challenge_1_completed,
        cc1.completed_at as challenge_1_completed_at,
        
        -- Challenge 2 completion  
        (cc2.id IS NOT NULL) as challenge_2_completed,
        cc2.completed_at as challenge_2_completed_at,
        
        -- Reflection completion
        (ur.id IS NOT NULL) as reflection_completed,
        ur.submitted_at as reflection_submitted_at,
        ur.word_count as reflection_word_count,
        
        -- Day completion
        (ud.id IS NOT NULL) as day_completed,
        ud.completed_at as day_completed_at
        
    FROM challenges c
    LEFT JOIN user_challenge_completions cc1 ON (
        c.id = cc1.challenge_id 
        AND cc1.user_id = target_user_id 
        AND cc1.challenge_number = 1
    )
    LEFT JOIN user_challenge_completions cc2 ON (
        c.id = cc2.challenge_id 
        AND cc2.user_id = target_user_id 
        AND cc2.challenge_number = 2
    )
    LEFT JOIN user_reflections ur ON (
        c.id = ur.challenge_id 
        AND ur.user_id = target_user_id
    )
    LEFT JOIN user_day_completions ud ON (
        c.id = ud.challenge_id 
        AND ud.user_id = target_user_id
    )
    WHERE c.is_active = true
    ORDER BY c.order_index;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_user_detailed_progress(UUID) TO authenticated;

-- Function to get recent user activity with more details
CREATE OR REPLACE FUNCTION get_user_recent_activity_detailed(target_user_id UUID, days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    activity_date DATE,
    activity_type TEXT,
    activity_description TEXT,
    challenge_day INTEGER,
    challenge_title TEXT,
    activity_time TIMESTAMPTZ,
    word_count INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    -- Challenge completions
    SELECT 
        uc.completed_at::DATE as activity_date,
        'challenge_completion' as activity_type,
        'Completed Challenge ' || uc.challenge_number || ' of Day ' || c.order_index || ': ' || c.title as activity_description,
        c.order_index as challenge_day,
        c.title as challenge_title,
        uc.completed_at as activity_time,
        NULL::INTEGER as word_count
    FROM user_challenge_completions uc
    JOIN challenges c ON uc.challenge_id = c.id
    WHERE uc.user_id = target_user_id
    AND uc.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Reflection submissions
    SELECT 
        ur.submitted_at::DATE as activity_date,
        'reflection_submission' as activity_type,
        'Submitted reflection for Day ' || c.order_index || ': ' || c.title as activity_description,
        c.order_index as challenge_day,
        c.title as challenge_title,
        ur.submitted_at as activity_time,
        ur.word_count
    FROM user_reflections ur
    JOIN challenges c ON ur.challenge_id = c.id
    WHERE ur.user_id = target_user_id
    AND ur.submitted_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Day completions
    SELECT 
        ud.completed_at::DATE as activity_date,
        'day_completion' as activity_type,
        'Completed Day ' || c.order_index || ': ' || c.title || ' (Full Day!)' as activity_description,
        c.order_index as challenge_day,
        c.title as challenge_title,
        ud.completed_at as activity_time,
        NULL::INTEGER as word_count
    FROM user_day_completions ud
    JOIN challenges c ON ud.challenge_id = c.id
    WHERE ud.user_id = target_user_id
    AND ud.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND ud.both_challenges_completed = true
    AND ud.reflection_submitted = true
    
    ORDER BY activity_time DESC;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_user_recent_activity_detailed(UUID, INTEGER) TO authenticated;

-- Test the detailed functions
SELECT 'Testing detailed progress function' as info;
SELECT 
    challenge_day,
    challenge_title,
    challenge_1_completed,
    challenge_2_completed,
    reflection_completed,
    day_completed
FROM get_user_detailed_progress(
    (SELECT user_id FROM user_profiles LIMIT 1)
) LIMIT 5;

SELECT 'Testing detailed activity function' as info;
SELECT 
    activity_date,
    activity_type,
    activity_description,
    challenge_day
FROM get_user_recent_activity_detailed(
    (SELECT user_id FROM user_profiles LIMIT 1),
    14
) LIMIT 5; 