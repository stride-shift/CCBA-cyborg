import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

function DatabaseTest() {
  const { user } = useAuth()
  const [testResult, setTestResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testDatabaseWrite = async () => {
    if (!user) {
      setTestResult('❌ No user found')
      return
    }

    setLoading(true)
    setTestResult('Testing...')

    try {
      // Test 1: Check if user is authenticated
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
      if (authError || !currentUser) {
        setTestResult(`❌ Auth error: ${authError?.message || 'No user'}`)
        setLoading(false)
        return
      }

      // Test 2: Try to insert a test record
      const testData = {
        user_id: user.id,
        challenge_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        challenge_number: 1
      }

      const { data, error } = await supabase
        .from('user_challenge_completions')
        .insert(testData)
        .select()

      if (error) {
        setTestResult(`❌ Database error: ${error.message}`)
      } else {
        setTestResult(`✅ Success! Inserted record: ${JSON.stringify(data)}`)
        
        // Clean up - delete the test record
        await supabase
          .from('user_challenge_completions')
          .delete()
          .eq('id', data[0].id)
      }
    } catch (err) {
      setTestResult(`❌ Unexpected error: ${err.message}`)
    }

    setLoading(false)
  }

  const testChallengesFetch = async () => {
    setLoading(true)
    setTestResult('Testing challenges fetch...')

    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .limit(1)

      if (error) {
        setTestResult(`❌ Challenges fetch error: ${error.message}`)
      } else {
        setTestResult(`✅ Challenges fetch success! Found ${data.length} challenges`)
      }
    } catch (err) {
      setTestResult(`❌ Unexpected error: ${err.message}`)
    }

    setLoading(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 m-4">
      <h3 className="text-xl font-bold text-white mb-4">Database Test</h3>
      
      <div className="space-y-4">
        <div className="text-gray-300">
          <strong>User:</strong> {user ? `${user.email} (${user.id})` : 'Not authenticated'}
        </div>

        <div className="space-x-4">
          <button
            onClick={testChallengesFetch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Test Challenges Fetch
          </button>
          
          <button
            onClick={testDatabaseWrite}
            disabled={loading || !user}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            Test Database Write
          </button>
        </div>

        {testResult && (
          <div className="bg-gray-700 p-4 rounded-lg">
            <pre className="text-sm text-gray-200 whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default DatabaseTest 