import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

function LeaderboardPage() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [leaderboardData, setLeaderboardData] = useState([])
  const [cohortInfo, setCohortInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (profile?.cohort_id) {
      loadLeaderboard()
    }
  }, [profile?.cohort_id])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Loading leaderboard data...')

      // First, get cohort information
      const { data: cohortData, error: cohortError } = await supabase
        .from('cohorts')
        .select('id, name, organization_name, start_date, end_date')
        .eq('id', profile.cohort_id)
        .single()

      if (cohortError) throw cohortError
      setCohortInfo(cohortData)
      console.log('✅ Cohort data loaded:', cohortData)

      // Use the enhanced leaderboard function to get real progress data with all metrics
      const { data: leaderboardData, error: leaderboardError } = await supabase
        .rpc('get_enhanced_cohort_leaderboard', {
          target_cohort_id: profile.cohort_id
        })

      if (leaderboardError) throw leaderboardError

      console.log('🏆 Enhanced leaderboard data loaded:', leaderboardData?.length, 'users')
      console.log('📊 Sample data:', leaderboardData?.slice(0, 3))
      
      setLeaderboardData(leaderboardData || [])

    } catch (err) {
      console.error('❌ Error loading leaderboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/30'
    if (rank === 3) return 'bg-orange-500/20 text-orange-300 border-orange-400/30'
    return 'bg-white/10 text-white/90 border-white/20'
  }

  const getProgressColor = (percentage) => {
    return 'text-black' // Black text for better readability
  }

  const getCurrentUserRank = () => {
    if (!profile?.user_id || !leaderboardData.length) return null
    const userEntry = leaderboardData.find(entry => entry.user_id === profile.user_id)
    return userEntry?.rank_position || null
  }

  if (profileLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="glassmorphism rounded-2xl p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-white/20 rounded w-1/3 mb-6"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-white/20 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!profile?.cohort_id) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="glassmorphism rounded-2xl p-8 text-center">
            <h1 className="text-3xl font-bold text-black mb-4">Leaderboard</h1>
            <p className="text-black/70">You need to be assigned to a cohort to view the leaderboard.</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="glassmorphism rounded-2xl p-8 text-center">
            <h1 className="text-3xl font-bold text-black mb-4">Leaderboard</h1>
            <p className="text-red-600 mb-4">Error loading leaderboard: {error}</p>
            <button
              onClick={loadLeaderboard}
              className="px-6 py-3 glassmorphism text-black rounded-xl hover:bg-white/25 transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        <div className="glassmorphism rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-black mb-2">Leaderboard</h1>
            {cohortInfo && (
              <div className="space-y-1">
                <p className="text-xl text-black/90">{cohortInfo.name}</p>
                <p className="text-black/70">{cohortInfo.organization_name}</p>
              </div>
            )}
          </div>

          {/* Current User's Rank */}
          {getCurrentUserRank() && (
            <div className="mb-6 p-4 bg-white/15 rounded-xl border border-white/30">
              <div className="text-center">
                <p className="text-black/70 text-sm">Your Current Rank</p>
                <p className="text-2xl font-bold text-black">
                  #{getCurrentUserRank()}
                </p>
              </div>
            </div>
          )}

          {/* Leaderboard List */}
          {leaderboardData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-black/70">No participants found in your cohort yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboardData.map((user) => (
                <div
                  key={user.user_id}
                  className={`
                    p-6 glassmorphism rounded-xl border transition-all duration-300 hover:bg-white/10
                    ${user.user_id === profile?.user_id 
                      ? 'border-blue-400/50 bg-blue-500/10' 
                      : 'border-white/20'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    {/* Left: Rank and User Info */}
                    <div className="flex items-center gap-4">
                      {/* Rank Badge */}
                      <div className={`
                        flex items-center justify-center w-12 h-12 rounded-full border text-lg font-bold
                        ${getRankBadgeColor(user.rank_position)}
                      `}>
                        #{user.rank_position}
                      </div>
                      
                      {/* User Details */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-black">
                            {user.first_name} {user.last_name}
                          </h3>
                          {user.user_id === profile?.user_id && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                              You
                            </span>
                          )}
                        </div>
                        
                        {/* Clean Progress Stats */}
                        <div className="flex items-center gap-4 mt-2 text-sm text-black/70">
                          <span>{user.total_days_completed} days</span>
                          <span>{user.total_challenges_completed} challenges</span>
                          <span>{user.total_reflections_submitted} reflections</span>
                          {user.current_streak_days > 0 && (
                            <span>🔥 {user.current_streak_days} streak</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Progress and Stats */}
                    <div className="text-right">
                      {/* Completion Percentage */}
                      <div className="mb-3">
                        <div className="flex items-center justify-end gap-2 mb-1">
                          <span className={`text-2xl font-bold ${getProgressColor(user.journey_completion_percentage)}`}>
                            {Math.round(parseFloat(user.journey_completion_percentage))}%
                          </span>
                        </div>
                        <div className="w-32 h-2 bg-white/20 rounded-full">
                          <div 
                            className="h-2 bg-gradient-to-r from-[#0f4f66] to-[#a7dbe3] rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(parseFloat(user.journey_completion_percentage), 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Survey Status - Simple */}
                      <div className="text-xs text-black/60">
                        {user.surveys_completed}/2 surveys completed
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-black/60 text-sm">
              Rankings update in real-time. Tied users share the same rank position.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default LeaderboardPage 