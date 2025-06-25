-- Add cohort-specific challenge functionality
-- This allows challenges to be either default (cohort_id = NULL) or cohort-specific

-- Step 1: Add cohort_id column to challenges table
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE;

-- Step 2: Add index for performance
CREATE INDEX IF NOT EXISTS idx_challenges_cohort_id ON challenges(cohort_id);
CREATE INDEX IF NOT EXISTS idx_challenges_cohort_order ON challenges(cohort_id, order_index);

-- Step 3: Add comments for clarity
COMMENT ON COLUMN challenges.cohort_id IS 'If NULL, challenge is default for all cohorts. If set, challenge is specific to that cohort.';

-- Step 4: Create function to get challenges for a user (prioritizing cohort-specific)
CREATE OR REPLACE FUNCTION get_challenge_for_user_day(
    user_cohort_id UUID,
    day_number INTEGER
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    challenge_1 TEXT,
    challenge_1_type TEXT,
    challenge_2 TEXT,
    challenge_2_type TEXT,
    reflection_question TEXT,
    intended_aha_moments TEXT[],
    title VARCHAR(255),
    order_index INTEGER,
    is_active BOOLEAN,
    cohort_id UUID,
    challenge_1_image_url TEXT,
    challenge_2_image_url TEXT,
    is_cohort_specific BOOLEAN
) AS $$
BEGIN
    -- First, try to get cohort-specific challenge
    IF user_cohort_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.created_at,
            c.updated_at,
            c.challenge_1,
            c.challenge_1_type,
            c.challenge_2,
            c.challenge_2_type,
            c.reflection_question,
            c.intended_aha_moments,
            c.title,
            c.order_index,
            c.is_active,
            c.cohort_id,
            c.challenge_1_image_url,
            c.challenge_2_image_url,
            true as is_cohort_specific
        FROM challenges c
        WHERE c.cohort_id = user_cohort_id 
          AND c.order_index = day_number 
          AND c.is_active = true
        LIMIT 1;
        
        -- If we found a cohort-specific challenge, return it
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Fall back to default challenge (cohort_id is NULL)
    RETURN QUERY
    SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        c.challenge_1,
        c.challenge_1_type,
        c.challenge_2,
        c.challenge_2_type,
        c.reflection_question,
        c.intended_aha_moments,
        c.title,
        c.order_index,
        c.is_active,
        c.cohort_id,
        c.challenge_1_image_url,
        c.challenge_2_image_url,
        false as is_cohort_specific
    FROM challenges c
    WHERE c.cohort_id IS NULL 
      AND c.order_index = day_number 
      AND c.is_active = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create helper function to get available challenge days for a cohort
CREATE OR REPLACE FUNCTION get_available_challenge_days(user_cohort_id UUID)
RETURNS TABLE (
    day_number INTEGER,
    has_cohort_specific BOOLEAN,
    has_default BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH cohort_specific AS (
        SELECT DISTINCT c.order_index
        FROM challenges c
        WHERE c.cohort_id = user_cohort_id AND c.is_active = true
    ),
    defaults AS (
        SELECT DISTINCT c.order_index
        FROM challenges c
        WHERE c.cohort_id IS NULL AND c.is_active = true
    )
    SELECT 
        COALESCE(cs.order_index, d.order_index) as day_number,
        (cs.order_index IS NOT NULL) as has_cohort_specific,
        (d.order_index IS NOT NULL) as has_default
    FROM cohort_specific cs
    FULL OUTER JOIN defaults d ON cs.order_index = d.order_index
    ORDER BY day_number;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update RLS policies to handle cohort-specific challenges
-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view challenges" ON challenges;

-- Create new policy that allows viewing default challenges or cohort-specific challenges for assigned cohorts
CREATE POLICY "Anyone can view default challenges and cohort challenges" ON challenges
    FOR SELECT USING (
        is_active = true AND (
            cohort_id IS NULL OR  -- Default challenges
            cohort_id IN (
                -- User can see challenges for their cohort
                SELECT cohort_id FROM user_profiles WHERE user_id = auth.uid()
                UNION
                -- Admins can see challenges for cohorts they manage
                SELECT cohort_id FROM admin_cohort_assignments WHERE admin_user_id = auth.uid() AND is_active = true
            )
        )
    );

-- Step 7: Create policy for challenge management (super admins and assigned admins)
CREATE POLICY "Admins can manage challenges" ON challenges
    FOR ALL USING (
        -- Super admins can manage all challenges
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        ) OR
        -- Regular admins can manage challenges for their assigned cohorts
        (cohort_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM admin_cohort_assignments 
            WHERE admin_user_id = auth.uid() 
              AND cohort_id = challenges.cohort_id 
              AND is_active = true
        )) OR
        -- Admins can manage default challenges (cohort_id IS NULL) if they have any cohort assignments
        (cohort_id IS NULL AND EXISTS (
            SELECT 1 FROM admin_cohort_assignments 
            WHERE admin_user_id = auth.uid() AND is_active = true
        ))
    );

-- Step 8: Success message
SELECT 'Cohort-specific challenges functionality added successfully!' as result;

-- Step 9: Show sample usage
SELECT 'Usage examples:' as info;
SELECT 'To get challenge for user in cohort on day 5:' as example1;
SELECT 'SELECT * FROM get_challenge_for_user_day(''cohort-uuid'', 5);' as example1_query;
SELECT 'To see available days for a cohort:' as example2;
SELECT 'SELECT * FROM get_available_challenge_days(''cohort-uuid'');' as example2_query; 