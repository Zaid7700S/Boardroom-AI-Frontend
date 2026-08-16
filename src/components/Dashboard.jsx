import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import jsPDF from 'jspdf'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Dashboard({ session, groqKey, openOnboarding, isGuest, exitGuestMode }) {
  const [problem, setProblem] = useState('')
  const [debate, setDebate] = useState([])
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [chartUrl, setChartUrl] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeChatId, setActiveChatId] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isGuest) fetchHistory()
  }, [isGuest])

  const fetchHistory = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (!currentSession) return
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/history`, {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
      })
      if (response.ok) setHistory(await response.json())
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }

  const startNewChat = () => {
    setProblem('')
    setDebate([])
    setStatus('')
    setPlan('')
    setChartUrl('')
    setActiveChatId(null)
    setIsSidebarOpen(false)
  }

  const deleteChat = async (e, item) => {
    e.stopPropagation()

    // Deleting the plan row cascades to its chat messages automatically (FK ON DELETE CASCADE).
    // The chart is stored inline as base64 on the plan row, so there's no separate storage file to clean up.
    const { error: dbError } = await supabase
      .from('plans')
      .delete()
      .eq('id', item.id)

    if (dbError) {
      alert('Error deleting session: ' + dbError.message)
      return
    }

    setHistory(prev => prev.filter(h => h.id !== item.id))
    
    if (activeChatId === item.id) {
      startNewChat()
    }
  }

  const startDebate = async (e) => {
    e.preventDefault()
    if (!groqKey) {
      openOnboarding()
      return
    }
    setLoading(true)
    setDebate([])
    setStatus('Starting debate...')
    setPlan('')
    setChartUrl('')
    setActiveChatId(null)

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (!isGuest && session) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/stream`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ problem, groq_api_key: groqKey })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            var eventType = line.replace('event: ', '').trim()
          } else if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim()
            if (dataStr === '') continue
            
            try {
              const data = JSON.parse(dataStr)
              if (eventType === 'debate') {
                setDebate(prev => [...prev, data])
              } else if (eventType === 'status') {
                setStatus(data.message)
              } else if (eventType === 'complete') {
                setPlan(data.action_plan)
                setChartUrl(data.chart_url)
                setStatus('Debate complete.')
                setLoading(false)
                setActiveChatId(data.session_id)
                if (!isGuest) fetchHistory()
              }
            } catch (err) {
              console.error('Error parsing SSE data:', err)
            }
          }
        }
      }
    } catch (error) {
      console.error('Fetch error:', error)
      setStatus('Error: ' + error.message)
      setLoading(false)
    }
  }

  const loadHistoryItem = (item) => {
    setProblem(item.problem)
    setPlan(item.action_plan)
    setChartUrl(item.chart_url)
    setDebate(item.messages || [])
    setStatus('Viewing archived session.')
    setActiveChatId(item.id)
    setIsSidebarOpen(false)
  }

  const downloadPDF = () => {
    const doc = new jsPDF()
    let y = 20
    const pageHeight = doc.internal.pageSize.height
    const margin = 20

    const checkPageBreak = (nextLineHeight = 5) => {
      if (y + nextLineHeight > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
    }

    doc.setFontSize(16)
    doc.setFont(undefined, 'bold')
    doc.text('Boardroom AI - Strategic Report', margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Date: ${new Date().toLocaleString()}`, margin, y)
    y += 10

    doc.setFont(undefined, 'bold')
    doc.text('Problem:', margin, y)
    y += 5
    doc.setFont(undefined, 'normal')
    const problemLines = doc.splitTextToSize(problem, 170)
    problemLines.forEach(line => {
      checkPageBreak()
      doc.text(line, margin, y)
      y += 5
    })
    y += 5

    checkPageBreak(10)
    doc.setFont(undefined, 'bold')
    doc.text('Executive Debate:', margin, y)
    y += 5
    doc.setFont(undefined, 'normal')
    
    debate.forEach(msg => {
      doc.setFont(undefined, 'bold')
      checkPageBreak()
      doc.text(`${msg.agent}:`, margin, y)
      y += 5
      
      doc.setFont(undefined, 'normal')
      const plainText = msg.content.replace(/\*\*/g, '').replace(/\*/g, '')
      const contentLines = doc.splitTextToSize(plainText, 170)
      contentLines.forEach(line => {
        checkPageBreak()
        doc.text(line, margin + 5, y)
        y += 5
      })
      y += 2
    })

    y += 5
    checkPageBreak(10)
    doc.setFont(undefined, 'bold')
    doc.text('Strategic Action Plan:', margin, y)
    y += 5
    doc.setFont(undefined, 'normal')
    const planLines = doc.splitTextToSize(plan.replace(/\*\*/g, '').replace(/\*/g, ''), 170)
    planLines.forEach(line => {
      checkPageBreak()
      doc.text(line, margin, y)
      y += 5
    })

    doc.save('boardroom_report.pdf')
  }

  const getAgentStyle = (agent) => {
    switch(agent) {
      case 'CEO': return { bg: 'bg-gray-900', text: 'text-white', badge: 'bg-white text-black' }
      case 'CFO': return { bg: 'bg-gray-100', text: 'text-black', badge: 'bg-black text-white' }
      case 'CTO': return { bg: 'bg-gray-50 border border-gray-200', text: 'text-black', badge: 'bg-black text-white' }
      case 'CMO': return { bg: 'bg-white border border-gray-300', text: 'text-black', badge: 'bg-black text-white' }
      default: return { bg: 'bg-white', text: 'text-black', badge: 'bg-gray-100' }
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white text-black">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          {!isGuest && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-black hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          )}
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
            <h1 className="text-lg font-bold text-black hidden sm:block">Boardroom AI</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={openOnboarding}
            className="text-xs text-gray-500 hover:text-black font-medium transition-colors hidden md:block"
          >
            Update Groq Key
          </button>
          
          {isGuest ? (
            <button 
              onClick={exitGuestMode}
              className="text-xs bg-gray-100 text-black px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
            >
              Exit Guest
            </button>
          ) : (
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-xs bg-gray-100 text-black px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-medium border border-gray-200"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {!isGuest && (
          <>
            {isSidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-30 md:hidden animate-fade-in-up"
                onClick={() => setIsSidebarOpen(false)}
              ></div>
            )}

            <aside className={`
              fixed md:relative top-0 left-0 z-50 md:z-auto w-72 h-screen md:h-full border-r border-gray-200 bg-white flex-shrink-0 flex flex-col
              transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
              <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                <button 
                  onClick={startNewChat}
                  className="flex-1 bg-black text-white py-2.5 font-semibold text-sm rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  New Problem
                </button>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="ml-2 md:hidden p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Session History</div>
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {history.length === 0 && (
                  <p className="text-sm text-gray-400 px-2 py-4 text-center">No past sessions yet.</p>
                )}
                {history.map(item => {
                  const isActive = activeChatId === item.id
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => loadHistoryItem(item)}
                      className={`group relative p-3 rounded-xl cursor-pointer transition-colors mb-1 ${
                        isActive ? 'bg-gray-100 border-l-2 border-black' : 'hover:bg-gray-50'
                      }`}
                    >
                      <p className={`text-[10px] font-mono mb-1 ${isActive ? 'text-black' : 'text-gray-400'}`}>
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                      <p className={`text-sm font-medium truncate ${isActive ? 'text-black font-semibold' : 'text-black'}`}>
                        {item.problem}
                      </p>
                      
                      <button 
                        onClick={(e) => deleteChat(e, item)}
                        className="absolute top-3 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-gray-200"
                        title="Delete session"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 border-t border-gray-200 mt-auto md:hidden">
                <button 
                  onClick={() => { openOnboarding(); setIsSidebarOpen(false) }}
                  className="w-full text-left text-xs text-gray-500 hover:text-black font-medium p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Update Groq Key
                </button>
              </div>
            </aside>
          </>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={startDebate} className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Define the Business Problem</label>
              <textarea
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!loading) e.currentTarget.form.requestSubmit();
                  }
                }}
                placeholder="e.g., Our cloud hosting bill just tripled overnight and we need to cut costs immediately."
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm mb-4 resize-none"
                rows="3"
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full md:w-auto bg-black text-white px-6 py-2.5 font-semibold text-sm rounded-xl hover:bg-gray-800 transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Debating...' : 'Start Boardroom'}
              </button>
            </form>

            {status && (
              <div className="mb-6 flex items-center gap-2 text-sm text-gray-500 font-medium animate-fade-in-up">
                <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
                {status}
              </div>
            )}

            {debate.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-black uppercase tracking-wide mb-4 flex items-center gap-2">
                  <span className="w-1 h-4 bg-black rounded-full"></span>
                  Executive Debate
                </h3>
                <div className="space-y-3">
                  {debate.map((msg, idx) => {
                    const style = getAgentStyle(msg.agent)
                    return (
                      <div key={idx} className={`p-4 rounded-xl ${style.bg} animate-fade-in-up`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[10px] font-bold ${style.badge} px-2 py-0.5 rounded-md uppercase tracking-wide`}>
                            {msg.agent}
                          </span>
                        </div>
                        <div className={`text-sm leading-relaxed markdown-content ${style.text}`}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {(plan || chartUrl) && (
              <div className="mt-12 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-8 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                  <h3 className="text-base font-bold text-black">Final Strategic Report</h3>
                  <button 
                    onClick={downloadPDF}
                    className="flex items-center gap-1.5 bg-gray-100 text-black px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Export PDF
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {plan && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Action Plan</h4>
                      <div className="text-sm text-black leading-relaxed markdown-content">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {plan}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {chartUrl && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Strategy Timeline</h4>
                      <img src={chartUrl} alt="Strategy Chart" className="rounded-xl border border-gray-200 w-full shadow-sm" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}