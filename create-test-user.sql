-- Create test user record for testing database integration
-- Run this in your Supabase SQL editor

INSERT INTO users (id, display_name, started_journey_at, is_active)
VALUES (
    '86d3ae79-4fec-4065-b39c-2820291f2b35',
    'Test User',
    NOW(),
    true
)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    started_journey_at = EXCLUDED.started_journey_at,
    updated_at = NOW();

-- Verify the user was created
SELECT * FROM users WHERE id = '86d3ae79-4fec-4065-b39c-2820291f2b35'; 