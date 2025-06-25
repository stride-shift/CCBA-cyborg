-- Restructure videos table to match challenges table pattern
-- Replace single video_type with challenge_1_type and challenge_2_type

-- Step 1: Add new columns for challenge types
ALTER TABLE videos ADD COLUMN IF NOT EXISTS challenge_1_type VARCHAR(50);
ALTER TABLE videos ADD COLUMN IF NOT EXISTS challenge_2_type VARCHAR(50);

-- Step 2: Migrate existing data from video_type to new columns
-- For videos that were 'morning' (sequence 1), put the type in challenge_1_type
-- For videos that were 'evening' (sequence 2), put the type in challenge_2_type

-- First, let's see what types we currently have and migrate them appropriately
-- This assumes 'morning' maps to challenge_1_type and 'evening' maps to challenge_2_type

-- Migrate existing 'morning' videos to challenge_1_type
UPDATE videos 
SET challenge_1_type = 'morning'
WHERE video_type = 'morning';

-- Migrate existing 'evening' videos to challenge_2_type  
UPDATE videos 
SET challenge_2_type = 'evening'
WHERE video_type = 'evening';

-- For 'bonus' videos, we'll put them in challenge_1_type (or you can decide the logic)
UPDATE videos 
SET challenge_1_type = 'bonus'
WHERE video_type = 'bonus';

-- For intro/global videos, keep them as they are (these won't have challenge types)
-- They will have NULL values for both challenge_1_type and challenge_2_type

-- Step 3: Drop the old video_type constraint
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_video_type_check;

-- Step 4: Add new constraints for the challenge type fields
-- These constraints will allow various challenge types (adjust as needed)
ALTER TABLE videos ADD CONSTRAINT videos_challenge_1_type_check 
    CHECK (challenge_1_type IS NULL OR challenge_1_type IN (
        'explain_it', 'guide_it', 'imagine_it', 'critique_it', 
        'improve_it', 'plan_it', 'suggest_it', 'morning', 'bonus'
    ));

ALTER TABLE videos ADD CONSTRAINT videos_challenge_2_type_check 
    CHECK (challenge_2_type IS NULL OR challenge_2_type IN (
        'explain_it', 'guide_it', 'imagine_it', 'critique_it', 
        'improve_it', 'plan_it', 'suggest_it', 'evening', 'bonus'
    ));

-- Step 5: Add constraint to ensure at least one challenge type is specified for challenge-scoped videos
-- Global videos (intro, etc.) can have both as NULL
ALTER TABLE videos ADD CONSTRAINT videos_challenge_types_check 
    CHECK (
        (video_scope = 'global') OR 
        (video_scope = 'challenge' AND (challenge_1_type IS NOT NULL OR challenge_2_type IS NOT NULL))
    );

-- Step 6: Update indexes
CREATE INDEX IF NOT EXISTS idx_videos_challenge_1_type ON videos(challenge_1_type);
CREATE INDEX IF NOT EXISTS idx_videos_challenge_2_type ON videos(challenge_2_type);
CREATE INDEX IF NOT EXISTS idx_videos_challenge_types ON videos(challenge_1_type, challenge_2_type);

-- Step 7: Drop the old video_type column (UNCOMMENT WHEN READY)
-- WARNING: This will permanently remove the old video_type column
-- Make sure your application code is updated before running this
-- ALTER TABLE videos DROP COLUMN video_type;

-- Step 8: Update the views to use new structure
DROP VIEW IF EXISTS global_videos;
CREATE VIEW global_videos AS
SELECT 
    id,
    challenge_1_type,
    challenge_2_type,
    youtube_video_id,
    title,
    description,
    duration_seconds,
    is_active,
    order_index,
    created_at,
    updated_at
FROM videos 
WHERE video_scope = 'global' AND is_active = true
ORDER BY order_index;

DROP VIEW IF EXISTS challenge_videos;
CREATE VIEW challenge_videos AS
SELECT 
    id,
    challenge_id,
    challenge_1_type,
    challenge_2_type,
    youtube_video_id,
    title,
    description,
    duration_seconds,
    is_active,
    order_index,
    created_at,
    updated_at
FROM videos 
WHERE video_scope = 'challenge' AND is_active = true AND challenge_id IS NOT NULL
ORDER BY challenge_id, order_index;

-- Step 9: Create a helpful view to see videos by challenge sequence
CREATE VIEW videos_by_challenge_sequence AS
SELECT 
    v.id,
    v.challenge_id,
    v.youtube_video_id,
    v.title,
    v.description,
    v.is_active,
    v.order_index,
    1 as challenge_sequence,
    v.challenge_1_type as challenge_type
FROM videos v
WHERE v.challenge_1_type IS NOT NULL AND v.video_scope = 'challenge'

UNION ALL

SELECT 
    v.id,
    v.challenge_id,
    v.youtube_video_id,
    v.title,
    v.description,
    v.is_active,
    v.order_index,
    2 as challenge_sequence,
    v.challenge_2_type as challenge_type
FROM videos v
WHERE v.challenge_2_type IS NOT NULL AND v.video_scope = 'challenge'

ORDER BY challenge_id, challenge_sequence, order_index;

-- Example: Insert a video that supports both challenge types
-- INSERT INTO videos (
--     challenge_id,
--     video_scope,
--     challenge_1_type,
--     challenge_2_type,
--     youtube_video_id,
--     title,
--     description,
--     is_active,
--     order_index
-- ) VALUES (
--     (SELECT id FROM challenges WHERE order_index = 1 LIMIT 1), -- Day 1 challenge
--     'challenge',
--     'explain_it',      -- This video supports challenge 1 type
--     'guide_it',        -- This video also supports challenge 2 type  
--     'your_video_id',
--     'Day 1 - Explain It & Guide It',
--     'Learn both explanation and guidance techniques',
--     true,
--     1
-- ); 