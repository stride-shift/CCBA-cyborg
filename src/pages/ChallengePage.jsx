import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Layout from '../components/Layout'
import DayTile from '../components/DayTile'

function ChallengePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [challenges, setChallenges] = useState([])
  const [completedDays, setCompletedDays] = useState(new Set())

  useEffect(() => {
    fetchChallenges()
  }, [])

  useEffect(() => {
    if (user) {
      fetchCompletedDays(user.id)
    }
  }, [user])

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .order('order_index')

      if (error) {
        console.error('Error fetching challenges:', error)
        setChallenges(generateMockChallenges())
      } else {
        setChallenges(data || generateMockChallenges())
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error)
      setChallenges(generateMockChallenges())
    }
  }

  const fetchCompletedDays = async (userId) => {
    if (!userId) return

    try {
      // Fetch challenge completions (both challenges + reflection required)
      const { data, error } = await supabase
        .from('user_day_completions')
        .select('challenge_id, challenges!inner(order_index)')
        .eq('user_id', userId)
        .eq('both_challenges_completed', true)
        .eq('reflection_submitted', true)

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching completed days:', error)
      }

      if (data) {
        const completedDayNumbers = data.map(item => item.challenges.order_index)
        setCompletedDays(new Set(completedDayNumbers))
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error)
      const completed = JSON.parse(localStorage.getItem('completedDays') || '[]')
      setCompletedDays(new Set(completed))
    }
  }

  const generateMockChallenges = () => {
    const mockChallenges = []
    for (let i = 1; i <= 15; i++) {
      mockChallenges.push({
        id: `mock-${i}`,
        order_index: i,
        title: `Day ${i}: Challenge`,
        challenge_1: `Challenge 1 for day ${i}`,
        challenge_2: `Challenge 2 for day ${i}`,
        reflection_question: `What did you learn on day ${i}?`,
        intended_aha_moments: [`Insight 1 for day ${i}`, `Insight 2 for day ${i}`]
      })
    }
    return mockChallenges
  }

  const handleSignOut = async () => {
    console.log('🖱️ ChallengePage: Sign out button clicked')
    try {
      await signOut()
      console.log('🧭 ChallengePage: Navigating to /login')
      navigate('/login')
    } catch (error) {
      console.error('❌ ChallengePage: Sign out error:', error)
    }
  }

  return (
    <Layout>
      <div className="relative z-10 container mx-auto px-6 pt-12 pb-20">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <Link to="/" className="text-white/80 hover:text-white mb-4 inline-block transition-colors">
                ← Back to Home
              </Link>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 text-white">15-Day Cyborg Habit Challenge</h1>
              <p className="text-white/80 text-lg">Transform your AI collaboration skills</p>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-white/90 mb-2">Welcome, {user.email}!</p>
                <button
                  onClick={handleSignOut}
                  className="glassmorphism px-4 py-2 rounded-full text-white hover:bg-white/25 transition-all"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Progress Overview */}
        <div className="mb-8">
          <div className="glassmorphism rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-white">Your Progress</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-1 bg-white/20 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(completedDays.size / challenges.length) * 100}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-white">
                {completedDays.size}/{challenges.length} days completed
              </span>
            </div>
          </div>
        </div>

        {/* Days Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-white">Your Journey</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {challenges.map((challenge) => (
              <Link key={challenge.id} to={`/day/${challenge.order_index}`}>
                <DayTile
                  day={{
                    day_number: challenge.order_index,
                    title: challenge.title || `Day ${challenge.order_index}`,
                    image_url: `https://picsum.photos/300/200?random=${challenge.order_index}`,
                    description: challenge.challenge_1?.substring(0, 100) + '...'
                  }}
                  isCompleted={completedDays.has(challenge.order_index)}
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ChallengePage 