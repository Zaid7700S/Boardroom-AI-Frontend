import { useState } from 'react'

export default function GroqOnboarding({ saveGroqKey, onClose, isGuest }) {
  const [key, setKey] = useState('')

  const handleSave = (e) => {
    e.preventDefault()
    if (key.trim()) {
      saveGroqKey(key.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 border border-gray-200 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold">B</div>
          <h1 className="text-2xl font-bold text-black">Welcome to Boardroom AI</h1>
        </div>
        
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          To power the autonomous AI executives, you need to provide a Groq API Key.{' '}
          {isGuest
            ? 'Your key is stored in your browser only.'
            : 'Your key is encrypted and stored securely in your account.'}
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Groq API Key</label>
            <input
              type="password"
              placeholder="gsk_..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-black text-white py-3 font-semibold rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            Save & Continue
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don't have a key?{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-black font-medium hover:underline">
            Get one for free here →
          </a>
        </div>
      </div>
    </div>
  )
}