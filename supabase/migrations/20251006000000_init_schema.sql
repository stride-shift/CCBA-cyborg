-- Initial schema migration (pulled from production)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create cohorts table first (referenced by many others)
CREATE TABLE IF NOT EXISTS public.cohorts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying NOT NULL,
    description text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'enrolling'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    max_participants integer DEFAULT 25,
    duration_weeks integer DEFAULT 12,
    organization_name character varying DEFAULT 'Cyborg Habit Co.'::character varying,
    timezone character varying DEFAULT 'UTC'::character varying,
    meeting_schedule text,
    completion_criteria text DEFAULT 'Complete all weekly challenges and reflections'::text,
    facilitator_id uuid REFERENCES auth.users(id),
    tags text[],
    external_id character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create challenges table
CREATE TABLE IF NOT EXISTS public.challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    challenge_1 text NOT NULL,
    challenge_1_type text,
    challenge_2 text NOT NULL,
    challenge_2_type text,
    reflection_question text NOT NULL,
    intended_aha_moments text[],
    title character varying,
    order_index integer,
    is_active boolean DEFAULT true,
    challenge_1_image_url text,
    challenge_2_image_url text,
    cohort_id uuid REFERENCES public.cohorts(id)
);

-- Create videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    challenge_id uuid REFERENCES public.challenges(id),
    youtube_video_id character varying NOT NULL,
    title character varying NOT NULL,
    description text,
    duration_seconds integer,
    is_active boolean DEFAULT true,
    order_index integer DEFAULT 1,
    video_scope character varying DEFAULT 'challenge'::character varying,
    habit_type character varying CHECK (habit_type IS NULL OR (habit_type::text = ANY (ARRAY['explain_it'::character varying, 'plan_it'::character varying, 'suggest_it'::character varying, 'guide_it'::character varying, 'critique_it'::character varying, 'imagine_it'::character varying, 'improve_it'::character varying]::text[])))
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE REFERENCES auth.users(id) NOT NULL,
    first_name character varying,
    last_name character varying,
    organization_name character varying,
    department character varying,
    cohort_id uuid REFERENCES public.cohorts(id),
    role character varying DEFAULT 'user'::character varying CHECK (role::text = ANY (ARRAY['user'::character varying, 'admin'::character varying, 'super_admin'::character varying]::text[])),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create user activity tracking tables
CREATE TABLE IF NOT EXISTS public.user_challenge_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    challenge_id uuid REFERENCES public.challenges(id),
    challenge_number integer NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    notes text
);

CREATE TABLE IF NOT EXISTS public.user_reflections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    challenge_id uuid REFERENCES public.challenges(id),
    reflection_text text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now(),
    word_count integer
);

CREATE TABLE IF NOT EXISTS public.user_day_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    challenge_id uuid REFERENCES public.challenges(id),
    completed_at timestamp with time zone DEFAULT now(),
    both_challenges_completed boolean DEFAULT false,
    reflection_submitted boolean DEFAULT false,
    time_spent_minutes integer
);

CREATE TABLE IF NOT EXISTS public.user_video_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    video_id uuid REFERENCES public.videos(id),
    watched_at timestamp with time zone DEFAULT now(),
    watch_duration_seconds integer,
    completed_video boolean DEFAULT false,
    liked boolean,
    rating integer CHECK (rating >= 1 AND rating <= 5)
);

CREATE TABLE IF NOT EXISTS public.user_journey_analytics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid UNIQUE REFERENCES auth.users(id),
    total_days_completed integer DEFAULT 0,
    total_challenges_completed integer DEFAULT 0,
    total_reflections_submitted integer DEFAULT 0,
    total_videos_watched integer DEFAULT 0,
    average_session_duration_minutes numeric,
    longest_streak_days integer DEFAULT 0,
    current_streak_days integer DEFAULT 0,
    journey_completion_percentage numeric DEFAULT 0.00,
    estimated_completion_date date,
    last_activity_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.user_activity_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    cohort_id uuid REFERENCES public.cohorts(id) NOT NULL,
    last_activity_date date DEFAULT CURRENT_DATE NOT NULL,
    last_activity_type character varying DEFAULT 'login'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create customized challenges tables
CREATE TABLE IF NOT EXISTS public.customized_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    challenge_1 text NOT NULL,
    challenge_1_type text,
    challenge_2 text NOT NULL,
    challenge_2_type text,
    reflection_question text NOT NULL,
    intended_aha_moments text[],
    title character varying,
    order_index integer,
    is_active boolean DEFAULT true,
    challenge_1_image_url text,
    challenge_2_image_url text,
    cohort_id uuid,
    video_url_1 text,
    video_url_2 text
);

CREATE TABLE IF NOT EXISTS public.user_customized_challenge_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    challenge_id uuid REFERENCES public.customized_challenges(id),
    challenge_number integer NOT NULL,
    completed_at timestamp with time zone DEFAULT now(),
    notes text
);

CREATE TABLE IF NOT EXISTS public.user_customized_day_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    challenge_id uuid REFERENCES public.customized_challenges(id),
    completed_at timestamp with time zone DEFAULT now(),
    both_challenges_completed boolean DEFAULT false,
    reflection_submitted boolean DEFAULT false,
    time_spent_minutes integer
);

CREATE TABLE IF NOT EXISTS public.user_customized_challenge_reflections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid REFERENCES auth.users(id),
    challenge_id uuid REFERENCES public.customized_challenges(id),
    reflection_text text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now(),
    word_count integer
);

-- Create dlab_challenges table
CREATE TABLE IF NOT EXISTS public.dlab_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    challenge_1 text NOT NULL,
    challenge_1_type text,
    challenge_2 text NOT NULL,
    challenge_2_type text,
    reflection_question text NOT NULL,
    intended_aha_moments text[] NOT NULL,
    title character varying,
    order_index integer,
    is_active boolean DEFAULT true,
    challenge_1_image_url text,
    challenge_2_image_url text,
    cohort_id uuid
);

-- Create survey tables
CREATE TABLE IF NOT EXISTS public.pre_survey_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid UNIQUE REFERENCES auth.users(id) NOT NULL,
    cohort_id uuid REFERENCES public.cohorts(id),
    ai_usage_rating integer CHECK (ai_usage_rating >= 1 AND ai_usage_rating <= 5),
    explain_it_frequency integer CHECK (explain_it_frequency >= 1 AND explain_it_frequency <= 5),
    guide_it_frequency integer CHECK (guide_it_frequency >= 1 AND guide_it_frequency <= 5),
    suggest_it_frequency integer CHECK (suggest_it_frequency >= 1 AND suggest_it_frequency <= 5),
    critique_it_frequency integer CHECK (critique_it_frequency >= 1 AND critique_it_frequency <= 5),
    plan_it_frequency integer CHECK (plan_it_frequency >= 1 AND plan_it_frequency <= 5),
    imagine_it_frequency integer CHECK (imagine_it_frequency >= 1 AND imagine_it_frequency <= 5),
    improve_it_frequency integer CHECK (improve_it_frequency >= 1 AND improve_it_frequency <= 5),
    additional_comments text,
    is_completed boolean DEFAULT true,
    completed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_survey_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid UNIQUE REFERENCES auth.users(id) NOT NULL,
    cohort_id uuid REFERENCES public.cohorts(id),
    ai_usage_rating integer CHECK (ai_usage_rating >= 1 AND ai_usage_rating <= 5),
    explain_it_frequency integer CHECK (explain_it_frequency >= 1 AND explain_it_frequency <= 5),
    guide_it_frequency integer CHECK (guide_it_frequency >= 1 AND guide_it_frequency <= 5),
    suggest_it_frequency integer CHECK (suggest_it_frequency >= 1 AND suggest_it_frequency <= 5),
    critique_it_frequency integer CHECK (critique_it_frequency >= 1 AND critique_it_frequency <= 5),
    plan_it_frequency integer CHECK (plan_it_frequency >= 1 AND plan_it_frequency <= 5),
    imagine_it_frequency integer CHECK (imagine_it_frequency >= 1 AND imagine_it_frequency <= 5),
    improve_it_frequency integer CHECK (improve_it_frequency >= 1 AND improve_it_frequency <= 5),
    additional_comments text,
    is_completed boolean DEFAULT true,
    completed_at timestamp with time zone DEFAULT now()
);

-- Create admin tables
CREATE TABLE IF NOT EXISTS public.admin_cohort_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id uuid REFERENCES auth.users(id) NOT NULL,
    cohort_id uuid REFERENCES public.cohorts(id) NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by uuid REFERENCES auth.users(id),
    permissions text[] DEFAULT ARRAY['view'::text, 'manage_users'::text],
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.admin_action_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type text NOT NULL,
    description text NOT NULL,
    target_table text,
    target_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    admin_user_id uuid REFERENCES auth.users(id),
    admin_email text,
    admin_role text,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

-- Create email automation tables
CREATE TABLE IF NOT EXISTS public.email_auto_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id uuid REFERENCES public.cohorts(id),
    email_type text CHECK (email_type = ANY (ARRAY['daily_reminder'::text, 'welcome_series'::text, 'progress_report'::text, 'reengagement'::text, 'reengagement_3day'::text, 'reengagement_week'::text, 'reengagement_5day'::text, 'journey_completion'::text, 'manual_test'::text])) NOT NULL,
    day_number integer,
    template_name text NOT NULL,
    subject_template text NOT NULL,
    html_template text NOT NULL,
    text_template text NOT NULL,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_by uuid REFERENCES public.user_profiles(user_id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_auto_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id uuid UNIQUE REFERENCES public.cohorts(id),
    daily_reminders_enabled boolean DEFAULT true,
    welcome_series_enabled boolean DEFAULT true,
    progress_reports_enabled boolean DEFAULT false,
    send_time time without time zone DEFAULT '09:00:00'::time without time zone,
    timezone text DEFAULT 'UTC'::text,
    is_paused boolean DEFAULT false,
    paused_by uuid REFERENCES public.user_profiles(user_id),
    paused_at timestamp with time zone,
    paused_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_auto_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(user_id),
    cohort_id uuid REFERENCES public.cohorts(id),
    template_id uuid REFERENCES public.email_auto_templates(id),
    email_type text NOT NULL,
    day_number integer,
    recipient_email text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    text_content text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])),
    sent_at timestamp with time zone,
    resend_id text,
    error_message text,
    attempts integer DEFAULT 0,
    max_attempts integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_auto_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id uuid REFERENCES public.email_auto_queue(id),
    user_id uuid REFERENCES public.user_profiles(user_id),
    cohort_id uuid REFERENCES public.cohorts(id),
    recipient_email text,
    subject text NOT NULL,
    email_type text NOT NULL,
    day_number integer,
    sent_at timestamp with time zone NOT NULL,
    resend_id text,
    delivery_status text DEFAULT 'sent'::text CHECK (delivery_status = ANY (ARRAY['sent'::text, 'delivered'::text, 'bounced'::text, 'complained'::text])),
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    unsubscribed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_auto_user_preferences (
    user_id uuid PRIMARY KEY REFERENCES public.user_profiles(user_id),
    daily_reminders_enabled boolean DEFAULT true,
    welcome_series_enabled boolean DEFAULT true,
    progress_reports_enabled boolean DEFAULT true,
    opt_out_date timestamp with time zone,
    unsubscribe_token text UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cohort_automation_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id uuid UNIQUE REFERENCES public.cohorts(id) NOT NULL,
    automation_enabled boolean DEFAULT false,
    program_type text DEFAULT 'cyborg_habits_16_day'::text CHECK (program_type = ANY (ARRAY['cyborg_habits_16_day'::text, 'custom'::text])),
    program_duration_days integer DEFAULT 16,
    send_time time without time zone DEFAULT '09:00:00'::time without time zone,
    timezone text DEFAULT 'UTC'::text,
    platform_url text,
    custom_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.email_schedule (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id uuid REFERENCES public.cohorts(id),
    day_number integer NOT NULL,
    email_type text CHECK (email_type = ANY (ARRAY['welcome'::text, 'daily_challenge'::text, 'completion'::text, 'nudge_2day'::text, 'nudge_5day'::text, 'post_program_report'::text])) NOT NULL,
    subject_template text NOT NULL,
    html_template text NOT NULL,
    send_offset_days integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simple_email_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id uuid REFERENCES public.cohorts(id),
    user_id uuid REFERENCES auth.users(id),
    recipient_email text NOT NULL,
    subject text NOT NULL,
    html_content text NOT NULL,
    email_type text NOT NULL,
    day_number integer,
    scheduled_for timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])),
    sent_at timestamp with time zone,
    resend_id text,
    error_message text,
    attempts integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simple_email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id uuid REFERENCES public.cohorts(id),
    user_id uuid REFERENCES auth.users(id),
    recipient_email text NOT NULL,
    subject text NOT NULL,
    email_type text NOT NULL,
    day_number integer,
    sent_at timestamp with time zone NOT NULL,
    delivery_status text DEFAULT 'delivered'::text,
    resend_id text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simple_automation_config (
    cohort_id uuid PRIMARY KEY REFERENCES public.cohorts(id),
    is_enabled boolean DEFAULT false,
    program_duration_days integer DEFAULT 16,
    send_time time without time zone DEFAULT '09:00:00'::time without time zone,
    timezone text DEFAULT 'UTC'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security on appropriate tables
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_day_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_video_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_journey_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_cohort_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customized_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_customized_challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_customized_day_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_customized_challenge_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dlab_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_automation_config ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies would need to be added separately based on your security requirements



