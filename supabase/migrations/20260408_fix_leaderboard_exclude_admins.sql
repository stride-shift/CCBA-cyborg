-- Fix leaderboard RPC to exclude admin/super_admin users
-- Previously included all profiles in the cohort regardless of role

CREATE OR REPLACE FUNCTION "public"."get_enhanced_cohort_leaderboard_v2"("target_cohort_id" "uuid")
RETURNS TABLE(
    "user_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "total_days_completed" integer,
    "total_challenges_completed" integer,
    "total_reflections_submitted" integer,
    "current_streak_days" integer,
    "journey_completion_percentage" numeric,
    "surveys_completed" integer,
    "rank_position" integer
)
LANGUAGE "sql" STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
WITH
cohort_window AS (
    SELECT c.start_date::date AS start_date, c.end_date::date AS end_date
    FROM public.cohorts c
    WHERE c.id = target_cohort_id
),
cohort_type AS (
    SELECT EXISTS(
        SELECT 1 FROM customized_challenges cc
        WHERE cc.cohort_id = target_cohort_id AND cc.is_active = true
    ) AS is_customized
),
total_challenge_count AS (
    SELECT
        CASE
            WHEN ct.is_customized THEN (
                SELECT COUNT(*) FROM customized_challenges cc
                WHERE cc.cohort_id = target_cohort_id AND cc.is_active = true
            )
            ELSE (SELECT COUNT(*) FROM challenges ch WHERE ch.is_active = true)
        END AS total_days
    FROM cohort_type ct
),
max_days AS (
    SELECT (tc.total_days + 1)::numeric AS max_possible FROM total_challenge_count tc
),
cohort_users AS (
    SELECT up.user_id, up.first_name::text, up.last_name::text
    FROM public.user_profiles up
    WHERE up.cohort_id = target_cohort_id
      AND up.role = 'user'
),
program_completions AS (
    SELECT d.user_id,
           (COALESCE(d.updated_at, d.created_at))::date AS activity_date,
           ch.order_index::int AS day_number,
           d.both_challenges_completed,
           d.reflection_submitted
    FROM public.user_day_completions d
    JOIN public.challenges ch ON ch.id = d.challenge_id
    WHERE EXISTS (SELECT 1 FROM cohort_users u WHERE u.user_id = d.user_id)
    UNION ALL
    SELECT d.user_id,
           (COALESCE(d.updated_at, d.created_at))::date AS activity_date,
           cch.order_index::int AS day_number,
           d.both_challenges_completed,
           d.reflection_submitted
    FROM public.user_customized_day_completions d
    JOIN public.customized_challenges cch ON cch.id = d.challenge_id
    WHERE EXISTS (SELECT 1 FROM cohort_users u WHERE u.user_id = d.user_id)
),
valid_day_numbers AS (
    SELECT DISTINCT pc.user_id, pc.day_number
    FROM program_completions pc
    WHERE (pc.both_challenges_completed IS TRUE OR pc.reflection_submitted IS TRUE)
),
survey_days AS (
    SELECT ps.user_id, 0 AS day_number FROM public.pre_survey_responses ps
),
days_agg AS (
    SELECT u.user_id, COUNT(DISTINCT v.day_number)::int AS total_days_completed
    FROM cohort_users u
    LEFT JOIN (
        SELECT * FROM valid_day_numbers
        UNION ALL
        SELECT * FROM survey_days
    ) v ON v.user_id = u.user_id
    GROUP BY u.user_id
),
challenge_counts AS (
    SELECT u.user_id,
           (COALESCE((SELECT COUNT(*) FROM public.user_challenge_completions c WHERE c.user_id = u.user_id), 0) +
            COALESCE((SELECT COUNT(*) FROM public.user_customized_challenge_completions c WHERE c.user_id = u.user_id), 0))::int
    AS total_challenges_completed
    FROM cohort_users u
),
reflection_counts AS (
    SELECT u.user_id,
           (COALESCE((SELECT COUNT(*) FROM public.user_reflections r WHERE r.user_id = u.user_id), 0) +
            COALESCE((SELECT COUNT(*) FROM public.user_customized_challenge_reflections r WHERE r.user_id = u.user_id), 0))::int
    AS total_reflections_submitted
    FROM cohort_users u
),
survey_counts AS (
    SELECT u.user_id,
           (COALESCE((SELECT COUNT(*) FROM public.pre_survey_responses s WHERE s.user_id = u.user_id), 0) +
            COALESCE((SELECT COUNT(*) FROM public.post_survey_responses s WHERE s.user_id = u.user_id), 0))::int
    AS surveys_completed
    FROM cohort_users u
),
program_completions_windowed AS (
    SELECT pc.*
    FROM program_completions pc, cohort_window w
    WHERE (w.start_date IS NULL OR pc.activity_date >= w.start_date)
      AND (w.end_date IS NULL OR pc.activity_date <= w.end_date)
),
streak_dates AS (
    SELECT pc.user_id, pc.activity_date
    FROM program_completions_windowed pc
    WHERE (pc.both_challenges_completed IS TRUE OR pc.reflection_submitted IS TRUE)
    GROUP BY pc.user_id, pc.activity_date
),
anchor AS (
    SELECT COALESCE(LEAST(current_date, w.end_date), current_date) AS anchor_date
    FROM cohort_window w
),
streaks AS (
    WITH RECURSIVE walk(user_id, d) AS (
        SELECT sd.user_id, a.anchor_date
        FROM streak_dates sd CROSS JOIN anchor a
        WHERE sd.activity_date = a.anchor_date
        UNION ALL
        SELECT w.user_id, (w.d - interval '1 day')::date
        FROM walk w
        JOIN streak_dates sd
          ON sd.user_id = w.user_id
         AND sd.activity_date = (w.d - interval '1 day')::date
    )
    SELECT u.user_id, COALESCE(COUNT(w.d), 0)::int AS current_streak_days
    FROM cohort_users u
    LEFT JOIN walk w ON w.user_id = u.user_id
    GROUP BY u.user_id
),
combined AS (
    SELECT
        u.user_id, u.first_name, u.last_name,
        COALESCE(d.total_days_completed, 0) AS total_days_completed,
        COALESCE(c.total_challenges_completed, 0) AS total_challenges_completed,
        COALESCE(r.total_reflections_submitted, 0) AS total_reflections_submitted,
        COALESCE(s.current_streak_days, 0) AS current_streak_days,
        COALESCE(sc.surveys_completed, 0) AS surveys_completed,
        CASE
            WHEN md.max_possible > 0
            THEN ROUND((COALESCE(d.total_days_completed, 0)::numeric / md.max_possible) * 100, 2)
            ELSE 0
        END AS journey_completion_percentage
    FROM cohort_users u
    CROSS JOIN max_days md
    LEFT JOIN days_agg d ON d.user_id = u.user_id
    LEFT JOIN challenge_counts c ON c.user_id = u.user_id
    LEFT JOIN reflection_counts r ON r.user_id = u.user_id
    LEFT JOIN streaks s ON s.user_id = u.user_id
    LEFT JOIN survey_counts sc ON sc.user_id = u.user_id
)
SELECT
    user_id, first_name, last_name,
    total_days_completed, total_challenges_completed, total_reflections_submitted,
    current_streak_days, journey_completion_percentage, surveys_completed,
    (ROW_NUMBER() OVER (
        ORDER BY total_days_completed DESC,
                 total_challenges_completed DESC,
                 total_reflections_submitted DESC
    ))::int AS rank_position
FROM combined
ORDER BY rank_position;
$$;


-- Also fix get_cohort_users_with_stats to filter by role='user'
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
    total_challenge_count AS (
        SELECT
            CASE
                WHEN ct.is_customized THEN (
                    SELECT COUNT(*) FROM customized_challenges cc2
                    WHERE cc2.cohort_id = target_cohort_id AND cc2.is_active = true
                )
                ELSE (SELECT COUNT(*) FROM challenges ch WHERE ch.is_active = true)
            END AS total_days
        FROM cohort_type ct
    ),
    max_days AS (
        SELECT (tc.total_days + 1)::numeric AS max_possible FROM total_challenge_count tc
    ),
    program_completions AS (
        SELECT d.user_id AS uid, ch.order_index AS day_number,
               d.both_challenges_completed, d.reflection_submitted
        FROM user_day_completions d
        JOIN challenges ch ON ch.id = d.challenge_id
        UNION ALL
        SELECT d.user_id AS uid, cch.order_index AS day_number,
               d.both_challenges_completed, d.reflection_submitted
        FROM user_customized_day_completions d
        JOIN customized_challenges cch ON cch.id = d.challenge_id
    ),
    valid_days AS (
        SELECT DISTINCT pc.uid, pc.day_number
        FROM program_completions pc
        WHERE (pc.both_challenges_completed IS TRUE OR pc.reflection_submitted IS TRUE)
    ),
    survey_days AS (
        SELECT ps.user_id AS uid, 0 AS day_number FROM pre_survey_responses ps
    ),
    days_agg AS (
        SELECT up2.user_id AS uid, COUNT(DISTINCT v.day_number) AS total_days
        FROM user_profiles up2
        LEFT JOIN (
            SELECT * FROM valid_days
            UNION ALL
            SELECT * FROM survey_days
        ) v ON v.uid = up2.user_id
        WHERE up2.cohort_id = target_cohort_id
          AND up2.role = 'user'
        GROUP BY up2.user_id
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

            COALESCE(da.total_days, 0) AS total_days_completed,

            COALESCE(js.current_streak_days, 0) AS streak_days,
            CASE
                WHEN md.max_possible > 0
                THEN ROUND((COALESCE(da.total_days, 0)::numeric / md.max_possible) * 100, 2)
                ELSE 0
            END AS completion_pct,
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
        CROSS JOIN max_days md
        LEFT JOIN days_agg da ON up.user_id = da.uid

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
          AND up.role = 'user'
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
