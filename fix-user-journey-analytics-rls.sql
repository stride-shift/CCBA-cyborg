-- Fix RLS policies for user_journey_analytics table
-- The table has RLS enabled but no policies, which blocks all access

-- Allow users to access their own data
CREATE POLICY "Users can view own journey analytics"
ON user_journey_analytics
FOR SELECT
USING (auth.uid() = user_id);

-- Allow super_admin to access all data
CREATE POLICY "Super admin can view all journey analytics"
ON user_journey_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Allow regular admins to access data for users in their assigned cohorts only
CREATE POLICY "Regular admin can view assigned cohort journey analytics"
ON user_journey_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles up
    JOIN admin_cohort_assignments aca ON up.cohort_id = aca.cohort_id
    WHERE up.user_id = user_journey_analytics.user_id  -- the user whose data we're viewing
    AND aca.admin_user_id = auth.uid()  -- the current admin user
    AND aca.is_active = true
    AND EXISTS (
      SELECT 1 FROM user_profiles admin_profile 
      WHERE admin_profile.user_id = auth.uid() 
      AND admin_profile.role = 'admin'
    )
  )
);

-- Allow super_admin to insert data
CREATE POLICY "Super admin can insert journey analytics"
ON user_journey_analytics
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Allow super_admin to update data
CREATE POLICY "Super admin can update journey analytics"
ON user_journey_analytics
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Allow super_admin to delete data
CREATE POLICY "Super admin can delete journey analytics"
ON user_journey_analytics
FOR DELETE
USING (
  EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Verify the policies were created
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'user_journey_analytics'
ORDER BY policyname; 