import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DayPage from './pages/DayPage'
import SurveyDayPage from './pages/SurveyDayPage'
import LoginPage from './pages/LoginPage'
import AboutPage from './pages/AboutPage'
import ProductsPage from './pages/ProductsPage'
import HabitDetailPage from './pages/HabitDetailPage'
import ChallengePageWithFlip from './pages/ChallengePageWithFlip'
import LeaderboardPage from './pages/LeaderboardPage'
import AdminPage from './pages/AdminPage'
import NewAdminPage from './pages/NewAdminPage'
import AdminDebugPage from './pages/AdminDebugPage'
import SimpleAdminPage from './pages/SimpleAdminPage'
import AdminTestPage from './pages/AdminTestPage'
import { AdminStateProvider } from './contexts/AdminStateContext'
import { useAuth } from './hooks/useAuth'
import AdminCustomisation from './pages/AdminCustomisation'
import SuperAdminRoute from './components/SuperAdminRoute'

// Protected Route component that handles authentication redirection
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f4f66, #a7dbe3)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Pass the current location as state to preserve the intended destination
    console.log('🛡️ ProtectedRoute redirecting to login with state:', location)
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f4f66, #a7dbe3)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/habits" element={<ProductsPage />} />
        <Route path="/habits/:habitId" element={<HabitDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route path="/challenges" element={
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        } />
        
        {/* Leaderboard route - protected */}
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        } />
        
        {/* All Day Routes - protected */}
        <Route path="/day/:dayNumber" element={
          <ProtectedRoute>
            <DayPage />
          </ProtectedRoute>
        } />
        
        {/* Survey route - protected */}
        <Route path="/survey/:dayNumber" element={
          <ProtectedRoute>
            <SurveyDayPage />
          </ProtectedRoute>
        } />
        
        <Route path="/challenge/:habitId/:challengeId" element={<ChallengePageWithFlip />} />
        
        {/* Admin routes - protected */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminStateProvider>
              <NewAdminPage />
            </AdminStateProvider>
          </ProtectedRoute>
        } />
        <Route path="/admin-old" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/admin-debug" element={
          <ProtectedRoute>
            <AdminDebugPage />
          </ProtectedRoute>
        } />
        <Route path="/admin-simple" element={
          <ProtectedRoute>
            <SimpleAdminPage />
          </ProtectedRoute>
        } />
        <Route path="/admin-test" element={
          <ProtectedRoute>
            <AdminTestPage />
          </ProtectedRoute>
        } />
        <Route path="/admin-customisation" element={
          <ProtectedRoute>
            <SuperAdminRoute>
            {import.meta.env.VITE_FEATURE_ADMIN ? <AdminCustomisation /> : <Navigate to="/" replace />}
            </SuperAdminRoute>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}

export default App
