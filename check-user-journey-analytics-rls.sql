-- Check current RLS policies on user_journey_analytics table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_journey_analytics';

-- Check if RLS is enabled on the table
SELECT schemaname, tablename, rowsecurity
FROM pg_tables 
WHERE tablename = 'user_journey_analytics';

-- Test query as super_admin
SELECT 
    up.role as current_user_role,
    'Testing access to user_journey_analytics' as test_description
FROM user_profiles up
WHERE up.user_id = auth.uid(); 