-- Enhance cohorts table with all missing columns and fix user_profiles relationship
-- Run this in your Supabase SQL editor

-- Step 1: Check current cohorts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'cohorts'
ORDER BY ordinal_position;

-- Step 2: Add missing columns to cohorts table
-- Status and management fields
ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' 
CHECK (status IN ('draft', 'enrolling', 'active', 'completed', 'cancelled'));

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 25;

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255) DEFAULT 'Cyborg Habit Co.';

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS facilitator_id UUID REFERENCES auth.users(id);

-- Cohort type and scheduling
ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS cohort_type VARCHAR(20) DEFAULT 'standard'
CHECK (cohort_type IN ('standard', 'accelerated', 'beginner', 'advanced', 'custom'));

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS enrollment_start_date DATE;

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS enrollment_end_date DATE;

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Program details
ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS duration_weeks INTEGER DEFAULT 12;

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS meeting_schedule TEXT;

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS completion_criteria TEXT DEFAULT 'Complete all weekly challenges and reflections';

-- Metadata
ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS tags TEXT[];

ALTER TABLE cohorts 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(100);

-- Step 3: Update existing cohorts with reasonable defaults
UPDATE cohorts SET 
    status = 'active',
    max_participants = 25,
    organization_name = 'Cyborg Habit Co.',
    cohort_type = 'standard',
    enrollment_start_date = start_date - INTERVAL '2 weeks',
    enrollment_end_date = start_date - INTERVAL '1 day',
    timezone = 'UTC',
    duration_weeks = EXTRACT(WEEK FROM (end_date - start_date))::INTEGER,
    meeting_schedule = 'Weekly check-ins and daily challenges',
    completion_criteria = 'Complete all weekly challenges and reflections',
    tags = ARRAY['habit-formation', 'personal-development']
WHERE id IS NOT NULL;

-- Step 4: Now fix the user_profiles.cohort_id relationship
-- Drop dependent views and constraints
DROP VIEW IF EXISTS cohort_stats CASCADE;
DROP VIEW IF EXISTS user_profiles_with_cohort CASCADE;

-- Drop existing foreign key constraints
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_cohort_id_fkey;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_cohort;

-- Drop RLS policies that reference cohort_id
DROP POLICY IF EXISTS "Users can view own data" ON user_profiles;
DROP POLICY IF EXISTS "Users can view and update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;

-- Clear any existing cohort_id values (they'll be invalid after type change)
UPDATE user_profiles 
SET cohort_id = NULL 
WHERE cohort_id IS NOT NULL;

-- Change user_profiles.cohort_id from VARCHAR to UUID
ALTER TABLE user_profiles 
ALTER COLUMN cohort_id TYPE UUID 
USING NULL;

-- Add foreign key constraint (now both columns are UUID)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_cohort_id_fkey 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Step 5: Recreate essential RLS policies
-- Cohorts policies
CREATE POLICY "Anyone can view cohorts" ON cohorts
    FOR SELECT USING (true);

-- User profiles policies
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Step 6: Recreate enhanced views
CREATE VIEW user_profiles_with_cohort AS
SELECT 
    up.*,
    c.name as cohort_name,
    c.description as cohort_description,
    c.start_date as cohort_start_date,
    c.end_date as cohort_end_date,
    c.status as cohort_status,
    c.cohort_type,
    c.organization_name,
    c.is_active as cohort_is_active
FROM user_profiles up
LEFT JOIN cohorts c ON up.cohort_id = c.id;

CREATE VIEW cohort_stats AS
SELECT 
    c.id,
    c.name,
    c.description,
    c.start_date,
    c.end_date,
    c.status,
    c.cohort_type,
    c.max_participants,
    COUNT(up.user_id) as current_participants,
    ROUND(
        (COUNT(up.user_id)::DECIMAL / NULLIF(c.max_participants, 0)) * 100, 
        2
    ) as fill_percentage,
    c.facilitator_id,
    c.organization_name,
    c.duration_weeks,
    c.is_active
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.description, c.start_date, c.end_date, c.status, 
         c.cohort_type, c.max_participants, c.facilitator_id, c.organization_name, 
         c.duration_weeks, c.is_active;

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts(status);
CREATE INDEX IF NOT EXISTS idx_cohorts_type ON cohorts(cohort_type);
CREATE INDEX IF NOT EXISTS idx_cohorts_start_date ON cohorts(start_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_cohort_id ON user_profiles(cohort_id);

-- Step 8: Verify the enhanced table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cohorts'
ORDER BY ordinal_position;

-- Step 9: Show enhanced cohort data
SELECT id, name, status, cohort_type, max_participants, current_participants, fill_percentage
FROM cohort_stats;

-- Step 10: Test the relationship works
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    c.status,
    c.cohort_type,
    COUNT(up.user_id) as user_count
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.status, c.cohort_type;

-- Step 11: Show success message
SELECT 'Cohorts table enhanced and user_profiles relationship fixed!' as status; 