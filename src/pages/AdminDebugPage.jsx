import { useState, useEffect } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'
import Layout from '../components/Layout'

function AdminDebugPage() {
  const { profile, loading: profileLoading, isAdmin, isSuperAdmin } = useUserProfile()
  const [debugInfo, setDebugInfo] = useState({})

  useEffect(() => {
    // Capture all the debug information
    setDebugInfo({
      profileLoading,
      profile,
      isAdminResult: isAdmin(),
      isSuperAdminResult: isSuperAdmin(),
      profileExists: !!profile,
      profileRole: profile?.role,
      timestamp: new Date().toLocaleTimeString()
    })
  }, [profile, profileLoading, isAdmin, isSuperAdmin])

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        <div className="glassmorphism rounded-2xl p-8">
          <h1 className="text-3xl font-bold text-white mb-6">Admin Debug Page</h1>
          
          <div className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Authentication Status</h3>
              <div className="text-white/80 space-y-2">
                <div>Profile Loading: <span className="text-blue-400">{String(debugInfo.profileLoading)}</span></div>
                <div>Profile Exists: <span className="text-blue-400">{String(debugInfo.profileExists)}</span></div>
                <div>Profile Role: <span className="text-blue-400">{debugInfo.profileRole || 'None'}</span></div>
                <div>isAdmin(): <span className="text-blue-400">{String(debugInfo.isAdminResult)}</span></div>
                <div>isSuperAdmin(): <span className="text-blue-400">{String(debugInfo.isSuperAdminResult)}</span></div>
                <div>Last Updated: <span className="text-blue-400">{debugInfo.timestamp}</span></div>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Full Profile Object</h3>
              <pre className="text-white/80 text-sm overflow-auto">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>

            <div className="bg-white/10 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Auth Logic Test</h3>
              <div className="text-white/80 space-y-2">
                <div>Should redirect? <span className="text-red-400">
                  {!profile || (!isAdmin() && !isSuperAdmin()) ? 'YES - WOULD REDIRECT' : 'NO - SHOULD STAY'}
                </span></div>
                <div>Condition breakdown:</div>
                <ul className="ml-4 space-y-1">
                  <li>!profile: <span className="text-blue-400">{String(!profile)}</span></li>
                  <li>!isAdmin(): <span className="text-blue-400">{String(!isAdmin())}</span></li>
                  <li>!isSuperAdmin(): <span className="text-blue-400">{String(!isSuperAdmin())}</span></li>
                  <li>(!isAdmin() && !isSuperAdmin()): <span className="text-blue-400">{String(!isAdmin() && !isSuperAdmin())}</span></li>
                </ul>
              </div>
            </div>

            <button 
              onClick={() => setDebugInfo(prev => ({...prev, timestamp: new Date().toLocaleTimeString()}))}
              className="px-4 py-2 bg-blue-500/20 rounded-lg text-white hover:bg-blue-500/30"
            >
              Refresh Debug Info
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminDebugPage 