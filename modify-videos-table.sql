-- Modify videos table to support introductory videos
-- This allows videos that are not tied to specific challenges

-- First, make challenge_id nullable for introductory videos
ALTER TABLE videos ALTER COLUMN challenge_id DROP NOT NULL;

-- Add new video types including 'intro'
-- Update the video_type to include introductory video types
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_video_type_check;
ALTER TABLE videos ADD CONSTRAINT videos_video_type_check 
    CHECK (video_type IN ('morning', 'evening', 'bonus', 'intro', 'introduction', 'overview'));

-- Add a new field to categorize video scope
ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_scope VARCHAR(50) DEFAULT 'challenge';
-- video_scope can be: 'challenge' (tied to specific challenge) or 'global' (site-wide videos)

-- Update existing videos to have 'challenge' scope
UPDATE videos SET video_scope = 'challenge' WHERE challenge_id IS NOT NULL;

-- Add index for video scope and type
CREATE INDEX IF NOT EXISTS idx_videos_scope ON videos(video_scope);
CREATE INDEX IF NOT EXISTS idx_videos_scope_type ON videos(video_scope, video_type);

-- Insert an introductory video for the challenges page
-- Replace the YouTube video ID with your actual introductory video
INSERT INTO videos (
    challenge_id,
    video_type,
    video_scope,
    youtube_video_id,
    title,
    description,
    duration_seconds,
    is_active,
    order_index
) VALUES (
    NULL, -- No specific challenge
    'intro',
    'global',
    'dQw4w9WgXcQ', -- Replace with your actual YouTube video ID
    'Introduction to Cyborg Habits',
    'Welcome to your journey of developing AI collaboration habits. This video introduces the 7 core habits and explains how to get the most out of your 15-day journey.',
    NULL, -- Duration will be filled when known
    true,
    1
);

-- Create a view for easy querying of global videos
CREATE VIEW global_videos AS
SELECT 
    id,
    video_type,
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

-- Create a view for challenge-specific videos
CREATE VIEW challenge_videos AS
SELECT 
    id,
    challenge_id,
    video_type,
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