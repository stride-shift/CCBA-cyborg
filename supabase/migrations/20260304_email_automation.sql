-- ============================================================
-- CCBA Cyborg Habits — Email Automation Migration
-- Following TRIGGER_TO_INBOX.md architecture
-- ============================================================

-- ============================================================
-- 1. ADD email_automation_enabled TO cohorts
-- ============================================================
ALTER TABLE public.cohorts
    ADD COLUMN IF NOT EXISTS email_automation_enabled boolean DEFAULT false;

-- ============================================================
-- 2. ALTER simple_automation_config (add missing columns)
-- ============================================================
ALTER TABLE public.simple_automation_config
    ADD COLUMN IF NOT EXISTS email_start_date date,
    ADD COLUMN IF NOT EXISTS platform_url text DEFAULT 'https://ccba-cyborg.vercel.app/';

-- ============================================================
-- 3. PERFORMANCE INDEXES (from guide)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_email_queue_pending_scheduled
    ON simple_email_queue(status, scheduled_for)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_queue_resend_id
    ON simple_email_queue(resend_id)
    WHERE resend_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_queue_user
    ON simple_email_queue(user_id, cohort_id);

CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at
    ON simple_email_logs(sent_at DESC);

-- ============================================================
-- 4. FIX email_type CHECK CONSTRAINT (add new types)
-- ============================================================
ALTER TABLE public.email_schedule DROP CONSTRAINT IF EXISTS email_schedule_email_type_check;
ALTER TABLE public.email_schedule ADD CONSTRAINT email_schedule_email_type_check
    CHECK (email_type = ANY (ARRAY['welcome','daily_challenge','weekly_challenge','pre_programme','completion','nudge_2day','nudge_5day','post_program_report']));

-- ============================================================
-- 5. SEED EMAIL TEMPLATES INTO email_schedule
-- 27 templates: 1 pre-programme + 17 daily + 4 April weekly + 5 May weekly
-- HTML templates use variables: {first_name}, {cohort_name}, {platform_url}, {day_label}
-- ============================================================
DELETE FROM public.email_schedule WHERE cohort_id IS NULL;

INSERT INTO public.email_schedule (cohort_id, day_number, email_type, subject_template, html_template, is_active)
VALUES
-- ═══ Day 0: Pre-Programme ═══
(NULL, 0, 'pre_programme',
 'Your Cyborg Journey Starts Monday — Get Ready!',
 '<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your Cyborg Journey Starts Monday — Get Ready!</title></head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,''Helvetica Neue'',Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">The Cyborg Habits programme kicks off on Monday! Jump into the platform now...</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#1a1a1a;">
<tr><td align="center" style="padding:20px 10px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">
<tr><td style="height:4px;background:linear-gradient(90deg,#F40009,#d00008,#F40009);border-radius:4px 4px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="background-color:#000000;padding:24px 32px;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center"><img src="https://ccba-cyborg.vercel.app/cyborg-habits-logo.png" alt="Cyborg Habits" width="180" style="display:block;max-width:180px;height:auto;" /></td></tr>
<tr><td align="center" style="padding-top:12px;"><span style="color:rgba(255,255,255,0.5);font-size:12px;letter-spacing:2px;text-transform:uppercase;">CCBA Ascend &bull; LIT Programme</span></td></tr>
</table></td></tr>
<tr><td style="background-color:#111111;padding:16px 32px 0;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
<tr><td style="background-color:#F40009;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:6px 20px;border-radius:20px;">Pre-Programme</td></tr>
</table></td></tr>
<tr><td style="background-color:#111111;padding:28px 40px 20px;">
<h1 style="margin:0 0 20px;color:#ffffff;font-size:26px;font-weight:bold;line-height:1.3;text-align:center;">Your Cyborg Journey Starts Monday — Get Ready!</h1>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="60" align="center">
<tr><td style="height:3px;background-color:#F40009;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
<p style="margin:20px 0 28px;color:rgba(255,255,255,0.85);font-size:16px;line-height:1.7;text-align:center;">The Cyborg Habits programme kicks off on Monday! Jump into the platform now and watch the introduction video so you''re ready to go when the first challenge drops. See you on the inside.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
<tr><td style="border-radius:50px;background-color:#F40009;">
<a href="{platform_url}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;letter-spacing:0.5px;">Watch The Intro Video &rarr;</a>
</td></tr></table></td></tr>
<tr><td style="background-color:#111111;padding:0 40px 24px;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
<tr><td style="width:8px;height:8px;background-color:rgba(244,0,9,0.6);border-radius:50%;font-size:0;line-height:0;">&nbsp;</td><td style="width:16px;font-size:0;">&nbsp;</td><td style="width:6px;height:6px;background-color:rgba(244,0,9,0.35);border-radius:50%;font-size:0;line-height:0;">&nbsp;</td><td style="width:16px;font-size:0;">&nbsp;</td><td style="width:4px;height:4px;background-color:rgba(244,0,9,0.2);border-radius:50%;font-size:0;line-height:0;">&nbsp;</td></tr>
</table></td></tr>
<tr><td style="background-color:#0a0a0a;padding:24px 32px;border-radius:0 0 4px 4px;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center" style="padding-bottom:12px;"><img src="https://ccba-cyborg.vercel.app/ccba-logo.png" alt="CCBA" width="40" style="display:inline-block;max-width:40px;height:auto;opacity:0.6;" /></td></tr>
<tr><td align="center"><p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.5;">Coca-Cola Beverages Africa &bull; Cyborg Habits Programme<br/>Powered by StrideShift Global</p></td></tr>
<tr><td align="center" style="padding-top:12px;"><a href="{platform_url}" style="color:rgba(244,0,9,0.6);font-size:11px;text-decoration:none;">Visit the platform</a></td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>',
 true);

-- I'll create a helper function to generate HTML from content, then use it for remaining templates
-- This avoids repeating the full HTML 26 more times

-- ============================================================
-- 6. HTML BUILDER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.build_email_html(
    p_subject text,
    p_body text,
    p_cta_text text,
    p_day_label text
) RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
    RETURN '<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>' || p_subject || '</title></head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:Arial,''Helvetica Neue'',Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">' || left(p_body, 90) || '...</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#1a1a1a;">
<tr><td align="center" style="padding:20px 10px;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;">
<tr><td style="height:4px;background:linear-gradient(90deg,#F40009,#d00008,#F40009);border-radius:4px 4px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="background-color:#000000;padding:24px 32px;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center"><img src="https://ccba-cyborg.vercel.app/cyborg-habits-logo.png" alt="Cyborg Habits" width="180" style="display:block;max-width:180px;height:auto;" /></td></tr>
<tr><td align="center" style="padding-top:12px;"><span style="color:rgba(255,255,255,0.5);font-size:12px;letter-spacing:2px;text-transform:uppercase;">CCBA Ascend &bull; LIT Programme</span></td></tr>
</table></td></tr>
<tr><td style="background-color:#111111;padding:16px 32px 0;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
<tr><td style="background-color:#F40009;color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:6px 20px;border-radius:20px;">' || p_day_label || '</td></tr>
</table></td></tr>
<tr><td style="background-color:#111111;padding:28px 40px 20px;">
<h1 style="margin:0 0 20px;color:#ffffff;font-size:26px;font-weight:bold;line-height:1.3;text-align:center;">' || p_subject || '</h1>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="60" align="center">
<tr><td style="height:3px;background-color:#F40009;border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr></table>
<p style="margin:20px 0 28px;color:rgba(255,255,255,0.85);font-size:16px;line-height:1.7;text-align:center;">' || p_body || '</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
<tr><td style="border-radius:50px;background-color:#F40009;">
<a href="{platform_url}" target="_blank" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;letter-spacing:0.5px;">' || p_cta_text || ' &rarr;</a>
</td></tr></table></td></tr>
<tr><td style="background-color:#111111;padding:0 40px 24px;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
<tr><td style="width:8px;height:8px;background-color:rgba(244,0,9,0.6);border-radius:50%;font-size:0;line-height:0;">&nbsp;</td><td style="width:16px;font-size:0;">&nbsp;</td><td style="width:6px;height:6px;background-color:rgba(244,0,9,0.35);border-radius:50%;font-size:0;line-height:0;">&nbsp;</td><td style="width:16px;font-size:0;">&nbsp;</td><td style="width:4px;height:4px;background-color:rgba(244,0,9,0.2);border-radius:50%;font-size:0;line-height:0;">&nbsp;</td></tr>
</table></td></tr>
<tr><td style="background-color:#0a0a0a;padding:24px 32px;border-radius:0 0 4px 4px;text-align:center;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
<tr><td align="center" style="padding-bottom:12px;"><img src="https://ccba-cyborg.vercel.app/ccba-logo.png" alt="CCBA" width="40" style="display:inline-block;max-width:40px;height:auto;opacity:0.6;" /></td></tr>
<tr><td align="center"><p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;line-height:1.5;">Coca-Cola Beverages Africa &bull; Cyborg Habits Programme<br/>Powered by StrideShift Global</p></td></tr>
<tr><td align="center" style="padding-top:12px;"><a href="{platform_url}" style="color:rgba(244,0,9,0.6);font-size:11px;text-decoration:none;">Visit the platform</a></td></tr>
</table></td></tr>
</table></td></tr></table>
</body></html>';
END;
$$;

-- Now seed the remaining 26 templates using the builder function
-- ═══ March Daily (Days 1-17) ═══
INSERT INTO public.email_schedule (cohort_id, day_number, email_type, subject_template, html_template, is_active) VALUES
(NULL, 1, 'daily_challenge', 'Your Inner Cyborg Just Woke Up', build_email_html('Your Inner Cyborg Just Woke Up', 'Something shifted today. You showed up — and that alone puts you ahead of 90% of people who said they would. The programme is live. Your first challenge is waiting.', 'Step Into Your Power', 'Day 1'), true),
(NULL, 2, 'daily_challenge', 'The Uncomfortable Truth About Comfort Zones', build_email_html('The Uncomfortable Truth About Comfort Zones', 'That thing you''ve been avoiding? Your cyborg self already knows it''s the exact thing you need to do next. Growth lives on the other side of discomfort.', 'Push Past The Edge', 'Day 2'), true),
(NULL, 3, 'daily_challenge', 'You''re Smarter Than You Were Last Week', build_email_html('You''re Smarter Than You Were Last Week', 'Every challenge you complete isn''t just a checkbox — it''s proof that you can learn anything. The data doesn''t lie. Check your progress and see how far you''ve come.', 'See Your Progress', 'Day 3'), true),
(NULL, 4, 'daily_challenge', 'The Gap Between Knowing and Doing', build_email_html('The Gap Between Knowing and Doing', 'You know what to do. Everyone does. The difference? Cyborgs actually do it. Today''s your chance to close that gap. One challenge. Five minutes. Real change.', 'Close The Gap', 'Day 4'), true),
(NULL, 5, 'daily_challenge', 'Friday Brain ≠ Weak Brain', build_email_html('Friday Brain ≠ Weak Brain', 'End-of-week fatigue is real. But your cyborg habits don''t take days off. One small action today compounds into something big by Monday. Finish the week strong.', 'Finish Strong', 'Day 5'), true),
(NULL, 6, 'daily_challenge', 'Monday Called. Your Cyborg Answered.', build_email_html('Monday Called. Your Cyborg Answered.', 'New week. New neural pathways. The habits you''re building aren''t just tasks — they''re rewiring how you think. Log in and keep the momentum going.', 'Start Rewiring', 'Day 6'), true),
(NULL, 7, 'daily_challenge', 'Reset. Recharge. Re-engage.', build_email_html('Reset. Recharge. Re-engage.', 'New week, same mission. The neural pathways you''re building get stronger every time you show up. Don''t break the chain — your streak is counting on you.', 'Keep Building', 'Day 7'), true),
(NULL, 8, 'daily_challenge', 'What If You''re Closer Than You Think?', build_email_html('What If You''re Closer Than You Think?', 'Progress doesn''t always announce itself. Sometimes the breakthrough is happening right now and you just can''t see it yet. Trust the process. Log in today.', 'Trust The Process', 'Day 8'), true),
(NULL, 9, 'daily_challenge', 'Your Brain Is Lying to You', build_email_html('Your Brain Is Lying to You', 'That voice saying ''skip today'' isn''t wisdom — it''s resistance. Your cyborg self knows the difference. Override it. Today''s challenge is waiting for you.', 'Override Resistance', 'Day 9'), true),
(NULL, 10, 'daily_challenge', 'Small Moves, Big Shifts', build_email_html('Small Moves, Big Shifts', 'You don''t need a revolution. You need a habit. The tiny actions you''re taking every day are creating tectonic shifts in how you work and think.', 'Keep Moving', 'Day 10'), true),
(NULL, 11, 'daily_challenge', 'The Monday Multiplier Effect', build_email_html('The Monday Multiplier Effect', 'Every Monday you show up, you multiply last week''s gains. Your cyborg habits are compounding. Can you feel the difference? Because the people around you can.', 'Multiply Your Gains', 'Day 11'), true),
(NULL, 12, 'daily_challenge', 'Look How Far You''ve Come', build_email_html('Look How Far You''ve Come', 'Halfway there. Look back at where you started. Now look where you are. That distance? You covered it one day at a time. Don''t stop now.', 'Celebrate & Continue', 'Day 12'), true),
(NULL, 13, 'daily_challenge', 'What Are You Becoming?', build_email_html('What Are You Becoming?', 'Forget the tasks for a second. Who are you turning into? The person finishing this programme isn''t the same one who started it. That''s the real transformation.', 'Discover Your Evolution', 'Day 13'), true),
(NULL, 14, 'daily_challenge', 'The Power of Showing Up (Again)', build_email_html('The Power of Showing Up (Again)', 'Day after day, you keep coming back. That consistency? It''s more powerful than any single brilliant move. You are the system. The system is working.', 'Be The System', 'Day 14'), true),
(NULL, 15, 'daily_challenge', 'Your Future Self Is Watching', build_email_html('Your Future Self Is Watching', 'Everything you do today is being observed by the person you''re becoming. Make them proud. They''re counting on you to keep going.', 'Make Them Proud', 'Day 15'), true),
(NULL, 16, 'daily_challenge', 'The Final Stretch Begins', build_email_html('The Final Stretch Begins', 'You''re in the home stretch of the daily challenges. Two days left. The habits you''ve built this month aren''t going anywhere — they''re part of you now. Show up one more time.', 'Enter The Final Stretch', 'Day 16'), true),
(NULL, 17, 'daily_challenge', 'You Did It. Now Own It.', build_email_html('You Did It. Now Own It.', 'Last daily challenge. You showed up, day after day, and built something real. This isn''t the end — it''s the launchpad. Your cyborg habits are locked in. Time to fly.', 'Complete The Journey', 'Day 17'), true);

-- ═══ April Weekly (Days 18-21) ═══
INSERT INTO public.email_schedule (cohort_id, day_number, email_type, subject_template, html_template, is_active) VALUES
(NULL, 18, 'weekly_challenge', 'The Habit Didn''t Stop When The Programme Did', build_email_html('The Habit Didn''t Stop When The Programme Did', 'It''s been a week since the daily challenges ended. But your cyborg doesn''t power down. The question is — are you still showing up when nobody''s sending you a reminder?', 'Prove It To Yourself', 'April — Week 1'), true),
(NULL, 19, 'weekly_challenge', 'Nobody''s Watching. That''s The Point.', build_email_html('Nobody''s Watching. That''s The Point.', 'The real test of a habit isn''t what you do when someone''s tracking you. It''s what you do when they stop. Your cyborg habits are yours now. Use them.', 'Own Your Habits', 'April — Week 2'), true),
(NULL, 20, 'weekly_challenge', 'You''re Not The Same Person Who Started', build_email_html('You''re Not The Same Person Who Started', 'Look back at who you were a month ago. The way you think, the way you approach problems, the tools you reach for — something fundamental has shifted. Notice it.', 'See The Shift', 'April — Week 3'), true),
(NULL, 21, 'weekly_challenge', 'The Compound Effect Is Real', build_email_html('The Compound Effect Is Real', 'Small daily actions. Repeated over weeks. The results are starting to show — in your work, your thinking, your confidence. This is what compounding looks like.', 'Keep Compounding', 'April — Week 4'), true);

-- ═══ May Weekly (Days 22-26) ═══
INSERT INTO public.email_schedule (cohort_id, day_number, email_type, subject_template, html_template, is_active) VALUES
(NULL, 22, 'weekly_challenge', 'Two Months In. Still Standing.', build_email_html('Two Months In. Still Standing.', 'Most people quit after two weeks. You''re still here, still applying what you learned. That''s not discipline — that''s identity. You''ve become someone who shows up.', 'Stand Tall', 'May — Week 1'), true),
(NULL, 23, 'weekly_challenge', 'What Would Your Pre-Cyborg Self Think?', build_email_html('What Would Your Pre-Cyborg Self Think?', 'Imagine showing your old self what you can do now. The shortcuts you''ve found, the clarity you''ve built, the habits running on autopilot. You''d barely recognise yourself.', 'Look Back & Smile', 'May — Week 2'), true),
(NULL, 24, 'weekly_challenge', 'The Invisible Advantage', build_email_html('The Invisible Advantage', 'Your colleagues might not know exactly what changed. But they can feel it — in your emails, your decisions, your speed. You have an edge now. Keep sharpening it.', 'Sharpen Your Edge', 'May — Week 3'), true),
(NULL, 25, 'weekly_challenge', 'This Isn''t The End. It''s Your Operating System.', build_email_html('This Isn''t The End. It''s Your Operating System.', 'Cyborg Habits was never just a programme. It''s how you work now. The tools, the thinking, the habits — they''re part of you. Go build something extraordinary with them.', 'Build Something Extraordinary', 'May — Week 4'), true),
(NULL, 26, 'weekly_challenge', 'The Cyborg Legacy', build_email_html('The Cyborg Legacy', 'Three months ago you started something bold. Now look at what you''ve built — new skills, new habits, a new way of thinking. You''re not just a graduate. You''re proof that it works.', 'Carry The Legacy Forward', 'May — Week 5'), true);


-- ============================================================
-- 7. FUNCTIONS (from TRIGGER_TO_INBOX guide, adapted)
-- ============================================================

-- 6a. Calculate Nth weekday from a start date
CREATE OR REPLACE FUNCTION calculate_weekday_date(
    start_date DATE,
    weekdays_to_add INTEGER
) RETURNS DATE AS $$
DECLARE
    result_date DATE := start_date;
    days_added INTEGER := 0;
BEGIN
    IF weekdays_to_add = 0 THEN
        RETURN start_date;
    END IF;

    WHILE days_added < weekdays_to_add LOOP
        result_date := result_date + INTERVAL '1 day';
        IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
            days_added := days_added + 1;
        END IF;
    END LOOP;

    RETURN result_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6b. Calculate Nth Friday after a start date
CREATE OR REPLACE FUNCTION calculate_friday_date(
    start_date DATE,
    weeks_offset INTEGER
) RETURNS DATE AS $$
DECLARE
    first_friday DATE := start_date;
BEGIN
    -- Find the next Friday from start_date
    WHILE EXTRACT(DOW FROM first_friday) != 5 LOOP
        first_friday := first_friday + INTERVAL '1 day';
    END LOOP;

    -- Add weeks_offset weeks (0-indexed: 0 = first Friday)
    RETURN first_friday + (weeks_offset * 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6c. Core function: enqueue all emails for a user in a cohort
CREATE OR REPLACE FUNCTION enqueue_emails_for_user(
    p_user_id UUID,
    p_cohort_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_cohort RECORD;
    v_user RECORD;
    v_config RECORD;
    v_template RECORD;
    v_send_datetime TIMESTAMPTZ;
    v_send_date DATE;
    v_user_email TEXT;
    v_emails_created INTEGER := 0;
    v_effective_start_date DATE;
    v_daily_end_date DATE;
BEGIN
    -- Get cohort
    SELECT * INTO v_cohort FROM cohorts WHERE id = p_cohort_id;
    IF NOT FOUND THEN
        RAISE NOTICE 'Cohort not found: %', p_cohort_id;
        RETURN 0;
    END IF;

    IF v_cohort.email_automation_enabled = FALSE THEN
        RAISE NOTICE 'Email automation disabled for cohort: %', v_cohort.name;
        RETURN 0;
    END IF;

    -- Get user profile
    SELECT * INTO v_user FROM user_profiles WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE NOTICE 'User profile not found: %', p_user_id;
        RETURN 0;
    END IF;

    -- Get user email from auth schema
    SELECT email INTO v_user_email FROM auth.users WHERE id = p_user_id;
    IF v_user_email IS NULL THEN
        RAISE NOTICE 'User email not found: %', p_user_id;
        RETURN 0;
    END IF;

    -- Get automation config
    SELECT * INTO v_config
    FROM simple_automation_config
    WHERE cohort_id = p_cohort_id AND is_enabled = TRUE;
    IF NOT FOUND THEN
        RAISE NOTICE 'Automation config not found or disabled for cohort: %', v_cohort.name;
        RETURN 0;
    END IF;

    -- Effective start date: use email_start_date override if set
    v_effective_start_date := COALESCE(v_config.email_start_date, v_cohort.start_date);

    -- Calculate where the daily phase ends (17 weekdays from start)
    v_daily_end_date := calculate_weekday_date(v_cohort.start_date, 17);

    -- Clear any existing pending emails for this user+cohort (idempotent)
    DELETE FROM simple_email_queue
    WHERE user_id = p_user_id AND cohort_id = p_cohort_id AND status = 'pending';

    -- Loop through templates, calculate dates, insert queue rows
    FOR v_template IN
        SELECT * FROM email_schedule
        WHERE (cohort_id IS NULL OR cohort_id = p_cohort_id)
          AND is_active = TRUE
        ORDER BY day_number
    LOOP
        -- Calculate the send date based on email type
        IF v_template.day_number = 0 THEN
            -- Pre-programme: sends on email_start_date (or cohort start - 3 days)
            v_send_date := COALESCE(v_config.email_start_date, v_cohort.start_date - INTERVAL '3 days');
        ELSIF v_template.day_number BETWEEN 1 AND 17 THEN
            -- Daily challenge: Nth weekday from cohort start_date
            -- day_number 1 = first weekday (start_date itself if it's a weekday)
            v_send_date := calculate_weekday_date(v_cohort.start_date, v_template.day_number - 1);
        ELSE
            -- Weekly challenge (18+): Nth Friday after daily phase ends
            -- day_number 18 = 1st Friday, 19 = 2nd Friday, etc.
            v_send_date := calculate_friday_date(v_daily_end_date, v_template.day_number - 18);
        END IF;

        -- Convert local send time to UTC for storage
        v_send_datetime :=
            (v_send_date || ' ' || v_config.send_time)::TIMESTAMP
            AT TIME ZONE COALESCE(v_config.timezone, 'Africa/Johannesburg')
            AT TIME ZONE 'UTC';

        DECLARE
            v_subject TEXT := v_template.subject_template;
            v_html TEXT := v_template.html_template;
        BEGIN
            -- Substitute template variables
            v_subject := replace(v_subject, '{first_name}',  COALESCE(v_user.first_name, ''));
            v_subject := replace(v_subject, '{last_name}',   COALESCE(v_user.last_name, ''));
            v_subject := replace(v_subject, '{cohort_name}', v_cohort.name);
            v_subject := replace(v_subject, '{day_number}',  v_template.day_number::TEXT);

            v_html := replace(v_html, '{first_name}',   COALESCE(v_user.first_name, ''));
            v_html := replace(v_html, '{last_name}',    COALESCE(v_user.last_name, ''));
            v_html := replace(v_html, '{cohort_name}',  v_cohort.name);
            v_html := replace(v_html, '{platform_url}', COALESCE(v_config.platform_url, 'https://ccba-cyborg.vercel.app/'));
            v_html := replace(v_html, '{day_number}',   v_template.day_number::TEXT);

            INSERT INTO simple_email_queue (
                cohort_id, user_id, recipient_email,
                subject, html_content, email_type,
                day_number, scheduled_for, status, attempts
            ) VALUES (
                p_cohort_id, p_user_id, v_user_email,
                v_subject, v_html, v_template.email_type,
                v_template.day_number, v_send_datetime, 'pending', 0
            );

            v_emails_created := v_emails_created + 1;
        END;
    END LOOP;

    RAISE NOTICE 'Created % emails for % in cohort %',
        v_emails_created, v_user_email, v_cohort.name;

    RETURN v_emails_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- 6d. Regenerate emails for entire cohort
CREATE OR REPLACE FUNCTION regenerate_cohort_emails(
    p_cohort_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_cohort RECORD;
    v_user RECORD;
    v_emails_created INTEGER := 0;
BEGIN
    SELECT * INTO v_cohort FROM cohorts WHERE id = p_cohort_id;
    IF NOT FOUND THEN
        RAISE NOTICE 'Cohort not found: %', p_cohort_id;
        RETURN 0;
    END IF;

    -- If automation is disabled, delete pending emails and exit
    IF v_cohort.email_automation_enabled = FALSE THEN
        DELETE FROM simple_email_queue
        WHERE cohort_id = p_cohort_id AND status = 'pending';
        RETURN 0;
    END IF;

    FOR v_user IN
        SELECT user_id FROM user_profiles WHERE cohort_id = p_cohort_id
    LOOP
        BEGIN
            v_emails_created := v_emails_created +
                enqueue_emails_for_user(v_user.user_id, p_cohort_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed for user %: %', v_user.user_id, SQLERRM;
        END;
    END LOOP;

    RETURN v_emails_created;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;


-- ============================================================
-- 8. TRIGGERS
-- ============================================================

-- 7a. User enrollment → enqueue their emails
CREATE OR REPLACE FUNCTION trigger_enqueue_emails()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.cohort_id IS NOT NULL AND
       (OLD.cohort_id IS NULL OR OLD.cohort_id != NEW.cohort_id)
    THEN
        BEGIN
            PERFORM enqueue_emails_for_user(NEW.user_id, NEW.cohort_id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to enqueue emails for user %: %', NEW.user_id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS user_cohort_enrollment ON user_profiles;
CREATE TRIGGER user_cohort_enrollment
    AFTER INSERT OR UPDATE OF cohort_id ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_enqueue_emails();

-- 7b. Cohort settings changed → regenerate all pending emails
CREATE OR REPLACE FUNCTION trigger_regenerate_cohort_emails()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND (
        OLD.start_date IS DISTINCT FROM NEW.start_date OR
        OLD.email_automation_enabled IS DISTINCT FROM NEW.email_automation_enabled
    ) THEN
        BEGIN
            PERFORM regenerate_cohort_emails(NEW.id);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to regenerate emails for cohort %: %', NEW.id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS cohort_settings_changed ON cohorts;
CREATE TRIGGER cohort_settings_changed
    AFTER UPDATE ON cohorts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_regenerate_cohort_emails();

-- 7c. Automation config changed → regenerate
CREATE OR REPLACE FUNCTION trigger_regenerate_on_config_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM regenerate_cohort_emails(NEW.cohort_id);
    ELSIF TG_OP = 'UPDATE' AND (
        OLD.send_time IS DISTINCT FROM NEW.send_time OR
        OLD.timezone IS DISTINCT FROM NEW.timezone OR
        OLD.is_enabled IS DISTINCT FROM NEW.is_enabled OR
        OLD.email_start_date IS DISTINCT FROM NEW.email_start_date
    ) THEN
        PERFORM regenerate_cohort_emails(NEW.cohort_id);
    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM simple_email_queue
        WHERE cohort_id = OLD.cohort_id AND status = 'pending';
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

DROP TRIGGER IF EXISTS automation_config_changed ON simple_automation_config;
CREATE TRIGGER automation_config_changed
    AFTER INSERT OR UPDATE OR DELETE ON simple_automation_config
    FOR EACH ROW
    EXECUTE FUNCTION trigger_regenerate_on_config_change();


-- ============================================================
-- 9. GRANT PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION calculate_weekday_date TO service_role;
GRANT EXECUTE ON FUNCTION calculate_friday_date TO service_role;
GRANT EXECUTE ON FUNCTION build_email_html TO service_role;
GRANT EXECUTE ON FUNCTION enqueue_emails_for_user TO service_role;
GRANT EXECUTE ON FUNCTION regenerate_cohort_emails TO service_role;
GRANT EXECUTE ON FUNCTION trigger_enqueue_emails TO service_role;
GRANT EXECUTE ON FUNCTION trigger_regenerate_cohort_emails TO service_role;
GRANT EXECUTE ON FUNCTION trigger_regenerate_on_config_change TO service_role;

-- Allow authenticated users (admins) to call regenerate
GRANT EXECUTE ON FUNCTION regenerate_cohort_emails TO authenticated;


-- ============================================================
-- 10. RLS POLICIES (from guide, skip if already exist)
-- ============================================================

-- simple_automation_config: ensure admins can manage
DO $$ BEGIN
    CREATE POLICY "Admins manage automation config"
        ON simple_automation_config FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM user_profiles
                WHERE user_id = auth.uid()
                AND role IN ('admin', 'super_admin')
            )
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE POLICY "Service role full access config"
        ON simple_automation_config FOR ALL TO service_role
        USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
