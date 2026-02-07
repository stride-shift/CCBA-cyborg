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
      {/* Fixed Coca-Cola red background with Background.png */}
      <div 
        className="fixed inset-0 overflow-hidden"
        style={{ 
          background: '#E61A27',
          backgroundImage: 'url(/Background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>
      
      {/* Content wrapper */}
      <div className="relative z-10 min-h-screen flex flex-col">
      {/* Animated floating bubbles */}
      <style>{`
        @keyframes float-up {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-40px) scale(1.05); }
        }
        @keyframes float-down {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(40px) scale(0.95); }
        }
        @keyframes float-side {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        .bubble {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.1) 50%, transparent 70%);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.1);
          z-index: 1;
        }
        .bubble-solid {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          z-index: 1;
        }
        .float-1 { animation: float-up 8s ease-in-out infinite; }
        .float-2 { animation: float-down 10s ease-in-out infinite; }
        .float-3 { animation: float-up 12s ease-in-out infinite; }
        .float-4 { animation: float-down 9s ease-in-out infinite; }
        .float-5 { animation: float-side 7s ease-in-out infinite; }
        .float-6 { animation: float-up 11s ease-in-out infinite; }
        .pulse { animation: pulse-glow 4s ease-in-out infinite; }
        
        /* Light red card - light red tint with dark text */
        .glassmorphism {
          background: rgba(255, 240, 240, 0.95);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 200, 200, 0.5);
        }
        .glassmorphism h1, .glassmorphism h2, .glassmorphism h3, .glassmorphism h4, .glassmorphism h5, .glassmorphism h6 {
          color: #1a1a1a !important;
        }
        .glassmorphism p, .glassmorphism span, .glassmorphism label, .glassmorphism div {
          color: #374151;
        }
        .glassmorphism a {
          color: #C41E3A;
        }
        
        /* Dark card - for forms and modals */
        .glassmorphism-dark {
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        /* Red card - Coca-Cola red themed */
        .glassmorphism-red {
          background: rgba(196, 30, 58, 0.9);
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Card styling */
        .card-white {
          background: rgba(255, 240, 240, 0.95);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
        }
        
        /* Red button styling */
        .btn-red {
          background: #F40009;
          color: white;
          border-radius: 9999px;
          padding: 12px 24px;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        .btn-red:hover {
          background: #d00008;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(244, 0, 9, 0.4);
        }
        
        /* Text styles */
        .text-shadow-dark {
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        /* Force dark text in glassmorphism */
        .text-dark {
          color: #1a1a1a !important;
        }
        .text-dark-muted {
          color: #6b7280 !important;
        }
        
        ::placeholder {
          text-shadow: none;
        }
      `}</style>

      {/* Floating bubbles throughout the page */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Small bubbles */}
        <div className="bubble-solid float-3 pulse w-8 h-8" style={{ top: '20%', right: '15%' }}></div>
        <div className="bubble-solid float-5 pulse w-6 h-6" style={{ bottom: '30%', left: '10%' }}></div>
        <div className="bubble-solid float-1 pulse w-10 h-10" style={{ top: '60%', right: '25%' }}></div>
      </div>

      {/* Navigation - Solid black */}
      <nav className="fixed top-0 left-0 right-0 z-[100] transition-all duration-300" 
        style={{
          background: '#000000',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          pointerEvents: 'auto'
        }}>
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo - Cyborg Habits + Coca-Cola branding */}
            <Link to="/" className="flex items-center gap-3 relative z-10">
              {/* Cyborg Habits Logo Icon (CSS circle) + Text */}
              <div className="flex items-center gap-1.5">
                <div className="relative w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-white"></div>
                </div>
                <span className="text-sm font-bold text-white tracking-wide">Cyborg Habits</span>
              </div>
              {/* Divider */}
              <div className="h-8 w-px bg-white/30"></div>
              {/* Coca-Cola Beverages Africa Logo - original red */}
              <img 
                src="/coca-cola-logo.png" 
                alt="Coca-Cola Beverages Africa" 
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8 relative z-10">
              <Link to="/" className="text-white hover:text-[#F40009] transition-colors font-medium">Home</Link>
              <Link to="/challenges" className="text-white hover:text-[#F40009] transition-colors font-medium">Challenges</Link>
              {user && (
                <>
                  <Link to="/progress-map" className="text-white hover:text-[#F40009] transition-colors font-medium">Progress Map</Link>
                  <Link to="/leaderboard" className="text-white hover:text-[#F40009] transition-colors font-medium">Leaderboard</Link>
                </>
              )}
              {isAdmin() && (
                <Link 
                  to="/admin" 
                  className="text-white hover:text-[#F40009] transition-colors font-medium"
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
                className="p-2 rounded-lg text-white hover:bg-white/10 transition-all border border-white/20"
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
                  <span className="text-white/80 text-sm">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="px-6 py-2 rounded-full bg-[#F40009] text-white hover:bg-[#d00008] transition-all font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-2 rounded-full bg-[#F40009] text-white hover:bg-[#d00008] transition-all font-medium"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
          {/* Mobile dropdown */}
          {isMobileMenuOpen && (
            <div
              className="md:hidden mt-3 rounded-xl bg-black/95 border border-white/10 overflow-hidden"
            >
              <div className="flex flex-col">
                <Link to="/" className="px-4 py-3 text-white hover:bg-[#F40009]/20 hover:text-[#F40009]">Home</Link>
                <Link to="/challenges" className="px-4 py-3 text-white hover:bg-[#F40009]/20 hover:text-[#F40009]">Challenges</Link>
                {user && (
                  <>
                    <Link to="/progress-map" className="px-4 py-3 text-white hover:bg-[#F40009]/20 hover:text-[#F40009]">Progress Map</Link>
                    <Link to="/leaderboard" className="px-4 py-3 text-white hover:bg-[#F40009]/20 hover:text-[#F40009]">Leaderboard</Link>
                  </>
                )}
                {isAdmin() && (
                  <Link to="/admin" className="px-4 py-3 text-white hover:bg-[#F40009]/20 hover:text-[#F40009]">Admin</Link>
                )}
                <div className="border-t border-white/10" />
                {user ? (
                  <button
                    onClick={handleSignOut}
                    className="text-left px-4 py-3 text-[#F40009] hover:bg-[#F40009]/20 font-medium"
                  >
                    Sign Out ({user.email})
                  </button>
                ) : (
                  <Link to="/login" className="px-4 py-3 text-[#F40009] hover:bg-[#F40009]/20 font-medium">Sign In</Link>
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