import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Hook to persist navigation state and help prevent unwanted redirects
 * This helps maintain user context when switching browser tabs or returning to the app
 */
export function useNavigationPersistence() {
  const location = useLocation()

  useEffect(() => {
    // Store the current location in sessionStorage
    // This helps maintain context if the user switches tabs and comes back
    const currentLocation = {
      pathname: location.pathname,
      search: location.search,
      timestamp: Date.now()
    }
    
    // Only store if it's a meaningful page (not login, etc.)
    if (location.pathname.startsWith('/day/') || 
        location.pathname.startsWith('/survey/') ||
        location.pathname === '/challenges' ||
        location.pathname === '/leaderboard') {
      
      sessionStorage.setItem('lastKnownLocation', JSON.stringify(currentLocation))
      console.log('📍 Navigation persistence: Stored location', location.pathname)
    }
  }, [location])

  // Function to get the last known location
  const getLastKnownLocation = () => {
    try {
      const stored = sessionStorage.getItem('lastKnownLocation')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Only use if it's recent (within last hour)
        if (Date.now() - parsed.timestamp < 3600000) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Error retrieving last known location:', error)
    }
    return null
  }

  // Function to clear stored location (useful on logout)
  const clearStoredLocation = () => {
    sessionStorage.removeItem('lastKnownLocation')
    sessionStorage.removeItem('previousPath')
  }

  return {
    getLastKnownLocation,
    clearStoredLocation
  }
} 