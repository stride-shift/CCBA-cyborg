import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAdminState } from '../contexts/AdminStateContext'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import SimpleCohortViewer from '../components/SimpleCohortViewer'
import DashboardMetrics from '../components/DashboardMetrics'
import SuperAdminManagement from '../components/SuperAdminManagement'
import CohortDetailView from '../components/CohortDetailView'
import { supabase } from '../lib/supabase'

// Modal component for cohort detail view (same as in CohortManagement)
function CohortModal({ isOpen, onClose, children }) {
  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        zIndex: 10000,
        minHeight: '100vh',
        maxHeight: '100vh'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="glassmorphism rounded-2xl p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative mx-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

function NewAdminPage() {
  const { profile, loading: profileLoading, isAdmin, isSuperAdmin } = useUserProfile()
  const { currentTab, setCurrentTab } = useAdminState()
  const [data, setData] = useState({
    cohorts: [],
    loading: false,
    error: null
  })
  const [authCheckDelay, setAuthCheckDelay] = useState(true)
  const [selectedCohort, setSelectedCohort] = useState(null)
  const [showDetailView, setShowDetailView] = useState(false)

  const openDetailView = (cohort) => {
    setSelectedCohort(cohort)
    setShowDetailView(true)
  }

  const closeDetailView = () => {
    setShowDetailView(false)
    setSelectedCohort(null)
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showDetailView) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showDetailView])

  // Add a small delay to allow auth state to stabilize during navigation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthCheckDelay(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // Load basic data when tab changes or profile changes
  useEffect(() => {
    if (currentTab === 'cohorts' && profile) {
      loadCohorts()
    }
  }, [currentTab, profile])

  const loadCohorts = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      let cohorts = []
      
      if (isSuperAdmin()) {
        // Super admins can see all cohorts
        console.log('🔑 Loading all cohorts for super admin')
        const { data, error } = await supabase
          .from('cohorts')
          .select('*')
          .order('name')
        
        if (error) throw error
        cohorts = data || []
        console.log('📋 Super admin can see', cohorts.length, 'cohorts')
      } else {
        // Regular admins can only see cohorts they're assigned to
        console.log('👤 Loading assigned cohorts for admin:', profile?.user_id)
        console.log('👤 Full profile:', profile)
        
        if (!profile?.user_id) {
          console.warn('⚠️ No user_id in profile, falling back to all cohorts')
          // Fallback to all cohorts if profile not loaded yet
          const { data, error } = await supabase
            .from('cohorts')
            .select('*')
            .order('name')
          
          if (error) throw error
          cohorts = data || []
        } else {
          const { data, error } = await supabase
            .from('admin_cohort_assignments')
            .select(`
              cohort_id,
              cohorts(*)
            `)
            .eq('admin_user_id', profile.user_id)
            .eq('is_active', true)
          
          console.log('🔍 Assignment query result:', data)
          console.log('🔍 Assignment query error:', error)
          
          if (error) throw error
          cohorts = data?.map(assignment => assignment.cohorts).filter(Boolean) || []
          cohorts.sort((a, b) => a.name.localeCompare(b.name))
        }
        
        console.log('📋 Admin can see', cohorts.length, 'assigned cohorts:', cohorts.map(c => c.name))
      }

      setData(prev => ({ 
        ...prev, 
        cohorts: cohorts,
        loading: false 
      }))
    } catch (err) {
      console.error('Error loading cohorts:', err)
      setData(prev => ({ 
        ...prev, 
        error: 'Failed to load cohorts: ' + err.message,
        loading: false 
      }))
    }
  }

  // Check authentication - only after delay and profile loading is complete
  if (authCheckDelay || profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-white flex items-center justify-center">
          <div className="text-center glassmorphism rounded-2xl p-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
            <p className="text-xl">Loading...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Now check authentication after state has stabilized
  if (!profile || (!isAdmin() && !isSuperAdmin())) {
    return <Navigate to="/" replace />
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Simple Header */}
        <div className="glassmorphism rounded-2xl p-8 mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Admin Dashboard</h1>
          <p className="text-white/80">
            Welcome, {profile?.first_name || 'Admin'} • Role: {profile?.role}
          </p>
        </div>

        {/* Simple Tab Navigation */}
        <div className="glassmorphism rounded-2xl p-6 mb-8">
          <div className="flex gap-4">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('cohorts')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'cohorts'
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Cohorts
            </button>
            <button
              onClick={() => setCurrentTab('users')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'users'
                  ? 'bg-white/30 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Cohort Users
            </button>
            {isSuperAdmin() && (
              <button
                onClick={() => setCurrentTab('super-admin')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  currentTab === 'super-admin'
                    ? 'bg-white/30 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Super Admin
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className={`glassmorphism rounded-2xl p-8 ${currentTab === 'dashboard' ? '' : 'hidden'}`}>
          <DashboardMetrics />
        </div>

        <div className={`glassmorphism rounded-2xl p-8 ${currentTab === 'users' ? '' : 'hidden'}`}>
          <h2 className="text-2xl font-bold text-white mb-6">Cohort User Management</h2>
          <SimpleCohortViewer />
        </div>

        {isSuperAdmin() && (
          <div className={`glassmorphism rounded-2xl p-8 ${currentTab === 'super-admin' ? '' : 'hidden'}`}>
            <SuperAdminManagement />
          </div>
        )}

        {currentTab === 'cohorts' && (
          <div className="glassmorphism rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Cohorts Overview</h2>
              <button 
                onClick={loadCohorts}
                className="px-4 py-2 bg-white/20 rounded-lg text-black hover:bg-white/30 transition-all"
              >
                Refresh
              </button>
            </div>

            {data.loading ? (
              <div className="text-center py-8">
                <div className="text-white">Loading cohorts...</div>
              </div>
            ) : data.error ? (
              <div className="text-center py-8">
                <div className="text-red-300">Error: {data.error}</div>
              </div>
            ) : data.cohorts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-white/70">No cohorts found</div>
              </div>
            ) : (
              <div className="space-y-4">
                {data.cohorts.map(cohort => (
                  <div key={cohort.id} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-white">{cohort.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            cohort.is_active 
                              ? 'bg-green-500/20 text-white'
                              : 'bg-yellow-500/20 text-white'
                          }`}>
                            {cohort.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-white/70 text-sm mb-2">{cohort.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-white/20 px-2 py-1 rounded text-white/90">
                            {cohort.organization_name}
                          </span>
                          {cohort.start_date && (
                            <span className="bg-white/20 px-2 py-1 rounded text-white/90">
                              Starts: {new Date(cohort.start_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 lg:mt-0 lg:text-right">
                        <button
                          onClick={() => openDetailView(cohort)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-black hover:bg-white/30 transition-all text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          View cohort details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cohort Detail View Modal */}
      {showDetailView && selectedCohort && (
        <CohortModal isOpen={showDetailView} onClose={closeDetailView}>
          <CohortDetailView 
            cohort={selectedCohort} 
            onClose={closeDetailView}
          />
        </CohortModal>
      )}
    </Layout>
  )
}

export default NewAdminPage 