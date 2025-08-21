import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

function LeaderboardPage() {
  const { profile, loading: profileLoading, isAdmin, isSuperAdmin } = useUserProfile()
  const [leaderboardData, setLeaderboardData] = useState([])
  const [cohortInfo, setCohortInfo] = useState(null)
  const [availableCohorts, setAvailableCohorts] = useState([])
  const [selectedCohortId, setSelectedCohortId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize available cohorts and selected cohort
  useEffect(() => {
    if (profile) {
      loadAvailableCohorts()
    }
  }, [profile])

  // Load leaderboard when cohort is selected
  useEffect(() => {
    if (selectedCohortId) {
      loadLeaderboard(selectedCohortId)
    }
  }, [selectedCohortId])

  const loadAvailableCohorts = async () => {
    try {
      setLoading(true)
      setError(null)
      let cohorts = []

      if (isSuperAdmin() || isAdmin()) {
        // Use the existing safe function for admins that respects admin assignments
        const { data, error } = await supabase
          .rpc('get_safe_accessible_cohorts')

        if (error) throw error
        
        // Filter to only active cohorts and map to expected format
        cohorts = (data || [])
          .filter(cohort => cohort.is_active)
          .map(cohort => ({
            id: cohort.id,
            name: cohort.name,
            organization_name: cohort.organization_name
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
        
        console.log('📋 Admin can access', cohorts.length, 'cohorts:', cohorts.map(c => c.name))
      } else {
        // Regular users can only see their own cohort
        if (profile?.cohort_id) {
          const { data, error } = await supabase
            .from('cohorts')
            .select('id, name, organization_name, is_active')
            .eq('id', profile.cohort_id)
            .eq('is_active', true)
            .single()
          
          if (error) {
            console.error('Error loading user cohort:', error)
            // If cohort doesn't exist or is inactive, show empty
            cohorts = []
          } else {
            cohorts = data ? [data] : []
            console.log('👤 User can see their own cohort:', data?.name)
          }
        } else {
          console.log('👤 User has no cohort assigned')
          cohorts = []
        }
      }
      
      setAvailableCohorts(cohorts)

      // Auto-select the first available cohort or user's cohort
      if (cohorts.length > 0) {
        const defaultCohort = profile?.cohort_id && cohorts.find(c => c.id === profile.cohort_id) 
          ? profile.cohort_id 
          : cohorts[0].id
        setSelectedCohortId(defaultCohort)
      }

    } catch (err) {
      console.error('❌ Error loading available cohorts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaderboard = async (cohortId) => {
    try {
      setLoading(true)
      setError(null)
      console.log('🔄 Loading leaderboard data for cohort:', cohortId)

      // First, get cohort information
      const { data: cohortData, error: cohortError } = await supabase
        .from('cohorts')
        .select('id, name, organization_name, start_date, end_date')
        .eq('id', cohortId)
        .single()

      if (cohortError) throw cohortError
      setCohortInfo(cohortData)
      console.log('✅ Cohort data loaded:', cohortData)

      // Try v2 RPC first (unions customized + default); fallback to original if missing
      let leaderboardData
      let leaderboardError
      try {
        const v2 = await supabase.rpc('get_enhanced_cohort_leaderboard_v2', {
          target_cohort_id: cohortId
        })
        if (v2.error) throw v2.error
        leaderboardData = v2.data
      } catch (e) {
        console.warn('get_enhanced_cohort_leaderboard_v2 unavailable, falling back:', e?.message || e)
        const v1 = await supabase.rpc('get_enhanced_cohort_leaderboard', {
          target_cohort_id: cohortId
        })
        leaderboardData = v1.data
        leaderboardError = v1.error
      }

      if (leaderboardError) throw leaderboardError

      console.log('🏆 Enhanced leaderboard data loaded:', leaderboardData?.length, 'users')
      console.log('📊 Sample data:', leaderboardData?.slice(0, 3))
      
      // Limit to top 3 + honorable mention (4th place)
      const limitedLeaderboard = leaderboardData ? leaderboardData.slice(0, 4) : []
      setLeaderboardData(limitedLeaderboard)

      // Debug validation omitted for brevity

    } catch (err) {
      console.error('❌ Error loading leaderboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'bg-gradient-to-br from-amber-200/30 to-yellow-300/40 text-amber-800 shadow-lg border-amber-200/50 backdrop-blur-sm'
    if (rank === 2) return 'bg-gradient-to-br from-slate-200/30 to-gray-300/40 text-slate-800 shadow-lg border-slate-200/50 backdrop-blur-sm'
    if (rank === 3) return 'bg-gradient-to-br from-orange-200/30 to-amber-300/40 text-orange-800 shadow-lg border-orange-200/50 backdrop-blur-sm'
    if (rank === 4) return 'bg-gradient-to-br from-purple-200/30 to-indigo-300/40 text-purple-800 shadow-lg border-purple-200/50 backdrop-blur-sm'
    return 'bg-gradient-to-br from-gray-200/30 to-slate-300/40 text-gray-800 shadow-lg border-gray-200/50 backdrop-blur-sm'
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-amber-300/40 to-yellow-400/50 rounded-full border border-amber-200/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-4 h-3 bg-gradient-to-b from-amber-400/80 to-yellow-500/70 rounded-t-sm relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-2 h-1 bg-amber-300/90 rounded-t-full"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-amber-600/50"></div>
          </div>
        </div>
      </div>
    )
    if (rank === 2) return (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-slate-300/40 to-gray-400/50 rounded-full border border-slate-200/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-5 h-5 bg-gradient-to-br from-slate-400/80 to-gray-500/70 rounded-full border border-slate-300/60">
            <div className="w-full h-full bg-gradient-to-br from-slate-200/40 to-slate-300/30 rounded-full"></div>
          </div>
        </div>
      </div>
    )
    if (rank === 3) return (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-300/40 to-amber-400/50 rounded-full border border-orange-200/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-5 h-5 bg-gradient-to-br from-orange-400/80 to-amber-500/70 rounded-full border border-orange-300/60">
            <div className="w-full h-full bg-gradient-to-br from-orange-200/40 to-orange-300/30 rounded-full"></div>
          </div>
        </div>
      </div>
    )
    if (rank === 4) return (
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-300/40 to-indigo-400/50 rounded-full border border-purple-200/60 backdrop-blur-sm flex items-center justify-center">
          <div className="w-4 h-3 bg-gradient-to-b from-purple-400/80 to-indigo-500/70 rounded-sm border border-purple-300/60 relative">
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-300/90 rounded-full"></div>
          </div>
        </div>
      </div>
    )
    return '#' + rank
  }

  const getProgressColor = (percentage) => {
    return 'text-black'
  }

  const getCurrentUserRank = () => {
    if (!profile?.user_id || !leaderboardData.length) return null
    const userEntry = leaderboardData.find(entry => entry.user_id === profile.user_id || entry.id === profile.user_id)
    return userEntry?.rank_position || null
  }

  if (profileLoading || loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="glassmorphism rounded-2xl p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-white/20 rounded w-1/3 mb-8 mx-auto"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-20 bg-white/20 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="glassmorphism rounded-2xl p-8 text-center">
            <h1 className="text-3xl font-bold text-black mb-4">Leaderboard</h1>
            <p className="text-black/70">Please log in to view the leaderboard.</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (availableCohorts.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-8">
          <div className="glassmorphism rounded-2xl p-8 text-center">
            <h1 className="text-3xl font-bold text-black mb-4">Leaderboard</h1>
            <p className="text-black/70">
              {isSuperAdmin() || isAdmin() 
                ? "No cohorts available to view." 
                : "You need to be assigned to a cohort to view the leaderboard."
              }
            </p>
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
              onClick={() => loadLeaderboard(selectedCohortId)}
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
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="glassmorphism rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-black mb-6">Leaderboard</h1>
            {/* Cohort Selection Dropdown */}
            {availableCohorts.length > 1 && (
              <div className="mb-6 md:mb-8">
                <label className="block text-black/70 text-sm font-medium mb-3">
                  Select Cohort
                </label>
                <div className="relative max-w-md mx-auto">
                  <select
                    value={selectedCohortId}
                    onChange={(e) => setSelectedCohortId(e.target.value)}
                    className="w-full glassmorphism text-black rounded-xl px-3 md:px-4 py-2.5 md:py-3 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-white/50 transition-all appearance-none cursor-pointer"
                  >
                    {availableCohorts.map((cohort) => (
                      <option key={cohort.id} value={cohort.id} className="bg-white text-black">
                        {cohort.name} - {cohort.organization_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-black/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {cohortInfo && (
              <div className="space-y-1 mb-8">
                <p className="text-2xl font-semibold text-black/90">{cohortInfo.name}</p>
                <p className="text-black/60">{cohortInfo.organization_name}</p>
              </div>
            )}
          </div>

          {/* Current User's Rank */}
          {getCurrentUserRank() && getCurrentUserRank() <= 4 && (
            <div className="mb-6 md:mb-8 p-4 md:p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-400/30 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-black/70 text-sm font-medium mb-2">Your Current Rank</p>
                <div className="flex items-center justify-center gap-3 md:gap-4">
                  <div className="transform scale-110 md:scale-125">{getRankIcon(getCurrentUserRank())}</div>
                  <span className="text-2xl md:text-3xl font-bold text-black">
                     {getCurrentUserRank() === 4 ? 'Honorable Mention' : `#${getCurrentUserRank()}`}
                   </span>
                 </div>
              </div>
            </div>
          )}

          {/* Leaderboard List */}
          {leaderboardData.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-black/70 text-lg">No participants found in this cohort yet.</p>
              <p className="text-black/50 text-sm mt-2">Be the first to start your journey!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top 3 */}
              {leaderboardData.slice(0, 3).map((user, index) => (
                <div
                  key={user.user_id}
                  className={`
                    relative p-4 md:p-6 glassmorphism rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
                    ${user.user_id === profile?.user_id 
                      ? 'border-blue-400/50 bg-blue-500/10 shadow-blue-500/20' 
                      : 'border-white/20 hover:border-white/40'
                    }
                    ${index === 0 ? 'ring-2 ring-yellow-400/30' : ''}
                  `}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: Rank and User Info */}
                    <div className="flex items-center gap-4 md:gap-6">
                      {/* Rank Badge */}
                      <div className={`
                        relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full border-2 text-xl font-bold transition-all
                        ${getRankBadgeColor(user.rank_position)}
                      `}>
                        <span className="relative z-10">{getRankIcon(user.rank_position)}</span>
                      </div>
                      
                      {/* User Details */}
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg md:text-xl font-semibold text-black">
                            {user.first_name} {user.last_name}
                          </h3>
                          {user.user_id === profile?.user_id && (
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-700 text-xs font-medium rounded-full border border-blue-500/30">
                              You
                            </span>
                          )}
                        </div>
                                                 {/* Stats */}
                        <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-black/70">
                           <div className="flex items-center gap-2">
                             <div className="w-4 h-4 bg-gradient-to-br from-white/40 to-white/60 rounded border border-white/50 backdrop-blur-sm flex items-center justify-center">
                               <div className="w-2 h-2 bg-white/80 rounded-sm"></div>
                             </div>
                            <span className="font-medium">{user.total_days_completed}</span>
                                <span>days</span>
                              </div>
                           <div className="flex items-center gap-2">
                             <div className="w-4 h-4 bg-gradient-to-br from-white/40 to-white/60 rounded border border-white/50 backdrop-blur-sm flex items-center justify-center">
                               <div className="w-1.5 h-1.5 bg-white/80 transform rotate-45"></div>
                             </div>
                             <span className="font-medium">{user.total_challenges_completed}</span>
                             <span>challenges</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <div className="w-4 h-4 bg-gradient-to-br from-white/40 to-white/60 rounded-full border border-white/50 backdrop-blur-sm flex items-center justify-center">
                               <div className="w-1.5 h-1.5 bg-white/80 rounded-full"></div>
                             </div>
                             <span className="font-medium">{user.total_reflections_submitted}</span>
                             <span>reflections</span>
                           </div>
                           {user.current_streak_days > 0 && (
                             <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-200/30 to-amber-200/40 rounded-full border border-orange-200/50 backdrop-blur-sm">
                               <div className="w-3 h-3 bg-gradient-to-br from-orange-300/70 to-red-400/80 rounded-full border border-orange-200/60 relative">
                                 <div className="absolute inset-0.5 bg-gradient-to-br from-orange-400/60 to-red-500/70 rounded-full"></div>
                               </div>
                               <span className="font-bold text-orange-700">{user.current_streak_days}</span>
                               <span className="text-orange-600 text-xs">streak</span>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Progress */}
                    <div className="md:text-right">
                      <div className="mb-2 md:mb-4">
                        <div className="text-2xl md:text-3xl font-bold text-black mb-2">
                          {Math.round(parseFloat(user.journey_completion_percentage))}%
                        </div>
                        <div className="w-full md:w-32 h-3 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#0f4f66] to-[#a7dbe3] rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(parseFloat(user.journey_completion_percentage), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs text-black/60 bg-white/10 px-2 py-1 rounded-full inline-block">
                        {user.surveys_completed}/2 surveys
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Honorable Mention Section */}
              {leaderboardData.length >= 4 && (
                <div className="mt-6 md:mt-8">
                  {/* Divider */}
                  <div className="flex items-center gap-4 my-4 md:my-6">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"></div>
                                         <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-purple-200/20 to-indigo-200/30 rounded-full border border-purple-300/40 backdrop-blur-sm">
                       <div className="w-5 h-4 bg-gradient-to-b from-purple-300/60 to-indigo-400/70 rounded-sm border border-purple-200/60 backdrop-blur-sm relative flex items-center justify-center">
                         <div className="w-2 h-1 bg-purple-400/80 rounded-full"></div>
                         <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-300/90 rounded-full"></div>
                       </div>
                       <span className="text-purple-700 font-semibold">Honorable Mention</span>
                     </div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent"></div>
                  </div>
                  
                                      <div
                      className={`
                      relative p-4 md:p-6 glassmorphism rounded-xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg border-purple-400/30 bg-purple-500/5
                        ${leaderboardData[3].user_id === profile?.user_id 
                          ? 'ring-2 ring-blue-400/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10' 
                          : ''
                        }
                      `}
                    >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Left: Rank and User Info */}
                      <div className="flex items-center gap-4 md:gap-6">
                          {/* Rank Badge */}
                          <div className={`
                          relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full border-2 text-xl font-bold transition-all
                            ${getRankBadgeColor(4)}
                          `}>
                            <span className="relative z-10">{getRankIcon(4)}</span>
                          </div>
                          
                          {/* User Details */}
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg md:text-xl font-semibold text-black">
                                {leaderboardData[3].first_name} {leaderboardData[3].last_name}
                              </h3>
                              {leaderboardData[3].user_id === profile?.user_id && (
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-700 text-xs font-medium rounded-full border border-blue-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            
                            {/* Stats */}
                          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm text-black/70">
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gradient-to-br from-white/40 to-white/60 rounded border border-white/50 backdrop-blur-sm flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white/80 rounded-sm"></div>
                                </div>
                              <span className="font-medium">{leaderboardData[3].total_days_completed}</span>
                                <span>days</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gradient-to-br from-white/40 to-white/60 rounded border border-white/50 backdrop-blur-sm flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white/80 transform rotate-45"></div>
                                </div>
                                <span className="font-medium">{leaderboardData[3].total_challenges_completed}</span>
                                <span>challenges</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gradient-to-br from-white/40 to-white/60 rounded-full border border-white/50 backdrop-blur-sm flex items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-white/80 rounded-full"></div>
                                </div>
                                <span className="font-medium">{leaderboardData[3].total_reflections_submitted}</span>
                                <span>reflections</span>
                              </div>
                              {leaderboardData[3].current_streak_days > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-orange-200/30 to-amber-200/40 rounded-full border border-orange-200/50 backdrop-blur-sm">
                                  <div className="w-3 h-3 bg-gradient-to-br from-orange-300/70 to-red-400/80 rounded-full border border-orange-200/60 relative">
                                    <div className="absolute inset-0.5 bg-gradient-to-br from-orange-400/60 to-red-500/70 rounded-full"></div>
                                  </div>
                                  <span className="font-bold text-orange-700">{leaderboardData[3].current_streak_days}</span>
                                  <span className="text-orange-600 text-xs">streak</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Progress */}
                      <div className="md:text-right">
                        <div className="mb-2 md:mb-4">
                          <div className="text-2xl md:text-3xl font-bold text-black mb-2">
                            {Math.round(parseFloat(leaderboardData[3].journey_completion_percentage))}%
                            </div>
                          <div className="w-full md:w-32 h-3 bg-white/20 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${Math.min(parseFloat(leaderboardData[3].journey_completion_percentage), 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        <div className="text-xs text-black/60 bg-white/10 px-2 py-1 rounded-full inline-block">
                            {leaderboardData[3].surveys_completed}/2 surveys
                        </div>
                        </div>
                      </div>
                    </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 md:mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20">
              <span className="text-sm text-black/60">
                Showing top 3 performers and honorable mention • Rankings update in real-time
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default LeaderboardPage 