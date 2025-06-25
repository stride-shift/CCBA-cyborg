-- Restore Admin Access Script
-- Run this in your Supabase SQL editor

-- Step 1: Show current user emails so you can identify yours
SELECT 'Current Users' as step;
SELECT 
    auth.users.email,
    user_profiles.role,
    auth.users.created_at
FROM auth.users
LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
ORDER BY auth.users.created_at ASC;

-- Step 2: Assign super_admin role to the first user (usually you)
-- OR replace 'your-email@example.com' with your actual email
UPDATE user_profiles 
SET role = 'super_admin' 
WHERE user_id = (
    SELECT auth.users.id 
    FROM auth.users 
    LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
    ORDER BY auth.users.created_at ASC 
    LIMIT 1
);

-- Alternative: Assign to specific email (uncomment and replace email)
-- UPDATE user_profiles 
-- SET role = 'super_admin' 
-- WHERE user_id = (
--     SELECT id FROM auth.users 
--     WHERE email = 'your-email@example.com'
-- );

-- Step 3: Verify admin assignment
SELECT 'Admin Users' as step;
SELECT 
    auth.users.email,
    user_profiles.role,
    user_profiles.first_name,
    user_profiles.last_name
FROM auth.users
JOIN user_profiles ON auth.users.id = user_profiles.user_id
WHERE user_profiles.role IN ('admin', 'super_admin')
ORDER BY user_profiles.role DESC;

-- Step 4: Ensure user_profiles table has all necessary columns
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'organization_name') THEN
        ALTER TABLE user_profiles ADD COLUMN organization_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'department') THEN
        ALTER TABLE user_profiles ADD COLUMN department VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'cohort_id') THEN
        ALTER TABLE user_profiles ADD COLUMN cohort_id UUID;
    END IF;
END $$;

-- Step 5: Ensure RLS is properly configured
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policy to ensure it works
DROP POLICY IF EXISTS "Users can view and update own profile" ON user_profiles;
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Step 6: Test access by running a query that should work for admin
SELECT 'Access Test' as step;
SELECT 
    'You should see this if admin access works' as message,
    COUNT(*) as total_users
FROM user_profiles;

SELECT 'SUCCESS: Admin access should be restored!' as final_status; 