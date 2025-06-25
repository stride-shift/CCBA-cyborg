import { createContext, useContext, useState, useEffect } from 'react'

const AdminStateContext = createContext()

export function AdminStateProvider({ children }) {
  const [currentTab, setCurrentTab] = useState('dashboard')
  const [selectedCohortId, setSelectedCohortId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false)



  // Load state from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('admin-current-tab')
    const savedCohortId = localStorage.getItem('admin-selected-cohort-id')
    const savedUserId = localStorage.getItem('admin-selected-user-id')

    if (savedTab && ['dashboard', 'cohorts', 'users'].includes(savedTab)) {
      setCurrentTab(savedTab)
    }
    if (savedCohortId) {
      setSelectedCohortId(savedCohortId)
    }
    if (savedUserId) {
      setSelectedUserId(savedUserId)
    }
    
    // Mark that we've completed the initial load
    setHasLoadedFromStorage(true)
  }, [])

  // Save state to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return
    }
    localStorage.setItem('admin-current-tab', currentTab)
  }, [currentTab, hasLoadedFromStorage])

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return
    }
    if (selectedCohortId) {
      localStorage.setItem('admin-selected-cohort-id', selectedCohortId)
    } else {
      localStorage.removeItem('admin-selected-cohort-id')
    }
  }, [selectedCohortId, hasLoadedFromStorage])

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      return
    }
    if (selectedUserId) {
      localStorage.setItem('admin-selected-user-id', selectedUserId)
    } else {
      localStorage.removeItem('admin-selected-user-id')
    }
  }, [selectedUserId, hasLoadedFromStorage])

  const value = {
    currentTab,
    setCurrentTab,
    selectedCohortId,
    setSelectedCohortId,
    selectedUserId,
    setSelectedUserId,
  }

  return (
    <AdminStateContext.Provider value={value}>
      {children}
    </AdminStateContext.Provider>
  )
}

export function useAdminState() {
  const context = useContext(AdminStateContext)
  if (!context) {
    throw new Error('useAdminState must be used within AdminStateProvider')
  }
  return context
} 