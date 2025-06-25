-- Clean rebuild of cohorts table and user_profiles relationship
-- Run this in your Supabase SQL editor

-- Step 1: Drop all dependent objects first
DROP VIEW IF EXISTS cohort_stats CASCADE;
DROP VIEW IF EXISTS user_profiles_with_cohort CASCADE;

-- Drop foreign key constraints
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_cohort_id_fkey;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_cohort;

-- Step 2: Drop existing cohorts table completely
DROP TABLE IF EXISTS cohorts CASCADE;

-- Step 3: Create comprehensive cohorts table from scratch
CREATE TABLE cohorts (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Dates
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    enrollment_start_date DATE,
    enrollment_end_date DATE,
    
    -- Status and management
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'enrolling', 'active', 'completed', 'cancelled')),
    is_active BOOLEAN DEFAULT true,
    max_participants INTEGER DEFAULT 25,
    organization_name VARCHAR(255) DEFAULT 'Cyborg Habit Co.',
    
    -- Cohort type and details
    cohort_type VARCHAR(20) DEFAULT 'standard' CHECK (cohort_type IN ('standard', 'accelerated', 'beginner', 'advanced', 'custom')),
    duration_weeks INTEGER DEFAULT 12,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Program details
    meeting_schedule TEXT,
    completion_criteria TEXT DEFAULT 'Complete all weekly challenges and reflections',
    
    -- Management
    facilitator_id UUID REFERENCES auth.users(id),
    
    -- Metadata
    tags TEXT[],
    external_id VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Insert sample cohort data
INSERT INTO cohorts (
    name, 
    description, 
    start_date, 
    end_date, 
    status, 
    max_participants, 
    cohort_type,
    enrollment_start_date,
    enrollment_end_date,
    duration_weeks,
    meeting_schedule,
    tags
) VALUES 
(
    'Spring 2024 Cohort', 
    'Foundational habits program for building lasting change', 
    '2024-03-01'::date, 
    '2024-05-31'::date, 
    'active', 
    25, 
    'standard',
    '2024-02-15'::date,
    '2024-02-28'::date,
    12,
    'Weekly check-ins every Tuesday at 7 PM EST',
    ARRAY['habit-formation', 'personal-development', 'spring-2024']
),
(
    'Summer 2024 Accelerated', 
    'Intensive 6-week program for rapid habit formation', 
    '2024-06-01'::date, 
    '2024-07-15'::date, 
    'enrolling', 
    15, 
    'accelerated',
    '2024-05-01'::date,
    '2024-05-25'::date,
    6,
    'Bi-weekly intensive sessions and daily check-ins',
    ARRAY['habit-formation', 'intensive', 'summer-2024']
),
(
    'Fall 2024 Beginner', 
    'Gentle introduction to habit formation for newcomers', 
    '2024-09-01'::date, 
    '2024-11-30'::date, 
    'draft', 
    30, 
    'beginner',
    '2024-08-01'::date,
    '2024-08-25'::date,
    12,
    'Weekly supportive group sessions',
    ARRAY['habit-formation', 'beginner-friendly', 'fall-2024']
);

-- Step 5: Fix user_profiles.cohort_id to be UUID and add foreign key
-- Clear existing cohort_id values
UPDATE user_profiles SET cohort_id = NULL WHERE cohort_id IS NOT NULL;

-- Change cohort_id to UUID type if it's not already
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'cohort_id' AND data_type != 'uuid'
    ) THEN
        ALTER TABLE user_profiles ALTER COLUMN cohort_id TYPE UUID USING NULL;
    END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_cohort_id_fkey 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Step 6: Configure RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view cohorts" ON cohorts;
DROP POLICY IF EXISTS "Cohorts are viewable by everyone" ON cohorts;
DROP POLICY IF EXISTS "Users can view cohorts" ON cohorts;
DROP POLICY IF EXISTS "Admins can manage cohorts" ON cohorts;
DROP POLICY IF EXISTS "Authenticated users can view cohorts" ON cohorts;

-- User profiles policies  
DROP POLICY IF EXISTS "Users can view own data" ON user_profiles;
DROP POLICY IF EXISTS "Users can view and update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON user_profiles;

-- Enable RLS
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

-- Create cohorts policies
CREATE POLICY "Authenticated users can view cohorts" ON cohorts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage cohorts" ON cohorts
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE role IN ('admin', 'super_admin')
        )
    );

-- User profiles policy
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Step 7: Create enhanced views
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
    c.is_active as cohort_is_active,
    c.enrollment_start_date,
    c.enrollment_end_date,
    c.max_participants as cohort_max_participants
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
    c.meeting_schedule,
    c.enrollment_start_date,
    c.enrollment_end_date,
    c.is_active,
    c.tags,
    c.created_at,
    c.updated_at
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.description, c.start_date, c.end_date, c.status, 
         c.cohort_type, c.max_participants, c.facilitator_id, c.organization_name, 
         c.duration_weeks, c.meeting_schedule, c.enrollment_start_date, c.enrollment_end_date,
         c.is_active, c.tags, c.created_at, c.updated_at;

-- Step 8: Create indexes for performance
CREATE INDEX idx_cohorts_status ON cohorts(status);
CREATE INDEX idx_cohorts_type ON cohorts(cohort_type);
CREATE INDEX idx_cohorts_start_date ON cohorts(start_date);
CREATE INDEX idx_cohorts_active ON cohorts(is_active);
CREATE INDEX idx_user_profiles_cohort_id ON user_profiles(cohort_id);

-- Step 9: Create updated_at trigger for cohorts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cohorts_updated_at 
    BEFORE UPDATE ON cohorts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Verify everything worked
SELECT 'Checking cohorts table structure...' as step;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cohorts'
ORDER BY ordinal_position;

SELECT 'Checking user_profiles.cohort_id type...' as step;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'cohort_id';

SELECT 'Checking RLS status...' as step;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('cohorts', 'user_profiles');

SELECT 'Checking policies...' as step;
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('cohorts', 'user_profiles')
ORDER BY tablename, policyname;

SELECT 'Showing sample cohort data...' as step;
SELECT id, name, status, cohort_type, max_participants, current_participants, fill_percentage
FROM cohort_stats;

SELECT 'Testing relationship...' as step;
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    c.status,
    c.cohort_type,
    COUNT(up.user_id) as user_count
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.status, c.cohort_type
ORDER BY c.name;

SELECT 'SUCCESS: Cohorts table rebuilt with full functionality!' as status; 