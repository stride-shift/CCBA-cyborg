import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { useNavigationPersistence } from '../hooks/useNavigationPersistence'
import { supabase } from '../lib/supabase'

function DlabPage() {
  const { user } = useAuth()
  const location = useLocation()
  useNavigationPersistence()

  const [completedDays, setCompletedDays] = useState(new Set())
  const [introVideo, setIntroVideo] = useState(null)
  const [isVideoLoading, setIsVideoLoading] = useState(true)

  const scrollContainerRef = useRef(null)

  useEffect(() => {
    if (user) {
      fetchCompletedDays()
    }
    fetchIntroVideo()
  }, [user])

  useEffect(() => {
    let focusTimeout
    const handleFocus = () => {
      if (user) {
        clearTimeout(focusTimeout)
        focusTimeout = setTimeout(() => {
          fetchCompletedDays()
        }, 600)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      clearTimeout(focusTimeout)
    }
  }, [user])

  useEffect(() => {
    const currentPath = location.pathname
    const previousPath = sessionStorage.getItem('previousPath')
    if (user && previousPath !== currentPath) {
      fetchCompletedDays()
      sessionStorage.setItem('previousPath', currentPath)
    }
  }, [location.pathname, user])

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
      if (!error && data) setIntroVideo(data)
    } catch (e) {
      console.error('Error loading intro video', e)
    }
    setIsVideoLoading(false)
  }

  const fetchCompletedDays = async () => {
    if (!user) return
    try {
      const { data: challengeData } = await supabase
        .from('user_day_completions')
        .select('challenge_id, challenges!inner(order_index)')
        .eq('user_id', user.id)
        .eq('both_challenges_completed', true)

      const { data: preSurvey } = await supabase
        .from('pre_survey_responses')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { data: postSurvey } = await supabase
        .from('post_survey_responses')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const completed = []
      if (challengeData) completed.push(...challengeData.map(i => i.challenges.order_index))
      if (preSurvey) completed.push(0)
      if (postSurvey) completed.push(16)
      setCompletedDays(new Set(completed))
    } catch (e) {
      console.error('Error loading completed days', e)
    }
  }

  const totalDays = 15
  const totalDaysWithSurveys = 17
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
    return (
      <Link key={dayNumber} to={`/day/${dayNumber}`} className="snap-start flex-shrink-0">
        <div className={`
          w-80 h-48 rounded-2xl flex flex-col items-center justify-center
          transition-all duration-300 hover:scale-105 cursor-pointer
          glassmorphism relative
          ${isCompleted ? 'border-2 border-green-400' : 'hover:bg-white/20'}
          ${isSurveyDay ? 'bg-gradient-to-br from-blue-500/20 to-teal-500/20' : ''}
        `}>
          {isSurveyDay && (
            <div className="absolute top-3 left-3 bg-blue-500/80 text-gray-900 text-xs px-2 py-1 rounded-full font-medium">
              Survey
            </div>
          )}
          <div className="text-center">
            <span className={`font-bold text-gray-900 ${isSurveyDay ? 'text-5xl' : 'text-7xl'}`}>{dayNumber}</span>
            {isSurveyDay && (
              <div className="mt-2">
                <p className="text-gray-900 text-sm font-medium">{isPreSurvey ? 'Pre-Program' : 'Post-Program'}</p>
                <p className="text-gray-900/80 text-xs">Survey Day</p>
              </div>
            )}
          </div>
          {isCompleted && (
            <div className="absolute top-4 right-4 glassmorphism rounded-full p-2">
              <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
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
        {/* 1) Video */}
        <div className="mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-center mb-12 text-gray-900">Watch this video to get started</h1>
          <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl glassmorphism">
            <div className="aspect-w-16 aspect-h-9">
              {isVideoLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-800" style={{ minHeight: '500px' }}>
                  <div className="text-gray-900 text-lg">Loading video...</div>
                </div>
              ) : introVideo ? (
                <iframe
                  src={`https://www.youtube.com/embed/${introVideo.youtube_video_id}?rel=0&modestbranding=1&showinfo=0&controls=1&disablekb=1&fs=1&iv_load_policy=3`}
                  title={introVideo.title || 'Introduction To Cyborg Habits'}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                  style={{ minHeight: '500px' }}
                ></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800" style={{ minHeight: '500px' }}>
                  <div className="text-center text-gray-900">
                    <h3 className="text-xl mb-2">Introductory Video Coming Soon</h3>
                    <p className="text-gray-300">The introduction video will be available once configured in the database.</p>
                  </div>
                </div>
              )}
            </div>
            {introVideo && (
              <div className="p-4 bg-gray-50 backdrop-blur-sm">
                <h3 className="text-gray-900 font-semibold mb-1">{introVideo.title}</h3>
                {introVideo.description && <p className="text-gray-900/80 text-sm">{introVideo.description}</p>}
              </div>
            )}
          </div>
        </div>

        {/* 2) Your Journey */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">Your Journey</h2>
          </div>
          <div className="relative mb-12">
            <div ref={scrollContainerRef} className="flex gap-6 overflow-x-auto px-16 pt-16 pb-8 scrollbar-hide">
              <div className="snap-start flex-shrink-0 relative">
                <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="glassmorphism px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/80 to-cyan-500/80 border border-white/30">
                    <span className="text-gray-900 font-semibold text-sm">Start Here</span>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white/80"></div>
                  </div>
                </div>
                {renderDayTile(0)}
              </div>
              {[...Array(totalDays)].map((_, idx) => renderDayTile(idx + 1))}
              {renderDayTile(16)}
            </div>
            <div className="absolute -left-2 top-1/2 -translate-y-1/2">
              <button onClick={scrollLeft} className="glassmorphism p-3 rounded-full hover:bg-white/30 hover:scale-110 transition-all duration-200">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="absolute -right-2 top-1/2 -translate-y-1/2">
              <button onClick={scrollRight} className="glassmorphism p-3 rounded-full hover:bg-white/30 hover:scale-110 transition-all duration-200">
                <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="glassmorphism rounded-2xl p-8">
            <h3 className="text-2xl font-bold mb-6 text-gray-900">Your Progress</h3>
            <div className="mb-4">
              <div className="bg-white/20 rounded-full h-4 overflow-hidden">
                <div className="bg-gradient-to-r from-[#F40009] to-[#8B0000] h-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg text-gray-900/80">{completedDays.size}/{totalDaysWithSurveys} days completed (includes surveys)</span>
              <span className="text-2xl font-bold text-gray-900">{Math.round(progressPercentage)}%</span>
            </div>
          </div>
        </div>

        {/* 3) Boxes Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Pre-Program Survey */}
          <div className="glassmorphism rounded-2xl p-6 h-56 relative flex items-center justify-center">
            <div className="absolute top-4 left-4 text-xs px-3 py-1 rounded-full bg-blue-500/80 text-gray-900">SURVEY</div>
            <div className="text-center">
              <div className="text-gray-900 text-8xl font-bold">0</div>
              <div className="mt-2">
                <div className="text-gray-900 text-3xl font-bold">Pre-Program</div>
                <div className="text-gray-900/80 text-xl">Survey</div>
              </div>
            </div>
            <div className="absolute bottom-4 left-4 text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          {/* Post-Program Survey */}
          <div className="glassmorphism rounded-2xl p-6 h-56 relative flex items-center justify-center">
            <div className="absolute top-4 left-4 text-xs px-3 py-1 rounded-full bg-blue-500/80 text-gray-900">SURVEY</div>
            <div className="text-center">
              <div className="text-gray-900 text-8xl font-bold">1</div>
              <div className="mt-2">
                <div className="text-gray-900 text-3xl font-bold">Post-Program</div>
                <div className="text-gray-900/80 text-xl">Survey</div>
              </div>
            </div>
          </div>

          {/* Launch */}
          <div className="glassmorphism rounded-2xl p-6 h-56 relative flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">🚀</div>
              <div className="text-gray-900 text-4xl font-bold">Launch</div>
            </div>
          </div>

          {/* Orbit */}
          <div className="glassmorphism rounded-2xl p-6 h-56 relative flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-3">🛰️</div>
              <div className="text-gray-900 text-4xl font-bold">Orbit</div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles for horizontal list */}
      <style jsx>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </Layout>
  )
}

export default DlabPage


