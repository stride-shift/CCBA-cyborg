-- Simple diagnostics to see what data we have
-- Run these queries individually to diagnose the issue

-- Query 1: How many users total?
SELECT 'Total auth users' as info, COUNT(*) as count FROM auth.users;

-- Query 2: How many have profiles?
SELECT 'Users with profiles' as info, COUNT(*) as count FROM user_profiles;

-- Query 3: What cohorts exist?
SELECT 'Available cohorts' as info, id, name, max_participants FROM cohorts ORDER BY name;

-- Query 4: What users exist and their current status?
SELECT 
    au.email,
    COALESCE(up.first_name, 'NO_PROFILE') as first_name,
    COALESCE(up.role, 'NO_PROFILE') as role,
    CASE WHEN up.cohort_id IS NULL THEN 'NO_COHORT' ELSE 'HAS_COHORT' END as cohort_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
ORDER BY au.email
LIMIT 20;

-- Assign existing users to cohorts for testing
-- Since we can't create auth.users via SQL, we'll assign existing users to cohorts

-- Step 1: Show current status
SELECT 'Current user status:' as info;
SELECT 
    au.email,
    up.first_name,
    up.role,
    CASE WHEN up.cohort_id IS NULL THEN 'NO_COHORT' ELSE 'HAS_COHORT' END as cohort_status,
    c.name as current_cohort
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.user_id
LEFT JOIN cohorts c ON up.cohort_id = c.id
ORDER BY au.email;

-- Step 2: Show available cohorts
SELECT 'Available cohorts:' as info;
SELECT id, name, max_participants FROM cohorts ORDER BY name;

-- Step 3: Clear existing cohort assignments for testing
UPDATE user_profiles SET cohort_id = NULL WHERE role IN ('user', 'super_admin');

-- Step 4: Assign users to cohorts (including super_admins for testing)
DO $$
DECLARE
    spring_cohort_id UUID;
    test1_cohort_id UUID;  
    test2_cohort_id UUID;
    user_record RECORD;
    counter INTEGER := 0;
BEGIN
    -- Get cohort IDs
    SELECT id INTO spring_cohort_id FROM cohorts WHERE name LIKE '%Spring%' LIMIT 1;
    SELECT id INTO test1_cohort_id FROM cohorts WHERE name LIKE '%Test Cohort 1%' LIMIT 1;
    SELECT id INTO test2_cohort_id FROM cohorts WHERE name LIKE '%Test Cohort 2%' LIMIT 1;
    
    RAISE NOTICE 'Cohort IDs found:';
    RAISE NOTICE 'Spring: %', spring_cohort_id;
    RAISE NOTICE 'Test1: %', test1_cohort_id;
    RAISE NOTICE 'Test2: %', test2_cohort_id;
    
    -- Assign ALL users (including super_admins) to cohorts for testing
    FOR user_record IN 
        SELECT 
            up.user_id,
            au.email,
            up.role
        FROM user_profiles up
        JOIN auth.users au ON up.user_id = au.id
        WHERE up.cohort_id IS NULL
        ORDER BY au.email
    LOOP
        counter := counter + 1;
        
        -- Assign to different cohorts based on counter
        IF counter % 3 = 1 AND spring_cohort_id IS NOT NULL THEN
            UPDATE user_profiles SET cohort_id = spring_cohort_id WHERE user_id = user_record.user_id;
            RAISE NOTICE 'Assigned % (%) to Spring cohort', user_record.email, user_record.role;
        ELSIF counter % 3 = 2 AND test1_cohort_id IS NOT NULL THEN
            UPDATE user_profiles SET cohort_id = test1_cohort_id WHERE user_id = user_record.user_id;
            RAISE NOTICE 'Assigned % (%) to Test1 cohort', user_record.email, user_record.role;
        ELSIF test2_cohort_id IS NOT NULL THEN
            UPDATE user_profiles SET cohort_id = test2_cohort_id WHERE user_id = user_record.user_id;
            RAISE NOTICE 'Assigned % (%) to Test2 cohort', user_record.email, user_record.role;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Assigned % users to cohorts', counter;
END $$;

-- Step 5: Show final results
SELECT 'Final cohort assignments:' as info;
SELECT 
    c.name as cohort_name,
    c.max_participants,
    COUNT(up.user_id) as current_participants,
    ROUND((COUNT(up.user_id)::DECIMAL / NULLIF(c.max_participants, 0)) * 100, 1) as fill_percentage
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.max_participants
ORDER BY c.name;

-- Step 6: Show user assignments
SELECT 'User assignments:' as info;
SELECT 
    au.email,
    up.first_name,
    up.role,
    c.name as cohort_name
FROM auth.users au
JOIN user_profiles up ON au.id = up.user_id
LEFT JOIN cohorts c ON up.cohort_id = c.id
ORDER BY c.name, au.email;

SELECT 'Assignments completed!' as status; 