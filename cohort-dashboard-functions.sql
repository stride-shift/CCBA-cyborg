-- SQL functions to support the cohort detail dashboard
-- Run this in Supabase SQL editor

-- Function to get comprehensive user progress data for a cohort
CREATE OR REPLACE FUNCTION get_cohort_user_progress(cohort_user_ids UUID[])
RETURNS TABLE (
    user_id UUID,
    total_days_completed INTEGER,
    total_challenges_completed INTEGER,
    total_reflections_submitted INTEGER,
    journey_completion_percentage DECIMAL(5,2),
    current_streak_days INTEGER,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    recent_challenge_count INTEGER,
    recent_reflection_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uja.user_id,
        COALESCE(uja.total_days_completed, 0) as total_days_completed,
        COALESCE(uja.total_challenges_completed, 0) as total_challenges_completed,
        COALESCE(uja.total_reflections_submitted, 0) as total_reflections_submitted,
        COALESCE(uja.journey_completion_percentage, 0.00) as journey_completion_percentage,
        COALESCE(uja.current_streak_days, 0) as current_streak_days,
        uja.last_activity_at,
        COALESCE(recent_challenges.challenge_count, 0) as recent_challenge_count,
        COALESCE(recent_reflections.reflection_count, 0) as recent_reflection_count
    FROM unnest(cohort_user_ids) AS uid(user_id)
    LEFT JOIN user_journey_analytics uja ON uid.user_id = uja.user_id
    LEFT JOIN (
        -- Count recent challenges (last 7 days)
        SELECT 
            user_id,
            COUNT(*) as challenge_count
        FROM user_challenge_completions 
        WHERE user_id = ANY(cohort_user_ids)
        AND completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_challenges ON uid.user_id = recent_challenges.user_id
    LEFT JOIN (
        -- Count recent reflections (last 7 days)
        SELECT 
            user_id,
            COUNT(*) as reflection_count
        FROM user_reflections 
        WHERE user_id = ANY(cohort_user_ids)
        AND submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_reflections ON uid.user_id = recent_reflections.user_id
    ORDER BY uja.journey_completion_percentage DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get detailed user activity timeline for a specific user
CREATE OR REPLACE FUNCTION get_user_activity_timeline(target_user_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    activity_date DATE,
    activity_type TEXT,
    activity_description TEXT,
    challenge_day INTEGER,
    activity_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    -- Challenge completions
    SELECT 
        uc.completed_at::DATE as activity_date,
        'challenge_completion' as activity_type,
        'Completed Challenge ' || uc.challenge_number || ' of Day ' || c.order_index as activity_description,
        c.order_index as challenge_day,
        uc.completed_at as activity_time
    FROM user_challenge_completions uc
    JOIN challenges c ON uc.challenge_id = c.id
    WHERE uc.user_id = target_user_id
    AND uc.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Reflection submissions
    SELECT 
        ur.submitted_at::DATE as activity_date,
        'reflection_submission' as activity_type,
        'Submitted reflection for Day ' || c.order_index as activity_description,
        c.order_index as challenge_day,
        ur.submitted_at as activity_time
    FROM user_reflections ur
    JOIN challenges c ON ur.challenge_id = c.id
    WHERE ur.user_id = target_user_id
    AND ur.submitted_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Day completions
    SELECT 
        ud.completed_at::DATE as activity_date,
        'day_completion' as activity_type,
        'Completed Day ' || c.order_index || ' (both challenges + reflection)' as activity_description,
        c.order_index as challenge_day,
        ud.completed_at as activity_time
    FROM user_day_completions ud
    JOIN challenges c ON ud.challenge_id = c.id
    WHERE ud.user_id = target_user_id
    AND ud.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND ud.both_challenges_completed = true
    AND ud.reflection_submitted = true
    
    ORDER BY activity_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cohort leaderboard
CREATE OR REPLACE FUNCTION get_cohort_leaderboard(target_cohort_id UUID)
RETURNS TABLE (
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    journey_completion_percentage DECIMAL(5,2),
    total_days_completed INTEGER,
    current_streak_days INTEGER,
    rank_position BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.first_name,
        up.last_name,
        COALESCE(uja.journey_completion_percentage, 0.00) as journey_completion_percentage,
        COALESCE(uja.total_days_completed, 0) as total_days_completed,
        COALESCE(uja.current_streak_days, 0) as current_streak_days,
        ROW_NUMBER() OVER (ORDER BY uja.journey_completion_percentage DESC, uja.total_days_completed DESC) as rank_position
    FROM user_profiles up
    LEFT JOIN user_journey_analytics uja ON up.user_id = uja.user_id
    WHERE up.cohort_id = target_cohort_id
    AND up.role = 'user'  -- Only regular users, not admins
    ORDER BY rank_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for cohort performance summary
CREATE OR REPLACE VIEW cohort_performance_summary AS
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    c.organization_name,
    c.start_date,
    c.end_date,
    
    -- User counts
    COUNT(DISTINCT up.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN uja.journey_completion_percentage > 0 THEN up.user_id END) as active_users,
    COUNT(DISTINCT CASE WHEN uja.journey_completion_percentage >= 100 THEN up.user_id END) as completed_users,
    
    -- Progress metrics
    ROUND(AVG(COALESCE(uja.journey_completion_percentage, 0)), 2) as avg_completion_percentage,
    ROUND(AVG(COALESCE(uja.total_days_completed, 0)), 1) as avg_days_completed,
    ROUND(AVG(COALESCE(uja.current_streak_days, 0)), 1) as avg_current_streak,
    
    -- Engagement metrics
    SUM(COALESCE(uja.total_challenges_completed, 0)) as total_challenges_completed,
    SUM(COALESCE(uja.total_reflections_submitted, 0)) as total_reflections_submitted,
    
    -- Activity metrics
    COUNT(DISTINCT CASE WHEN uja.last_activity_at >= NOW() - INTERVAL '7 days' THEN up.user_id END) as users_active_last_7_days,
    COUNT(DISTINCT CASE WHEN uja.last_activity_at >= NOW() - INTERVAL '1 day' THEN up.user_id END) as users_active_last_day

FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id AND up.role = 'user'
LEFT JOIN user_journey_analytics uja ON up.user_id = uja.user_id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.organization_name, c.start_date, c.end_date
ORDER BY c.name;

-- Grant access to these functions for authenticated users
GRANT EXECUTE ON FUNCTION get_cohort_user_progress(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_timeline(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cohort_leaderboard(UUID) TO authenticated;
GRANT SELECT ON cohort_performance_summary TO authenticated;

-- Test the functions (uncomment and replace with actual IDs to test)
-- SELECT * FROM get_cohort_user_progress(ARRAY['user-id-1', 'user-id-2']::UUID[]);
-- SELECT * FROM get_user_activity_timeline('user-id-here'::UUID, 14);
-- SELECT * FROM get_cohort_leaderboard('cohort-id-here'::UUID);
-- SELECT * FROM cohort_performance_summary;

SELECT 'Cohort dashboard functions created successfully!' as status; 