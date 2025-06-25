import { useState, useEffect, useCallback } from 'react'

// Custom hook for persisting admin state across browser tab switches
export function useAdminStatePersistence(componentName, initialState, options = {}) {
  const { 
    autoSave = true, 
    debounceMs = 500,
    clearOnSuccess = false 
  } = options

  const storageKey = `admin_state_${componentName}`
  
  // Initialize state from localStorage or use initial state
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with initial state to handle new fields
        return { ...initialState, ...parsed }
      }
    } catch (err) {
      console.warn('Failed to load persisted state:', err)
    }
    return initialState
  })

  // Debounced save function
  const saveToStorage = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (err) {
      console.warn('Failed to save state to localStorage:', err)
    }
  }, [state, storageKey])

  // Auto-save with debouncing
  useEffect(() => {
    if (!autoSave) return

    const timeoutId = setTimeout(saveToStorage, debounceMs)
    return () => clearTimeout(timeoutId)
  }, [state, saveToStorage, autoSave, debounceMs])

  // Manual save function
  const saveState = useCallback(() => {
    saveToStorage()
  }, [saveToStorage])

  // Clear stored state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setState(initialState)
    } catch (err) {
      console.warn('Failed to clear stored state:', err)
    }
  }, [storageKey, initialState])

  // Update specific field
  const updateField = useCallback((field, value) => {
    setState(prev => ({ ...prev, [field]: value }))
  }, [])

  // Bulk update multiple fields
  const updateFields = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // Handle page visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is being hidden, save state immediately
        saveToStorage()
      }
    }

    const handleBeforeUnload = () => {
      // Page is being unloaded, save state immediately
      saveToStorage()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [saveToStorage])

  return {
    state,
    setState,
    updateField,
    updateFields,
    saveState,
    clearState
  }
}

// Hook specifically for form data persistence
export function useFormPersistence(formName, initialFormData) {
  const { state: formData, updateFields, clearState } = useAdminStatePersistence(
    `form_${formName}`, 
    initialFormData,
    { autoSave: true, debounceMs: 300 }
  )

  const updateForm = useCallback((updates) => {
    updateFields(updates)
  }, [updateFields])

  const resetForm = useCallback(() => {
    clearState()
  }, [clearState])

  const setFormField = useCallback((field, value) => {
    updateFields({ [field]: value })
  }, [updateFields])

  return {
    formData,
    updateForm,
    resetForm,
    setFormField
  }
}

// Hook for modal state persistence
export function useModalPersistence(modalName) {
  const { state, updateField, clearState } = useAdminStatePersistence(
    `modal_${modalName}`,
    { isOpen: false, editingItem: null }
  )

  const openModal = useCallback((editingItem = null) => {
    updateField('isOpen', true)
    updateField('editingItem', editingItem)
  }, [updateField])

  const closeModal = useCallback(() => {
    clearState() // Clear modal state when closing
  }, [clearState])

  return {
    isOpen: state.isOpen,
    editingItem: state.editingItem,
    openModal,
    closeModal
  }
}

// Hook for tab and filter persistence
export function useAdminUIState(componentName) {
  const { state, updateField } = useAdminStatePersistence(
    `ui_${componentName}`,
    { 
      activeTab: 'cohorts',
      searchTerm: '',
      filters: {},
      sortBy: '',
      sortOrder: 'asc'
    }
  )

  const setActiveTab = useCallback((tab) => {
    updateField('activeTab', tab)
  }, [updateField])

  const setSearchTerm = useCallback((term) => {
    updateField('searchTerm', term)
  }, [updateField])

  const setFilter = useCallback((filterKey, value) => {
    updateField('filters', { ...state.filters, [filterKey]: value })
  }, [updateField, state.filters])

  const setSorting = useCallback((sortBy, sortOrder = 'asc') => {
    updateField('sortBy', sortBy)
    updateField('sortOrder', sortOrder)
  }, [updateField])

  return {
    activeTab: state.activeTab,
    searchTerm: state.searchTerm,
    filters: state.filters,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    setActiveTab,
    setSearchTerm,
    setFilter,
    setSorting
  }
} 