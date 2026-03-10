-- ============================================================
-- Remove day-of-week references from email templates
-- so they work regardless of which day they land on.
-- ============================================================

-- Day 0 (Pre-programme): "Starts Monday" → "Starts Soon"
UPDATE public.email_schedule
SET subject_template = 'Your Cyborg Journey Starts Soon — Get Ready!',
    html_template = build_email_html(
        'Your Cyborg Journey Starts Soon — Get Ready!',
        'The Cyborg Habits programme kicks off soon! Jump into the platform now and watch the introduction video so you''re ready to go when the first challenge drops. See you on the inside.',
        'Watch The Intro Video',
        'Pre-Programme'
    )
WHERE day_number = 0 AND cohort_id IS NULL;

-- Day 5: "Friday Brain ≠ Weak Brain" → "Tired Brain ≠ Weak Brain"
UPDATE public.email_schedule
SET subject_template = 'Tired Brain ≠ Weak Brain',
    html_template = build_email_html(
        'Tired Brain ≠ Weak Brain',
        'Fatigue is real. But your cyborg habits don''t take days off. One small action today compounds into something extraordinary. Keep the momentum going.',
        'Finish Strong',
        'Day 5'
    )
WHERE day_number = 5 AND cohort_id IS NULL;

-- Day 6: "Monday Called. Your Cyborg Answered." → "You Showed Up. Again."
UPDATE public.email_schedule
SET subject_template = 'You Showed Up. Again.',
    html_template = build_email_html(
        'You Showed Up. Again.',
        'New day. New neural pathways. The habits you''re building aren''t just tasks — they''re rewiring how you think. Log in and keep the momentum going.',
        'Start Rewiring',
        'Day 6'
    )
WHERE day_number = 6 AND cohort_id IS NULL;

-- Day 11: "The Monday Multiplier Effect" → "The Multiplier Effect"
UPDATE public.email_schedule
SET subject_template = 'The Multiplier Effect',
    html_template = build_email_html(
        'The Multiplier Effect',
        'Every time you show up, you multiply your previous gains. Your cyborg habits are compounding. Can you feel the difference? Because the people around you can.',
        'Multiply Your Gains',
        'Day 11'
    )
WHERE day_number = 11 AND cohort_id IS NULL;
