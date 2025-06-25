-- Create Cohorts Table for Cyborg Habits
-- Run this in your Supabase SQL editor

-- Create the cohorts table
CREATE TABLE IF NOT EXISTS cohorts (
    -- Primary identifier
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic cohort information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scheduling
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    enrollment_start_date DATE,
    enrollment_end_date DATE,
    timezone VARCHAR(100) DEFAULT 'UTC',
    
    -- Capacity and participation
    max_participants INTEGER DEFAULT 50,
    
    -- Organization and management
    organization_name VARCHAR(255),
    facilitator_id UUID REFERENCES auth.users(id),
    
    -- Status and type
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'enrolling', 'active', 'completed', 'cancelled')),
    cohort_type VARCHAR(50) DEFAULT 'standard' CHECK (cohort_type IN ('standard', 'accelerated', 'beginner', 'advanced', 'custom')),
    is_active BOOLEAN DEFAULT true,
    
    -- Program details
    program_duration_days INTEGER DEFAULT 15,
    meeting_schedule TEXT, -- e.g., "Mondays 2pm UTC" or "Self-paced"
    completion_criteria TEXT DEFAULT 'Complete all 15 days of challenges and reflections',
    
    -- Additional metadata
    tags TEXT[], -- For categorization and filtering
    external_id VARCHAR(255), -- For integration with external systems
    
    -- Constraints
    CONSTRAINT valid_dates CHECK (end_date >= start_date),
    CONSTRAINT valid_enrollment_dates CHECK (
        enrollment_start_date IS NULL OR 
        enrollment_end_date IS NULL OR 
        enrollment_end_date >= enrollment_start_date
    ),
    CONSTRAINT valid_max_participants CHECK (max_participants > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts(status);
CREATE INDEX IF NOT EXISTS idx_cohorts_organization ON cohorts(organization_name);
CREATE INDEX IF NOT EXISTS idx_cohorts_active ON cohorts(is_active);
CREATE INDEX IF NOT EXISTS idx_cohorts_dates ON cohorts(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_cohorts_facilitator ON cohorts(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_cohorts_enrollment ON cohorts(enrollment_start_date, enrollment_end_date);

-- Enable RLS
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can manage all cohorts
CREATE POLICY "Admins can manage all cohorts" ON cohorts
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Users can view cohorts they can join or are part of
CREATE POLICY "Users can view relevant cohorts" ON cohorts
    FOR SELECT TO authenticated 
    USING (
        is_active = true AND 
        status IN ('enrolling', 'active') AND
        (organization_name IS NULL OR 
         organization_name = (
             SELECT organization_name FROM user_profiles 
             WHERE user_id = auth.uid()
         ))
    );

-- Facilitators can manage their own cohorts
CREATE POLICY "Facilitators can manage own cohorts" ON cohorts
    FOR ALL TO authenticated 
    USING (facilitator_id = auth.uid());

-- Create a view for cohort statistics
CREATE VIEW cohort_stats AS
SELECT 
    c.id,
    c.name,
    c.start_date,
    c.end_date,
    c.status,
    c.max_participants,
    COUNT(up.user_id) as current_participants,
    ROUND(
        (COUNT(up.user_id)::DECIMAL / NULLIF(c.max_participants, 0)) * 100, 
        2
    ) as fill_percentage,
    c.facilitator_id,
    auth_users.email as facilitator_email
FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
LEFT JOIN auth.users auth_users ON c.facilitator_id = auth_users.id
GROUP BY c.id, c.name, c.start_date, c.end_date, c.status, c.max_participants, c.facilitator_id, auth_users.email;

-- Create a function to auto-update cohort status based on dates
CREATE OR REPLACE FUNCTION update_cohort_status()
RETURNS void AS $$
BEGIN
    -- Update to 'enrolling' if enrollment period has started
    UPDATE cohorts 
    SET status = 'enrolling', updated_at = NOW()
    WHERE status = 'draft' 
    AND enrollment_start_date <= CURRENT_DATE 
    AND (enrollment_end_date IS NULL OR enrollment_end_date >= CURRENT_DATE);
    
    -- Update to 'active' if start date has passed
    UPDATE cohorts 
    SET status = 'active', updated_at = NOW()
    WHERE status IN ('draft', 'enrolling') 
    AND start_date <= CURRENT_DATE;
    
    -- Update to 'completed' if end date has passed
    UPDATE cohorts 
    SET status = 'completed', updated_at = NOW()
    WHERE status = 'active' 
    AND end_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cohorts_updated_at 
    BEFORE UPDATE ON cohorts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample cohorts
INSERT INTO cohorts (
    name, 
    description, 
    start_date, 
    end_date, 
    enrollment_start_date,
    enrollment_end_date,
    status,
    organization_name,
    cohort_type,
    max_participants,
    meeting_schedule,
    tags
) VALUES 
(
    'Q1 2025 Cohort - StrideShift',
    'First quarter cohort for StrideShift team members focusing on AI collaboration habits',
    '2025-02-01',
    '2025-02-15',
    '2025-01-15',
    '2025-01-31',
    'enrolling',
    'StrideShift',
    'standard',
    25,
    'Self-paced with weekly check-ins on Fridays',
    ARRAY['Q1', 'StrideShift', 'standard']
),
(
    'Public Beta Cohort',
    'Open enrollment cohort for public beta testing',
    '2025-01-20',
    '2025-02-03',
    '2025-01-01',
    '2025-01-18',
    'active',
    NULL,
    'beginner',
    100,
    'Self-paced',
    ARRAY['beta', 'public', 'beginner']
),
(
    'Advanced Practitioners - D-Lab',
    'Advanced cohort for D-Lab team members with prior AI experience',
    '2025-02-15',
    '2025-03-01',
    '2025-02-01',
    '2025-02-13',
    'draft',
    'D-Lab',
    'advanced',
    15,
    'Mondays and Wednesdays 2pm UTC',
    ARRAY['advanced', 'D-Lab', 'experienced']
);

-- Verify the table and data
SELECT 
    name,
    status,
    start_date,
    end_date,
    max_participants,
    organization_name,
    cohort_type
FROM cohorts
ORDER BY start_date; 