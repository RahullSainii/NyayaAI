import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatBubble from '../components/ChatBubble'
import TypingIndicator from '../components/TypingIndicator'

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

  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const activeSession = chatSessions.find((session) => session.active)
  const chatTitle = activeSession ? activeSession.title : 'New Conversation'

  const handleSelectSession = (id) => {
    setChatSessions((prev) =>
      prev.map((session) => ({ ...session, active: session.id === id })),
    )
  }

  const handleNewChat = () => {
    const newId = Date.now()
    setChatSessions((prev) => [
      { id: newId, title: 'New Conversation', active: true },
      ...prev.map((session) => ({ ...session, active: false })),
    ])
    setMessages([WELCOME_MESSAGE])
    setInput('')
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

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage = { role: 'user', content: trimmed, sources: [] }
    setMessages((prev) => [...prev, userMessage, { ...STREAMING_MESSAGE }])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ query: trimmed }),
      })

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

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-screen flex bg-navy font-body">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-72 bg-surface border-r border-border flex flex-col"
      >
        <div className="p-4 border-b border-border">
          <h1 className="text-gold font-heading text-xl font-bold">
            NyayaAI
          </h1>

          <button
            onClick={handleNewChat}
            className="mt-4 w-full bg-card border border-border text-text-primary rounded-xl px-4 py-2.5 hover:border-muted-blue transition-all flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span>
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {chatSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => handleSelectSession(session.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all truncate ${
                session.active
                  ? 'bg-card text-text-primary border border-border'
                  : 'text-muted-blue hover:bg-card/50'
              }`}
            >
              {session.title}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border">
          <a
            href="/"
            className="text-muted-blue text-sm hover:text-text-primary transition-colors"
          >
            Back to Home
          </a>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col bg-navy">
        <motion.div
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-md"
        >
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            {chatTitle}
          </h2>
          <p className="text-muted-blue text-xs mt-0.5">
            AI-powered legal assistance
          </p>
        </motion.div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-scroll">
          <AnimatePresence initial={false}>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <ChatBubble message={message} />
              </motion.div>
            ))}
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

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border bg-surface/30">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about any Indian law section..."
              className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-muted-blue/50 focus:outline-none focus:border-muted-blue transition-colors"
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gold text-navy p-3 rounded-xl hover:bg-gold-hover transition-all font-semibold disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
