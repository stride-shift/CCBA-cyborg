import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUserProfile } from '../hooks/useUserProfile'
import { useAdminState } from '../contexts/AdminStateContext'
import { useAdminUIState } from '../hooks/useAdminStatePersistence'
import { Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import SimpleCohortViewer from '../components/SimpleCohortViewer'
import DashboardMetrics from '../components/DashboardMetrics'
import SuperAdminManagement from '../components/SuperAdminManagement'
import CohortDetailView from '../components/CohortDetailView'
import CohortDataExporter from '../components/CohortDataExporter'
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
  const { 
    searchTerm, 
    setSearchTerm 
  } = useAdminUIState('cohort_listing')
  
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
    if ((currentTab === 'cohorts' || currentTab === 'export') && profile) {
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

  // Filter cohorts based on search term
  const filteredCohorts = data.cohorts.filter(cohort => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      cohort.name?.toLowerCase().includes(searchLower) ||
      cohort.organization_name?.toLowerCase().includes(searchLower) ||
      cohort.description?.toLowerCase().includes(searchLower)
    )
  })

  // Check authentication - only after delay and profile loading is complete
  if (authCheckDelay || profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 flex items-center justify-center">
          <div className="text-center glassmorphism rounded-2xl p-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#C41E3A] mx-auto mb-6"></div>
            <p className="text-xl text-gray-700">Loading...</p>
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
          <h1 className="text-4xl font-bold text-[#C41E3A] mb-4">Admin Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {profile?.first_name || 'Admin'} • Role: {profile?.role}
          </p>
        </div>

        {/* Simple Tab Navigation */}
        <div className="glassmorphism rounded-2xl p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-[#C41E3A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab('cohorts')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'cohorts'
                  ? 'bg-[#C41E3A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cohorts
            </button>
            <button
              onClick={() => setCurrentTab('users')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'users'
                  ? 'bg-[#C41E3A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cohort Users
            </button>
            <button
              onClick={() => setCurrentTab('export')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                currentTab === 'export'
                  ? 'bg-[#C41E3A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Export Data
            </button>
            {isSuperAdmin() && (
              <button
                onClick={() => setCurrentTab('super-admin')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  currentTab === 'super-admin'
                    ? 'bg-[#C41E3A] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Cohort User Management</h2>
          <SimpleCohortViewer />
        </div>

        {isSuperAdmin() && (
          <div className={`glassmorphism rounded-2xl p-8 ${currentTab === 'super-admin' ? '' : 'hidden'}`}>
            <SuperAdminManagement />
          </div>
        )}

        {currentTab === 'cohorts' && (
          <div className="glassmorphism rounded-2xl p-8">
            {/* Header with search and refresh button */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Cohorts Overview</h2>
                <p className="text-gray-600">View and manage your assigned cohorts</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search cohorts by name, organization, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-80 px-4 py-3 pl-12 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent transition-all"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Refresh Button */}
                <button 
                  onClick={loadCohorts}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium flex items-center gap-2 whitespace-nowrap border border-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {data.loading ? (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading cohorts...</div>
              </div>
            ) : data.error ? (
              <div className="text-center py-8">
                <div className="text-red-600">Error: {data.error}</div>
              </div>
            ) : filteredCohorts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">
                  {searchTerm ? `No cohorts found matching "${searchTerm}"` : 'No cohorts found'}
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCohorts.map(cohort => (
                  <div key={cohort.id} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{cohort.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            cohort.is_active 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {cohort.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{cohort.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-gray-200 px-2 py-1 rounded text-gray-700">
                            {cohort.organization_name}
                          </span>
                          {cohort.start_date && (
                            <span className="bg-gray-200 px-2 py-1 rounded text-gray-700">
                              Starts: {new Date(cohort.start_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-4 lg:mt-0 lg:text-right">
                        <button
                          onClick={() => openDetailView(cohort)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#C41E3A] rounded-lg text-white hover:bg-[#a01830] transition-all text-sm"
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

        {currentTab === 'export' && (
          <div className="glassmorphism rounded-2xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Cohort Data</h2>
              <p className="text-gray-600">Download CSV files for any cohort's data</p>
            </div>

            {data.loading ? (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading cohorts...</div>
              </div>
            ) : data.error ? (
              <div className="text-center py-8">
                <div className="text-red-600">Error: {data.error}</div>
              </div>
            ) : filteredCohorts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500">No cohorts available for export</div>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredCohorts.map(cohort => (
                  <div key={cohort.id}>
                    <CohortDataExporter 
                      cohortId={cohort.id}
                      cohortName={cohort.name}
                    />
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