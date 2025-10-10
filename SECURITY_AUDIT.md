# Database Security Audit - Cyborg Habits

**Date:** 2025-10-08
**Audit Type:** RLS Policy & Deprecated Tables Review

---

## 🚨 CRITICAL SECURITY ISSUES

### 1. **user_profiles** - NO RLS PROTECTION ⚠️⚠️⚠️
- **Status:** `rls_enabled: false`
- **Rows:** 248
- **Risk Level:** **CRITICAL**
- **Impact:** All user profile data (names, organizations, roles, cohort assignments) is publicly accessible
- **Action Required:** ENABLE RLS IMMEDIATELY

**Recommended RLS Policy:**
```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

---

## ⚠️ HIGH PRIORITY SECURITY ISSUES

### Email Automation Tables (All Missing RLS)

#### 2. **simple_email_logs** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 285
- **Risk Level:** HIGH
- **Impact:** Email history exposed (who got what emails, delivery status)

#### 3. **simple_email_queue** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 54
- **Risk Level:** HIGH
- **Impact:** Scheduled emails and recipients exposed

#### 4. **email_auto_logs** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 0
- **Risk Level:** MEDIUM
- **Impact:** Email tracking data could be exposed

#### 5. **email_auto_queue** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 0
- **Risk Level:** MEDIUM

#### 6. **email_auto_settings** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 0
- **Risk Level:** MEDIUM

#### 7. **email_auto_templates** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 0
- **Risk Level:** MEDIUM

#### 8. **email_auto_user_preferences** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 0
- **Risk Level:** HIGH
- **Impact:** User email preferences and unsubscribe tokens exposed

#### 9. **email_schedule** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 18
- **Risk Level:** MEDIUM

#### 10. **simple_automation_config** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 2
- **Risk Level:** MEDIUM

#### 11. **user_activity_tracking** - NO RLS
- **Status:** `rls_enabled: false`
- **Rows:** 0
- **Risk Level:** MEDIUM
- **Impact:** User activity patterns could be exposed

**Recommended Actions:**
- Enable RLS on ALL email-related tables
- Restrict access to admins only for email logs/queue/settings
- Allow users to view/update their own preferences

---

## 📦 DEPRECATED TABLES (SAFE TO DROP)

These tables were replaced during the schema refactor and are **no longer used by the application**:

### 1. **customized_challenges**
- **Status:** Deprecated ✅ Data migrated
- **Rows:** 61 (merged into `challenges`)
- **Action:** DROP TABLE after final verification

### 2. **user_customized_challenge_completions**
- **Status:** Deprecated ✅ Data migrated
- **Rows:** 1,536 (merged into `user_challenge_completions`)
- **Action:** DROP TABLE after final verification

### 3. **user_customized_challenge_reflections**
- **Status:** Deprecated ✅ Data migrated
- **Rows:** 582 (merged into `user_reflections`)
- **Action:** DROP TABLE after final verification

### 4. **user_customized_day_completions**
- **Status:** Deprecated ✅ Data migrated
- **Rows:** 774 (merged into `user_day_completions`)
- **Action:** DROP TABLE after final verification

**Total space to reclaim:** ~2,953 rows across 4 deprecated tables

---

## 🔧 SCHEMA CLEANUP NEEDED

### 1. Remove Deprecated Column from `challenges` Table
The `challenges` table still has a `cohort_id` column which is no longer used (replaced by `challenge_set_id`):

```sql
-- Verify no data uses cohort_id
SELECT COUNT(*) FROM challenges WHERE cohort_id IS NOT NULL;

-- If count is 0, drop the column
ALTER TABLE challenges DROP COLUMN cohort_id;
```

---

## 📊 TABLES WITH PROPER RLS (✅ GOOD)

The following tables have RLS enabled and are properly protected:

1. ✅ `admin_action_log` - rls_enabled: true
2. ✅ `admin_cohort_assignments` - rls_enabled: true
3. ✅ `cohorts` - rls_enabled: true
4. ✅ `challenges` - rls_enabled: true
5. ✅ `cohort_automation_config` - rls_enabled: true
6. ✅ `post_survey_responses` - rls_enabled: true
7. ✅ `pre_survey_responses` - rls_enabled: true
8. ✅ `user_journey_analytics` - rls_enabled: true
9. ✅ `videos` - rls_enabled: true
10. ✅ `dlab_challenges` - rls_enabled: true
11. ✅ `user_challenge_completions` - rls_enabled: true
12. ✅ `user_reflections` - rls_enabled: true
13. ✅ `user_day_completions` - rls_enabled: true
14. ✅ `user_video_interactions` - rls_enabled: true
15. ✅ `challenge_sets` - rls_enabled: true
16. ✅ `customized_challenges` - rls_enabled: true (deprecated)
17. ✅ `user_customized_challenge_completions` - rls_enabled: true (deprecated)
18. ✅ `user_customized_challenge_reflections` - rls_enabled: true (deprecated)
19. ✅ `user_customized_day_completions` - rls_enabled: true (deprecated)

---

## 📋 PRIORITY ACTION PLAN

### Immediate (Do Today):
1. ⚠️ **ENABLE RLS on `user_profiles`** - CRITICAL
2. ⚠️ **ENABLE RLS on `simple_email_logs`** - HIGH
3. ⚠️ **ENABLE RLS on `simple_email_queue`** - HIGH
4. ⚠️ **ENABLE RLS on `email_auto_user_preferences`** - HIGH

### High Priority (This Week):
5. Enable RLS on remaining email automation tables
6. Review and update RLS policies for existing protected tables
7. Test all RLS policies with different user roles

### Maintenance (After Testing):
8. Drop deprecated `customized_*` tables (4 tables)
9. Drop `cohort_id` column from `challenges` table
10. Document all RLS policies

---

## 🎯 SUMMARY

- **Critical Issues:** 1 (user_profiles)
- **High Priority Issues:** 10 (email automation tables)
- **Tables to Drop:** 4 (deprecated customized_* tables)
- **Columns to Drop:** 1 (challenges.cohort_id)
- **Tables Properly Protected:** 19

**Overall Security Rating:** ⚠️ NEEDS IMMEDIATE ATTENTION

The most critical issue is `user_profiles` having no RLS protection, potentially exposing all user data including roles and personal information.
