-- Check current user_profiles table structure and see if email is available
SELECT 'User Profiles Table Structure' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;

-- Check if user_profiles_with_cohort view includes email
SELECT 'User Profiles With Cohort View Structure' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles_with_cohort' 
ORDER BY ordinal_position;

-- Sample of actual data to see what's available
SELECT 'Sample User Profiles Data' as info;
SELECT user_id, first_name, last_name, role, cohort_id 
FROM user_profiles 
LIMIT 3;

-- Check if we can create a secure function to get emails
-- This function will use SECURITY DEFINER to access auth.users
CREATE OR REPLACE FUNCTION get_user_emails_for_cohort(target_cohort_id UUID)
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
    SELECT 
        up.user_id,
        au.email,
        up.first_name,
        up.last_name,
        up.role,
        up.created_at
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
    WHERE up.cohort_id = target_cohort_id
    ORDER BY up.first_name;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails_for_cohort(UUID) TO authenticated;

-- Test the function
SELECT 'Testing email function with first cohort' as info;
SELECT * FROM get_user_emails_for_cohort(
    (SELECT id FROM cohorts LIMIT 1)
) LIMIT 5; 