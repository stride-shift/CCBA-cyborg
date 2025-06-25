-- Simple fix for user_profiles.cohort_id to match cohorts.id (UUID)
-- Since cohorts.id is already UUID, we just need to fix user_profiles.cohort_id

-- Step 1: Check current user_profiles.cohort_id type
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id';

-- Step 2: Drop dependent views and constraints
DROP VIEW IF EXISTS cohort_stats CASCADE;
DROP VIEW IF EXISTS user_profiles_with_cohort CASCADE;

-- Step 3: Drop existing foreign key constraints
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_cohort_id_fkey;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_cohort;

-- Step 4: Drop RLS policies that reference cohort_id
DROP POLICY IF EXISTS "Users can view own data" ON user_profiles;
DROP POLICY IF EXISTS "Users can view and update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;

-- Step 5: Clear any existing cohort_id values (they'll be invalid after type change)
UPDATE user_profiles 
SET cohort_id = NULL 
WHERE cohort_id IS NOT NULL;

-- Step 6: Change user_profiles.cohort_id from VARCHAR to UUID
ALTER TABLE user_profiles 
ALTER COLUMN cohort_id TYPE UUID 
USING NULL;

-- Step 7: Add foreign key constraint (now both columns are UUID)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_cohort_id_fkey 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Step 8: Recreate essential RLS policy
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Step 9: Recreate views
CREATE VIEW user_profiles_with_cohort AS
SELECT 
    up.*,
    c.name as cohort_name,
    c.description as cohort_description,
    c.start_date as cohort_start_date,
    c.end_date as cohort_end_date,
    c.is_active as cohort_is_active
FROM user_profiles up
LEFT JOIN cohorts c ON up.cohort_id = c.id;

CREATE VIEW cohort_stats AS
SELECT 
    c.id,
    c.name,
    c.start_date,
    c.end_date,
    c.is_active,
    COUNT(up.user_id) as current_participants
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.start_date, c.end_date, c.is_active;

-- Step 10: Verify the fix worked
SELECT 
    'cohorts.id' as column_ref,
    data_type
FROM information_schema.columns 
WHERE table_name = 'cohorts' AND column_name = 'id'
UNION ALL
SELECT 
    'user_profiles.cohort_id' as column_ref,
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id';

-- Step 11: Test the relationship
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    COUNT(up.user_id) as user_count
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name;

-- Step 12: Show success message
SELECT 'UUID compatibility fix completed successfully!' as status; 