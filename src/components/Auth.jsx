import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Auth({ handleGuestLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) alert(error.message)
    else alert('Check your email for the confirmation link!')
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-200 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold">B</div>
          <h1 className="text-2xl font-bold text-black">Boardroom AI</h1>
        </div>
        <p className="text-gray-500 mb-8 text-sm">Autonomous Strategic Planning</p>
        
        <form className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-black text-white py-3 font-semibold rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
            <button
              onClick={handleSignUp}
              className="w-full bg-white text-black py-3 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-all duration-300"
            >
              Sign Up
            </button>
          </div>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full bg-white text-black py-3 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-all duration-300 flex items-center justify-center gap-2 mb-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
          </svg>
          Continue with Google
        </button>

        <button
          onClick={handleGuestLogin}
          className="w-full bg-transparent text-gray-500 hover:text-black py-2 text-sm font-medium transition-colors"
        >
          Continue as Guest
        </button>
      </div>
    </div>
  )
}
