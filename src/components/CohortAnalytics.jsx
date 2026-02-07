import { useState, useEffect } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

function CohortAnalytics() {
  const { profile, isSuperAdmin, isAdmin } = useUserProfile()
  const [cohortAnalytics, setCohortAnalytics] = useState([])
  const [dashboardSummary, setDashboardSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedView, setSelectedView] = useState('overview') // 'overview', 'cohorts', 'assignments'

  useEffect(() => {
    if (profile && (isAdmin() || isSuperAdmin())) {
      fetchAnalytics()
    }
  }, [profile, isAdmin, isSuperAdmin])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch cohort analytics
      const { data: analytics, error: analyticsError } = await supabase
        .from('cohort_analytics')
        .select('*')
        .order('start_date', { ascending: false })

      if (analyticsError) throw analyticsError

      // Fetch dashboard summary
      const { data: summary, error: summaryError } = await supabase
        .from('admin_dashboard_summary')
        .select('*')
        .order('organization_name')

      if (summaryError) throw summaryError

      setCohortAnalytics(analytics || [])
      setDashboardSummary(summary || [])
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-500'
      case 'Not Started': return 'bg-blue-500'
      case 'Completed': return 'bg-gray-500'
      default: return 'bg-yellow-500'
    }
  }

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'Active': return 'text-green-600'
      case 'Not Started': return 'text-blue-600'
      case 'Completed': return 'text-gray-600'
      default: return 'text-yellow-600'
    }
  }

  if (loading) {
    return (
      <div className="glassmorphism rounded-2xl p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/20 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-white/20 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glassmorphism rounded-2xl p-8">
        <div className="text-red-400 text-center">
          <p className="text-xl mb-4">Error Loading Analytics</p>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-500/20 rounded-lg text-gray-900 hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Cohort Analytics</h2>
          <div className="flex gap-2">
            {['overview', 'cohorts', 'assignments'].map(view => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedView === view 
                    ? 'bg-white/30 text-gray-900' 
                    : 'bg-gray-50 text-gray-600 hover:bg-white/20'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Organization Summary Cards */}
        {selectedView === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {dashboardSummary.map(org => (
              <div key={org.organization_name} className="bg-gray-50 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{org.organization_name}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Cohorts</span>
                    <span className="text-gray-900 font-semibold">{org.total_cohorts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active</span>
                    <span className="text-green-400 font-semibold">{org.active_cohorts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants</span>
                    <span className="text-gray-900 font-semibold">{org.total_participants}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fill Rate</span>
                    <span className="text-blue-400 font-semibold">{org.overall_fill_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admins Assigned</span>
                    <span className="text-teal-400 font-semibold">{org.unique_admins_assigned}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Cohort List */}
      {selectedView === 'cohorts' && (
        <div className="glassmorphism rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Individual Cohorts</h3>
          <div className="grid gap-6">
            {cohortAnalytics.map(cohort => (
              <div key={cohort.id} className="bg-gray-50 rounded-xl p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                  <div>
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">{cohort.name}</h4>
                    <p className="text-gray-600 text-sm">{cohort.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cohort.current_status)} text-gray-900`}>
                        {cohort.current_status}
                      </span>
                      <span className="text-gray-600 text-sm">{cohort.organization_name}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 lg:mt-0 lg:text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {cohort.current_participants}/{cohort.max_participants}
                    </div>
                    <div className="text-sm text-gray-600">participants</div>
                    <div className="text-lg font-semibold text-blue-400 mt-1">
                      {cohort.fill_percentage}% filled
                    </div>
                  </div>
                </div>

                {/* Additional stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/20 text-sm">
                  <div className="text-center">
                    <div className="text-gray-600">Start Date</div>
                    <div className="font-semibold text-gray-900">
                      {new Date(cohort.start_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Duration</div>
                    <div className="font-semibold text-gray-900">{cohort.duration_weeks} weeks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Admins</div>
                    <div className="font-semibold text-teal-400">{cohort.admin_count}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-600">Progress</div>
                    <div className="font-semibold text-blue-400">{cohort.progress_percentage || 0}%</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${cohort.progress_percentage}%` }}
                  ></div>
                </div>

                {/* Facilitator and Admins */}
                <div className="flex flex-col md:flex-row md:justify-between text-sm">
                  <div>
                    {cohort.facilitator_email && (
                      <span className="text-gray-600">
                        Facilitator: <span className="text-gray-900">{cohort.facilitator_first_name} {cohort.facilitator_last_name}</span>
                      </span>
                    )}
                  </div>
                  <div>
                    {cohort.assigned_admins && cohort.assigned_admins.length > 0 && (
                      <span className="text-gray-600">
                        Admins: <span className="text-purple-400">{cohort.admin_count}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Assignments Management */}
      {selectedView === 'assignments' && isSuperAdmin() && (
        <div className="glassmorphism rounded-2xl p-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Admin Assignments</h3>
          <div className="text-center text-gray-600 py-8">
            <p className="text-lg mb-4">Admin Assignment Management</p>
            <p className="text-sm">Feature coming soon - ability to assign/unassign admins to cohorts</p>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchAnalytics}
          className="glassmorphism px-6 py-3 rounded-lg text-gray-900 hover:bg-white/20 transition-all"
        >
          Refresh Analytics
        </button>
      </div>
    </div>
  )
}

export default CohortAnalytics 