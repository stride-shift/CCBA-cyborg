-- Quick Admin Role Check and Assignment
-- Run this in your Supabase SQL editor

-- STEP 1: Check if user_profiles table exists and see current users
SELECT 
    auth.users.id,
    auth.users.email,
    auth.users.created_at,
    user_profiles.role,
    user_profiles.first_name,
    user_profiles.last_name
FROM auth.users
LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
ORDER BY auth.users.created_at DESC;

-- STEP 2: Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    organization_name VARCHAR(255),
    department VARCHAR(255),
    cohort_id UUID,
    UNIQUE(user_id)
);

-- STEP 3: Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 4: Create RLS policy for user_profiles
DROP POLICY IF EXISTS "Users can view and update own profile" ON user_profiles;
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- STEP 5: Create user_profiles entry for users who don't have one
INSERT INTO user_profiles (user_id, role, first_name, last_name)
SELECT 
    auth.users.id,
    'user',
    COALESCE(auth.users.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(auth.users.raw_user_meta_data->>'last_name', '')
FROM auth.users
LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
WHERE user_profiles.user_id IS NULL;

-- STEP 6: Assign super_admin role to the first user (or replace email)
UPDATE user_profiles 
SET role = 'super_admin'
WHERE user_id = (
    SELECT auth.users.id 
    FROM auth.users 
    LEFT JOIN user_profiles ON auth.users.id = user_profiles.user_id
    ORDER BY auth.users.created_at ASC 
    LIMIT 1
);

-- Alternative: Assign admin role to specific email (uncomment and replace email)
-- UPDATE user_profiles 
-- SET role = 'super_admin' 
-- WHERE user_id = (
--     SELECT id FROM auth.users 
--     WHERE email = 'your-email@example.com'
-- );

-- STEP 7: Verify the results
SELECT 
    auth.users.email,
    user_profiles.role,
    user_profiles.first_name,
    user_profiles.last_name
FROM auth.users
JOIN user_profiles ON auth.users.id = user_profiles.user_id
ORDER BY user_profiles.role DESC, auth.users.created_at; 