import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function ProgressMapPage() {
  const { user } = useAuth()
  const [habitProgress, setHabitProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalEvidence, setTotalEvidence] = useState({ collected: 0, possible: 0 })

  // Define all habit types
  const habitTypes = [
    'Explain It',
    'Plan It', 
    'Guide It',
    'Suggest It',
    'Critique It',
    'Imagine It',
    'Improve It'
  ]

  useEffect(() => {
    if (user) {
      fetchProgressData()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchProgressData = async () => {
    try {
      // Fetch all challenges to calculate total possible evidence per habit
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('id, order_index, challenge_1_type, challenge_2_type')
        .eq('is_active', true)
        .order('order_index')

      if (challengesError) throw challengesError

      // Count how many times each habit appears in challenges
      const habitAppearances = {}
      habitTypes.forEach(habit => {
        habitAppearances[habit] = { challenges: 0, reflections: 0 }
      })

      challenges.forEach(challenge => {
        if (challenge.challenge_1_type && habitAppearances[challenge.challenge_1_type]) {
          habitAppearances[challenge.challenge_1_type].challenges++
        }
        if (challenge.challenge_2_type && habitAppearances[challenge.challenge_2_type]) {
          habitAppearances[challenge.challenge_2_type].challenges++
        }
        // Each challenge day = 1 reflection opportunity for the habits used that day
        if (challenge.challenge_1_type && habitAppearances[challenge.challenge_1_type]) {
          habitAppearances[challenge.challenge_1_type].reflections++
        }
        if (challenge.challenge_2_type && habitAppearances[challenge.challenge_2_type]) {
          habitAppearances[challenge.challenge_2_type].reflections++
        }
      })

      // Fetch user's completed challenges
      const { data: completions, error: completionsError } = await supabase
        .from('user_challenge_completions')
        .select('challenge_id, challenge_number')
        .eq('user_id', user.id)

      if (completionsError) throw completionsError

      // Fetch user's reflections
      const { data: reflections, error: reflectionsError } = await supabase
        .from('user_reflections')
        .select('challenge_id')
        .eq('user_id', user.id)

      if (reflectionsError) throw reflectionsError

      // Map completions to habit types
      const completedByHabit = {}
      habitTypes.forEach(habit => {
        completedByHabit[habit] = { challenges: 0, reflections: 0 }
      })

      // For each completion, find the challenge and count the habit
      for (const completion of completions) {
        const challenge = challenges.find(c => c.id === completion.challenge_id)
        if (challenge) {
          const habitType = completion.challenge_number === 1 
            ? challenge.challenge_1_type 
            : challenge.challenge_2_type
          if (habitType && completedByHabit[habitType]) {
            completedByHabit[habitType].challenges++
          }
        }
      }

      // For each reflection, count it for both habits used that day
      for (const reflection of reflections) {
        const challenge = challenges.find(c => c.id === reflection.challenge_id)
        if (challenge) {
          // A reflection counts as evidence for both habits used that day
          if (challenge.challenge_1_type && completedByHabit[challenge.challenge_1_type]) {
            completedByHabit[challenge.challenge_1_type].reflections++
          }
          if (challenge.challenge_2_type && completedByHabit[challenge.challenge_2_type]) {
            completedByHabit[challenge.challenge_2_type].reflections++
          }
        }
      }

      // Calculate progress for each habit
      const progress = habitTypes.map(habit => {
        const totalPossible = habitAppearances[habit].challenges + habitAppearances[habit].reflections
        const totalCollected = completedByHabit[habit].challenges + completedByHabit[habit].reflections
        const percentage = totalPossible > 0 ? Math.round((totalCollected / totalPossible) * 100) : 0

        return {
          habit,
          challenges: completedByHabit[habit].challenges,
          reflections: completedByHabit[habit].reflections,
          totalCollected,
          totalPossible,
          percentage
        }
      })

      setHabitProgress(progress)

      // Calculate overall totals
      const overallCollected = progress.reduce((sum, p) => sum + p.totalCollected, 0)
      const overallPossible = progress.reduce((sum, p) => sum + p.totalPossible, 0)
      setTotalEvidence({ collected: overallCollected, possible: overallPossible })

    } catch (error) {
      console.error('Error fetching progress data:', error)
    }
    setLoading(false)
  }

  const overallPercentage = totalEvidence.possible > 0 
    ? Math.round((totalEvidence.collected / totalEvidence.possible) * 100) 
    : 0

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-16 flex items-center justify-center">
          <div className="text-center bg-white/95 backdrop-blur-sm rounded-xl p-12 shadow-lg">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F40009] mx-auto mb-6"></div>
            <p className="text-xl text-gray-800">Loading progress...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link to="/challenges" className="inline-flex items-center text-black/60 hover:text-[#C41E3A] transition-colors group mb-4">
            <svg className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to Challenges</span>
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-2">Habit Formation Progress</h1>
          <p className="text-black/70 text-lg">Track evidence of your AI collaboration habits</p>
        </div>

        {/* How Progress is Calculated */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 mb-8 shadow-lg border border-white/50">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#F40009] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-gray-900 font-semibold mb-3">How Progress is Calculated</h3>
              <ul className="space-y-1.5 text-gray-600 text-sm">
                <li>• <strong className="text-gray-800">Challenges:</strong> Each completed challenge of a specific type counts as evidence</li>
                <li>• <strong className="text-gray-800">Reflections:</strong> Each reflection submitted on a day featuring that habit type</li>
                <li>• <strong className="text-gray-800">Progress:</strong> Your evidence divided by total possible evidence for your challenge set</li>
                <li>• <strong className="text-gray-800">Maximum:</strong> Each habit appears multiple times across the program (2 evidence per appearance)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Progress Table */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl overflow-hidden mb-8 shadow-lg border border-white/50">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="col-span-3 flex items-center gap-2 text-gray-900 font-medium">
              <svg className="w-4 h-4 text-[#F40009]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Habit Type
            </div>
            <div className="col-span-2 text-center text-gray-900 font-medium flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-[#F40009]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Challenges
            </div>
            <div className="col-span-2 text-center text-gray-900 font-medium flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-[#F40009]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Reflections
            </div>
            <div className="col-span-2 text-center text-gray-900 font-medium flex items-center justify-center gap-2">
              <svg className="w-4 h-4 text-[#F40009]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Total Evidence
            </div>
            <div className="col-span-3 text-center text-gray-900 font-medium">Progress</div>
          </div>

          {/* Table Rows */}
          {habitProgress.map((item, index) => (
            <div 
              key={item.habit} 
              className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${
                index !== habitProgress.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="col-span-3 text-gray-900 font-medium">{item.habit}</div>
              <div className="col-span-2 text-center text-gray-600">{item.challenges}</div>
              <div className="col-span-2 text-center text-gray-600">{item.reflections}</div>
              <div className="col-span-2 text-center">
                <span className="text-gray-900 font-medium">{item.totalCollected}</span>
                <span className="text-gray-400"> / {item.totalPossible}</span>
              </div>
              <div className="col-span-3 flex items-center gap-3">
                <div className="flex-grow h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#F40009] rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-gray-600 text-sm w-10 text-right">{item.percentage}%</span>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="col-span-6 text-gray-900 font-medium">
              Total Evidence Collected: <span className="text-gray-900">{totalEvidence.collected}</span>
              <span className="text-gray-400"> / {totalEvidence.possible}</span>
            </div>
            <div className="col-span-6 text-right text-gray-900 font-medium">
              Overall Progress: <span className="text-[#F40009]">{overallPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Motivational Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/50">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#F40009] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <div>
              <h3 className="text-gray-900 font-semibold mb-2">Keep Building Your Habits</h3>
              <p className="text-gray-600 text-sm">
                Each piece of evidence represents a step toward mastering AI collaboration. Continue completing challenges and reflecting on your experiences to strengthen these habits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ProgressMapPage
