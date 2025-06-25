-- Admin-Cohort Management System
-- Creates proper multi-cohort admin access and analytics

-- Step 0: Check what tables exist
SELECT 'Checking existing tables...' as status;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename IN ('cohorts', 'user_profiles', 'admin_cohort_assignments')
ORDER BY tablename;

SELECT 'Checking existing views...' as status;
SELECT schemaname, viewname 
FROM pg_views 
WHERE viewname IN ('cohort_analytics', 'admin_dashboard_summary', 'user_profiles_with_cohort')
ORDER BY viewname;

-- Step 1: Create admin_cohort_assignments table (many-to-many)
CREATE TABLE IF NOT EXISTS admin_cohort_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES auth.users(id),
    permissions TEXT[] DEFAULT ARRAY['view', 'manage_users'], -- ['view', 'manage_users', 'edit_cohort', 'delete_cohort']
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure unique admin-cohort pairs
    UNIQUE(admin_user_id, cohort_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_cohort_admin ON admin_cohort_assignments(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_cohort_cohort ON admin_cohort_assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_admin_cohort_active ON admin_cohort_assignments(is_active);

-- Step 3: Enable RLS on admin_cohort_assignments
ALTER TABLE admin_cohort_assignments ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies for admin_cohort_assignments
-- Super admins can manage all assignments
DROP POLICY IF EXISTS "Super admins can manage all assignments" ON admin_cohort_assignments;
CREATE POLICY "Super admins can manage all assignments" ON admin_cohort_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Admins can view their own assignments
DROP POLICY IF EXISTS "Admins can view own assignments" ON admin_cohort_assignments;
CREATE POLICY "Admins can view own assignments" ON admin_cohort_assignments
    FOR SELECT USING (
        admin_user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Step 5: Check cohorts table structure
SELECT 'Cohorts table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cohorts' 
ORDER BY ordinal_position;

-- Step 5a: Enhanced cohort analytics view (with error handling)
DROP VIEW IF EXISTS cohort_analytics CASCADE;
CREATE VIEW cohort_analytics AS
SELECT 
    c.id,
    c.name,
    c.description,
    COALESCE(c.organization_name, 'Unknown') as organization_name,
    c.start_date,
    c.end_date,
    COALESCE(c.status, 'unknown') as status,
    COALESCE(c.cohort_type, 'standard') as cohort_type,
    COALESCE(c.max_participants, 0) as max_participants,
    COALESCE(c.duration_weeks, 0) as duration_weeks,
    c.enrollment_start_date,
    c.enrollment_end_date,
    COALESCE(c.is_active, true) as is_active,
    c.tags,
    c.facilitator_id,
    facilitator.email as facilitator_email,
    facilitator_profile.first_name as facilitator_first_name,
    facilitator_profile.last_name as facilitator_last_name,
    
    -- Participant metrics
    COUNT(DISTINCT up.user_id) as current_participants,
    ROUND(
        (COUNT(DISTINCT up.user_id)::DECIMAL / NULLIF(COALESCE(c.max_participants, 0), 0)) * 100, 
        2
    ) as fill_percentage,
    
    -- Calculate days metrics
    CASE 
        WHEN c.start_date > CURRENT_DATE THEN 'Not Started'
        WHEN c.end_date < CURRENT_DATE THEN 'Completed'
        ELSE 'Active'
    END as current_status,
    
    GREATEST(0, c.start_date - CURRENT_DATE) as days_until_start,
    GREATEST(0, CURRENT_DATE - c.start_date) as days_since_start,
    GREATEST(0, c.end_date - CURRENT_DATE) as days_until_end,
    
    -- Progress calculation (rough estimate)
    CASE 
        WHEN c.start_date > CURRENT_DATE THEN 0
        WHEN c.end_date < CURRENT_DATE THEN 100
        ELSE ROUND(
            ((CURRENT_DATE - c.start_date)::DECIMAL / NULLIF(c.end_date - c.start_date, 0)) * 100,
            1
        )
    END as progress_percentage,
    
    -- Admin assignments
    ARRAY_AGG(DISTINCT admin_users.email) FILTER (WHERE admin_assignments.is_active = true) as assigned_admins,
    COUNT(DISTINCT admin_assignments.admin_user_id) FILTER (WHERE admin_assignments.is_active = true) as admin_count,
    
    c.created_at,
    c.updated_at

FROM cohorts c
LEFT JOIN user_profiles up ON c.id = up.cohort_id
LEFT JOIN auth.users facilitator ON c.facilitator_id = facilitator.id
LEFT JOIN user_profiles facilitator_profile ON c.facilitator_id = facilitator_profile.user_id
LEFT JOIN admin_cohort_assignments admin_assignments ON c.id = admin_assignments.cohort_id AND admin_assignments.is_active = true
LEFT JOIN auth.users admin_users ON admin_assignments.admin_user_id = admin_users.id

GROUP BY 
    c.id, c.name, c.description, c.organization_name, c.start_date, c.end_date, 
    c.status, c.cohort_type, c.max_participants, c.duration_weeks, 
    c.enrollment_start_date, c.enrollment_end_date, c.is_active, c.tags, 
    c.facilitator_id, facilitator.email, facilitator_profile.first_name, 
    facilitator_profile.last_name, c.created_at, c.updated_at;

-- Step 5b: Test cohort_analytics view
SELECT 'Testing cohort_analytics view...' as info;
SELECT COUNT(*) as cohort_count FROM cohort_analytics;

-- Step 6: Admin dashboard summary view
DROP VIEW IF EXISTS admin_dashboard_summary CASCADE;
CREATE VIEW admin_dashboard_summary AS
WITH org_admin_emails AS (
    SELECT 
        organization_name,
        admin_email
    FROM (
        SELECT 
            ca.organization_name,
            unnest(ca.assigned_admins) as admin_email
        FROM cohort_analytics ca
        WHERE ca.organization_name IS NOT NULL
        AND ca.assigned_admins IS NOT NULL
    ) admin_unnest
    WHERE admin_email IS NOT NULL
    GROUP BY organization_name, admin_email
)
SELECT 
    -- Organization-level metrics
    ca.organization_name,
    COUNT(DISTINCT ca.id) as total_cohorts,
    COUNT(DISTINCT CASE WHEN ca.current_status = 'Active' THEN ca.id END) as active_cohorts,
    COUNT(DISTINCT CASE WHEN ca.current_status = 'Not Started' THEN ca.id END) as upcoming_cohorts,
    COUNT(DISTINCT CASE WHEN ca.current_status = 'Completed' THEN ca.id END) as completed_cohorts,
    
    SUM(ca.current_participants) as total_participants,
    SUM(ca.max_participants) as total_capacity,
    ROUND(
        (SUM(ca.current_participants)::DECIMAL / NULLIF(SUM(ca.max_participants), 0)) * 100, 
        2
    ) as overall_fill_percentage,
    
    -- Averages
    ROUND(AVG(ca.current_participants), 1) as avg_participants_per_cohort,
    ROUND(AVG(ca.fill_percentage), 1) as avg_fill_percentage,
    ROUND(AVG(ca.duration_weeks), 1) as avg_duration_weeks,
    
    -- Date ranges
    MIN(ca.start_date) as earliest_start_date,
    MAX(ca.end_date) as latest_end_date,
    
    -- Admin assignments - fixed approach
    COALESCE(oae.unique_admins_assigned, 0) as unique_admins_assigned

FROM cohort_analytics ca
LEFT JOIN (
    SELECT 
        organization_name,
        COUNT(DISTINCT admin_email) as unique_admins_assigned
    FROM org_admin_emails
    GROUP BY organization_name
) oae ON ca.organization_name = oae.organization_name
WHERE ca.organization_name IS NOT NULL
GROUP BY ca.organization_name, oae.unique_admins_assigned;

-- Step 7: User cohort access view (enhanced user_profiles_with_cohort)
DROP VIEW IF EXISTS user_profiles_with_cohort CASCADE;
CREATE VIEW user_profiles_with_cohort AS
SELECT 
    up.*,
    ca.name as cohort_name,
    ca.description as cohort_description,
    ca.start_date as cohort_start_date,
    ca.end_date as cohort_end_date,
    ca.status as cohort_status,
    ca.cohort_type,
    ca.organization_name as cohort_organization_name,
    ca.is_active as cohort_is_active,
    ca.enrollment_start_date,
    ca.enrollment_end_date,
    ca.max_participants as cohort_max_participants,
    ca.current_participants,
    ca.fill_percentage,
    ca.current_status,
    ca.progress_percentage,
    ca.facilitator_email,
    ca.facilitator_first_name,
    ca.facilitator_last_name
FROM user_profiles up
LEFT JOIN cohort_analytics ca ON up.cohort_id = ca.id;

-- Step 8: Enhanced RLS policies for cohort_analytics view
-- Note: Views inherit RLS from underlying tables, but we need to control access

-- Super admins see everything
-- Regular admins see only their assigned cohorts + their organization's cohorts
-- Users see only their own cohort info

-- Step 9: Helper functions for admin cohort access
CREATE OR REPLACE FUNCTION user_can_access_cohort(cohort_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admin access
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Admin with specific cohort assignment
    IF EXISTS (
        SELECT 1 FROM admin_cohort_assignments 
        WHERE admin_user_id = auth.uid() 
        AND cohort_id = cohort_uuid 
        AND is_active = true
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Admin from same organization
    IF EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN cohorts c ON c.organization_name = up.organization_name
        WHERE up.user_id = auth.uid() 
        AND up.role IN ('admin', 'super_admin')
        AND c.id = cohort_uuid
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- User's own cohort
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND cohort_id = cohort_uuid
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Insert sample admin assignments for testing
-- Assign super_admins to manage all cohorts
INSERT INTO admin_cohort_assignments (admin_user_id, cohort_id, permissions, assigned_by)
SELECT 
    up.user_id,
    c.id,
    ARRAY['view', 'manage_users', 'edit_cohort', 'delete_cohort'],
    up.user_id -- self-assigned for setup
FROM user_profiles up
CROSS JOIN cohorts c
WHERE up.role = 'super_admin'
ON CONFLICT (admin_user_id, cohort_id) DO NOTHING;

-- Step 11: Create summary of what was created
SELECT 'Database objects created successfully!' as status;

SELECT 'Admin Cohort Assignments' as table_name, COUNT(*) as records
FROM admin_cohort_assignments
UNION ALL
SELECT 'Cohorts Total' as table_name, COUNT(*) as records
FROM cohorts
UNION ALL
SELECT 'Users with Profiles' as table_name, COUNT(*) as records
FROM user_profiles;

-- Show sample admin assignments
SELECT 'Sample Admin Assignments' as info;
SELECT 
    au.email as admin_email,
    c.name as cohort_name,
    c.organization_name,
    aca.permissions,
    aca.assigned_at
FROM admin_cohort_assignments aca
JOIN auth.users au ON aca.admin_user_id = au.id
JOIN cohorts c ON aca.cohort_id = c.id
WHERE aca.is_active = true
ORDER BY au.email, c.name; 