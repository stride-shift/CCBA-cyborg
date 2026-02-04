import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function AuthComponent() {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  
  // Immediate debug logging - executes on every render
  console.log('🚀 AuthComponent rendered with location:', location)
  console.log('🚀 AuthComponent location.state:', location.state)
  const [authView, setAuthView] = useState('otp') // 'sign_in' or 'otp'
  const [otpStep, setOtpStep] = useState('email') // 'email' or 'verify'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Get the intended destination from URL params, location state, or localStorage
  const getIntendedDestination = () => {
    // First check if we have a 'from' location passed from route protection
    if (location.state?.from?.pathname) {
      console.log('🎯 Redirect from location.state:', location.state.from.pathname)
      return location.state.from.pathname
    }
    
    const params = new URLSearchParams(location.search)
    const redirectTo = params.get('redirectTo')
    const storedRedirect = localStorage.getItem('authRedirectTo')

    console.log('🎯 Redirect sources:', { redirectTo, storedRedirect })
    
    // Clear any old navigation persistence to prevent unwanted redirects
    try {
      const lastLocation = sessionStorage.getItem('lastKnownLocation')
      if (lastLocation) {
        console.log('🧹 Clearing stale navigation persistence:', lastLocation)
        sessionStorage.removeItem('lastKnownLocation')
      }
    } catch (e) {
      console.warn('Error clearing navigation persistence:', e)
    }
    
    return redirectTo || storedRedirect || '/challenges'
  }

  useEffect(() => {
    console.log('🔄 AuthComponent mounted with location:', location)
    console.log('🔄 Location state:', location.state)
    console.log('🔄 URL params:', location.search)
    
    // Store intended destination if provided in URL or location state
    const params = new URLSearchParams(location.search)
    const redirectTo = params.get('redirectTo')
    if (redirectTo) {
      console.log('💾 Storing redirectTo from URL params:', redirectTo)
      localStorage.setItem('authRedirectTo', redirectTo)
    } else if (location.state?.from?.pathname) {
      console.log('💾 Storing redirectTo from location state:', location.state.from.pathname)
      localStorage.setItem('authRedirectTo', location.state.from.pathname)
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('✅ User already logged in, getting destination...')
        const destination = getIntendedDestination()
        console.log('🚀 Navigating to:', destination)
        localStorage.removeItem('authRedirectTo') // Clean up
        navigate(destination)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', event, !!session)
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ User signed in, getting destination...')
        const destination = getIntendedDestination()
        console.log('🚀 Navigating to:', destination)
        localStorage.removeItem('authRedirectTo') // Clean up
        
        // Add a small delay to ensure auth state is fully settled
        setTimeout(() => {
          console.log('⏰ Executing delayed navigation to:', destination)
          navigate(destination, { replace: true })
          console.log('✨ Navigation completed')
        }, 100)
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate, location])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!email) return

    setOtpLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: true // Allow signup if user doesn't exist
        }
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('OTP sent to your email!')
        setOtpStep('verify')
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setOtpLoading(false)
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!email || !otp) return

    setOtpLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email'
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        // Success! User will be redirected by auth state change
        setMessage('Success! Signing you in...')
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setOtpLoading(false)
  }

  const resetOtpFlow = (clearEmail = false) => {
    setOtpStep('email')
    if (clearEmail) {
      setEmail('')
    }
    setOtp('')
    setMessage('')
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return

    setPasswordLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Success! Signing you in...')
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }

    setPasswordLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d0a0a 25%, #F40009 50%, #8B0000 75%, #1a1a1a 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d0a0a 25%, #F40009 50%, #8B0000 75%, #1a1a1a 100%)' }}>
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
          background: linear-gradient(145deg, rgba(244, 0, 9, 0.15), rgba(139, 0, 0, 0.1));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 0 20px rgba(244, 0, 9, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3);
          z-index: 0;
        }
        .float-1 { animation: float-up 6s ease-in-out infinite; }
        .float-2 { animation: float-down 8s ease-in-out infinite; }
        .float-3 { animation: float-up 10s ease-in-out infinite; }
        .float-4 { animation: float-down 7s ease-in-out infinite; }
        .float-5 { animation: float-up 9s ease-in-out infinite; }

        
        /* Glassmorphism for the sign-in box */
        .glassmorphism {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Custom OTP form styles */
        .otp-form input {
          background: #1a1a1a !important;
          border: 1px solid #F40009 !important;
          border-radius: 0.75rem !important;
          padding: 0.75rem !important;
          font-size: 1rem !important;
          color: #ffffff !important;
          width: 100% !important;
        }
        
        .otp-form input:focus {
          outline: none !important;
          border-color: #F40009 !important;
          box-shadow: 0 0 0 2px rgba(244, 0, 9, 0.3) !important;
        }
        
        .otp-form button {
          background-color: #F40009 !important;
          border: 1px solid #F40009 !important;
          border-radius: 0.75rem !important;
          padding: 0.75rem 1.5rem !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          transition: all 0.3s ease !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          width: 100% !important;
        }
        
        .otp-form button:hover:not(:disabled) {
          background-color: #cc0008 !important;
          color: white !important;
          transform: translateY(-2px) !important;
        }
        
        .otp-form button:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
      `}</style>
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="bubble float-1 -top-40 -left-40 w-80 h-80"></div>
        <div className="bubble float-2 -bottom-40 -right-40 w-96 h-96"></div>
        <div className="bubble float-3 top-1/4 right-1/3 w-64 h-64"></div>
        <div className="bubble float-4 bottom-1/3 left-1/4 w-48 h-48"></div>
        <div className="bubble float-5 top-1/2 left-1/2 w-72 h-72 -translate-x-1/2 -translate-y-1/2"></div>
        <div className="bubble float-1 top-20 right-20 w-32 h-32"></div>
        <div className="bubble float-2 bottom-20 left-20 w-40 h-40"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-3 mb-4">
            {/* CCBA Logo */}
            <div className="h-24 w-24 rounded-2xl overflow-hidden shadow-xl border-2 border-white/30">
              <img src="/ccba-logo.png" alt="CCBA" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-4xl font-bold text-white">Cyborg Habits</h1>
          </div>
          <h2 className="text-2xl text-white font-semibold mb-2">
            {authView === 'sign_in' 
              ? 'Sign in to your account' 
              : otpStep === 'email' 
                ? 'Sign in with OTP' 
                : 'Enter your OTP'
            }
          </h2>
          <p className="text-white/80">
            {authView === 'sign_in' 
              ? 'Enter your credentials to access your account' 
              : otpStep === 'email'
                ? 'Enter your email to receive a one-time password'
                : 'Check your email and enter the 6-digit code'
            }
          </p>
        </div>
        
        <div className="glassmorphism rounded-2xl p-8">
          {/* Shared Email Input */}
          <div className="mb-6">
            <label className="block text-white font-medium mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full p-3 rounded-lg border border-[#F40009]/50 bg-black/50 text-white placeholder-white/50 focus:outline-none focus:border-[#F40009] focus:ring-2 focus:ring-[#F40009]/30"
            />
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.includes('Error') 
                ? 'bg-red-500/30 border border-red-500/50 text-white' 
                : 'bg-green-500/30 border border-green-500/50 text-white'
            }`}>
              <p className="font-medium">{message}</p>
            </div>
          )}

          {authView === 'sign_in' ? (
            <>
              {/* Password Form */}
              <form onSubmit={handlePasswordLogin} className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={passwordLoading}
                    className="w-full p-3 rounded-lg border border-[#F40009]/50 bg-black/50 text-white placeholder-white/50 focus:outline-none focus:border-[#F40009] focus:ring-2 focus:ring-[#F40009]/30"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={passwordLoading || !email || !password}
                  className="w-full p-3 rounded-lg font-semibold transition-all bg-[#F40009] border border-[#F40009] text-white hover:bg-[#cc0008] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
              
              <div className="text-center mt-6">
                <button
                  onClick={() => {
                    setAuthView('otp')
                    setOtpStep('email')
                    setOtp('')
                    setMessage('')
                  }}
                  className="text-sm text-white/70 hover:text-white underline font-medium"
                >
                  Sign in with OTP instead
                </button>
              </div>
            </>
          ) : otpStep === 'email' ? (
            <>
              {/* OTP Email Step */}
              <form onSubmit={handleSendOtp} className="otp-form space-y-6">                
                <button
                  type="submit"
                  disabled={otpLoading || !email}
                >
                  {otpLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Sending OTP...
                    </div>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
              
              <div className="text-center mt-6">
                <button
                  onClick={() => {
                    setAuthView('sign_in')
                    setPassword('')
                    setMessage('')
                  }}
                  className="text-sm text-white/70 hover:text-white underline font-medium"
                >
                  Sign in with password instead
                </button>
              </div>
            </>
          ) : (
            <>
              {/* OTP Verification Step */}
              <form onSubmit={handleVerifyOtp} className="otp-form space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">6-Digit OTP Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    maxLength="6"
                    required
                    disabled={otpLoading}
                    className="text-center text-xl tracking-wider"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={otpLoading || !otp || otp.length !== 6}
                >
                  {otpLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </div>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </form>
              
              <div className="text-center mt-6 space-y-2">
                <button
                  onClick={() => resetOtpFlow()}
                  className="text-sm text-gray-600 hover:text-gray-800 underline font-medium block w-full"
                >
                  Resend OTP
                </button>
                <button
                  onClick={() => {
                    setAuthView('sign_in')
                    setPassword('')
                    setMessage('')
                  }}
                  className="text-sm text-white/70 hover:text-white underline font-medium"
                >
                  Sign in with password instead
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthComponent 