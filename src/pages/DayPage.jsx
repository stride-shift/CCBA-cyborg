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
      let userChallengeSetId = null

      // Get user's cohort → challenge_set_id
      if (user) {
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('cohort_id')
          .eq('user_id', user.id)
          .single()

        if (userProfile?.cohort_id) {
          const { data: cohort } = await supabase
            .from('cohorts')
            .select('challenge_set_id')
            .eq('id', userProfile.cohort_id)
            .single()

          userChallengeSetId = cohort?.challenge_set_id
        }
      }

      // Single query to challenges table
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('order_index', parseInt(dayNumber))
        .eq('is_active', true)

      if (userChallengeSetId) {
        query = query.eq('challenge_set_id', userChallengeSetId)
      } else {
        // Fallback to Standard set
        const { data: standardSet } = await supabase
          .from('challenge_sets')
          .select('id')
          .eq('name', 'Standard')
          .single()
        query = query.eq('challenge_set_id', standardSet.id)
      }

      const { data, error } = await query.single()

      if (!error && data) {
        const videos = await fetchVideosForChallenge(data)
        setChallengeData({...data, videos})
      } else {
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
        {/* Header */}
        <div className="glassmorphism rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/challenges" className="inline-flex items-center text-white/70 hover:text-white transition-colors group mb-4">
                <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back to Challenges</span>
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{challengeData?.title || `Day ${dayNumber}: Challenge`}</h1>
              <p className="text-white/80 text-lg">
                Complete both challenges to unlock your reflection
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/60">Day</div>
              <div className="text-5xl font-bold text-white">{dayNumber}</div>
            </div>
          </div>
        </div>

        {/* YouTube Videos Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-6">Today's Videos</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {challengeData?.videos?.length > 0 ? (
              challengeData.videos
                .sort((a, b) => a.sequence - b.sequence)
                .map((video) => (
                  <div key={video.id} className="glassmorphism rounded-2xl overflow-hidden">
                    <YouTubeVideo 
                      videoId={video.youtube_video_id} 
                      title={video.title}
                      description={video.description}
                    />
                  </div>
                ))
            ) : (
              // Fallback placeholders when no videos are available
              <>
                <div className="glassmorphism rounded-2xl overflow-hidden">
                  <YouTubeVideo 
                    videoId={null} 
                    title="Morning Inspiration"
                    description="Start your day with intention and purpose"
                  />
                </div>
                <div className="glassmorphism rounded-2xl overflow-hidden">
                  <YouTubeVideo 
                    videoId={null} 
                    title="Evening Reflection"
                    description="End your day with gratitude and reflection"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Intended Aha Moments */}
        {challengeData?.intended_aha_moments && challengeData.intended_aha_moments.length > 0 && (
          <div className="mb-12">
            <div className="glassmorphism rounded-2xl p-8 bg-gradient-to-r from-purple-500/20 to-blue-500/20">
              <h2 className="text-2xl font-bold mb-6 text-white flex items-center">
                <svg className="w-6 h-6 mr-3 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                What You Might Discover
              </h2>
              <div className="space-y-4 mb-6">
                {challengeData.intended_aha_moments.map((moment, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="text-white/60 mt-1">•</div>
                    <p className="text-white/90 text-lg italic">"{moment}"</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/20 pt-4">
                <p className="text-white/70 text-sm font-medium">
                  Complete the challenge pair and then share your reflection. Remember to include your own context in the challenges.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Challenges Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Today's Challenges</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {challenges.map((challenge) => (
              <div key={challenge.id} className="glassmorphism rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
                <div className="glassmorphism px-6 py-4 border-b border-white/20 bg-white/20">
                  <h3 className="text-2xl font-bold text-white" style={{textShadow: '0 2px 8px rgba(0,0,0,0.18)'}}>{challenge.title}</h3>
                </div>
                <div className="flex flex-col md:flex-row md:h-80">
                  {/* Image Section */}
                  <div className="w-full md:w-1/2 relative bg-white/10 h-48 md:h-full">
                    <img
                      src={challenge.image_url}
                      alt={challenge.title}
                      className="w-full h-full object-cover opacity-90"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden w-full h-full items-center justify-center">
                      <div className="text-center text-white/60">
                        <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">Challenge Image</div>
                      </div>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="w-full md:w-1/2 p-4 md:p-6 flex flex-col justify-between bg-white/15 min-h-[200px] md:min-h-0">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3" style={{textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>
                        {parseChallenge(challenge.description).name}
                      </h4>
                      <p className="text-white/90 leading-relaxed" style={{textShadow: '0 1px 3px rgba(0,0,0,0.2)'}}>
                        {parseChallenge(challenge.description).instruction}
                      </p>
                    </div>

                    {/* Completion Button */}
                    <button
                      onClick={() => handleChallengeComplete(challenge.challenge_number)}
                      className={`mt-4 px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                        completedChallenges.has(challenge.challenge_number)
                          ? 'glassmorphism border-2 border-white/40 text-black'
                          : 'glassmorphism text-black hover:bg-white/25'
                      }`}
                    >
                      {completedChallenges.has(challenge.challenge_number) ? (
                        <div className="flex items-center justify-center">
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
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
        </div>

        {/* Reflection Section */}
        {allChallengesCompleted && (
          <div ref={reflectionSectionRef} className="mb-12">
            <div className="glassmorphism rounded-2xl p-8">
              <ReflectionSection
                dayNumber={dayNumber}
                question={challengeData?.reflection_question}
                challengeId={challengeData?.id}
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="glassmorphism rounded-2xl p-6">
          <div className="flex justify-between">
            {parseInt(dayNumber) > 1 && (
              <Link
                to={`/day/${parseInt(dayNumber) - 1}`}
                className="glassmorphism px-6 py-3 rounded-full text-black hover:bg-white/25 transition-all inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous Day
              </Link>
            )}
            {parseInt(dayNumber) < 15 && (
              <Link
                to={`/day/${parseInt(dayNumber) + 1}`}
                className="glassmorphism px-6 py-3 rounded-full text-black hover:bg-white/25 transition-all ml-auto inline-flex items-center gap-2"
              >
                Next Day
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>

        {/* Background decorations */}
        <div className="absolute top-40 right-0 w-96 h-96 rounded-full glassmorphism opacity-20"></div>
        <div className="absolute bottom-40 left-0 w-64 h-64 rounded-full glassmorphism opacity-30"></div>
      </div>
    </Layout>
  )
}

export default DayPage 