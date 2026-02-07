import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      await loadProgressDistribution()
      
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
        <button
          onClick={onClose}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
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
