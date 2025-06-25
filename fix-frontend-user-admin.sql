-- Fix admin access for the frontend user
-- Run this in your Supabase SQL editor (you're logged in as justin.germishuys@strideshift.ai)

-- STEP 1: Check both users
SELECT 
    'Frontend user (justingermis@gmail.com) status:' as user_type,
    au.email,
    au.id as user_id,
    up.first_name,
    up.last_name,
    up.role,
    CASE 
        WHEN up.role IN ('admin', 'super_admin') 
        THEN '✓ Has admin access' 
        ELSE '✗ Needs admin access'
    END as admin_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.email = 'justingermis@gmail.com'

UNION ALL

SELECT 
    'Dashboard user (justin.germishuys@strideshift.ai) status:' as user_type,
    au.email,
    au.id as user_id,
    up.first_name,
    up.last_name,
    up.role,
    CASE 
        WHEN up.role IN ('admin', 'super_admin') 
        THEN '✓ Has admin access' 
        ELSE '✗ Needs admin access'
    END as admin_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.email = 'justin.germishuys@strideshift.ai';

-- STEP 2: Make the frontend user (justingermis@gmail.com) a super_admin
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'justingermis@gmail.com'
);

-- STEP 3: If the frontend user doesn't have a user_profiles record, create one
INSERT INTO user_profiles (user_id, role, first_name, last_name)
SELECT 
    au.id,
    'super_admin',
    COALESCE(au.raw_user_meta_data->>'first_name', 'Justin'),
    COALESCE(au.raw_user_meta_data->>'last_name', 'Germis')
FROM auth.users au
WHERE au.email = 'justingermis@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM user_profiles up 
    WHERE up.user_id = au.id
);

-- STEP 4: Verify the frontend user now has admin access
SELECT 
    'After update - Frontend user status:' as check_type,
    au.email,
    au.id as user_id,
    up.first_name,
    up.last_name,
    up.role,
    CASE 
        WHEN up.role IN ('admin', 'super_admin') 
        THEN '✓ Frontend user now has admin access' 
        ELSE '✗ Still needs admin access'
    END as admin_status
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE au.email = 'justingermis@gmail.com';

-- STEP 5: Test if the frontend user can access the problematic data
-- This simulates what the RLS policy will check for justingermis@gmail.com
SELECT 
    'Policy test for frontend user:' as test_type,
    frontend_user.id as frontend_user_id,
    'justingermis@gmail.com' as frontend_email,
    '3e035343-a1de-4efe-8c2d-3b6c57f4e679' as target_user_id,
    CASE 
        WHEN frontend_user.id = '3e035343-a1de-4efe-8c2d-3b6c57f4e679'::uuid 
        THEN '✓ Access granted (same user)'
        WHEN EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = frontend_user.id 
            AND user_profiles.role IN ('admin', 'super_admin')
        )
        THEN '✓ Access granted (frontend user is admin)'
        ELSE '✗ Access denied'
    END as access_result
FROM auth.users frontend_user
WHERE frontend_user.email = 'justingermis@gmail.com';

-- STEP 6: Show all super_admin users for confirmation
SELECT 
    'All super_admin users:' as check_type,
    au.email,
    up.first_name,
    up.last_name,
    up.role,
    up.user_id
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE up.role = 'super_admin'
ORDER BY au.email; 