import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import GroqOnboarding from './components/GroqOnboarding'

export default function App() {
  const [session, setSession] = useState(null)
  const [isGuest, setIsGuest] = useState(localStorage.getItem('isGuest') === 'true')
  const [groqKey, setGroqKey] = useState(localStorage.getItem('groqKey') || '')
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        setIsGuest(false)
        localStorage.removeItem('isGuest')
        const key = session.user.user_metadata?.groq_api_key || ''
        setGroqKey(key)
        if (!key) setShowOnboarding(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setIsGuest(false)
        const key = session.user.user_metadata?.groq_api_key || ''
        setGroqKey(key)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (isGuest && !groqKey) {
      setShowOnboarding(true)
    }
  }, [isGuest, groqKey])

  const saveGroqKey = async (newKey) => {
    if (isGuest) {
      localStorage.setItem('groqKey', newKey)
      setGroqKey(newKey)
      setShowOnboarding(false)
    } else {
      const { error } = await supabase.auth.updateUser({ data: { groq_api_key: newKey } })
      if (error) alert('Failed to save API key to Supabase.')
      else {
        setGroqKey(newKey)
        setShowOnboarding(false)
      }
    }
  }

  const handleGuestLogin = () => {
    localStorage.setItem('isGuest', 'true')
    setIsGuest(true)
  }

  const exitGuestMode = () => {
    localStorage.removeItem('isGuest')
    localStorage.removeItem('groqKey')
    setIsGuest(false)
    setGroqKey('')
    supabase.auth.signOut()
  }

  if (!session && !isGuest) {
    return <Auth handleGuestLogin={handleGuestLogin} />
  }

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
        isGuest={isGuest}
        exitGuestMode={exitGuestMode}
      />
    </>
  )
}
