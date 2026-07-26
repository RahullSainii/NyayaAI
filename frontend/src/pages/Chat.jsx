import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatBubble from '../components/ChatBubble'
import TypingIndicator from '../components/TypingIndicator'
import { apiUrl } from '../lib/api'
import { Bot, Menu, MessageSquare, Plus, Send, Sparkles, X, ChevronLeft, Circle, Mic, MicOff } from 'lucide-react'

const WELCOME_MESSAGE = {
  role: 'ai',
  content:
    "Namaste! I'm NyayaAI, your AI-powered Indian legal assistant. I can help you with:\n\n- IPC to BNS section mappings\n- Criminal law procedures\n- FIR filing guidance\n- CrPC provisions\n\nHow can I assist you today?",
  sources: [],
}

const DEFAULT_SESSIONS = [
  { id: 1, title: 'IPC Section 302 Query', active: true },
  { id: 2, title: 'FIR Filing Process', active: false },
  { id: 3, title: 'Bail Provisions', active: false },
]

const STREAMING_MESSAGE = {
  role: 'ai',
  content: '',
  sources: [],
}

function Chat() {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatSessions, setChatSessions] = useState(DEFAULT_SESSIONS)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [disclaimerAck, setDisclaimerAck] = useState(() => {
    try {
      return localStorage.getItem('nyayaai_disclaimer_ack') === 'true'
    } catch {
      return true
    }
  })
  const sessionMessagesRef = useRef({})

  const acceptDisclaimer = () => {
    try {
      localStorage.setItem('nyayaai_disclaimer_ack', 'true')
    } catch {
      /* ignore storage errors */
    }
    setDisclaimerAck(true)
  }

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const recognitionRef = useRef(null)
  const speechBaseRef = useRef('')
  const finalTranscriptRef = useRef('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingNotSupported, setRecordingNotSupported] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setRecordingNotSupported(true)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-IN'

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript
        } else {
          interim += transcript
        }
      }
      const base = speechBaseRef.current
      const spoken = `${finalTranscriptRef.current}${interim}`.trim()
      const joined = base
        ? spoken
          ? `${base} ${spoken}`
          : base
        : spoken
      setInput(joined)
    }

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      // Commit final transcript into base so subsequent recordings append cleanly
      const base = speechBaseRef.current
      const finalized = finalTranscriptRef.current.trim()
      if (finalized) {
        speechBaseRef.current = base ? `${base} ${finalized}` : finalized
      }
      finalTranscriptRef.current = ''
      setIsRecording(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [])

  const activeSession = chatSessions.find((session) => session.active)
  const chatTitle = activeSession ? activeSession.title : 'New Conversation'

  const handleSelectSession = (id) => {
    setChatSessions((prev) => {
      const currentActive = prev.find((s) => s.active)
      if (currentActive) {
        sessionMessagesRef.current[currentActive.id] = messages
      }
      return prev.map((session) => ({ ...session, active: session.id === id }))
    })
    const targetSession = chatSessions.find((s) => s.id === id)
    if (targetSession && sessionMessagesRef.current[id]) {
      setMessages(sessionMessagesRef.current[id])
    } else if (targetSession) {
      setMessages([WELCOME_MESSAGE])
    }
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const handleNewChat = () => {
    const newId = Date.now()
    setChatSessions((prev) => {
      const currentActive = prev.find((s) => s.active)
      if (currentActive) {
        sessionMessagesRef.current[currentActive.id] = messages
      }
      return [
        { id: newId, title: 'New Conversation', active: true },
        ...prev.map((session) => ({ ...session, active: false })),
      ]
    })
    setMessages([WELCOME_MESSAGE])
    setInput('')
    speechBaseRef.current = ''
    finalTranscriptRef.current = ''
    if (window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const updateStreamingMessage = (updater) => {
    setMessages((prev) => {
      const next = [...prev]
      const lastMessage = next[next.length - 1]

      if (!lastMessage || lastMessage.role !== 'ai') {
        next.push({ ...STREAMING_MESSAGE })
      }

      next[next.length - 1] = updater(next[next.length - 1])
      return next
    })
  }

  const streamAssistantReply = async (query, history = []) => {
    setIsLoading(true)

    try {
      const token = localStorage.getItem('nyayaai_token')
      const response = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: query.trim(), history }),
      })

      if (response.status === 401) {
        updateStreamingMessage(() => ({
          role: 'ai',
          content: 'Your session has expired or you are not signed in. Please log in again to continue.',
          sources: [],
        }))
        setIsLoading(false)
        return
      }

      if (!response.ok || !response.body) {
        const errorText = await response.text().catch(() => '')
        throw new Error(
          errorText || `Chat request failed with status ${response.status}`,
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamFinished = false

      while (!streamFinished) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const eventChunk of events) {
          const payloadText = eventChunk
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trim())
            .join('\n')

          if (!payloadText) continue

          const payload = JSON.parse(payloadText)

          if (payload.type === 'token') {
            updateStreamingMessage((message) => ({
              ...message,
              content: `${message.content}${payload.content ?? ''}`,
            }))
            continue
          }

          if (payload.type === 'citations') {
            updateStreamingMessage((message) => ({
              ...message,
              sources: payload.citations || [],
              sourceType: payload.source || 'kb',
              confidence: payload.confidence,
            }))
            continue
          }

          if (payload.type === 'error') {
            throw new Error(payload.content || 'Streaming failed')
          }

          if (payload.type === 'done') {
            streamFinished = true
            break
          }
        }
      }
    } catch (error) {
      updateStreamingMessage(() => ({
        role: 'ai',
        content:
          'I apologise - something went wrong while processing your request. Please try again or rephrase your query.',
        sources: [],
      }))
    } finally {
      setIsLoading(false)
    }
  }

  // Build the recent conversation to send as context, skipping the canned
  // welcome greeting and any empty placeholders.
  const buildHistory = (msgs) =>
    msgs
      .filter((m) => m !== WELCOME_MESSAGE && m.content && m.content.trim().length > 0)
      .slice(-6)
      .map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }))

  const sendMessage = (text) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const history = buildHistory(messages)
    const userMessage = { role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])

    const activeSession = chatSessions.find((s) => s.active)
    if (activeSession && activeSession.title === 'New Conversation') {
      setChatSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id ? { ...s, title: trimmed.slice(0, 50) } : s,
        ),
      )
    }

    setInput('')
    speechBaseRef.current = ''
    finalTranscriptRef.current = ''
    streamAssistantReply(trimmed, history)
  }

  const handleSend = () => sendMessage(input)
  const handleSuggestionClick = (text) => sendMessage(text)

  const handleRegenerate = () => {
    if (isLoading) return
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg) return

    const priorMessages = []
    setMessages((prev) => {
      const next = [...prev]
      if (next.length > 0 && next[next.length - 1].role === 'ai') {
        next.pop()
      }
      // History for regeneration excludes the last user message we're answering.
      priorMessages.push(...next.slice(0, -1))
      return next
    })

    streamAssistantReply(lastUserMsg.content, buildHistory(priorMessages))
  }

  const handleBranch = (messageIndex) => {
    const newId = Date.now()
    const branchMessages = messages.slice(0, messageIndex + 1)

    setChatSessions((prev) => {
      const currentActive = prev.find((s) => s.active)
      if (currentActive) {
        sessionMessagesRef.current[currentActive.id] = messages
      }
      return [
        { id: newId, title: 'Branched Chat', active: true },
        ...prev.map((session) => ({ ...session, active: false })),
      ]
    })

    sessionMessagesRef.current[newId] = branchMessages
    setMessages(branchMessages)
    setInput('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleAskAbout = (selectedText) => {
    const query = `Regarding: "${selectedText}"\n\nTell me more about this.`
    sendMessage(query)
  }

  const toggleRecording = () => {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (isRecording) {
      recognition.stop()
      setIsRecording(false)
    } else {
      // Snapshot whatever the user has typed so speech results are appended,
      // not duplicated onto the previous recording.
      speechBaseRef.current = input.trim()
      finalTranscriptRef.current = ''
      try {
        recognition.start()
        setIsRecording(true)
      } catch (err) {
        console.warn('Could not start speech recognition:', err)
      }
    }
  }

  const suggestions = [
    { title: "What is IPC Section 302?", icon: MessageSquare },
    { title: "Explain FIR filing process", icon: Bot },
    { title: "IPC to BNS mapping for 498A", icon: Sparkles },
    { title: "What are my bail rights?", icon: Circle },
  ]

  return (
    <div className="h-screen flex bg-ink font-body text-fg overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-ink/80 z-20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: '-100%' }}
        animate={{ 
          x: sidebarOpen ? 0 : '-100%',
          width: sidebarOpen ? 288 : 0,
          opacity: sidebarOpen ? 1 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed md:relative z-30 h-full flex flex-col bg-ink-2/90 backdrop-blur-xl border-r border-line overflow-hidden shrink-0"
      >
        <div className="w-72 flex flex-col h-full">
          <div className="p-4 border-b border-line flex items-center justify-between">
            <h1 className="text-gold font-display text-xl font-bold">
              NyayaAI
            </h1>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 text-fg-muted hover:text-fg transition-colors rounded-lg hover:bg-surface/50"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-4 pt-4">
            <button
              onClick={handleNewChat}
              className="w-full bg-surface/40 hover:bg-surface/80 border border-line hover:border-gold-line text-fg rounded-xl px-4 py-2.5 transition-all flex items-center gap-2 group shadow-sm backdrop-blur-md"
            >
              <Plus size={18} className="text-gold-dim group-hover:text-gold transition-colors" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            <p className="text-xs font-semibold text-fg-faint uppercase tracking-wider mb-3 px-1">Recent Sessions</p>
            {chatSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all truncate flex items-center gap-3 relative ${
                  session.active
                    ? 'bg-surface-2 border border-gold-line text-fg'
                    : 'text-fg-muted hover:bg-surface/50 hover:text-fg border border-transparent'
                }`}
              >
                {session.active && (
                  <motion.div 
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-4 bg-gold rounded-r-full"
                  />
                )}
                <span className="truncate pl-1">{session.title}</span>
              </button>
            ))}
          </div>

          <div className="p-4 border-t border-line">
            <a
              href="/"
              className="flex items-center gap-2 text-fg-muted text-sm hover:text-fg transition-colors"
            >
              <ChevronLeft size={16} />
              Back to Home
            </a>
          </div>
        </div>
      </motion.aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col bg-ink min-w-0 relative">
        <header className="px-4 md:px-6 py-4 border-b border-line bg-surface/40 backdrop-blur-xl flex items-center gap-3 sticky top-0 z-10 shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1.5 text-fg-muted hover:text-fg transition-colors rounded-lg hover:bg-surface/50"
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-fg">
                {chatTitle}
              </h2>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <div className="h-0.5 w-full bg-gradient-to-r from-gold-dim to-transparent mt-1 rounded-full opacity-50" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 chat-scroll">
          <div className="max-w-3xl mx-auto w-full space-y-5">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isLastAi = message.role === 'ai' && (index === messages.length - 1 || messages[index + 1]?.role === 'user')
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <ChatBubble
                    message={message}
                    onRegenerate={isLastAi ? handleRegenerate : undefined}
                    onBranch={message.role === 'ai' ? () => handleBranch(index) : undefined}
                    onAskAbout={message.role === 'ai' ? handleAskAbout : undefined}
                  />
                </motion.div>
              )
            })}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <TypingIndicator />
            </motion.div>
          )}

          {messages.length <= 1 && !isLoading && (
            <div className="w-full mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6"
              >
                {suggestions.map((suggestion, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion.title)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="p-4 rounded-xl border border-line-2 bg-gradient-to-br from-surface/60 to-surface/30 hover:from-surface-2 hover:to-surface hover:border-gold-line hover:shadow-[0_8px_24px_-12px_rgba(212,166,78,0.25)] transition-all text-left flex items-center gap-3 group backdrop-blur-sm"
                  >
                    <div className="p-2.5 rounded-lg bg-surface-2 text-gold group-hover:bg-gold/15 group-hover:shadow-[0_0_12px_rgba(212,166,78,0.25)] transition-all shrink-0">
                      <suggestion.icon size={18} />
                    </div>
                    <h3 className="text-sm font-medium text-fg group-hover:text-gold-soft transition-colors">{suggestion.title}</h3>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className="p-4 pt-2 shrink-0">
          <div className="max-w-3xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gold/20 via-gold-dim to-transparent rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-md" />
            <div className="relative flex items-end gap-3 bg-surface/80 backdrop-blur-xl border border-line-2 rounded-2xl p-2 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)] focus-within:border-gold-line transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any Indian law section..."
                className="flex-1 bg-transparent px-3 py-2 text-fg placeholder:text-fg-faint focus:outline-none resize-none min-h-[44px] max-h-[160px] leading-relaxed"
                rows={1}
              />

              <div className="flex items-center gap-1.5 pb-1 pr-1 shrink-0">
                {input.length > 200 && (
                  <span className="text-xs text-fg-faint">
                    {input.length}
                  </span>
                )}
                {!recordingNotSupported && (
                  <button
                    onClick={toggleRecording}
                    disabled={isLoading}
                    className={`p-2 rounded-xl transition-all flex items-center justify-center relative ${
                      isRecording
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                        : 'text-fg-muted hover:text-fg hover:bg-surface-2'
                    }`}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                  >
                    {isRecording ? (
                      <>
                        <MicOff size={18} />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                      </>
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-gold text-ink p-2 rounded-xl hover:bg-gold-bright transition-all disabled:opacity-50 disabled:bg-surface-2 disabled:text-fg-muted flex items-center justify-center relative overflow-hidden"
                  aria-label="Send message"
                >
                  <Send size={18} className={!input.trim() || isLoading ? "" : "transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"} />
                </button>
              </div>
            </div>
            <p className="text-center text-[11px] text-fg-faint mt-2 px-4">
              NyayaAI provides general legal information, not legal advice. It can be
              inaccurate - verify important matters with a qualified lawyer.
            </p>
          </div>
        </div>
      </main>

      {/* One-time legal disclaimer consent */}
      <AnimatePresence>
        {!disclaimerAck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-ink/85 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="max-w-md w-full bg-gradient-to-br from-surface to-ink-3 border border-gold-line/50 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 border border-gold-line/50">
                  <Sparkles className="h-4 w-4 text-gold" />
                </div>
                <h2 className="font-display text-lg font-semibold text-fg">Before you begin</h2>
              </div>
              <p className="text-sm text-fg-muted leading-relaxed mb-3">
                NyayaAI is an AI assistant that provides <strong className="text-fg">general legal
                information</strong> about Indian law for educational purposes. It is
                <strong className="text-fg"> not a lawyer</strong> and its responses may be
                incomplete or inaccurate.
              </p>
              <p className="text-sm text-fg-muted leading-relaxed mb-5">
                Nothing here creates a lawyer-client relationship or constitutes legal advice.
                For decisions about your specific situation, consult a qualified advocate.
              </p>
              <button
                type="button"
                onClick={acceptDisclaimer}
                className="w-full bg-gold text-ink font-semibold py-2.5 rounded-xl hover:bg-gold-bright transition-colors"
              >
                I understand
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Chat
