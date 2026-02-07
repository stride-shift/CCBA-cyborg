import Layout from '../components/Layout'
import CohortAnalytics from '../components/CohortAnalytics'
import CohortUserDashboard from '../components/CohortUserDashboard'
import CohortDataExporter from '../components/CohortDataExporter'
import { useState, useEffect } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'
import { Navigate } from 'react-router-dom'

const mockUsers = [
  { name: 'kimardamina@gmail.com', joined: '5/19/2025' },
  { name: 'siphumezo.adam@gmail.com', joined: '5/18/2025' },
  { name: 'ayanda.orrai@d-lab.co.za', joined: '5/18/2025' },
  { name: 'david.kramer@d-lab.co.za', joined: '5/16/2025' },
  { name: 'shanne.saunders@thefieldinstitute.com', joined: '5/12/2025' },
  { name: 'Ryan steve', joined: '4/23/2025' },
  { name: 'Johannes', joined: '4/30/2025' },
  { name: 'DelanoM', joined: '4/30/2025' },
  { name: 'Fanyana Nkosi', joined: '4/30/2025' }
]
const mockMessages = [
  { date: 'Apr 23, 2025 06:17', name: 'Kiyasha Singh', email: 'singhkiyasha@gmail.com', subject: 'Life is nice', message: 'Life is nice' }
]

export default function AdminPage() {
  const { profile, loading, isAdmin } = useUserProfile()
  const [tab, setTab] = useState('overview')
  const [chartType, setChartType] = useState('bar')
  const [cohortView, setCohortView] = useState('overview')

  // Debug logging
  useEffect(() => {
    console.log('AdminPage Debug - Loading:', loading)
    console.log('AdminPage Debug - Profile:', profile)
    console.log('AdminPage Debug - IsAdmin:', isAdmin())
  }, [loading, profile, isAdmin])

  // Show loading while checking authentication OR if profile is not loaded yet
  if (loading || !profile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-32 text-gray-900 flex items-center justify-center">
          <div className="text-center glassmorphism rounded-2xl p-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
            <p className="text-xl">Checking permissions...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Only redirect if we're sure the profile is loaded and user is not admin
  if (profile && !isAdmin()) {
    console.log('AdminPage - Redirecting: Not admin. Profile:', profile)
    return <Navigate to="/" replace />
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12">
        {/* Dashboard Header */}
        <div className="glassmorphism rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button className="glassmorphism px-4 py-2 rounded-full text-gray-900 font-semibold">Admin Center</button>
              {profile?.role && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  profile.role === 'super_admin' ? 'bg-purple-600 text-gray-900' :
                  profile.role === 'admin' ? 'bg-blue-600 text-gray-900' :
                  'bg-gray-600 text-gray-900'
                }`}>
                  {profile.role.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-900/80">
              Welcome, {profile?.first_name ? `${profile.first_name} ${profile.last_name}` : 'Admin'}
              {profile?.organization_name && ` • ${profile.organization_name}`}
            </p>
          </div>
          <div className="flex items-center gap-3 md:gap-4 mt-4 md:mt-0">
            <select className="glassmorphism px-3 md:px-4 py-2 rounded-full text-gray-900 font-semibold">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
            <button className="glassmorphism px-4 md:px-6 py-2 rounded-full text-gray-900 font-semibold border border-white/40">Export Data</button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <div className="glassmorphism rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900 font-semibold">Total Users</span>
              <span className="bg-white/30 rounded-full p-2"><svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0z" /></svg></span>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-gray-900">24</div>
            <div className="text-green-400 font-semibold text-sm mt-2">+12% from last month</div>
          </div>
          <div className="glassmorphism rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900 font-semibold">Challenges Completed</span>
              <span className="bg-white/30 rounded-full p-2"><svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 17a4 4 0 004 4h10a4 4 0 004-4V7a4 4 0 00-4-4H7a4 4 0 00-4 4v10z" /></svg></span>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-gray-900">0</div>
            <div className="text-gray-900/60 font-semibold text-sm mt-2">&nbsp;</div>
          </div>
          <div className="glassmorphism rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-900 font-semibold">Avg. Completion Rate</span>
              <span className="bg-white/30 rounded-full p-2"><svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18" /></svg></span>
            </div>
            <div className="text-3xl md:text-4xl font-bold text-gray-900">0.0%</div>
            <div className="text-green-400 font-semibold text-sm mt-2">+1.2% from last month</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 md:gap-4 mb-8 overflow-x-auto">
          <button onClick={() => setTab('overview')} className={`px-4 md:px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${tab === 'overview' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Overview</button>
          <button onClick={() => setTab('cohorts')} className={`px-4 md:px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${tab === 'cohorts' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Cohorts</button>
          <button onClick={() => setTab('users')} className={`px-4 md:px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${tab === 'users' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Users</button>
          <button onClick={() => setTab('messages')} className={`px-4 md:px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${tab === 'messages' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Messages</button>
          <button onClick={() => setTab('organizations')} className={`px-4 md:px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap ${tab === 'organizations' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Organizations</button>
        </div>

        {/* Tab Content */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Challenge Progress Overview */}
            <div className="glassmorphism rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Challenge Progress Overview</h2>
                <div className="flex gap-2">
                  <button onClick={() => setChartType('line')} className={`px-3 py-1 rounded-full text-sm font-semibold ${chartType === 'line' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Line</button>
                  <button onClick={() => setChartType('bar')} className={`px-3 py-1 rounded-full text-sm font-semibold ${chartType === 'bar' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Bar</button>
                  <button onClick={() => setChartType('pie')} className={`px-3 py-1 rounded-full text-sm font-semibold ${chartType === 'pie' ? 'glassmorphism text-gray-900' : 'bg-white/20 text-gray-900 hover:bg-white/30 border border-white/30'}`}>Pie</button>
                </div>
              </div>
              {/* Mock chart area */}
              <div className="h-64 flex items-center justify-center">
                {chartType === 'bar' && (
                  <div className="w-2/3 h-48 bg-white/20 rounded-lg flex items-end backdrop-blur-sm border border-white/30">
                    <div className="w-1/2 h-40 bg-gradient-to-t from-blue-400/80 to-blue-300/60 mx-2 rounded-t-lg flex items-end justify-center">
                      <span className="text-xs text-gray-900 mb-2 font-semibold">Not Started</span>
                    </div>
                    <div className="w-1/2 h-8 bg-gradient-to-t from-green-400/80 to-green-300/60 mx-2 rounded-t-lg flex items-end justify-center">
                      <span className="text-xs text-gray-900 mb-2 font-semibold">Completed</span>
                    </div>
                  </div>
                )}
                {chartType === 'line' && (
                  <div className="w-full h-48 flex items-center justify-center text-gray-900 glassmorphism rounded-lg">[Line Chart Placeholder]</div>
                )}
                {chartType === 'pie' && (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400/60 to-green-400/60 flex items-center justify-center text-gray-900 font-semibold">[Pie Chart]</div>
                )}
              </div>
            </div>
            {/* Challenge Completion Stats */}
            <div className="glassmorphism rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Challenge Completion Stats</h2>
              <div className="mb-2 flex justify-between text-gray-900"><span>User Engagement Rate</span><span>0.0%</span></div>
              <div className="w-full h-2 bg-white/20 rounded-full mb-4"><div className="h-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full w-1/12"></div></div>
              <div className="mb-2 flex justify-between text-gray-900"><span>Platform Challenge Completion</span><span>0.0%</span></div>
              <div className="w-full h-2 bg-white/20 rounded-full mb-4"><div className="h-2 bg-gradient-to-r from-green-400 to-green-500 rounded-full w-1/12"></div></div>
              <div className="mb-2 flex justify-between text-gray-900"><span>Avg. Challenges per User</span><span>0.0</span></div>
              <div className="mb-2 flex justify-between text-gray-900"><span>Active Users</span><span>0 / 24</span></div>
            </div>
          </div>
        )}

        {tab === 'cohorts' && (
          <div className="space-y-8">
            {/* Cohort Sub-tabs */}
            <div className="flex gap-2 border-b border-white/20 pb-4 overflow-x-auto">
              <button 
                onClick={() => setCohortView('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  cohortView === 'overview' 
                    ? 'glassmorphism text-gray-900' 
                    : 'bg-gray-50 text-gray-600 hover:bg-white/20'
                }`}
              >
                Analytics Overview
              </button>
              <button 
                onClick={() => setCohortView('users')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  cohortView === 'users' 
                    ? 'glassmorphism text-gray-900' 
                    : 'bg-gray-50 text-gray-600 hover:bg-white/20'
                }`}
              >
                User Dashboard
              </button>
              <button 
                onClick={() => setCohortView('export')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  cohortView === 'export' 
                    ? 'glassmorphism text-gray-900' 
                    : 'bg-gray-50 text-gray-600 hover:bg-white/20'
                }`}
              >
                Export Data
              </button>
            </div>

            {/* Cohort Content */}
            {cohortView === 'overview' && <CohortAnalytics />}
            {cohortView === 'users' && <CohortUserDashboard />}
            {cohortView === 'export' && (
              <div className="space-y-6">
                {/* LIBERTY Cohort Export */}
                <CohortDataExporter 
                  cohortId="8e57a0a2-b9d6-4ae0-b7a9-9eb1c7785474"
                  cohortName="LIBERTY-ALL-202507-C1"
                />
                
                {/* Add more cohorts here as needed */}
                <div className="bg-gray-50 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Add More Cohorts
                  </h3>
                  <p className="text-gray-600">
                    Additional cohort exporters can be added here as new cohorts are created.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="glassmorphism rounded-2xl p-6 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">All Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-4 text-gray-900 font-semibold">Name</th>
                    <th className="py-2 px-4 text-gray-900 font-semibold">Joined Date</th>
                    <th className="py-2 px-4 text-gray-900 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((user, i) => (
                    <tr key={i} className="border-b border-white/10 hover:bg-gray-50">
                      <td className="py-2 px-4 flex items-center gap-2">
                        <span className="bg-white/20 text-gray-900 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                          {user.name[0].toUpperCase()}
                        </span> 
                        <span className="text-gray-900">{user.name}</span>
                      </td>
                      <td className="py-2 px-4 text-gray-900/80">{user.joined}</td>
                      <td className="py-2 px-4 flex gap-2">
                        <button className="text-blue-300 hover:text-blue-200 underline text-sm">View Profile</button>
                        <button className="text-red-400 hover:text-red-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'messages' && (
          <div className="glassmorphism rounded-2xl p-6 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Messages</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="py-2 px-4 text-gray-900 font-semibold">Date</th>
                    <th className="py-2 px-4 text-gray-900 font-semibold">Name</th>
                    <th className="py-2 px-4 text-gray-900 font-semibold">Email</th>
                    <th className="py-2 px-4 text-gray-900 font-semibold">Subject</th>
                    <th className="py-2 px-4 text-gray-900 font-semibold">Message</th>
                    <th className="py-2 px-4 text-gray-900 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockMessages.map((msg, i) => (
                    <tr key={i} className="border-b border-white/10 hover:bg-gray-50">
                      <td className="py-2 px-4 text-gray-900/80">{msg.date}</td>
                      <td className="py-2 px-4 text-gray-900">{msg.name}</td>
                      <td className="py-2 px-4 text-blue-300 hover:text-blue-200 underline">{msg.email}</td>
                      <td className="py-2 px-4 text-gray-900">{msg.subject}</td>
                      <td className="py-2 px-4 text-gray-900/80">{msg.message}</td>
                      <td className="py-2 px-4">
                        <button className="text-red-400 hover:text-red-300">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'organizations' && (
          <div className="glassmorphism rounded-2xl p-6 mb-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Organizations</h2>
            <p className="text-lg text-gray-900/80">Organization management coming soon.</p>
          </div>
        )}
      </div>
    </Layout>
  )
} 