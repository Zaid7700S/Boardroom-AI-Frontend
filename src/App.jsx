import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import GroqOnboarding from './components/GroqOnboarding'

export default function App() {
  const [session, setSession] = useState(null)
  const [groqKey, setGroqKey] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        // Read key from Supabase user metadata
        const key = session.user.user_metadata?.groq_api_key || ''
        setGroqKey(key)
        if (!key) setShowOnboarding(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        const key = session.user.user_metadata?.groq_api_key || ''
        setGroqKey(key)
      } else {
        setGroqKey('')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Function to save the key to Supabase
  const saveGroqKey = async (newKey) => {
    const { error } = await supabase.auth.updateUser({
      data: { groq_api_key: newKey }
    })
    
    if (error) {
      alert('Failed to save API key to Supabase.')
    } else {
      setGroqKey(newKey)
      setShowOnboarding(false)
    }
  }

  if (!session) return <Auth />
  
  return (
    <>
      {showOnboarding && (
        <GroqOnboarding 
          saveGroqKey={saveGroqKey} 
          onClose={() => setShowOnboarding(false)} 
        />
      )}
      <Dashboard 
        session={session} 
        groqKey={groqKey} 
        openOnboarding={() => setShowOnboarding(true)} 
      />
    </>
  )
}