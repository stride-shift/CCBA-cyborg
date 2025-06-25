-- Fix foreign key constraints to use Supabase's built-in auth.users table
-- Run this in your Supabase SQL editor

-- STEP 1: Drop the custom users table (we don't need it)
DROP TABLE IF EXISTS users CASCADE;

-- STEP 2: Drop existing foreign key constraints
ALTER TABLE user_challenge_completions DROP CONSTRAINT IF EXISTS user_challenge_completions_user_id_fkey;
ALTER TABLE user_reflections DROP CONSTRAINT IF EXISTS user_reflections_user_id_fkey;
ALTER TABLE user_day_completions DROP CONSTRAINT IF EXISTS user_day_completions_user_id_fkey;
ALTER TABLE user_video_interactions DROP CONSTRAINT IF EXISTS user_video_interactions_user_id_fkey;
ALTER TABLE user_journey_analytics DROP CONSTRAINT IF EXISTS user_journey_analytics_user_id_fkey;

-- STEP 3: Add new foreign key constraints pointing to auth.users
ALTER TABLE user_challenge_completions 
ADD CONSTRAINT user_challenge_completions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_reflections 
ADD CONSTRAINT user_reflections_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_day_completions 
ADD CONSTRAINT user_day_completions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_video_interactions 
ADD CONSTRAINT user_video_interactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE user_journey_analytics 
ADD CONSTRAINT user_journey_analytics_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- STEP 4: Verify the constraints are correct
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('user_challenge_completions', 'user_reflections', 'user_day_completions', 'user_video_interactions', 'user_journey_analytics')
ORDER BY tc.table_name; 