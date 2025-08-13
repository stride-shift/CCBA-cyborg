import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import CohortManagement from './CohortManagement'
import BulkUserUpload from './BulkUserUpload'
import { useFormPersistence, useModalPersistence, useAdminUIState } from '../hooks/useAdminStatePersistence'

// Simple inline challenge management component
function ChallengeManagement() {
  const [cohorts, setCohorts] = useState([])
  const [challenges, setChallenges] = useState([])
  const [selectedCohort, setSelectedCohort] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingChallenge, setEditingChallenge] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    order_index: '',
    challenge_1: '',
    challenge_1_type: '',
    challenge_2: '',
    challenge_2_type: '',
    reflection_question: '',
    intended_aha_moments: [''],
    cohort_id: '',
    is_active: true
  })

  // Load cohorts and challenges on mount
  useEffect(() => {
    loadCohorts()
    loadChallenges()
  }, [])

  const loadCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('cohorts')
        .select('id, name, organization_name, is_active')
        .order('name')

      if (error) throw error
      setCohorts(data || [])
    } catch (err) {
      console.error('Error loading cohorts:', err)
      setMessage('Error loading cohorts: ' + err.message)
    }
  }

  const loadChallenges = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('challenges')
        .select(`
          *,
          cohorts(name, organization_name)
        `)
        .order('order_index')

      // Apply cohort filter if selected
      if (selectedCohort) {
        if (selectedCohort === 'default') {
          query = query.is('cohort_id', null)
        } else {
          query = query.eq('cohort_id', selectedCohort)
        }
      }

      const { data, error } = await query

      if (error) throw error
      setChallenges(data || [])
    } catch (err) {
      console.error('Error loading challenges:', err)
      setMessage('Error loading challenges: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Reload challenges when cohort filter changes
  useEffect(() => {
    loadChallenges()
  }, [selectedCohort])

  const openModal = (challenge = null) => {
    if (challenge) {
      setEditingChallenge(challenge)
      setChallengeForm({
        title: challenge.title || '',
        order_index: challenge.order_index?.toString() || '',
        challenge_1: challenge.challenge_1 || '',
        challenge_1_type: challenge.challenge_1_type || '',
        challenge_2: challenge.challenge_2 || '',
        challenge_2_type: challenge.challenge_2_type || '',
        reflection_question: challenge.reflection_question || '',
        intended_aha_moments: challenge.intended_aha_moments?.length > 0 ? challenge.intended_aha_moments : [''],
        cohort_id: challenge.cohort_id || '',
        is_active: challenge.is_active !== false
      })
    } else {
      setEditingChallenge(null)
      setChallengeForm({
        title: '',
        order_index: '',
        challenge_1: '',
        challenge_1_type: '',
        challenge_2: '',
        challenge_2_type: '',
        reflection_question: '',
        intended_aha_moments: [''],
        cohort_id: selectedCohort === 'default' ? '' : selectedCohort,
        is_active: true
      })
    }
    setShowModal(true)
  }

  const filteredChallenges = challenges.filter(challenge => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      challenge.title?.toLowerCase().includes(searchLower) ||
      challenge.challenge_1?.toLowerCase().includes(searchLower) ||
      challenge.challenge_2?.toLowerCase().includes(searchLower) ||
      challenge.order_index?.toString().includes(searchLower) ||
      challenge.cohorts?.name?.toLowerCase().includes(searchLower)
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

      {/* How It Works Info */}
      <div className="glassmorphism rounded-2xl p-6">
        <h4 className="text-xl font-semibold text-gray-800 mb-4">How Cohort-Specific Challenges Work</h4>
        <div className="grid md:grid-cols-2 gap-4 text-gray-700">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <h5 className="font-semibold text-blue-800 mb-2">📚 Default Challenges</h5>
            <p className="text-sm">Challenges without a cohort assignment are used by all cohorts as fallbacks.</p>
          </div>
          
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <h5 className="font-semibold text-purple-800 mb-2">🎯 Cohort-Specific Challenges</h5>
            <p className="text-sm">Assign a challenge to a specific cohort to override the default for that day.</p>
          </div>
        </div>
      </div>

      {/* Header with filters and add button */}
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Challenge Management</h3>
            <p className="text-gray-600">Create default challenges or cohort-specific challenges</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Cohort Filter */}
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="px-4 py-3 rounded-xl bg-white/90 border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            >
              <option value="">All Challenges</option>
              <option value="default">Default Challenges</option>
              {cohorts.map(cohort => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name} ({cohort.organization_name})
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search challenges..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 px-4 py-3 pl-12 rounded-xl bg-white/90 border border-white/30 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Add Challenge Button */}
            <button
              onClick={() => openModal()}
              className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium flex items-center gap-2 whitespace-nowrap border border-white/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Challenge
            </button>
          </div>
        </div>
      </div>

      {/* Challenges List */}
      <div className="glassmorphism rounded-2xl p-6">
        {filteredChallenges.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-800 mb-2">
              {searchTerm ? 'No challenges found' : 'No challenges yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? `No challenges match "${searchTerm}"`
                : 'Get started by creating your first challenge'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => openModal()}
                className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium border border-white/30"
              >
                Create First Challenge
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              {filteredChallenges.length} challenge{filteredChallenges.length !== 1 ? 's' : ''} 
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
            
            {filteredChallenges.map(challenge => (
              <div key={challenge.id} className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-xl p-4 hover:bg-white/90 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-gray-800 font-semibold text-lg truncate">
                        Day {challenge.order_index}: {challenge.title || 'Untitled Challenge'}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        challenge.is_active 
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-100 text-gray-800 border border-gray-300'
                      }`}>
                        {challenge.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        challenge.cohort_id 
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {challenge.cohort_id ? `${challenge.cohorts?.name}` : 'Default'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700 mb-2">
                      <div>
                        <span className="font-medium">Challenge 1:</span> {challenge.challenge_1_type || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Challenge 2:</span> {challenge.challenge_2_type || 'N/A'}
                      </div>
                    </div>
                    
                    {challenge.reflection_question && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Reflection:</span> {challenge.reflection_question.substring(0, 100)}...
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openModal(challenge)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all"
                      title="Edit challenge"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Placeholder for future modal - keeping it simple for now */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glassmorphism rounded-2xl p-8 max-w-2xl w-full">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                Challenge Management
              </h3>
              <p className="text-white/80 mb-6">
                Full challenge creation and editing interface coming soon!
              </p>
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium border border-white/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Searchable Multi-Select Component for Cohorts
function CohortMultiSelect({ cohorts, selectedCohorts, onChange, placeholder = "Search and select cohorts..." }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && !event.target.closest('.cohort-multiselect')) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredCohorts = cohorts.filter(cohort =>
    cohort.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cohort.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleCohort = (cohortId) => {
    const newSelected = selectedCohorts.includes(cohortId)
      ? selectedCohorts.filter(id => id !== cohortId)
      : [...selectedCohorts, cohortId]
    onChange(newSelected)
  }

  const getSelectedCohortsText = () => {
    if (selectedCohorts.length === 0) return placeholder
    if (selectedCohorts.length === 1) {
      const cohort = cohorts.find(c => c.id === selectedCohorts[0])
      return cohort?.name || 'Unknown cohort'
    }
    return `${selectedCohorts.length} cohorts selected`
  }

  return (
    <div className="relative cohort-multiselect">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all text-left flex items-center justify-between"
      >
        <span className={selectedCohorts.length === 0 ? 'text-gray-500' : 'text-gray-800'}>
          {getSelectedCohortsText()}
        </span>
        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-white/30 shadow-lg max-h-64 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search cohorts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Cohort list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredCohorts.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No cohorts found
              </div>
            ) : (
              filteredCohorts.map(cohort => (
                <div
                  key={cohort.id}
                  onClick={() => toggleCohort(cohort.id)}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCohorts.includes(cohort.id)}
                      onChange={() => {}} // Controlled by parent onClick
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">{cohort.name}</div>
                      <div className="text-xs text-gray-500">{cohort.organization_name}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Modal component that renders using a portal
function Modal({ isOpen, onClose, children }) {
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
        className="glassmorphism rounded-2xl p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto relative mx-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

function SuperAdminManagement() {
  // Persisted UI state (tabs, search, filters)
  const { 
    activeTab, 
    searchTerm: userSearchTerm, 
    setActiveTab, 
    setSearchTerm: setUserSearchTerm 
  } = useAdminUIState('super_admin')

  // Persisted form state
  const { 
    formData: userForm, 
    updateForm: setUserForm, 
    resetForm: resetUserForm,
    setFormField: setUserFormField 
  } = useFormPersistence('user_management', {
    email: '',
    password: '',
    reset_password: '',
    first_name: '',
    last_name: '',
    organization_name: '',
    department: '',
    role: 'user',
    cohort_id: '',
    assign_cohorts: []
  })

  // Persisted modal state (survives page refresh and navigation)
  const { 
    isOpen: showUserModal, 
    editingItem: editingUser,
    openModal: openPersistedModal, 
    closeModal: closePersistedModal 
  } = useModalPersistence('user_management')

  // Persisted bulk upload modal state
  const { 
    isOpen: showBulkUpload, 
    openModal: openBulkUploadModal, 
    closeModal: closeBulkUploadModal 
  } = useModalPersistence('bulk_upload')

  // Non-persisted state (reloaded data)
  const [cohorts, setCohorts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [adminAssignments, setAdminAssignments] = useState([])
  const [selectedUsers, setSelectedUsers] = useState(new Set())

  // Load initial data
  useEffect(() => {
    loadCohorts()
    loadUsers()
    loadAdminAssignments()
  }, [])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showUserModal || showBulkUpload) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showUserModal, showBulkUpload])

  const loadCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('cohorts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCohorts(data || [])
    } catch (err) {
      console.error('Error loading cohorts:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_details')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform the data to match the expected format
      const transformedData = data?.map(user => ({
        ...user,
        cohorts: user.cohort_name ? { name: user.cohort_name } : null
      })) || []
      
      setUsers(transformedData)
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const loadAdminAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_cohort_assignments')
        .select(`
          *,
          cohorts(name, organization_name),
          user_profiles(first_name, last_name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdminAssignments(data || [])
    } catch (err) {
      console.error('Error loading admin assignments:', err)
    }
  }



  const handleUserSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (editingUser) {
        // Update existing user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .update({
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            organization_name: userForm.organization_name,
            department: userForm.department,
            role: userForm.role,
            cohort_id: userForm.cohort_id || null
          })
          .eq('user_id', editingUser.user_id)

        if (profileError) {
          throw new Error('Failed to update user profile: ' + profileError.message)
        }

        // Handle admin cohort assignments for editing
        if (userForm.role === 'admin' && userForm.assign_cohorts.length > 0) {
          // Remove existing assignments
          await supabase
            .from('admin_cohort_assignments')
            .delete()
            .eq('admin_user_id', editingUser.user_id)

          // Add new assignments
          const assignments = userForm.assign_cohorts.map(cohortId => ({
            admin_user_id: editingUser.user_id,
            cohort_id: cohortId,
            is_active: true,
            permissions: ['view', 'manage_users']
          }))

          const { error: assignmentError } = await supabase
            .from('admin_cohort_assignments')
            .insert(assignments)

          if (assignmentError) {
            console.warn('Failed to update admin cohort assignments:', assignmentError)
          }
        }

        setMessage(`User updated successfully!`)
      } else {
        // Create new user using Edge Function
        const response = await supabase.functions.invoke('create-user', {
          body: {
            email: userForm.email,
            password: userForm.password || 'test1234', // Use custom password or default to test1234
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            organization_name: userForm.organization_name,
            department: userForm.department,
            role: userForm.role,
            cohort_id: userForm.cohort_id || null
          }
        })

        // Log the full response for debugging
        console.log('Function response:', response)

        // Handle different error scenarios
        if (response.error) {
          console.error('Function call error:', response.error)
          throw new Error(`Function call failed: ${response.error.message || 'Unknown error'}`)
        }

        let { data } = response

        // Parse the data if it's a string
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data)
            console.log('Parsed function response:', data)
          } catch (parseError) {
            console.error('Failed to parse response:', parseError)
            throw new Error('Invalid response format from function')
          }
        }

        if (!data) {
          throw new Error('No response data received from function')
        }

        if (data.error) {
          console.error('Function returned error:', data.error)
          throw new Error(data.error)
        }

        if (!data.success) {
          console.error('Function response:', data)
          throw new Error(data.error || 'User creation failed')
        }

        // If creating an admin, assign them to cohorts
        if (userForm.role === 'admin' && userForm.assign_cohorts.length > 0) {
          const assignments = userForm.assign_cohorts.map(cohortId => ({
            admin_user_id: data.user.id,
            cohort_id: cohortId,
            is_active: true,
            permissions: ['view', 'manage_users']
          }))

          console.log('🔗 Creating admin cohort assignments:', assignments)

          const { error: assignmentError } = await supabase
            .from('admin_cohort_assignments')
            .insert(assignments)

          if (assignmentError) {
            console.error('❌ Failed to assign admin to cohorts:', assignmentError)
            setMessage(`User created successfully but failed to assign to cohorts.`)
          } else {
            console.log('✅ Admin cohort assignments created successfully')
            setMessage(`User created successfully and assigned to ${assignments.length} cohort(s)!`)
          }
        } else {
          console.log('ℹ️ No cohort assignments needed for this user')
          setMessage(data.message || `User created successfully!`)
        }
      }

      // Reset form and close modal
      resetUserForm()
      closePersistedModal()
      loadUsers()
      loadAdminAssignments()
    } catch (err) {
      console.error('Error with user operation:', err)
      setMessage('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!editingUser || !userForm.reset_password.trim()) {
      setMessage('Please enter a new password')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      const response = await supabase.functions.invoke('reset-user-password', {
        body: {
          user_id: editingUser.user_id,
          new_password: userForm.reset_password.trim()
        }
      })

      // Handle different error scenarios
      if (response.error) {
        console.error('Function call error:', response.error)
        throw new Error(`Function call failed: ${response.error.message || 'Unknown error'}`)
      }

      let { data } = response

      // Parse the data if it's a string
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch (parseError) {
          console.error('Failed to parse response:', parseError)
          throw new Error('Invalid response format from function')
        }
      }

      if (!data) {
        throw new Error('No response data received from function')
      }

      if (data.error) {
        console.error('Function returned error:', data.error)
        throw new Error(data.error)
      }

      if (!data.success) {
        console.error('Function response:', data)
        throw new Error(data.error || 'Password reset failed')
      }

      setMessage(`Password successfully reset for ${editingUser.first_name} ${editingUser.last_name}`)
      setUserFormField('reset_password', '') // Clear the password field
    } catch (err) {
      console.error('Error resetting password:', err)
      setMessage('Error resetting password: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCohortAssignmentChange = (selectedCohorts) => {
    setUserFormField('assign_cohorts', selectedCohorts)
  }



  // User management functions
  const openUserModal = async (user = null) => {
    if (user) {
      // Load existing admin assignments if editing an admin
      let existingAssignments = []
      if (user.role === 'admin') {
        try {
          const { data } = await supabase
            .from('admin_cohort_assignments')
            .select('cohort_id')
            .eq('admin_user_id', user.user_id)
            .eq('is_active', true)
          
          existingAssignments = data?.map(a => a.cohort_id) || []
        } catch (err) {
          console.warn('Failed to load existing assignments:', err)
        }
      }
      
      // Update form with user data
      setUserForm({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        organization_name: user.organization_name || '',
        department: user.department || '',
        role: user.role || 'user',
        cohort_id: user.cohort_id || '',
        assign_cohorts: existingAssignments
      })
      
      // Open modal with editing user
      openPersistedModal(user)
    } else {
      // Reset form for new user
      resetUserForm()
      // Open modal without editing user
      openPersistedModal(null)
    }
  }

  const closeUserModal = () => {
    resetUserForm()
    closePersistedModal()
  }

  const deleteUser = async (userId, userEmail) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      // Delete from user_profiles first
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId)

      if (profileError) {
        console.warn('Error deleting user profile:', profileError)
      }

      // Delete from auth.users using Edge Function
      const { error: authError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      })

      if (authError) {
        throw new Error(authError.message || 'Failed to delete user')
      }

      setMessage(`User ${userEmail} deleted successfully`)
      loadUsers()
      loadAdminAssignments()
    } catch (err) {
      setMessage('Error deleting user: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => {
    if (!userSearchTerm) return true
    const searchTerm = userSearchTerm.toLowerCase()
    return (
      user.first_name?.toLowerCase().includes(searchTerm) ||
      user.last_name?.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm) ||
      user.organization_name?.toLowerCase().includes(searchTerm) ||
      user.role?.toLowerCase().includes(searchTerm) ||
      user.cohorts?.name?.toLowerCase().includes(searchTerm)
    )
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Super Admin Management</h2>
        <p className="text-gray-600">Create and manage cohorts, users, and role assignments</p>
      </div>

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

      {/* Tab Navigation */}
      <div className="glassmorphism rounded-2xl p-6">
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => setActiveTab('cohorts')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'cohorts'
                ? 'bg-white/60 text-gray-800'
                : 'bg-white/30 text-gray-600 hover:bg-white/50'
            }`}
          >
            Manage Cohorts
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-white/60 text-gray-800'
                : 'bg-white/30 text-gray-600 hover:bg-white/50'
            }`}
          >
            Manage Users
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'challenges'
                ? 'bg-white/60 text-gray-800'
                : 'bg-white/30 text-gray-600 hover:bg-white/50'
            }`}
          >
            Manage Challenges
          </button>
        </div>
      </div>

      {/* Cohort Management Tab */}
      {activeTab === 'cohorts' && (
        <CohortManagement />
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Header with search and add button */}
          <div className="glassmorphism rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">User Management</h3>
                <p className="text-gray-600">Manage users, roles, and cohort assignments</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users by name, email, organization, role, or cohort..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full sm:w-80 px-4 py-3 pl-12 rounded-xl bg-white/90 border border-white/30 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Add User Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openBulkUploadModal()}
                    className="px-4 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium flex items-center gap-2 whitespace-nowrap border border-white/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Bulk Upload
                  </button>
                  
                <button
                  onClick={() => openUserModal()}
                  className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium flex items-center gap-2 whitespace-nowrap border border-white/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add User
                </button>
                </div>
              </div>
            </div>
          </div>

          {/* Users List */}
          <div className="glassmorphism rounded-2xl p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-white/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-800 mb-2">
                  {userSearchTerm ? 'No users found' : 'No users yet'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {userSearchTerm 
                    ? `No users match "${userSearchTerm}"`
                    : 'Get started by creating your first user'
                  }
                </p>
                {!userSearchTerm && (
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => openBulkUploadModal()}
                      className="px-4 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium border border-white/30 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Bulk Upload
                    </button>
                  <button
                    onClick={() => openUserModal()}
                    className="px-6 py-3 glassmorphism text-gray-800 rounded-xl hover:bg-white/40 transition-all font-medium border border-white/30"
                  >
                    Create First User
                  </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} 
                  {userSearchTerm && ` matching "${userSearchTerm}"`}
                </div>
                
                {filteredUsers.map(user => (
                  <div key={user.user_id} className="bg-white/80 backdrop-blur-sm border border-white/30 rounded-xl p-4 hover:bg-white/90 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-gray-800 font-semibold text-lg truncate">
                            {user.first_name} {user.last_name}
                          </h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'super_admin' 
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : user.role === 'admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-green-100 text-green-800 border border-green-300'
                          }`}>
                            {user.role.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-700 mb-2">
                          <div>
                            <span className="font-medium">Email:</span> {user.email || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Organization:</span> {user.organization_name || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Department:</span> {user.department || 'N/A'}
                          </div>
                        </div>
                        
                        {/* Cohort Information */}
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Participating in:</span>
                              <span className={`px-2 py-1 rounded-md text-xs ${
                                user.cohorts?.name 
                                  ? 'bg-green-100 text-green-800 border border-green-300'
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}>
                                {user.cohorts?.name || 'No cohort'}
                              </span>
                            </div>
                            
                            {(user.role === 'admin' || user.role === 'super_admin') && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Managing:</span>
                                <span className="px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800 border border-blue-300">
                                  {user.role === 'super_admin' 
                                    ? 'All cohorts' 
                                    : 'Assigned cohorts'
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openUserModal(user)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all"
                          title="Edit user"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => deleteUser(user.user_id, user.email || `${user.first_name} ${user.last_name}`)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                          title="Delete user"
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
                  </div>
        )}

      {/* Challenge Management Tab */}
      {activeTab === 'challenges' && (
        <ChallengeManagement />
      )}

      {/* User Create/Edit Modal */}
      <Modal isOpen={showUserModal} onClose={closeUserModal}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">
            {editingUser ? 'Edit User' : 'Create New User'}
          </h3>
          <button
            onClick={closeUserModal}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleUserSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserFormField('email', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="user@example.com"
                    required
                    disabled={editingUser} // Can't edit email once created
                  />
                  {editingUser && (
                    <p className="text-white/60 text-xs mt-1">Email cannot be changed after creation</p>
                  )}
                </div>

                {/* Password field - only show when creating new users */}
                {!editingUser && (
                  <div>
                    <label className="block text-white font-medium mb-2">Password</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserFormField('password', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                      placeholder="Leave empty for default (test1234)"
                    />
                    <p className="text-white/60 text-xs mt-1">
                      Leave empty to use default password: test1234
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-white font-medium mb-2">Role *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserFormField('role', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    required
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">First Name *</label>
                  <input
                    type="text"
                    value={userForm.first_name}
                    onChange={(e) => setUserFormField('first_name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="John"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Last Name *</label>
                  <input
                    type="text"
                    value={userForm.last_name}
                    onChange={(e) => setUserFormField('last_name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Organization</label>
                  <input
                    type="text"
                    value={userForm.organization_name}
                    onChange={(e) => setUserFormField('organization_name', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="Acme Corporation"
                  />
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Department</label>
                  <input
                    type="text"
                    value={userForm.department}
                    onChange={(e) => setUserFormField('department', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="Engineering, Marketing, etc."
                  />
                </div>

                {/* Cohort Participation - Available for ALL user types */}
                <div className="md:col-span-2">
                  <label className="block text-white font-medium mb-2">
                    Participate in Cohort
                    {userForm.role !== 'user' && (
                      <span className="text-white/60 text-sm font-normal ml-2">(Optional - allows them to do the program)</span>
                    )}
                  </label>
                  <select
                    value={userForm.cohort_id}
                    onChange={(e) => setUserFormField('cohort_id', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  >
                    <option value="">No cohort participation</option>
                    {cohorts.map(cohort => (
                      <option key={cohort.id} value={cohort.id}>
                        {cohort.name} ({cohort.organization_name})
                      </option>
                    ))}
                  </select>
                  <p className="text-white/60 text-xs mt-1">
                    {userForm.role === 'user' 
                      ? 'Users need a cohort assignment to access challenges and track progress.'
                      : 'Allows this admin/super admin to participate in the program and track their own progress.'
                    }
                  </p>
                </div>
              </div>

              {/* Admin Cohort Management Assignments */}
              {userForm.role === 'admin' && (
                <div>
                  <label className="block text-white font-medium mb-2">
                    Manage Cohorts 
                    <span className="text-white/60 text-sm font-normal ml-2">(Administrative access)</span>
                  </label>
                  <CohortMultiSelect
                    cohorts={cohorts}
                    selectedCohorts={userForm.assign_cohorts}
                    onChange={handleCohortAssignmentChange}
                    placeholder="Search and select cohorts to manage..."
                  />
                  <p className="text-white/70 text-sm mt-2">
                    Admins can only view and manage users in their assigned cohorts. This is separate from participating in a cohort above.
                  </p>
                </div>
              )}

              {/* Super Admin Notice */}
              {userForm.role === 'super_admin' && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-purple-300 mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Super Admin Access</span>
                  </div>
                  <p className="text-purple-200 text-sm">
                    Super admins have management access to all cohorts automatically. Cohort participation above is optional for doing the program personally.
                  </p>
                </div>
              )}

              {/* Password Reset Section - only show when editing existing users */}
              {editingUser && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-orange-300 mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="font-medium">Reset User Password</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-white font-medium mb-2">New Password</label>
                      <input
                        type="password"
                        value={userForm.reset_password}
                        onChange={(e) => setUserFormField('reset_password', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                        placeholder="Enter new password for user"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={loading || !userForm.reset_password.trim()}
                      className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading && (
                        <div className="w-4 h-4 border-2 border-orange-200/30 border-t-orange-200 rounded-full animate-spin"></div>
                      )}
                      Reset Password
                    </button>
                    <p className="text-orange-200 text-sm">
                      This will immediately change the user's password. Make sure to securely share the new password with them.
                    </p>
                  </div>
                </div>
              )}

              {!editingUser && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-300 mb-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Password Setup</span>
                  </div>
                  <p className="text-blue-200 text-sm">
                    {userForm.password ? (
                      <>Custom password will be used for this user's login</>
                    ) : (
                      <>If no password is set, the default password <code className="bg-blue-500/20 px-2 py-1 rounded font-mono">test1234</code> will be used</>
                    )}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeUserModal}
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
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  )}
                  {loading ? (editingUser ? 'Updating...' : 'Creating...') : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
      </Modal>

      {/* Bulk User Upload Modal */}
      <Modal isOpen={showBulkUpload} onClose={closeBulkUploadModal}>
        <BulkUserUpload 
          cohorts={cohorts}
          onComplete={() => {
            loadUsers()
            loadAdminAssignments()
          }}
          onClose={closeBulkUploadModal}
        />
      </Modal>

    </div>
  )
}

export default SuperAdminManagement
