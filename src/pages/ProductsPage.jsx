import { useState, useEffect, useRef } from 'react'
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
  const showAdditionalChallenges = false // Set to true to re-enable Additional Challenges section
  const scrollContainerRef = useRef(null)

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
      gradient: 'from-teal-500/70 to-teal-600/70',
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
      // Fetch regular challenge completions - ONLY check if both challenges are completed (reflections are optional)
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
      
      // Add regular challenge days (days 1-15: complete when both challenges done)
      if (challengeData) {
        const challengeDays = challengeData.map(item => item.challenges.order_index)
        completedDayNumbers.push(...challengeDays)
        console.log('✅ Challenge days completed:', challengeDays)
      }
      
      // Add survey days (day 0 & 16: complete when survey submitted)
      if (preSurveyData && !preSurveyError) {
        completedDayNumbers.push(0) // Day 0 (pre-survey)
        console.log('✅ Pre-survey completed')
      }
      
      if (postSurveyData && !postSurveyError) {
        completedDayNumbers.push(16) // Day 16 (post-survey)
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

  const totalDays = 15
  const totalDaysWithSurveys = 17 // 0, 1-15, 16
  const progressPercentage = (completedDays.size / totalDaysWithSurveys) * 100

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' })
    }
  }

  const renderDayTile = (dayNumber) => {
    const isCompleted = completedDays.has(dayNumber)
    const isSurveyDay = dayNumber === 0 || dayNumber === 16
    const isPreSurvey = dayNumber === 0
    const isPostSurvey = dayNumber === 16

    return (
      <Link
        key={dayNumber}
        to={`/day/${dayNumber}`}
        className="snap-start flex-shrink-0"
      >
        <div className={`
          w-80 h-48 rounded-2xl flex flex-col items-center justify-center
          transition-all duration-300 hover:scale-105 cursor-pointer
          glassmorphism relative
          ${isCompleted 
            ? 'border-2 border-green-400' 
            : 'hover:bg-white/20'
          }
          ${isSurveyDay 
            ? 'bg-gradient-to-br from-blue-500/20 to-teal-500/20' 
            : ''
          }
        `}>
          {isSurveyDay && (
            <div className="absolute top-3 left-3 bg-blue-500/80 text-white text-xs px-2 py-1 rounded-full font-medium">
              Survey
            </div>
          )}
          
          <div className="text-center">
            <span className={`font-bold text-white ${isSurveyDay ? 'text-5xl' : 'text-7xl'}`}>
              {dayNumber}
            </span>
            {isSurveyDay && (
              <div className="mt-2">
                <p className="text-white text-sm font-medium">
                  {isPreSurvey ? 'Pre-Program' : 'Post-Program'}
                </p>
                <p className="text-white/80 text-xs">
                  Survey Day
                </p>
              </div>
            )}
          </div>

          {/* Survey Icon */}
          {isSurveyDay && (
            <div className="absolute bottom-4 right-4">
              <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}

          {isCompleted && (
            <div className="absolute top-4 right-4 glassmorphism rounded-full p-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </Link>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-16">
        {/* Introduction Section */}
        <div className="mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 text-white">
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
              <div className="p-4 bg-white/10 backdrop-blur-sm">
                <h3 className="text-white font-semibold mb-1">{introVideo.title}</h3>
                {introVideo.description && (
                  <p className="text-white/80 text-sm">{introVideo.description}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Your Journey Section */}
        <div className="mb-20">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Your Journey
            </h2>
          </div>

          {/* Challenge Cards Container */}
          <div className="relative mb-12">
            {/* Scrollable Cards Container */}
            <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto px-16 pt-16 pb-8 scrollbar-hide">
              {/* Day 0 - Pre-survey with Start Here indicator */}
              <div className="snap-start flex-shrink-0 relative">
                {/* Start Here Indicator */}
                <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="glassmorphism px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/80 to-cyan-500/80 border border-white/30">
                    <span className="text-white font-semibold text-sm">Start Here</span>
                  </div>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/80"></div>
                  </div>
                </div>
                {renderDayTile(0)}
              </div>
              
              {/* Days 1-15 - Regular challenges */}
              {[...Array(totalDays)].map((_, index) => {
                const dayNumber = index + 1
                return renderDayTile(dayNumber)
              })}
              
              {/* Day 16 - Post-survey */}
              {renderDayTile(16)}
            </div>

            {/* Scroll Indicators */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2">
              <button onClick={scrollLeft} className="glassmorphism p-3 rounded-full hover:bg-white/30 hover:scale-110 transition-all duration-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2">
              <button onClick={scrollRight} className="glassmorphism p-3 rounded-full hover:bg-white/30 hover:scale-110 transition-all duration-200">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Section */}
          <div className="glassmorphism rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-white">
              Your Progress
            </h3>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#0f4f66] to-[#a7dbe3] h-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Progress Stats */}
            <div className="flex justify-between items-center">
              <span className="text-lg text-white/80">
                {completedDays.size}/{totalDaysWithSurveys} days completed (includes surveys)
              </span>
              <span className="text-2xl font-bold text-white">
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
              <h2 className="text-4xl md:text-5xl font-bold text-white">
                Additional Challenges <span className="text-2xl md:text-3xl text-white/60">(Optional)</span>
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

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Layout>
  )
}

export default ProductsPage 