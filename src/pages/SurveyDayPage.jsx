import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import SurveyForm from '../components/SurveyForm'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

function SurveyDayPage() {
  const { dayNumber } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [existingResponse, setExistingResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyCompleted, setSurveyCompleted] = useState(false)

  // Convert dayNumber to string and number for robust comparison
  const dayStr = String(dayNumber)
  const dayNum = parseInt(dayNumber, 10)
  
  const isPreSurvey = dayStr === '0' || dayNum === 0
  const isPostSurvey = dayStr === '16' || dayNum === 16
  const surveyType = isPreSurvey ? 'pre' : 'post'

  useEffect(() => {
    if (user) {
      checkExistingSurvey()
    }
  }, [user, surveyType])

  const checkExistingSurvey = async () => {
    try {
      setLoading(true)
      const tableName = surveyType === 'pre' ? 'pre_survey_responses' : 'post_survey_responses'
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      if (data) {
        setExistingResponse(data)
        setSurveyCompleted(true)
      }
    } catch (err) {
      console.error('Error checking existing survey:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSurveyComplete = (response) => {
    setExistingResponse(response)
    setSurveyCompleted(true)
    setShowSurvey(false)
  }

  const handleStartSurvey = () => {
    setShowSurvey(true)
  }

  const handleEditSurvey = () => {
    setShowSurvey(true)
  }

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl text-gray-900 mb-4">Please sign in to access the survey</h1>
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Sign In
          </Link>
        </div>
      </Layout>
    )
  }

  if (!isPreSurvey && !isPostSurvey) {
    return (
      <Layout>
        <div className="container mx-auto px-6 py-16 text-center">
          <h1 className="text-2xl text-gray-900 mb-4">Invalid survey day</h1>
          <Link to="/challenges" className="text-blue-400 hover:text-blue-300">
            Back to Challenges
          </Link>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Back Navigation */}
        <Link
          to="/challenges"
          className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors group"
        >
          <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-lg font-medium">Back to Challenges</span>
        </Link>

        {/* Day Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white text-shadow-dark mb-4">
            Day {dayNumber}
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-white text-shadow-dark mb-4">
            {isPreSurvey ? 'Pre-Program Survey' : 'Post-Program Survey'}
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            {isPreSurvey 
              ? 'Before we begin your Cyborg Habits journey, help us understand your current AI usage patterns.'
              : 'Congratulations on completing the Cyborg Habits program! Tell us about your experience and current AI usage.'
            }
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-900">Loading survey...</p>
          </div>
        ) : showSurvey ? (
          <SurveyForm
            surveyType={surveyType}
            onComplete={handleSurveyComplete}
            existingResponse={existingResponse}
          />
        ) : (
          <>
            {/* Additional Information - moved above survey */}
            <div className="max-w-4xl mx-auto mb-12">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="glassmorphism rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-[#C41E3A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-900 font-semibold mb-2">Quick & Easy</h4>
                  <p className="text-gray-600 text-sm">Takes only 3-5 minutes to complete</p>
                </div>

                <div className="glassmorphism rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-[#C41E3A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-900 font-semibold mb-2">Anonymous</h4>
                  <p className="text-gray-600 text-sm">Your responses are confidential and secure</p>
                </div>

                <div className="glassmorphism rounded-xl p-6 text-center">
                  <div className="w-12 h-12 bg-[#C41E3A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-[#C41E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-gray-900 font-semibold mb-2">Impact</h4>
                  <p className="text-gray-600 text-sm">Helps us improve the program for future participants</p>
                </div>
              </div>
            </div>

            {/* Survey Challenge Card */}
            <div className="max-w-2xl mx-auto">
              <div className="glassmorphism rounded-3xl p-8 text-center">
                <div className="w-20 h-20 bg-[#C41E3A] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Complete the Survey
                </h3>
                
                <p className="text-gray-900/80 mb-6">
                  {isPreSurvey 
                    ? 'Take a few minutes to share your current AI usage habits and experience level. This will help us personalize your learning journey.'
                    : 'Reflect on your journey and share how your AI usage habits have evolved throughout the program.'
                  }
                </p>

                {surveyCompleted ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-gray-900 mb-4">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-semibold">Survey Completed!</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      Submitted on {new Date(existingResponse.completed_at).toLocaleDateString()}
                    </p>
                    
                    <button
                      onClick={handleEditSurvey}
                      className="bg-white/20 text-black px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-all"
                    >
                      Review/Edit Response
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartSurvey}
                    className="bg-[#C41E3A] text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[#a01830] transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Start Survey
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default SurveyDayPage 