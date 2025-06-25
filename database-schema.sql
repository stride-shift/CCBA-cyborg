-- Cyborg Habit Frontend Complete Database Schema
-- Run these commands in your Supabase SQL editor

-- =============================================
-- CORE CONTENT TABLES
-- =============================================

-- Challenges table (already exists, but included for completeness)
CREATE TABLE IF NOT EXISTS challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Core challenge data
    challenge_1 TEXT NOT NULL,
    challenge_1_type TEXT,
    challenge_2 TEXT NOT NULL,
    challenge_2_type TEXT,
    reflection_question TEXT NOT NULL,
    intended_aha_moments TEXT[] NOT NULL,
    
    -- Optional metadata
    title VARCHAR(255),
    order_index INTEGER,
    is_active BOOLEAN DEFAULT true
);

-- Videos table for YouTube content
CREATE TABLE videos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Video content
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    video_type VARCHAR(50) NOT NULL, -- 'morning', 'evening', 'bonus'
    youtube_video_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_seconds INTEGER,
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 1
);

-- =============================================
-- USER MANAGEMENT TABLES
-- =============================================

-- Users table (simple user tracking)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User identification (can be anonymous)
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(255),
    anonymous_id VARCHAR(255) UNIQUE, -- For anonymous users
    
    -- User preferences
    timezone VARCHAR(100) DEFAULT 'UTC',
    started_journey_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

-- =============================================
-- USER PROGRESS TRACKING TABLES
-- =============================================

-- User challenge completions
CREATE TABLE user_challenge_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- References
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    
    -- Challenge completion data
    challenge_number INTEGER NOT NULL, -- 1 or 2
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional metadata
    notes TEXT,
    
    -- Constraints
    UNIQUE(user_id, challenge_id, challenge_number)
);

-- User reflections
CREATE TABLE user_reflections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- References
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    
    -- Reflection data
    reflection_text TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Optional metadata
    word_count INTEGER,
    sentiment_score DECIMAL(3,2), -- For future AI analysis
    
    -- Constraints
    UNIQUE(user_id, challenge_id)
);

-- User day completions (overall day progress)
CREATE TABLE user_day_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- References
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
    
    -- Completion data
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    both_challenges_completed BOOLEAN DEFAULT false,
    reflection_submitted BOOLEAN DEFAULT false,
    
    -- Progress metrics
    time_spent_minutes INTEGER,
    
    -- Constraints
    UNIQUE(user_id, challenge_id)
);

-- User video interactions
CREATE TABLE user_video_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- References
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    
    -- Interaction data
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    watch_duration_seconds INTEGER,
    completed_video BOOLEAN DEFAULT false,
    
    -- Engagement metrics
    liked BOOLEAN,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);

-- =============================================
-- ANALYTICS AND INSIGHTS TABLES
-- =============================================

-- User journey analytics
CREATE TABLE user_journey_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- References
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Journey metrics
    total_days_completed INTEGER DEFAULT 0,
    total_challenges_completed INTEGER DEFAULT 0,
    total_reflections_submitted INTEGER DEFAULT 0,
    total_videos_watched INTEGER DEFAULT 0,
    
    -- Engagement metrics
    average_session_duration_minutes DECIMAL(10,2),
    longest_streak_days INTEGER DEFAULT 0,
    current_streak_days INTEGER DEFAULT 0,
    
    -- Completion metrics
    journey_completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    estimated_completion_date DATE,
    
    -- Last activity
    last_activity_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Challenges table indexes
CREATE INDEX IF NOT EXISTS idx_challenges_order ON challenges(order_index);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_type1 ON challenges(challenge_1_type);
CREATE INDEX IF NOT EXISTS idx_challenges_type2 ON challenges(challenge_2_type);

-- Videos table indexes
CREATE INDEX idx_videos_challenge ON videos(challenge_id);
CREATE INDEX idx_videos_type ON videos(video_type);
CREATE INDEX idx_videos_active ON videos(is_active);

-- User progress indexes
CREATE INDEX idx_user_challenge_completions_user ON user_challenge_completions(user_id);
CREATE INDEX idx_user_challenge_completions_challenge ON user_challenge_completions(challenge_id);
CREATE INDEX idx_user_challenge_completions_completed ON user_challenge_completions(completed_at);

CREATE INDEX idx_user_reflections_user ON user_reflections(user_id);
CREATE INDEX idx_user_reflections_challenge ON user_reflections(challenge_id);
CREATE INDEX idx_user_reflections_submitted ON user_reflections(submitted_at);

CREATE INDEX idx_user_day_completions_user ON user_day_completions(user_id);
CREATE INDEX idx_user_day_completions_challenge ON user_day_completions(challenge_id);
CREATE INDEX idx_user_day_completions_completed ON user_day_completions(completed_at);

CREATE INDEX idx_user_video_interactions_user ON user_video_interactions(user_id);
CREATE INDEX idx_user_video_interactions_video ON user_video_interactions(video_id);
CREATE INDEX idx_user_video_interactions_watched ON user_video_interactions(watched_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_day_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_video_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journey_analytics ENABLE ROW LEVEL SECURITY;

-- Public read access for content tables
CREATE POLICY "Anyone can view challenges" ON challenges
    FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can view videos" ON videos
    FOR SELECT USING (is_active = true);

-- User-specific access for user data tables
CREATE POLICY "Users can view own data" ON users
    FOR ALL USING (auth.uid() = id OR anonymous_id = current_setting('app.anonymous_id', true));

CREATE POLICY "Users can manage own challenge completions" ON user_challenge_completions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reflections" ON user_reflections
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own day completions" ON user_day_completions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own video interactions" ON user_video_interactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics" ON user_journey_analytics
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update user journey analytics
CREATE OR REPLACE FUNCTION update_user_journey_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics when user completes challenges, reflections, etc.
    INSERT INTO user_journey_analytics (user_id, last_activity_at)
    VALUES (NEW.user_id, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        last_activity_at = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update analytics
CREATE TRIGGER trigger_update_analytics_on_challenge_completion
    AFTER INSERT OR UPDATE ON user_challenge_completions
    FOR EACH ROW EXECUTE FUNCTION update_user_journey_analytics();

CREATE TRIGGER trigger_update_analytics_on_reflection
    AFTER INSERT OR UPDATE ON user_reflections
    FOR EACH ROW EXECUTE FUNCTION update_user_journey_analytics();

CREATE TRIGGER trigger_update_analytics_on_day_completion
    AFTER INSERT OR UPDATE ON user_day_completions
    FOR EACH ROW EXECUTE FUNCTION update_user_journey_analytics();

-- Function to calculate journey completion percentage
CREATE OR REPLACE FUNCTION calculate_journey_completion(user_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_days INTEGER;
    completed_days INTEGER;
    completion_percentage DECIMAL;
BEGIN
    -- Get total number of active challenges (days)
    SELECT COUNT(*) INTO total_days FROM challenges WHERE is_active = true;
    
    -- Get number of completed days for user
    SELECT COUNT(*) INTO completed_days 
    FROM user_day_completions 
    WHERE user_id = user_uuid AND both_challenges_completed = true AND reflection_submitted = true;
    
    -- Calculate percentage
    IF total_days > 0 THEN
        completion_percentage := (completed_days::DECIMAL / total_days::DECIMAL) * 100;
    ELSE
        completion_percentage := 0;
    END IF;
    
    RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA FOR TESTING
-- =============================================

-- Insert sample videos (you'll need to replace with actual YouTube video IDs)
INSERT INTO videos (challenge_id, video_type, youtube_video_id, title, description, order_index)
SELECT 
    c.id,
    'morning',
    'dQw4w9WgXcQ', -- Placeholder YouTube ID
    'Morning Inspiration - Day ' || c.order_index,
    'Start your day with intention and purpose',
    1
FROM challenges c WHERE c.is_active = true;

INSERT INTO videos (challenge_id, video_type, youtube_video_id, title, description, order_index)
SELECT 
    c.id,
    'evening',
    'dQw4w9WgXcQ', -- Placeholder YouTube ID
    'Evening Reflection - Day ' || c.order_index,
    'End your day with gratitude and reflection',
    2
FROM challenges c WHERE c.is_active = true;

-- Create a sample anonymous user for testing
INSERT INTO users (anonymous_id, display_name, started_journey_at)
VALUES ('demo-user-001', 'Demo User', NOW());

-- =============================================
-- HELPFUL VIEWS FOR QUERIES
-- =============================================

-- View for complete day progress
CREATE VIEW user_day_progress AS
SELECT 
    u.id as user_id,
    u.display_name,
    c.id as challenge_id,
    c.order_index as day_number,
    c.title as day_title,
    
    -- Challenge completion status
    CASE WHEN cc1.id IS NOT NULL THEN true ELSE false END as challenge_1_completed,
    CASE WHEN cc2.id IS NOT NULL THEN true ELSE false END as challenge_2_completed,
    
    -- Reflection status
    CASE WHEN ur.id IS NOT NULL THEN true ELSE false END as reflection_completed,
    
    -- Overall day completion
    CASE WHEN dc.id IS NOT NULL THEN true ELSE false END as day_completed,
    
    -- Timestamps
    cc1.completed_at as challenge_1_completed_at,
    cc2.completed_at as challenge_2_completed_at,
    ur.submitted_at as reflection_submitted_at,
    dc.completed_at as day_completed_at

FROM users u
CROSS JOIN challenges c
LEFT JOIN user_challenge_completions cc1 ON (u.id = cc1.user_id AND c.id = cc1.challenge_id AND cc1.challenge_number = 1)
LEFT JOIN user_challenge_completions cc2 ON (u.id = cc2.user_id AND c.id = cc2.challenge_id AND cc2.challenge_number = 2)
LEFT JOIN user_reflections ur ON (u.id = ur.user_id AND c.id = ur.challenge_id)
LEFT JOIN user_day_completions dc ON (u.id = dc.user_id AND c.id = dc.challenge_id)
WHERE c.is_active = true
ORDER BY u.id, c.order_index; 