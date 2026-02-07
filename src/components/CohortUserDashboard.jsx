import { useState, useEffect } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

function CohortUserDashboard() {
  const { profile, isSuperAdmin, isAdmin } = useUserProfile()
  const [cohorts, setCohorts] = useState([])
  const [selectedCohortId, setSelectedCohortId] = useState('')
  const [cohortUsers, setCohortUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profile && (isAdmin() || isSuperAdmin())) {
      loadCohorts()
    }
  }, [profile, isAdmin, isSuperAdmin])

  useEffect(() => {
    if (selectedCohortId) {
      loadCohortUsers()
    }
  }, [selectedCohortId])

  const loadCohorts = async () => {
    try {
      setLoading(true)
      // Use the new safe function that respects admin assignments
      const { data, error } = await supabase
        .rpc('get_safe_accessible_cohorts')

      if (error) throw error
      
      // Filter to only active cohorts and map to expected format
      const activeCohorts = (data || [])
        .filter(cohort => cohort.is_active)
        .map(cohort => ({
          id: cohort.id,
          name: cohort.name,
          organization_name: cohort.organization_name
        }))
      
      setCohorts(activeCohorts)
    } catch (err) {
      console.error('Error loading cohorts:', err)
      setError('Failed to load cohorts')
    } finally {
      setLoading(false)
    }
  }

  const loadCohortUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get users in the cohort
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, role, created_at')
        .eq('cohort_id', selectedCohortId)
        .order('first_name')

      if (usersError) throw usersError

      if (!users || users.length === 0) {
        setCohortUsers([])
        return
      }

      // Get emails from auth.users
      const userIds = users.map(u => u.user_id)
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .in('id', userIds)

      if (authError) {
        console.warn('Could not fetch emails:', authError)
      }

      // Get challenge completions count for each user
      const { data: challengeStats, error: challengeError } = await supabase
        .from('user_challenge_completions')
        .select('user_id')
        .in('user_id', userIds)

      if (challengeError) {
        console.warn('Could not fetch challenge stats:', challengeError)
      }

      // Get reflection submissions count for each user
      const { data: reflectionStats, error: reflectionError } = await supabase
        .from('user_reflections')
        .select('user_id')
        .in('user_id', userIds)

      if (reflectionError) {
        console.warn('Could not fetch reflection stats:', reflectionError)
      }

      // Get day completions count for each user
      const { data: dayStats, error: dayError } = await supabase
        .from('user_day_completions')
        .select('user_id, both_challenges_completed, reflection_submitted')
        .in('user_id', userIds)

      if (dayError) {
        console.warn('Could not fetch day stats:', dayError)
      }

      // Get survey completions count for each user
      const { data: preSurveyStats, error: preSurveyError } = await supabase
        .from('pre_survey_responses')
        .select('user_id')
        .in('user_id', userIds)

      if (preSurveyError) {
        console.warn('Could not fetch pre-survey stats:', preSurveyError)
      }

      const { data: postSurveyStats, error: postSurveyError } = await supabase
        .from('post_survey_responses')
        .select('user_id')
        .in('user_id', userIds)

      if (postSurveyError) {
        console.warn('Could not fetch post-survey stats:', postSurveyError)
      }

      // Combine all data
      const enrichedUsers = users.map(user => {
        const authUser = authUsers?.find(au => au.id === user.user_id)
        const challengeCount = challengeStats?.filter(c => c.user_id === user.user_id).length || 0
        const reflectionCount = reflectionStats?.filter(r => r.user_id === user.user_id).length || 0
        
        // Count challenge days completed (both challenges done, reflection optional)
        const challengeDaysCompleted = dayStats?.filter(d => 
          d.user_id === user.user_id && 
          d.both_challenges_completed
          // Note: reflection_submitted is NOT required for day completion
        ).length || 0
        
        const preSurveyCompleted = preSurveyStats?.some(s => s.user_id === user.user_id) || false
        const postSurveyCompleted = postSurveyStats?.some(s => s.user_id === user.user_id) || false
        const totalSurveys = (preSurveyCompleted ? 1 : 0) + (postSurveyCompleted ? 1 : 0)
        
        // Total days completed = challenge days + survey completions
        const completedDays = challengeDaysCompleted + totalSurveys

        return {
          ...user,
          email: authUser?.email || 'No email',
          challenge_completions: challengeCount,
          reflection_submissions: reflectionCount,
          completed_days: completedDays,
          pre_survey_completed: preSurveyCompleted,
          post_survey_completed: postSurveyCompleted,
          surveys_completed: totalSurveys
        }
      })

      setCohortUsers(enrichedUsers)
    } catch (err) {
      console.error('Error loading cohort users:', err)
      setError('Failed to load user data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString()
  }

  const selectedCohort = cohorts.find(c => c.id === selectedCohortId)

  if (!profile || (!isAdmin() && !isSuperAdmin())) {
    return (
      <div className="glassmorphism rounded-2xl p-8 text-center">
        <p className="text-gray-900">Access denied. Admin privileges required.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glassmorphism rounded-2xl p-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Cohort User Dashboard</h2>
        
        {/* Cohort Selector */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <label className="text-gray-900 font-medium">Select Cohort:</label>
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="glassmorphism px-4 py-2 rounded-lg text-gray-900 bg-gray-50 border border-white/20 focus:border-white/40 focus:outline-none min-w-[250px]"
          >
            <option value="">Choose a cohort...</option>
            {cohorts.map(cohort => (
              <option key={cohort.id} value={cohort.id} className="bg-gray-800 text-gray-900">
                {cohort.name}
              </option>
            ))}
          </select>
          
          {selectedCohort && (
            <div className="text-gray-600 text-sm">
              Organization: {selectedCohort.organization_name}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="glassmorphism rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-900">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="glassmorphism rounded-2xl p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => selectedCohortId ? loadCohortUsers() : loadCohorts()}
            className="px-4 py-2 bg-red-500/20 rounded-lg text-gray-900 hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* User Data */}
      {selectedCohortId && !loading && !error && (
        <div className="glassmorphism rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">
              {selectedCohort?.name} Users ({cohortUsers.length})
            </h3>
            <button
              onClick={loadCohortUsers}
              className="glassmorphism px-4 py-2 rounded-lg text-gray-900 hover:bg-white/20 transition-all"
            >
              Refresh
            </button>
          </div>

          {cohortUsers.length === 0 ? (
            <div className="text-center text-gray-600 py-12">
              <p className="text-xl">No users found in this cohort</p>
              <p className="text-sm mt-2">Users may not be assigned to this cohort yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-gray-900">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 font-semibold">User</th>
                    <th className="text-center py-3 px-4 font-semibold">Completed Days</th>
                    <th className="text-center py-3 px-4 font-semibold">Challenge Completions</th>
                    <th className="text-center py-3 px-4 font-semibold">Reflections Shared</th>
                    <th className="text-center py-3 px-4 font-semibold">Surveys Completed</th>
                    <th className="text-left py-3 px-4 font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {cohortUsers.map(user => (
                    <tr key={user.user_id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-xs text-gray-900/50 mt-1">
                            Role: {user.role}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-xl font-bold text-blue-400">
                          {user.completed_days}
                        </div>
                        <div className="text-xs text-gray-600">days</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-xl font-bold text-green-400">
                          {user.challenge_completions}
                        </div>
                        <div className="text-xs text-gray-600">challenges</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-xl font-bold text-purple-400">
                          {user.reflection_submissions}
                        </div>
                        <div className="text-xs text-gray-600">reflections</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-xl font-bold text-orange-400">
                          {user.surveys_completed}
                        </div>
                        <div className="text-xs text-gray-600">
                          {user.pre_survey_completed && user.post_survey_completed ? 'both surveys' :
                           user.pre_survey_completed ? 'pre only' :
                           user.post_survey_completed ? 'post only' : 'surveys'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600">
                          {formatDate(user.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary Stats */}
          {cohortUsers.length > 0 && (
            <div className="mt-8 pt-6 border-t border-white/20">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Cohort Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {cohortUsers.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {cohortUsers.reduce((sum, user) => sum + user.completed_days, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Days Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {cohortUsers.reduce((sum, user) => sum + user.challenge_completions, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Challenges</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {cohortUsers.reduce((sum, user) => sum + user.reflection_submissions, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Reflections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {cohortUsers.reduce((sum, user) => sum + user.surveys_completed, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Surveys</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CohortUserDashboard 