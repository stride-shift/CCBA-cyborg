import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

function CohortDetailView({ cohort, onClose }) {
  const [cohortStats, setCohortStats] = useState({
    // Basic stats
    total_users: 0,
    active_users: 0,
    completed_users: 0,
    
    // Progress metrics
    avg_completion_percentage: 0,
    avg_days_completed: 0,
    avg_current_streak: 0,
    
    // Engagement metrics
    total_challenges_completed: 0,
    total_reflections_submitted: 0,
    
    // Survey metrics
    users_completed_pre_survey: 0,
    users_completed_post_survey: 0,
    
    // Activity metrics
    users_active_last_7_days: 0,
    users_active_last_day: 0
  })
  
  const [progressDistribution, setProgressDistribution] = useState([])
  const [inactiveUsers, setInactiveUsers] = useState([])
  const [reflectionGaps, setReflectionGaps] = useState([])
  const [lowQualityReflections, setLowQualityReflections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [showReflectionFlags, setShowReflectionFlags] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (cohort?.id) {
      loadCohortAnalytics()
    }
  }, [cohort?.id])

  const loadCohortAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load comprehensive cohort performance data
      const { data: performanceData, error: performanceError } = await supabase
        .from('cohort_performance_summary')
        .select('*')
        .eq('cohort_id', cohort.id)
        .single()

      if (performanceError) {
        console.warn('Performance summary not available, using fallback')
        await loadFallbackData()
        return
      }

      if (performanceData) {
        setCohortStats(performanceData)
      }

      // Load progress distribution for visualization
      await Promise.all([
        loadProgressDistribution(),
        loadInactiveUsers(),
        loadReflectionFlags()
      ])
      
    } catch (err) {
      console.error('Error loading cohort analytics:', err)
      setError(err.message)
      await loadFallbackData()
    } finally {
      setLoading(false)
    }
  }

  const loadFallbackData = async () => {
    try {
      // Fallback to basic participant count
      const { count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('cohort_id', cohort.id)
        .eq('role', 'user')

      setCohortStats(prev => ({ ...prev, total_users: count || 0 }))
    } catch (err) {
      console.error('Error loading fallback data:', err)
    }
  }

  const loadProgressDistribution = async () => {
    try {
      // Get individual user progress for distribution analysis
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('cohort_id', cohort.id)
        .eq('role', 'user')

      if (usersError || !users?.length) return

      const userIds = users.map(u => u.user_id)
      
      const { data: progressData, error: progressError } = await supabase
        .rpc('get_cohort_user_progress', { cohort_user_ids: userIds })

      if (progressError) {
        console.warn('Progress distribution not available')
        return
      }

      // Create progress distribution buckets
      const distribution = [
        { label: 'Not Started', count: 0, color: 'bg-gray-500' },
        { label: '1-25%', count: 0, color: 'bg-red-500' },
        { label: '26-50%', count: 0, color: 'bg-orange-500' },
        { label: '51-75%', count: 0, color: 'bg-yellow-500' },
        { label: '76-99%', count: 0, color: 'bg-blue-500' },
        { label: 'Complete', count: 0, color: 'bg-green-500' }
      ]

      progressData?.forEach(user => {
        const progress = user.journey_completion_percentage || 0
        if (progress === 0) distribution[0].count++
        else if (progress <= 25) distribution[1].count++
        else if (progress <= 50) distribution[2].count++
        else if (progress <= 75) distribution[3].count++
        else if (progress < 100) distribution[4].count++
        else distribution[5].count++
      })

      setProgressDistribution(distribution)
    } catch (err) {
      console.error('Error loading progress distribution:', err)
    }
  }

  const loadInactiveUsers = async () => {
    try {
      // Get all users in this cohort
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .eq('cohort_id', cohort.id)
        .eq('role', 'user')

      if (usersError || !users?.length) return

      const userIds = users.map(u => u.user_id)

      // Get journey analytics for last_activity_at
      const { data: analytics, error: analyticsError } = await supabase
        .from('user_journey_analytics')
        .select('user_id, last_activity_at, total_days_completed')
        .in('user_id', userIds)

      if (analyticsError) return

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const inactive = users.map(user => {
        const stats = analytics?.find(a => a.user_id === user.user_id)
        const lastActivity = stats?.last_activity_at ? new Date(stats.last_activity_at) : null
        const daysSinceActivity = lastActivity
          ? Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24))
          : null
        const isInactive = !lastActivity || lastActivity < sevenDaysAgo
        const daysCompleted = stats?.total_days_completed || 0

        return {
          ...user,
          lastActivity,
          daysSinceActivity,
          isInactive,
          daysCompleted,
          neverActive: !lastActivity
        }
      }).filter(u => u.isInactive)
        .sort((a, b) => (b.daysSinceActivity || 999) - (a.daysSinceActivity || 999))

      setInactiveUsers(inactive)
    } catch (err) {
      console.error('Error loading inactive users:', err)
    }
  }

  const loadReflectionFlags = async () => {
    try {
      // Use RPC for accurate counts (avoids 1000-row PostgREST limit)
      const { data: rpcUsers, error: rpcError } = await supabase
        .rpc('get_cohort_users_with_stats', { target_cohort_id: cohort.id })

      if (rpcError || !rpcUsers?.length) return

      // Find users with missing reflections
      const gaps = rpcUsers.map(user => {
        const completionCount = Number(user.total_days_completed) || 0
        const reflectionCount = Number(user.total_reflections_submitted) || 0
        const missing = completionCount - reflectionCount
        return { user_id: user.user_id, first_name: user.first_name, last_name: user.last_name, completionCount, reflectionCount, missing }
      }).filter(u => u.missing > 0)
        .sort((a, b) => b.missing - a.missing)

      setReflectionGaps(gaps)

      // Get low quality reflections (only those with word_count < 10, small result set)
      const { data: lowQualityData } = await supabase
        .from('user_reflections')
        .select('user_id, reflection_text, word_count')
        .in('user_id', rpcUsers.map(u => u.user_id))
        .lt('word_count', 10)

      const lowQuality = []
      for (const r of (lowQualityData || [])) {
        const user = rpcUsers.find(u => u.user_id === r.user_id)
        if (user) {
          lowQuality.push({
            first_name: user.first_name,
            last_name: user.last_name,
            user_id: r.user_id,
            text: r.reflection_text,
            wordCount: r.word_count || 0
          })
        }
      }
      setLowQualityReflections(lowQuality)
    } catch (err) {
      console.error('Error loading reflection flags:', err)
    }
  }

  const exportCohortSnapshot = async () => {
    try {
      setIsExporting(true)
      const wb = XLSX.utils.book_new()

      // Sheet 1: Overview (the stats visible on screen)
      const overview = [
        [`${cohort.name} — Cohort Snapshot (${new Date().toISOString().split('T')[0]})`],
        [],
        ['KEY METRICS'],
        ['Metric', 'Value'],
        ['Total Users', cohortStats.total_users],
        ['Active Users', cohortStats.active_users],
        ['Avg Progress', `${cohortStats.avg_completion_percentage}%`],
        ['Avg Days Completed', cohortStats.avg_days_completed],
        [],
        ['ENGAGEMENT'],
        ['Engagement Rate', `${getEngagementRate()}%`],
        ['Active Last 7 Days', cohortStats.users_active_last_7_days],
        ['Average Streak', `${cohortStats.avg_current_streak} days`],
        ['Weekly Activity Rate', `${getActivityRate()}%`],
        [],
        ['CONTENT COMPLETION'],
        ['Total Challenges', cohortStats.total_challenges_completed],
        ['Total Reflections', cohortStats.total_reflections_submitted],
        ['Pre-Survey Rate', `${getSurveyCompletionRate(cohortStats.users_completed_pre_survey, cohortStats.total_users)}%`],
        ['Post-Survey Rate', `${getSurveyCompletionRate(cohortStats.users_completed_post_survey, cohortStats.total_users)}%`],
        [],
        ['COHORT DETAILS'],
        ['Start Date', cohort.start_date ? new Date(cohort.start_date).toLocaleDateString() : 'Not set'],
        ['End Date', cohort.end_date ? new Date(cohort.end_date).toLocaleDateString() : 'Not set'],
        ['Status', cohort.is_active ? 'Active' : 'Inactive'],
        ['Completion Rate', cohortStats.total_users > 0 ? `${((cohortStats.completed_users / cohortStats.total_users) * 100).toFixed(1)}%` : '0%'],
      ]

      if (progressDistribution.length > 0) {
        overview.push([], ['PROGRESS DISTRIBUTION'])
        overview.push(['Bracket', 'Count'])
        for (const b of progressDistribution) {
          overview.push([b.label, b.count])
        }
      }

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(overview), 'Overview')

      // Sheet 2: Inactive Participants
      if (inactiveUsers.length > 0) {
        const inactiveData = [
          [`Inactive Participants (${inactiveUsers.length}) — no activity in 7+ days`],
          [],
          ['Name', 'Days Completed', 'Last Active', 'Days Since Activity'],
          ...inactiveUsers.map(u => [
            `${u.first_name} ${u.last_name}`,
            u.daysCompleted,
            u.neverActive ? 'Never' : u.lastActivity?.toLocaleDateString() || '',
            u.neverActive ? 'Never' : u.daysSinceActivity
          ])
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inactiveData), 'Inactive Participants')
      }

      // Sheet 3: Reflection Flags
      if (reflectionGaps.length > 0 || lowQualityReflections.length > 0) {
        const flagData = [
          ['Reflection Flags'],
          []
        ]

        if (reflectionGaps.length > 0) {
          flagData.push(['MISSING REFLECTIONS'])
          flagData.push(['Name', 'Reflections', 'Days Completed', 'Missing'])
          for (const u of reflectionGaps) {
            flagData.push([`${u.first_name} ${u.last_name}`, u.reflectionCount, u.completionCount, u.missing])
          }
          flagData.push([])
        }

        if (lowQualityReflections.length > 0) {
          flagData.push(['LOW QUALITY REFLECTIONS (<10 words)'])
          flagData.push(['Name', 'Reflection Text', 'Word Count'])
          for (const entry of lowQualityReflections) {
            flagData.push([`${entry.first_name} ${entry.last_name}`, entry.text, entry.wordCount])
          }
        }

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(flagData), 'Reflection Flags')
      }

      // Download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const timestamp = new Date().toISOString().split('T')[0]
      a.download = `${cohort.name.replace(/[^a-zA-Z0-9]/g, '_')}_Snapshot_${timestamp}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
  }

  const getEngagementRate = () => {
    if (cohortStats.total_users === 0) return 0
    return ((cohortStats.active_users / cohortStats.total_users) * 100).toFixed(1)
  }

  const getSurveyCompletionRate = (completed, total) => {
    if (total === 0) return 0
    return ((completed / total) * 100).toFixed(1)
  }

  const getActivityRate = () => {
    if (cohortStats.total_users === 0) return 0
    return ((cohortStats.users_active_last_7_days / cohortStats.total_users) * 100).toFixed(1)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/20 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-white/20 rounded"></div>
            <div className="h-24 bg-white/20 rounded"></div>
          </div>
          <div className="h-48 bg-white/20 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{cohort.name}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-200">Error loading cohort analytics: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{cohort.name}</h2>
          <p className="text-gray-600">{cohort.organization_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCohortSnapshot}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#C41E3A] text-white rounded-lg hover:bg-[#a01830] transition-all text-sm font-medium disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {formatNumber(cohortStats.total_users)}
          </div>
          <div className="text-gray-600 text-sm">Total Users</div>
        </div>
        
        <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {formatNumber(cohortStats.active_users)}
          </div>
          <div className="text-gray-600 text-sm">Active Users</div>
        </div>
        
        <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">
            {cohortStats.avg_completion_percentage}%
          </div>
          <div className="text-gray-600 text-sm">Avg Progress</div>
        </div>
        
        <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400 mb-1">
            {cohortStats.avg_days_completed}
          </div>
          <div className="text-gray-600 text-sm">Avg Days</div>
        </div>
      </div>

      {/* Engagement Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engagement Metrics */}
        <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Engagement Rate</span>
              <span className="text-gray-900 font-medium">{getEngagementRate()}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Last 7 Days</span>
              <span className="text-gray-900 font-medium">{cohortStats.users_active_last_7_days}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average Streak</span>
              <span className="text-gray-900 font-medium">{cohortStats.avg_current_streak} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Weekly Activity Rate</span>
              <span className="text-gray-900 font-medium">{getActivityRate()}%</span>
            </div>
          </div>
        </div>

        {/* Content Metrics */}
        <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Completion</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Challenges</span>
              <span className="text-gray-900 font-medium">{formatNumber(cohortStats.total_challenges_completed)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Reflections</span>
              <span className="text-gray-900 font-medium">{formatNumber(cohortStats.total_reflections_submitted)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pre-Survey Rate</span>
              <span className="text-gray-900 font-medium">
                {getSurveyCompletionRate(cohortStats.users_completed_pre_survey, cohortStats.total_users)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Post-Survey Rate</span>
              <span className="text-gray-900 font-medium">
                {getSurveyCompletionRate(cohortStats.users_completed_post_survey, cohortStats.total_users)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Distribution */}
      {progressDistribution.length > 0 && (
        <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {progressDistribution.map((bucket, index) => (
              <div key={index} className="text-center">
                <div className={`${bucket.color} rounded-lg p-3 mb-2`}>
                  <div className="text-gray-900 font-bold text-lg">{bucket.count}</div>
                </div>
                <div className="text-gray-600 text-xs">{bucket.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Users Alert */}
      {inactiveUsers.length > 0 && (
        <div className="bg-gray-50 backdrop-blur-sm border border-red-200 rounded-xl p-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowInactive(!showInactive)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                {inactiveUsers.length}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Inactive Participants</h3>
              <span className="text-gray-500 text-sm">(no activity in 7+ days)</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${showInactive ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {showInactive && (
            <div className="mt-4 space-y-2">
              {inactiveUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                  <div>
                    <span className="font-medium text-gray-900">{user.first_name} {user.last_name}</span>
                    <span className="text-gray-500 text-sm ml-2">({user.daysCompleted} days completed)</span>
                  </div>
                  <div className="text-right">
                    {user.neverActive ? (
                      <span className="text-red-600 text-sm font-medium bg-red-50 px-2 py-1 rounded">Never active</span>
                    ) : (
                      <span className="text-orange-600 text-sm font-medium bg-orange-50 px-2 py-1 rounded">
                        {user.daysSinceActivity} days ago
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reflection Flags */}
      {(reflectionGaps.length > 0 || lowQualityReflections.length > 0) && (
        <div className="bg-gray-50 backdrop-blur-sm border border-yellow-200 rounded-xl p-6">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowReflectionFlags(!showReflectionFlags)}
          >
            <div className="flex items-center gap-3">
              <div className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-semibold">
                {reflectionGaps.length + lowQualityReflections.length}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reflection Flags</h3>
              <span className="text-gray-500 text-sm">(missing or low quality)</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-600 transition-transform ${showReflectionFlags ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {showReflectionFlags && (
            <div className="mt-4 space-y-4">
              {/* Missing Reflections */}
              {reflectionGaps.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Missing Reflections</h4>
                  <div className="space-y-2">
                    {reflectionGaps.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                        <span className="font-medium text-gray-900">{user.first_name} {user.last_name}</span>
                        <div className="text-right text-sm">
                          <span className="text-gray-600">{user.reflectionCount} reflections</span>
                          <span className="text-gray-400 mx-1">/</span>
                          <span className="text-gray-600">{user.completionCount} days completed</span>
                          <span className="text-orange-600 font-medium ml-2 bg-orange-50 px-2 py-1 rounded">
                            {user.missing} missing
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Quality Reflections */}
              {lowQualityReflections.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Low Quality Reflections (&lt;10 words)</h4>
                  <div className="space-y-2">
                    {lowQualityReflections.map((entry, i) => (
                      <div key={i} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100">
                        <div>
                          <span className="font-medium text-gray-900">{entry.first_name} {entry.last_name}</span>
                          <span className="text-red-500 text-sm ml-2 italic">"{entry.text}"</span>
                        </div>
                        <span className="text-red-600 text-sm font-medium bg-red-50 px-2 py-1 rounded">
                          {entry.wordCount} words
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cohort Details */}
      <div className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cohort Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Start Date:</span>
            <span className="text-gray-900 ml-2">
              {cohort.start_date ? new Date(cohort.start_date).toLocaleDateString() : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">End Date:</span>
            <span className="text-gray-900 ml-2">
              {cohort.end_date ? new Date(cohort.end_date).toLocaleDateString() : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Max Participants:</span>
            <span className="text-gray-900 ml-2">{cohort.max_participants || 'No limit'}</span>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <span className={`ml-2 ${cohort.is_active ? 'text-green-400' : 'text-red-400'}`}>
              {cohort.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Created:</span>
            <span className="text-gray-900 ml-2">
              {new Date(cohort.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Completion Rate:</span>
            <span className="text-gray-900 ml-2">
              {cohortStats.total_users > 0 
                ? `${((cohortStats.completed_users / cohortStats.total_users) * 100).toFixed(1)}%`
                : '0%'
              }
            </span>
          </div>
        </div>
        {cohort.description && (
          <div className="mt-4">
            <span className="text-gray-600">Description:</span>
            <p className="text-gray-900 mt-1">{cohort.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CohortDetailView
