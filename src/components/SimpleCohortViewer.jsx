import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminState } from '../contexts/AdminStateContext'
import { useUserProfile } from '../hooks/useUserProfile'
import IndividualUserDashboard from './IndividualUserDashboard'

function SimpleCohortViewer() {
  const { selectedCohortId, setSelectedCohortId, selectedUserId, setSelectedUserId } = useAdminState()
  const { profile, isSuperAdmin } = useUserProfile()
  const [cohorts, setCohorts] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)




  // Load cohorts on mount, but wait for profile to be available
  useEffect(() => {
    if (profile) {
    loadCohorts()
    }
  }, [profile])

  // Sync selectedUser state with selectedUserId from context
  useEffect(() => {
    if (!selectedUserId) {
      // If no selectedUserId, clear selectedUser
      setSelectedUser(null)
    } else if (users.length > 0) {
      // If we have selectedUserId and users are loaded, find the user
      const user = users.find(u => u.user_id === selectedUserId)
      setSelectedUser(user || null)
    }
    // If selectedUserId exists but users not loaded yet, do nothing (wait for users to load)
  }, [selectedUserId, users])

  // Update context when selectedUser changes (when user clicks on a user)
  // Only clear context if selectedUser was explicitly set to null by user action, not during initialization
  useEffect(() => {
    if (selectedUser) {
      setSelectedUserId(selectedUser.user_id)
    }
    // Don't clear selectedUserId when selectedUser becomes null during component initialization
    // Only clear it when user explicitly goes back via the back button (handled in onClick)
  }, [selectedUser, setSelectedUserId])

  // Load users when cohort is selected
  useEffect(() => {
    if (selectedCohortId) {
      loadUsers()
    } else {
      setUsers([])
      setSelectedUser(null) // Clear selected user when cohort changes
      setSelectedUserId('') // Clear selected user from context
    }
  }, [selectedCohortId, setSelectedUserId])

  const loadCohorts = async () => {
    try {
      setLoading(true)
      let cohortsData = []
      
      if (isSuperAdmin()) {
        // Super admins can see all cohorts
        console.log('🔑 CohortViewer: Loading all cohorts for super admin')
        const { data, error } = await supabase
          .from('cohorts')
          .select('id, name, organization_name')
          .order('name')
        
        if (error) throw error
        cohortsData = data || []
        console.log('📋 CohortViewer: Super admin can see', cohortsData.length, 'cohorts')
      } else {
        // Regular admins can only see cohorts they're assigned to
        console.log('👤 CohortViewer: Loading assigned cohorts for admin:', profile?.user_id)
        console.log('👤 CohortViewer: Full profile:', profile)
        
        if (!profile?.user_id) {
          console.warn('⚠️ CohortViewer: No user_id in profile, falling back to all cohorts')
          // Fallback to all cohorts if profile not loaded yet
      const { data, error } = await supabase
        .from('cohorts')
        .select('id, name, organization_name')
        .order('name')

      if (error) throw error
          cohortsData = data || []
        } else {
          const { data, error } = await supabase
            .from('admin_cohort_assignments')
            .select(`
              cohort_id,
              cohorts(id, name, organization_name)
            `)
            .eq('admin_user_id', profile.user_id)
            .eq('is_active', true)
          
          console.log('🔍 CohortViewer: Assignment query result:', data)
          console.log('🔍 CohortViewer: Assignment query error:', error)
          
          if (error) throw error
          cohortsData = data?.map(assignment => assignment.cohorts).filter(Boolean) || []
          cohortsData.sort((a, b) => a.name.localeCompare(b.name))
        }
        
        console.log('📋 CohortViewer: Admin can see', cohortsData.length, 'assigned cohorts:', cohortsData.map(c => c.name))
      }
      
      setCohorts(cohortsData)
      return cohortsData
    } catch (err) {
      console.error('Error loading cohorts:', err)
      setError('Failed to load cohorts')
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use enhanced function to get users with progress stats
      const { data: usersWithStats, error: usersError } = await supabase
        .rpc('get_cohort_users_with_stats', {
          target_cohort_id: selectedCohortId
        })

      if (usersError) {
        console.error('RPC function error:', usersError)
        // Fallback to basic function if enhanced doesn't exist
        const { data: basicUsers, error: basicError } = await supabase
          .rpc('get_user_emails_for_cohort', {
            target_cohort_id: selectedCohortId
          })

        if (basicError) {
          // Final fallback to user_profiles only
          const { data: userProfiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, role, created_at')
            .eq('cohort_id', selectedCohortId)
            .order('first_name')

          if (profilesError) throw profilesError

          const usersWithoutStats = userProfiles?.map(profile => ({
            ...profile,
            email: 'Email function not available',
            total_challenges_completed: 0,
            total_reflections_submitted: 0,
            total_days_completed: 0,
            current_streak_days: 0,
            journey_completion_percentage: 0,
            recent_challenges_count: 0,
            recent_reflections_count: 0,
            surveys_completed: 0,
            pre_survey_completed: false,
            post_survey_completed: false
          })) || []

          setUsers(usersWithoutStats)
          return
        }

        // Map basic users to include empty stats
        const usersWithEmptyStats = basicUsers?.map(user => ({
          ...user,
          total_challenges_completed: 0,
          total_reflections_submitted: 0,
          total_days_completed: 0,
          current_streak_days: 0,
          journey_completion_percentage: 0,
          recent_challenges_count: 0,
          recent_reflections_count: 0,
          surveys_completed: 0,
          pre_survey_completed: false,
          post_survey_completed: false
        })) || []

        setUsers(usersWithEmptyStats)
        return
      }

      // Add survey data to the users we got from the RPC function
      if (usersWithStats && usersWithStats.length > 0) {
        const userIds = usersWithStats.map(u => u.user_id)

        // Get survey completions
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

        // Enhance users with survey data
        const usersWithSurveys = usersWithStats.map(user => {
          const preSurveyCompleted = preSurveyStats?.some(s => s.user_id === user.user_id) || false
          const postSurveyCompleted = postSurveyStats?.some(s => s.user_id === user.user_id) || false
          const totalSurveys = (preSurveyCompleted ? 1 : 0) + (postSurveyCompleted ? 1 : 0)

          return {
            ...user,
            pre_survey_completed: preSurveyCompleted,
            post_survey_completed: postSurveyCompleted,
            surveys_completed: totalSurveys
          }
        })

        setUsers(usersWithSurveys)
      } else {
        setUsers([])
      }
    } catch (err) {
      console.error('Error loading users:', err)
      setError('Failed to load users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedCohort = cohorts.find(c => c.id === selectedCohortId)



  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Cohort Selector */}
      <div className="bg-white/10 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Select Cohort</h3>
        
        <select
          value={selectedCohortId}
          onChange={(e) => setSelectedCohortId(e.target.value)}
          className="w-full px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-white/20 text-gray-900 border border-white/30 focus:border-white/50 focus:outline-none text-sm sm:text-base"
        >
          <option value="">Choose a cohort...</option>
          {cohorts.map(cohort => (
            <option key={cohort.id} value={cohort.id} className="bg-gray-800">
              {cohort.name}
            </option>
          ))}
        </select>

        {selectedCohort && (
          <div className="mt-3">
            <div className="text-gray-600 text-sm sm:text-base">
            Selected: {selectedCohort.name}
            {selectedCohort.organization_name && (
              <span className="block sm:inline">
                <span className="hidden sm:inline"> • </span>
                {selectedCohort.organization_name}
              </span>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white/10 rounded-xl p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white mx-auto mb-3 sm:mb-4"></div>
          <p className="text-gray-900 text-sm sm:text-base">Loading...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 rounded-xl p-4 sm:p-6 text-center">
          <p className="text-red-400 mb-3 sm:mb-4 text-sm sm:text-base">{error}</p>
          <button
            onClick={() => selectedCohortId ? loadUsers() : loadCohorts()}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-red-500/30 rounded-lg text-black hover:bg-red-500/40 text-sm sm:text-base"
            style={{textShadow: 'none'}}
          >
            Retry
          </button>
        </div>
      )}

      {/* No cohort selected state - only show when no cohort is selected and not loading */}
      {!selectedCohortId && !loading && !error && (
        <div className="bg-white/10 rounded-xl p-6 sm:p-8 text-center">
          <div className="text-gray-600 mb-4">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-3-3.87M9 20H4v-2a3 3 0 013-3.87m8-16a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">Select a Cohort</h3>
            <p className="text-gray-600 text-sm sm:text-base">Choose a cohort from the dropdown above to view and manage its users.</p>
          </div>
        </div>
      )}

      {/* Users Display */}
      {selectedCohortId && !loading && !error && (
        <div className="bg-white/10 rounded-xl p-4 sm:p-6">
          {selectedUser ? (
            // Show individual user dashboard
            <div>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <button
                  onClick={() => {
                    setSelectedUser(null)
                    setSelectedUserId('')
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
                >
                  ← Back to {selectedCohort?.name} Users
                </button>
              </div>

              <IndividualUserDashboard 
                selectedUser={selectedUser}
                onBack={() => {
                  setSelectedUser(null)
                  setSelectedUserId('')
                }}
              />
            </div>
          ) : (
            // Show user list
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Cohort Users ({users.length})
                </h3>
                <button 
                  onClick={loadUsers}
                  className="px-3 py-2 sm:px-4 sm:py-2 bg-white/20 rounded-lg text-black hover:bg-white/30 text-sm"
                  style={{textShadow: 'none'}}
                >
                  Refresh
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-600">Loading users...</div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-400 mb-4">{error}</div>
                  <button 
                    onClick={loadUsers}
                    className="px-4 py-2 bg-white/20 rounded-lg text-black hover:bg-white/30"
                    style={{textShadow: 'none'}}
                  >
                    Try Again
                  </button>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-600">No users found in this cohort</div>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  <p className="text-gray-900/60 text-xs sm:text-sm mb-3 sm:mb-4">
                    Click on a user to view their detailed activity and progress
                  </p>
                  {users.map(user => (
                    <div 
                      key={user.user_id} 
                      onClick={() => setSelectedUser(user)}
                      className="bg-white/10 rounded-lg p-4 hover:bg-white/20 cursor-pointer transition-all"
                    >
                      {/* Mobile Layout: Stack vertically */}
                      <div className="md:hidden">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-gray-900 font-bold">
                            {user.first_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-800">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="text-center bg-white/10 rounded-lg p-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">{user.total_days_completed || 0} days</div>
                          </div>
                          <div className="text-center bg-white/10 rounded-lg p-2">
                            <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">{user.total_challenges_completed || 0} challenges</div>
                          </div>
                          <div className="text-center bg-white/10 rounded-lg p-2">
                            <div className="w-4 h-4 bg-cyan-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">{user.total_reflections_submitted || 0} reflections</div>
                          </div>
                          <div className="text-center bg-white/10 rounded-lg p-2">
                            <div className="w-4 h-4 bg-purple-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">
                              {user.surveys_completed || 0}/2 surveys
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop Layout: Horizontal */}
                      <div className="hidden md:flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-gray-900 font-bold">
                            {user.first_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-600">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="w-5 h-5 bg-blue-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">{user.total_days_completed || 0} days</div>
                          </div>
                          <div className="text-center">
                            <div className="w-5 h-5 bg-green-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">{user.total_challenges_completed || 0} challenges</div>
                          </div>
                          <div className="text-center">
                            <div className="w-5 h-5 bg-cyan-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">{user.total_reflections_submitted || 0} reflections</div>
                          </div>
                          <div className="text-center">
                            <div className="w-5 h-5 bg-purple-500 rounded-full mx-auto mb-1 flex items-center justify-center">
                              <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-gray-700 text-xs font-medium">
                              {user.surveys_completed || 0}/2 surveys
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}


    </div>
  )
}

export default SimpleCohortViewer 