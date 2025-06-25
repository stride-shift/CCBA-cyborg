import { useState, useEffect } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'

function UserProfileForm() {
  const { profile, loading, error, updateProfile, getAllCohorts, isAdmin, isSuperAdmin } = useUserProfile()
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    organization_name: '',
    department: '',
    cohort_id: ''
  })
  const [cohorts, setCohorts] = useState([])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        organization_name: profile.organization_name || '',
        department: profile.department || '',
        cohort_id: profile.cohort_id || ''
      })
    }
  }, [profile])

  useEffect(() => {
    loadCohorts()
  }, [])

  const loadCohorts = async () => {
    const cohortsData = await getAllCohorts()
    setCohorts(cohortsData)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      await updateProfile(formData)
      setMessage('Profile updated successfully!')
    } catch (err) {
      setMessage('Error updating profile: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">User Profile</h2>
        {profile?.role && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            profile.role === 'super_admin' ? 'bg-purple-600 text-white' :
            profile.role === 'admin' ? 'bg-blue-600 text-white' :
            'bg-gray-600 text-white'
          }`}>
            {profile.role.replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('Error') ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your first name"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-300 mb-2">
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your last name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="organization_name" className="block text-sm font-medium text-gray-300 mb-2">
            Organization
          </label>
          <input
            type="text"
            id="organization_name"
            name="organization_name"
            value={formData.organization_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your organization name"
          />
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-300 mb-2">
            Department
          </label>
          <input
            type="text"
            id="department"
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your department"
          />
        </div>

        <div>
          <label htmlFor="cohort_id" className="block text-sm font-medium text-gray-300 mb-2">
            Cohort
            {!isAdmin() && !isSuperAdmin() && (
              <span className="text-xs text-gray-500 ml-2">(Contact admin to change)</span>
            )}
          </label>
          <select
            id="cohort_id"
            name="cohort_id"
            value={formData.cohort_id}
            onChange={handleInputChange}
            disabled={!isAdmin() && !isSuperAdmin()}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select a cohort</option>
            {cohorts.map(cohort => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.name} {cohort.is_active ? '' : '(Inactive)'}
              </option>
            ))}
          </select>
        </div>

        {profile?.cohort_name && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Current Cohort</h3>
            <p className="text-gray-300">{profile.cohort_name}</p>
            {profile.cohort_description && (
              <p className="text-gray-400 text-sm mt-1">{profile.cohort_description}</p>
            )}
            {profile.cohort_start_date && (
              <p className="text-gray-400 text-sm mt-1">
                Started: {new Date(profile.cohort_start_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default UserProfileForm 