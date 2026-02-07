import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import LikertScale from './LikertScale'

function SurveyForm({ surveyType, onComplete, existingResponse = null }) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    ai_usage_rating: null,
    explain_it_frequency: null,
    guide_it_frequency: null,
    suggest_it_frequency: null,
    critique_it_frequency: null,
    plan_it_frequency: null,
    imagine_it_frequency: null,
    improve_it_frequency: null,
    additional_comments: ''
  })

  // Load existing response if provided
  useEffect(() => {
    if (existingResponse) {
      setFormData({
        ai_usage_rating: existingResponse.ai_usage_rating,
        explain_it_frequency: existingResponse.explain_it_frequency,
        guide_it_frequency: existingResponse.guide_it_frequency,
        suggest_it_frequency: existingResponse.suggest_it_frequency,
        critique_it_frequency: existingResponse.critique_it_frequency,
        plan_it_frequency: existingResponse.plan_it_frequency,
        imagine_it_frequency: existingResponse.imagine_it_frequency,
        improve_it_frequency: existingResponse.improve_it_frequency,
        additional_comments: existingResponse.additional_comments || ''
      })
    }
  }, [existingResponse])

  const questions = [
    {
      key: 'explain_it_frequency',
      question: 'How frequently do you use AI to explain things simply to yourself or others?',
      description: 'Breaking down complex ideas, translating technical jargon, or making difficult topics understandable.'
    },
    {
      key: 'guide_it_frequency', 
      question: 'How often do you use AI to provide step-by-step guidance?',
      description: 'Getting structured instructions, process breakdowns, or task guidance.'
    },
    {
      key: 'suggest_it_frequency',
      question: 'How frequently do you use AI to get suggestions and recommendations?',
      description: 'Asking for options, alternatives, or advice on decisions and choices.'
    },
    {
      key: 'critique_it_frequency',
      question: 'How often do you use AI to give critique or play devil\'s advocate?',
      description: 'Challenging ideas, spotting risks, finding weaknesses, or uncovering blind spots.'
    },
    {
      key: 'plan_it_frequency',
      question: 'How frequently do you use AI to help create detailed plans and strategies?',
      description: 'Building multi-step strategies, setting milestones, or creating structured approaches.'
    },
    {
      key: 'imagine_it_frequency',
      question: 'How often do you use AI to explore possibilities and test scenarios?',
      description: 'Brainstorming creative solutions, testing "what if" scenarios, or generating innovative ideas.'
    },
    {
      key: 'improve_it_frequency',
      question: 'How frequently do you use AI to improve and enhance your work?',
      description: 'Strengthening arguments, enhancing clarity, or optimizing existing ideas and processes.'
    }
  ]

  const aiUsageOptions = [
    { value: 1, label: 'Beginner' },
    { value: 2, label: 'Basic' },
    { value: 3, label: 'Intermediate' },
    { value: 4, label: 'Advanced' },
    { value: 5, label: 'Expert' }
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate all required fields
    const requiredFields = [
      'ai_usage_rating',
      'explain_it_frequency',
      'guide_it_frequency', 
      'suggest_it_frequency',
      'critique_it_frequency',
      'plan_it_frequency',
      'imagine_it_frequency',
      'improve_it_frequency',
      'additional_comments'
    ]

    const missingFields = requiredFields.filter(field => {
      if (field === 'additional_comments') {
        return !formData[field] || formData[field].trim().length === 0
      }
      return !formData[field]
    })
    
    if (missingFields.length > 0) {
      setError('Please answer all questions, including the written response, before submitting.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const tableName = surveyType === 'pre' ? 'pre_survey_responses' : 'post_survey_responses'
      const dataToSubmit = {
        ...formData,
        user_id: user.id,
        cohort_id: profile?.cohort_id || null
      }

      let result
      
      if (existingResponse) {
        // Update existing response
        const { data, error: updateError } = await supabase
          .from(tableName)
          .update(dataToSubmit)
          .eq('user_id', user.id)
          .select()
          .single()
        
        if (updateError) throw updateError
        result = data
      } else {
        // Insert new response
        const { data, error: insertError } = await supabase
          .from(tableName)
          .insert(dataToSubmit)
          .select()
          .single()
        
        if (insertError) throw insertError
        result = data
      }

      onComplete(result)
    } catch (err) {
      console.error('Error submitting survey:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const progressPercentage = () => {
    const totalQuestions = questions.length + 2 // +1 for AI usage rating, +1 for written response
    const answeredQuestions = [
      formData.ai_usage_rating,
      ...questions.map(q => formData[q.key]),
      formData.additional_comments && formData.additional_comments.trim().length > 0
    ].filter(Boolean).length
    
    return (answeredQuestions / totalQuestions) * 100
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="glassmorphism rounded-2xl p-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {surveyType === 'pre' ? 'Pre-Program Survey' : 'Post-Program Survey'}
        </h1>
        <p className="text-gray-600 text-lg">
          {surveyType === 'pre' 
            ? 'Help us understand your current AI usage patterns before starting the program.'
            : 'Tell us about your AI usage after completing the Cyborg Habits program.'
          }
        </p>
        
        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progressPercentage())}% complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#C41E3A] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage()}%` }}
            ></div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* AI Usage Rating */}
        <div className="glassmorphism rounded-xl p-6">
          <LikertScale
            question="How would you rate your current use of AI?"
            value={formData.ai_usage_rating}
            onChange={(value) => updateFormData('ai_usage_rating', value)}
            name="ai_usage_rating"
            options={aiUsageOptions}
          />
        </div>

        {/* Frequency Questions */}
        {questions.map((question, index) => (
          <div key={question.key} className="glassmorphism rounded-xl p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {question.question}
              </h3>
              <p className="text-sm text-gray-600">{question.description}</p>
            </div>
            
            <LikertScale
              question=""
              value={formData[question.key]}
              onChange={(value) => updateFormData(question.key, value)}
              name={question.key}
            />
          </div>
        ))}

        {/* Written Response - Required */}
        <div className="glassmorphism rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {surveyType === 'pre' 
              ? 'Describe Your Current AI Usage *' 
              : 'Reflect on Your AI Journey *'
            }
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {surveyType === 'pre' 
              ? 'Tell us about how you currently use AI in your daily life and work. What tasks do you use it for? What challenges or successes have you experienced? Share openly about your current relationship with AI.'
              : 'Reflect on how your relationship with AI has evolved since starting Cyborg Habits. In what ways are you now using AI more effectively or productively? What new habits or approaches have you developed?'
            }
          </p>
          <textarea
            value={formData.additional_comments}
            onChange={(e) => updateFormData('additional_comments', e.target.value)}
            placeholder={surveyType === 'pre' 
              ? 'Share your current AI usage patterns, challenges, and experiences in detail...'
              : 'Describe how your AI usage has evolved and improved during the program...'
            }
            className={`w-full p-4 rounded-lg border focus:outline-none resize-vertical min-h-[120px] bg-white text-gray-800 ${
              formData.additional_comments && formData.additional_comments.trim().length > 0
                ? 'border-green-500 focus:border-green-600'
                : 'border-gray-300 focus:border-[#C41E3A]'
            }`}
            rows={5}
            required
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">
              * This question is required
            </p>
            <span className={`text-xs ${
              formData.additional_comments && formData.additional_comments.trim().length > 20
                ? 'text-green-600'
                : 'text-gray-400'
            }`}>
              {formData.additional_comments ? formData.additional_comments.length : 0} characters
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-4">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || progressPercentage() < 100}
            className={`px-8 py-3 rounded-lg font-semibold transition-all ${
              loading || progressPercentage() < 100
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-[#C41E3A] text-white hover:bg-[#a01830] shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting...
              </div>
            ) : (
              existingResponse ? 'Update Survey' : 'Submit Survey'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SurveyForm 