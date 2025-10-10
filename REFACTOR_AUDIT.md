# Database Simplification Audit

## Current State Analysis

### Database Duplication
Currently have **8 tables** split into "regular" and "customized" versions:

| Regular Table | Rows | Customized Table | Rows |
|--------------|------|------------------|------|
| `challenges` | 15 | `customized_challenges` | 61 |
| `user_reflections` | 1,224 | `user_customized_challenge_reflections` | 582 |
| `user_challenge_completions` | 2,876 | `user_customized_challenge_completions` | 1,536 |
| `user_day_completions` | 15 | `user_customized_day_completions` | 774 |

**Total data:** 7,083 rows across duplicate table structures

### Schema Differences
- **challenges vs customized_challenges:**
  - `challenges`: has `cohort_id` (nullable)
  - `customized_challenges`: has `cohort_id` + `video_url_1` + `video_url_2`

- **All user activity tables:** Identical structure, just different foreign keys

### Frontend Impact Analysis

#### Files with Custom/Default Logic (11 files):

1. **src/pages/DayPage.jsx** (HEAVY IMPACT)
   - Lines 74-123: Loads `customized_challenges` first, falls back to `challenges`
   - Lines 237-240: Routes to `user_customized_challenge_completions` or `user_challenge_completions`
   - Lines 337-340: Routes to correct completion table
   - Lines 397-400: Routes to `user_customized_challenge_reflections` or `user_reflections`
   - Lines 426-429, 453-456: Routes to correct `day_completions` table

2. **src/pages/ChallengePage.jsx** (MEDIUM IMPACT)
   - Lines 56-60: Fetches from `user_customized_day_completions`
   - Lines 80-84: Merges customized and regular completion data

3. **src/pages/DlabPage.jsx** (MEDIUM IMPACT)
   - Lines 79-83: Fetches from `user_customized_day_completions`
   - Lines 97-99: Merges both data sources

4. **src/pages/ProductsPage.jsx** (MEDIUM IMPACT)
   - Lines 145-150: Fetches from `user_customized_day_completions`
   - Lines 191-195: Merges completion data

5. **src/components/ReflectionSection.jsx** (MEDIUM IMPACT)
   - Lines 44-47: Routes to correct reflection table
   - Lines 159-163: Routes to correct reflection table for updates

6. **src/pages/AdminCustomisation.jsx** (HEAVY IMPACT)
   - Lines 355-360: Loads from `customized_challenges`
   - Lines 405-408: Deletes from `customized_challenges`
   - Lines 516-520: Upserts to `customized_challenges`
   - Lines 1006-1024: Bulk operations on `customized_challenges`

7. **src/utils/bulkUploader.js** (HEAVY IMPACT)
   - Lines 75-110: All CRUD operations on `customized_challenges`
   - Lines 232-236: Queries `customized_challenges`
   - Lines 295-299: Deletes from `customized_challenges`

8. **src/pages/AboutPage.jsx** (LIGHT - just mentions)
9. **src/components/AuthComponent.jsx** (LIGHT - just mentions)
10. **src/components/BulkUserUpload.jsx** (LIGHT - just mentions)
11. **src/components/SuperAdminManagement.jsx** (LIGHT - just mentions)

## Proposed New Architecture

### New Schema Design

```sql
-- New table to define challenge sets
CREATE TABLE challenge_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,  -- 'Standard', 'Sales', 'Executive'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unified challenges table
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_set_id UUID NOT NULL REFERENCES challenge_sets(id),
  order_index INTEGER NOT NULL,
  title VARCHAR,
  challenge_1 TEXT NOT NULL,
  challenge_1_type TEXT,
  challenge_1_image_url TEXT,
  challenge_2 TEXT NOT NULL,
  challenge_2_type TEXT,
  challenge_2_image_url TEXT,
  reflection_question TEXT NOT NULL,
  intended_aha_moments TEXT[],
  video_url_1 TEXT,
  video_url_2 TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_set_id, order_index)
);

-- Add to cohorts table
ALTER TABLE cohorts
  ADD COLUMN challenge_set_id UUID REFERENCES challenge_sets(id);

-- Unified user activity tables (keep existing, just merge data)
-- user_reflections
-- user_challenge_completions
-- user_day_completions
```

### Tables to REMOVE:
- ❌ `customized_challenges`
- ❌ `user_customized_challenge_reflections`
- ❌ `user_customized_challenge_completions`
- ❌ `user_customized_day_completions`

### Tables to KEEP & ENHANCE:
- ✅ `challenge_sets` (NEW)
- ✅ `challenges` (add `challenge_set_id`, remove `cohort_id`)
- ✅ `cohorts` (add `challenge_set_id`)
- ✅ `user_reflections` (merge customized data)
- ✅ `user_challenge_completions` (merge customized data)
- ✅ `user_day_completions` (merge customized data)

## Migration Strategy

### Data Migration Steps:
1. Create `challenge_sets` table with 3 initial sets
2. Migrate `challenges` data → assign to "Standard" set
3. Migrate `customized_challenges` data → assign to appropriate sets
4. Merge `user_customized_challenge_reflections` → `user_reflections`
5. Merge `user_customized_challenge_completions` → `user_challenge_completions`
6. Merge `user_customized_day_completions` → `user_day_completions`
7. Update `cohorts` to reference appropriate `challenge_set_id`
8. Drop old customized tables

### Frontend Refactoring Steps:

1. **Remove all conditional table routing logic**
   - All queries go to single tables
   - Remove `is_cohort_specific` flag checks

2. **Update DayPage.jsx:**
   - Get user's cohort → challenge_set_id
   - Load challenge from `challenges` WHERE `challenge_set_id` matches
   - All saves go to single tables

3. **Update ChallengePage.jsx:**
   - Single query to `user_day_completions`
   - Join with `challenges` via `challenge_set_id`

4. **Update AdminCustomisation.jsx:**
   - Become "Challenge Set Manager"
   - Admin selects which SET to edit (not per-cohort)
   - CRUD operations on `challenges` table filtered by `challenge_set_id`

5. **Update bulkUploader.js:**
   - Upload creates/updates challenges in specific set
   - No more cohort_id on challenges

6. **Simplify all other components:**
   - Remove dual-table query logic
   - Single code path for all operations

## Benefits of Refactoring

1. **Reduced Complexity:** 8 tables → 5 tables (+ 1 new)
2. **Clearer Data Model:** Sets are explicit, not implied through cohort_id
3. **Easier Maintenance:** Single code path for all operations
4. **Better Scalability:** Adding new sets is trivial
5. **Performance:** Fewer joins, simpler queries
6. **Data Integrity:** No more risk of data split across duplicate tables

## Risk Assessment

**Medium Risk Areas:**
- Data migration must preserve all existing user progress
- RLS policies need updating
- Existing analytics/reporting queries may break

**Mitigation:**
- Test migration on dev first
- Create rollback plan
- Update RLS policies before dropping tables
- Document all breaking changes for analytics team
