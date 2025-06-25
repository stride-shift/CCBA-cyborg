import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function UserActivitySearch({ onUserSelect }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [cohorts, setCohorts] = useState([])
  const [selectedCohort, setSelectedCohort] = useState('')

  useEffect(() => {
    loadUsers()
    loadCohorts()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [searchTerm, selectedCohort, users])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles_with_cohort')
        .select('user_id, first_name, last_name, email, role, cohort_name, cohort_id, created_at')
        .neq('role', 'super_admin') // Don't show super admins in search
        .order('first_name')

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from('cohorts')
        .select('id, name')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCohorts(data || [])
    } catch (err) {
      console.error('Error loading cohorts:', err)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(user => 
        user.first_name?.toLowerCase().includes(term) ||
        user.last_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term)
      )
    }

    // Filter by cohort
    if (selectedCohort) {
      filtered = filtered.filter(user => user.cohort_id === selectedCohort)
    }

    setFilteredUsers(filtered)
  }

  const handleUserClick = (user) => {
    onUserSelect(user)
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Loading users...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
        <div className="w-64">
          <select
            value={selectedCohort}
            onChange={(e) => setSelectedCohort(e.target.value)}
            className="w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <option value="">All Cohorts</option>
            {cohorts.map(cohort => (
              <option key={cohort.id} value={cohort.id} className="bg-gray-800">
                {cohort.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {filteredUsers.length === 0 ? (
          <p className="text-white/60 text-center py-8">
            {searchTerm || selectedCohort ? 'No users match your search criteria.' : 'No users found.'}
          </p>
        ) : (
          <>
            <p className="text-white/60 text-sm mb-4">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </p>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredUsers.map(user => (
                <div
                  key={user.user_id}
                  onClick={() => handleUserClick(user)}
                  className="flex items-center justify-between p-4 bg-white/10 rounded-lg hover:bg-white/20 cursor-pointer transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {user.first_name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">
                          {user.first_name} {user.last_name}
                        </h4>
                        <p className="text-white/60 text-sm">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {user.cohort_name && (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded text-white/80">
                        {user.cohort_name}
                      </span>
                    )}
                    <div className="text-white/50 text-xs mt-1">
                      {user.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default UserActivitySearch 