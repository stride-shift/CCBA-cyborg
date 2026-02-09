import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useNavigationPersistence } from '../hooks/useNavigationPersistence'
import { supabase } from '../lib/supabase'

function ProductsPage() {
  const { user } = useAuth()
  const location = useLocation()
  useNavigationPersistence() // Track navigation state
  const [completedDays, setCompletedDays] = useState(new Set())
  const [isAdditionalChallengesOpen, setIsAdditionalChallengesOpen] = useState(false)
  const [introVideo, setIntroVideo] = useState(null)
  const [isVideoLoading, setIsVideoLoading] = useState(true)
  const [openMonth, setOpenMonth] = useState(null) // Track which month is expanded
  const showAdditionalChallenges = false // Set to true to re-enable Additional Challenges section

  const challenges = [
    {
      id: 'explain-it',
      name: 'Explain It',
      description: 'Learn to clearly communicate complex ideas with AI assistance. Master the techniques to break down abstract concepts, translate technical jargon, and explain difficult topics to any audience.',
      categories: ['Communication', 'Learning'],
      gradient: 'from-blue-500/70 to-blue-600/70',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=600&fit=crop',
      icon: '📖'
    },
    {
      id: 'guide-it',
      name: 'Guide It',
      description: 'Use AI to provide step-by-step guidance, making even the most complex tasks feel simple and manageable.',
      categories: ['Learning', 'Productivity'],
      gradient: 'from-red-600/70 to-red-800/70',
      image: 'https://images.unsplash.com/photo-1506818144585-74b29c980d4b?w=400&h=600&fit=crop',
      icon: '🧭'
    },
    {
      id: 'imagine-it',
      name: 'Imagine It',
      description: 'This AI habit helps you explore possibilities, test scenarios, and uncover innovative solutions—turning ideas into real opportunities.',
      categories: ['Creativity'],
      gradient: 'from-purple-500/70 to-purple-600/70',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop',
      icon: '💡'
    },
    {
      id: 'critique-it',
      name: 'Critique It',
      description: 'You will use AI to help you challenge assumptions, spot risks, and uncover blind spots-so every idea is stronger before it\'s put into action.',
      categories: ['Analysis', 'Decision Making'],
      gradient: 'from-orange-500/70 to-orange-600/70',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
      icon: '🔍'
    },
    {
      id: 'improve-it',
      name: 'Improve It',
      description: "You'll use AI to catch weak spots, strengthen arguments, and make clearer, more confident decisions.",
      categories: ['Productivity', 'Analysis'],
      gradient: 'from-green-500/70 to-green-600/70',
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=600&fit=crop',
      icon: '✨'
    },
    {
      id: 'plan-it',
      name: 'Plan It',
      description: "You'll use AI to help you create detailed, multi-step strategies tailored to your needs, ensuring nothing gets missed and every step is optimized.",
      categories: ['Organization', 'Productivity'],
      gradient: 'from-indigo-500/70 to-indigo-600/70',
      image: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=600&fit=crop',
      icon: '📋'
    },
    {
      id: 'suggest-it',
      name: 'Suggest It',
      description: 'With this habit, you will use AI to provide well-reasoned options with pros and cons, helping you make faster, smarter decisions-without the stress.',
      categories: ['Decision Making', 'Analysis'],
      gradient: 'from-pink-500/70 to-pink-600/70',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=600&fit=crop',
      icon: '💭'
    }
  ]

  useEffect(() => {
    if (user) {
      fetchCompletedDays()
    }
    fetchIntroVideo()
  }, [user])

  // Refresh completed days when returning to the page (but with debouncing to prevent excessive calls)
  useEffect(() => {
    let focusTimeout
    
    const handleFocus = () => {
      if (user) {
        // Debounce focus events to prevent rapid refetching
        clearTimeout(focusTimeout)
        focusTimeout = setTimeout(() => {
          console.log('Page focused - refreshing completed days (debounced)')
        fetchCompletedDays()
        }, 1000) // Wait 1 second before refetching
      }
    }

    // Listen for when the window/tab comes back into focus
    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      clearTimeout(focusTimeout)
    }
  }, [user])

  // Refresh data when navigating to this page (only once per navigation)
  useEffect(() => {
    const currentPath = location.pathname
    const previousPath = sessionStorage.getItem('previousPath')
    
    if (user && ['/challenges', '/products', '/habits'].includes(currentPath)) {
      // Only refresh if we actually navigated to this page (not just a re-render)
      if (previousPath !== currentPath) {
      console.log('🏠 Navigated to challenges/products page - refreshing data')
      fetchCompletedDays()
        sessionStorage.setItem('previousPath', currentPath)
      }
    }
  }, [location.pathname, user])

  const fetchCompletedDays = async () => {
    if (!user) return
    
    console.log('🔄 Fetching completed days for user:', user.id)
    
    try {
      // Fetch challenge completions - ONLY check if both challenges are completed (reflections are optional)
      const { data: challengeData, error: challengeError } = await supabase
        .from('user_day_completions')
        .select('challenge_id, challenges!inner(order_index)')
        .eq('user_id', user.id)
        .eq('both_challenges_completed', true)
        // Removed reflection_submitted requirement since reflections are optional

      console.log('📊 Challenge data from DB:', challengeData)
      console.log('❌ Challenge error:', challengeError)

      // Fetch survey completions
      const { data: preSurveyData, error: preSurveyError } = await supabase
        .from('pre_survey_responses')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { data: postSurveyData, error: postSurveyError } = await supabase
        .from('post_survey_responses')
        .select('id')
        .eq('user_id', user.id)
        .single()

      console.log('📋 Pre-survey data:', preSurveyData, 'Error:', preSurveyError)
      console.log('📋 Post-survey data:', postSurveyData, 'Error:', postSurveyError)

      if (challengeError && challengeError.code !== 'PGRST116') {
        console.error('Error fetching completed days:', challengeError)
        // Fallback to localStorage
        const savedProgress = JSON.parse(localStorage.getItem('completedDays') || '[]')
        setCompletedDays(new Set(savedProgress))
        return
      }

      // Combine all completed days
      const completedDayNumbers = []
      
      // Add challenge days (days 1-15: complete when both challenges done)
      if (challengeData) {
        const challengeDays = challengeData.map(item => item.challenges.order_index)
        completedDayNumbers.push(...challengeDays)
        console.log('✅ Challenge days completed:', challengeDays)
      }
      
      // Add survey days (day 0 & 52: complete when survey submitted)
      if (preSurveyData && !preSurveyError) {
        completedDayNumbers.push(0) // Day 0 (pre-survey)
        console.log('✅ Pre-survey completed')
      }
      
      if (postSurveyData && !postSurveyError) {
        completedDayNumbers.push(51) // Day 51 (post-survey)
        console.log('✅ Post-survey completed')
      }

      console.log('🎯 Final completed days:', completedDayNumbers)
      setCompletedDays(new Set(completedDayNumbers))
      
    } catch (error) {
      console.error('Error connecting to Supabase:', error)
      // Fallback to localStorage
      const savedProgress = JSON.parse(localStorage.getItem('completedDays') || '[]')
      setCompletedDays(new Set(savedProgress))
    }
  }

  const fetchIntroVideo = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('video_scope', 'global')
        .is('habit_type', null)
        .eq('is_active', true)
        .order('order_index')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching intro video:', error)
      } else if (data) {
        setIntroVideo(data)
      }
    } catch (error) {
      console.error('Error connecting to Supabase for intro video:', error)
    }
    setIsVideoLoading(false)
  }

  const totalDays = 53 // March (17 days) + 9 months × 4 days = 53 total
  const totalDaysWithSurveys = 55 // pre-survey + 53 days + post-survey
  const progressPercentage = (completedDays.size / totalDaysWithSurveys) * 100


  const renderDayTile = (dayNumber) => {
    const isCompleted = completedDays.has(dayNumber)
    const isSurveyDay = dayNumber === 0 || dayNumber === 51
    const isPreSurvey = dayNumber === 0
    const isPostSurvey = dayNumber === 51

    return (
      <Link
        key={dayNumber}
        to={`/day/${dayNumber}`}
        className="snap-start flex-shrink-0"
      >
        <div className={`
          w-64 md:w-72 h-48 rounded-2xl flex flex-col items-center justify-center
          transition-all duration-300 hover:scale-105 cursor-pointer
          glassmorphism relative flex-shrink-0
          ${isCompleted 
            ? 'border-2 border-[#C41E3A]' 
            : 'hover:bg-white/20'
          }
          ${isSurveyDay 
            ? 'bg-gradient-to-br from-red-500/20 to-red-800/20 w-80 h-48' 
            : ''
          }
        `}>
          {isSurveyDay && (
            <div className="absolute top-3 left-3 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-full font-medium">
              Survey
            </div>
          )}
          
          <div className="text-center">
            <span className={`font-bold text-[#C41E3A] ${isSurveyDay ? 'text-5xl' : 'text-7xl'}`}>
              {dayNumber}
            </span>
            {isSurveyDay && (
              <div className="mt-2">
                <p className="text-black text-sm font-medium">
                  {isPreSurvey ? 'Pre-Program' : 'Post-Program'}
                </p>
                <p className="text-black/60 text-xs">
                  Survey Day
                </p>
              </div>
            )}
          </div>

          {/* Survey Icon */}
          {isSurveyDay && (
            <div className="absolute bottom-4 right-4">
              <svg className="w-6 h-6 text-[#C41E3A]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}

          {isCompleted && (
            <div className="absolute top-4 right-4 bg-[#C41E3A] rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </Link>
    )
  }

  const renderDayButton = (dayNumber, monthName) => {
    const isCompleted = completedDays.has(dayNumber)
    const challengeName = getChallengeName(monthName, dayNumber)

    return (
      <Link
        key={dayNumber}
        to={`/day/${dayNumber}`}
        className="block"
      >
        <div className={`
          w-full h-24 md:h-28 px-4 py-3 rounded-xl flex items-center justify-center
          transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer
          relative
          ${isCompleted 
            ? 'bg-[#C41E3A] border-2 border-red-400 shadow-lg' 
            : 'bg-white/90 border border-white/50 hover:bg-white shadow-md'
          }
        `}>
          {/* Checkmark for completed */}
          {isCompleted && (
            <div className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <svg className="w-4 h-4 text-[#C41E3A]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          
          <span className={`font-semibold text-xs md:text-sm text-center leading-tight ${isCompleted ? 'text-white' : 'text-gray-800'}`}>
            {challengeName}
          </span>
        </div>
      </Link>
    )
  }

  // Challenge names for March
  const marchChallenges = {
    1: 'Student to Professional 1: Intro to Cyborg Habits & Augmented Working',
    2: 'Student to Professional 2: Technology Proficiency for the Future of Work',
    3: 'Student to Professional 3: Storytelling & Professional Communication',
    4: 'Student to Professional 4: Crafting Your Personal Brand in CCBA, Workplace Etiquette & Meeting Discipline',
    5: 'Student to Professional 5: Personal Finance',
    6: 'CH Challenge 1',
    7: 'CH Challenge 2',
    8: 'CH Challenge 3',
    9: 'CH Challenge 4',
    10: 'Student to Professional 6: Digital Identity, LinkedIn & Internal Visibility',
    11: 'In-Trade Learning 1',
    12: 'In-Trade Learning 2',
    13: 'In-Trade Learning 3',
    14: 'In-Trade Learning 4',
    15: 'Student to Professional 7: Productivity Systems & Task Management (with AI)',
    16: 'In-Trade Learning 5',
    17: 'In-Trade Learning 6'
  }

  const getChallengeName = (monthName, dayNumber) => {
    if (monthName === 'March' && marchChallenges[dayNumber]) {
      return marchChallenges[dayNumber]
    }
    // For other months, show relative day number (1-4) instead of absolute
    const monthStartDays = {
      'April': 18,
      'May': 22,
      'June': 26,
      'July': 30,
      'August': 34,
      'September': 38,
      'October': 42,
      'November': 46,
      'December': 50
    }
    const startDay = monthStartDays[monthName]
    if (startDay) {
      const relativeDayNumber = dayNumber - startDay + 1
      return `Day ${relativeDayNumber}`
    }
    return `Day ${dayNumber}`
  }

  const getMonthDays = (monthName) => {
    // Each month has unique sequential day numbers
    // March: days 1-17 (17 challenges)
    // April-December: 4 days each, continuing the sequence
    const monthRanges = {
      'March': { start: 1, count: 17 },      // Days 1-17
      'April': { start: 18, count: 4 },      // Days 18-21
      'May': { start: 22, count: 4 },        // Days 22-25
      'June': { start: 26, count: 4 },       // Days 26-29
      'July': { start: 30, count: 4 },       // Days 30-33
      'August': { start: 34, count: 4 },     // Days 34-37
      'September': { start: 38, count: 4 },  // Days 38-41
      'October': { start: 42, count: 4 },    // Days 42-45
      'November': { start: 46, count: 4 },   // Days 46-49
      'December': { start: 50, count: 4 }    // Days 50-53
    }
    
    const range = monthRanges[monthName]
    if (range) {
      return Array.from({ length: range.count }, (_, i) => range.start + i)
    }
    return []
  }

  const renderMonthCard = (monthName) => {
    const isOpen = openMonth === monthName
    const daysInMonth = getMonthDays(monthName)
    
    // Calculate completed days in this month
    const completedDaysInMonth = daysInMonth.filter(day => completedDays.has(day)).length
    const totalDaysInMonth = daysInMonth.length
    const monthProgress = totalDaysInMonth > 0 ? (completedDaysInMonth / totalDaysInMonth) * 100 : 0

    return (
      <div
        key={monthName}
        onClick={() => setOpenMonth(isOpen ? null : monthName)}
        className={`
          w-full min-h-[140px] md:min-h-[160px] rounded-2xl flex flex-col items-center justify-center
          transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer
          relative p-4 md:p-6
          ${isOpen 
            ? 'bg-white/95 shadow-lg border-2 border-[#C41E3A]' 
            : 'bg-white/90 border border-white/50 hover:bg-white/95'
          }
        `}
        style={isOpen ? { boxShadow: '0 0 15px rgba(196, 30, 58, 0.3)' } : { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
      >
        <div className="text-center w-full">
          <span className="font-bold text-[#C41E3A] text-2xl md:text-3xl block mb-2" style={{ textShadow: 'none' }}>
            {monthName}
          </span>
          
          {/* Progress indicator */}
          <div className="mt-2">
            <div className="flex items-center justify-center gap-1.5 text-gray-600 text-xs md:text-sm">
              <span>{completedDaysInMonth}/{totalDaysInMonth} days</span>
              <span>•</span>
              <span>{Math.round(monthProgress)}%</span>
            </div>
            <div className="mt-1.5 w-full max-w-[120px] mx-auto bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#C41E3A] to-[#E85D6F] h-full transition-all duration-500"
                style={{ width: `${monthProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Dropdown Arrow */}
        <div className="absolute top-3 right-3 md:top-4 md:right-4">
          <div className={`
            rounded-full p-2
            border border-gray-300 bg-white/50
            transition-all duration-300
            ${isOpen ? 'bg-gray-100 rotate-180' : 'hover:bg-gray-100'}
          `}>
            <svg 
              className="w-4 h-4 text-gray-600 transition-transform duration-300"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-[1600px]">
        {/* Introduction Section */}
        <div className="mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 text-black">
            Watch this video to get started
          </h1>

          {/* Video Container */}
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl glassmorphism">
            <div className="aspect-w-16 aspect-h-9">
              {isVideoLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-800" style={{ minHeight: '500px' }}>
                  <div className="text-white text-lg">Loading video...</div>
                </div>
              ) : introVideo ? (
                <iframe
                  src={`https://www.youtube.com/embed/${introVideo.youtube_video_id}?rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=1&fs=1&iv_load_policy=3`}
                  title={introVideo.title || "Introduction To Cyborg Habits"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ minHeight: '500px' }}
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800" style={{ minHeight: '500px' }}>
                  <div className="text-center text-white">
                    <h3 className="text-xl mb-2">Introductory Video Coming Soon</h3>
                    <p className="text-gray-300">The introduction video will be available once configured in the database.</p>
                  </div>
                </div>
              )}
            </div>
            {introVideo && (
              <div className="p-4 bg-white border-t border-gray-200">
                <h3 className="text-gray-900 font-semibold mb-1">{introVideo.title}</h3>
                {introVideo.description && (
                  <p className="text-gray-600 text-sm">{introVideo.description}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Your Journey Section */}
        <div className="mb-20">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-black">
              Your Journey
            </h2>
          </div>

          {/* Pre-Survey Card - Journey Start Section */}
          <div className="mb-12 md:mb-16 relative">
            {/* Decorative wavy path */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 1200 300" preserveAspectRatio="none">
                <path 
                  d="M0,150 Q200,100 400,150 T800,150 T1200,150" 
                  fill="none" 
                  stroke="rgba(244,0,9,0.15)" 
                  strokeWidth="2"
                  strokeDasharray="8,8"
                />
              </svg>
              {/* Decorative dots on the path */}
              <div className="absolute left-[10%] top-1/2 w-3 h-3 rounded-full bg-[#F40009]/20 transform -translate-y-1/2"></div>
              <div className="absolute right-[10%] top-1/2 w-3 h-3 rounded-full bg-[#F40009]/20 transform -translate-y-1/2"></div>
            </div>

            {/* Centered Content */}
            <div className="flex flex-col items-center relative z-10">
              {/* Start Here Button */}
              <Link to="/day/0" className="group mb-2">
                <div className="bg-gradient-to-b from-[#C41E3A] to-[#8B0000] px-6 py-3 rounded-full shadow-lg group-hover:scale-105 transition-transform border-2 border-red-400/50">
                  <span className="text-white font-semibold text-base block text-center">Start Here</span>
                  <div className="flex justify-center mt-0.5">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
              </Link>

              {/* Small connector dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-[#C41E3A] mb-2 shadow-md"></div>

              {/* Survey Card */}
              <Link to="/day/0" className="group">
                <div className="bg-white/95 rounded-xl shadow-xl p-6 min-w-[200px] text-center relative hover:shadow-2xl transition-all hover:scale-105 border border-white/50">
                  {/* Large number */}
                  <div className="text-5xl font-bold text-gray-700 mb-2">0</div>
                  
                  {/* Progress/Divider line */}
                  <div className="w-20 h-1 bg-gradient-to-r from-[#C41E3A] to-[#E85D6F] mx-auto mb-3 rounded-full"></div>
                  
                  {/* Text */}
                  <div className="text-gray-700 font-semibold text-sm">Pre-Program Survey</div>
                  <div className="text-gray-500 text-xs mt-0.5">Survey Day</div>

                  {/* Completion checkmark */}
                  {completedDays.has(0) && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-[#C41E3A] rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>
            </div>
          </div>

          {/* Row 1: March to July */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 w-full">
            {renderMonthCard('March')}
            {renderMonthCard('April')}
            {renderMonthCard('May')}
            {renderMonthCard('June')}
            {renderMonthCard('July')}
          </div>

          {/* Dropdown for Row 1 */}
          <div className={`
            mt-4 transition-all duration-500 overflow-hidden
            ${['March', 'April', 'May', 'June', 'July'].includes(openMonth) ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
          `}>
            <div 
              className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 md:p-6"
              style={{ borderWidth: '2px', borderColor: '#C41E3A', boxShadow: '0 0 15px rgba(196, 30, 58, 0.3)' }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                {['March', 'April', 'May', 'June', 'July'].includes(openMonth) && getMonthDays(openMonth).map((dayNumber) => renderDayButton(dayNumber, openMonth))}
              </div>
            </div>
          </div>

          {/* Row 2: August to December */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 w-full mt-6">
            {renderMonthCard('August')}
            {renderMonthCard('September')}
            {renderMonthCard('October')}
            {renderMonthCard('November')}
            {renderMonthCard('December')}
          </div>

          {/* Dropdown for Row 2 */}
          <div className={`
            mt-4 transition-all duration-500 overflow-hidden
            ${['August', 'September', 'October', 'November', 'December'].includes(openMonth) ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'}
          `}>
            <div 
              className="bg-black/30 backdrop-blur-sm rounded-2xl p-4 md:p-6"
              style={{ borderWidth: '2px', borderColor: '#C41E3A', boxShadow: '0 0 15px rgba(196, 30, 58, 0.3)' }}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                {['August', 'September', 'October', 'November', 'December'].includes(openMonth) && getMonthDays(openMonth).map((dayNumber) => renderDayButton(dayNumber, openMonth))}
              </div>
            </div>
          </div>

          <div className="mb-12"></div>

          {/* Progress Section */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">
              Your Progress
            </h3>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#F40009] to-[#8B0000] h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="flex justify-between items-center">
              <span className="text-lg text-gray-600">
                {completedDays.size}/{totalDaysWithSurveys} days completed (includes surveys)
              </span>
              <span className="text-2xl font-bold text-[#C41E3A]">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </div>

        {/* Additional Challenges Section - Hidden for now */}
        {showAdditionalChallenges && (
          <div className="mb-20">
            <div 
              className="flex items-center justify-between cursor-pointer mb-8"
              onClick={() => setIsAdditionalChallengesOpen(!isAdditionalChallengesOpen)}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-black">
                Additional Challenges <span className="text-2xl md:text-3xl text-black/60">(Optional)</span>
              </h2>
              <div className="glassmorphism p-3 rounded-full transition-all duration-200 hover:bg-white/20">
                <svg 
                  className={`w-6 h-6 text-white transition-transform duration-300 ${isAdditionalChallengesOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Challenge Cards Grid */}
            <div className={`grid md:grid-cols-3 lg:grid-cols-3 gap-x-6 gap-y-32 transition-all duration-500 overflow-hidden ${
              isAdditionalChallengesOpen ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {challenges.map((challenge) => (
                <div key={challenge.id} className="group relative">
                  <div className="relative transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl rounded-2xl">
                    <Link
                      to={`/habits/${challenge.id}`}
                      className="block"
                    >
                      <div className={`
                        relative h-[350px] rounded-t-2xl overflow-hidden
                        cursor-pointer
                      `}>
                        {/* Background Image */}
                        <div 
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${challenge.image})` }}
                        />

                        {/* Gradient Overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-b ${challenge.gradient}`} />

                        {/* Glassmorphism Content Container */}
                        <div className="absolute inset-0 flex flex-col justify-end p-6">
                          <div className="flex flex-col items-start">
                            <h3 className="text-3xl font-bold text-white mb-3">
                              {challenge.name}
                            </h3>
                            <button className="flex items-center text-white/90 hover:text-white transition-colors">
                              <span className="text-sm mr-2">View Challenges</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Connected Dropdown with Glassmorphism */}
                    <div className={`
                      absolute left-0 right-0 top-[350px]
                      transition-all duration-300 
                      rounded-b-2xl
                      opacity-0 invisible max-h-0 overflow-hidden
                      group-hover:opacity-100 group-hover:visible group-hover:max-h-32
                    `}>
                      <div className="p-4 rounded-b-2xl" style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 8px 32px rgba(14, 20, 52, 0.1)'
                      }}>
                        <p className="text-sm text-white">
                          {challenge.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Background decorations */}
        <div className="absolute top-20 right-0 w-96 h-96 rounded-full glassmorphism opacity-20"></div>
        <div className="absolute bottom-0 left-20 w-64 h-64 rounded-full glassmorphism opacity-30"></div>
      </div>

    </Layout>
  )
}

export default ProductsPage 


