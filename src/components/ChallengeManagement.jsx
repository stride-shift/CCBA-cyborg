import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'

// Modal component for challenge create/edit
function ChallengeModal({ isOpen, onClose, children }) {
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
        className="glassmorphism rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative mx-auto my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showModal])

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const challengeData = {
        title: challengeForm.title,
        order_index: parseInt(challengeForm.order_index),
        challenge_1: challengeForm.challenge_1,
        challenge_1_type: challengeForm.challenge_1_type,
        challenge_2: challengeForm.challenge_2,
        challenge_2_type: challengeForm.challenge_2_type,
        reflection_question: challengeForm.reflection_question,
        intended_aha_moments: challengeForm.intended_aha_moments.filter(moment => moment.trim()),
        cohort_id: challengeForm.cohort_id || null,
        is_active: challengeForm.is_active
      }

      if (editingChallenge) {
        // Update existing challenge
        const { error } = await supabase
          .from('challenges')
          .update(challengeData)
          .eq('id', editingChallenge.id)

        if (error) throw error
        setMessage(`Challenge for Day ${challengeData.order_index} updated successfully!`)
      } else {
        // Create new challenge
        const { error } = await supabase
          .from('challenges')
          .insert([challengeData])

        if (error) throw error
        setMessage(`Challenge for Day ${challengeData.order_index} created successfully!`)
      }

      closeModal()
      loadChallenges()
    } catch (err) {
      console.error('Error saving challenge:', err)
      setMessage('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

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

  const closeModal = () => {
    setShowModal(false)
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
      cohort_id: '',
      is_active: true
    })
  }

  const deleteChallenge = async (challengeId, challengeTitle) => {
    if (!confirm(`Are you sure you want to delete "${challengeTitle}"? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId)

      if (error) throw error

      setMessage(`Challenge "${challengeTitle}" deleted successfully`)
      loadChallenges()
    } catch (err) {
      console.error('Error deleting challenge:', err)
      setMessage('Error deleting challenge: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const addAhaMoment = () => {
    setChallengeForm(prev => ({
      ...prev,
      intended_aha_moments: [...prev.intended_aha_moments, '']
    }))
  }

  const removeAhaMoment = (index) => {
    setChallengeForm(prev => ({
      ...prev,
      intended_aha_moments: prev.intended_aha_moments.filter((_, i) => i !== index)
    }))
  }

  const updateAhaMoment = (index, value) => {
    setChallengeForm(prev => ({
      ...prev,
      intended_aha_moments: prev.intended_aha_moments.map((moment, i) => 
        i === index ? value : moment
      )
    }))
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
            <svg className="mx-auto h-12 w-12 text-white/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
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
                    
                    <button
                      onClick={() => deleteChallenge(challenge.id, challenge.title || `Day ${challenge.order_index}`)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
                      title="Delete challenge"
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
      <ChallengeModal isOpen={showModal} onClose={closeModal}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">
            {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
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
            <div>
              <label className="block text-white font-medium mb-2">Challenge Title</label>
              <input
                type="text"
                value={challengeForm.title}
                onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                placeholder="e.g., Morning Mindfulness"
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Day Number *</label>
              <input
                type="number"
                value={challengeForm.order_index}
                onChange={(e) => setChallengeForm(prev => ({ ...prev, order_index: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                placeholder="1-15"
                min="1"
                max="15"
                required
              />
            </div>

            <div>
              <label className="block text-white font-medium mb-2">Cohort Assignment</label>
              <select
                value={challengeForm.cohort_id}
                onChange={(e) => setChallengeForm(prev => ({ ...prev, cohort_id: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
              >
                <option value="">Default (All Cohorts)</option>
                {cohorts.map(cohort => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name} ({cohort.organization_name})
                  </option>
                ))}
              </select>
              <p className="text-white/70 text-xs mt-1">
                Leave empty for default challenge used by all cohorts
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active_challenge"
                checked={challengeForm.is_active}
                onChange={(e) => setChallengeForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="w-4 h-4 rounded border-white/30 bg-white/20 text-white focus:ring-white/50"
              />
              <label htmlFor="is_active_challenge" className="ml-3 text-white font-medium">
                Active Challenge
              </label>
            </div>
          </div>

          {/* Challenge 1 */}
          <div className="border-t border-white/20 pt-6">
            <h4 className="text-lg font-semibold text-white mb-4">Challenge 1</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Challenge 1 Type</label>
                <input
                  type="text"
                  value={challengeForm.challenge_1_type}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, challenge_1_type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  placeholder="e.g., Explain It"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-white font-medium mb-2">Challenge 1 Description *</label>
                <textarea
                  value={challengeForm.challenge_1}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, challenge_1: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all resize-none"
                  placeholder="Describe the first challenge..."
                  rows="4"
                  required
                />
              </div>
            </div>
          </div>

          {/* Challenge 2 */}
          <div className="border-t border-white/20 pt-6">
            <h4 className="text-lg font-semibold text-white mb-4">Challenge 2</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white font-medium mb-2">Challenge 2 Type</label>
                <input
                  type="text"
                  value={challengeForm.challenge_2_type}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, challenge_2_type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  placeholder="e.g., Improve It"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-white font-medium mb-2">Challenge 2 Description *</label>
                <textarea
                  value={challengeForm.challenge_2}
                  onChange={(e) => setChallengeForm(prev => ({ ...prev, challenge_2: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all resize-none"
                  placeholder="Describe the second challenge..."
                  rows="4"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reflection Question */}
          <div className="border-t border-white/20 pt-6">
            <label className="block text-white font-medium mb-2">Reflection Question *</label>
            <textarea
              value={challengeForm.reflection_question}
              onChange={(e) => setChallengeForm(prev => ({ ...prev, reflection_question: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all resize-none"
              placeholder="What reflection question should users answer after completing both challenges?"
              rows="3"
              required
            />
          </div>

          {/* Intended Aha Moments */}
          <div className="border-t border-white/20 pt-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-white font-medium">Intended Aha Moments</label>
              <button
                type="button"
                onClick={addAhaMoment}
                className="px-3 py-1 bg-white/20 rounded-lg text-black hover:bg-white/30 text-sm transition-all"
              >
                + Add
              </button>
            </div>
            <div className="space-y-3">
              {challengeForm.intended_aha_moments.map((moment, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={moment}
                    onChange={(e) => updateAhaMoment(index, e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/50 backdrop-blur-sm border border-white/30 placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    placeholder="An insight users might discover..."
                  />
                  {challengeForm.intended_aha_moments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAhaMoment(index)}
                      className="px-3 py-3 bg-red-500/20 rounded-lg text-red-300 hover:bg-red-500/30 transition-all"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
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
              {loading ? (editingChallenge ? 'Updating...' : 'Creating...') : (editingChallenge ? 'Update Challenge' : 'Create Challenge')}
            </button>
          </div>
        </form>
      </ChallengeModal>
    </div>
  )
}

export default ChallengeManagement 