import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function CohortDetailView({ cohort, onClose }) {
  const [metrics, setMetrics] = useState({
    participants: { total: 0, active: 0, newThisWeek: 0 },
    engagement: { reflectionsThisWeek: 0, challengeCompletions: 0, avgCompletionRate: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (cohort?.id) {
      loadCohortMetrics()
    }
  }, [cohort?.id])

  const loadCohortMetrics = async () => {
    try {
      setLoading(true)
      // Simple participant count for now
      const { count } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('cohort_id', cohort.id)

      setMetrics(prev => ({ ...prev, participants: { ...prev.participants, total: count || 0 } }))
    } catch (err) {
      console.error('Error loading cohort metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{cohort.name}</h2>
          <p className="text-white">{cohort.organization_name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {loading ? '...' : metrics.participants.total}
          </div>
          <div className="text-white font-medium">Participants</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-green-400 mb-2">
            {cohort.is_active ? 'Active' : 'Inactive'}
          </div>
          <div className="text-white font-medium">Status</div>
        </div>
      </div>

      {/* Cohort Details */}
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-white/70">Start Date:</span>
            <span className="text-white ml-2">
              {cohort.start_date ? new Date(cohort.start_date).toLocaleDateString() : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-white/70">End Date:</span>
            <span className="text-white ml-2">
              {cohort.end_date ? new Date(cohort.end_date).toLocaleDateString() : 'Not set'}
            </span>
          </div>
          <div>
            <span className="text-white/70">Max Participants:</span>
            <span className="text-white ml-2">{cohort.max_participants || 'No limit'}</span>
          </div>
          <div>
            <span className="text-white/70">Created:</span>
            <span className="text-white ml-2">
              {new Date(cohort.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {cohort.description && (
          <div className="mt-4">
            <span className="text-white/70">Description:</span>
            <p className="text-white mt-1">{cohort.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CohortDetailView
