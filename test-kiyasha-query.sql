-- Test querying for Kiyasha's user_journey_analytics data
-- This will help us determine if the issue is RLS policies or frontend query format

-- First, confirm Kiyasha's user_id
SELECT 
    'Kiyasha user info:' as info,
    user_id,
    email,
    first_name,
    last_name,
    role,
    cohort_id
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'kiyasha.singh@strideshift.ai';

-- Test direct query for Kiyasha's journey analytics
SELECT 
    'Direct query for Kiyasha journey analytics:' as info,
    COUNT(*) as record_count
FROM user_journey_analytics 
WHERE user_id = '3e035343-a1de-4efe-8c2d-3b6c57f4e679';

-- Test the same query format that the frontend is using
SELECT *
FROM user_journey_analytics
WHERE user_id = '3e035343-a1de-4efe-8c2d-3b6c57f4e679';

-- Check if there are ANY records in user_journey_analytics
SELECT 
    'Total records in user_journey_analytics:' as info,
    COUNT(*) as total_records
FROM user_journey_analytics;

-- Check which users DO have data in user_journey_analytics
SELECT 
    'Users with journey analytics data:' as info,
    user_id,
    COUNT(*) as record_count
FROM user_journey_analytics 
GROUP BY user_id
ORDER BY record_count DESC; 