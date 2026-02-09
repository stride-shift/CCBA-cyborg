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
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ 
          background: '#e8e8e8',
          backgroundImage: 'url(/Background-new.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F40009] mx-auto mb-4"></div>
          <p className="text-black font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ 
        background: '#e8e8e8',
        backgroundImage: 'url(/Background-new.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Floating red bubbles - matches Layout styling */}
      <style>{`
        @keyframes float-up {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-40px) scale(1.05); }
        }
        @keyframes float-down {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(40px) scale(0.95); }
        }
        .auth-bubble {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(244, 0, 9, 0.25), rgba(244, 0, 9, 0.08) 50%, transparent 70%);
          border: 1px solid rgba(244, 0, 9, 0.12);
          box-shadow: inset 0 0 20px rgba(244, 0, 9, 0.06);
          z-index: 1;
        }
        .float-1 { animation: float-up 6s ease-in-out infinite; }
        .float-2 { animation: float-down 8s ease-in-out infinite; }
        .float-3 { animation: float-up 10s ease-in-out infinite; }
        .float-4 { animation: float-down 7s ease-in-out infinite; }
      `}</style>
      
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="auth-bubble float-1 -top-40 -left-40 w-80 h-80"></div>
        <div className="auth-bubble float-2 -bottom-40 -right-40 w-96 h-96"></div>
        <div className="auth-bubble float-3 top-1/4 right-1/3 w-64 h-64"></div>
        <div className="auth-bubble float-4 bottom-1/3 left-1/4 w-48 h-48"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-xl mx-auto px-4">
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-4 mb-4">
            {/* Logo - matches Layout: Cyborg Habits + Coca-Cola branding */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="relative w-8 h-8 rounded-full bg-[#F40009]/20 flex items-center justify-center flex-shrink-0 border border-[#F40009]/30">
                  <div className="w-4 h-4 rounded-full bg-[#F40009]"></div>
                </div>
                <span className="text-xl font-bold text-black tracking-wide">Cyborg Habits</span>
              </div>
              <div className="h-10 w-px bg-black/20"></div>
              <img 
                src="/coca-cola-logo.png" 
                alt="Coca-Cola Beverages Africa" 
                className="h-14 w-auto object-contain"
              />
            </div>
          </div>
          <h2 className="text-2xl text-black font-semibold mb-2">
            {authView === 'sign_in' 
              ? 'Sign in to your account' 
              : otpStep === 'email' 
                ? 'Sign in with OTP' 
                : 'Enter your OTP'
            }
          </h2>
          <p className="text-black/70">
            {authView === 'sign_in' 
              ? 'Enter your credentials to access your account' 
              : otpStep === 'email'
                ? 'Enter your email to receive a one-time password'
                : 'Check your email and enter the code we sent you'
            }
          </p>
        </div>
        
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/50">
          {/* Shared Email Input */}
          <div className="mb-6">
            <label className="block text-gray-900 font-medium mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F40009] focus:border-transparent transition-all"
            />
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${
              message.includes('Error') 
                ? 'bg-red-100 border border-red-200 text-red-800' 
                : 'bg-green-100 border border-green-200 text-green-800'
            }`}>
              <p className="font-medium">{message}</p>
            </div>
          )}

          {authView === 'sign_in' ? (
            <>
              {/* Password Form */}
              <form onSubmit={handlePasswordLogin} className="space-y-6">
                <div>
                  <label className="block text-gray-900 font-medium mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={passwordLoading}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F40009] focus:border-transparent transition-all"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={passwordLoading || !email || !password}
                  className="w-full px-4 py-3 rounded-xl font-semibold transition-all bg-[#F40009] text-white hover:bg-[#d00008] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                  type="button"
                  onClick={() => {
                    setAuthView('otp')
                    setOtpStep('email')
                    setOtp('')
                    setMessage('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline font-medium"
                >
                  Sign in with OTP instead
                </button>
              </div>
            </>
          ) : otpStep === 'email' ? (
            <>
              {/* OTP Email Step */}
              <form onSubmit={handleSendOtp} className="space-y-6">
                <button
                  type="submit"
                  disabled={otpLoading || !email}
                  className="w-full px-4 py-3 rounded-xl font-semibold transition-all bg-[#F40009] text-white hover:bg-[#d00008] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                  type="button"
                  onClick={() => {
                    setAuthView('sign_in')
                    setPassword('')
                    setMessage('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline font-medium"
                >
                  Sign in with password instead
                </button>
              </div>
            </>
          ) : (
            <>
              {/* OTP Verification Step */}
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div>
                  <label className="block text-gray-900 font-medium mb-2">OTP Code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Enter 8-digit code"
                    maxLength="8"
                    required
                    disabled={otpLoading}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-gray-300 text-gray-900 text-center text-xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F40009] focus:border-transparent transition-all"
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={otpLoading || !otp || otp.length < 6}
                  className="w-full px-4 py-3 rounded-xl font-semibold transition-all bg-[#F40009] text-white hover:bg-[#d00008] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
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
                  type="button"
                  onClick={() => resetOtpFlow()}
                  className="text-sm text-gray-600 hover:text-gray-900 underline font-medium block w-full"
                >
                  Resend OTP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('sign_in')
                    setPassword('')
                    setMessage('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline font-medium"
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