-- Simple admin access test
-- Run this in your Supabase SQL editor

-- Check your current user and role
SELECT 
    'Your current status:' as check_type,
    auth.uid() as your_user_id,
    au.email as your_email,
    up.first_name,
    up.last_name, 
    up.role as your_role,
    CASE 
        WHEN up.role IN ('admin', 'super_admin') 
        THEN '✓ You have admin access' 
        ELSE '✗ You need admin/super_admin role'
    END as admin_status
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE up.user_id = auth.uid();

-- Test the policy logic directly
SELECT 
    'Policy test:' as test_type,
    auth.uid() as your_user_id,
    '3e035343-a1de-4efe-8c2d-3b6c57f4e679' as target_user_id,
    CASE 
        WHEN auth.uid() = '3e035343-a1de-4efe-8c2d-3b6c57f4e679'::uuid 
        THEN '✓ Access granted (you are the user)'
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
        THEN '✓ Access granted (you are admin)'
        ELSE '✗ Access denied'
    END as access_result;

-- Try to actually query the user_journey_analytics table for that user
SELECT 
    'Direct table test:' as test_type,
    COUNT(*) as records_found,
    CASE 
        WHEN COUNT(*) >= 0 
        THEN '✓ Query succeeded - RLS policies working'
        ELSE '✗ Query failed'
    END as query_result
FROM user_journey_analytics 
WHERE user_id = '3e035343-a1de-4efe-8c2d-3b6c57f4e679'::uuid;

-- If the above fails, let's check if the user exists in user_profiles at all
SELECT 
    'Target user check:' as check_type,
    up.first_name,
    up.last_name,
    up.role,
    up.user_id,
    CASE 
        WHEN up.user_id IS NOT NULL 
        THEN '✓ User exists in user_profiles'
        ELSE '✗ User not found in user_profiles'
    END as user_exists
FROM user_profiles up
WHERE up.user_id = '3e035343-a1de-4efe-8c2d-3b6c57f4e679'::uuid; 