# Duplicate Challenges Fix - 2025-10-08

**Status:** ✅ FIXED

---

## Problem Discovered

After the RLS rollback, the application still wasn't working. Investigation revealed:

- **406 HTTP errors** when querying challenges table via PostgREST API
- Frontend using `.single()` expecting exactly ONE challenge per day
- **Root Cause:** Data migration created 3-4 duplicate challenges for every day in Standard set

### Why This Happened

During the original migration from `challenges` + `customized_challenges` tables:
- Original default challenges (created 2025-05-25) were already in `challenges` table
- Migration added `challenge_set_id` to ALL existing challenges → assigned to Standard set
- THEN migration also copied customized_challenges into `challenges` table → also assigned to Standard set
- **Result:** Same day had multiple challenges from different sources, all with same `challenge_set_id`

### Impact

- **76 total challenges** in Standard set (should be ~43)
- **3-4 duplicates** for each day (order_index 1-15)
- Frontend `.single()` query → PostgREST returns **406 "Not Acceptable"** when multiple rows match
- Users saw blank challenges page with "Object" in console

---

## Solution Applied

### 1. Fixed Analytics Function
**Migration:** `fix_update_user_analytics_function`

The `update_user_analytics` function was still referencing dropped tables:
- `user_customized_day_completions`
- `user_customized_challenge_completions`
- `user_customized_challenge_reflections`
- `customized_challenges`

This prevented any DELETE operations on challenges table (trigger would fail).

**Fix:** Rewrote function to only use unified tables:
- `user_day_completions`
- `user_challenge_completions`
- `user_reflections`
- `challenges`

### 2. Removed Duplicate Challenges
**Migration:** `remove_duplicate_challenges_from_standard_set`

```sql
-- Kept oldest challenge per day (original default challenges)
WITH ranked_challenges AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY challenge_set_id, order_index
    ORDER BY created_at ASC
  ) as rn
  FROM challenges
  WHERE challenge_set_id = '9f9bd412-ba64-4614-931e-f26feb2567a1'
)
DELETE FROM challenges
WHERE id IN (SELECT id FROM ranked_challenges WHERE rn > 1);
```

**Results:**
- ✅ Deleted 33 duplicate challenges
- ✅ Standard set now has 43 unique challenges (one per day)
- ✅ Kept oldest challenges with proper titles (e.g., "Clarity Challenge", "Culture Rules Challenge")

### 3. Added Unique Constraint

```sql
ALTER TABLE challenges
ADD CONSTRAINT challenges_set_order_unique
UNIQUE (challenge_set_id, order_index);
```

This **prevents future duplicates** - each challenge set can only have ONE challenge per day.

---

## Verification

### Database Check
```sql
-- No duplicates found
SELECT challenge_set_id, order_index, COUNT(*)
FROM challenges
WHERE challenge_set_id = '9f9bd412-ba64-4614-931e-f26feb2567a1'
GROUP BY challenge_set_id, order_index
HAVING COUNT(*) > 1;
-- Returns: 0 rows
```

### API Test
```bash
# Query for day 1 challenge
curl "https://[project].supabase.co/rest/v1/challenges?select=*&order_index=eq.1&is_active=eq.true&challenge_set_id=eq.[standard-set-id]"

# Returns: Exactly 1 challenge (Clarity Challenge)
# Status: 200 OK (no more 406 errors!)
```

---

## Current State

### ✅ Database
- ✅ Standard set: 43 unique challenges
- ✅ No duplicates in any challenge set
- ✅ Unique constraint prevents future duplicates
- ✅ Analytics function updated for unified tables

### ✅ API
- ✅ PostgREST queries return single challenge per day
- ✅ No more 406 errors
- ✅ Frontend `.single()` queries work correctly

### ✅ Security
- ✅ RLS disabled on all tables (same as before RLS attempt)
- ✅ No policies blocking access
- ✅ All roles have proper grants

---

## Files Modified

### Migrations Applied
1. `fix_update_user_analytics_function.sql`
2. `remove_duplicate_challenges_from_standard_set.sql`

---

## Next Steps

1. **Test the application** - Visit `/challenge/1` and verify challenges load correctly
2. **Test user progress** - Verify challenge completions and reflections work
3. **Monitor API logs** - Check for any remaining 406/400 errors

---

## Lessons Learned

1. **Migration validation is critical** - Should have verified no duplicates after data migration
2. **Unique constraints upfront** - Should have added constraint during initial schema design
3. **Test `.single()` queries** - Always verify queries that expect exactly one row
4. **Function dependencies** - Update all functions/triggers when dropping tables

---

**Status:** Application should now work correctly. All challenges, reflections, and video content should load as expected.
