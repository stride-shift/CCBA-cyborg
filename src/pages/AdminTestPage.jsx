import { useUserProfile } from '../hooks/useUserProfile'
import Layout from '../components/Layout'

function AdminTestPage() {
  const { profile, loading, isAdmin, isSuperAdmin } = useUserProfile()

  console.log('AdminTestPage - Profile:', profile)
  console.log('AdminTestPage - Loading:', loading)
  console.log('AdminTestPage - IsAdmin:', isAdmin())
  console.log('AdminTestPage - IsSuperAdmin:', isSuperAdmin())

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-white text-center">
          <h1 className="text-4xl font-bold mb-4">Loading Admin Test...</h1>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-white text-center">
          <h1 className="text-4xl font-bold mb-4">No Profile Found</h1>
          <p>Please make sure you're logged in.</p>
        </div>
      </Layout>
    )
  }

  if (!isAdmin() && !isSuperAdmin()) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-white text-center">
          <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
          <p>You don't have admin privileges.</p>
          <p>Your role: {profile.role}</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-32 text-white">
        <div className="glassmorphism rounded-2xl p-8">
          <h1 className="text-4xl font-bold mb-6">Admin Test Page</h1>
          <div className="space-y-4">
            <p><strong>Name:</strong> {profile.first_name} {profile.last_name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Organization:</strong> {profile.organization_name}</p>
            <p><strong>Is Admin:</strong> {String(isAdmin())}</p>
            <p><strong>Is Super Admin:</strong> {String(isSuperAdmin())}</p>
            <p><strong>Profile ID:</strong> {profile.id}</p>
            <p><strong>User ID:</strong> {profile.user_id}</p>
          </div>
          
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Raw Profile Data:</h2>
            <pre className="bg-black/20 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminTestPage 