-- ============================================================
-- Cancel pending emails when a user is removed from a cohort
-- or moved to a different cohort.
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_enqueue_emails()
RETURNS TRIGGER AS $$
DECLARE
    cancelled_count integer;
BEGIN
    -- Cancel pending emails from the OLD cohort when user is
    -- removed (cohort_id → NULL) or moved to a different cohort
    IF OLD.cohort_id IS NOT NULL AND
       (NEW.cohort_id IS NULL OR NEW.cohort_id != OLD.cohort_id)
    THEN
        UPDATE simple_email_queue
        SET status = 'cancelled'
        WHERE user_id = NEW.user_id
          AND cohort_id = OLD.cohort_id
          AND status = 'pending';

        GET DIAGNOSTICS cancelled_count = ROW_COUNT;
        RAISE NOTICE 'Cancelled % pending emails for user % from cohort %',
            cancelled_count, NEW.user_id, OLD.cohort_id;
    END IF;

    -- Enqueue emails for the NEW cohort (if assigned to one)
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
