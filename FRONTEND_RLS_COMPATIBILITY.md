# Frontend & RLS Compatibility Analysis

**Date:** 2025-10-08
**Question:** Will JWT-based RLS break the current frontend?

---

## Executive Summary

✅ **The JWT-based RLS approach WILL WORK with the current frontend**

**Key Findings:**
- Frontend uses **anon key only** (no service role exposure)
- Mix of **direct table queries** and **SECURITY DEFINER functions**
- SECURITY DEFINER functions/views **bypass RLS by design** (intentional)
- Direct queries can be protected with proper RLS policies
- No frontend code changes needed

---

## How the Frontend Currently Works

### 1. Authentication & Client Setup

**src/lib/supabase.js:**
```javascript
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

✅ **Good:** Only anon key exposed, no service role key in frontend

### 2. Query Patterns Found

**Pattern A: Direct Table Queries** (221 occurrences across 26 files)
```javascript
// Example from DayPage.jsx
const { data } = await supabase
  .from('user_profiles')
  .select('cohort_id')
  .eq('user_id', user.id)
  .single()
```

**Pattern B: SECURITY DEFINER Views** (used in 4 files)
```javascript
// Example from useUserProfile.js
const { data } = await supabase
  .from('user_profiles_with_cohort')  // ← VIEW with SECURITY DEFINER
  .select('*')
  .eq('user_id', user.id)
  .single()
```

**Pattern C: SECURITY DEFINER RPC Functions** (13 functions, 7 files)
```javascript
// Example from LeaderboardPage.jsx
const { data } = await supabase.rpc(
  'get_safe_accessible_cohorts'  // ← SECURITY DEFINER function
)
```

---

## Critical Frontend Patterns

### User Profile Management (useUserProfile.js)

**Current Behavior:**
```javascript
// READ: Uses SECURITY DEFINER view
.from('user_profiles_with_cohort')  // Bypasses RLS
  .select('*')
  .eq('user_id', user.id)

// CREATE: Direct insert to table
.from('user_profiles')
  .insert({ user_id: user.id, ... })

// UPDATE: Direct update to table
.from('user_profiles')
  .update(allowedUpdates)
  .eq('user_id', user.id)
```

**With RLS Enabled:**
- ✅ View queries work (SECURITY DEFINER bypasses RLS)
- ✅ User can INSERT own profile (need policy)
- ✅ User can UPDATE own profile (need policy)

**Required Policies:**
```sql
-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view own profile (for direct queries)
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all (using JWT, no circular dependency!)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );
```

### Challenge Loading (DayPage.jsx)

**Current Behavior:**
```javascript
// 1. Get user's cohort
.from('user_profiles').select('cohort_id').eq('user_id', user.id)

// 2. Get cohort's challenge set
.from('cohorts').select('challenge_set_id').eq('id', cohort_id)

// 3. Get challenge
.from('challenges').select('*')
  .eq('order_index', dayNumber)
  .eq('challenge_set_id', challenge_set_id)
```

**With RLS Enabled:**
- ✅ User can see own profile (policy above)
- ⚠️ User needs to see their cohort
- ✅ User can see challenges (public read)

**Required Policies:**
```sql
-- Users can view their own cohort
CREATE POLICY "Users can view own cohort"
  ON cohorts FOR SELECT
  USING (
    id IN (
      SELECT cohort_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Anyone can view active challenges
CREATE POLICY "Anyone can view challenges"
  ON challenges FOR SELECT
  USING (is_active = true);
```

### Reflections (ReflectionSection.jsx)

**Current Behavior:**
```javascript
// READ existing reflection
.from('user_reflections')
  .select('reflection_text')
  .eq('user_id', user.id)
  .eq('challenge_id', challengeId)

// INSERT new reflection
.from('user_reflections')
  .insert({ user_id, challenge_id, reflection_text, ... })
```

**With RLS Enabled:**
- ✅ User can SELECT own reflections
- ✅ User can INSERT own reflections

**Required Policies:**
```sql
-- Users manage their own reflections
CREATE POLICY "Users manage own reflections"
  ON user_reflections FOR ALL
  USING (auth.uid() = user_id);
```

### Admin Leaderboard (LeaderboardPage.jsx)

**Current Behavior:**
```javascript
if (isSuperAdmin() || isAdmin()) {
  // Use SECURITY DEFINER RPC
  const { data } = await supabase.rpc('get_safe_accessible_cohorts')
} else {
  // Direct query for own cohort
  .from('cohorts').select('*').eq('id', profile.cohort_id)
}
```

**With RLS Enabled:**
- ✅ Admin RPC bypasses RLS (SECURITY DEFINER)
- ✅ Regular user can see own cohort (policy above)

**No additional policies needed** - already covered

### Admin Dashboard (CohortDetailDashboard.jsx)

**Current Behavior:**
```javascript
// Uses SECURITY DEFINER view
.from('cohort_analytics')
  .select('*')
  .eq('cohort_id', cohortId)

// Uses SECURITY DEFINER RPC
.rpc('get_cohort_user_progress', { cohort_user_ids: userIds })
```

**With RLS Enabled:**
- ✅ View bypasses RLS (SECURITY DEFINER)
- ✅ RPC bypasses RLS (SECURITY DEFINER)

**No changes needed** - admin access works via SECURITY DEFINER

---

## SECURITY DEFINER Functions That Bypass RLS

**Found 12 SECURITY DEFINER functions used by frontend:**

1. `get_safe_accessible_cohorts` - Admin cohort access
2. `get_cohort_user_progress` - Admin dashboard
3. `get_enhanced_cohort_leaderboard` - Leaderboard
4. `get_enhanced_cohort_leaderboard_v2` - Leaderboard v2
5. `get_cohort_users_with_stats` - Admin viewer
6. `get_user_emails_for_cohort` - Admin user list
7. `get_user_recent_activity_detailed` - User dashboard
8. `get_user_detailed_progress` - User progress
9. `get_hybrid_cohort_users_with_stats` - Admin stats
10. `call_cohort_registration_trigger` - User signup
11. `create_user_profile` - Profile creation
12. `get_users_with_emails` - Admin user management

**All of these will continue to work** because SECURITY DEFINER means:
- Function executes with creator's (postgres) permissions
- Bypasses RLS entirely
- Intentional design for admin access

---

## SECURITY DEFINER Views That Bypass RLS

**Found 12 views used by frontend:**

1. `user_profiles_with_cohort` - Used in useUserProfile hook
2. `cohort_analytics` - Used in admin dashboards
3. `safe_admin_cohort_access` - Used for admin permissions
4. `cohort_stats` - Admin statistics
5. `user_details` - Admin user info ⚠️ (exposes auth.users)
6. `user_activity_summary` - Admin activity ⚠️ (exposes auth.users)
7. Others (habit_videos, daily_videos, etc.)

**All bypass RLS by design** - no changes needed

---

## What Would Break vs. What Would Work

### ❌ Would Break Without Proper Policies

**If we enable RLS without policies:**

1. **User signup** - Can't insert into user_profiles
2. **User profile updates** - Can't update own profile
3. **Challenge loading** - Can't query cohorts table
4. **Reflection submission** - Can't insert reflections
5. **User progress tracking** - Can't insert completions

### ✅ Would Continue Working

**Even with RLS enabled:**

1. **All admin dashboards** - Use SECURITY DEFINER RPCs/views
2. **All leaderboards** - Use SECURITY DEFINER RPCs
3. **User profile reads** - Use SECURITY DEFINER view
4. **Admin user management** - Use SECURITY DEFINER functions

### ✅ Would Work With Policies

**Direct user queries with correct policies:**

1. **Challenge viewing** - Policy: anyone can view active challenges
2. **Own profile management** - Policy: users manage own profile
3. **Own reflections** - Policy: users manage own reflections
4. **Own completions** - Policy: users manage own completions
5. **Own cohort viewing** - Policy: users can see own cohort

---

## Complete Policy Set Needed

### Core Tables (User-Facing)

```sql
-- ========================================
-- USER_PROFILES
-- ========================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

CREATE POLICY "Admins can update profiles"
  ON user_profiles FOR UPDATE
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- COHORTS
-- ========================================
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cohort"
  ON cohorts FOR SELECT
  USING (
    id IN (
      SELECT cohort_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all cohorts"
  ON cohorts FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

CREATE POLICY "Admins can manage cohorts"
  ON cohorts FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- CHALLENGES
-- ========================================
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenges"
  ON challenges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage challenges"
  ON challenges FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- CHALLENGE_SETS
-- ========================================
ALTER TABLE challenge_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active challenge sets"
  ON challenge_sets FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage challenge sets"
  ON challenge_sets FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- USER_REFLECTIONS
-- ========================================
ALTER TABLE user_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reflections"
  ON user_reflections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reflections"
  ON user_reflections FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- USER_CHALLENGE_COMPLETIONS
-- ========================================
ALTER TABLE user_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own completions"
  ON user_challenge_completions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all completions"
  ON user_challenge_completions FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- USER_DAY_COMPLETIONS
-- ========================================
ALTER TABLE user_day_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own day completions"
  ON user_day_completions FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all day completions"
  ON user_day_completions FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- SURVEY RESPONSES
-- ========================================
ALTER TABLE pre_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pre-survey"
  ON pre_survey_responses FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own post-survey"
  ON post_survey_responses FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all pre-surveys"
  ON pre_survey_responses FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

CREATE POLICY "Admins view all post-surveys"
  ON post_survey_responses FOR SELECT
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- ========================================
-- VIDEOS
-- ========================================
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active videos"
  ON videos FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage videos"
  ON videos FOR ALL
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));
```

---

## Critical Insight: The Cohorts Policy Issue

**POTENTIAL PROBLEM with this policy:**
```sql
CREATE POLICY "Users can view own cohort"
  ON cohorts FOR SELECT
  USING (
    id IN (
      SELECT cohort_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );
```

**This creates a circular dependency!**
- Policy on cohorts queries user_profiles
- If user_profiles also has RLS, we're back to the recursion problem

**SOLUTION:**
The user_profiles query in the cohorts policy will work because:
1. The subquery runs as the same authenticated user
2. The user_profiles policy allows users to see their own profile
3. No infinite loop because we're querying a different table

But to be extra safe, we could use a SECURITY DEFINER function:
```sql
-- Safe helper function
CREATE OR REPLACE FUNCTION get_user_cohort_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT cohort_id FROM user_profiles WHERE user_id = auth.uid();
$$;

-- Then policy becomes:
CREATE POLICY "Users can view own cohort"
  ON cohorts FOR SELECT
  USING (id = get_user_cohort_id());
```

This avoids any potential recursion issues.

---

## Testing Checklist

### Phase 1: JWT Setup (No Risk)
- [ ] Add JWT sync trigger
- [ ] Backfill existing users
- [ ] Verify role in JWT token

### Phase 2: Test Policies (One Table at a Time)

**For each table, test:**

#### Regular User Tests
- [ ] Can view own profile
- [ ] Can update own profile
- [ ] Can view own cohort
- [ ] Can view challenges
- [ ] Can submit reflections
- [ ] Can mark completions
- [ ] Cannot see other users' data
- [ ] Cannot see admin-only data

#### Admin Tests
- [ ] Can view all profiles
- [ ] Can update any profile
- [ ] Can view all cohorts
- [ ] Can manage challenges
- [ ] Admin dashboards work (RPCs)
- [ ] Leaderboards work
- [ ] User management works

#### Unauthenticated Tests
- [ ] Cannot view profiles
- [ ] Cannot view cohorts
- [ ] Can view active challenges (if policy allows)
- [ ] Cannot submit anything

---

## Summary: Frontend Compatibility

### Will Current Frontend Break? NO ✅

**Reason:**
1. SECURITY DEFINER functions/views bypass RLS (intentional)
2. Admin features use these functions (continue working)
3. User queries just need proper policies (not breaking changes)
4. JWT approach avoids circular dependencies

### What Needs to Change? MINIMAL

**Backend Changes:**
1. Add JWT sync trigger (1 migration)
2. Add RLS policies (1 migration per table group)
3. Test incrementally

**Frontend Changes:**
- ❌ **ZERO CODE CHANGES REQUIRED**
- No component updates
- No query rewrites
- No authentication changes

### Why This Works

**The architecture is already designed for RLS:**
- Admin access via SECURITY DEFINER (bypasses RLS)
- User access via direct queries (will be protected by RLS)
- Clear separation of concerns
- JWT approach fits perfectly

---

## Recommendation

✅ **Proceed with JWT-based RLS implementation**

The current frontend architecture is **perfectly compatible** with RLS. The SECURITY DEFINER functions and views are the correct way to provide admin access while protecting user data with RLS.

**Confidence Level:** HIGH
- No frontend changes needed
- Admin features continue working
- User features protected
- Standard Supabase pattern

**Next Step:** Implement Phase 1 (JWT sync) safely and test.
