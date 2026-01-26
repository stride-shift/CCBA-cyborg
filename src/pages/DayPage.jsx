import { useState, useEffect, useRef } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigationPersistence } from '../hooks/useNavigationPersistence'
import YouTubeVideo from '../components/YouTubeVideo'
import ChallengeCard from '../components/ChallengeCard'
import ReflectionSection from '../components/ReflectionSection'
import Layout from '../components/Layout'

function DayPage() {
  const { user } = useAuth()
  const { dayNumber } = useParams()
  const { getLastKnownLocation } = useNavigationPersistence()
  const [challengeData, setChallengeData] = useState(null)
  const [completedChallenges, setCompletedChallenges] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [justCompletedBothChallenges, setJustCompletedBothChallenges] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [videosExpanded, setVideosExpanded] = useState(false)
  const reflectionSectionRef = useRef(null)

  // Redirect survey days (Day 0 and Day 16) to SurveyDayPage
  const dayNum = parseInt(dayNumber, 10)
  if (dayNum === 0 || dayNum === 16) {
    return <Navigate to={`/survey/${dayNumber}`} replace />
  }

  useEffect(() => {
    fetchChallengeData()
    // Scroll to top when day changes
    window.scrollTo(0, 0)
  }, [dayNumber, user])

  useEffect(() => {
    if (challengeData) {
      fetchUserProgress()
    }
  }, [challengeData, user])

  // Auto-scroll to reflection section only when user just completed both challenges
  useEffect(() => {
    if (justCompletedBothChallenges && reflectionSectionRef.current) {
      // Small delay to ensure the DOM has updated
      setTimeout(() => {
        reflectionSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        })
        // Reset the flag after scrolling
        setJustCompletedBothChallenges(false)
      }, 300)
    }
  }, [justCompletedBothChallenges])

  const fetchChallengeData = async () => {
    try {
      // Query challenges table by order_index (day number)
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('order_index', parseInt(dayNumber))
        .eq('is_active', true)
        .single()

      if (!error && data) {
        const videos = await fetchVideosForChallenge(data)
        setChallengeData({...data, videos})
      } else {
        console.error('Challenge not found for day:', dayNumber, error)
        setChallengeData(generateMockChallengeData())
      }
    } catch (error) {
      console.error('Error fetching challenge:', error)
      setChallengeData(generateMockChallengeData())
    }
    setLoading(false)
  }

  const fetchVideosForChallenge = async (challenge) => {
    try {
      const videos = []
      
      // Fetch video for challenge_1_type
      if (challenge.challenge_1_type) {
        const { data: video1, error: error1 } = await supabase
          .from('videos')
          .select('*')
          .eq('video_scope', 'habit')
          .eq('habit_type', challenge.challenge_1_type.toLowerCase().replace(' ', '_'))
          .eq('is_active', true)
          .single()
        
        if (!error1 && video1) {
          videos.push({
            ...video1,
            sequence: 1,
            challenge_type: challenge.challenge_1_type
          })
        }
      }
      
      // Fetch video for challenge_2_type
      if (challenge.challenge_2_type) {
        const { data: video2, error: error2 } = await supabase
          .from('videos')
          .select('*')
          .eq('video_scope', 'habit')
          .eq('habit_type', challenge.challenge_2_type.toLowerCase().replace(' ', '_'))
          .eq('is_active', true)
          .single()
        
        if (!error2 && video2) {
          videos.push({
            ...video2,
            sequence: 2,
            challenge_type: challenge.challenge_2_type
          })
        }
      }
      
      return videos.sort((a, b) => a.sequence - b.sequence)
    } catch (error) {
      console.error('Error fetching videos:', error)
      return []
    }
  }

  const fetchUserProgress = async () => {
    if (!user || !challengeData) {
      // If no user, just use localStorage for progress
      const progress = JSON.parse(localStorage.getItem(`day-${dayNumber}-progress`) || '{}')
      const completed = new Set()
      if (progress.challenge1) completed.add(1)
      if (progress.challenge2) completed.add(2)
      setCompletedChallenges(completed)
      return
    }

    try {
      // Fetch user challenge completions from Supabase
      const { data, error } = await supabase
        .from('user_challenge_completions')
        .select('challenge_number')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeData.id)

      if (error) {
        console.error('Error fetching user progress:', error)
        // Fallback to localStorage
        const progress = JSON.parse(localStorage.getItem(`day-${dayNumber}-progress`) || '{}')
        const completed = new Set()
        if (progress.challenge1) completed.add(1)
        if (progress.challenge2) completed.add(2)
        setCompletedChallenges(completed)
      } else {
        const completed = new Set(data.map(item => item.challenge_number))
        setCompletedChallenges(completed)
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error)
      // Fallback to localStorage
      const progress = JSON.parse(localStorage.getItem(`day-${dayNumber}-progress`) || '{}')
      const completed = new Set()
      if (progress.challenge1) completed.add(1)
      if (progress.challenge2) completed.add(2)
      setCompletedChallenges(completed)
    }
  }

  const generateMockChallengeData = () => ({
    id: `mock-${dayNumber}`,
    order_index: parseInt(dayNumber),
    title: `Day ${dayNumber}: Challenge`,
    challenge_1: `Challenge 1 for day ${dayNumber}`,
    challenge_1_type: 'Explain It',
    challenge_1_image_url: null, // Will fallback to placeholder image
    challenge_2: `Challenge 2 for day ${dayNumber}`,
    challenge_2_type: 'Improve It',
    challenge_2_image_url: null, // Will fallback to placeholder image
    reflection_question: `What did you learn about yourself on day ${dayNumber}?`,
    intended_aha_moments: [`Insight 1 for day ${dayNumber}`, `Insight 2 for day ${dayNumber}`],
    video_url_1: null, // Placeholder for future video table
    video_url_2: null  // Placeholder for future video table
  })

  const handleChallengeComplete = async (challengeNumber) => {
    console.log('Challenge completion clicked:', challengeNumber)
    console.log('User:', user)
    console.log('Challenge data:', challengeData)
    
    const newCompleted = new Set(completedChallenges)
    const isCompleting = !newCompleted.has(challengeNumber)
    
    console.log('Is completing:', isCompleting)
    console.log('Current completed challenges:', Array.from(completedChallenges))
    
    if (newCompleted.has(challengeNumber)) {
      newCompleted.delete(challengeNumber)
    } else {
      newCompleted.add(challengeNumber)
    }
    
    // Check if this completion action results in both challenges being completed
    const willHaveBothCompleted = newCompleted.has(1) && newCompleted.has(2)
    const hadBothCompleted = completedChallenges.has(1) && completedChallenges.has(2)
    
    // Only trigger auto-scroll if we're completing and this results in both being done
    if (isCompleting && willHaveBothCompleted && !hadBothCompleted) {
      setJustCompletedBothChallenges(true)
    }
    
    setCompletedChallenges(newCompleted)
    console.log('New completed challenges:', Array.from(newCompleted))

    // Always save to localStorage
    const progress = JSON.parse(localStorage.getItem(`day-${dayNumber}-progress`) || '{}')
    progress[`challenge${challengeNumber}`] = newCompleted.has(challengeNumber)
    localStorage.setItem(`day-${dayNumber}-progress`, JSON.stringify(progress))

    if (!user) {
      console.log('No user found - saved to localStorage only')
      return
    }
    
    if (!challengeData) {
      console.error('No challenge data found')
      return
    }

    try {
      if (isCompleting) {
        // Insert completion record
        const { data, error } = await supabase
          .from('user_challenge_completions')
          .insert({
            user_id: user.id,
            challenge_id: challengeData.id,
            challenge_number: challengeNumber
          })
          .select()

        if (error) {
          console.error('Error saving challenge completion:', error)
          // Revert the UI change
          const revertedCompleted = new Set(completedChallenges)
          setCompletedChallenges(revertedCompleted)
        }
      } else {
        // Delete completion record
        const { data, error } = await supabase
          .from('user_challenge_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('challenge_id', challengeData.id)
          .eq('challenge_number', challengeNumber)
          .select()

        if (error) {
          console.error('Error removing challenge completion:', error)
          // Revert the UI change
          const revertedCompleted = new Set(completedChallenges)
          revertedCompleted.add(challengeNumber)
          setCompletedChallenges(revertedCompleted)
        }
      }

      // Update day completion status
      await updateDayCompletion(user.id, newCompleted)
    } catch (error) {
      console.error('Error updating challenge progress:', error)
    }
  }

  const updateDayCompletion = async (userId, completedChallenges) => {
    const bothChallengesCompleted = completedChallenges.has(1) && completedChallenges.has(2)

    try {
      // Check if reflection exists
      const { data: reflectionData } = await supabase
        .from('user_reflections')
        .select('id')
        .eq('user_id', userId)
        .eq('challenge_id', challengeData.id)
        .single()

      const reflectionSubmitted = !!reflectionData
      const hasAnyProgress = completedChallenges.size > 0 || reflectionSubmitted

      if (hasAnyProgress) {
        // Only create/update record if there's actual progress
        await supabase
          .from('user_day_completions')
          .upsert({
            user_id: userId,
            challenge_id: challengeData.id,
            both_challenges_completed: bothChallengesCompleted,
            reflection_submitted: reflectionSubmitted
          }, {
            onConflict: 'user_id,challenge_id'
          })
      } else {
        // Delete any existing record if no progress
        await supabase
          .from('user_day_completions')
          .delete()
          .eq('user_id', userId)
          .eq('challenge_id', challengeData.id)
      }
    } catch (error) {
      console.error('Error updating day completion:', error)
    }
  }

  const allChallengesCompleted = completedChallenges.has(1) && completedChallenges.has(2)

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-32 text-white flex items-center justify-center">
          <div className="text-center glassmorphism rounded-2xl p-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-6"></div>
            <p className="text-xl">Loading day {dayNumber}...</p>
          </div>
        </div>
      </Layout>
    )
  }

  // Debug: Show user info
  console.log('DayPage - User:', user)
  console.log('DayPage - Challenge Data:', challengeData)
  console.log('DayPage - Completed Challenges:', completedChallenges)

  const challenges = [
    {
      id: 1,
      challenge_number: 1,
      title: challengeData?.challenge_1_type || 'Challenge 1',
      description: challengeData?.challenge_1 || 'Challenge 1 description',
      image_url: challengeData?.challenge_1_image_url || `https://picsum.photos/400/300?random=${dayNumber}1`,
    },
    {
      id: 2,
      challenge_number: 2,
      title: challengeData?.challenge_2_type || 'Challenge 2',
      description: challengeData?.challenge_2 || 'Challenge 2 description',
      image_url: challengeData?.challenge_2_image_url || `https://picsum.photos/400/300?random=${dayNumber}2`,
    }
  ]

  // Helper function to extract challenge name and instruction
  const parseChallenge = (challengeText) => {
    if (!challengeText) return { name: 'Challenge', instruction: '' }
    
    const colonIndex = challengeText.indexOf(':')
    if (colonIndex === -1) {
      return { name: 'Challenge', instruction: challengeText }
    }
    
    return {
      name: challengeText.substring(0, colonIndex).trim(),
      instruction: challengeText.substring(colonIndex + 1).trim()
    }
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* How This Works Modal */}
        {showHowItWorks && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHowItWorks(false)}>
            <div className="glassmorphism rounded-2xl p-8 max-w-lg w-full relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setShowHowItWorks(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-1">Day {dayNumber}</h2>
              <p className="text-white/70 mb-6">How This Program Works</p>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Experience habits in the flow of work</h3>
                  <p className="text-white/80 text-sm">
                    These challenges are designed to help you develop sustainable AI habits through practical application. You'll learn by doing, not by reading about theory.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Two challenges that combine</h3>
                  <p className="text-white/80 text-sm">
                    Each day presents two connected challenges. The second builds on the first, demonstrating how different AI habits work together to create compounding value in your workflow.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Reflection is where change happens</h3>
                  <p className="text-white/80 text-sm">
                    After completing both challenges, you'll be prompted to reflect on what you discovered. This step is critical—it's where temporary actions become lasting behavioral change.
                  </p>
                  <p className="text-white font-medium text-sm mt-2">
                    Don't skip your reflection. It converts experience into habit.
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowHowItWorks(false)}
                className="w-full mt-8 glassmorphism px-6 py-3 rounded-full text-white font-medium hover:bg-white/20 transition-all"
              >
                Begin
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="glassmorphism rounded-2xl p-6 md:p-8 mb-8">
          {/* Navigation Links */}
          <div className="flex items-center gap-4 mb-4">
            <Link to="/challenges" className="inline-flex items-center text-white/70 hover:text-white transition-colors group">
              <svg className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back to Challenges</span>
            </Link>
            <span className="text-white/40">|</span>
            <button 
              onClick={() => setShowHowItWorks(true)}
              className="inline-flex items-center text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">How this works</span>
            </button>
          </div>
          
          {/* Title and Day Number */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{challengeData?.title || `Day ${dayNumber}: Challenge`}</h1>
              <p className="text-white/70">
                Complete both challenges to unlock your reflection
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-xs text-white/50 uppercase tracking-wide">Day</div>
              <div className="text-4xl md:text-5xl font-bold text-white">{dayNumber}</div>
            </div>
          </div>
          
          {/* What You Might Discover - integrated into header */}
          {challengeData?.intended_aha_moments && challengeData.intended_aha_moments.length > 0 && (
            <div className="border-t border-white/20 pt-5 mt-2">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                What You Might Discover
              </h3>
              <div className="space-y-2 mb-4">
                {challengeData.intended_aha_moments.map((moment, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-white/50">•</span>
                    <p className="text-white/80 text-sm italic">"{moment}"</p>
                  </div>
                ))}
              </div>
              <p className="text-white/60 text-xs">
                Complete the challenge pair and then share your reflection. Remember to include your own context in the challenges.
              </p>
            </div>
          )}
        </div>

        {/* Today's Challenges Header */}
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Today's Challenges</h2>
        
        {/* Challenges Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="glassmorphism rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.01] hover:shadow-xl">
              {/* Challenge Type Header */}
              <div className="px-5 py-3 border-b border-white/20 bg-white/10">
                <h3 className="text-xl font-bold text-white">{challenge.title}</h3>
              </div>
              
              <div className="flex flex-col md:flex-row h-[280px] md:h-[220px]">
                {/* Image Section - Fixed size square */}
                <div className="hidden md:block md:w-[200px] md:min-w-[200px] relative bg-white/5">
                  <img
                    src={challenge.image_url}
                    alt={challenge.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-full h-full items-center justify-center absolute inset-0 bg-white/10">
                    <div className="text-center text-white/50">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Content Section - Takes remaining width */}
                <div className="flex-1 p-4 md:p-5 flex flex-col bg-white/10 min-w-0">
                  <h4 className="text-base font-semibold text-white mb-2 flex-shrink-0">
                    {parseChallenge(challenge.description).name}
                  </h4>
                  
                  {/* Scrollable text container with custom scrollbar */}
                  <div className="flex-1 overflow-y-auto mb-3 pr-2 min-h-0 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50">
                    <p className="text-white/85 text-sm leading-relaxed">
                      {parseChallenge(challenge.description).instruction}
                    </p>
                  </div>

                  {/* Completion Button */}
                  <button
                    onClick={() => handleChallengeComplete(challenge.challenge_number)}
                    className={`w-full px-5 py-2.5 rounded-full font-medium transition-all duration-300 flex-shrink-0 ${
                      completedChallenges.has(challenge.challenge_number)
                        ? 'glassmorphism border border-white/30 text-white'
                        : 'glassmorphism text-white/90 hover:bg-white/20'
                    }`}
                  >
                    {completedChallenges.has(challenge.challenge_number) ? (
                      <div className="flex items-center justify-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Completed
                      </div>
                    ) : (
                      `Complete Challenge ${challenge.challenge_number}`
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Explainer Videos Section - Collapsible */}
        {challengeData?.videos?.length > 0 && (
          <div className="glassmorphism rounded-2xl overflow-hidden mb-8">
            <button
              onClick={() => setVideosExpanded(!videosExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white">Explainer Videos</h3>
                <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                  {challengeData.videos.length} videos
                </span>
              </div>
              <svg 
                className={`w-5 h-5 text-white/60 transition-transform duration-300 ${videosExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {videosExpanded && (
              <div className="px-6 pb-6">
                <p className="text-white/70 text-sm mb-6">
                  These videos explain the habits you're building today. Watching them helps you understand the deeper value of each habit.
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {challengeData.videos
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((video) => (
                      <div key={video.id} className="glassmorphism rounded-xl overflow-hidden bg-white/5">
                        <YouTubeVideo 
                          videoId={video.youtube_video_id} 
                          title={video.title}
                          description={video.description}
                          challengeType={video.challenge_type}
                        />
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reflection Section */}
        {allChallengesCompleted && (
          <div ref={reflectionSectionRef} className="mb-8">
            <div className="glassmorphism rounded-2xl p-6 md:p-8">
              <ReflectionSection
                dayNumber={dayNumber}
                question={challengeData?.reflection_question}
                challengeId={challengeData?.id}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="glassmorphism rounded-2xl p-4 md:p-6">
          <div className="flex justify-between">
            {parseInt(dayNumber) > 1 && (
              <Link
                to={`/day/${parseInt(dayNumber) - 1}`}
                className="glassmorphism px-5 py-2.5 rounded-full text-white hover:bg-white/20 transition-all inline-flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Day
              </Link>
            )}
            {parseInt(dayNumber) < 17 && (
              <Link
                to={`/day/${parseInt(dayNumber) + 1}`}
                className="glassmorphism px-5 py-2.5 rounded-full text-white hover:bg-white/20 transition-all ml-auto inline-flex items-center gap-2 text-sm"
              >
                Next Day
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default DayPage 