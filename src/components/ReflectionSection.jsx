import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function ReflectionSection({ dayNumber, question, challengeId }) {
  const { user } = useAuth()
  const [reflection, setReflection] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [existingReflection, setExistingReflection] = useState('')

  useEffect(() => {
    // Reset state when day changes
    setReflection('')
    setIsSubmitted(false)
    setExistingReflection('')
    
    if (challengeId && user) {
      fetchExistingReflection()
    }
  }, [dayNumber, challengeId, user])

  const fetchExistingReflection = async () => {
    if (!user || !challengeId) return
    
    try {
      // Fetch existing reflection from Supabase
      const { data, error } = await supabase
        .from('user_reflections')
        .select('reflection_text')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching existing reflection:', error)
        // Fallback to localStorage
        const saved = localStorage.getItem(`day-${dayNumber}-reflection`)
        if (saved) {
          setExistingReflection(saved)
          setReflection(saved)
          setIsSubmitted(true)
        }
      } else if (data) {
        setExistingReflection(data.reflection_text)
        setReflection(data.reflection_text)
        setIsSubmitted(true)
      }
    } catch (error) {
      console.error('Error connecting to Supabase:', error)
      // Fallback to localStorage
      const saved = localStorage.getItem(`day-${dayNumber}-reflection`)
      if (saved) {
        setExistingReflection(saved)
        setReflection(saved)
        setIsSubmitted(true)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!reflection.trim()) {
      return
    }

    setIsSubmitting(true)

    try {
      if (!user) return
      
      // Check if reflection already exists
      const { data: existingReflection } = await supabase
        .from('user_reflections')
        .select('id')
        .eq('user_id', user.id)
        .eq('challenge_id', challengeId)
        .single()

      let error
      if (existingReflection) {
        // Update existing reflection
        const { error: updateError } = await supabase
          .from('user_reflections')
          .update({
            reflection_text: reflection.trim(),
            word_count: reflection.trim().split(/\s+/).length,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('challenge_id', challengeId)
        error = updateError
      } else {
        // Insert new reflection
        const { error: insertError } = await supabase
          .from('user_reflections')
          .insert({
            user_id: user.id,
            challenge_id: challengeId,
            reflection_text: reflection.trim(),
            word_count: reflection.trim().split(/\s+/).length
          })
        error = insertError
      }

      if (error) {
        console.error('Error saving reflection:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`Failed to save reflection: ${error.message || 'Unknown error'}. Please try again.`)
        setIsSubmitting(false)
        return
      }

      // Update day completion status
      await updateDayCompletion(user.id)
      
      // Fallback to localStorage
      localStorage.setItem(`day-${dayNumber}-reflection`, reflection.trim())
      
      setIsSubmitted(true)
      setExistingReflection(reflection)
    } catch (error) {
      console.error('Error saving reflection:', error)
      alert('Failed to save reflection. Please try again.')
    }

    setIsSubmitting(false)
  }

  const updateDayCompletion = async (userId) => {
    try {
      // Check if both challenges are completed
      const { data: challengeCompletions } = await supabase
        .from('user_challenge_completions')
        .select('challenge_number')
        .eq('user_id', userId)
        .eq('challenge_id', challengeId)

      const bothChallengesCompleted = challengeCompletions && challengeCompletions.length === 2
      const hasAnyProgress = (challengeCompletions && challengeCompletions.length > 0) || true // reflection exists

      console.log('Reflection - Updating day completion:', {
        userId,
        challengeId,
        bothChallengesCompleted,
        reflectionSubmitted: true,
        hasAnyProgress,
        challengeCompletions
      })

      if (hasAnyProgress) {
        // Only create/update record if there's actual progress
        const { data, error } = await supabase
          .from('user_day_completions')
          .upsert({
            user_id: userId,
            challenge_id: challengeId,
            both_challenges_completed: bothChallengesCompleted,
            reflection_submitted: true
          }, {
            onConflict: 'user_id,challenge_id'
          })
          .select()

        if (error) {
          console.error('Error updating day completion:', error)
        } else {
          console.log('Day completion updated from reflection:', data)
          // Analytics will be updated automatically by database triggers
        }
      }
    } catch (error) {
      console.error('Error updating day completion:', error)
    }
  }

  const handleEdit = () => {
    setIsSubmitted(false)
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">Daily Reflection</h2>
          <div className="glassmorphism px-6 py-3 rounded-full inline-block mb-6 border border-white/20">
                            <span className="text-lg text-black">✨ Challenges completed! Time to reflect</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 mb-8 border border-white/30">
          <h3 className="text-xl font-semibold text-gray-800 mb-4" style={{ textShadow: 'none' }}>Today's Question</h3>
          <p className="text-gray-700 text-lg italic leading-relaxed">"{question}"</p>
        </div>

        {isSubmitted ? (
          <div className="glassmorphism rounded-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="glassmorphism p-2 rounded-full mr-3">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-800" style={{ textShadow: 'none' }}>Your Reflection</h4>
              </div>
              <button
                onClick={handleEdit}
                className="glassmorphism px-4 py-2 rounded-full text-gray-800 hover:bg-white/20 transition-all text-sm"
                style={{ textShadow: 'none' }}
              >
                Edit
              </button>
            </div>
            <div className="glassmorphism rounded-xl p-6 border border-white/20">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {existingReflection}
              </p>
            </div>
            <div className="flex items-center text-white/70 text-sm mt-4">
              <div className="w-2 h-2 bg-white/50 rounded-full mr-2"></div>
              Reflection saved and synced
            </div>
          </div>
        ) : (
          <div className="glassmorphism rounded-2xl p-8 border border-white/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="reflection" className="block text-lg font-medium text-white mb-4">
                  Share your insights
                </label>
                <textarea
                  id="reflection"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="What did you discover today? How did these challenges change your perspective? What will you do differently going forward?"
                  className="w-full h-48 px-6 py-4 glassmorphism rounded-xl text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent resize-none transition-all border border-white/30"
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-gray-800 text-sm" style={{ textShadow: 'none' }}>Take your time to reflect thoughtfully</span>
                  <span className="text-gray-800 text-sm" style={{ textShadow: 'none' }}>
                    {reflection.trim().split(/\s+/).filter(word => word.length > 0).length} words
                  </span>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !reflection.trim()}
                  className={`px-8 py-4 rounded-full font-medium transition-all duration-300 ${
                    isSubmitting || !reflection.trim()
                      ? 'glassmorphism text-gray-400 cursor-not-allowed border border-white/10'
                      : 'glassmorphism text-gray-800 hover:bg-white/20 transform hover:scale-105 border border-white/20'
                  }`}
                  style={{ textShadow: 'none' }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/60 mr-3"></div>
                      Saving reflection...
                    </div>
                  ) : (
                    existingReflection ? 'Update Reflection' : 'Share Reflection'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-white/50 text-sm">
            Your reflection becomes part of your personal growth journey
          </p>
        </div>
      </div>
    </div>
  )
}

export default ReflectionSection 