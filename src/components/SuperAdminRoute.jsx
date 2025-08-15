import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SuperAdminRoute({ children }) {
  const [status, setStatus] = useState('loading') // 'loading' | 'allow' | 'deny'

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setStatus('deny')
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) return setStatus('deny')
      setStatus(data?.role === 'super_admin' ? 'allow' : 'deny')
    })()
  }, [])

  if (status === 'loading') return null
  if (status === 'deny') return <Navigate to="/" replace />
  return children
} 