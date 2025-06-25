-- Remove cohort_type column from cohorts table
-- This removes unnecessary complexity - a cohort is a cohort

-- Drop the cohort_type column
ALTER TABLE cohorts DROP COLUMN IF EXISTS cohort_type;

-- Verify the column has been removed (show table structure)
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'cohorts' 
ORDER BY ordinal_position;

-- Success message
SELECT 'cohort_type column removed successfully!' as result; 