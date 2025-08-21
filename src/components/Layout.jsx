import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import Footer from './Footer'

function Layout({ children }) {
  const { user, signOut } = useAuth()
  const { profile, isAdmin } = useUserProfile()
  const navigate = useNavigate()
  const location = useLocation()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    console.log('🖱️ Layout: Sign out button clicked')
    try {
      await signOut()
      console.log('🧭 Layout: Navigating to /login')
      navigate('/login')
    } catch (error) {
      console.error('❌ Layout: Sign out error:', error)
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Fixed gradient background */}
      <div className="fixed inset-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f4f66, #a7dbe3)' }}></div>
      
      {/* Content wrapper */}
      <div className="relative z-10 min-h-screen flex flex-col">
      {/* Animated glass bubbles */}
      <style>{`
        @keyframes float-up {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes float-down {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(30px); }
        }
        .bubble {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.2), 0 8px 32px rgba(14, 20, 52, 0.15);
          z-index: 0;
        }
        .float-1 { animation: float-up 6s ease-in-out infinite; }
        .float-2 { animation: float-down 8s ease-in-out infinite; }
        .float-3 { animation: float-up 10s ease-in-out infinite; }
        .float-4 { animation: float-down 7s ease-in-out infinite; }
        
        .glassmorphism {
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(14, 20, 52, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        
        /* Enhanced text readability */
        .text-white {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        
        h1, h2, h3, h4, h5, h6 {
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        /* Remove text shadows from dark text colors */
        .text-gray-500,
        .text-gray-600,
        .text-gray-700,
        .text-gray-800,
        .text-gray-900,
        .text-black {
          text-shadow: none !important;
        }

        /* Also remove shadows from dark text in headings */
        h1.text-gray-500, h1.text-gray-600, h1.text-gray-700, h1.text-gray-800, h1.text-gray-900, h1.text-black,
        h2.text-gray-500, h2.text-gray-600, h2.text-gray-700, h2.text-gray-800, h2.text-gray-900, h2.text-black,
        h3.text-gray-500, h3.text-gray-600, h3.text-gray-700, h3.text-gray-800, h3.text-gray-900, h3.text-black,
        h4.text-gray-500, h4.text-gray-600, h4.text-gray-700, h4.text-gray-800, h4.text-gray-900, h4.text-black,
        h5.text-gray-500, h5.text-gray-600, h5.text-gray-700, h5.text-gray-800, h5.text-gray-900, h5.text-black,
        h6.text-gray-500, h6.text-gray-600, h6.text-gray-700, h6.text-gray-800, h6.text-gray-900, h6.text-black {
          text-shadow: none !important;
        }
        
        /* Remove shadows from elements with dark inline styles (like About page) */
        [style*="color: #0a1628"],
        [style*="color:#0a1628"],
        [style*="color: rgb(10, 22, 40)"],
        [style*="color:rgb(10, 22, 40)"],
        [style*="color: black"],
        [style*="color:black"],
        [style*="color: #000"],
        [style*="color:#000"] {
          text-shadow: none !important;
        }
        
        ::placeholder {
          text-shadow: none;
        }
      `}</style>

      {/* Background bubbles - scroll with content */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="bubble float-1 top-20 right-20 w-64 h-64"></div>
        <div className="bubble float-2 bottom-40 left-20 w-48 h-48"></div>
        <div className="bubble float-4 bottom-20 right-1/4 w-72 h-72"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300" 
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 4px 30px rgba(255, 255, 255, 0.1)',
          pointerEvents: 'auto'
        }}>
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 relative z-10">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                <div className="w-5 h-5 bg-white rounded-full"></div>
              </div>
              <span className="text-2xl font-bold text-white">Cyborg Habits</span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8 relative z-10">
              <Link to="/" className="text-white hover:text-gray-200 transition-colors">Home</Link>
              <Link to="/challenges" className="text-white hover:text-gray-200 transition-colors">Challenges</Link>
              {user && (
                <Link to="/leaderboard" className="text-white hover:text-gray-200 transition-colors">Leaderboard</Link>
              )}
              {/* <Link to="/about" className="text-white hover:text-gray-200 transition-colors">About</Link> */}
              {isAdmin() && (
                <Link 
                  to="/admin" 
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Mobile menu toggle */}
            <div className="md:hidden relative z-10">
              <button
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                aria-label="Toggle menu"
                className="glassmorphism p-2 rounded-lg text-white hover:bg-white/25 transition-all"
              >
                {/* Simple hamburger icon */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* Sign In Button */}
            <div className="relative z-10 hidden md:block">
              {user ? (
                <div className="flex items-center gap-4">
                  <span className="text-white text-sm">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="glassmorphism px-6 py-2 rounded-full text-white hover:bg-white/25 transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="glassmorphism px-6 py-2 rounded-full text-white hover:bg-white/25 transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
          {/* Mobile dropdown */}
          {isMobileMenuOpen && (
            <div
              className="md:hidden mt-3 glassmorphism rounded-xl border border-white/30 overflow-hidden"
            >
              <div className="flex flex-col">
                <Link to="/" className="px-4 py-3 text-white hover:bg-white/20">Home</Link>
                <Link to="/challenges" className="px-4 py-3 text-white hover:bg-white/20">Challenges</Link>
                {user && (
                  <Link to="/leaderboard" className="px-4 py-3 text-white hover:bg-white/20">Leaderboard</Link>
                )}
                {isAdmin() && (
                  <Link to="/admin" className="px-4 py-3 text-white hover:bg-white/20">Admin</Link>
                )}
                <div className="border-t border-white/20" />
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="text-left px-4 py-3 text-white hover:bg-white/20"
                  >
                    Sign Out ({user.email})
                  </button>
                ) : (
                  <Link to="/login" className="px-4 py-3 text-white hover:bg-white/20">Sign In</Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 pt-20 flex-1">
        {children}
      </div>

      {/* Footer */}
      <Footer />
      </div>
    </div>
  )
}

export default Layout 