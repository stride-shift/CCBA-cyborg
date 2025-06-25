-- Add missing columns to cohorts table one by one
-- Run this after RLS is working

-- Step 1: Add basic management columns
ALTER TABLE cohorts ADD COLUMN max_participants INTEGER DEFAULT 25;
ALTER TABLE cohorts ADD COLUMN cohort_type VARCHAR(20) DEFAULT 'standard';
ALTER TABLE cohorts ADD COLUMN duration_weeks INTEGER DEFAULT 12;

-- Test after basic columns
SELECT 'Basic management columns added!' as status;
SELECT * FROM cohorts LIMIT 2;

-- Step 2: Add enrollment dates
ALTER TABLE cohorts ADD COLUMN enrollment_start_date DATE;
ALTER TABLE cohorts ADD COLUMN enrollment_end_date DATE;

-- Test after date columns
SELECT 'Enrollment date columns added!' as status;

-- Step 3: Add the potentially problematic column (organization_name)
ALTER TABLE cohorts ADD COLUMN organization_name VARCHAR(255) DEFAULT 'Cyborg Habit Co.';

-- Test after organization_name
SELECT 'Organization name column added!' as status;

-- Step 4: Add remaining columns
ALTER TABLE cohorts ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE cohorts ADD COLUMN meeting_schedule TEXT;
ALTER TABLE cohorts ADD COLUMN completion_criteria TEXT DEFAULT 'Complete all weekly challenges and reflections';
ALTER TABLE cohorts ADD COLUMN facilitator_id UUID REFERENCES auth.users(id);
ALTER TABLE cohorts ADD COLUMN tags TEXT[];
ALTER TABLE cohorts ADD COLUMN external_id VARCHAR(100);
ALTER TABLE cohorts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Step 5: Add constraints
ALTER TABLE cohorts ADD CONSTRAINT chk_cohorts_status CHECK (status IN ('draft', 'enrolling', 'active', 'completed', 'cancelled'));
ALTER TABLE cohorts ADD CONSTRAINT chk_cohorts_type CHECK (cohort_type IN ('standard', 'accelerated', 'beginner', 'advanced', 'custom'));

-- Step 6: Update existing data with new column values
UPDATE cohorts SET 
    enrollment_start_date = start_date - INTERVAL '2 weeks',
    enrollment_end_date = start_date - INTERVAL '1 day',
    duration_weeks = CEIL((end_date - start_date) / 7.0)::INTEGER;

-- Step 7: Create updated_at trigger
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

-- Step 8: Recreate enhanced view
DROP VIEW IF EXISTS cohort_stats;

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

-- Step 9: Add sample data with all columns
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
);

-- Step 10: Final verification
SELECT 'All columns added successfully!' as status;
SELECT * FROM cohort_stats; 