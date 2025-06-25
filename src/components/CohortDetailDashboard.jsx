import { useState, useEffect } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

function CohortDetailDashboard() {
  const { profile, isSuperAdmin, isAdmin } = useUserProfile()
  const [cohorts, setCohorts] = useState([])
  const [selectedCohort, setSelectedCohort] = useState(null)
  const [cohortUsers, setCohortUsers] = useState([])
  const [userProgress, setUserProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profile && (isAdmin() || isSuperAdmin())) {
      fetchCohorts()
    }
  }, [profile, isAdmin, isSuperAdmin])

  useEffect(() => {
    if (selectedCohort) {
      fetchCohortDetails()
    }
  }, [selectedCohort])

  const fetchCohorts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch cohorts that the admin has access to
      const { data, error } = await supabase
        .from('cohort_analytics')
        .select('id, name, organization_name, current_participants')
        .order('name')

      if (error) throw error

      setCohorts(data || [])
    } catch (err) {
      console.error('Error fetching cohorts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCohortDetails = async () => {
    try {
      setLoading(true)
      
      // Fetch users in the selected cohort with email from auth.users
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          role,
          created_at,
          cohort_id,
          auth_users:user_id (email)
        `)
        .eq('cohort_id', selectedCohort.id)
        .order('first_name')

      if (usersError) throw usersError

      // Transform the data to flatten the email
      const transformedUsers = users?.map(user => ({
        ...user,
        email: user.auth_users?.email || 'No email'
      })) || []

      setCohortUsers(transformedUsers)

      // Fetch detailed progress for each user
      if (transformedUsers && transformedUsers.length > 0) {
        const userIds = transformedUsers.map(u => u.user_id)
        
        const { data: progress, error: progressError } = await supabase
          .rpc('get_cohort_user_progress', { 
            cohort_user_ids: userIds 
          })

        if (progressError) {
          console.warn('Enhanced RPC failed, fetching manually:', progressError)
          await fetchProgressManually(userIds)
        } else {
          // Check if the RPC returned survey data (enhanced version)
          const hasSurveyData = progress && progress.length > 0 && 
            progress[0].hasOwnProperty('pre_survey_completed')
          
          if (hasSurveyData) {
            console.log('Using enhanced RPC data with survey information')
            setUserProgress(progress || [])
          } else {
            console.log('RPC missing survey data, fetching manually')
            await fetchProgressManually(userIds)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching cohort details:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchProgressManually = async (userIds) => {
    try {
      // Fetch analytics for each user
      const { data: analytics, error: analyticsError } = await supabase
        .from('user_journey_analytics')
        .select('*')
        .in('user_id', userIds)

      if (analyticsError) throw analyticsError

      // Fetch recent challenge completions
      const { data: challenges, error: challengesError } = await supabase
        .from('user_challenge_completions')
        .select(`
          user_id,
          challenge_id,
          challenge_number,
          completed_at,
          challenges!inner(order_index, title)
        `)
        .in('user_id', userIds)
        .order('completed_at', { ascending: false })

      if (challengesError) throw challengesError

      // Fetch recent reflections
      const { data: reflections, error: reflectionsError } = await supabase
        .from('user_reflections')
        .select(`
          user_id,
          challenge_id,
          submitted_at,
          word_count,
          challenges!inner(order_index, title)
        `)
        .in('user_id', userIds)
        .order('submitted_at', { ascending: false })

      if (reflectionsError) throw reflectionsError

      // Fetch survey completions
      const { data: preSurveys, error: preSurveyError } = await supabase
        .from('pre_survey_responses')
        .select('user_id, completed_at')
        .in('user_id', userIds)

      if (preSurveyError) throw preSurveyError

      const { data: postSurveys, error: postSurveyError } = await supabase
        .from('post_survey_responses')
        .select('user_id, completed_at')
        .in('user_id', userIds)

      if (postSurveyError) throw postSurveyError

      // Combine the data
      const progressData = userIds.map(userId => {
        const userAnalytics = analytics?.find(a => a.user_id === userId) || {}
        const userChallenges = challenges?.filter(c => c.user_id === userId) || []
        const userReflections = reflections?.filter(r => r.user_id === userId) || []
        const userPreSurvey = preSurveys?.find(s => s.user_id === userId)
        const userPostSurvey = postSurveys?.find(s => s.user_id === userId)

        return {
          user_id: userId,
          total_days_completed: userAnalytics.total_days_completed || 0,
          total_challenges_completed: userAnalytics.total_challenges_completed || 0,
          total_reflections_submitted: userAnalytics.total_reflections_submitted || 0,
          journey_completion_percentage: userAnalytics.journey_completion_percentage || 0,
          last_activity_at: userAnalytics.last_activity_at,
          recent_challenges: userChallenges.slice(0, 5),
          recent_reflections: userReflections.slice(0, 5),
          current_streak_days: userAnalytics.current_streak_days || 0,
          pre_survey_completed: !!userPreSurvey,
          pre_survey_completed_at: userPreSurvey?.completed_at,
          post_survey_completed: !!userPostSurvey,
          post_survey_completed_at: userPostSurvey?.completed_at
        }
      })

      setUserProgress(progressData)
    } catch (err) {
      console.error('Error fetching progress manually:', err)
      setUserProgress([])
    }
  }

  const getUserProgress = (userId) => {
    return userProgress.find(p => p.user_id === userId) || {
      total_days_completed: 0,
      total_challenges_completed: 0,
      total_reflections_submitted: 0,
      journey_completion_percentage: 0,
      recent_challenges: [],
      recent_reflections: [],
      current_streak_days: 0,
      pre_survey_completed: false,
      pre_survey_completed_at: null,
      post_survey_completed: false,
      post_survey_completed_at: null
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'text-green-400'
    if (percentage >= 60) return 'text-yellow-400'
    if (percentage >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const fixUserProgress = async (userId) => {
    try {
      // First, run the database function to fix day completions
      const { error: fixError } = await supabase.rpc('fix_user_day_completions')
      if (fixError) {
        console.error('Error fixing day completions:', fixError)
      }

      // Then update analytics for the specific user (now includes surveys)
      const { error: analyticsError } = await supabase.rpc('update_user_analytics', {
        target_user_id: userId
      })
      if (analyticsError) {
        console.error('Error updating analytics:', analyticsError)
      }

      // Refresh the cohort details
      await fetchCohortDetails()
      alert('User progress has been recalculated and fixed! Now includes survey completions (Day 0 & Day 16).')
    } catch (error) {
      console.error('Error fixing user progress:', error)
      alert('Error fixing user progress. Check console for details.')
    }
  }

  if (loading) {
    return (
      <div className="glassmorphism rounded-2xl p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-white/20 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glassmorphism rounded-2xl p-8">
        <div className="text-red-400 text-center">
          <p className="text-xl mb-4">Error Loading Cohort Details</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchCohorts}
            className="mt-4 px-4 py-2 bg-red-500/20 rounded-lg text-white hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Cohort Selector */}
      <div className="glassmorphism rounded-2xl p-6">
        <h2 className="text-3xl font-bold text-white mb-6">Cohort Details</h2>
        
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-white font-medium">Select Cohort:</label>
          <select
            value={selectedCohort?.id || ''}
            onChange={(e) => {
              const cohort = cohorts.find(c => c.id === e.target.value)
              setSelectedCohort(cohort)
            }}
            className="glassmorphism px-4 py-2 rounded-lg text-white bg-white/10 border border-white/20 focus:border-white/40 focus:outline-none"
          >
            <option value="">Choose a cohort...</option>
            {cohorts.map(cohort => (
              <option key={cohort.id} value={cohort.id} className="bg-gray-800">
                {cohort.name} ({cohort.current_participants} participants)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cohort User Details */}
      {selectedCohort && (
        <div className="glassmorphism rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">
              {selectedCohort.name} - User Progress
            </h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!window.confirm(`This will recalculate progress for all ${cohortUsers.length} users in this cohort (now includes surveys). This may take a moment. Continue?`)) {
                    return
                  }
                  
                  // Fix all users in cohort
                  for (const user of cohortUsers) {
                    await fixUserProgress(user.user_id)
                  }
                  
                  alert(`Progress has been recalculated for all ${cohortUsers.length} users! Now includes survey completions (Day 0 & Day 16).`)
                }}
                className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 px-4 py-2 rounded-lg transition-all text-sm"
                title="Fix progress data for all users in this cohort (includes surveys)"
              >
                Fix All Progress
              </button>
              <button
                onClick={fetchCohortDetails}
                className="glassmorphism px-4 py-2 rounded-lg text-white hover:bg-white/20 transition-all"
              >
                Refresh
              </button>
            </div>
          </div>

          {cohortUsers.length === 0 ? (
            <div className="text-center text-white/70 py-8">
              <p className="text-lg">No users found in this cohort</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-white">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 font-semibold">User</th>
                    <th className="text-left py-3 px-4 font-semibold">Progress</th>
                    <th className="text-left py-3 px-4 font-semibold">Days Completed</th>
                    <th className="text-left py-3 px-4 font-semibold">Challenges</th>
                    <th className="text-left py-3 px-4 font-semibold">Reflections</th>
                    <th className="text-left py-3 px-4 font-semibold">Surveys</th>
                    <th className="text-left py-3 px-4 font-semibold">Survey Count</th>
                    <th className="text-left py-3 px-4 font-semibold">Streak</th>
                    <th className="text-left py-3 px-4 font-semibold">Last Activity</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortUsers.map(user => {
                    const progress = getUserProgress(user.user_id)
                    return (
                      <tr key={user.user_id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-white/70">{user.email}</div>
                            <div className="text-xs text-white/50 mt-1">
                              {user.role} • Joined {formatDate(user.created_at)}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-2 bg-white/20 rounded-full">
                              <div 
                                className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                                style={{ width: `${progress.journey_completion_percentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-medium ${getProgressColor(progress.journey_completion_percentage)}`}>
                              {progress.journey_completion_percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-400">
                              {progress.total_days_completed}
                            </div>
                            <div className="text-xs text-white/70">days</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-400">
                              {progress.total_challenges_completed}
                            </div>
                            <div className="text-xs text-white/70">completed</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-purple-400">
                              {progress.total_reflections_submitted}
                            </div>
                            <div className="text-xs text-white/70">shared</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-center">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-xs text-white/70">Day 0:</span>
                                <span className={`text-xs font-medium ${progress.pre_survey_completed ? 'text-green-400' : 'text-red-400'}`}>
                                  {progress.pre_survey_completed ? '✓' : '✗'}
                                </span>
                              </div>
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-xs text-white/70">Day 16:</span>
                                <span className={`text-xs font-medium ${progress.post_survey_completed ? 'text-green-400' : 'text-red-400'}`}>
                                  {progress.post_survey_completed ? '✓' : '✗'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-center">
                            {(() => {
                              const completedSurveys = (progress.pre_survey_completed ? 1 : 0) + (progress.post_survey_completed ? 1 : 0)
                              const color = completedSurveys === 2 ? 'text-green-400' : completedSurveys === 1 ? 'text-yellow-400' : 'text-red-400'
                              return (
                                <>
                                  <div className={`text-lg font-bold ${color}`}>
                                    {completedSurveys}/2
                                  </div>
                                  <div className="text-xs text-white/70">surveys</div>
                                </>
                              )
                            })()}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-400">
                              {progress.current_streak_days}
                            </div>
                            <div className="text-xs text-white/70">days</div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="text-sm text-white/70">
                            {formatDate(progress.last_activity_at)}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => fixUserProgress(user.user_id)}
                            className="text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-1 rounded-lg transition-all"
                            title="Recalculate and fix this user's progress data (includes surveys)"
                          >
                            Fix Progress
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CohortDetailDashboard 