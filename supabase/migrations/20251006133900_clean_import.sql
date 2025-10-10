DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public') LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.routine_name) || ' CASCADE';
    END LOOP;
END $$;


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_journey_completion"("user_uuid" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_days      INTEGER;
    completed_days  INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_days  FROM challenges WHERE is_active;
    SELECT COUNT(*) INTO completed_days
      FROM user_day_completions
     WHERE user_id = user_uuid
       AND both_challenges_completed
       AND reflection_submitted;

    IF total_days = 0 THEN
        RETURN 0;
    END IF;

    RETURN (completed_days::DECIMAL / total_days) * 100;
END;
$$;


ALTER FUNCTION "public"."calculate_journey_completion"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_user_total_days"("target_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    challenge_days INTEGER;
    survey_days INTEGER;
    total_days INTEGER;
BEGIN
    -- Count completed challenge days
    SELECT COUNT(*) INTO challenge_days
    FROM user_day_completions
    WHERE user_id = target_user_id 
        AND both_challenges_completed = true 
        AND reflection_submitted = true;

    -- Count completed surveys
    SELECT 
        (CASE WHEN EXISTS(SELECT 1 FROM pre_survey_responses WHERE user_id = target_user_id) THEN 1 ELSE 0 END) +
        (CASE WHEN EXISTS(SELECT 1 FROM post_survey_responses WHERE user_id = target_user_id) THEN 1 ELSE 0 END)
    INTO survey_days;
    
    total_days := challenge_days + survey_days;
    
    RETURN total_days;
END;
$$;


ALTER FUNCTION "public"."calculate_user_total_days"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."call_cohort_registration_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  webhook_url TEXT;
  payload JSONB;
BEGIN
  -- Get the Edge Function URL
  webhook_url := CURRENT_SETTING('app.settings.edge_function_url', true) || '/cohort-registration-trigger';
  
  -- If the setting is not configured, use default format
  IF webhook_url IS NULL OR webhook_url = '/cohort-registration-trigger' THEN
    webhook_url := 'https://lraquxxdgyijafncczmr.supabase.co/functions/v1/cohort-registration-trigger';
  END IF;
  
  -- Build payload based on operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE', 
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );
  ELSIF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'table', TG_TABLE_NAME, 
      'record', NULL,
      'old_record', row_to_json(OLD)
    );
  END IF;
  
  -- Call the Edge Function asynchronously using pg_net
  -- Note: This requires the pg_net extension and proper configuration
  PERFORM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || CURRENT_SETTING('app.settings.service_role_key', true)
    ),
    body := payload::text
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RAISE WARNING 'Failed to call cohort registration trigger: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."call_cohort_registration_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_due_emails"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    due_count INTEGER;
BEGIN
    -- Count emails that are due
    SELECT COUNT(*) INTO due_count
    FROM simple_email_queue 
    WHERE status = 'pending' 
    AND scheduled_for <= now();
    
    -- Log the check (this proves the cron is working)
    INSERT INTO simple_email_logs (
        cohort_id, 
        user_id, 
        recipient_email, 
        subject, 
        email_type, 
        sent_at, 
        delivery_status
    ) VALUES (
        NULL, 
        NULL, 
        'system@cron', 
        'CRON: ' || due_count || ' emails due', 
        'cron_check', 
        now(), 
        'system'
    );
    
    RETURN 'Found ' || due_count || ' due emails';
END;
$$;


ALTER FUNCTION "public"."check_due_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Try to insert the user profile, but handle any errors gracefully
    BEGIN
        INSERT INTO user_profiles (user_id, first_name, last_name, role)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            'user'  -- Default role for new users
        );
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the user creation
            RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
            -- Continue without failing
    END;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_user_progress"("target_user_id" "uuid") RETURNS TABLE("challenge_day" integer, "challenge_1_completed" boolean, "challenge_2_completed" boolean, "reflection_submitted" boolean, "day_marked_complete" boolean, "should_be_complete" boolean, "day_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    -- Regular challenge days (1-15)
    SELECT 
        c.order_index as challenge_day,
        EXISTS(
            SELECT 1 FROM user_challenge_completions ucc1 
            WHERE ucc1.user_id = target_user_id 
            AND ucc1.challenge_id = c.id 
            AND ucc1.challenge_number = 1
        ) as challenge_1_completed,
        EXISTS(
            SELECT 1 FROM user_challenge_completions ucc2 
            WHERE ucc2.user_id = target_user_id 
            AND ucc2.challenge_id = c.id 
            AND ucc2.challenge_number = 2
        ) as challenge_2_completed,
        EXISTS(
            SELECT 1 FROM user_reflections ur 
            WHERE ur.user_id = target_user_id 
            AND ur.challenge_id = c.id
        ) as reflection_submitted,
        COALESCE(udc.both_challenges_completed AND udc.reflection_submitted, false) as day_marked_complete,
        (
            EXISTS(
                SELECT 1 FROM user_challenge_completions ucc1 
                WHERE ucc1.user_id = target_user_id 
                AND ucc1.challenge_id = c.id 
                AND ucc1.challenge_number = 1
            ) AND
            EXISTS(
                SELECT 1 FROM user_challenge_completions ucc2 
                WHERE ucc2.user_id = target_user_id 
                AND ucc2.challenge_id = c.id 
                AND ucc2.challenge_number = 2
            ) AND
            EXISTS(
                SELECT 1 FROM user_reflections ur 
                WHERE ur.user_id = target_user_id 
                AND ur.challenge_id = c.id
            )
        ) as should_be_complete,
        'challenge'::TEXT as day_type
    FROM challenges c
    LEFT JOIN user_day_completions udc ON (
        udc.user_id = target_user_id 
        AND udc.challenge_id = c.id
    )
    WHERE c.is_active = true
    
    UNION ALL
    
    -- Day 0: Pre-survey
    SELECT 
        0 as challenge_day,
        false as challenge_1_completed,
        false as challenge_2_completed,
        false as reflection_submitted,
        false as day_marked_complete,
        EXISTS(SELECT 1 FROM pre_survey_responses WHERE user_id = target_user_id) as should_be_complete,
        'pre_survey'::TEXT as day_type
    
    UNION ALL
    
    -- Day 16: Post-survey
    SELECT 
        16 as challenge_day,
        false as challenge_1_completed,
        false as challenge_2_completed,
        false as reflection_submitted,
        false as day_marked_complete,
        EXISTS(SELECT 1 FROM post_survey_responses WHERE user_id = target_user_id) as should_be_complete,
        'post_survey'::TEXT as day_type
    
    ORDER BY challenge_day;
END;
$$;


ALTER FUNCTION "public"."debug_user_progress"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."fix_user_day_completions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    user_record RECORD;
    challenge_record RECORD;
    challenge_1_exists BOOLEAN;
    challenge_2_exists BOOLEAN;
    reflection_exists BOOLEAN;
    both_completed BOOLEAN;
BEGIN
    -- Loop through all users from auth.users (the main user table)
    FOR user_record IN 
        SELECT DISTINCT id FROM auth.users 
    LOOP
        -- Loop through all challenges for this user
        FOR challenge_record IN 
            SELECT id FROM challenges WHERE is_active = true
        LOOP
            -- Check if challenge 1 is completed
            SELECT EXISTS(
                SELECT 1 FROM user_challenge_completions 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id 
                AND challenge_number = 1
            ) INTO challenge_1_exists;
            
            -- Check if challenge 2 is completed  
            SELECT EXISTS(
                SELECT 1 FROM user_challenge_completions 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id 
                AND challenge_number = 2
            ) INTO challenge_2_exists;
            
            -- Check if reflection exists
            SELECT EXISTS(
                SELECT 1 FROM user_reflections 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id
            ) INTO reflection_exists;
            
            -- Determine if both challenges are completed
            both_completed := challenge_1_exists AND challenge_2_exists;
            
            -- Only create/update day completion if there's actual progress
            IF challenge_1_exists OR challenge_2_exists OR reflection_exists THEN
                -- Upsert the correct completion status
                INSERT INTO user_day_completions (
                    user_id,
                    challenge_id,
                    both_challenges_completed,
                    reflection_submitted,
                    updated_at
                ) VALUES (
                    user_record.id,
                    challenge_record.id,
                    both_completed,
                    reflection_exists,
                    NOW()
                )
                ON CONFLICT (user_id, challenge_id) 
                DO UPDATE SET
                    both_challenges_completed = EXCLUDED.both_challenges_completed,
                    reflection_submitted = EXCLUDED.reflection_submitted,
                    updated_at = NOW();
            ELSE
                -- Delete any existing record if no progress
                DELETE FROM user_day_completions 
                WHERE user_id = user_record.id 
                AND challenge_id = challenge_record.id;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Day completion data fixed for all users';
END;
$$;


ALTER FUNCTION "public"."fix_user_day_completions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_audit_trail_for_record"("table_name" "text", "record_id" "uuid") RETURNS TABLE("id" "uuid", "action_type" "text", "description" "text", "admin_email" "text", "admin_role" "text", "created_at" timestamp with time zone, "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aal.id,
        aal.action_type,
        aal.description,
        aal.admin_email,
        aal.admin_role,
        aal.created_at,
        aal.details
    FROM public.admin_action_log aal
    WHERE aal.target_table = table_name
    AND aal.target_id = record_id
    ORDER BY aal.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_audit_trail_for_record"("table_name" "text", "record_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_challenge_days"("user_cohort_id" "uuid") RETURNS TABLE("day_number" integer, "has_cohort_specific" boolean, "has_default" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH cohort_specific AS (
        SELECT DISTINCT c.order_index
        FROM challenges c
        WHERE c.cohort_id = user_cohort_id AND c.is_active = true
    ),
    defaults AS (
        SELECT DISTINCT c.order_index
        FROM challenges c
        WHERE c.cohort_id IS NULL AND c.is_active = true
    )
    SELECT 
        COALESCE(cs.order_index, d.order_index) as day_number,
        (cs.order_index IS NOT NULL) as has_cohort_specific,
        (d.order_index IS NOT NULL) as has_default
    FROM cohort_specific cs
    FULL OUTER JOIN defaults d ON cs.order_index = d.order_index
    ORDER BY day_number;
END;
$$;


ALTER FUNCTION "public"."get_available_challenge_days"("user_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_challenge_for_user_day"("user_cohort_id" "uuid", "day_number" integer) RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "challenge_1" "text", "challenge_1_type" "text", "challenge_2" "text", "challenge_2_type" "text", "reflection_question" "text", "intended_aha_moments" "text"[], "title" character varying, "order_index" integer, "is_active" boolean, "cohort_id" "uuid", "challenge_1_image_url" "text", "challenge_2_image_url" "text", "is_cohort_specific" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- First, try to get cohort-specific challenge
    IF user_cohort_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.created_at,
            c.updated_at,
            c.challenge_1,
            c.challenge_1_type,
            c.challenge_2,
            c.challenge_2_type,
            c.reflection_question,
            c.intended_aha_moments,
            c.title,
            c.order_index,
            c.is_active,
            c.cohort_id,
            c.challenge_1_image_url,
            c.challenge_2_image_url,
            true as is_cohort_specific
        FROM challenges c
        WHERE c.cohort_id = user_cohort_id 
          AND c.order_index = day_number 
          AND c.is_active = true
        LIMIT 1;
        
        -- If we found a cohort-specific challenge, return it
        IF FOUND THEN
            RETURN;
        END IF;
    END IF;
    
    -- Fall back to default challenge (cohort_id is NULL)
    RETURN QUERY
    SELECT 
        c.id,
        c.created_at,
        c.updated_at,
        c.challenge_1,
        c.challenge_1_type,
        c.challenge_2,
        c.challenge_2_type,
        c.reflection_question,
        c.intended_aha_moments,
        c.title,
        c.order_index,
        c.is_active,
        c.cohort_id,
        c.challenge_1_image_url,
        c.challenge_2_image_url,
        false as is_cohort_specific
    FROM challenges c
    WHERE c.cohort_id IS NULL 
      AND c.order_index = day_number 
      AND c.is_active = true
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_challenge_for_user_day"("user_cohort_id" "uuid", "day_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_leaderboard"("target_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "first_name" character varying, "last_name" character varying, "journey_completion_percentage" numeric, "total_days_completed" integer, "current_streak_days" integer, "rank_position" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        up.first_name,
        up.last_name,
        COALESCE(uja.journey_completion_percentage, 0.00) as journey_completion_percentage,
        COALESCE(uja.total_days_completed, 0) as total_days_completed,
        COALESCE(uja.current_streak_days, 0) as current_streak_days,
        ROW_NUMBER() OVER (ORDER BY uja.journey_completion_percentage DESC, uja.total_days_completed DESC) as rank_position
    FROM user_profiles up
    LEFT JOIN user_journey_analytics uja ON up.user_id = uja.user_id
    WHERE up.cohort_id = target_cohort_id
    AND up.role = 'user'  -- Only regular users, not admins
    ORDER BY rank_position;
END;
$$;


ALTER FUNCTION "public"."get_cohort_leaderboard"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_user_progress"("cohort_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "total_days_completed" integer, "total_challenges_completed" integer, "total_reflections_submitted" integer, "journey_completion_percentage" numeric, "current_streak_days" integer, "last_activity_at" timestamp with time zone, "recent_challenge_count" integer, "recent_reflection_count" integer, "pre_survey_completed" boolean, "pre_survey_completed_at" timestamp with time zone, "post_survey_completed" boolean, "post_survey_completed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uja.user_id,
        COALESCE(uja.total_days_completed, 0) as total_days_completed,
        COALESCE(uja.total_challenges_completed, 0) as total_challenges_completed,
        COALESCE(uja.total_reflections_submitted, 0) as total_reflections_submitted,
        COALESCE(uja.journey_completion_percentage, 0.00) as journey_completion_percentage,
        COALESCE(uja.current_streak_days, 0) as current_streak_days,
        uja.last_activity_at,
        COALESCE(recent_challenges.challenge_count, 0) as recent_challenge_count,
        COALESCE(recent_reflections.reflection_count, 0) as recent_reflection_count,
        
        -- Survey completion data
        (pre_surveys.user_id IS NOT NULL) as pre_survey_completed,
        pre_surveys.completed_at as pre_survey_completed_at,
        (post_surveys.user_id IS NOT NULL) as post_survey_completed,
        post_surveys.completed_at as post_survey_completed_at
        
    FROM unnest(cohort_user_ids) AS uid(user_id)
    LEFT JOIN user_journey_analytics uja ON uid.user_id = uja.user_id
    
    -- Survey data
    LEFT JOIN pre_survey_responses pre_surveys ON uid.user_id = pre_surveys.user_id
    LEFT JOIN post_survey_responses post_surveys ON uid.user_id = post_surveys.user_id
    
    -- Recent activity (last 7 days)
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as challenge_count
        FROM user_challenge_completions 
        WHERE user_id = ANY(cohort_user_ids)
        AND completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_challenges ON uid.user_id = recent_challenges.user_id
    
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as reflection_count
        FROM user_reflections 
        WHERE user_id = ANY(cohort_user_ids)
        AND submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_reflections ON uid.user_id = recent_reflections.user_id
    
    ORDER BY uja.journey_completion_percentage DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_cohort_user_progress"("cohort_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_users_stats_fixed"("cohort_uuid" "uuid") RETURNS TABLE("user_id" "uuid", "email" character varying, "first_name" character varying, "last_name" character varying, "role" character varying, "created_at" timestamp with time zone, "total_challenges_completed" bigint, "total_reflections_submitted" bigint, "total_days_completed" bigint, "current_streak_days" integer, "journey_completion_percentage" numeric, "last_activity_at" timestamp with time zone, "recent_challenges_count" bigint, "recent_reflections_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    has_custom_challenges boolean;
BEGIN
    -- Check if this cohort has custom challenges
    SELECT EXISTS(
        SELECT 1 FROM customized_challenges 
        WHERE cohort_id = cohort_uuid
    ) INTO has_custom_challenges;

    RETURN QUERY
    SELECT 
        up.user_id,
        au.email,
        up.first_name,
        up.last_name,
        up.role,
        up.created_at,
        
        -- Progress stats from appropriate tracking tables
        CASE 
            WHEN has_custom_challenges THEN COALESCE(custom_challenge_stats.total_challenges, 0)
            ELSE COALESCE(regular_challenge_stats.total_challenges, 0)
        END as total_challenges_completed,
        
        CASE 
            WHEN has_custom_challenges THEN COALESCE(custom_reflection_stats.total_reflections, 0)
            ELSE COALESCE(regular_reflection_stats.total_reflections, 0)
        END as total_reflections_submitted,
        
        -- FIXED: Custom challenges only need both_challenges_completed, regular still need reflection
        CASE 
            WHEN has_custom_challenges THEN COALESCE(custom_day_stats.total_days, 0)
            ELSE COALESCE(regular_day_stats.total_days, 0)
        END as total_days_completed,
        
        COALESCE(journey_stats.current_streak_days, 0) as current_streak_days,
        COALESCE(journey_stats.journey_completion_percentage, 0) as journey_completion_percentage,
        journey_stats.last_activity_at,
        
        -- Recent activity (last 7 days) from appropriate tables
        CASE 
            WHEN has_custom_challenges THEN COALESCE(custom_recent_challenges.recent_count, 0)
            ELSE COALESCE(regular_recent_challenges.recent_count, 0)
        END as recent_challenges_count,
        
        CASE 
            WHEN has_custom_challenges THEN COALESCE(custom_recent_reflections.recent_count, 0)
            ELSE COALESCE(regular_recent_reflections.recent_count, 0)
        END as recent_reflections_count
        
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
    
    -- Regular challenge completion stats
    LEFT JOIN (
        SELECT 
            ucc.user_id,
            COUNT(*) as total_challenges
        FROM user_challenge_completions ucc
        GROUP BY ucc.user_id
    ) regular_challenge_stats ON up.user_id = regular_challenge_stats.user_id
    
    -- Customized challenge completion stats
    LEFT JOIN (
        SELECT 
            uccc.user_id,
            COUNT(*) as total_challenges
        FROM user_customized_challenge_completions uccc
        GROUP BY uccc.user_id
    ) custom_challenge_stats ON up.user_id = custom_challenge_stats.user_id
    
    -- Regular reflection stats
    LEFT JOIN (
        SELECT 
            ur.user_id,
            COUNT(*) as total_reflections
        FROM user_reflections ur
        GROUP BY ur.user_id
    ) regular_reflection_stats ON up.user_id = regular_reflection_stats.user_id
    
    -- Customized reflection stats
    LEFT JOIN (
        SELECT 
            ucr.user_id,
            COUNT(*) as total_reflections
        FROM user_customized_challenge_reflections ucr
        GROUP BY ucr.user_id
    ) custom_reflection_stats ON up.user_id = custom_reflection_stats.user_id
    
    -- Regular day completion stats (both challenges + reflection required)
    LEFT JOIN (
        SELECT 
            udc.user_id,
            COUNT(*) as total_days
        FROM user_day_completions udc
        WHERE udc.both_challenges_completed = true AND udc.reflection_submitted = true
        GROUP BY udc.user_id
    ) regular_day_stats ON up.user_id = regular_day_stats.user_id
    
    -- FIXED: Customized day completion stats (only both challenges required, reflection optional)
    LEFT JOIN (
        SELECT 
            ucdc.user_id,
            COUNT(*) as total_days
        FROM user_customized_day_completions ucdc
        WHERE ucdc.both_challenges_completed = true
        GROUP BY ucdc.user_id
    ) custom_day_stats ON up.user_id = custom_day_stats.user_id
    
    -- Journey analytics (if available)
    LEFT JOIN user_journey_analytics journey_stats ON up.user_id = journey_stats.user_id
    
    -- Recent regular challenges (last 7 days)
    LEFT JOIN (
        SELECT 
            ucc.user_id,
            COUNT(*) as recent_count
        FROM user_challenge_completions ucc
        WHERE ucc.completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY ucc.user_id
    ) regular_recent_challenges ON up.user_id = regular_recent_challenges.user_id
    
    -- Recent customized challenges (last 7 days)
    LEFT JOIN (
        SELECT 
            uccc.user_id,
            COUNT(*) as recent_count
        FROM user_customized_challenge_completions uccc
        WHERE uccc.completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY uccc.user_id
    ) custom_recent_challenges ON up.user_id = custom_recent_challenges.user_id
    
    -- Recent regular reflections (last 7 days)
    LEFT JOIN (
        SELECT 
            ur.user_id,
            COUNT(*) as recent_count
        FROM user_reflections ur
        WHERE ur.submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY ur.user_id
    ) regular_recent_reflections ON up.user_id = regular_recent_reflections.user_id
    
    -- Recent customized reflections (last 7 days)
    LEFT JOIN (
        SELECT 
            ucr.user_id,
            COUNT(*) as recent_count
        FROM user_customized_challenge_reflections ucr
        WHERE ucr.submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY ucr.user_id
    ) custom_recent_reflections ON up.user_id = custom_recent_reflections.user_id
    
    WHERE up.cohort_id = cohort_uuid
    ORDER BY up.first_name;
END;
$$;


ALTER FUNCTION "public"."get_cohort_users_stats_fixed"("cohort_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_users_with_stats"("target_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" character varying, "last_name" character varying, "role" character varying, "created_at" timestamp with time zone, "total_challenges_completed" bigint, "total_reflections_submitted" bigint, "total_days_completed" bigint, "current_streak_days" integer, "journey_completion_percentage" numeric, "last_activity_at" timestamp with time zone, "recent_challenges_count" bigint, "recent_reflections_count" bigint, "is_customized_cohort" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH cohort_type AS (
        -- Check if this cohort has customized challenges
        SELECT EXISTS(
            SELECT 1 FROM customized_challenges 
            WHERE cohort_id = target_cohort_id AND is_active = true
        ) as is_customized
    ),
    user_stats AS (
        SELECT 
            up.user_id,
            au.email,
            up.first_name,
            up.last_name,
            up.role,
            up.created_at,
            
            -- Challenge completions (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_challenge_stats.total_challenges, 0)
                ELSE COALESCE(normal_challenge_stats.total_challenges, 0)
            END as total_challenges_completed,
            
            -- Reflections (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_reflection_stats.total_reflections, 0)
                ELSE COALESCE(normal_reflection_stats.total_reflections, 0)
            END as total_reflections_submitted,
            
            -- Day completions (use appropriate table based on cohort type)
            -- FIXED: For custom challenges, only require both_challenges_completed
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_day_stats.total_days, 0)
                ELSE COALESCE(normal_day_stats.total_days, 0)
            END as total_days_completed,
            
            -- Journey analytics
            COALESCE(journey_stats.current_streak_days, 0) as current_streak_days,
            COALESCE(journey_stats.journey_completion_percentage, 0) as journey_completion_percentage,
            journey_stats.last_activity_at,
            
            -- Recent challenges (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_recent_challenges.recent_count, 0)
                ELSE COALESCE(normal_recent_challenges.recent_count, 0)
            END as recent_challenges_count,
            
            -- Recent reflections (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_recent_reflections.recent_count, 0)
                ELSE COALESCE(normal_recent_reflections.recent_count, 0)
            END as recent_reflections_count,
            
            ct.is_customized as is_customized_cohort
            
        FROM user_profiles up
        LEFT JOIN auth.users au ON up.user_id = au.id
        CROSS JOIN cohort_type ct
        
        -- Normal challenge completion stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_challenges
            FROM user_challenge_completions
            GROUP BY user_id
        ) normal_challenge_stats ON up.user_id = normal_challenge_stats.user_id
        
        -- Customized challenge completion stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_challenges
            FROM user_customized_challenge_completions
            GROUP BY user_id
        ) custom_challenge_stats ON up.user_id = custom_challenge_stats.user_id
        
        -- Normal reflection stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_reflections
            FROM user_reflections
            GROUP BY user_id
        ) normal_reflection_stats ON up.user_id = normal_reflection_stats.user_id
        
        -- Customized reflection stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_reflections
            FROM user_customized_challenge_reflections
            GROUP BY user_id
        ) custom_reflection_stats ON up.user_id = custom_reflection_stats.user_id
        
        -- Normal day completion stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_days
            FROM user_day_completions
            GROUP BY user_id
        ) normal_day_stats ON up.user_id = normal_day_stats.user_id
        
        -- Customized day completion stats - FIXED to only require both challenges
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_days
            FROM user_customized_day_completions
            WHERE both_challenges_completed = true
            GROUP BY user_id
        ) custom_day_stats ON up.user_id = custom_day_stats.user_id
        
        -- Journey analytics
        LEFT JOIN user_journey_analytics journey_stats ON up.user_id = journey_stats.user_id
        
        -- Recent normal challenges (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_challenge_completions
            WHERE completed_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) normal_recent_challenges ON up.user_id = normal_recent_challenges.user_id
        
        -- Recent customized challenges (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_customized_challenge_completions
            WHERE completed_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) custom_recent_challenges ON up.user_id = custom_recent_challenges.user_id
        
        -- Recent normal reflections (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_reflections
            WHERE submitted_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) normal_recent_reflections ON up.user_id = normal_recent_reflections.user_id
        
        -- Recent customized reflections (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_customized_challenge_reflections
            WHERE submitted_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) custom_recent_reflections ON up.user_id = custom_recent_reflections.user_id
        
        WHERE up.cohort_id = target_cohort_id
    )
    SELECT 
        user_stats.user_id,
        user_stats.email,
        user_stats.first_name,
        user_stats.last_name,
        user_stats.role,
        user_stats.created_at,
        user_stats.total_challenges_completed,
        user_stats.total_reflections_submitted,
        user_stats.total_days_completed,
        user_stats.current_streak_days,
        user_stats.journey_completion_percentage,
        user_stats.last_activity_at,
        user_stats.recent_challenges_count,
        user_stats.recent_reflections_count
    FROM user_stats
    ORDER BY first_name;
END;
$$;


ALTER FUNCTION "public"."get_cohort_users_with_stats"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_users_with_stats_enhanced"("target_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "role" "text", "created_at" timestamp with time zone, "total_challenges_completed" integer, "total_reflections_submitted" integer, "total_days_completed" integer, "current_streak_days" integer, "journey_completion_percentage" numeric, "last_activity_at" timestamp with time zone, "recent_challenges_count" integer, "recent_reflections_count" integer, "is_customized_cohort" boolean)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH cohort_type AS (
        -- Check if this cohort has customized challenges
        SELECT EXISTS(
            SELECT 1 FROM customized_challenges 
            WHERE cohort_id = target_cohort_id AND is_active = true
        ) as is_customized
    ),
    user_stats AS (
        SELECT 
            up.user_id,
            au.email,
            up.first_name,
            up.last_name,
            up.role,
            up.created_at,
            
            -- Challenge completions (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_challenge_stats.total_challenges, 0)
                ELSE COALESCE(normal_challenge_stats.total_challenges, 0)
            END as total_challenges_completed,
            
            -- Reflections (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_reflection_stats.total_reflections, 0)
                ELSE COALESCE(normal_reflection_stats.total_reflections, 0)
            END as total_reflections_submitted,
            
            -- Day completions (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_day_stats.total_days, 0)
                ELSE COALESCE(normal_day_stats.total_days, 0)
            END as total_days_completed,
            
            -- Journey analytics
            COALESCE(journey_stats.current_streak_days, 0) as current_streak_days,
            COALESCE(journey_stats.journey_completion_percentage, 0) as journey_completion_percentage,
            journey_stats.last_activity_at,
            
            -- Recent challenges (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_recent_challenges.recent_count, 0)
                ELSE COALESCE(normal_recent_challenges.recent_count, 0)
            END as recent_challenges_count,
            
            -- Recent reflections (use appropriate table based on cohort type)
            CASE 
                WHEN ct.is_customized THEN COALESCE(custom_recent_reflections.recent_count, 0)
                ELSE COALESCE(normal_recent_reflections.recent_count, 0)
            END as recent_reflections_count,
            
            ct.is_customized as is_customized_cohort
            
        FROM user_profiles up
        LEFT JOIN auth.users au ON up.user_id = au.id
        CROSS JOIN cohort_type ct
        
        -- Normal challenge completion stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_challenges
            FROM user_challenge_completions
            GROUP BY user_id
        ) normal_challenge_stats ON up.user_id = normal_challenge_stats.user_id
        
        -- Customized challenge completion stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_challenges
            FROM user_customized_challenge_completions
            GROUP BY user_id
        ) custom_challenge_stats ON up.user_id = custom_challenge_stats.user_id
        
        -- Normal reflection stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_reflections
            FROM user_reflections
            GROUP BY user_id
        ) normal_reflection_stats ON up.user_id = normal_reflection_stats.user_id
        
        -- Customized reflection stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_reflections
            FROM user_customized_challenge_reflections
            GROUP BY user_id
        ) custom_reflection_stats ON up.user_id = custom_reflection_stats.user_id
        
        -- Normal day completion stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_days
            FROM user_day_completions
            GROUP BY user_id
        ) normal_day_stats ON up.user_id = normal_day_stats.user_id
        
        -- Customized day completion stats
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as total_days
            FROM user_customized_day_completions
            GROUP BY user_id
        ) custom_day_stats ON up.user_id = custom_day_stats.user_id
        
        -- Journey analytics
        LEFT JOIN user_journey_analytics journey_stats ON up.user_id = journey_stats.user_id
        
        -- Recent normal challenges (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_challenge_completions
            WHERE completed_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) normal_recent_challenges ON up.user_id = normal_recent_challenges.user_id
        
        -- Recent customized challenges (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_customized_challenge_completions
            WHERE completed_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) custom_recent_challenges ON up.user_id = custom_recent_challenges.user_id
        
        -- Recent normal reflections (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_reflections
            WHERE submitted_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) normal_recent_reflections ON up.user_id = normal_recent_reflections.user_id
        
        -- Recent customized reflections (last 7 days)
        LEFT JOIN (
            SELECT 
                user_id,
                COUNT(*) as recent_count
            FROM user_customized_challenge_reflections
            WHERE submitted_at >= NOW() - INTERVAL '7 days'
            GROUP BY user_id
        ) custom_recent_reflections ON up.user_id = custom_recent_reflections.user_id
        
        WHERE up.cohort_id = target_cohort_id
    )
    SELECT * FROM user_stats
    ORDER BY first_name;
END;
$$;


ALTER FUNCTION "public"."get_cohort_users_with_stats_enhanced"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customized_cohort_user_progress"("cohort_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "total_days_completed" integer, "total_challenges_completed" integer, "total_reflections_submitted" integer, "journey_completion_percentage" numeric, "current_streak_days" integer, "last_activity_at" timestamp with time zone, "recent_challenge_count" integer, "recent_reflection_count" integer, "pre_survey_completed" boolean, "pre_survey_completed_at" timestamp with time zone, "post_survey_completed" boolean, "post_survey_completed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uid.user_id,
        COALESCE(uja.total_days_completed, 0) as total_days_completed,
        COALESCE(uja.total_challenges_completed, 0) as total_challenges_completed,
        COALESCE(uja.total_reflections_submitted, 0) as total_reflections_submitted,
        COALESCE(uja.journey_completion_percentage, 0.00) as journey_completion_percentage,
        COALESCE(uja.current_streak_days, 0) as current_streak_days,
        uja.last_activity_at,
        COALESCE(recent_challenges.challenge_count, 0) as recent_challenge_count,
        COALESCE(recent_reflections.reflection_count, 0) as recent_reflection_count,
        
        -- Survey completion data
        (pre_surveys.user_id IS NOT NULL) as pre_survey_completed,
        pre_surveys.completed_at as pre_survey_completed_at,
        (post_surveys.user_id IS NOT NULL) as post_survey_completed,
        post_surveys.completed_at as post_survey_completed_at
        
    FROM unnest(cohort_user_ids) AS uid(user_id)
    LEFT JOIN user_journey_analytics uja ON uid.user_id = uja.user_id
    
    -- Survey data
    LEFT JOIN pre_survey_responses pre_surveys ON uid.user_id = pre_surveys.user_id
    LEFT JOIN post_survey_responses post_surveys ON uid.user_id = post_surveys.user_id
    
    -- Recent activity (last 7 days) - using customized tables
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as challenge_count
        FROM user_customized_challenge_completions 
        WHERE user_id = ANY(cohort_user_ids)
        AND completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_challenges ON uid.user_id = recent_challenges.user_id
    
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as reflection_count
        FROM user_customized_challenge_reflections 
        WHERE user_id = ANY(cohort_user_ids)
        AND submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY user_id
    ) recent_reflections ON uid.user_id = recent_reflections.user_id
    
    ORDER BY uja.journey_completion_percentage DESC NULLS LAST;
END;
$$;


ALTER FUNCTION "public"."get_customized_cohort_user_progress"("cohort_user_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enhanced_cohort_leaderboard"("target_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "first_name" "text", "last_name" "text", "total_days_completed" integer, "total_challenges_completed" integer, "total_reflections_submitted" integer, "current_streak_days" integer, "journey_completion_percentage" numeric, "surveys_completed" integer, "rank_position" integer)
    LANGUAGE "sql" STABLE
    AS $$
  select *
  from public.get_enhanced_cohort_leaderboard_v2(target_cohort_id);
$$;


ALTER FUNCTION "public"."get_enhanced_cohort_leaderboard"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enhanced_cohort_leaderboard_v2"("target_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "first_name" "text", "last_name" "text", "total_days_completed" integer, "total_challenges_completed" integer, "total_reflections_submitted" integer, "current_streak_days" integer, "journey_completion_percentage" numeric, "surveys_completed" integer, "rank_position" integer)
    LANGUAGE "sql" STABLE
    AS $$
with
cohort_window as (
  select c.start_date::date as start_date, c.end_date::date as end_date
  from public.cohorts c
  where c.id = target_cohort_id
),
cohort_users as (
  select up.user_id, up.first_name, up.last_name
  from public.user_profiles up
  where up.cohort_id = target_cohort_id
),
program_completions as (
  select d.user_id,
         (coalesce(d.updated_at, d.created_at))::date as activity_date,
         ch.order_index::int as day_number,
         d.both_challenges_completed,
         d.reflection_submitted
  from public.user_day_completions d
  join public.challenges ch on ch.id = d.challenge_id
  where exists (select 1 from cohort_users u where u.user_id = d.user_id)
  union all
  select d.user_id,
         (coalesce(d.updated_at, d.created_at))::date as activity_date,
         cch.order_index::int as day_number,
         d.both_challenges_completed,
         d.reflection_submitted
  from public.user_customized_day_completions d
  join public.customized_challenges cch on cch.id = d.challenge_id
  where exists (select 1 from cohort_users u where u.user_id = d.user_id)
),
valid_day_numbers as (
  select distinct pc.user_id, pc.day_number
  from program_completions pc
  where pc.day_number between 1 and 15
    and (pc.both_challenges_completed is true or pc.reflection_submitted is true)
),
survey_days as (
  select ps.user_id, 0  as day_number from public.pre_survey_responses  ps
  union all
  select qs.user_id, 16 as day_number from public.post_survey_responses qs
),
days_agg as (
  select u.user_id, count(distinct v.day_number) as total_days_completed
  from cohort_users u
  left join (
    select * from valid_day_numbers
    union all
    select * from survey_days
  ) v on v.user_id = u.user_id
  group by u.user_id
),
challenge_counts as (
  select u.user_id,
         coalesce((select count(*) from public.user_challenge_completions c where c.user_id = u.user_id), 0) +
         coalesce((select count(*) from public.user_customized_challenge_completions c where c.user_id = u.user_id), 0)
  as total_challenges_completed
  from cohort_users u
),
reflection_counts as (
  select u.user_id,
         coalesce((select count(*) from public.user_reflections r where r.user_id = u.user_id), 0) +
         coalesce((select count(*) from public.user_customized_challenge_reflections r where r.user_id = u.user_id), 0)
  as total_reflections_submitted
  from cohort_users u
),
survey_counts as (
  select u.user_id,
         coalesce((select count(*) from public.pre_survey_responses  s where s.user_id = u.user_id), 0) +
         coalesce((select count(*) from public.post_survey_responses s where s.user_id = u.user_id), 0)
  as surveys_completed
  from cohort_users u
),
program_completions_windowed as (
  select pc.*
  from program_completions pc, cohort_window w
  where (w.start_date is null or pc.activity_date >= w.start_date)
    and (w.end_date   is null or pc.activity_date <= w.end_date)
),
streak_dates as (
  select pc.user_id, pc.activity_date
  from program_completions_windowed pc
  where (pc.both_challenges_completed is true or pc.reflection_submitted is true)
  group by pc.user_id, pc.activity_date
),
anchor as (
  select coalesce(least(current_date, w.end_date), current_date) as anchor_date
  from cohort_window w
),
streaks as (
  with recursive walk(user_id, d) as (
    select sd.user_id, a.anchor_date
    from streak_dates sd cross join anchor a
    where sd.activity_date = a.anchor_date
    union all
    select w.user_id, (w.d - interval '1 day')::date
    from walk w
    join streak_dates sd
      on sd.user_id = w.user_id
     and sd.activity_date = (w.d - interval '1 day')::date
  )
  select u.user_id, coalesce(count(w.d), 0) as current_streak_days
  from cohort_users u
  left join walk w on w.user_id = u.user_id
  group by u.user_id
),
combined as (
  select
    u.user_id, u.first_name, u.last_name,
    coalesce(d.total_days_completed, 0)        as total_days_completed,
    coalesce(c.total_challenges_completed, 0)  as total_challenges_completed,
    coalesce(r.total_reflections_submitted, 0) as total_reflections_submitted,
    coalesce(s.current_streak_days, 0)         as current_streak_days,
    coalesce(sc.surveys_completed, 0)          as surveys_completed,
    round((coalesce(d.total_days_completed, 0)::numeric / 17) * 100, 2) as journey_completion_percentage
  from cohort_users u
  left join days_agg         d  on d.user_id  = u.user_id
  left join challenge_counts c  on c.user_id  = u.user_id
  left join reflection_counts r on r.user_id  = u.user_id
  left join streaks          s  on s.user_id  = u.user_id
  left join survey_counts    sc on sc.user_id = u.user_id
)
select
  user_id, first_name, last_name,
  total_days_completed, total_challenges_completed, total_reflections_submitted,
  current_streak_days, journey_completion_percentage, surveys_completed,
  row_number() over (
    order by total_days_completed desc,
             total_challenges_completed desc,
             total_reflections_submitted desc
  ) as rank_position
from combined
order by rank_position;
$$;


ALTER FUNCTION "public"."get_enhanced_cohort_leaderboard_v2"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hybrid_cohort_users_with_stats"("target_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" character varying, "last_name" character varying, "role" character varying, "created_at" timestamp with time zone, "default_challenges_completed" integer, "custom_challenges_completed" integer, "total_challenges_completed" integer, "default_reflections_submitted" integer, "custom_reflections_submitted" integer, "total_reflections_submitted" integer, "default_days_completed" integer, "custom_days_completed" integer, "total_days_completed" integer, "completion_type" "text", "current_streak_days" integer, "journey_completion_percentage" numeric, "last_activity_at" timestamp with time zone, "recent_challenges_count" integer, "recent_reflections_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.user_id,
        au.email::TEXT,
        up.first_name,
        up.last_name,
        up.role,
        up.created_at,
        
        -- Challenge completions (both types)
        COALESCE(default_challenges.count, 0)::INTEGER as default_challenges_completed,
        COALESCE(custom_challenges.count, 0)::INTEGER as custom_challenges_completed,
        (COALESCE(default_challenges.count, 0) + COALESCE(custom_challenges.count, 0))::INTEGER as total_challenges_completed,
        
        -- Reflection completions (both types)
        COALESCE(default_reflections.count, 0)::INTEGER as default_reflections_submitted,
        COALESCE(custom_reflections.count, 0)::INTEGER as custom_reflections_submitted,
        (COALESCE(default_reflections.count, 0) + COALESCE(custom_reflections.count, 0))::INTEGER as total_reflections_submitted,
        
        -- Day completions (both types) - FIXED: Only require both_challenges_completed
        COALESCE(default_days.count, 0)::INTEGER as default_days_completed,
        COALESCE(custom_days.count, 0)::INTEGER as custom_days_completed,
        (COALESCE(default_days.count, 0) + COALESCE(custom_days.count, 0))::INTEGER as total_days_completed,
        
        -- Activity classification
        CASE 
            WHEN COALESCE(custom_challenges.count, 0) > 0 AND COALESCE(default_challenges.count, 0) > 0 THEN 'MIXED'
            WHEN COALESCE(custom_challenges.count, 0) > 0 THEN 'CUSTOM_ONLY'
            WHEN COALESCE(default_challenges.count, 0) > 0 THEN 'DEFAULT_ONLY'
            ELSE 'NO_ACTIVITY'
        END::TEXT as completion_type,
        
        -- Journey analytics (existing)
        COALESCE(uja.current_streak_days, 0)::INTEGER as current_streak_days,
        COALESCE(uja.journey_completion_percentage, 0.00) as journey_completion_percentage,
        uja.last_activity_at,
        
        -- Recent activity (last 7 days) - sum both types
        (COALESCE(recent_default_challenges.count, 0) + COALESCE(recent_custom_challenges.count, 0))::INTEGER as recent_challenges_count,
        (COALESCE(recent_default_reflections.count, 0) + COALESCE(recent_custom_reflections.count, 0))::INTEGER as recent_reflections_count

    FROM user_profiles up
    JOIN auth.users au ON up.user_id = au.id
    LEFT JOIN user_journey_analytics uja ON up.user_id = uja.user_id

    -- Default challenge completions
    LEFT JOIN (
        SELECT ucc.user_id, COUNT(*) as count
        FROM user_challenge_completions ucc
        GROUP BY ucc.user_id
    ) default_challenges ON up.user_id = default_challenges.user_id

    -- Custom challenge completions
    LEFT JOIN (
        SELECT uccc.user_id, COUNT(*) as count
        FROM user_customized_challenge_completions uccc
        GROUP BY uccc.user_id
    ) custom_challenges ON up.user_id = custom_challenges.user_id

    -- Default reflections
    LEFT JOIN (
        SELECT ur.user_id, COUNT(*) as count
        FROM user_reflections ur
        GROUP BY ur.user_id
    ) default_reflections ON up.user_id = default_reflections.user_id

    -- Custom reflections
    LEFT JOIN (
        SELECT ucr.user_id, COUNT(*) as count
        FROM user_customized_challenge_reflections ucr
        GROUP BY ucr.user_id
    ) custom_reflections ON up.user_id = custom_reflections.user_id

    -- FIXED: Default day completions - only require both_challenges_completed (reflection optional)
    LEFT JOIN (
        SELECT udc.user_id, COUNT(*) as count
        FROM user_day_completions udc
        WHERE udc.both_challenges_completed = true
        GROUP BY udc.user_id
    ) default_days ON up.user_id = default_days.user_id

    -- FIXED: Custom day completions - only require both_challenges_completed (reflection optional)
    LEFT JOIN (
        SELECT ucdc.user_id, COUNT(*) as count
        FROM user_customized_day_completions ucdc
        WHERE ucdc.both_challenges_completed = true
        GROUP BY ucdc.user_id
    ) custom_days ON up.user_id = custom_days.user_id

    -- Recent default challenges (last 7 days)
    LEFT JOIN (
        SELECT ucc.user_id, COUNT(*) as count
        FROM user_challenge_completions ucc
        WHERE ucc.completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY ucc.user_id
    ) recent_default_challenges ON up.user_id = recent_default_challenges.user_id

    -- Recent custom challenges (last 7 days)
    LEFT JOIN (
        SELECT uccc.user_id, COUNT(*) as count
        FROM user_customized_challenge_completions uccc
        WHERE uccc.completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY uccc.user_id
    ) recent_custom_challenges ON up.user_id = recent_custom_challenges.user_id

    -- Recent default reflections (last 7 days)
    LEFT JOIN (
        SELECT ur.user_id, COUNT(*) as count
        FROM user_reflections ur
        WHERE ur.submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY ur.user_id
    ) recent_default_reflections ON up.user_id = recent_default_reflections.user_id

    -- Recent custom reflections (last 7 days)
    LEFT JOIN (
        SELECT ucr.user_id, COUNT(*) as count
        FROM user_customized_challenge_reflections ucr
        WHERE ucr.submitted_at >= NOW() - INTERVAL '7 days'
        GROUP BY ucr.user_id
    ) recent_custom_reflections ON up.user_id = recent_custom_reflections.user_id

    WHERE up.cohort_id = target_cohort_id
    ORDER BY up.first_name;
END;
$$;


ALTER FUNCTION "public"."get_hybrid_cohort_users_with_stats"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_next_business_day"("input_date" "date", "days_to_add" integer) RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result_date DATE;
    business_days_added INTEGER := 0;
BEGIN
    result_date := input_date;
    
    WHILE business_days_added < days_to_add LOOP
        result_date := result_date + 1;
        -- Skip weekends (Saturday = 6, Sunday = 0)
        IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
            business_days_added := business_days_added + 1;
        END IF;
    END LOOP;
    
    RETURN result_date;
END;
$$;


ALTER FUNCTION "public"."get_next_business_day"("input_date" "date", "days_to_add" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_admin_activity"("days_back" integer DEFAULT 7) RETURNS TABLE("audit_timestamp" timestamp with time zone, "action_type" "text", "description" "text", "target_table" "text", "admin_email" "text", "admin_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aal.created_at,
        aal.action_type,
        aal.description,
        aal.target_table,
        aal.admin_email,
        aal.admin_role
    FROM public.admin_action_log aal
    WHERE aal.created_at >= now() - (days_back || ' days')::interval
    ORDER BY aal.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_recent_admin_activity"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_safe_accessible_cohorts"() RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "start_date" "date", "end_date" "date", "status" "text", "is_active" boolean, "organization_name" "text", "cohort_type" "text", "max_participants" integer, "access_type" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT 
        saca.id,
        saca.name,
        saca.description,
        saca.start_date,
        saca.end_date,
        saca.status,
        saca.is_active,
        saca.organization_name,
        saca.cohort_type,
        saca.max_participants,
        saca.access_type,
        saca.created_at,
        saca.updated_at
    FROM safe_admin_cohort_access saca
    ORDER BY saca.name;
$$;


ALTER FUNCTION "public"."get_safe_accessible_cohorts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_activity_timeline"("target_user_id" "uuid", "days_back" integer DEFAULT 30) RETURNS TABLE("activity_date" "date", "activity_type" "text", "activity_description" "text", "challenge_day" integer, "activity_time" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    -- Challenge completions
    SELECT 
        uc.completed_at::DATE as activity_date,
        'challenge_completion' as activity_type,
        'Completed Challenge ' || uc.challenge_number || ' of Day ' || c.order_index as activity_description,
        c.order_index as challenge_day,
        uc.completed_at as activity_time
    FROM user_challenge_completions uc
    JOIN challenges c ON uc.challenge_id = c.id
    WHERE uc.user_id = target_user_id
    AND uc.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Reflection submissions
    SELECT 
        ur.submitted_at::DATE as activity_date,
        'reflection_submission' as activity_type,
        'Submitted reflection for Day ' || c.order_index as activity_description,
        c.order_index as challenge_day,
        ur.submitted_at as activity_time
    FROM user_reflections ur
    JOIN challenges c ON ur.challenge_id = c.id
    WHERE ur.user_id = target_user_id
    AND ur.submitted_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Day completions
    SELECT 
        ud.completed_at::DATE as activity_date,
        'day_completion' as activity_type,
        'Completed Day ' || c.order_index || ' (both challenges + reflection)' as activity_description,
        c.order_index as challenge_day,
        ud.completed_at as activity_time
    FROM user_day_completions ud
    JOIN challenges c ON ud.challenge_id = c.id
    WHERE ud.user_id = target_user_id
    AND ud.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND ud.both_challenges_completed = true
    AND ud.reflection_submitted = true
    
    ORDER BY activity_time DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_activity_timeline"("target_user_id" "uuid", "days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_audit_history"("target_user_id" "uuid") RETURNS TABLE("audit_timestamp" timestamp with time zone, "action_type" "text", "description" "text", "admin_email" "text", "admin_role" "text", "details" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        aal.created_at,
        aal.action_type,
        aal.description,
        aal.admin_email,
        aal.admin_role,
        aal.details
    FROM public.admin_action_log aal
    WHERE aal.target_id = target_user_id
       OR (aal.target_table = 'user_profiles' AND aal.target_id = target_user_id)
    ORDER BY aal.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_audit_history"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_detailed_progress"("target_user_id" "uuid") RETURNS TABLE("challenge_id" "uuid", "challenge_title" "text", "challenge_day" integer, "challenge_1_completed" boolean, "challenge_1_completed_at" timestamp with time zone, "challenge_2_completed" boolean, "challenge_2_completed_at" timestamp with time zone, "reflection_completed" boolean, "reflection_submitted_at" timestamp with time zone, "reflection_word_count" integer, "day_completed" boolean, "day_completed_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT 
        c.id as challenge_id,
        c.title as challenge_title,
        c.order_index as challenge_day,
        
        -- Challenge 1 completion
        (cc1.id IS NOT NULL) as challenge_1_completed,
        cc1.completed_at as challenge_1_completed_at,
        
        -- Challenge 2 completion  
        (cc2.id IS NOT NULL) as challenge_2_completed,
        cc2.completed_at as challenge_2_completed_at,
        
        -- Reflection completion
        (ur.id IS NOT NULL) as reflection_completed,
        ur.submitted_at as reflection_submitted_at,
        ur.word_count as reflection_word_count,
        
        -- Day completion
        (ud.id IS NOT NULL) as day_completed,
        ud.completed_at as day_completed_at
        
    FROM challenges c
    LEFT JOIN user_challenge_completions cc1 ON (
        c.id = cc1.challenge_id 
        AND cc1.user_id = target_user_id 
        AND cc1.challenge_number = 1
    )
    LEFT JOIN user_challenge_completions cc2 ON (
        c.id = cc2.challenge_id 
        AND cc2.user_id = target_user_id 
        AND cc2.challenge_number = 2
    )
    LEFT JOIN user_reflections ur ON (
        c.id = ur.challenge_id 
        AND ur.user_id = target_user_id
    )
    LEFT JOIN user_day_completions ud ON (
        c.id = ud.challenge_id 
        AND ud.user_id = target_user_id
    )
    WHERE c.is_active = true
    ORDER BY c.order_index;
$$;


ALTER FUNCTION "public"."get_user_detailed_progress"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_emails_for_cohort"("target_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "role" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT 
        up.user_id,
        au.email,
        up.first_name,
        up.last_name,
        up.role,
        up.created_at
    FROM user_profiles up
    LEFT JOIN auth.users au ON up.user_id = au.id
    WHERE up.cohort_id = target_cohort_id
    ORDER BY up.first_name;
$$;


ALTER FUNCTION "public"."get_user_emails_for_cohort"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_recent_activity_detailed"("target_user_id" "uuid", "days_back" integer DEFAULT 7) RETURNS TABLE("activity_date" "date", "activity_type" "text", "activity_description" "text", "challenge_day" integer, "challenge_title" "text", "activity_time" timestamp with time zone, "word_count" integer)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    -- Challenge completions
    SELECT 
        uc.completed_at::DATE as activity_date,
        'challenge_completion' as activity_type,
        'Completed Challenge ' || uc.challenge_number || ' of Day ' || c.order_index || ': ' || c.title as activity_description,
        c.order_index as challenge_day,
        c.title as challenge_title,
        uc.completed_at as activity_time,
        NULL::INTEGER as word_count
    FROM user_challenge_completions uc
    JOIN challenges c ON uc.challenge_id = c.id
    WHERE uc.user_id = target_user_id
    AND uc.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Reflection submissions
    SELECT 
        ur.submitted_at::DATE as activity_date,
        'reflection_submission' as activity_type,
        'Submitted reflection for Day ' || c.order_index || ': ' || c.title as activity_description,
        c.order_index as challenge_day,
        c.title as challenge_title,
        ur.submitted_at as activity_time,
        ur.word_count
    FROM user_reflections ur
    JOIN challenges c ON ur.challenge_id = c.id
    WHERE ur.user_id = target_user_id
    AND ur.submitted_at >= NOW() - (days_back || ' days')::INTERVAL
    
    UNION ALL
    
    -- Day completions
    SELECT 
        ud.completed_at::DATE as activity_date,
        'day_completion' as activity_type,
        'Completed Day ' || c.order_index || ': ' || c.title || ' (Full Day!)' as activity_description,
        c.order_index as challenge_day,
        c.title as challenge_title,
        ud.completed_at as activity_time,
        NULL::INTEGER as word_count
    FROM user_day_completions ud
    JOIN challenges c ON ud.challenge_id = c.id
    WHERE ud.user_id = target_user_id
    AND ud.completed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND ud.both_challenges_completed = true
    AND ud.reflection_submitted = true
    
    ORDER BY activity_time DESC;
$$;


ALTER FUNCTION "public"."get_user_recent_activity_detailed"("target_user_id" "uuid", "days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_survey_status"("target_user_id" "uuid") RETURNS TABLE("pre_survey_completed" boolean, "pre_survey_completed_at" timestamp with time zone, "post_survey_completed" boolean, "post_survey_completed_at" timestamp with time zone, "total_surveys_completed" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (pre.id IS NOT NULL) as pre_survey_completed,
        pre.completed_at as pre_survey_completed_at,
        (post.id IS NOT NULL) as post_survey_completed,
        post.completed_at as post_survey_completed_at,
        (CASE WHEN pre.id IS NOT NULL THEN 1 ELSE 0 END) + 
        (CASE WHEN post.id IS NOT NULL THEN 1 ELSE 0 END) as total_surveys_completed
    FROM (SELECT 1) dummy
    LEFT JOIN pre_survey_responses pre ON pre.user_id = target_user_id
    LEFT JOIN post_survey_responses post ON post.user_id = target_user_id;
END;
$$;


ALTER FUNCTION "public"."get_user_survey_status"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_with_emails"() RETURNS TABLE("user_id" "uuid", "first_name" character varying, "last_name" character varying, "email" character varying, "role" character varying, "organization_name" character varying, "cohort_id" "uuid", "created_at" timestamp with time zone, "cohort_name" character varying, "cohort_organization" character varying, "cohort_start_date" "date", "cohort_end_date" "date")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    au.email,
    up.role,
    up.organization_name,
    up.cohort_id,
    up.created_at,
    c.name as cohort_name,
    c.organization_name as cohort_organization,
    c.start_date as cohort_start_date,
    c.end_date as cohort_end_date
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.user_id = au.id
  LEFT JOIN cohorts c ON up.cohort_id = c.id
  WHERE up.role != 'super_admin'
  ORDER BY up.first_name;
$$;


ALTER FUNCTION "public"."get_users_with_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_admin_action"("action_type" "text", "description" "text", "target_table" "text" DEFAULT NULL::"text", "target_id" "uuid" DEFAULT NULL::"uuid", "details" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    admin_user_id uuid;
    admin_email text;
    admin_role text;
    log_id uuid;
BEGIN
    -- Get current user info
    admin_user_id := auth.uid();
    
    -- Get user details if authenticated
    IF admin_user_id IS NOT NULL THEN
        SELECT up.role, au.email 
        INTO admin_role, admin_email
        FROM user_profiles up
        JOIN auth.users au ON up.user_id = au.id
        WHERE up.user_id = admin_user_id;
    END IF;
    
    -- Only log if user is admin or super_admin
    IF admin_role IN ('admin', 'super_admin') THEN
        INSERT INTO public.admin_action_log (
            action_type, 
            description, 
            target_table, 
            target_id, 
            details,
            admin_user_id, 
            admin_email, 
            admin_role
        ) VALUES (
            action_type, 
            description, 
            target_table, 
            target_id, 
            details,
            admin_user_id, 
            admin_email, 
            admin_role
        ) RETURNING id INTO log_id;
        
        RETURN log_id;
    ELSE
        RAISE EXCEPTION 'Only admins can log actions';
    END IF;
END;
$$;


ALTER FUNCTION "public"."log_admin_action"("action_type" "text", "description" "text", "target_table" "text", "target_id" "uuid", "details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_due_emails"() RETURNS TABLE("processed_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    due_count INTEGER;
BEGIN
    -- Count emails that are due now (scheduled_for <= now)
    SELECT COUNT(*) INTO due_count
    FROM simple_email_queue 
    WHERE status = 'pending' 
    AND scheduled_for <= now();
    
    IF due_count = 0 THEN
        RETURN QUERY SELECT 0, 'No emails are due for processing at this time';
        RETURN;
    END IF;
    
    -- For now, return the count - the actual processing happens in the edge function
    RETURN QUERY SELECT due_count, 'Found ' || due_count || ' emails ready to send. Use the Process Queue button to send them.';
END;
$$;


ALTER FUNCTION "public"."process_due_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_pending_emails"() RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result_json json;
    pending_count integer;
BEGIN
    -- Count pending emails
    SELECT COUNT(*) INTO pending_count
    FROM email_auto_queue 
    WHERE status = 'pending' 
    AND scheduled_for <= NOW();
    
    -- Return result
    SELECT json_build_object(
        'success', true,
        'pending_emails', pending_count,
        'message', 'Found ' || pending_count || ' pending emails'
    ) INTO result_json;
    
    RETURN result_json;
END;
$$;


ALTER FUNCTION "public"."process_pending_emails"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."schedule_cohort_emails_simple"("target_cohort_id" "uuid") RETURNS TABLE("scheduled_count" integer, "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cohort_record RECORD;
    user_record RECORD;
    schedule_record RECORD;
    email_count INTEGER := 0;
    scheduled_date DATE;
    scheduled_datetime TIMESTAMPTZ;
    user_email TEXT;
    current_day INTEGER := 0;
BEGIN
    -- Get cohort details
    SELECT * INTO cohort_record FROM cohorts WHERE id = target_cohort_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 0, 'Cohort not found';
        RETURN;
    END IF;
    
    -- Clear existing pending emails for this cohort
    DELETE FROM simple_email_queue WHERE cohort_id = target_cohort_id AND status = 'pending';
    
    -- Get users in this cohort from user_profiles
    FOR user_record IN 
        SELECT up.user_id, up.first_name, up.last_name
        FROM user_profiles up
        WHERE up.cohort_id = target_cohort_id
    LOOP
        -- Get email from auth.users
        SELECT email INTO user_email FROM auth.users WHERE id = user_record.user_id;
        
        -- Skip if we can't get the email
        IF user_email IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Schedule emails for this user based on email_schedule
        FOR schedule_record IN 
            SELECT * FROM email_schedule 
            WHERE cohort_id IS NULL OR cohort_id = target_cohort_id
            AND is_active = true
            ORDER BY day_number
        LOOP
            -- Calculate scheduled date based on business days
            IF schedule_record.day_number = 0 THEN
                -- Day 0 (welcome): Send 1 business day after cohort start
                scheduled_date := get_next_business_day(cohort_record.start_date, 1);
            ELSIF schedule_record.day_number BETWEEN 1 AND 16 THEN
                -- Days 1-16: Send on consecutive business days after welcome
                scheduled_date := get_next_business_day(cohort_record.start_date, schedule_record.day_number + 1);
            ELSE
                -- Post-program report: 1 business day after Day 16
                scheduled_date := get_next_business_day(cohort_record.start_date, 18);
            END IF;
            
            -- Convert to timestamp with South African time (9 AM SAST = 7 AM UTC)
            scheduled_datetime := (scheduled_date + '07:00:00'::TIME) AT TIME ZONE 'UTC';
            
            -- Insert email into queue
            INSERT INTO simple_email_queue (
                cohort_id,
                user_id,
                recipient_email,
                subject,
                html_content,
                email_type,
                day_number,
                scheduled_for
            ) VALUES (
                target_cohort_id,
                user_record.user_id,
                user_email,
                schedule_record.subject_template,
                REPLACE(REPLACE(schedule_record.html_template, '{first_name}', COALESCE(user_record.first_name, 'there')), '{platform_url}', 'https://app.cyborghabits.com'),
                schedule_record.email_type,
                schedule_record.day_number,
                scheduled_datetime
            );
            
            email_count := email_count + 1;
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT email_count, 'Successfully scheduled ' || email_count || ' emails for cohort ' || cohort_record.name || ' (business days only, 9:00 AM SAST)';
END;
$$;


ALTER FUNCTION "public"."schedule_cohort_emails_simple"("target_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_user_analytics"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update analytics for the affected user
    PERFORM update_user_analytics(NEW.user_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_user_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_user_analytics_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Update analytics for the affected user (using OLD for deletes)
    PERFORM update_user_analytics(OLD.user_id);
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_update_user_analytics_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_user_analytics_surveys"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update analytics for the affected user
    PERFORM update_user_analytics(NEW.user_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_user_analytics_surveys"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_user_analytics_surveys_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update analytics for the affected user (using OLD for deletes)
    PERFORM update_user_analytics(OLD.user_id);
    RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_update_user_analytics_surveys_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_cohort_automation_config_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_cohort_automation_config_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_activity_tracking_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_activity_tracking_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_analytics"("target_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    challenge_days_completed INTEGER;
    surveys_completed INTEGER;
    total_days_completed INTEGER;
    challenges_completed INTEGER;
    reflections_submitted INTEGER;
    total_program_days INTEGER := 17; -- Days 1-15 + 2 surveys
    completion_percentage DECIMAL(5,2);
    current_streak INTEGER;
    longest_streak INTEGER;
    last_activity TIMESTAMP WITH TIME ZONE;
    avg_session_duration DECIMAL(10,2);
BEGIN
    -- Count completed challenge days - COMBINE regular and customized day completions
    WITH all_day_completions AS (
        SELECT both_challenges_completed FROM user_day_completions
        WHERE user_id = target_user_id AND both_challenges_completed = true
        UNION ALL
        SELECT both_challenges_completed FROM user_customized_day_completions  
        WHERE user_id = target_user_id AND both_challenges_completed = true
    )
    SELECT COUNT(*) INTO challenge_days_completed FROM all_day_completions;

    -- Count completed surveys
    SELECT 
        (CASE WHEN EXISTS(SELECT 1 FROM pre_survey_responses WHERE user_id = target_user_id) THEN 1 ELSE 0 END) +
        (CASE WHEN EXISTS(SELECT 1 FROM post_survey_responses WHERE user_id = target_user_id) THEN 1 ELSE 0 END)
    INTO surveys_completed;

    -- Total days completed = challenge days + surveys
    total_days_completed := challenge_days_completed + surveys_completed;

    -- Count total challenge completions - COMBINE regular and customized
    WITH all_challenge_completions AS (
        SELECT user_id FROM user_challenge_completions WHERE user_id = target_user_id
        UNION ALL  
        SELECT user_id FROM user_customized_challenge_completions WHERE user_id = target_user_id
    )
    SELECT COUNT(*) INTO challenges_completed FROM all_challenge_completions;

    -- Count total reflections submitted - COMBINE regular and customized
    WITH all_reflections AS (
        SELECT user_id FROM user_reflections WHERE user_id = target_user_id
        UNION ALL
        SELECT user_id FROM user_customized_challenge_reflections WHERE user_id = target_user_id
    )
    SELECT COUNT(*) INTO reflections_submitted FROM all_reflections;

    -- Calculate completion percentage based on 17 total days (15 challenge days + 2 surveys)
    completion_percentage := (total_days_completed::DECIMAL / total_program_days) * 100;

    -- Get last activity timestamp - COMBINE all activity types
    SELECT GREATEST(
        COALESCE(MAX(ucc.completed_at), '1970-01-01'::timestamp),
        COALESCE(MAX(ur.submitted_at), '1970-01-01'::timestamp), 
        COALESCE(MAX(udc.completed_at), '1970-01-01'::timestamp),
        COALESCE(MAX(uccc.completed_at), '1970-01-01'::timestamp),
        COALESCE(MAX(uccr.submitted_at), '1970-01-01'::timestamp),
        COALESCE(MAX(ucdc.completed_at), '1970-01-01'::timestamp)
    ) INTO last_activity
    FROM user_challenge_completions ucc
    FULL OUTER JOIN user_reflections ur ON ucc.user_id = ur.user_id
    FULL OUTER JOIN user_day_completions udc ON ucc.user_id = udc.user_id
    FULL OUTER JOIN user_customized_challenge_completions uccc ON ucc.user_id = uccc.user_id
    FULL OUTER JOIN user_customized_challenge_reflections uccr ON ucc.user_id = uccr.user_id  
    FULL OUTER JOIN user_customized_day_completions ucdc ON ucc.user_id = ucdc.user_id
    WHERE COALESCE(ucc.user_id, ur.user_id, udc.user_id, uccc.user_id, uccr.user_id, ucdc.user_id) = target_user_id;

    -- Calculate current streak (consecutive days with both challenges completed)
    -- This is complex and would need to be rewritten to handle customized challenges per day
    -- For now, keep the original logic but it may undercount customized completions
    WITH daily_completions AS (
        SELECT 
            c.order_index as day_number,
            COALESCE(udc.both_challenges_completed, ucdc.both_challenges_completed, false) as both_challenges_completed,
            COALESCE(udc.completed_at::date, ucdc.completed_at::date) as completion_date
        FROM challenges c
        LEFT JOIN user_day_completions udc ON c.id = udc.challenge_id 
            AND udc.user_id = target_user_id
        LEFT JOIN user_customized_day_completions ucdc ON ucdc.user_id = target_user_id
        LEFT JOIN customized_challenges cc ON cc.order_index = c.order_index 
            AND ucdc.challenge_id = cc.id
        WHERE c.order_index BETWEEN 1 AND 15
        ORDER BY c.order_index DESC
    ),
    streak_calc AS (
        SELECT 
            day_number,
            both_challenges_completed,
            ROW_NUMBER() OVER (ORDER BY day_number DESC) as rn,
            CASE WHEN both_challenges_completed THEN 0 ELSE 1 END as break_point
        FROM daily_completions
    ),
    streak_groups AS (
        SELECT 
            day_number,
            both_challenges_completed,
            SUM(break_point) OVER (ORDER BY day_number DESC) as group_id
        FROM streak_calc
    )
    SELECT COALESCE(COUNT(*), 0) INTO current_streak
    FROM streak_groups 
    WHERE group_id = 0 AND both_challenges_completed = true;

    -- Calculate longest streak (using similar logic as current streak)
    WITH daily_completions AS (
        SELECT 
            c.order_index as day_number,
            COALESCE(udc.both_challenges_completed, ucdc.both_challenges_completed, false) as both_challenges_completed
        FROM challenges c
        LEFT JOIN user_day_completions udc ON c.id = udc.challenge_id 
            AND udc.user_id = target_user_id
        LEFT JOIN user_customized_day_completions ucdc ON ucdc.user_id = target_user_id
        LEFT JOIN customized_challenges cc ON cc.order_index = c.order_index 
            AND ucdc.challenge_id = cc.id
        WHERE c.order_index BETWEEN 1 AND 15
        ORDER BY c.order_index
    ),
    streak_calc AS (
        SELECT 
            day_number,
            both_challenges_completed,
            CASE WHEN both_challenges_completed THEN 
                ROW_NUMBER() OVER (PARTITION BY both_challenges_completed ORDER BY day_number) - 
                ROW_NUMBER() OVER (ORDER BY day_number)
            ELSE NULL END as streak_group
        FROM daily_completions
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO longest_streak
    FROM (
        SELECT COUNT(*) as streak_length
        FROM streak_calc 
        WHERE both_challenges_completed = true
        GROUP BY streak_group
    ) streak_lengths;

    -- Calculate average session duration - COMBINE regular and customized
    WITH all_session_durations AS (
        SELECT time_spent_minutes FROM user_day_completions
        WHERE user_id = target_user_id AND time_spent_minutes IS NOT NULL AND time_spent_minutes > 0
        UNION ALL
        SELECT time_spent_minutes FROM user_customized_day_completions
        WHERE user_id = target_user_id AND time_spent_minutes IS NOT NULL AND time_spent_minutes > 0  
    )
    SELECT COALESCE(AVG(time_spent_minutes), 0) INTO avg_session_duration FROM all_session_durations;

    -- Upsert the analytics record
    INSERT INTO user_journey_analytics (
        user_id,
        total_days_completed,
        total_challenges_completed,
        total_reflections_submitted,
        journey_completion_percentage,
        current_streak_days,
        longest_streak_days,
        last_activity_at,
        average_session_duration_minutes,
        updated_at
    ) VALUES (
        target_user_id,
        total_days_completed,
        challenges_completed,
        reflections_submitted,
        completion_percentage,
        current_streak,
        longest_streak,
        last_activity,
        avg_session_duration,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_days_completed = EXCLUDED.total_days_completed,
        total_challenges_completed = EXCLUDED.total_challenges_completed,
        total_reflections_submitted = EXCLUDED.total_reflections_submitted,
        journey_completion_percentage = EXCLUDED.journey_completion_percentage,
        current_streak_days = EXCLUDED.current_streak_days,
        longest_streak_days = EXCLUDED.longest_streak_days,
        last_activity_at = EXCLUDED.last_activity_at,
        average_session_duration_minutes = EXCLUDED.average_session_duration_minutes,
        updated_at = NOW();

END;
$$;


ALTER FUNCTION "public"."update_user_analytics"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_journey_analytics"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO user_journey_analytics (user_id, last_activity_at)
    VALUES (NEW.user_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
        SET last_activity_at = NOW(),
            updated_at       = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_journey_analytics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profiles_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_profiles_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_access_cohort"("cohort_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Super admin access
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Admin with specific cohort assignment
    IF EXISTS (
        SELECT 1 FROM admin_cohort_assignments 
        WHERE admin_user_id = auth.uid() 
        AND cohort_id = cohort_uuid 
        AND is_active = true
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Admin from same organization
    IF EXISTS (
        SELECT 1 FROM user_profiles up
        JOIN cohorts c ON c.organization_name = up.organization_name
        WHERE up.user_id = auth.uid() 
        AND up.role IN ('admin', 'super_admin')
        AND c.id = cohort_uuid
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- User's own cohort
    IF EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() AND cohort_id = cohort_uuid
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."user_can_access_cohort"("cohort_uuid" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_action_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "action_type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "target_table" "text",
    "target_id" "uuid",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "admin_user_id" "uuid",
    "admin_email" "text",
    "admin_role" "text",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_action_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."admin_action_summary" WITH ("security_invoker"='true') AS
 SELECT "aal"."id",
    "aal"."action_type",
    "aal"."description",
    "aal"."target_table",
    "aal"."target_id",
    "aal"."admin_email",
    "aal"."admin_role",
    "aal"."created_at",
    "aal"."details"
   FROM "public"."admin_action_log" "aal"
  ORDER BY "aal"."created_at" DESC;


ALTER TABLE "public"."admin_action_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_cohort_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "cohort_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" "uuid",
    "permissions" "text"[] DEFAULT ARRAY['view'::"text", 'manage_users'::"text"],
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."admin_cohort_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cohorts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "max_participants" integer DEFAULT 25,
    "duration_weeks" integer DEFAULT 12,
    "organization_name" character varying(255) DEFAULT 'Cyborg Habit Co.'::character varying,
    "timezone" character varying(50) DEFAULT 'UTC'::character varying,
    "meeting_schedule" "text",
    "completion_criteria" "text" DEFAULT 'Complete all weekly challenges and reflections'::"text",
    "facilitator_id" "uuid",
    "tags" "text"[],
    "external_id" character varying(100),
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chk_cohorts_status" CHECK ((("status")::"text" = ANY ((ARRAY['draft'::character varying, 'enrolling'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."cohorts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "organization_name" character varying(255),
    "department" character varying(100),
    "cohort_id" "uuid",
    "role" character varying(20) DEFAULT 'user'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_profiles_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'super_admin'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."cohort_analytics" AS
 SELECT "c"."id",
    "c"."name",
    "c"."organization_name",
    "c"."start_date",
    "c"."end_date",
    "c"."max_participants",
    "c"."is_active",
    "c"."created_at",
    "count"("up"."user_id") AS "total_participants",
    "count"("up"."user_id") AS "current_participants",
    "count"(
        CASE
            WHEN (("up"."role")::"text" = 'user'::"text") THEN 1
            ELSE NULL::integer
        END) AS "regular_users",
    "count"(
        CASE
            WHEN (("up"."role")::"text" = 'admin'::"text") THEN 1
            ELSE NULL::integer
        END) AS "admin_users",
        CASE
            WHEN ("c"."max_participants" IS NOT NULL) THEN ((("count"("up"."user_id"))::double precision / ("c"."max_participants")::double precision) * (100)::double precision)
            ELSE NULL::double precision
        END AS "capacity_percentage",
        CASE
            WHEN ("c"."start_date" > CURRENT_DATE) THEN 'upcoming'::"text"
            WHEN ("c"."end_date" < CURRENT_DATE) THEN 'completed'::"text"
            WHEN (("c"."start_date" <= CURRENT_DATE) AND ("c"."end_date" >= CURRENT_DATE)) THEN 'active'::"text"
            ELSE 'draft'::"text"
        END AS "status",
        CASE
            WHEN (("c"."start_date" IS NOT NULL) AND ("c"."end_date" IS NOT NULL)) THEN ("c"."end_date" - "c"."start_date")
            ELSE NULL::integer
        END AS "duration_days"
   FROM ("public"."cohorts" "c"
     LEFT JOIN "public"."user_profiles" "up" ON (("c"."id" = "up"."cohort_id")))
  GROUP BY "c"."id", "c"."name", "c"."organization_name", "c"."start_date", "c"."end_date", "c"."max_participants", "c"."is_active", "c"."created_at";


ALTER TABLE "public"."cohort_analytics" OWNER TO "postgres";


COMMENT ON VIEW "public"."cohort_analytics" IS 'Analytics for cohorts using start_date and end_date instead of enrollment dates';



CREATE OR REPLACE VIEW "public"."admin_dashboard_summary" AS
 SELECT "count"(*) AS "total_cohorts",
    "count"(
        CASE
            WHEN ("cohort_analytics"."is_active" = true) THEN 1
            ELSE NULL::integer
        END) AS "active_cohorts",
    "count"(
        CASE
            WHEN ("cohort_analytics"."status" = 'upcoming'::"text") THEN 1
            ELSE NULL::integer
        END) AS "upcoming_cohorts",
    "count"(
        CASE
            WHEN ("cohort_analytics"."status" = 'active'::"text") THEN 1
            ELSE NULL::integer
        END) AS "running_cohorts",
    "count"(
        CASE
            WHEN ("cohort_analytics"."status" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_cohorts",
    "sum"("cohort_analytics"."total_participants") AS "total_participants",
    "avg"("cohort_analytics"."capacity_percentage") AS "avg_capacity_percentage",
    "count"(
        CASE
            WHEN ("cohort_analytics"."total_participants" > 0) THEN 1
            ELSE NULL::integer
        END) AS "cohorts_with_participants"
   FROM "public"."cohort_analytics";


ALTER TABLE "public"."admin_dashboard_summary" OWNER TO "postgres";


COMMENT ON VIEW "public"."admin_dashboard_summary" IS 'Summary statistics for admin dashboard';



CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "challenge_1" "text" NOT NULL,
    "challenge_1_type" "text",
    "challenge_2" "text" NOT NULL,
    "challenge_2_type" "text",
    "reflection_question" "text" NOT NULL,
    "intended_aha_moments" "text"[] NOT NULL,
    "title" character varying(255),
    "order_index" integer,
    "is_active" boolean DEFAULT true,
    "challenge_1_image_url" "text",
    "challenge_2_image_url" "text",
    "cohort_id" "uuid"
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


COMMENT ON COLUMN "public"."challenges"."challenge_1_image_url" IS 'URL to the image for challenge 1, can be Supabase Storage URL or external URL';



COMMENT ON COLUMN "public"."challenges"."challenge_2_image_url" IS 'URL to the image for challenge 2, can be Supabase Storage URL or external URL';



COMMENT ON COLUMN "public"."challenges"."cohort_id" IS 'If NULL, challenge is default for all cohorts. If set, challenge is specific to that cohort.';



CREATE TABLE IF NOT EXISTS "public"."cohort_automation_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cohort_id" "uuid" NOT NULL,
    "automation_enabled" boolean DEFAULT false,
    "program_type" "text" DEFAULT 'cyborg_habits_16_day'::"text",
    "program_duration_days" integer DEFAULT 16,
    "send_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "platform_url" "text",
    "custom_settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "cohort_automation_config_program_type_check" CHECK (("program_type" = ANY (ARRAY['cyborg_habits_16_day'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."cohort_automation_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "cohort_id" "uuid",
    "ai_usage_rating" integer,
    "explain_it_frequency" integer,
    "guide_it_frequency" integer,
    "suggest_it_frequency" integer,
    "critique_it_frequency" integer,
    "plan_it_frequency" integer,
    "imagine_it_frequency" integer,
    "improve_it_frequency" integer,
    "additional_comments" "text",
    "is_completed" boolean DEFAULT true,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "post_survey_responses_ai_usage_rating_check" CHECK ((("ai_usage_rating" >= 1) AND ("ai_usage_rating" <= 5))),
    CONSTRAINT "post_survey_responses_critique_it_frequency_check" CHECK ((("critique_it_frequency" >= 1) AND ("critique_it_frequency" <= 5))),
    CONSTRAINT "post_survey_responses_explain_it_frequency_check" CHECK ((("explain_it_frequency" >= 1) AND ("explain_it_frequency" <= 5))),
    CONSTRAINT "post_survey_responses_guide_it_frequency_check" CHECK ((("guide_it_frequency" >= 1) AND ("guide_it_frequency" <= 5))),
    CONSTRAINT "post_survey_responses_imagine_it_frequency_check" CHECK ((("imagine_it_frequency" >= 1) AND ("imagine_it_frequency" <= 5))),
    CONSTRAINT "post_survey_responses_improve_it_frequency_check" CHECK ((("improve_it_frequency" >= 1) AND ("improve_it_frequency" <= 5))),
    CONSTRAINT "post_survey_responses_plan_it_frequency_check" CHECK ((("plan_it_frequency" >= 1) AND ("plan_it_frequency" <= 5))),
    CONSTRAINT "post_survey_responses_suggest_it_frequency_check" CHECK ((("suggest_it_frequency" >= 1) AND ("suggest_it_frequency" <= 5)))
);


ALTER TABLE "public"."post_survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pre_survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "cohort_id" "uuid",
    "ai_usage_rating" integer,
    "explain_it_frequency" integer,
    "guide_it_frequency" integer,
    "suggest_it_frequency" integer,
    "critique_it_frequency" integer,
    "plan_it_frequency" integer,
    "imagine_it_frequency" integer,
    "improve_it_frequency" integer,
    "additional_comments" "text",
    "is_completed" boolean DEFAULT true,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pre_survey_responses_ai_usage_rating_check" CHECK ((("ai_usage_rating" >= 1) AND ("ai_usage_rating" <= 5))),
    CONSTRAINT "pre_survey_responses_critique_it_frequency_check" CHECK ((("critique_it_frequency" >= 1) AND ("critique_it_frequency" <= 5))),
    CONSTRAINT "pre_survey_responses_explain_it_frequency_check" CHECK ((("explain_it_frequency" >= 1) AND ("explain_it_frequency" <= 5))),
    CONSTRAINT "pre_survey_responses_guide_it_frequency_check" CHECK ((("guide_it_frequency" >= 1) AND ("guide_it_frequency" <= 5))),
    CONSTRAINT "pre_survey_responses_imagine_it_frequency_check" CHECK ((("imagine_it_frequency" >= 1) AND ("imagine_it_frequency" <= 5))),
    CONSTRAINT "pre_survey_responses_improve_it_frequency_check" CHECK ((("improve_it_frequency" >= 1) AND ("improve_it_frequency" <= 5))),
    CONSTRAINT "pre_survey_responses_plan_it_frequency_check" CHECK ((("plan_it_frequency" >= 1) AND ("plan_it_frequency" <= 5))),
    CONSTRAINT "pre_survey_responses_suggest_it_frequency_check" CHECK ((("suggest_it_frequency" >= 1) AND ("suggest_it_frequency" <= 5)))
);


ALTER TABLE "public"."pre_survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_journey_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "total_days_completed" integer DEFAULT 0,
    "total_challenges_completed" integer DEFAULT 0,
    "total_reflections_submitted" integer DEFAULT 0,
    "total_videos_watched" integer DEFAULT 0,
    "average_session_duration_minutes" numeric(10,2),
    "longest_streak_days" integer DEFAULT 0,
    "current_streak_days" integer DEFAULT 0,
    "journey_completion_percentage" numeric(5,2) DEFAULT 0.00,
    "estimated_completion_date" "date",
    "last_activity_at" timestamp with time zone
);

ALTER TABLE ONLY "public"."user_journey_analytics" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_journey_analytics" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."cohort_performance_summary" AS
 SELECT "c"."id" AS "cohort_id",
    "c"."name" AS "cohort_name",
    "c"."organization_name",
    "c"."start_date",
    "c"."end_date",
    "count"(DISTINCT "up"."user_id") AS "total_users",
    "count"(DISTINCT
        CASE
            WHEN ("uja"."journey_completion_percentage" > (0)::numeric) THEN "up"."user_id"
            ELSE NULL::"uuid"
        END) AS "active_users",
    "count"(DISTINCT
        CASE
            WHEN ("uja"."journey_completion_percentage" >= (100)::numeric) THEN "up"."user_id"
            ELSE NULL::"uuid"
        END) AS "completed_users",
    "round"("avg"(COALESCE("uja"."journey_completion_percentage", (0)::numeric)), 2) AS "avg_completion_percentage",
    "round"("avg"(COALESCE("uja"."total_days_completed", 0)), 1) AS "avg_days_completed",
    "round"("avg"(COALESCE("uja"."current_streak_days", 0)), 1) AS "avg_current_streak",
    "sum"(COALESCE("uja"."total_challenges_completed", 0)) AS "total_challenges_completed",
    "sum"(COALESCE("uja"."total_reflections_submitted", 0)) AS "total_reflections_submitted",
    "count"(DISTINCT "pre_surveys"."user_id") AS "users_completed_pre_survey",
    "count"(DISTINCT "post_surveys"."user_id") AS "users_completed_post_survey",
    "count"(DISTINCT
        CASE
            WHEN ("uja"."last_activity_at" >= ("now"() - '7 days'::interval)) THEN "up"."user_id"
            ELSE NULL::"uuid"
        END) AS "users_active_last_7_days",
    "count"(DISTINCT
        CASE
            WHEN ("uja"."last_activity_at" >= ("now"() - '1 day'::interval)) THEN "up"."user_id"
            ELSE NULL::"uuid"
        END) AS "users_active_last_day"
   FROM (((("public"."cohorts" "c"
     LEFT JOIN "public"."user_profiles" "up" ON ((("c"."id" = "up"."cohort_id") AND (("up"."role")::"text" = 'user'::"text"))))
     LEFT JOIN "public"."user_journey_analytics" "uja" ON (("up"."user_id" = "uja"."user_id")))
     LEFT JOIN "public"."pre_survey_responses" "pre_surveys" ON (("up"."user_id" = "pre_surveys"."user_id")))
     LEFT JOIN "public"."post_survey_responses" "post_surveys" ON (("up"."user_id" = "post_surveys"."user_id")))
  WHERE ("c"."is_active" = true)
  GROUP BY "c"."id", "c"."name", "c"."organization_name", "c"."start_date", "c"."end_date"
  ORDER BY "c"."name";


ALTER TABLE "public"."cohort_performance_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."cohort_stats" AS
 SELECT "c"."id",
    "c"."name",
    "c"."organization_name",
    "c"."start_date",
    "c"."end_date",
    "c"."max_participants",
    "c"."is_active",
    "count"("up"."user_id") AS "current_participants",
        CASE
            WHEN ("c"."max_participants" IS NOT NULL) THEN ((("count"("up"."user_id"))::double precision / ("c"."max_participants")::double precision) * (100)::double precision)
            ELSE NULL::double precision
        END AS "capacity_percentage",
        CASE
            WHEN ("c"."start_date" > CURRENT_DATE) THEN 'upcoming'::"text"
            WHEN ("c"."end_date" < CURRENT_DATE) THEN 'completed'::"text"
            WHEN (("c"."start_date" <= CURRENT_DATE) AND ("c"."end_date" >= CURRENT_DATE)) THEN 'active'::"text"
            ELSE 'draft'::"text"
        END AS "status"
   FROM ("public"."cohorts" "c"
     LEFT JOIN "public"."user_profiles" "up" ON (("c"."id" = "up"."cohort_id")))
  GROUP BY "c"."id", "c"."name", "c"."organization_name", "c"."start_date", "c"."end_date", "c"."max_participants", "c"."is_active";


ALTER TABLE "public"."cohort_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."cohort_stats" IS 'Statistics for cohorts using start_date and end_date instead of enrollment dates';



CREATE TABLE IF NOT EXISTS "public"."customized_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "challenge_1" "text" NOT NULL,
    "challenge_1_type" "text",
    "challenge_2" "text" NOT NULL,
    "challenge_2_type" "text",
    "reflection_question" "text" NOT NULL,
    "intended_aha_moments" "text"[],
    "title" character varying(255),
    "order_index" integer,
    "is_active" boolean DEFAULT true,
    "challenge_1_image_url" "text",
    "challenge_2_image_url" "text",
    "cohort_id" "uuid",
    "video_url_1" "text",
    "video_url_2" "text"
);


ALTER TABLE "public"."customized_challenges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "challenge_id" "uuid",
    "youtube_video_id" character varying(255) NOT NULL,
    "title" character varying(255) NOT NULL,
    "description" "text",
    "duration_seconds" integer,
    "is_active" boolean DEFAULT true,
    "order_index" integer DEFAULT 1,
    "video_scope" character varying(50) DEFAULT 'challenge'::character varying,
    "habit_type" character varying(50),
    CONSTRAINT "videos_categorization_check" CHECK ((((("video_scope")::"text" = 'global'::"text") AND ("habit_type" IS NULL) AND ("challenge_id" IS NULL)) OR ((("video_scope")::"text" = 'habit'::"text") AND ("habit_type" IS NOT NULL) AND ("challenge_id" IS NULL)))),
    CONSTRAINT "videos_habit_type_check" CHECK ((("habit_type" IS NULL) OR (("habit_type")::"text" = ANY ((ARRAY['explain_it'::character varying, 'plan_it'::character varying, 'suggest_it'::character varying, 'guide_it'::character varying, 'critique_it'::character varying, 'imagine_it'::character varying, 'improve_it'::character varying])::"text"[]))))
);


ALTER TABLE "public"."videos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."daily_videos" AS
 SELECT "c"."id" AS "challenge_id",
    "c"."order_index" AS "day_number",
    "c"."title" AS "day_title",
    "c"."challenge_1_type",
    "c"."challenge_2_type",
    "v1"."id" AS "video_1_id",
    "v1"."youtube_video_id" AS "video_1_youtube_id",
    "v1"."title" AS "video_1_title",
    "v1"."description" AS "video_1_description",
    "v2"."id" AS "video_2_id",
    "v2"."youtube_video_id" AS "video_2_youtube_id",
    "v2"."title" AS "video_2_title",
    "v2"."description" AS "video_2_description"
   FROM (("public"."challenges" "c"
     LEFT JOIN "public"."videos" "v1" ON (((("v1"."habit_type")::"text" = "c"."challenge_1_type") AND (("v1"."video_scope")::"text" = 'habit'::"text") AND ("v1"."is_active" = true))))
     LEFT JOIN "public"."videos" "v2" ON (((("v2"."habit_type")::"text" = "c"."challenge_2_type") AND (("v2"."video_scope")::"text" = 'habit'::"text") AND ("v2"."is_active" = true))))
  WHERE ("c"."is_active" = true)
  ORDER BY "c"."order_index";


ALTER TABLE "public"."daily_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dlab_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "challenge_1" "text" NOT NULL,
    "challenge_1_type" "text",
    "challenge_2" "text" NOT NULL,
    "challenge_2_type" "text",
    "reflection_question" "text" NOT NULL,
    "intended_aha_moments" "text"[] NOT NULL,
    "title" character varying(255),
    "order_index" integer,
    "is_active" boolean DEFAULT true,
    "challenge_1_image_url" "text",
    "challenge_2_image_url" "text",
    "cohort_id" "uuid"
);


ALTER TABLE "public"."dlab_challenges" OWNER TO "postgres";


COMMENT ON COLUMN "public"."dlab_challenges"."challenge_1_image_url" IS 'URL to the image for challenge 1, can be Supabase Storage URL or external URL';



COMMENT ON COLUMN "public"."dlab_challenges"."challenge_2_image_url" IS 'URL to the image for challenge 2, can be Supabase Storage URL or external URL';



COMMENT ON COLUMN "public"."dlab_challenges"."cohort_id" IS 'If NULL, challenge is default for all cohorts. If set, challenge is specific to that cohort.';



CREATE TABLE IF NOT EXISTS "public"."email_auto_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "queue_id" "uuid",
    "user_id" "uuid",
    "cohort_id" "uuid",
    "recipient_email" "text",
    "subject" "text" NOT NULL,
    "email_type" "text" NOT NULL,
    "day_number" integer,
    "sent_at" timestamp with time zone NOT NULL,
    "resend_id" "text",
    "delivery_status" "text" DEFAULT 'sent'::"text",
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "unsubscribed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_auto_logs_delivery_status_check" CHECK (("delivery_status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'bounced'::"text", 'complained'::"text"])))
);


ALTER TABLE "public"."email_auto_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_auto_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "cohort_id" "uuid",
    "template_id" "uuid",
    "email_type" "text" NOT NULL,
    "day_number" integer,
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "text_content" "text" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "sent_at" timestamp with time zone,
    "resend_id" "text",
    "error_message" "text",
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_auto_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."email_auto_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_auto_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cohort_id" "uuid",
    "daily_reminders_enabled" boolean DEFAULT true,
    "welcome_series_enabled" boolean DEFAULT true,
    "progress_reports_enabled" boolean DEFAULT false,
    "send_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "is_paused" boolean DEFAULT false,
    "paused_by" "uuid",
    "paused_at" timestamp with time zone,
    "paused_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_auto_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_auto_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cohort_id" "uuid",
    "email_type" "text" NOT NULL,
    "day_number" integer,
    "template_name" "text" NOT NULL,
    "subject_template" "text" NOT NULL,
    "html_template" "text" NOT NULL,
    "text_template" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_default" boolean DEFAULT false,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_auto_templates_email_type_check" CHECK (("email_type" = ANY (ARRAY['daily_reminder'::"text", 'welcome_series'::"text", 'progress_report'::"text", 'reengagement'::"text", 'reengagement_3day'::"text", 'reengagement_week'::"text", 'reengagement_5day'::"text", 'journey_completion'::"text", 'manual_test'::"text"])))
);


ALTER TABLE "public"."email_auto_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_auto_user_preferences" (
    "user_id" "uuid" NOT NULL,
    "daily_reminders_enabled" boolean DEFAULT true,
    "welcome_series_enabled" boolean DEFAULT true,
    "progress_reports_enabled" boolean DEFAULT true,
    "opt_out_date" timestamp with time zone,
    "unsubscribe_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(32), 'hex'::"text"),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_auto_user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cohort_id" "uuid",
    "day_number" integer NOT NULL,
    "email_type" "text" NOT NULL,
    "subject_template" "text" NOT NULL,
    "html_template" "text" NOT NULL,
    "send_offset_days" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "email_schedule_email_type_check" CHECK (("email_type" = ANY (ARRAY['welcome'::"text", 'daily_challenge'::"text", 'completion'::"text", 'nudge_2day'::"text", 'nudge_5day'::"text", 'post_program_report'::"text"])))
);


ALTER TABLE "public"."email_schedule" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."global_videos" AS
 SELECT "videos"."id",
    "videos"."youtube_video_id",
    "videos"."title",
    "videos"."description",
    "videos"."duration_seconds",
    "videos"."is_active",
    "videos"."order_index",
    "videos"."created_at",
    "videos"."updated_at"
   FROM "public"."videos"
  WHERE ((("videos"."video_scope")::"text" = 'global'::"text") AND ("videos"."is_active" = true))
  ORDER BY "videos"."order_index";


ALTER TABLE "public"."global_videos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."habit_videos" AS
 SELECT "videos"."id",
    "videos"."habit_type",
    "videos"."youtube_video_id",
    "videos"."title",
    "videos"."description",
    "videos"."duration_seconds",
    "videos"."is_active",
    "videos"."order_index",
    "videos"."created_at",
    "videos"."updated_at"
   FROM "public"."videos"
  WHERE ((("videos"."video_scope")::"text" = 'habit'::"text") AND ("videos"."is_active" = true))
  ORDER BY "videos"."order_index";


ALTER TABLE "public"."habit_videos" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."safe_admin_cohort_access" AS
 SELECT DISTINCT "c"."id",
    ("c"."name")::"text" AS "name",
    COALESCE("c"."description", ''::"text") AS "description",
    "c"."start_date",
    "c"."end_date",
    'active'::"text" AS "status",
    true AS "is_active",
    'Default Organization'::"text" AS "organization_name",
    'standard'::"text" AS "cohort_type",
    25 AS "max_participants",
    COALESCE("c"."created_at", "now"()) AS "created_at",
    COALESCE("c"."updated_at", "now"()) AS "updated_at",
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM "public"."user_profiles"
              WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))) THEN 'super_admin_access'::"text"
            WHEN (EXISTS ( SELECT 1
               FROM "public"."admin_cohort_assignments" "aca"
              WHERE (("aca"."admin_user_id" = "auth"."uid"()) AND ("aca"."cohort_id" = "c"."id") AND ("aca"."is_active" = true)))) THEN 'admin_assignment_access'::"text"
            WHEN ("c"."facilitator_id" = "auth"."uid"()) THEN 'facilitator_access'::"text"
            ELSE 'no_access'::"text"
        END AS "access_type"
   FROM "public"."cohorts" "c"
  WHERE ((EXISTS ( SELECT 1
           FROM "public"."user_profiles"
          WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))) OR (EXISTS ( SELECT 1
           FROM ("public"."admin_cohort_assignments" "aca"
             JOIN "public"."user_profiles" "up" ON (("up"."user_id" = "aca"."admin_user_id")))
          WHERE (("aca"."admin_user_id" = "auth"."uid"()) AND ("aca"."cohort_id" = "c"."id") AND ("aca"."is_active" = true) AND (("up"."role")::"text" = 'admin'::"text")))) OR (("c"."facilitator_id" IS NOT NULL) AND ("c"."facilitator_id" = "auth"."uid"())));


ALTER TABLE "public"."safe_admin_cohort_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."simple_automation_config" (
    "cohort_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT false,
    "program_duration_days" integer DEFAULT 16,
    "send_time" time without time zone DEFAULT '09:00:00'::time without time zone,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."simple_automation_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."simple_email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cohort_id" "uuid",
    "user_id" "uuid",
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "email_type" "text" NOT NULL,
    "day_number" integer,
    "sent_at" timestamp with time zone NOT NULL,
    "delivery_status" "text" DEFAULT 'delivered'::"text",
    "resend_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."simple_email_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."simple_email_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cohort_id" "uuid",
    "user_id" "uuid",
    "recipient_email" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "html_content" "text" NOT NULL,
    "email_type" "text" NOT NULL,
    "day_number" integer,
    "scheduled_for" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "sent_at" timestamp with time zone,
    "resend_id" "text",
    "error_message" "text",
    "attempts" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "simple_email_queue_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'failed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."simple_email_queue" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."survey_comparison" AS
 SELECT "pre"."user_id",
    "up"."first_name",
    "up"."last_name",
    "up"."organization_name",
    "pre"."ai_usage_rating" AS "pre_ai_usage",
    "post"."ai_usage_rating" AS "post_ai_usage",
    ("post"."ai_usage_rating" - "pre"."ai_usage_rating") AS "ai_usage_change",
    "pre"."explain_it_frequency" AS "pre_explain_it",
    "post"."explain_it_frequency" AS "post_explain_it",
    ("post"."explain_it_frequency" - "pre"."explain_it_frequency") AS "explain_it_change",
    "pre"."guide_it_frequency" AS "pre_guide_it",
    "post"."guide_it_frequency" AS "post_guide_it",
    ("post"."guide_it_frequency" - "pre"."guide_it_frequency") AS "guide_it_change",
    "pre"."suggest_it_frequency" AS "pre_suggest_it",
    "post"."suggest_it_frequency" AS "post_suggest_it",
    ("post"."suggest_it_frequency" - "pre"."suggest_it_frequency") AS "suggest_it_change",
    "pre"."critique_it_frequency" AS "pre_critique_it",
    "post"."critique_it_frequency" AS "post_critique_it",
    ("post"."critique_it_frequency" - "pre"."critique_it_frequency") AS "critique_it_change",
    "pre"."plan_it_frequency" AS "pre_plan_it",
    "post"."plan_it_frequency" AS "post_plan_it",
    ("post"."plan_it_frequency" - "pre"."plan_it_frequency") AS "plan_it_change",
    "pre"."imagine_it_frequency" AS "pre_imagine_it",
    "post"."imagine_it_frequency" AS "post_imagine_it",
    ("post"."imagine_it_frequency" - "pre"."imagine_it_frequency") AS "imagine_it_change",
    "pre"."improve_it_frequency" AS "pre_improve_it",
    "post"."improve_it_frequency" AS "post_improve_it",
    ("post"."improve_it_frequency" - "pre"."improve_it_frequency") AS "improve_it_change",
    "pre"."completed_at" AS "pre_survey_date",
    "post"."completed_at" AS "post_survey_date"
   FROM (("public"."pre_survey_responses" "pre"
     FULL JOIN "public"."post_survey_responses" "post" ON (("pre"."user_id" = "post"."user_id")))
     LEFT JOIN "public"."user_profiles" "up" ON ((COALESCE("pre"."user_id", "post"."user_id") = "up"."user_id")));


ALTER TABLE "public"."survey_comparison" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_challenge_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "challenge_id" "uuid",
    "challenge_number" integer NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."user_challenge_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_reflections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "challenge_id" "uuid",
    "reflection_text" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "word_count" integer
);


ALTER TABLE "public"."user_reflections" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_activity_summary" AS
 SELECT "up"."user_id",
    "up"."cohort_id",
    "up"."first_name",
    "up"."last_name",
    "au"."email",
    "c"."name" AS "cohort_name",
    "c"."start_date" AS "cohort_start_date",
        CASE
            WHEN ("c"."start_date" IS NOT NULL) THEN ((EXTRACT(days FROM ("now"() - ("c"."start_date")::timestamp with time zone)))::integer + 1)
            ELSE 1
        END AS "cohort_day",
    GREATEST(COALESCE("last_challenge"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone), COALESCE("last_reflection"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone), COALESCE("last_survey"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone)) AS "last_activity_date",
    (EXTRACT(days FROM ("now"() - GREATEST(COALESCE("last_challenge"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone), COALESCE("last_reflection"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone), COALESCE("last_survey"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone)))))::integer AS "days_since_activity",
        CASE
            WHEN (GREATEST(COALESCE("last_challenge"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone), COALESCE("last_reflection"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone), COALESCE("last_survey"."last_activity", ('1970-01-01 00:00:00'::timestamp without time zone)::timestamp with time zone)) < ("now"() - '2 days'::interval)) THEN true
            ELSE false
        END AS "needs_nudge_email"
   FROM ((((("public"."user_profiles" "up"
     LEFT JOIN "public"."cohorts" "c" ON (("up"."cohort_id" = "c"."id")))
     LEFT JOIN "auth"."users" "au" ON (("up"."user_id" = "au"."id")))
     LEFT JOIN ( SELECT "user_challenge_completions"."user_id",
            "max"("user_challenge_completions"."completed_at") AS "last_activity"
           FROM "public"."user_challenge_completions"
          GROUP BY "user_challenge_completions"."user_id") "last_challenge" ON (("up"."user_id" = "last_challenge"."user_id")))
     LEFT JOIN ( SELECT "user_reflections"."user_id",
            "max"("user_reflections"."submitted_at") AS "last_activity"
           FROM "public"."user_reflections"
          GROUP BY "user_reflections"."user_id") "last_reflection" ON (("up"."user_id" = "last_reflection"."user_id")))
     LEFT JOIN ( SELECT "combined_surveys"."user_id",
            "max"(GREATEST("combined_surveys"."created_at", "combined_surveys"."updated_at")) AS "last_activity"
           FROM ( SELECT "pre_survey_responses"."user_id",
                    "pre_survey_responses"."created_at",
                    "pre_survey_responses"."updated_at"
                   FROM "public"."pre_survey_responses"
                UNION ALL
                 SELECT "post_survey_responses"."user_id",
                    "post_survey_responses"."created_at",
                    "post_survey_responses"."updated_at"
                   FROM "public"."post_survey_responses") "combined_surveys"
          GROUP BY "combined_surveys"."user_id") "last_survey" ON (("up"."user_id" = "last_survey"."user_id")))
  WHERE ("up"."cohort_id" IS NOT NULL);


ALTER TABLE "public"."user_activity_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_tracking" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "cohort_id" "uuid" NOT NULL,
    "last_activity_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "last_activity_type" character varying(50) DEFAULT 'login'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_activity_tracking" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_customized_challenge_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "challenge_id" "uuid",
    "challenge_number" integer NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."user_customized_challenge_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_customized_challenge_reflections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "challenge_id" "uuid",
    "reflection_text" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "word_count" integer
);


ALTER TABLE "public"."user_customized_challenge_reflections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_customized_day_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "challenge_id" "uuid",
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "both_challenges_completed" boolean DEFAULT false,
    "reflection_submitted" boolean DEFAULT false,
    "time_spent_minutes" integer
);


ALTER TABLE "public"."user_customized_day_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_day_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "challenge_id" "uuid",
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "both_challenges_completed" boolean DEFAULT false,
    "reflection_submitted" boolean DEFAULT false,
    "time_spent_minutes" integer
);


ALTER TABLE "public"."user_day_completions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_details" AS
 SELECT "up"."user_id",
    "au"."email",
    "up"."first_name",
    "up"."last_name",
    "up"."organization_name",
    "up"."department",
    "up"."role",
    "up"."cohort_id",
    "up"."created_at",
    "up"."updated_at",
    "c"."name" AS "cohort_name",
    "c"."organization_name" AS "cohort_organization"
   FROM (("public"."user_profiles" "up"
     LEFT JOIN "auth"."users" "au" ON (("up"."user_id" = "au"."id")))
     LEFT JOIN "public"."cohorts" "c" ON (("up"."cohort_id" = "c"."id")))
  ORDER BY "up"."created_at" DESC;


ALTER TABLE "public"."user_details" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_profiles_with_cohort" AS
 SELECT "up"."id",
    "up"."user_id",
    "up"."first_name",
    "up"."last_name",
    "up"."organization_name",
    "up"."department",
    "up"."cohort_id",
    "up"."role",
    "up"."created_at",
    "up"."updated_at",
    "c"."name" AS "cohort_name",
    "c"."organization_name" AS "cohort_organization",
    "c"."start_date" AS "cohort_start_date",
    "c"."end_date" AS "cohort_end_date",
    "c"."is_active" AS "cohort_is_active",
    "ca"."status" AS "cohort_status"
   FROM (("public"."user_profiles" "up"
     LEFT JOIN "public"."cohorts" "c" ON (("up"."cohort_id" = "c"."id")))
     LEFT JOIN "public"."cohort_analytics" "ca" ON (("c"."id" = "ca"."id")));


ALTER TABLE "public"."user_profiles_with_cohort" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_profiles_with_cohort" IS 'User profiles joined with cohort information';



CREATE TABLE IF NOT EXISTS "public"."user_video_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "video_id" "uuid",
    "watched_at" timestamp with time zone DEFAULT "now"(),
    "watch_duration_seconds" integer,
    "completed_video" boolean DEFAULT false,
    "liked" boolean,
    "rating" integer,
    CONSTRAINT "user_video_interactions_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."user_video_interactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_action_log"
    ADD CONSTRAINT "admin_action_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_cohort_assignments"
    ADD CONSTRAINT "admin_cohort_assignments_admin_user_id_cohort_id_key" UNIQUE ("admin_user_id", "cohort_id");



ALTER TABLE ONLY "public"."admin_cohort_assignments"
    ADD CONSTRAINT "admin_cohort_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cohort_automation_config"
    ADD CONSTRAINT "cohort_automation_config_cohort_id_key" UNIQUE ("cohort_id");



ALTER TABLE ONLY "public"."cohort_automation_config"
    ADD CONSTRAINT "cohort_automation_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cohorts"
    ADD CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customized_challenges"
    ADD CONSTRAINT "customized_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dlab_challenges"
    ADD CONSTRAINT "dlab_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_auto_logs"
    ADD CONSTRAINT "email_auto_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_auto_queue"
    ADD CONSTRAINT "email_auto_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_auto_settings"
    ADD CONSTRAINT "email_auto_settings_cohort_id_key" UNIQUE ("cohort_id");



ALTER TABLE ONLY "public"."email_auto_settings"
    ADD CONSTRAINT "email_auto_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_auto_templates"
    ADD CONSTRAINT "email_auto_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_auto_user_preferences"
    ADD CONSTRAINT "email_auto_user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."email_auto_user_preferences"
    ADD CONSTRAINT "email_auto_user_preferences_unsubscribe_token_key" UNIQUE ("unsubscribe_token");



ALTER TABLE ONLY "public"."email_schedule"
    ADD CONSTRAINT "email_schedule_cohort_id_day_number_email_type_key" UNIQUE ("cohort_id", "day_number", "email_type");



ALTER TABLE ONLY "public"."email_schedule"
    ADD CONSTRAINT "email_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_survey_responses"
    ADD CONSTRAINT "post_survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_survey_responses"
    ADD CONSTRAINT "post_survey_responses_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."pre_survey_responses"
    ADD CONSTRAINT "pre_survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pre_survey_responses"
    ADD CONSTRAINT "pre_survey_responses_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."simple_automation_config"
    ADD CONSTRAINT "simple_automation_config_pkey" PRIMARY KEY ("cohort_id");



ALTER TABLE ONLY "public"."simple_email_logs"
    ADD CONSTRAINT "simple_email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simple_email_queue"
    ADD CONSTRAINT "simple_email_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customized_challenges"
    ADD CONSTRAINT "unique_cohort_order_customized" UNIQUE ("cohort_id", "order_index");



ALTER TABLE ONLY "public"."user_customized_challenge_completions"
    ADD CONSTRAINT "unique_user_customized_challenge_completion" UNIQUE ("user_id", "challenge_id", "challenge_number");



ALTER TABLE ONLY "public"."user_customized_challenge_reflections"
    ADD CONSTRAINT "unique_user_customized_challenge_reflection" UNIQUE ("user_id", "challenge_id");



ALTER TABLE ONLY "public"."user_customized_day_completions"
    ADD CONSTRAINT "unique_user_customized_day_completion" UNIQUE ("user_id", "challenge_id");



ALTER TABLE ONLY "public"."user_activity_tracking"
    ADD CONSTRAINT "user_activity_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity_tracking"
    ADD CONSTRAINT "user_activity_tracking_user_id_cohort_id_key" UNIQUE ("user_id", "cohort_id");



ALTER TABLE ONLY "public"."user_challenge_completions"
    ADD CONSTRAINT "user_challenge_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_challenge_completions"
    ADD CONSTRAINT "user_challenge_completions_user_id_challenge_id_challenge_n_key" UNIQUE ("user_id", "challenge_id", "challenge_number");



ALTER TABLE ONLY "public"."user_customized_challenge_completions"
    ADD CONSTRAINT "user_customized_challenge_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_customized_challenge_reflections"
    ADD CONSTRAINT "user_customized_challenge_reflections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_customized_day_completions"
    ADD CONSTRAINT "user_customized_day_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_day_completions"
    ADD CONSTRAINT "user_day_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_day_completions"
    ADD CONSTRAINT "user_day_completions_user_id_challenge_id_key" UNIQUE ("user_id", "challenge_id");



ALTER TABLE ONLY "public"."user_journey_analytics"
    ADD CONSTRAINT "user_journey_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_journey_analytics"
    ADD CONSTRAINT "user_journey_analytics_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_reflections"
    ADD CONSTRAINT "user_reflections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_reflections"
    ADD CONSTRAINT "user_reflections_user_id_challenge_id_key" UNIQUE ("user_id", "challenge_id");



ALTER TABLE ONLY "public"."user_video_interactions"
    ADD CONSTRAINT "user_video_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_pkey" PRIMARY KEY ("id");



CREATE INDEX "dlab_challenges_challenge_1_image_url_challenge_2_image_url_idx" ON "public"."dlab_challenges" USING "btree" ("challenge_1_image_url", "challenge_2_image_url");



CREATE INDEX "dlab_challenges_challenge_1_type_idx" ON "public"."dlab_challenges" USING "btree" ("challenge_1_type");



CREATE INDEX "dlab_challenges_challenge_2_type_idx" ON "public"."dlab_challenges" USING "btree" ("challenge_2_type");



CREATE INDEX "dlab_challenges_cohort_id_idx" ON "public"."dlab_challenges" USING "btree" ("cohort_id");



CREATE INDEX "dlab_challenges_cohort_id_order_index_idx" ON "public"."dlab_challenges" USING "btree" ("cohort_id", "order_index");



CREATE INDEX "dlab_challenges_is_active_idx" ON "public"."dlab_challenges" USING "btree" ("is_active");



CREATE INDEX "dlab_challenges_order_index_idx" ON "public"."dlab_challenges" USING "btree" ("order_index");



CREATE INDEX "idx_admin_cohort_active" ON "public"."admin_cohort_assignments" USING "btree" ("is_active");



CREATE INDEX "idx_admin_cohort_admin" ON "public"."admin_cohort_assignments" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_cohort_cohort" ON "public"."admin_cohort_assignments" USING "btree" ("cohort_id");



CREATE INDEX "idx_admin_log_action_type" ON "public"."admin_action_log" USING "btree" ("action_type");



CREATE INDEX "idx_admin_log_admin_user" ON "public"."admin_action_log" USING "btree" ("admin_user_id");



CREATE INDEX "idx_admin_log_created_at" ON "public"."admin_action_log" USING "btree" ("created_at");



CREATE INDEX "idx_admin_log_target" ON "public"."admin_action_log" USING "btree" ("target_table", "target_id");



CREATE INDEX "idx_challenges_active" ON "public"."challenges" USING "btree" ("is_active");



CREATE INDEX "idx_challenges_cohort_id" ON "public"."challenges" USING "btree" ("cohort_id");



CREATE INDEX "idx_challenges_cohort_order" ON "public"."challenges" USING "btree" ("cohort_id", "order_index");



CREATE INDEX "idx_challenges_image_urls" ON "public"."challenges" USING "btree" ("challenge_1_image_url", "challenge_2_image_url");



CREATE INDEX "idx_challenges_order" ON "public"."challenges" USING "btree" ("order_index");



CREATE INDEX "idx_challenges_type1" ON "public"."challenges" USING "btree" ("challenge_1_type");



CREATE INDEX "idx_challenges_type2" ON "public"."challenges" USING "btree" ("challenge_2_type");



CREATE INDEX "idx_cohort_automation_config_cohort_id" ON "public"."cohort_automation_config" USING "btree" ("cohort_id");



CREATE INDEX "idx_cohort_automation_config_enabled" ON "public"."cohort_automation_config" USING "btree" ("automation_enabled") WHERE ("automation_enabled" = true);



CREATE INDEX "idx_customized_challenges_cohort_day" ON "public"."customized_challenges" USING "btree" ("cohort_id", "order_index");



CREATE INDEX "idx_email_auto_logs_sent_at" ON "public"."email_auto_logs" USING "btree" ("sent_at");



CREATE INDEX "idx_email_auto_logs_user_type" ON "public"."email_auto_logs" USING "btree" ("user_id", "email_type");



CREATE INDEX "idx_email_auto_queue_scheduled" ON "public"."email_auto_queue" USING "btree" ("scheduled_for", "status");



CREATE INDEX "idx_email_auto_queue_user_cohort" ON "public"."email_auto_queue" USING "btree" ("user_id", "cohort_id");



CREATE INDEX "idx_email_auto_templates_cohort_type" ON "public"."email_auto_templates" USING "btree" ("cohort_id", "email_type");



CREATE INDEX "idx_email_auto_templates_day" ON "public"."email_auto_templates" USING "btree" ("email_type", "day_number") WHERE ("day_number" IS NOT NULL);



CREATE INDEX "idx_post_survey_cohort_id" ON "public"."post_survey_responses" USING "btree" ("cohort_id");



CREATE INDEX "idx_post_survey_completed_at" ON "public"."post_survey_responses" USING "btree" ("completed_at");



CREATE INDEX "idx_post_survey_user_id" ON "public"."post_survey_responses" USING "btree" ("user_id");



CREATE INDEX "idx_pre_survey_cohort_id" ON "public"."pre_survey_responses" USING "btree" ("cohort_id");



CREATE INDEX "idx_pre_survey_completed_at" ON "public"."pre_survey_responses" USING "btree" ("completed_at");



CREATE INDEX "idx_pre_survey_user_id" ON "public"."pre_survey_responses" USING "btree" ("user_id");



CREATE INDEX "idx_simple_email_queue_cohort_status" ON "public"."simple_email_queue" USING "btree" ("cohort_id", "status");



CREATE INDEX "idx_simple_email_queue_scheduled_for" ON "public"."simple_email_queue" USING "btree" ("scheduled_for");



CREATE INDEX "idx_simple_email_queue_user_id" ON "public"."simple_email_queue" USING "btree" ("user_id");



CREATE INDEX "idx_ucc_challenge" ON "public"."user_challenge_completions" USING "btree" ("challenge_id");



CREATE INDEX "idx_ucc_completed" ON "public"."user_challenge_completions" USING "btree" ("completed_at");



CREATE INDEX "idx_ucc_user" ON "public"."user_challenge_completions" USING "btree" ("user_id");



CREATE INDEX "idx_udc_challenge" ON "public"."user_day_completions" USING "btree" ("challenge_id");



CREATE INDEX "idx_udc_completed" ON "public"."user_day_completions" USING "btree" ("completed_at");



CREATE INDEX "idx_udc_user" ON "public"."user_day_completions" USING "btree" ("user_id");



CREATE INDEX "idx_ur_challenge" ON "public"."user_reflections" USING "btree" ("challenge_id");



CREATE INDEX "idx_ur_submitted" ON "public"."user_reflections" USING "btree" ("submitted_at");



CREATE INDEX "idx_ur_user" ON "public"."user_reflections" USING "btree" ("user_id");



CREATE INDEX "idx_user_activity_tracking_last_activity" ON "public"."user_activity_tracking" USING "btree" ("last_activity_date");



CREATE INDEX "idx_user_activity_tracking_user_cohort" ON "public"."user_activity_tracking" USING "btree" ("user_id", "cohort_id");



CREATE INDEX "idx_user_profiles_cohort_id" ON "public"."user_profiles" USING "btree" ("cohort_id");



CREATE INDEX "idx_user_profiles_organization" ON "public"."user_profiles" USING "btree" ("organization_name");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "idx_user_profiles_user_id" ON "public"."user_profiles" USING "btree" ("user_id");



CREATE INDEX "idx_uvi_user" ON "public"."user_video_interactions" USING "btree" ("user_id");



CREATE INDEX "idx_uvi_video" ON "public"."user_video_interactions" USING "btree" ("video_id");



CREATE INDEX "idx_uvi_watched" ON "public"."user_video_interactions" USING "btree" ("watched_at");



CREATE INDEX "idx_videos_active" ON "public"."videos" USING "btree" ("is_active");



CREATE INDEX "idx_videos_habit_type" ON "public"."videos" USING "btree" ("habit_type");



CREATE INDEX "idx_videos_scope" ON "public"."videos" USING "btree" ("video_scope");



CREATE INDEX "idx_videos_scope_habit" ON "public"."videos" USING "btree" ("video_scope", "habit_type");



CREATE OR REPLACE TRIGGER "trig_analytics_challenge_completion" AFTER INSERT OR UPDATE ON "public"."user_challenge_completions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_journey_analytics"();



CREATE OR REPLACE TRIGGER "trig_analytics_customized_challenge_completion" AFTER INSERT OR UPDATE ON "public"."user_customized_challenge_completions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_journey_analytics"();



CREATE OR REPLACE TRIGGER "trig_analytics_customized_day_completion" AFTER INSERT OR UPDATE ON "public"."user_customized_day_completions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_journey_analytics"();



CREATE OR REPLACE TRIGGER "trig_analytics_customized_reflection" AFTER INSERT OR UPDATE ON "public"."user_customized_challenge_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_journey_analytics"();



CREATE OR REPLACE TRIGGER "trig_analytics_day_completion" AFTER INSERT OR UPDATE ON "public"."user_day_completions" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_journey_analytics"();



CREATE OR REPLACE TRIGGER "trig_analytics_reflection" AFTER INSERT OR UPDATE ON "public"."user_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_journey_analytics"();



CREATE OR REPLACE TRIGGER "trigger_analytics_challenge_completion_delete" AFTER DELETE ON "public"."user_challenge_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_challenge_completion_insert_update" AFTER INSERT OR UPDATE ON "public"."user_challenge_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics"();



CREATE OR REPLACE TRIGGER "trigger_analytics_customized_challenge_completion_delete" AFTER DELETE ON "public"."user_customized_challenge_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_customized_challenge_completion_insert_update" AFTER INSERT OR UPDATE ON "public"."user_customized_challenge_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics"();



CREATE OR REPLACE TRIGGER "trigger_analytics_customized_day_completion_delete" AFTER DELETE ON "public"."user_customized_day_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_customized_day_completion_insert_update" AFTER INSERT OR UPDATE ON "public"."user_customized_day_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics"();



CREATE OR REPLACE TRIGGER "trigger_analytics_customized_reflection_delete" AFTER DELETE ON "public"."user_customized_challenge_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_customized_reflection_insert_update" AFTER INSERT OR UPDATE ON "public"."user_customized_challenge_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics"();



CREATE OR REPLACE TRIGGER "trigger_analytics_day_completion_delete" AFTER DELETE ON "public"."user_day_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_day_completion_insert_update" AFTER INSERT OR UPDATE ON "public"."user_day_completions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics"();



CREATE OR REPLACE TRIGGER "trigger_analytics_post_survey_delete" AFTER DELETE ON "public"."post_survey_responses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_surveys_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_post_survey_insert_update" AFTER INSERT OR UPDATE ON "public"."post_survey_responses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_surveys"();



CREATE OR REPLACE TRIGGER "trigger_analytics_pre_survey_delete" AFTER DELETE ON "public"."pre_survey_responses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_surveys_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_pre_survey_insert_update" AFTER INSERT OR UPDATE ON "public"."pre_survey_responses" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_surveys"();



CREATE OR REPLACE TRIGGER "trigger_analytics_reflection_delete" AFTER DELETE ON "public"."user_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics_delete"();



CREATE OR REPLACE TRIGGER "trigger_analytics_reflection_insert_update" AFTER INSERT OR UPDATE ON "public"."user_reflections" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_user_analytics"();



CREATE OR REPLACE TRIGGER "trigger_cohort_created_or_activated" AFTER INSERT OR UPDATE OF "status" ON "public"."cohorts" FOR EACH ROW EXECUTE FUNCTION "public"."call_cohort_registration_trigger"();



CREATE OR REPLACE TRIGGER "trigger_update_user_activity_tracking_updated_at" BEFORE UPDATE ON "public"."user_activity_tracking" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_activity_tracking_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_profiles_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_user_cohort_registration" AFTER INSERT OR UPDATE OF "cohort_id" ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."call_cohort_registration_trigger"();



CREATE OR REPLACE TRIGGER "update_cohort_automation_config_updated_at" BEFORE UPDATE ON "public"."cohort_automation_config" FOR EACH ROW EXECUTE FUNCTION "public"."update_cohort_automation_config_updated_at"();



CREATE OR REPLACE TRIGGER "update_cohorts_updated_at" BEFORE UPDATE ON "public"."cohorts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_auto_settings_updated_at" BEFORE UPDATE ON "public"."email_auto_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_email_auto_user_preferences_updated_at" BEFORE UPDATE ON "public"."email_auto_user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_action_log"
    ADD CONSTRAINT "admin_action_log_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_cohort_assignments"
    ADD CONSTRAINT "admin_cohort_assignments_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_cohort_assignments"
    ADD CONSTRAINT "admin_cohort_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."admin_cohort_assignments"
    ADD CONSTRAINT "admin_cohort_assignments_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cohort_automation_config"
    ADD CONSTRAINT "cohort_automation_config_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cohort_automation_config"
    ADD CONSTRAINT "cohort_automation_config_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."cohorts"
    ADD CONSTRAINT "cohorts_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."email_auto_logs"
    ADD CONSTRAINT "email_auto_logs_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_auto_logs"
    ADD CONSTRAINT "email_auto_logs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "public"."email_auto_queue"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_auto_logs"
    ADD CONSTRAINT "email_auto_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_auto_queue"
    ADD CONSTRAINT "email_auto_queue_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_auto_queue"
    ADD CONSTRAINT "email_auto_queue_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."email_auto_templates"("id");



ALTER TABLE ONLY "public"."email_auto_queue"
    ADD CONSTRAINT "email_auto_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_auto_settings"
    ADD CONSTRAINT "email_auto_settings_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_auto_settings"
    ADD CONSTRAINT "email_auto_settings_paused_by_fkey" FOREIGN KEY ("paused_by") REFERENCES "public"."user_profiles"("user_id");



ALTER TABLE ONLY "public"."email_auto_templates"
    ADD CONSTRAINT "email_auto_templates_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_auto_templates"
    ADD CONSTRAINT "email_auto_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("user_id");



ALTER TABLE ONLY "public"."email_auto_user_preferences"
    ADD CONSTRAINT "email_auto_user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_schedule"
    ADD CONSTRAINT "email_schedule_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_survey_responses"
    ADD CONSTRAINT "post_survey_responses_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."post_survey_responses"
    ADD CONSTRAINT "post_survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pre_survey_responses"
    ADD CONSTRAINT "pre_survey_responses_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."pre_survey_responses"
    ADD CONSTRAINT "pre_survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simple_automation_config"
    ADD CONSTRAINT "simple_automation_config_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simple_email_logs"
    ADD CONSTRAINT "simple_email_logs_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simple_email_logs"
    ADD CONSTRAINT "simple_email_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simple_email_queue"
    ADD CONSTRAINT "simple_email_queue_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simple_email_queue"
    ADD CONSTRAINT "simple_email_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_tracking"
    ADD CONSTRAINT "user_activity_tracking_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_tracking"
    ADD CONSTRAINT "user_activity_tracking_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenge_completions"
    ADD CONSTRAINT "user_challenge_completions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenge_completions"
    ADD CONSTRAINT "user_challenge_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_customized_challenge_completions"
    ADD CONSTRAINT "user_customized_challenge_completions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."customized_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_customized_challenge_reflections"
    ADD CONSTRAINT "user_customized_challenge_reflections_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."customized_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_customized_challenge_reflections"
    ADD CONSTRAINT "user_customized_challenge_reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_customized_day_completions"
    ADD CONSTRAINT "user_customized_day_completions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."customized_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_day_completions"
    ADD CONSTRAINT "user_day_completions_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_day_completions"
    ADD CONSTRAINT "user_day_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_journey_analytics"
    ADD CONSTRAINT "user_journey_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "public"."cohorts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reflections"
    ADD CONSTRAINT "user_reflections_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_reflections"
    ADD CONSTRAINT "user_reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_video_interactions"
    ADD CONSTRAINT "user_video_interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_video_interactions"
    ADD CONSTRAINT "user_video_interactions_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."videos"
    ADD CONSTRAINT "videos_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



CREATE POLICY "Admin users can manage automation config" ON "public"."cohort_automation_config" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[]))))));



CREATE POLICY "Admins can manage challenges" ON "public"."challenges" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))) OR (("cohort_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."admin_cohort_assignments"
  WHERE (("admin_cohort_assignments"."admin_user_id" = "auth"."uid"()) AND ("admin_cohort_assignments"."cohort_id" = "challenges"."cohort_id") AND ("admin_cohort_assignments"."is_active" = true))))) OR (("cohort_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."admin_cohort_assignments"
  WHERE (("admin_cohort_assignments"."admin_user_id" = "auth"."uid"()) AND ("admin_cohort_assignments"."is_active" = true)))))));



CREATE POLICY "Admins can manage challenges" ON "public"."dlab_challenges" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))) OR (("cohort_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."admin_cohort_assignments"
  WHERE (("admin_cohort_assignments"."admin_user_id" = "auth"."uid"()) AND ("admin_cohort_assignments"."cohort_id" = "dlab_challenges"."cohort_id") AND ("admin_cohort_assignments"."is_active" = true))))) OR (("cohort_id" IS NULL) AND (EXISTS ( SELECT 1
   FROM "public"."admin_cohort_assignments"
  WHERE (("admin_cohort_assignments"."admin_user_id" = "auth"."uid"()) AND ("admin_cohort_assignments"."is_active" = true)))))));



CREATE POLICY "Admins can manage cohorts" ON "public"."cohorts" USING (("auth"."uid"() IN ( SELECT "user_profiles"."user_id"
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))));



CREATE POLICY "Admins can update org profiles" ON "public"."user_profiles" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "admin_profile"
  WHERE (("admin_profile"."user_id" = "auth"."uid"()) AND (("admin_profile"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])) AND (("admin_profile"."organization_name")::"text" = ("user_profiles"."organization_name")::"text")))) AND (("role")::"text" <> 'super_admin'::"text")));



CREATE POLICY "Admins can view all post-survey responses" ON "public"."post_survey_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[]))))));



CREATE POLICY "Admins can view all pre-survey responses" ON "public"."pre_survey_responses" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[]))))));



CREATE POLICY "Admins can view org profiles" ON "public"."user_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "admin_profile"
  WHERE (("admin_profile"."user_id" = "auth"."uid"()) AND (("admin_profile"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])) AND (("admin_profile"."organization_name")::"text" = ("user_profiles"."organization_name")::"text")))));



CREATE POLICY "Admins can view own assignments" ON "public"."admin_cohort_assignments" FOR SELECT USING ((("admin_user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text"))))));



CREATE POLICY "Anyone can view default challenges and cohort challenges" ON "public"."challenges" FOR SELECT USING ((("is_active" = true) AND (("cohort_id" IS NULL) OR ("cohort_id" IN ( SELECT "user_profiles"."cohort_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())
UNION
 SELECT "admin_cohort_assignments"."cohort_id"
   FROM "public"."admin_cohort_assignments"
  WHERE (("admin_cohort_assignments"."admin_user_id" = "auth"."uid"()) AND ("admin_cohort_assignments"."is_active" = true)))))));



CREATE POLICY "Anyone can view default challenges and cohort challenges" ON "public"."dlab_challenges" FOR SELECT USING ((("is_active" = true) AND (("cohort_id" IS NULL) OR ("cohort_id" IN ( SELECT "user_profiles"."cohort_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."user_id" = "auth"."uid"())
UNION
 SELECT "admin_cohort_assignments"."cohort_id"
   FROM "public"."admin_cohort_assignments"
  WHERE (("admin_cohort_assignments"."admin_user_id" = "auth"."uid"()) AND ("admin_cohort_assignments"."is_active" = true)))))));



CREATE POLICY "Anyone can view videos" ON "public"."videos" FOR SELECT USING ("is_active");



CREATE POLICY "Authenticated users can view cohorts" ON "public"."cohorts" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Regular admin can view assigned cohort journey analytics" ON "public"."user_journey_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."admin_cohort_assignments" "aca" ON (("up"."cohort_id" = "aca"."cohort_id")))
  WHERE (("up"."user_id" = "user_journey_analytics"."user_id") AND ("aca"."admin_user_id" = "auth"."uid"()) AND ("aca"."is_active" = true) AND (EXISTS ( SELECT 1
           FROM "public"."user_profiles" "admin_profile"
          WHERE (("admin_profile"."user_id" = "auth"."uid"()) AND (("admin_profile"."role")::"text" = 'admin'::"text"))))))));



CREATE POLICY "Super admin can delete journey analytics" ON "public"."user_journey_analytics" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admin can insert journey analytics" ON "public"."user_journey_analytics" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admin can update journey analytics" ON "public"."user_journey_analytics" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admin can view all journey analytics" ON "public"."user_journey_analytics" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can insert profiles" ON "public"."user_profiles" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "admin_profile"
  WHERE (("admin_profile"."user_id" = "auth"."uid"()) AND (("admin_profile"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can manage all assignments" ON "public"."admin_cohort_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can update all profiles" ON "public"."user_profiles" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "admin_profile"
  WHERE (("admin_profile"."user_id" = "auth"."uid"()) AND (("admin_profile"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Super admins can view all profiles" ON "public"."user_profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "admin_profile"
  WHERE (("admin_profile"."user_id" = "auth"."uid"()) AND (("admin_profile"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "Users can delete own customized challenge completions" ON "public"."user_customized_challenge_completions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own customized challenge reflections" ON "public"."user_customized_challenge_reflections" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own customized day completions" ON "public"."user_customized_day_completions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own customized challenge completions" ON "public"."user_customized_challenge_completions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own customized challenge reflections" ON "public"."user_customized_challenge_reflections" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own customized day completions" ON "public"."user_customized_day_completions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own post-survey responses" ON "public"."post_survey_responses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own pre-survey responses" ON "public"."pre_survey_responses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own customized challenge completions" ON "public"."user_customized_challenge_completions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own customized challenge reflections" ON "public"."user_customized_challenge_reflections" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own customized day completions" ON "public"."user_customized_day_completions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own post-survey responses" ON "public"."post_survey_responses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own pre-survey responses" ON "public"."pre_survey_responses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view and update own profile" ON "public"."user_profiles" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own journey analytics" ON "public"."user_journey_analytics" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own post-survey responses" ON "public"."post_survey_responses" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own pre-survey responses" ON "public"."pre_survey_responses" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."admin_action_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_and_self_access" ON "public"."user_challenge_completions" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



CREATE POLICY "admin_and_self_access" ON "public"."user_customized_challenge_completions" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



CREATE POLICY "admin_and_self_access" ON "public"."user_customized_challenge_reflections" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



CREATE POLICY "admin_and_self_access" ON "public"."user_customized_day_completions" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



CREATE POLICY "admin_and_self_access" ON "public"."user_day_completions" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



CREATE POLICY "admin_and_self_access" ON "public"."user_journey_analytics" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



CREATE POLICY "admin_and_self_access" ON "public"."user_reflections" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



CREATE POLICY "admin_and_self_access" ON "public"."user_video_interactions" TO "authenticated" USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."user_id" = "auth"."uid"()) AND (("user_profiles"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'super_admin'::character varying])::"text"[])))))));



ALTER TABLE "public"."admin_cohort_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_log_no_deletes" ON "public"."admin_action_log" FOR DELETE USING (false);



CREATE POLICY "admin_log_no_manual_changes" ON "public"."admin_action_log" FOR INSERT WITH CHECK (false);



CREATE POLICY "admin_log_no_updates" ON "public"."admin_action_log" FOR UPDATE USING (false);



CREATE POLICY "admin_log_super_admin_read" ON "public"."admin_action_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND (("up"."role")::"text" = 'super_admin'::"text")))));



CREATE POLICY "cc_allow_all_writes_temp" ON "public"."customized_challenges" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "cc_select_by_user_cohort" ON "public"."customized_challenges" FOR SELECT TO "authenticated" USING ((("is_active" = true) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."user_id" = "auth"."uid"()) AND ("up"."cohort_id" = "customized_challenges"."cohort_id"))))));



ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cohort_automation_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cohorts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customized_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dlab_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_survey_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pre_survey_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_challenge_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_customized_challenge_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_customized_challenge_reflections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_customized_day_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_day_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_journey_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_reflections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_video_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."videos" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."calculate_journey_completion"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_journey_completion"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_journey_completion"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_user_total_days"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_user_total_days"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_user_total_days"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."call_cohort_registration_trigger"() TO "anon";
GRANT ALL ON FUNCTION "public"."call_cohort_registration_trigger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."call_cohort_registration_trigger"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_due_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_due_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_due_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."debug_user_progress"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."debug_user_progress"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."debug_user_progress"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."fix_user_day_completions"() TO "anon";
GRANT ALL ON FUNCTION "public"."fix_user_day_completions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."fix_user_day_completions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_audit_trail_for_record"("table_name" "text", "record_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_audit_trail_for_record"("table_name" "text", "record_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audit_trail_for_record"("table_name" "text", "record_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_challenge_days"("user_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_challenge_days"("user_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_challenge_days"("user_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_challenge_for_user_day"("user_cohort_id" "uuid", "day_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_challenge_for_user_day"("user_cohort_id" "uuid", "day_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_challenge_for_user_day"("user_cohort_id" "uuid", "day_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_leaderboard"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_leaderboard"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_leaderboard"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_user_progress"("cohort_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_user_progress"("cohort_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_user_progress"("cohort_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_users_stats_fixed"("cohort_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_users_stats_fixed"("cohort_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_users_stats_fixed"("cohort_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_users_with_stats"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_users_with_stats"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_users_with_stats"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_users_with_stats_enhanced"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_users_with_stats_enhanced"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_users_with_stats_enhanced"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customized_cohort_user_progress"("cohort_user_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_customized_cohort_user_progress"("cohort_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customized_cohort_user_progress"("cohort_user_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enhanced_cohort_leaderboard"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_enhanced_cohort_leaderboard"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enhanced_cohort_leaderboard"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enhanced_cohort_leaderboard_v2"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_enhanced_cohort_leaderboard_v2"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enhanced_cohort_leaderboard_v2"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hybrid_cohort_users_with_stats"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_hybrid_cohort_users_with_stats"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hybrid_cohort_users_with_stats"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_next_business_day"("input_date" "date", "days_to_add" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_next_business_day"("input_date" "date", "days_to_add" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_next_business_day"("input_date" "date", "days_to_add" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_admin_activity"("days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_admin_activity"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_admin_activity"("days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_safe_accessible_cohorts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_safe_accessible_cohorts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_safe_accessible_cohorts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity_timeline"("target_user_id" "uuid", "days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity_timeline"("target_user_id" "uuid", "days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity_timeline"("target_user_id" "uuid", "days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_audit_history"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_audit_history"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_audit_history"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_detailed_progress"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_detailed_progress"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_detailed_progress"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_emails_for_cohort"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_emails_for_cohort"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_emails_for_cohort"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_recent_activity_detailed"("target_user_id" "uuid", "days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_recent_activity_detailed"("target_user_id" "uuid", "days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_recent_activity_detailed"("target_user_id" "uuid", "days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_survey_status"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_survey_status"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_survey_status"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_users_with_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_users_with_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_users_with_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_admin_action"("action_type" "text", "description" "text", "target_table" "text", "target_id" "uuid", "details" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_admin_action"("action_type" "text", "description" "text", "target_table" "text", "target_id" "uuid", "details" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_admin_action"("action_type" "text", "description" "text", "target_table" "text", "target_id" "uuid", "details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_due_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_due_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_due_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."process_pending_emails"() TO "anon";
GRANT ALL ON FUNCTION "public"."process_pending_emails"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_pending_emails"() TO "service_role";



GRANT ALL ON FUNCTION "public"."schedule_cohort_emails_simple"("target_cohort_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."schedule_cohort_emails_simple"("target_cohort_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."schedule_cohort_emails_simple"("target_cohort_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_surveys"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_surveys"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_surveys"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_surveys_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_surveys_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_user_analytics_surveys_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_cohort_automation_config_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_cohort_automation_config_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_cohort_automation_config_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_activity_tracking_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_activity_tracking_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_activity_tracking_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_analytics"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_analytics"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_analytics"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_journey_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_journey_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_journey_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_profiles_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_profiles_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profiles_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_access_cohort"("cohort_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_access_cohort"("cohort_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_access_cohort"("cohort_uuid" "uuid") TO "service_role";
























GRANT ALL ON TABLE "public"."admin_action_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_action_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_action_log" TO "service_role";



GRANT ALL ON TABLE "public"."admin_action_summary" TO "anon";
GRANT ALL ON TABLE "public"."admin_action_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_action_summary" TO "service_role";



GRANT ALL ON TABLE "public"."admin_cohort_assignments" TO "anon";
GRANT ALL ON TABLE "public"."admin_cohort_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_cohort_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."cohorts" TO "anon";
GRANT ALL ON TABLE "public"."cohorts" TO "authenticated";
GRANT ALL ON TABLE "public"."cohorts" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."cohort_analytics" TO "anon";
GRANT ALL ON TABLE "public"."cohort_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."cohort_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."admin_dashboard_summary" TO "anon";
GRANT ALL ON TABLE "public"."admin_dashboard_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_dashboard_summary" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."cohort_automation_config" TO "anon";
GRANT ALL ON TABLE "public"."cohort_automation_config" TO "authenticated";
GRANT ALL ON TABLE "public"."cohort_automation_config" TO "service_role";



GRANT ALL ON TABLE "public"."post_survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."post_survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."post_survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."pre_survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."pre_survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."pre_survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."user_journey_analytics" TO "anon";
GRANT ALL ON TABLE "public"."user_journey_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."user_journey_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."cohort_performance_summary" TO "anon";
GRANT ALL ON TABLE "public"."cohort_performance_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."cohort_performance_summary" TO "service_role";



GRANT ALL ON TABLE "public"."cohort_stats" TO "anon";
GRANT ALL ON TABLE "public"."cohort_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."cohort_stats" TO "service_role";



GRANT ALL ON TABLE "public"."customized_challenges" TO "anon";
GRANT ALL ON TABLE "public"."customized_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."customized_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."videos" TO "anon";
GRANT ALL ON TABLE "public"."videos" TO "authenticated";
GRANT ALL ON TABLE "public"."videos" TO "service_role";



GRANT ALL ON TABLE "public"."daily_videos" TO "anon";
GRANT ALL ON TABLE "public"."daily_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_videos" TO "service_role";



GRANT ALL ON TABLE "public"."dlab_challenges" TO "anon";
GRANT ALL ON TABLE "public"."dlab_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."dlab_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."email_auto_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_auto_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_auto_logs" TO "service_role";



GRANT ALL ON TABLE "public"."email_auto_queue" TO "anon";
GRANT ALL ON TABLE "public"."email_auto_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."email_auto_queue" TO "service_role";



GRANT ALL ON TABLE "public"."email_auto_settings" TO "anon";
GRANT ALL ON TABLE "public"."email_auto_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."email_auto_settings" TO "service_role";



GRANT ALL ON TABLE "public"."email_auto_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_auto_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_auto_templates" TO "service_role";



GRANT ALL ON TABLE "public"."email_auto_user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."email_auto_user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."email_auto_user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."email_schedule" TO "anon";
GRANT ALL ON TABLE "public"."email_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."email_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."global_videos" TO "anon";
GRANT ALL ON TABLE "public"."global_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."global_videos" TO "service_role";



GRANT ALL ON TABLE "public"."habit_videos" TO "anon";
GRANT ALL ON TABLE "public"."habit_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."habit_videos" TO "service_role";



GRANT ALL ON TABLE "public"."safe_admin_cohort_access" TO "anon";
GRANT ALL ON TABLE "public"."safe_admin_cohort_access" TO "authenticated";
GRANT ALL ON TABLE "public"."safe_admin_cohort_access" TO "service_role";



GRANT ALL ON TABLE "public"."simple_automation_config" TO "anon";
GRANT ALL ON TABLE "public"."simple_automation_config" TO "authenticated";
GRANT ALL ON TABLE "public"."simple_automation_config" TO "service_role";



GRANT ALL ON TABLE "public"."simple_email_logs" TO "anon";
GRANT ALL ON TABLE "public"."simple_email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."simple_email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."simple_email_queue" TO "anon";
GRANT ALL ON TABLE "public"."simple_email_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."simple_email_queue" TO "service_role";



GRANT ALL ON TABLE "public"."survey_comparison" TO "anon";
GRANT ALL ON TABLE "public"."survey_comparison" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_comparison" TO "service_role";



GRANT ALL ON TABLE "public"."user_challenge_completions" TO "anon";
GRANT ALL ON TABLE "public"."user_challenge_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_challenge_completions" TO "service_role";



GRANT ALL ON TABLE "public"."user_reflections" TO "anon";
GRANT ALL ON TABLE "public"."user_reflections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_reflections" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_summary" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_summary" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_tracking" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_tracking" TO "service_role";



GRANT ALL ON TABLE "public"."user_customized_challenge_completions" TO "anon";
GRANT ALL ON TABLE "public"."user_customized_challenge_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_customized_challenge_completions" TO "service_role";



GRANT ALL ON TABLE "public"."user_customized_challenge_reflections" TO "anon";
GRANT ALL ON TABLE "public"."user_customized_challenge_reflections" TO "authenticated";
GRANT ALL ON TABLE "public"."user_customized_challenge_reflections" TO "service_role";



GRANT ALL ON TABLE "public"."user_customized_day_completions" TO "anon";
GRANT ALL ON TABLE "public"."user_customized_day_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_customized_day_completions" TO "service_role";



GRANT ALL ON TABLE "public"."user_day_completions" TO "anon";
GRANT ALL ON TABLE "public"."user_day_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_day_completions" TO "service_role";



GRANT ALL ON TABLE "public"."user_details" TO "anon";
GRANT ALL ON TABLE "public"."user_details" TO "authenticated";
GRANT ALL ON TABLE "public"."user_details" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles_with_cohort" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles_with_cohort" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles_with_cohort" TO "service_role";



GRANT ALL ON TABLE "public"."user_video_interactions" TO "anon";
GRANT ALL ON TABLE "public"."user_video_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_video_interactions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
