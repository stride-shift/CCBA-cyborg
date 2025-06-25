-- Check the actual schema of user activity tables
-- Run this to see what columns exist

SELECT 'user_challenge_completions columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_challenge_completions'
ORDER BY ordinal_position;

SELECT 'user_reflections columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_reflections'
ORDER BY ordinal_position;

SELECT 'user_day_completions columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_day_completions'
ORDER BY ordinal_position;

SELECT 'user_video_interactions columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_video_interactions'
ORDER BY ordinal_position;

SELECT 'user_journey_analytics columns:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_journey_analytics'
ORDER BY ordinal_position; 