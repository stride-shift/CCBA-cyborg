import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function DashboardMetrics() {
  const [metrics, setMetrics] = useState({
    userStats: { total: 0, active: 0, newThisWeek: 0 },
    cohortStats: { total: 0, active: 0, avgSize: 0 },
    engagementStats: { 
      reflectionsThisWeek: 0, 
      challengeCompletions: 0, 
      avgCompletionRate: 0 
    }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Run all queries in parallel for speed
      const [
        userStatsResult,
        cohortStatsResult, 
        engagementStatsResult
      ] = await Promise.all([
        getUserStats(),
        getCohortStats(),
        getEngagementStats()
      ])

      setMetrics({
        userStats: userStatsResult,
        cohortStats: cohortStatsResult,
        engagementStats: engagementStatsResult
      })

      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading dashboard metrics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getUserStats = async () => {
    // Get users with profiles (we'll use this as total users since auth.users isn't accessible)
    const { count: totalUsers, error: totalError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get users with profiles in cohorts (active users)  
    const { count: activeUsers, error: activeError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .not('cohort_id', 'is', null)

    if (activeError) throw activeError

    // Get new users this week from user_profiles (created_at)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const { count: newUsers, error: newError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneWeekAgo.toISOString())

    if (newError) throw newError

    return {
      total: totalUsers || 0,
      active: activeUsers || 0,
      newThisWeek: newUsers || 0
    }
  }

  const getCohortStats = async () => {
    // Get total cohorts
    const { count: totalCohorts, error: totalError } = await supabase
      .from('cohorts')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Get active cohorts
    const { count: activeCohorts, error: activeError } = await supabase
      .from('cohorts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('status', 'active')

    if (activeError) throw activeError

    // Get average cohort size using the cohort_stats view
    const { data: cohortSizes, error: sizeError } = await supabase
      .from('cohort_stats')
      .select('current_participants')

    if (sizeError) throw sizeError

    const avgSize = cohortSizes?.length > 0 
      ? Math.round(cohortSizes.reduce((sum, c) => sum + (c.current_participants || 0), 0) / cohortSizes.length)
      : 0

    return {
      total: totalCohorts || 0,
      active: activeCohorts || 0,
      avgSize
    }
  }

  const getEngagementStats = async () => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Get reflections this week
    const { count: reflections, error: reflectionError } = await supabase
      .from('user_reflections')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', oneWeekAgo.toISOString())

    if (reflectionError) throw reflectionError

    // Get challenge completions this week  
    const { count: challenges, error: challengeError } = await supabase
      .from('user_challenge_completions')
      .select('*', { count: 'exact', head: true })
      .gte('completed_at', oneWeekAgo.toISOString())

    if (challengeError) throw challengeError

    // Get average completion rate from user_journey_analytics
    const { data: journeyData, error: journeyError } = await supabase
      .from('user_journey_analytics')
      .select('journey_completion_percentage')

    if (journeyError) throw journeyError

    const avgCompletionRate = journeyData?.length > 0
      ? Math.round(journeyData.reduce((sum, u) => sum + (u.journey_completion_percentage || 0), 0) / journeyData.length)
      : 0

    return {
      reflectionsThisWeek: reflections || 0,
      challengeCompletions: challenges || 0,
      avgCompletionRate
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Loading dashboard metrics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">Failed to load metrics: {error}</p>
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-red-500/20 rounded-lg text-white hover:bg-red-500/30 transition-all"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-black">Overview</h2>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-gray-600 text-sm">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadMetrics}
            className="px-4 py-2 bg-white/20 rounded-lg text-black hover:bg-white/30 transition-all text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* User Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4">User Activity</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.userStats.total.toLocaleString()}
            </div>
            <div className="text-black font-medium">Total Users</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.userStats.active.toLocaleString()}
            </div>
            <div className="text-black font-medium">Active Users</div>
            <div className="text-gray-700 text-xs mt-1">
              ({metrics.userStats.total > 0 ? Math.round((metrics.userStats.active / metrics.userStats.total) * 100) : 0}% of total)
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.userStats.newThisWeek.toLocaleString()}
            </div>
            <div className="text-black font-medium">New This Week</div>
          </div>
        </div>
      </div>

      {/* Cohort Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4">Cohort Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.cohortStats.total}
            </div>
            <div className="text-black font-medium">Total Cohorts</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.cohortStats.active}
            </div>
            <div className="text-black font-medium">Active Cohorts</div>
            <div className="text-gray-700 text-xs mt-1">
              ({metrics.cohortStats.total > 0 ? Math.round((metrics.cohortStats.active / metrics.cohortStats.total) * 100) : 0}% of total)
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.cohortStats.avgSize}
            </div>
            <div className="text-black font-medium">Avg Cohort Size</div>
          </div>
        </div>
      </div>

      {/* Engagement Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-black mb-4">Weekly Engagement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.engagementStats.reflectionsThisWeek.toLocaleString()}
            </div>
            <div className="text-black font-medium">Reflections Submitted</div>
            <div className="text-gray-700 text-xs mt-1">Last 7 days</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.engagementStats.challengeCompletions.toLocaleString()}
            </div>
            <div className="text-black font-medium">Challenge Completions</div>
            <div className="text-gray-700 text-xs mt-1">Last 7 days</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-white mb-2">
              {metrics.engagementStats.avgCompletionRate}%
            </div>
            <div className="text-black font-medium">Avg Progress</div>
            <div className="text-gray-700 text-xs mt-1">Journey completion</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardMetrics 