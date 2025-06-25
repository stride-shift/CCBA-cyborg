import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import CohortDetailView from './CohortDetailView'
import { useFormPersistence, useModalPersistence, useAdminUIState } from '../hooks/useAdminStatePersistence'

// Modal component for cohort create/edit
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

function CohortManagement() {
  // Persisted UI state (search, filters)
  const { 
    searchTerm, 
    setSearchTerm 
  } = useAdminUIState('cohort_management')

  // Persisted form state
  const { 
    formData: cohortForm, 
    updateForm: setCohortForm, 
    resetForm: resetCohortForm,
    setFormField: setCohortFormField 
  } = useFormPersistence('cohort_management', {
    name: '',
    description: '',
    organization_name: '',
    start_date: '',
    end_date: '',
    max_participants: '',
    is_active: true
  })

  // Persisted modal state
  const { 
    isOpen: showModal, 
    editingItem: editingCohort, 
    openModal: openPersistedModal, 
    closeModal: closePersistedModal 
  } = useModalPersistence('cohort_management')

  // Detail view modal state (separate from main modal)
  const { 
    isOpen: showDetailView, 
    editingItem: selectedCohortForDetails, 
    openModal: openDetailModal, 
    closeModal: closeDetailModal 
  } = useModalPersistence('cohort_detail_view')

  // Non-persisted state (reloaded data)
  const [cohorts, setCohorts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Load cohorts on mount
  useEffect(() => {
    loadCohorts()
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal || showDetailView) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showModal, showDetailView])

  const loadCohorts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cohorts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCohorts(data || [])
    } catch (err) {
      console.error('Error loading cohorts:', err)
      setMessage('Error loading cohorts: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const cohortData = {
        name: cohortForm.name,
        description: cohortForm.description || null,
        organization_name: cohortForm.organization_name || null,
        start_date: cohortForm.start_date || null,
        end_date: cohortForm.end_date || null,
        max_participants: cohortForm.max_participants ? parseInt(cohortForm.max_participants) : null,
        is_active: cohortForm.is_active
      }

      if (editingCohort) {
        // Update existing cohort
        const { error } = await supabase
          .from('cohorts')
          .update(cohortData)
          .eq('id', editingCohort.id)

        if (error) throw error
        setMessage(`Cohort "${cohortForm.name}" updated successfully!`)
      } else {
        // Create new cohort
        const { error } = await supabase
          .from('cohorts')
          .insert([cohortData])

        if (error) throw error
        setMessage(`Cohort "${cohortForm.name}" created successfully!`)
      }

      closePersistedModal()
      resetCohortForm()
      loadCohorts()
    } catch (err) {
      console.error('Error saving cohort:', err)
      setMessage('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (cohort = null) => {
    if (cohort) {
      // Update form with cohort data
      setCohortForm({
        name: cohort.name || '',
        description: cohort.description || '',
        organization_name: cohort.organization_name || '',
        start_date: cohort.start_date || '',
        end_date: cohort.end_date || '',
        max_participants: cohort.max_participants?.toString() || '',
        is_active: cohort.is_active !== false
      })
      // Open modal with editing cohort
      openPersistedModal(cohort)
    } else {
      // Reset form for new cohort
      resetCohortForm()
      // Open modal without editing cohort
      openPersistedModal(null)
    }
  }

  const closeModal = () => {
    resetCohortForm()
    closePersistedModal()
  }

  const openDetailView = (cohort) => {
    openDetailModal(cohort)
  }

  const closeDetailView = () => {
    closeDetailModal()
  }

  const deleteCohort = async (cohortId, cohortName) => {
    if (!confirm(`Are you sure you want to delete cohort "${cohortName}"? This action cannot be undone and will affect all users in this cohort.`)) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('cohorts')
        .delete()
        .eq('id', cohortId)

      if (error) throw error

      setMessage(`Cohort "${cohortName}" deleted successfully`)
      loadCohorts()
    } catch (err) {
      console.error('Error deleting cohort:', err)
      setMessage('Error deleting cohort: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredCohorts = cohorts.filter(cohort => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      cohort.name?.toLowerCase().includes(searchLower) ||
      cohort.organization_name?.toLowerCase().includes(searchLower) ||
      cohort.description?.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-6">
      {/* Message Display */}
      {message && (
        <div className={`glassmorphism rounded-xl p-4 ${
          message.includes('Error') || message.includes('failed') 
            ? 'bg-red-500/20 border border-red-500/30' 
            : 'bg-green-500/20 border border-green-500/30'
        }`}>
          <div className="flex items-center gap-2">
            {message.includes('Error') || message.includes('failed') ? (
              <span className="text-red-400 text-lg">❌</span>
            ) : (
              <span className="text-green-400 text-lg">✅</span>
            )}
            <p className="text-white font-medium">{message}</p>
          </div>
        </div>
      )}

      {/* Header with search and add button */}
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Cohort Management</h3>
            <p className="text-gray-600">Create, edit, and manage cohorts</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search cohorts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 px-4 py-3 pl-12 rounded-xl bg-white/90 border border-white/30 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Add Cohort Button */}
            <button
              onClick={() => openModal()}
              className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium flex items-center gap-2 whitespace-nowrap border border-white/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Cohort
            </button>
          </div>
        </div>
      </div>

      {/* Cohorts List */}
      <div className="glassmorphism rounded-2xl p-6">
        {filteredCohorts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-white/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="text-xl font-medium text-gray-800 mb-2">
              {searchTerm ? 'No cohorts found' : 'No cohorts yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? `No cohorts match "${searchTerm}"`
                : 'Get started by creating your first cohort'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => openModal()}
                className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium border border-white/30"
              >
                Create First Cohort
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              {filteredCohorts.length} cohort{filteredCohorts.length !== 1 ? 's' : ''} 
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
            
            {filteredCohorts.map(cohort => (
              <div key={cohort.id} className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-xl p-4 hover:bg-white/90 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-gray-800 font-semibold text-lg truncate">
                        {cohort.name}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        cohort.is_active 
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                        {cohort.is_active ? 'Active' : 'Inactive'}
                      </span>

                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-700">
                      <div>
                        <span className="font-medium">Organization:</span> {cohort.organization_name || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Start Date:</span> {cohort.start_date ? new Date(cohort.start_date).toLocaleDateString() : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">End Date:</span> {cohort.end_date ? new Date(cohort.end_date).toLocaleDateString() : 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Max Participants:</span> {cohort.max_participants || 'No limit'}
                      </div>
                    </div>
                    
                    {cohort.description && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Description:</span> {cohort.description}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openDetailView(cohort)}
                      className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg transition-all"
                      title="View cohort details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => openModal(cohort)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all"
                      title="Edit cohort"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={() => deleteCohort(cohort.id, cohort.name)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                      title="Delete cohort"
                      disabled={loading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CohortModal isOpen={showModal} onClose={closeModal}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">
            {editingCohort ? 'Edit Cohort' : 'Create New Cohort'}
          </h3>
          <button
            onClick={closeModal}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-white font-medium mb-2">Cohort Name *</label>
              <input
                type="text"
                value={cohortForm.name}
                onChange={(e) => setCohortFormField('name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                placeholder="e.g., Spring 2025 Cohort"
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Organization</label>
              <input
                type="text"
                value={cohortForm.organization_name}
                onChange={(e) => setCohortFormField('organization_name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                placeholder="e.g., Acme Corporation"
              />
            </div>



            <div>
              <label className="block text-white font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={cohortForm.start_date}
                onChange={(e) => setCohortFormField('start_date', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">End Date</label>
              <input
                type="date"
                value={cohortForm.end_date}
                onChange={(e) => setCohortFormField('end_date', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Max Participants</label>
              <input
                type="number"
                value={cohortForm.max_participants}
                onChange={(e) => setCohortFormField('max_participants', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                min="1"
                placeholder="Leave empty for no limit"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-white font-medium mb-2">Description</label>
              <textarea
                value={cohortForm.description}
                onChange={(e) => setCohortFormField('description', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all resize-none"
                placeholder="Describe the cohort purpose and goals..."
                rows="3"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active_modal"
              checked={cohortForm.is_active}
              onChange={(e) => setCohortFormField('is_active', e.target.checked)}
              className="w-4 h-4 rounded border-white/30 bg-white/20 text-white focus:ring-white/50"
            />
            <label htmlFor="is_active_modal" className="ml-3 text-white font-medium">
              Active Cohort
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all border border-white/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-white/30"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              )}
              {loading ? (editingCohort ? 'Updating...' : 'Creating...') : (editingCohort ? 'Update Cohort' : 'Create Cohort')}
            </button>
          </div>
        </form>
      </CohortModal>

      {/* Cohort Detail View Modal */}
      {showDetailView && selectedCohortForDetails && (
        <CohortModal isOpen={showDetailView} onClose={closeDetailView}>
          <CohortDetailView 
            cohort={selectedCohortForDetails} 
            onClose={closeDetailView}
          />
        </CohortModal>
      )}
    </div>
  )
}

export default CohortManagement
