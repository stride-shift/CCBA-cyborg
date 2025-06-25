-- Survey Tables for Day 0 (Pre) and Day 16 (Post) Surveys
-- Run this in your Supabase SQL editor

-- =============================================
-- PRE-SURVEY TABLE (Day 0)
-- =============================================

CREATE TABLE IF NOT EXISTS pre_survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    
    -- AI Usage Rating (1-5 scale)
    ai_usage_rating INTEGER CHECK (ai_usage_rating >= 1 AND ai_usage_rating <= 5),
    
    -- Frequency questions for each habit (1-5 scale: Never, Rarely, Sometimes, Often, Always)
    explain_it_frequency INTEGER CHECK (explain_it_frequency >= 1 AND explain_it_frequency <= 5),
    guide_it_frequency INTEGER CHECK (guide_it_frequency >= 1 AND guide_it_frequency <= 5),
    suggest_it_frequency INTEGER CHECK (suggest_it_frequency >= 1 AND suggest_it_frequency <= 5),
    critique_it_frequency INTEGER CHECK (critique_it_frequency >= 1 AND critique_it_frequency <= 5),
    plan_it_frequency INTEGER CHECK (plan_it_frequency >= 1 AND plan_it_frequency <= 5),
    imagine_it_frequency INTEGER CHECK (imagine_it_frequency >= 1 AND imagine_it_frequency <= 5),
    improve_it_frequency INTEGER CHECK (improve_it_frequency >= 1 AND improve_it_frequency <= 5),
    
    -- Open-ended response
    additional_comments TEXT,
    
    -- Completion tracking
    is_completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent multiple submissions
    UNIQUE(user_id)
);

-- =============================================
-- POST-SURVEY TABLE (Day 16)
-- =============================================

CREATE TABLE IF NOT EXISTS post_survey_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    
    -- AI Usage Rating (1-5 scale)
    ai_usage_rating INTEGER CHECK (ai_usage_rating >= 1 AND ai_usage_rating <= 5),
    
    -- Frequency questions for each habit (1-5 scale: Never, Rarely, Sometimes, Often, Always)
    explain_it_frequency INTEGER CHECK (explain_it_frequency >= 1 AND explain_it_frequency <= 5),
    guide_it_frequency INTEGER CHECK (guide_it_frequency >= 1 AND guide_it_frequency <= 5),
    suggest_it_frequency INTEGER CHECK (suggest_it_frequency >= 1 AND suggest_it_frequency <= 5),
    critique_it_frequency INTEGER CHECK (critique_it_frequency >= 1 AND critique_it_frequency <= 5),
    plan_it_frequency INTEGER CHECK (plan_it_frequency >= 1 AND plan_it_frequency <= 5),
    imagine_it_frequency INTEGER CHECK (imagine_it_frequency >= 1 AND imagine_it_frequency <= 5),
    improve_it_frequency INTEGER CHECK (improve_it_frequency >= 1 AND improve_it_frequency <= 5),
    
    -- Open-ended response
    additional_comments TEXT,
    
    -- Completion tracking
    is_completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint to prevent multiple submissions
    UNIQUE(user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_pre_survey_user_id ON pre_survey_responses(user_id);
CREATE INDEX idx_pre_survey_cohort_id ON pre_survey_responses(cohort_id);
CREATE INDEX idx_pre_survey_completed_at ON pre_survey_responses(completed_at);

CREATE INDEX idx_post_survey_user_id ON post_survey_responses(user_id);
CREATE INDEX idx_post_survey_cohort_id ON post_survey_responses(cohort_id);
CREATE INDEX idx_post_survey_completed_at ON post_survey_responses(completed_at);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE pre_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_survey_responses ENABLE ROW LEVEL SECURITY;

-- Allow users to insert and view their own responses
CREATE POLICY "Users can insert their own pre-survey responses" ON pre_survey_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pre-survey responses" ON pre_survey_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own pre-survey responses" ON pre_survey_responses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own post-survey responses" ON post_survey_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own post-survey responses" ON post_survey_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own post-survey responses" ON post_survey_responses
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies (for users with admin or super_admin role)
CREATE POLICY "Admins can view all pre-survey responses" ON pre_survey_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can view all post-survey responses" ON post_survey_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- =============================================
-- HELPFUL VIEWS
-- =============================================

-- View to compare pre and post survey responses
CREATE OR REPLACE VIEW survey_comparison AS
SELECT 
    pre.user_id,
    up.first_name,
    up.last_name,
    up.organization_name,
    pre.ai_usage_rating as pre_ai_usage,
    post.ai_usage_rating as post_ai_usage,
    (post.ai_usage_rating - pre.ai_usage_rating) as ai_usage_change,
    
    -- Habit frequency comparisons
    pre.explain_it_frequency as pre_explain_it,
    post.explain_it_frequency as post_explain_it,
    (post.explain_it_frequency - pre.explain_it_frequency) as explain_it_change,
    
    pre.guide_it_frequency as pre_guide_it,
    post.guide_it_frequency as post_guide_it,
    (post.guide_it_frequency - pre.guide_it_frequency) as guide_it_change,
    
    pre.suggest_it_frequency as pre_suggest_it,
    post.suggest_it_frequency as post_suggest_it,
    (post.suggest_it_frequency - pre.suggest_it_frequency) as suggest_it_change,
    
    pre.critique_it_frequency as pre_critique_it,
    post.critique_it_frequency as post_critique_it,
    (post.critique_it_frequency - pre.critique_it_frequency) as critique_it_change,
    
    pre.plan_it_frequency as pre_plan_it,
    post.plan_it_frequency as post_plan_it,
    (post.plan_it_frequency - pre.plan_it_frequency) as plan_it_change,
    
    pre.imagine_it_frequency as pre_imagine_it,
    post.imagine_it_frequency as post_imagine_it,
    (post.imagine_it_frequency - pre.imagine_it_frequency) as imagine_it_change,
    
    pre.improve_it_frequency as pre_improve_it,
    post.improve_it_frequency as post_improve_it,
    (post.improve_it_frequency - pre.improve_it_frequency) as improve_it_change,
    
    pre.completed_at as pre_survey_date,
    post.completed_at as post_survey_date
FROM pre_survey_responses pre
FULL OUTER JOIN post_survey_responses post ON pre.user_id = post.user_id
LEFT JOIN user_profiles up ON COALESCE(pre.user_id, post.user_id) = up.user_id; 