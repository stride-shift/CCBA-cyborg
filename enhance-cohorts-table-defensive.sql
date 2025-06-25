-- Enhance cohorts table with all missing columns and fix user_profiles relationship (DEFENSIVE VERSION)
-- Run this in your Supabase SQL editor

-- Step 1: Check current cohorts table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'cohorts'
ORDER BY ordinal_position;

-- Step 2: Add missing columns to cohorts table (one by one)
DO $$
BEGIN
    -- Status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'status') THEN
        ALTER TABLE cohorts ADD COLUMN status VARCHAR(20) DEFAULT 'draft';
        ALTER TABLE cohorts ADD CONSTRAINT chk_cohorts_status CHECK (status IN ('draft', 'enrolling', 'active', 'completed', 'cancelled'));
    END IF;
END $$;

DO $$
BEGIN
    -- Max participants
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'max_participants') THEN
        ALTER TABLE cohorts ADD COLUMN max_participants INTEGER DEFAULT 25;
    END IF;
END $$;

DO $$
BEGIN
    -- Organization name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'organization_name') THEN
        ALTER TABLE cohorts ADD COLUMN organization_name VARCHAR(255) DEFAULT 'Cyborg Habit Co.';
    END IF;
END $$;

DO $$
BEGIN
    -- Facilitator ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'facilitator_id') THEN
        ALTER TABLE cohorts ADD COLUMN facilitator_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

DO $$
BEGIN
    -- Cohort type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'cohort_type') THEN
        ALTER TABLE cohorts ADD COLUMN cohort_type VARCHAR(20) DEFAULT 'standard';
        ALTER TABLE cohorts ADD CONSTRAINT chk_cohorts_type CHECK (cohort_type IN ('standard', 'accelerated', 'beginner', 'advanced', 'custom'));
    END IF;
END $$;

DO $$
BEGIN
    -- Enrollment start date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'enrollment_start_date') THEN
        ALTER TABLE cohorts ADD COLUMN enrollment_start_date DATE;
    END IF;
END $$;

DO $$
BEGIN
    -- Enrollment end date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'enrollment_end_date') THEN
        ALTER TABLE cohorts ADD COLUMN enrollment_end_date DATE;
    END IF;
END $$;

DO $$
BEGIN
    -- Timezone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'timezone') THEN
        ALTER TABLE cohorts ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
    END IF;
END $$;

DO $$
BEGIN
    -- Duration weeks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'duration_weeks') THEN
        ALTER TABLE cohorts ADD COLUMN duration_weeks INTEGER DEFAULT 12;
    END IF;
END $$;

DO $$
BEGIN
    -- Meeting schedule
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'meeting_schedule') THEN
        ALTER TABLE cohorts ADD COLUMN meeting_schedule TEXT;
    END IF;
END $$;

DO $$
BEGIN
    -- Completion criteria
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'completion_criteria') THEN
        ALTER TABLE cohorts ADD COLUMN completion_criteria TEXT DEFAULT 'Complete all weekly challenges and reflections';
    END IF;
END $$;

DO $$
BEGIN
    -- Tags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'tags') THEN
        ALTER TABLE cohorts ADD COLUMN tags TEXT[];
    END IF;
END $$;

DO $$
BEGIN
    -- External ID
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'external_id') THEN
        ALTER TABLE cohorts ADD COLUMN external_id VARCHAR(100);
    END IF;
END $$;

-- Step 3: Update existing cohorts with reasonable defaults (defensive updates)
-- Update each column conditionally

-- Status
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'status') THEN
        UPDATE cohorts SET status = 'active' WHERE status IS NULL;
    END IF;
END $$;

-- Max participants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'max_participants') THEN
        UPDATE cohorts SET max_participants = 25 WHERE max_participants IS NULL;
    END IF;
END $$;

-- Organization name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'organization_name') THEN
        UPDATE cohorts SET organization_name = 'Cyborg Habit Co.' WHERE organization_name IS NULL;
    END IF;
END $$;

-- Cohort type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'cohort_type') THEN
        UPDATE cohorts SET cohort_type = 'standard' WHERE cohort_type IS NULL;
    END IF;
END $$;

-- Enrollment dates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'enrollment_start_date') THEN
        UPDATE cohorts SET enrollment_start_date = start_date - INTERVAL '2 weeks' WHERE enrollment_start_date IS NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'enrollment_end_date') THEN
        UPDATE cohorts SET enrollment_end_date = start_date - INTERVAL '1 day' WHERE enrollment_end_date IS NULL;
    END IF;
END $$;

-- Timezone
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'timezone') THEN
        UPDATE cohorts SET timezone = 'UTC' WHERE timezone IS NULL;
    END IF;
END $$;

-- Duration weeks
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'duration_weeks') THEN
        UPDATE cohorts SET duration_weeks = CASE 
            WHEN end_date IS NOT NULL AND start_date IS NOT NULL 
            THEN CEIL((end_date - start_date) / 7.0)::INTEGER
            ELSE 12 
        END WHERE duration_weeks IS NULL;
    END IF;
END $$;

-- Meeting schedule
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'meeting_schedule') THEN
        UPDATE cohorts SET meeting_schedule = 'Weekly check-ins and daily challenges' WHERE meeting_schedule IS NULL;
    END IF;
END $$;

-- Completion criteria
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'completion_criteria') THEN
        UPDATE cohorts SET completion_criteria = 'Complete all weekly challenges and reflections' WHERE completion_criteria IS NULL;
    END IF;
END $$;

-- Tags
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohorts' AND column_name = 'tags') THEN
        UPDATE cohorts SET tags = ARRAY['habit-formation', 'personal-development'] WHERE tags IS NULL;
    END IF;
END $$;

-- Step 4: Now fix the user_profiles.cohort_id relationship
-- Drop dependent views and constraints
DROP VIEW IF EXISTS cohort_stats CASCADE;
DROP VIEW IF EXISTS user_profiles_with_cohort CASCADE;

-- Drop existing foreign key constraints
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_cohort_id_fkey;

ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS fk_user_profiles_cohort;

-- Step 5: Handle RLS policies
-- Drop ALL existing policies on both tables to avoid conflicts
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

-- Step 6: Fix user_profiles.cohort_id type if needed
DO $$
BEGIN
    -- Check if cohort_id is already UUID type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' AND column_name = 'cohort_id' AND data_type != 'uuid'
    ) THEN
        -- Clear any existing cohort_id values (they'll be invalid after type change)
        UPDATE user_profiles SET cohort_id = NULL WHERE cohort_id IS NOT NULL;
        
        -- Change user_profiles.cohort_id from VARCHAR to UUID
        ALTER TABLE user_profiles ALTER COLUMN cohort_id TYPE UUID USING NULL;
    END IF;
END $$;

-- Add foreign key constraint (now both columns are UUID)
ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_cohort_id_fkey 
FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE SET NULL;

-- Step 7: Configure RLS
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cohorts" ON cohorts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage cohorts" ON cohorts
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM user_profiles 
            WHERE role IN ('admin', 'super_admin')
        )
    );

-- User profiles policies (always needed)
CREATE POLICY "Users can view and update own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Step 8: Recreate enhanced views
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

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts(status);
CREATE INDEX IF NOT EXISTS idx_cohorts_type ON cohorts(cohort_type);
CREATE INDEX IF NOT EXISTS idx_cohorts_start_date ON cohorts(start_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_cohort_id ON user_profiles(cohort_id);

-- Step 10: Verify the enhanced table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cohorts'
ORDER BY ordinal_position;

-- Step 11: Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('cohorts', 'user_profiles');

-- Step 12: Show policies
SELECT tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('cohorts', 'user_profiles')
ORDER BY tablename, policyname;

-- Step 13: Show enhanced cohort data
SELECT id, name, status, cohort_type, max_participants, current_participants, fill_percentage
FROM cohort_stats;

-- Step 14: Test the relationship works
SELECT 
    c.id as cohort_id,
    c.name as cohort_name,
    c.status,
    c.cohort_type,
    COUNT(up.user_id) as user_count
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
GROUP BY c.id, c.name, c.status, c.cohort_type;

-- Step 15: Show success message
SELECT 'Cohorts table enhanced and user_profiles relationship fixed!' as status; 