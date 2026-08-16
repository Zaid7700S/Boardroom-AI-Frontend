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

  const loadGroqKey = async () => {
    // Key is stored encrypted in Supabase Vault; fetched via a SECURITY DEFINER RPC
    // scoped to auth.uid() rather than kept in user_metadata.
    const { data, error } = await supabase.rpc('get_groq_key')
    if (error) {
      console.error('Failed to load Groq key:', error)
      setShowOnboarding(true)
      return
    }
    const key = data || ''
    setGroqKey(key)
    if (!key) setShowOnboarding(true)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        setIsGuest(false)
        localStorage.removeItem('isGuest')
        loadGroqKey()
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setIsGuest(false)
        loadGroqKey()
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
      const { error } = await supabase.rpc('save_groq_key', { new_key: newKey })
      if (error) alert('Failed to save API key: ' + error.message)
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
          isGuest={isGuest}
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