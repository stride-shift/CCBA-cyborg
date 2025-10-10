# DayPage.jsx Refactor Plan

## Summary
Simplifying from 736 lines with extensive dual-table routing to streamlined single-path logic.

## Changes by Function

### 1. fetchChallengeData() - Lines 54-171
**Before**: 118 lines checking customized_challenges first, then falling back
**After**: ~40 lines - single query path

```javascript
const fetchChallengeData = async () => {
  try {
    let userChallengeSetId = null

    // Get user's cohort → challenge_set_id
    if (user) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('cohort_id')
        .eq('user_id', user.id)
        .single()

      if (userProfile?.cohort_id) {
        const { data: cohort } = await supabase
          .from('cohorts')
          .select('challenge_set_id')
          .eq('id', userProfile.cohort_id)
          .single()

        userChallengeSetId = cohort?.challenge_set_id
      }
    }

    // Single query to challenges table
    let query = supabase
      .from('challenges')
      .select('*')
      .eq('order_index', parseInt(dayNumber))
      .eq('is_active', true)

    if (userChallengeSetId) {
      query = query.eq('challenge_set_id', userChallengeSetId)
    } else {
      // Fallback to Standard set
      const { data: standardSet } = await supabase
        .from('challenge_sets')
        .select('id')
        .eq('name', 'Standard')
        .single()
      query = query.eq('challenge_set_id', standardSet.id)
    }

    const { data, error } = await query.single()

    if (!error && data) {
      const videos = await fetchVideosForChallenge(data)
      setChallengeData({...data, videos})
    } else {
      setChallengeData(generateMockChallengeData())
    }
  } catch (error) {
    console.error('Error fetching challenge:', error)
    setChallengeData(generateMockChallengeData())
  }
  setLoading(false)
}
```

### 2. fetchUserProgress() - Lines 222-274
**Before**: Routes to either user_customized_challenge_completions or user_challenge_completions
**After**: Always use user_challenge_completions

```javascript
const fetchUserProgress = async () => {
  if (!user || !challengeData) {
    // localStorage fallback logic stays the same
    return
  }

  try {
    const { data, error } = await supabase
      .from('user_challenge_completions')  // Single table
      .select('challenge_number')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeData.id)

    if (!error) {
      setCompletedChallenges(new Set(data.map(item => item.challenge_number)))
    }
  } catch (error) {
    console.error('Error fetching progress:', error)
  }
}
```

### 3. handleChallengeComplete() - Lines 292-391
**Before**: Lines 337-340 route to different tables
**After**: Always use user_challenge_completions

Remove lines 337-342:
```javascript
// DELETE THIS:
const tableName = challengeData.is_cohort_specific
  ? 'user_customized_challenge_completions'
  : 'user_challenge_completions'

// REPLACE WITH:
const tableName = 'user_challenge_completions'
```

### 4. updateDayCompletion() - Lines 393-473
**Before**: Routes to 3 different pairs of tables
**After**: Single table path

Remove all routing logic (lines 398-400, 426-430, 453-456):
```javascript
const updateDayCompletion = async (userId, completedChallenges) => {
  const bothChallengesCompleted = completedChallenges.has(1) && completedChallenges.has(2)

  try {
    // Check if reflection exists (single table)
    const { data: reflectionData } = await supabase
      .from('user_reflections')  // No routing
      .select('id')
      .eq('user_id', userId)
      .eq('challenge_id', challengeData.id)
      .single()

    const reflectionSubmitted = !!reflectionData
    const hasAnyProgress = completedChallenges.size > 0 || reflectionSubmitted

    if (hasAnyProgress) {
      await supabase
        .from('user_day_completions')  // No routing
        .upsert({
          user_id: userId,
          challenge_id: challengeData.id,
          both_challenges_completed: bothChallengesCompleted,
          reflection_submitted: reflectionSubmitted
        }, { onConflict: 'user_id,challenge_id' })
    } else {
      await supabase
        .from('user_day_completions')  // No routing
        .delete()
        .eq('user_id', userId)
        .eq('challenge_id', challengeData.id)
    }
  } catch (error) {
    console.error('Error updating day completion:', error)
  }
}
```

### 5. ReflectionSection Component - Line 694
**Before**: Passes isCustomizedChallenge prop
**After**: Remove the prop

```javascript
// DELETE THIS LINE:
isCustomizedChallenge={challengeData?.is_cohort_specific}

// Component becomes:
<ReflectionSection
  dayNumber={dayNumber}
  question={challengeData?.reflection_question}
  challengeId={challengeData?.id}
/>
```

## Lines Saved
- fetchChallengeData: 118 → ~40 lines (-78)
- Table routing logic: ~80 lines removed
- Console.logs for routing: ~20 lines removed
- **Total reduction: ~180 lines** (736 → ~560 lines)

## Benefits
1. Single code path - easier to debug
2. No `is_cohort_specific` flag needed
3. Faster queries (no fallback logic)
4. Clearer data flow
