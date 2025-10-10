# AdminCustomisation.jsx & bulkUploader.js Refactor Plan

## Overview
Transform admin tools from **per-cohort customization** to **challenge set management**.

---

## Part 1: AdminCustomisation.jsx Refactoring

### Current State (1,048 lines)
- **Purpose:** Customize challenges for specific cohorts
- **Table:** `customized_challenges` with `cohort_id`
- **Key State:**
  - `selectedCohort` (cohort_id)
  - Loads from `customized_challenges` WHERE `cohort_id` = selected
  - Saves with `cohort_id`

### New State
- **Purpose:** Manage challenge sets (Standard, Sales, Executive)
- **Table:** `challenges` with `challenge_set_id`
- **Key State:**
  - `selectedChallengeSet` (challenge_set_id)
  - Loads from `challenges` WHERE `challenge_set_id` = selected
  - Saves with `challenge_set_id`

### Detailed Changes:

#### 1. State Variables (Lines 309-336)
```javascript
// BEFORE:
const [selectedCohort, setSelectedCohort] = useState('') // cohort_id
const [cohortItems, setCohortItems] = useState([])
const [customisedByCohort, setCustomisedByCohort] = useState({})

// AFTER:
const [selectedChallengeSet, setSelectedChallengeSet] = useState('') // challenge_set_id
const [challengeSetItems, setChallengeSetItems] = useState([])
const [challengesBySet, setChallengesBySet] = useState({})
```

#### 2. Load Challenge Sets (Lines 337-343)
```javascript
// BEFORE:
useEffect(() => {
  const load = async () => {
    const { data } = await supabase.from('cohorts').select('id, name').order('name')
    setCohortItems(data || [])
  }
  load()
}, [])

// AFTER:
useEffect(() => {
  const load = async () => {
    const { data } = await supabase.from('challenge_sets').select('id, name').order('name')
    setChallengeSetItems(data || [])
  }
  load()
}, [])
```

#### 3. Fetch Challenges for Set (Lines 351-394)
```javascript
// BEFORE: Loads from customized_challenges with cohort_id
useEffect(() => {
  if (!selectedCohort) return
  const { data } = await supabase
    .from('customized_challenges')
    .select('*')
    .eq('cohort_id', selectedCohort)
    .order('order_index')
  // ... populate rows
}, [selectedCohort])

// AFTER: Loads from challenges with challenge_set_id
useEffect(() => {
  if (!selectedChallengeSet) return
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .eq('challenge_set_id', selectedChallengeSet)
    .order('order_index')
  // ... populate rows
}, [selectedChallengeSet])
```

#### 4. Clear Row Function (Lines 400-415)
```javascript
// BEFORE:
const { error } = await supabase
  .from('customized_challenges')
  .delete()
  .eq('cohort_id', selectedCohort)
  .eq('order_index', day)

// AFTER:
const { error } = await supabase
  .from('challenges')
  .delete()
  .eq('challenge_set_id', selectedChallengeSet)
  .eq('order_index', day)
```

#### 5. Save All Function (Lines 443-527)
```javascript
// BEFORE:
if (!selectedCohort) {
  setMessage('Please select a cohort before saving.')
  return
}
records.push({
  cohort_id: selectedCohort,
  order_index: r.day,
  // ... rest of fields
})
const { error } = await supabase
  .from('customized_challenges')
  .upsert(records, { onConflict: 'cohort_id,order_index' })

// AFTER:
if (!selectedChallengeSet) {
  setMessage('Please select a challenge set before saving.')
  return
}
records.push({
  challenge_set_id: selectedChallengeSet,
  order_index: r.day,
  // ... rest of fields
})
const { error } = await supabase
  .from('challenges')
  .upsert(records, { onConflict: 'challenge_set_id,order_index' })
```

#### 6. UI Updates
```javascript
// Change dropdown label
"Select a cohort" → "Select a challenge set"

// Change dropdown data source
cohortItems.map() → challengeSetItems.map()

// Update validation message
"Please select a cohort" → "Please select a challenge set"

// Update tab labels (if needed)
"Customised" → "Challenge Sets"
```

#### 7. Remove AddCohortModal Integration
- Keep CohortManagement component on separate tab
- Remove cohort creation from Upload tab
- Cohorts are managed separately and just select a challenge set

---

## Part 2: bulkUploader.js Refactoring

### Current State
- **Purpose:** Bulk upload challenges for specific cohort
- **Validates:** Cohort exists via `cohortName`
- **Table:** `customized_challenges` with `cohort_id`

### New State
- **Purpose:** Bulk upload challenges to specific challenge set
- **Validates:** Challenge set exists via `challengeSetName`
- **Table:** `challenges` with `challenge_set_id`

### Detailed Changes:

#### 1. Function Signature (Line 11)
```javascript
// BEFORE:
export const bulkUploadChallenges = async (csvData, images, onProgress)

// AFTER:
export const bulkUploadChallenges = async (csvData, images, challengeSetId, onProgress)
// Add challengeSetId as explicit parameter
```

#### 2. Remove Cohort Validation (Lines 22-43)
```javascript
// REMOVE:
const cohortMap = await getCohortMappings()
const cohortId = await validateAndGetCohortId(challengeData.cohort_name, cohortMap)
if (!cohortId) {
  throw new Error(`Cohort "${challengeData.cohort_name}" not found`)
}

// REPLACE WITH:
// Validate challenge set ID is provided
if (!challengeSetId) {
  throw new Error('Challenge set ID is required')
}
```

#### 3. Update Challenge Record (Lines 77-93)
```javascript
// BEFORE:
const challengeRecord = {
  cohort_id: cohortId,
  order_index: challengeData.day_number,
  // ...
}

// AFTER:
const challengeRecord = {
  challenge_set_id: challengeSetId,
  order_index: challengeData.day_number,
  // ...
}
```

#### 4. Check Existing Challenge (Lines 74-75, 231-250)
```javascript
// BEFORE:
const existingChallenge = await checkExistingChallenge(cohortId, challengeData.day_number)

const checkExistingChallenge = async (cohortId, dayNumber) => {
  const { data } = await supabase
    .from('customized_challenges')
    .select('id, title, challenge_1')
    .eq('cohort_id', cohortId)
    .eq('order_index', dayNumber)
    .single()
  return data
}

// AFTER:
const existingChallenge = await checkExistingChallenge(challengeSetId, challengeData.day_number)

const checkExistingChallenge = async (challengeSetId, dayNumber) => {
  const { data } = await supabase
    .from('challenges')
    .select('id, title, challenge_1')
    .eq('challenge_set_id', challengeSetId)
    .eq('order_index', dayNumber)
    .single()
  return data
}
```

#### 5. Insert/Update Operations (Lines 96-111)
```javascript
// BEFORE:
dbResult = await supabase
  .from('customized_challenges')
  .update(challengeRecord)
  .eq('cohort_id', cohortId)
  .eq('order_index', challengeData.day_number)

dbResult = await supabase
  .from('customized_challenges')
  .insert(challengeRecord)

// AFTER:
dbResult = await supabase
  .from('challenges')
  .update(challengeRecord)
  .eq('challenge_set_id', challengeSetId)
  .eq('order_index', challengeData.day_number)

dbResult = await supabase
  .from('challenges')
  .insert(challengeRecord)
```

#### 6. Remove Cohort Mapping Functions (Lines 178-223)
```javascript
// REMOVE ENTIRELY:
const getCohortMappings = async () => { ... }
const validateAndGetCohortId = async (cohortName, cohortMap) => { ... }

// OPTIONALLY ADD (if needed for validation):
const getChallengeSetMappings = async () => {
  const { data } = await supabase
    .from('challenge_sets')
    .select('id, name')
  const setMap = new Map()
  data?.forEach(set => setMap.set(set.name, set.id))
  return setMap
}
```

#### 7. Update Rollback Function (Lines 288-299)
```javascript
// BEFORE:
const { error } = await supabase
  .from('customized_challenges')
  .delete()
  .eq('id', result.databaseId)

// AFTER:
const { error } = await supabase
  .from('challenges')
  .delete()
  .eq('id', result.databaseId)
```

#### 8. CSV Format Changes
```javascript
// OLD CSV HEADERS:
cohort_name, day_number, challenge_title, challenge_description, video_url, image_file_name

// NEW CSV HEADERS:
day_number, challenge_title, challenge_description, video_url, image_file_name
// (challenge_set selected in UI, not in CSV)
```

---

## Part 3: AdminCustomisation.jsx Bulk Upload Integration

### Update Bulk Upload Handler (Lines 534-634)
```javascript
// BEFORE:
const handleBulkUpload = async () => {
  // ... parse CSV and ZIP
  const result = await bulkUploadChallenges(
    parsedChallenges,
    extractedImages,
    (progress) => setBulkProgress(prev => [...prev, progress])
  )
}

// AFTER:
const handleBulkUpload = async () => {
  if (!selectedChallengeSet) {
    setMessage('Please select a challenge set before bulk upload')
    return
  }

  // ... parse CSV and ZIP
  const result = await bulkUploadChallenges(
    parsedChallenges,
    extractedImages,
    selectedChallengeSet, // <-- Pass challenge set ID
    (progress) => setBulkProgress(prev => [...prev, progress])
  )
}
```

---

## Part 4: Update Cohort Management

### Keep Cohort Management Separate
- CohortManagement component stays as-is
- When creating/editing cohort, admin selects `challenge_set_id`
- This was already updated in previous migrations

### Update MinimalAddCohort (Lines 234-304)
```javascript
// ADD: Challenge set selector in cohort creation form
const [challengeSets, setChallengeSets] = useState([])

useEffect(() => {
  const loadSets = async () => {
    const { data } = await supabase.from('challenge_sets').select('id, name')
    setChallengeSets(data || [])
  }
  loadSets()
}, [])

// In form:
<div>
  <label>Challenge Set *</label>
  <select required value={form.challenge_set_id} onChange={(e) => set('challenge_set_id', e.target.value)}>
    <option value="">Select challenge set...</option>
    {challengeSets.map(s => (
      <option key={s.id} value={s.id}>{s.name}</option>
    ))}
  </select>
</div>

// In submit:
const payload = {
  // ... existing fields
  challenge_set_id: form.challenge_set_id
}
```

---

## Implementation Order

1. **First:** Refactor bulkUploader.js (smaller, clearer scope)
2. **Second:** Refactor AdminCustomisation.jsx
3. **Third:** Test with Standard set
4. **Fourth:** Test creating new challenge set and uploading to it

---

## Testing Checklist

- [ ] Can select challenge set from dropdown
- [ ] Loads existing challenges for selected set
- [ ] Can edit challenges in set
- [ ] Can save changes to set
- [ ] Can delete challenges from set
- [ ] Bulk upload works with selected set
- [ ] CSV parsing works without cohort_name column
- [ ] Images upload correctly
- [ ] No references to customized_challenges table
- [ ] Creating cohort requires challenge set selection
- [ ] Users see correct challenges based on their cohort's set

---

## Risks & Mitigations

**Risk:** Breaking existing admin workflows
**Mitigation:** Keep old component as backup, test thoroughly on dev

**Risk:** Data loss during refactor
**Mitigation:** All data already migrated, new component just reads from `challenges`

**Risk:** Confusion about sets vs cohorts
**Mitigation:** Clear UI labels and admin documentation

---

## Post-Refactor Cleanup

After both components are refactored and tested:
1. Remove all imports of `customized_challenges` table
2. Drop `customized_challenges` table (already done in migration)
3. Update admin documentation
4. Update CSV template to remove cohort_name column
