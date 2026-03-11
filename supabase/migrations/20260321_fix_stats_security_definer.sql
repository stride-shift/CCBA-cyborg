-- Add SECURITY DEFINER to get_cohort_users_with_stats so it can access auth.users

CREATE OR REPLACE FUNCTION "public"."get_cohort_users_with_stats"("target_cohort_id" "uuid")
RETURNS TABLE(
    "user_id" "uuid",
    "email" "text",
    "first_name" character varying,
    "last_name" character varying,
    "role" character varying,
    "created_at" timestamp with time zone,
    "total_challenges_completed" bigint,
    "total_reflections_submitted" bigint,
    "total_days_completed" bigint,
    "current_streak_days" integer,
    "journey_completion_percentage" numeric,
    "last_activity_at" timestamp with time zone,
    "recent_challenges_count" bigint,
    "recent_reflections_count" bigint,
    "is_customized_cohort" boolean
)
LANGUAGE "plpgsql"
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    WITH cohort_type AS (
        SELECT EXISTS(
            SELECT 1 FROM customized_challenges cc
            WHERE cc.cohort_id = target_cohort_id AND cc.is_active = true
        ) as is_customized
    ),
    user_stats AS (
        SELECT
            up.user_id AS uid,
            au.email::text AS user_email,
            up.first_name AS fname,
            up.last_name AS lname,
            up.role AS user_role,
            up.created_at AS user_created_at,

            CASE
                WHEN ct.is_customized THEN COALESCE(ccs.total_challenges, 0)
                ELSE COALESCE(ncs.total_challenges, 0)
            END AS total_challenges_completed,

            CASE
                WHEN ct.is_customized THEN COALESCE(crs.total_reflections, 0)
                ELSE COALESCE(nrs.total_reflections, 0)
            END AS total_reflections_submitted,

            CASE
                WHEN ct.is_customized THEN COALESCE(cds.total_days, 0)
                ELSE COALESCE(nds.total_days, 0)
            END AS total_days_completed,

            COALESCE(js.current_streak_days, 0) AS streak_days,
            COALESCE(js.journey_completion_percentage, 0) AS completion_pct,
            js.last_activity_at AS last_active,

            CASE
                WHEN ct.is_customized THEN COALESCE(crc.recent_count, 0)
                ELSE COALESCE(nrc.recent_count, 0)
            END AS recent_challenges_count,

            CASE
                WHEN ct.is_customized THEN COALESCE(crr.recent_count, 0)
                ELSE COALESCE(nrr.recent_count, 0)
            END AS recent_reflections_count,

            ct.is_customized AS is_custom

        FROM user_profiles up
        LEFT JOIN auth.users au ON up.user_id = au.id
        CROSS JOIN cohort_type ct

        LEFT JOIN (
            SELECT ucc.user_id AS uid, COUNT(*) AS total_challenges
            FROM user_challenge_completions ucc
            GROUP BY ucc.user_id
        ) ncs ON up.user_id = ncs.uid

        LEFT JOIN (
            SELECT uccc.user_id AS uid, COUNT(*) AS total_challenges
            FROM user_customized_challenge_completions uccc
            GROUP BY uccc.user_id
        ) ccs ON up.user_id = ccs.uid

        LEFT JOIN (
            SELECT ur.user_id AS uid, COUNT(*) AS total_reflections
            FROM user_reflections ur
            GROUP BY ur.user_id
        ) nrs ON up.user_id = nrs.uid

        LEFT JOIN (
            SELECT ucr.user_id AS uid, COUNT(*) AS total_reflections
            FROM user_customized_challenge_reflections ucr
            GROUP BY ucr.user_id
        ) crs ON up.user_id = crs.uid

        LEFT JOIN (
            SELECT udc.user_id AS uid, COUNT(*) AS total_days
            FROM user_day_completions udc
            GROUP BY udc.user_id
        ) nds ON up.user_id = nds.uid

        LEFT JOIN (
            SELECT ucdc.user_id AS uid, COUNT(*) AS total_days
            FROM user_customized_day_completions ucdc
            WHERE ucdc.both_challenges_completed = true
            GROUP BY ucdc.user_id
        ) cds ON up.user_id = cds.uid

        LEFT JOIN user_journey_analytics js ON up.user_id = js.user_id

        LEFT JOIN (
            SELECT ucc2.user_id AS uid, COUNT(*) AS recent_count
            FROM user_challenge_completions ucc2
            WHERE ucc2.completed_at >= NOW() - INTERVAL '7 days'
            GROUP BY ucc2.user_id
        ) nrc ON up.user_id = nrc.uid

        LEFT JOIN (
            SELECT uccc2.user_id AS uid, COUNT(*) AS recent_count
            FROM user_customized_challenge_completions uccc2
            WHERE uccc2.completed_at >= NOW() - INTERVAL '7 days'
            GROUP BY uccc2.user_id
        ) crc ON up.user_id = crc.uid

        LEFT JOIN (
            SELECT ur2.user_id AS uid, COUNT(*) AS recent_count
            FROM user_reflections ur2
            WHERE ur2.submitted_at >= NOW() - INTERVAL '7 days'
            GROUP BY ur2.user_id
        ) nrr ON up.user_id = nrr.uid

        LEFT JOIN (
            SELECT ucr2.user_id AS uid, COUNT(*) AS recent_count
            FROM user_customized_challenge_reflections ucr2
            WHERE ucr2.submitted_at >= NOW() - INTERVAL '7 days'
            GROUP BY ucr2.user_id
        ) crr ON up.user_id = crr.uid

        WHERE up.cohort_id = target_cohort_id
    )
    SELECT
        us.uid,
        us.user_email,
        us.fname,
        us.lname,
        us.user_role,
        us.user_created_at,
        us.total_challenges_completed,
        us.total_reflections_submitted,
        us.total_days_completed,
        us.streak_days,
        us.completion_pct,
        us.last_active,
        us.recent_challenges_count,
        us.recent_reflections_count,
        us.is_custom
    FROM user_stats us
    ORDER BY us.fname;
END;
$$;
