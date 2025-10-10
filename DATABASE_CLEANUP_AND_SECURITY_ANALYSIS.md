# Database Cleanup & Security Analysis

**Date:** 2025-10-08
**Status:** Analysis Only - No Changes Made

---

## Executive Summary

### Good News ✅
- **No orphaned data** - All user progress records reference valid challenges
- **No duplicate challenges** - Fixed in previous migration
- **All tables properly linked** - Foreign key integrity intact

### Security Concerns ⚠️
- **20 tables with RLS disabled** - All data publicly accessible via API
- **Policies exist but disabled** - 11 tables have policies ready but RLS is OFF
- **Application-level security only** - Frontend role checks can be bypassed
- **2 views exposing auth.users** - Potential user data leak

---

## Part 1: Database Cleanup Opportunities

### ✅ No Major Chaff Found

**Orphaned Records Check:**
```sql
-- user_challenge_completions: 0 orphaned records
-- user_reflections: 0 orphaned records
-- user_day_completions: 0 orphaned records
```

**Conclusion:** Data migration was successful. No cleanup needed.

### Minor Cleanup Opportunities

#### 1. Unused Admin Tables
```
admin_cohort_assignments - 0 rows (feature not being used)
user_activity_tracking - 0 rows (feature not being used)
```

**Recommendation:** Keep tables (they're empty, not harmful). May be used in future.

#### 2. Empty Email Automation Tables
```
email_auto_logs - 0 rows
email_auto_queue - 0 rows
email_auto_settings - 0 rows
email_auto_templates - 0 rows
email_auto_user_preferences - 0 rows
user_activity_tracking - 0 rows
```

**Status:** These are active features, just not populated yet.
**Action:** No cleanup needed.

#### 3. Security Definer Views (Intentional)
- 12 views marked as ERROR by security advisor
- These are **intentional** for admin access
- Allow admins to query data without individual user RLS checks

**Examples:**
- `user_profiles_with_cohort` - Used by useUserProfile hook
- `cohort_analytics` - Used by admin dashboard
- `safe_admin_cohort_access` - Used for admin permissions

**Action:** Keep these, they're working as designed.

---

## Part 2: Current Security Posture

### How Security Works Now (Application Layer)

**Authentication Flow:**
1. User logs in → Supabase Auth creates session
2. Frontend queries `user_profiles` table → gets role ('user', 'admin', 'super_admin')
3. Frontend shows/hides features based on role
4. Backend uses SECURITY DEFINER views to access data

**Example from useUserProfile.js:**
```javascript
const isAdmin = () => profile?.role === 'admin' || profile?.role === 'super_admin'
const isSuperAdmin = () => profile?.role === 'super_admin'
```

**Example from SuperAdminRoute.jsx:**
```javascript
const { data } = await supabase
  .from('user_profiles')
  .select('role')
  .eq('user_id', user.id)
  .maybeSingle()

if (data?.role === 'super_admin') {
  // Allow access
}
```

### The Problem: No Database-Level Security

**Current State:**
- RLS is **DISABLED** on all critical tables
- Anyone with an API key can query ANY data
- Frontend role checks can be bypassed with direct API calls

**Example Attack:**
```bash
# Any user can query all user profiles
curl "https://[project].supabase.co/rest/v1/user_profiles?select=*" \
  -H "apikey: [anon_key]"

# Returns: ALL 248 user profiles with emails, roles, etc.
```

---

## Part 3: Security Advisor Findings

### ERROR Level Issues (23 total)

#### 1. Auth Users Exposed (2 issues)
```
- user_activity_summary view exposes auth.users
- user_details view exposes auth.users
```

**Risk:** User email addresses and auth metadata leaked
**Fix:** Rewrite views to not expose auth.users, or add RLS to views

#### 2. RLS Disabled But Policies Exist (11 issues)

Tables with policies ready but RLS turned OFF:
```
✓ challenge_sets - Has policies, RLS disabled
✓ cohorts - Has policies, RLS disabled
✓ user_profiles - Has policies, RLS disabled (CRITICAL)
✓ pre_survey_responses - Has policies, RLS disabled
✓ post_survey_responses - Has policies, RLS disabled
✓ user_challenge_completions - Has policies, RLS disabled
✓ user_day_completions - Has policies, RLS disabled
✓ user_reflections - Has policies, RLS disabled
✓ videos - Has policies, RLS disabled
✓ challenges - Has policies, RLS disabled
✓ (and 9 more email/content tables)
```

**Why They're Disabled:** Emergency rollback after infinite recursion issue

#### 3. Security Definer Views (12 issues)

**Status:** FALSE POSITIVE - These are intentional
**Purpose:** Allow admin queries to bypass RLS
**Action:** No fix needed

#### 4. RLS Completely Disabled (20 issues)

All public tables have no RLS protection:
```
- user_profiles (248 rows - CRITICAL)
- challenges (43 rows)
- cohorts (24 rows)
- user_reflections (1,318 rows)
- user_challenge_completions (3,189 rows)
- (15 more tables...)
```

### WARN Level Issues (63 total)

- 59 functions with mutable search_path (low priority)
- pg_net extension in public schema (cosmetic)
- Auth leaked password protection disabled
- Insufficient MFA options
- Postgres version needs update

---

## Part 4: The Circular Dependency Problem

### Why We Can't Just Enable RLS

**The Infinite Recursion Issue:**

```sql
-- Policy tries to check if user is admin
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles  -- ← Queries same table
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

**What happens:**
1. User queries user_profiles
2. RLS policy runs → queries user_profiles to check if admin
3. That query triggers RLS policy → queries user_profiles again
4. Infinite loop → 500 error

**Even SECURITY DEFINER functions don't help:**
```sql
CREATE FUNCTION is_admin() SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles  -- ← Still triggers RLS
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;
```

---

## Part 5: Proper Security Solution

### The JWT Claims Approach ✅

**Core Concept:** Store role in JWT token, not query database for it

#### Step 1: Add Role to JWT Claims

**Update user metadata when role changes:**
```sql
-- Function to sync role to JWT claims
CREATE OR REPLACE FUNCTION sync_user_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users app_metadata with new role
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep JWT in sync
CREATE TRIGGER sync_role_to_jwt
  AFTER INSERT OR UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_jwt();
```

#### Step 2: RLS Policies Using JWT

**No more circular dependencies:**
```sql
-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view/edit own profile
CREATE POLICY "Users can access own profile"
  ON user_profiles
  FOR ALL
  USING (auth.uid() = user_id);

-- Admins can view all profiles (checking JWT, not querying table!)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- Super admins can edit all profiles
CREATE POLICY "Super admins can edit all profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
```

**Why this works:**
- `auth.jwt()` reads from token (no database query)
- No circular dependency
- Fast (no table lookup)
- Secure (JWT can't be forged)

#### Step 3: Content Tables RLS

**Challenges table:**
```sql
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can view active challenges
CREATE POLICY "Anyone can view challenges"
  ON challenges FOR SELECT
  USING (is_active = true);

-- Admins can manage challenges
CREATE POLICY "Admins can manage challenges"
  ON challenges FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );
```

**User progress tables:**
```sql
ALTER TABLE user_challenge_completions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own completions
CREATE POLICY "Users manage own completions"
  ON user_challenge_completions
  FOR ALL
  USING (auth.uid() = user_id);

-- Admins can view all completions
CREATE POLICY "Admins view all completions"
  ON user_challenge_completions
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );
```

#### Step 4: Email Tables (Admin Only)

```sql
ALTER TABLE simple_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_email_queue ENABLE ROW LEVEL SECURITY;

-- Only admins and service role can access
CREATE POLICY "Admin only access"
  ON simple_email_logs
  FOR ALL
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );
```

---

## Part 6: Implementation Roadmap

### Phase 1: Preparation (No Risk)

1. **Add JWT sync trigger** (1 migration)
   - Create sync_user_role_to_jwt function
   - Add trigger to user_profiles
   - Backfill existing users' JWT claims

2. **Test JWT claims** (verify in frontend)
   ```javascript
   const { data: { session } } = await supabase.auth.getSession()
   console.log(session.user.app_metadata.role) // Should show role
   ```

3. **Create test branch in Supabase** (if available)
   - Test RLS policies on branch database
   - No risk to production

### Phase 2: Enable RLS Incrementally (Test Each)

**Order of operations:**

1. **Start with read-only tables** (lowest risk)
   ```
   ✓ challenge_sets (read-only for users)
   ✓ challenges (read-only for users)
   ✓ videos (read-only for users)
   ```

2. **Then user-scoped tables** (medium risk)
   ```
   ✓ user_challenge_completions
   ✓ user_reflections
   ✓ user_day_completions
   ✓ pre_survey_responses
   ✓ post_survey_responses
   ```

3. **Then critical tables** (highest risk, test thoroughly)
   ```
   ✓ user_profiles
   ✓ cohorts
   ```

4. **Finally admin tables** (admin-only access)
   ```
   ✓ simple_email_logs
   ✓ simple_email_queue
   ✓ email_auto_* tables
   ```

**For each table:**
```sql
-- 1. Enable RLS
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

-- 2. Add policies using JWT claims (no circular dependency)
CREATE POLICY "policy_name" ON [table_name]
  USING (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin');

-- 3. Test with:
--    - Regular user (should see own data only)
--    - Admin user (should see all data)
--    - Unauthenticated (should see nothing or public data only)

-- 4. If tests pass, move to next table
-- 5. If tests fail, DISABLE RLS and debug
```

### Phase 3: Fix Auth Views (Low Priority)

```sql
-- Option 1: Add RLS to views
CREATE POLICY "Users view own data" ON user_details
  USING (auth.uid() = user_id);

-- Option 2: Don't expose auth.users directly
-- Rewrite views to select from user_profiles only
```

### Phase 4: Hardening (Optional)

1. Enable leaked password protection (Auth settings)
2. Enable additional MFA options (Auth settings)
3. Update Postgres version (Platform settings)
4. Fix function search_path (add `SET search_path = public` to functions)

---

## Part 7: Rollback Plan

**Before enabling ANY RLS:**

1. **Document current state**
   ```sql
   -- Save current policy state
   SELECT tablename, policyname, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

2. **Create emergency disable script**
   ```sql
   -- disable_all_rls.sql
   ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE challenges DISABLE ROW LEVEL SECURITY;
   -- (all tables)
   ```

3. **Test rollback** before applying to production

**If something breaks:**
```bash
# Immediate rollback
psql [connection] -f disable_all_rls.sql

# Verify
psql [connection] -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

---

## Part 8: Risk Assessment

### Low Risk Changes ✅
- Adding JWT sync trigger (doesn't affect queries)
- Enabling RLS on read-only tables (challenges, videos)
- Enabling RLS on empty tables (email_auto_* tables with 0 rows)

### Medium Risk Changes ⚠️
- Enabling RLS on user progress tables
- Enabling RLS on survey tables

### High Risk Changes 🔴
- Enabling RLS on user_profiles (critical for auth)
- Enabling RLS on cohorts (affects challenge loading)

**Mitigation:**
- Test on branch database first
- Enable during low-traffic period
- Have rollback script ready
- Test with different user roles before declaring success

---

## Summary: What to Do

### Immediate (Database Cleanup)
✅ **Nothing** - No chaff found, data is clean

### Short Term (Security Foundation)
1. Add JWT role sync trigger
2. Backfill JWT claims for existing users
3. Test that role appears in JWT

### Medium Term (Enable RLS)
1. Enable RLS on challenge_sets, challenges, videos (read-only)
2. Test thoroughly
3. Enable RLS on user progress tables
4. Test thoroughly
5. Enable RLS on user_profiles (use JWT claims approach)
6. Test thoroughly

### Long Term (Security Hardening)
1. Fix auth.users exposure in views
2. Enable leaked password protection
3. Enable additional MFA
4. Update Postgres version
5. Fix function search_path warnings

---

## Key Takeaways

### Why Previous RLS Failed ❌
- Policies queried the same table they were protecting
- Circular dependency → infinite recursion
- Even SECURITY DEFINER didn't help

### Why JWT Approach Works ✅
- Role stored in token (no query needed)
- `auth.jwt()` reads from memory (fast)
- No circular dependency possible
- Standard pattern for Supabase

### Current Security Risk
- **ALL tables publicly accessible** via API
- Frontend role checks can be bypassed
- Email automation data exposed
- User data (names, orgs, roles) exposed

### Recommended Action
**Implement JWT-based RLS** following the roadmap above. Start with low-risk tables, test incrementally, have rollback ready.

---

**Next Steps:** Review this analysis with stakeholders, then proceed with Phase 1 (JWT sync) when ready.
