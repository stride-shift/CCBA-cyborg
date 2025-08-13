import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useUserProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user) {
      // Move fetchProfile inside the effect to avoid closure issues
      const fetchProfile = async () => {
        try {
          setLoading(true)
          setError(null)

          const { data, error } = await supabase
            .from('user_profiles_with_cohort')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (error) {
            if (error.code === 'PGRST116') {
              // No profile found, create one
              await createProfile()
            } else {
              throw error
            }
          } else {
            setProfile(data)
          }
        } catch (err) {
          console.error('Error fetching profile:', err)
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }

      const createProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .insert({
              user_id: user.id,
              first_name: user.user_metadata?.first_name || '',
              last_name: user.user_metadata?.last_name || '',
            })
            .select()
            .single()

          if (error) throw error
          
          // Fetch the profile with cohort info
          await fetchProfile()
        } catch (err) {
          console.error('Error creating profile:', err)
          setError(err.message)
        }
      }

      fetchProfile()
    } else {
      setProfile(null)
      setLoading(false)
    }
  }, [user])

  const updateProfile = async (updates) => {
    try {
      setError(null)

      // Remove read-only fields
      const { id, user_id, created_at, updated_at, cohort_name, cohort_description, cohort_start_date, cohort_end_date, cohort_is_active, ...allowedUpdates } = updates

      const { data, error } = await supabase
        .from('user_profiles')
        .update(allowedUpdates)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) throw error

      // Refresh profile with cohort info - call it directly since we're in a callback
      const { data: refreshedData, error: refreshError } = await supabase
        .from('user_profiles_with_cohort')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (refreshError) throw refreshError
      setProfile(refreshedData)
      
      return data
    } catch (err) {
      console.error('Error updating profile:', err)
      setError(err.message)
      throw err
    }
  }

  const updateUserRole = async (targetUserId, newRole) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error updating user role:', err)
      setError(err.message)
      throw err
    }
  }

  const updateUserCohort = async (targetUserId, newCohortId) => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('user_profiles')
        .update({ cohort_id: newCohortId })
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error updating user cohort:', err)
      setError(err.message)
      throw err
    }
  }

  const getOrganizationUsers = async () => {
    if (!profile?.organization_name) return []

    try {
      const { data, error } = await supabase
        .from('user_profiles_with_cohort')
        .select('*')
        .eq('organization_name', profile.organization_name)

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error fetching organization users:', err)
      setError(err.message)
      return []
    }
  }

  const getCohortUsers = async (cohortId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles_with_cohort')
        .select('*')
        .eq('cohort_id', cohortId)

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error fetching cohort users:', err)
      setError(err.message)
      return []
    }
  }

  const getAllCohorts = async () => {
    try {
      // Use the new safe function that respects admin assignments
      const { data, error } = await supabase
        .rpc('get_safe_accessible_cohorts')

      if (error) throw error
      
      // Sort by start_date descending (newest first)
      const sortedData = (data || []).sort((a, b) => {
        if (!a.start_date && !b.start_date) return 0
        if (!a.start_date) return 1
        if (!b.start_date) return -1
        return new Date(b.start_date) - new Date(a.start_date)
      })
      
      return sortedData
    } catch (err) {
      console.error('Error fetching cohorts:', err)
      setError(err.message)
      return []
    }
  }

  // Helper functions to check permissions
  const isAdmin = () => profile?.role === 'admin' || profile?.role === 'super_admin'
  const isSuperAdmin = () => profile?.role === 'super_admin'
  const canManageUser = (targetUser) => {
    if (isSuperAdmin()) return true
    if (isAdmin() && targetUser.organization_name === profile?.organization_name && targetUser.role !== 'super_admin') return true
    return false
  }

  // Manual refetch function for external use
  const refetch = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('user_profiles_with_cohort')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error refetching profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateUserRole,
    updateUserCohort,
    getOrganizationUsers,
    getCohortUsers,
    getAllCohorts,
    isAdmin,
    isSuperAdmin,
    canManageUser,
    refetch
  }
} 