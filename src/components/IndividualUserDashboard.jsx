import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function IndividualUserDashboard({ selectedUser, onBack }) {
  const [userStats, setUserStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [detailedProgress, setDetailedProgress] = useState([])
  const [userReflections, setUserReflections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Collapsible section states
  const [isReflectionsExpanded, setIsReflectionsExpanded] = useState(true)
  const [isRecentActivityExpanded, setIsRecentActivityExpanded] = useState(false)

  useEffect(() => {
    if (selectedUser) {
      loadUserData()
    }
  }, [selectedUser])

  const loadUserData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [stats, activity, detailed, reflections] = await Promise.all([
        getUserStats(),
        getRecentActivity(),
        getDetailedProgress(),
        getUserReflections()
      ])

      setUserStats(stats)
      setRecentActivity(activity)
      setDetailedProgress(detailed)
      setUserReflections(reflections)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getUserStats = async () => {
    // Get journey analytics if available (remove .single() to handle empty results)
    const { data: journeyData, error: journeyError } = await supabase
      .from('user_journey_analytics')
      .select('*')
      .eq('user_id', selectedUser.user_id)

    // Handle the result - journeyData will be an array, take first item if exists
    let journeyStats = null
    if (!journeyError && journeyData && journeyData.length > 0) {
      journeyStats = journeyData[0]
    }

    // Get challenge completions count
    const { count: challengeCount, error: challengeError } = await supabase
      .from('user_challenge_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', selectedUser.user_id)

    // Get reflections count
    const { count: reflectionCount, error: reflectionError } = await supabase
      .from('user_reflections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', selectedUser.user_id)

    // Get day completions count
    const { count: dayCount, error: dayError } = await supabase
      .from('user_day_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', selectedUser.user_id)

    // Get survey completions
    const { data: preSurvey, error: preSurveyError } = await supabase
      .from('pre_survey_responses')
      .select('completed_at')
      .eq('user_id', selectedUser.user_id)
      .single()

    const { data: postSurvey, error: postSurveyError } = await supabase
      .from('post_survey_responses')
      .select('completed_at')
      .eq('user_id', selectedUser.user_id)
      .single()

    // Get recent activity (last 7 days)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const { count: recentChallenges, error: recentChallengesError } = await supabase
      .from('user_challenge_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', selectedUser.user_id)
      .gte('completed_at', oneWeekAgo.toISOString())

    const { count: recentReflections, error: recentReflectionsError } = await supabase
      .from('user_reflections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', selectedUser.user_id)
      .gte('submitted_at', oneWeekAgo.toISOString())

    return {
      journey: journeyStats,
      totalChallenges: challengeCount || 0,
      totalReflections: reflectionCount || 0,
      totalDaysCompleted: dayCount || 0,
      recentChallenges: recentChallenges || 0,
      recentReflections: recentReflections || 0,
      surveys: {
        pre_completed: !!preSurvey && !preSurveyError,
        pre_completed_at: preSurvey?.completed_at,
        post_completed: !!postSurvey && !postSurveyError,
        post_completed_at: postSurvey?.completed_at,
        total_completed: (!!preSurvey && !preSurveyError ? 1 : 0) + (!!postSurvey && !postSurveyError ? 1 : 0)
      }
    }
  }

  const getRecentActivity = async () => {
    try {
      // Try enhanced detailed activity function first
      const { data: detailedData, error: detailedError } = await supabase
        .rpc('get_user_recent_activity_detailed', {
          target_user_id: selectedUser.user_id,
          days_back: 7
        })

      if (!detailedError && detailedData) {
        // Map the detailed data to the format expected by the component
        return detailedData.map(activity => ({
          type: activity.activity_type,
          timestamp: activity.activity_time,
          description: activity.activity_description,
          icon: activity.activity_type === 'challenge_completion' ? 'Challenge' : 
                activity.activity_type === 'reflection_submission' ? 'Reflection' : 'Day Complete',
          wordCount: activity.word_count
        }))
      }

      // Fallback to original method if enhanced function doesn't exist
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      // Get recent challenge completions
      const { data: challenges, error: challengeError } = await supabase
        .from('user_challenge_completions')
        .select('completed_at, challenge_number')
        .eq('user_id', selectedUser.user_id)
        .gte('completed_at', oneWeekAgo.toISOString())
        .order('completed_at', { ascending: false })
        .limit(10)

      // Get recent reflections
      const { data: reflections, error: reflectionError } = await supabase
        .from('user_reflections')
        .select('submitted_at, reflection_text')
        .eq('user_id', selectedUser.user_id)
        .gte('submitted_at', oneWeekAgo.toISOString())
        .order('submitted_at', { ascending: false })
        .limit(10)

      // Combine and sort activities
      const activities = []

      if (challenges && !challengeError) {
        challenges.forEach(challenge => {
          activities.push({
            type: 'challenge',
            timestamp: challenge.completed_at,
            description: `Completed Challenge ${challenge.challenge_number}`,
            icon: 'Challenge'
          })
        })
      }

      if (reflections && !reflectionError) {
        reflections.forEach(reflection => {
          activities.push({
            type: 'reflection',
            timestamp: reflection.submitted_at,
            description: `Submitted reflection (${reflection.reflection_text?.length || 0} chars)`,
            icon: 'Reflection'
          })
        })
      }

      // Sort by timestamp (most recent first)
      return activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 15)

    } catch (err) {
      console.error('Error fetching recent activity:', err)
      return []
    }
  }

  const getDetailedProgress = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_detailed_progress', {
          target_user_id: selectedUser.user_id
        })

      if (error) {
        console.warn('Detailed progress function not available:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.warn('Error fetching detailed progress:', err)
      return []
    }
  }

  const getUserReflections = async () => {
    try {
      const { data, error } = await supabase
        .from('user_reflections')
        .select(`
          *,
          challenges!inner(
            id,
            order_index,
            title,
            reflection_question
          )
        `)
        .eq('user_id', selectedUser.user_id)
        .order('submitted_at', { ascending: false })

      if (error) {
        console.warn('Error fetching user reflections:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.warn('Error fetching user reflections:', err)
      return []
    }
  }

  if (!selectedUser) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-900/60">Select a user to view their activity</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-900">Loading user activity...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">Error loading user data: {error}</p>
        <button
          onClick={loadUserData}
          className="px-4 py-2 bg-red-500/20 rounded-lg text-gray-900 hover:bg-red-500/30 transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back to Search
        </button>
        <button
          onClick={loadUserData}
          className="px-4 py-2 bg-white/20 rounded-lg text-black hover:bg-white/30 transition-all text-sm"
        >
          Refresh
        </button>
      </div>

      {/* User Header */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-gray-900 font-bold text-2xl">
            {selectedUser.first_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-black">
              {selectedUser.first_name} {selectedUser.last_name}
            </h2>
            <p className="text-gray-700">{selectedUser.email}</p>
            {selectedUser.cohort_name && (
              <span className="inline-block mt-2 text-xs bg-white/20 px-3 py-1 rounded-full text-black">
                {selectedUser.cohort_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4">Progress Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {userStats?.journey?.journey_completion_percentage || 0}%
            </div>
            <div className="text-black font-medium text-sm">Journey Complete</div>
          </div>
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {userStats?.totalDaysCompleted}
            </div>
            <div className="text-black font-medium text-sm">Days Completed</div>
          </div>
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {userStats?.journey?.current_streak_days || 0}
            </div>
            <div className="text-black font-medium text-sm">Current Streak</div>
          </div>
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {userStats?.totalReflections}
            </div>
            <div className="text-black font-medium text-sm">Reflections</div>
          </div>
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold mb-1 ${
              userStats?.surveys?.total_completed === 2 ? 'text-green-400' : 
              userStats?.surveys?.total_completed === 1 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {userStats?.surveys?.total_completed || 0}/2
            </div>
            <div className="text-black font-medium text-sm">Surveys</div>
            <div className="text-xs text-gray-600 mt-1">
              Day 0: {userStats?.surveys?.pre_completed ? '✓' : '✗'} | 
              Day 16: {userStats?.surveys?.post_completed ? '✓' : '✗'}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Activity */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4">This Week's Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-gray-900 mb-1">
              {userStats?.recentChallenges}
            </div>
            <div className="text-black font-medium text-sm">Challenges Completed</div>
          </div>
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-gray-900 mb-1">
              {userStats?.recentReflections}
            </div>
            <div className="text-black font-medium text-sm">Reflections Submitted</div>
          </div>
          <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
            <div className="text-xl font-bold text-gray-900 mb-1">
              {userStats?.journey?.last_activity_at ? 
                Math.floor((new Date() - new Date(userStats.journey.last_activity_at)) / (1000 * 60 * 60 * 24)) : 
                '?'
              }
            </div>
            <div className="text-black font-medium text-sm">Days Since Last Activity</div>
          </div>
        </div>
      </div>

      {/* Detailed Progress Table */}
      {detailedProgress.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-black mb-4">Challenge & Reflection Progress</h3>
          <div className="bg-gray-50 rounded-xl p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-black font-medium pb-3">Day</th>
                    <th className="text-left text-black font-medium pb-3">Challenge</th>
                    <th className="text-center text-black font-medium pb-3">Part 1</th>
                    <th className="text-center text-black font-medium pb-3">Part 2</th>
                    <th className="text-center text-black font-medium pb-3">Reflection</th>
                    <th className="text-center text-black font-medium pb-3">Day Done</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedProgress.map((day, index) => (
                    <tr key={day.challenge_id || index} className="border-b border-white/10">
                      <td className="py-3 text-black font-medium">Day {day.challenge_day}</td>
                      <td className="py-3 text-black text-sm">{day.challenge_title || 'No challenge'}</td>
                      <td className="py-3 text-center">
                        {day.challenge_1_completed ? (
                          <div className="w-5 h-5 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {day.challenge_2_completed ? (
                          <div className="w-5 h-5 bg-green-500 rounded-full mx-auto flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {day.reflection_completed ? (
                          <div className="w-5 h-5 bg-blue-500 rounded-full mx-auto flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        {day.day_completed ? (
                          <div className="w-5 h-5 bg-yellow-500 rounded-full mx-auto flex items-center justify-center">
                            <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <p className="text-gray-600 text-sm">
                Showing all {detailedProgress.length} days of progress
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Reflections - Collapsible */}
      <div>
        <div 
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsReflectionsExpanded(!isReflectionsExpanded)}
        >
          <h3 className="text-lg font-semibold text-black">Reflection Answers ({userReflections.length})</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {isReflectionsExpanded ? 'Hide' : 'Show'}
            </span>
            <svg 
              className={`w-5 h-5 text-black transition-transform duration-200 ${
                isReflectionsExpanded ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {isReflectionsExpanded && (
          <div className="bg-gray-50 rounded-xl p-6">
            {userReflections.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No reflections submitted yet</p>
            ) : (
              <div className="space-y-6">
                {userReflections.map((reflection, index) => (
                  <div key={reflection.id} className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 text-gray-900 px-3 py-1 rounded-full text-sm font-semibold">
                          Day {reflection.challenges?.order_index || 'N/A'}
                        </div>
                        <div>
                          <h4 className="text-black font-semibold">
                            {reflection.challenges?.title || `Challenge ${reflection.challenge_id}`}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            Submitted: {new Date(reflection.submitted_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-600 text-sm bg-blue-500/20 px-2 py-1 rounded">
                          {reflection.word_count || 0} words
                        </div>
                      </div>
                    </div>
                    
                    {reflection.challenges?.reflection_question && (
                      <div className="mb-4">
                        <h5 className="text-black font-medium text-sm mb-2">Question:</h5>
                        <p className="text-gray-700 text-sm italic bg-white/5 p-3 rounded border-l-4 border-blue-500">
                          "{reflection.challenges.reflection_question}"
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <h5 className="text-black font-medium text-sm mb-2">Answer:</h5>
                      <div className="text-gray-800 text-sm bg-gray-50 p-4 rounded border border-white/20 max-h-96 overflow-y-auto">
                        <p className="whitespace-pre-wrap leading-relaxed">{reflection.reflection_text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Activity Timeline - Collapsible */}
      <div>
        <div 
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsRecentActivityExpanded(!isRecentActivityExpanded)}
        >
          <h3 className="text-lg font-semibold text-black">Recent Activity ({recentActivity.length})</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {isRecentActivityExpanded ? 'Hide' : 'Show'}
            </span>
            <svg 
              className={`w-5 h-5 text-black transition-transform duration-200 ${
                isRecentActivityExpanded ? 'rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {isRecentActivityExpanded && (
          <div className="bg-gray-50 rounded-xl p-6">
            {recentActivity.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No recent activity in the last 7 days</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold text-gray-900 ${
                      activity.type === 'challenge' || activity.type === 'challenge_completion'
                        ? 'bg-green-500' 
                        : activity.type === 'reflection' || activity.type === 'reflection_submission'
                        ? 'bg-blue-500'
                        : 'bg-yellow-500'
                    }`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-black text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-600 text-xs">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                        {activity.wordCount && (
                          <span className="text-blue-600 text-xs bg-blue-500/20 px-2 py-1 rounded">
                            {activity.wordCount} words
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      activity.type === 'challenge' || activity.type === 'challenge_completion'
                        ? 'bg-green-500/20 text-black' 
                        : activity.type === 'reflection' || activity.type === 'reflection_submission'
                        ? 'bg-blue-500/20 text-black'
                        : 'bg-yellow-500/20 text-black'
                    }`}>
                      {activity.type.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default IndividualUserDashboard 