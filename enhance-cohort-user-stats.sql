-- Enhanced secure function to get cohort users with progress stats
-- This will replace the basic get_user_emails_for_cohort function

CREATE OR REPLACE FUNCTION get_cohort_users_with_stats(target_cohort_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    
    -- Progress stats
    total_challenges_completed INTEGER,
    total_reflections_submitted INTEGER,
    total_days_completed INTEGER,
    current_streak_days INTEGER,
    journey_completion_percentage NUMERIC,
    last_activity_at TIMESTAMPTZ,
    
    -- Recent activity (last 7 days)
    recent_challenges_count INTEGER,
    recent_reflections_count INTEGER
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT 
        up.user_id,
        au.email,
        up.first_name,
        up.last_name,
        up.role,
        up.created_at,
        
        -- Progress stats from tracking tables
        COALESCE(challenge_stats.total_challenges, 0) as total_challenges_completed,
        COALESCE(reflection_stats.total_reflections, 0) as total_reflections_submitted,
        COALESCE(day_stats.total_days, 0) as total_days_completed,
        COALESCE(journey_stats.current_streak_days, 0) as current_streak_days,
        COALESCE(journey_stats.journey_completion_percentage, 0) as journey_completion_percentage,
        journey_stats.last_activity_at,
        
        -- Recent activity (last 7 days)
        COALESCE(recent_challenges.recent_count, 0) as recent_challenges_count,
        COALESCE(recent_reflections.recent_count, 0) as recent_reflections_count
        
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
    
    -- Challenge completion stats
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_challenges
        FROM user_challenge_completions
        GROUP BY user_id
    ) challenge_stats ON up.user_id = challenge_stats.user_id
    
    -- Reflection stats
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_reflections
        FROM user_reflections
        GROUP BY user_id
    ) reflection_stats ON up.user_id = reflection_stats.user_id
    
    -- Day completion stats
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as total_days
        FROM user_day_completions
        GROUP BY user_id
    ) day_stats ON up.user_id = day_stats.user_id
    
    -- Journey analytics (if available)
    LEFT JOIN user_journey_analytics journey_stats ON up.user_id = journey_stats.user_id
    
    -- Recent challenges (last 7 days)
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as recent_count
        FROM user_challenge_completions
        WHERE completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_challenges ON up.user_id = recent_challenges.user_id
    
    -- Recent reflections (last 7 days)
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as recent_count
        FROM user_reflections
        WHERE submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_reflections ON up.user_id = recent_reflections.user_id
    
    WHERE up.cohort_id = target_cohort_id
    ORDER BY up.first_name;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_cohort_users_with_stats(UUID) TO authenticated;

-- Keep the old function as backup
-- (We'll update the component to use the new one)

-- Test the enhanced function
SELECT 'Testing enhanced stats function' as info;
SELECT 
    first_name,
    last_name,
    email,
    total_challenges_completed,
    total_reflections_submitted,
    total_days_completed,
    journey_completion_percentage,
    recent_challenges_count,
    recent_reflections_count
FROM get_cohort_users_with_stats(
    (SELECT id FROM cohorts LIMIT 1)
) LIMIT 5; 