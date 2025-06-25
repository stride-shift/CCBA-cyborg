-- Bulk create users using service role permissions
-- Run this in Supabase SQL editor with service role permissions

-- Step 1: Check existing auth.users structure
SELECT 'Checking auth.users table structure...' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'auth' AND table_name = 'users' 
ORDER BY ordinal_position;

-- Step 2: Create test users only if they don't exist
DO $$
DECLARE
    user_emails TEXT[] := ARRAY[
        'testuser1@example.com',
        'testuser2@example.com', 
        'testuser3@example.com',
        'testuser4@example.com',
        'testuser5@example.com',
        'testuser6@example.com',
        'testuser7@example.com',
        'testuser8@example.com',
        'testuser9@example.com',
        'testuser10@example.com'
    ];
    email_to_create TEXT;
BEGIN
    FOREACH email_to_create IN ARRAY user_emails
    LOOP
        -- Only create if user doesn't exist
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = email_to_create) THEN
            INSERT INTO auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                created_at,
                updated_at,
                aud,
                role
            ) VALUES (
                gen_random_uuid(),
                '00000000-0000-0000-0000-000000000000',
                email_to_create,
                crypt('password123', gen_salt('bf')),
                NOW(),
                NOW(),
                NOW(),
                'authenticated',
                'authenticated'
            );
            RAISE NOTICE 'Created user: %', email_to_create;
        ELSE
            RAISE NOTICE 'User already exists: %', email_to_create;
        END IF;
    END LOOP;
END $$;

-- Step 3: Create corresponding user profiles
INSERT INTO user_profiles (user_id, role, first_name, last_name, organization_name)
SELECT 
    au.id,
    'user',
    'Test',
    'User ' || ROW_NUMBER() OVER (ORDER BY au.email),
    'Cyborg Habit Co.'
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
WHERE au.email LIKE 'testuser%@example.com' AND up.user_id IS NULL;

-- Step 4: Show created users
SELECT 'Created users:' as info;
SELECT 
    au.email,
    up.first_name,
    up.last_name,
    up.role,
    up.organization_name
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
WHERE au.email LIKE 'testuser%@example.com'
ORDER BY au.email;

-- Step 5: Show total counts
SELECT 'Summary:' as info;
SELECT 
    'Total auth users' as metric,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    'Total user profiles' as metric,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'Test users created' as metric,
    COUNT(*) as count
FROM auth.users
WHERE email LIKE 'testuser%@example.com';

SELECT 'Bulk user creation completed!' as status; 