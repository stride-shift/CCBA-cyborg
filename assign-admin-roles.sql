-- Admin Role Assignment Script
-- Run this in your Supabase SQL editor to assign admin roles

-- STEP 1: Check current user profiles and their roles
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.role,
    auth.users.email
FROM user_profiles up
JOIN auth.users ON auth.users.id = up.user_id
ORDER BY up.created_at;

-- STEP 2: Assign super_admin role to a specific user (replace email with your admin email)
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'your-admin-email@example.com'  -- Replace with your email
);

-- STEP 3: Assign admin role to other users (replace emails as needed)
UPDATE user_profiles 
SET role = 'admin' 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email IN (
        'admin1@example.com',   -- Replace with actual admin emails
        'admin2@example.com'
    )
);

-- STEP 4: Verify the role assignments
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    up.role,
    auth.users.email
FROM user_profiles up
JOIN auth.users ON auth.users.id = up.user_id
WHERE up.role IN ('admin', 'super_admin')
ORDER BY up.role DESC;

-- STEP 5: If you need to create a user_profiles entry for a user who doesn't have one yet:
-- First, find users without profiles:
SELECT 
    auth.users.id,
    auth.users.email,
    auth.users.created_at
FROM auth.users
LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
WHERE user_profiles.user_id IS NULL;

-- Then create a profile with admin role (replace the user_id):
-- INSERT INTO user_profiles (user_id, role, first_name, last_name)
-- VALUES (
--     'user-uuid-here',  -- Replace with actual user UUID
--     'admin',
--     'Admin',
--     'User'
-- );

-- STEP 6: To remove admin access (set back to regular user):
-- UPDATE user_profiles 
-- SET role = 'user' 
-- WHERE user_id = (
--     SELECT id FROM auth.users 
--     WHERE email = 'user-to-demote@example.com'
-- ); 