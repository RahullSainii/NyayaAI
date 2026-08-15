import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, MessageSquare, Circle, Sparkles, X } from 'lucide-react'
import ChatBubble from '../components/ChatBubble'
import TypingIndicator from '../components/TypingIndicator'
import ChatSidebar from '../components/ChatSidebar'
import ChatInputArea from '../components/ChatInputArea'
import DisclaimerModal from '../components/DisclaimerModal'
import logo from '../assets/nyaya.jpeg'

const WELCOME_MESSAGE = {
  role: 'ai',
  welcome: true,
  content:
    "Namaste! I'm NyayaAI, your AI-powered Indian legal assistant. I can help you with:\n\n- IPC to BNS section mappings\n- Criminal law procedures\n- FIR filing guidance\n- CrPC provisions\n\nHow can I assist you today?",
  sources: [],
}

// Chat history is persisted to localStorage so previous conversations survive reloads.
const CHATS_KEY = 'nyayaai_chats'

function SessionMenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {label}
    </button>
  )
}

const loadPersistedChats = () => {
  try {
    const raw = localStorage.getItem(CHATS_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || !Array.isArray(data.sessions)) return null
    return data
  } catch {
    return null
  }
}

const DEFAULT_SESSIONS = [
  { id: 1, title: 'New Conversation', active: true },
]

// The backend accepts text only, so we support attaching text-based documents
// whose contents get included with the question.
const ATTACHABLE_EXT = /\.(txt|md|markdown|csv|json|log|rtf|html?|xml|ya?ml)$/i
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i
const MAX_ATTACH_CHARS = 20000        // per plain-text file (matches backend extract cap)
const MAX_ATTACH_TEXT_CHARS = 24000   // combined attachment_text cap (matches backend)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

const STREAMING_MESSAGE = {
  role: 'ai',
  content: '',
  sources: [],
}

function Chat() {
  const persistedChats = useRef(loadPersistedChats()).current
  const [messages, setMessages] = useState(() => {
    const active = (persistedChats?.sessions || []).find((s) => s.active)
    if (active && persistedChats?.messages?.[active.id]?.length) {
      return persistedChats.messages[active.id]
    }
    return [WELCOME_MESSAGE]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatSessions, setChatSessions] = useState(
    persistedChats?.sessions?.length ? persistedChats.sessions : DEFAULT_SESSIONS,
  )
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [menu, setMenu] = useState(null) // { id, top, left } for the session "..." menu
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [disclaimerAck, setDisclaimerAck] = useState(() => {
    try {
      return localStorage.getItem('nyayaai_disclaimer_ack') === 'true'
    } catch {
      return true
    }
  })
  const sessionMessagesRef = useRef(persistedChats?.messages ? { ...persistedChats.messages } : {})

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
  const fileInputRef = useRef(null)
  const attachIdRef = useRef(0)
  const [attachments, setAttachments] = useState([])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Persist sessions + their messages so chat history survives reloads. Skipped
  // while streaming to avoid writing localStorage on every token.
  useEffect(() => {
    if (isLoading) return
    const active = chatSessions.find((s) => s.active)
    const map = { ...sessionMessagesRef.current }
    if (active) map[active.id] = messages
    sessionMessagesRef.current = map
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify({ sessions: chatSessions, messages: map }))
    } catch {
      /* storage full or unavailable */
    }
  }, [messages, chatSessions, isLoading])

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
  const nonArchived = chatSessions.filter((s) => !s.archived)
  const recentSessions = [
    ...nonArchived.filter((s) => s.pinned),
    ...nonArchived.filter((s) => !s.pinned),
  ]
  const archivedSessions = chatSessions.filter((s) => s.archived)

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

  const handleDeleteSession = (id) => {
    if (isLoading) return // don't delete while a response is streaming

    const wasActive = chatSessions.find((s) => s.id === id)?.active
    const remaining = chatSessions.filter((s) => s.id !== id)
    const map = { ...sessionMessagesRef.current }
    delete map[id]

    if (remaining.length === 0) {
      // Deleted the last one -> start fresh.
      const newId = Date.now()
      sessionMessagesRef.current = {}
      setChatSessions([{ id: newId, title: 'New Conversation', active: true }])
      setMessages([WELCOME_MESSAGE])
      return
    }

    let nextSessions = remaining
    if (wasActive) {
      // Activate the first remaining session and load its messages.
      nextSessions = remaining.map((s, i) => ({ ...s, active: i === 0 }))
      const firstMsgs = map[nextSessions[0].id]
      setMessages(firstMsgs && firstMsgs.length ? firstMsgs : [WELCOME_MESSAGE])
    }
    sessionMessagesRef.current = map
    setChatSessions(nextSessions)
  }

  const openMenu = (event, id) => {
    event.stopPropagation()
    if (menu?.id === id) {
      setMenu(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    setMenu({
      id,
      top: Math.min(rect.bottom + 4, window.innerHeight - 240),
      left: Math.max(8, Math.min(rect.right - 184, window.innerWidth - 192)),
    })
  }

  const startRename = (session) => {
    setMenu(null)
    setRenamingId(session.id)
    setRenameValue(session.title)
  }

  const commitRename = (id) => {
    const title = renameValue.trim().slice(0, 80) || 'Untitled'
    setChatSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)))
    setRenamingId(null)
    setRenameValue('')
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameValue('')
  }

  const togglePin = (id) => {
    setMenu(null)
    setChatSessions((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)))
  }

  const toggleArchive = (id) => {
    setMenu(null)
    const target = chatSessions.find((s) => s.id === id)
    if (!target) return
    const willArchive = !target.archived

    if (willArchive && target.active) {
      // Archiving the open chat -> switch to the next available conversation.
      const others = chatSessions.filter((s) => s.id !== id && !s.archived)
      if (others.length) {
        const nextId = others[0].id
        const nextMsgs = sessionMessagesRef.current[nextId]
        setMessages(nextMsgs && nextMsgs.length ? nextMsgs : [WELCOME_MESSAGE])
        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, archived: true, active: false } : { ...s, active: s.id === nextId },
          ),
        )
      } else {
        const newId = Date.now()
        setMessages([WELCOME_MESSAGE])
        setChatSessions((prev) => [
          { id: newId, title: 'New Conversation', active: true },
          ...prev.map((s) => (s.id === id ? { ...s, archived: true, active: false } : { ...s, active: false })),
        ])
      }
    } else {
      setChatSessions((prev) => prev.map((s) => (s.id === id ? { ...s, archived: willArchive } : s)))
    }
  }

  const shareSession = async (id) => {
    setMenu(null)
    const active = chatSessions.find((s) => s.active)
    const msgs = active && active.id === id ? messages : sessionMessagesRef.current[id] || []
    const transcript = msgs
      .filter((m) => !m.welcome && m.content && m.content.trim())
      .map((m) => `${m.role === 'user' ? 'You' : 'NyayaAI'}: ${m.content}`)
      .join('\n\n')
    if (!transcript) return
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NyayaAI Conversation', text: transcript })
        return
      }
    } catch {
      /* user cancelled -> fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(transcript)
      alert('Conversation copied to clipboard.')
    } catch {
      /* clipboard unavailable */
    }
  }

  // Close the "..." menu on outside click / scroll / Escape.
  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (e) => { if (e.key === 'Escape') setMenu(null) }
    const onDown = (e) => {
      if (!e.target.closest('[data-session-menu]') && !e.target.closest('[data-session-optbtn]')) {
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [menu])

  const renderSessionRow = (session, isArchived = false) => (
    <div
      key={session.id}
      data-session-row
      className={`group relative flex items-center border-l-4 ${
        session.active && !isArchived ? 'border-secondary bg-white/5' : 'border-transparent hover:bg-white/5'
      }`}
    >
      {renamingId === session.id ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={() => commitRename(session.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitRename(session.id) }
            else if (e.key === 'Escape') cancelRename()
          }}
          className="flex-1 mx-3 my-2 bg-slate-900 border border-secondary/50 rounded px-2 py-1 text-sm text-on-surface focus:outline-none"
        />
      ) : (
        <>
          <button
            onClick={() => handleSelectSession(session.id)}
            className={`flex items-center gap-3 pl-4 py-3 flex-1 min-w-0 text-left ${
              session.active && !isArchived ? 'text-secondary font-bold' : 'text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined shrink-0 text-[20px]">
              {session.pinned ? 'push_pin' : session.active && !isArchived ? 'chat' : 'history'}
            </span>
            <span className="font-label-caps text-label-caps truncate">{session.title}</span>
          </button>
          <button
            data-session-optbtn
            onClick={(e) => openMenu(e, session.id)}
            title="Options"
            aria-label="Conversation options"
            className="p-2 mr-1 rounded-md text-on-surface-variant/50 hover:text-on-surface hover:bg-white/10 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>
        </>
      )}
    </div>
  )

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

  const streamAssistantReply = async (query, history = [], extra = {}) => {
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
        body: JSON.stringify({
          query: query.trim(),
          history,
          ...(extra.attachmentText
            ? { attachment_text: extra.attachmentText, attachment_name: extra.attachmentName }
            : {}),
          ...(extra.imageData
            ? { image_data: extra.imageData, image_mime: extra.imageMime, image_name: extra.imageName }
            : {}),
        }),
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
      .filter((m) => !m.welcome && m.content && m.content.trim().length > 0)
      .slice(-6)
      .map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content,
      }))

  const sendMessage = (text) => {
    const trimmed = text.trim()
    const docs = attachments.filter((a) => a.content)
    const image = attachments.find((a) => a.imageData)
    const ready = attachments.filter((a) => a.content || a.imageData)
    if ((!trimmed && ready.length === 0) || isLoading) return
    if (attachments.some((a) => a.loading)) return // wait for extraction to finish

    const history = buildHistory(messages)
    const allNames = ready.map((a) => a.name).join(', ')

    // Document text is sent separately (attachment_text); an image is sent as
    // base64 (image_data) for the vision model.
    const attachmentText = docs.length
      ? docs.map((a) => `--- ${a.name} ---\n${a.content}`).join('\n\n').slice(0, MAX_ATTACH_TEXT_CHARS)
      : ''

    const queryToSend =
      trimmed ||
      (image
        ? 'What does this image show? Explain any legal relevance.'
        : docs.length
          ? `Please analyse the attached document${docs.length > 1 ? 's' : ''} (${allNames}).`
          : '')

    const note = ready.length ? `${trimmed ? '\n\n' : ''}[Attached: ${allNames}]` : ''
    const displayContent = `${trimmed}${note}`.trim() || `[Attached: ${allNames}]`

    const userMessage = { role: 'user', content: displayContent }
    setMessages((prev) => [...prev, userMessage])

    const activeSession = chatSessions.find((s) => s.active)
    if (activeSession && activeSession.title === 'New Conversation') {
      const seed = (trimmed || ready[0]?.name || 'New Conversation').slice(0, 50)
      setChatSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id ? { ...s, title: seed } : s,
        ),
      )
    }

    setInput('')
    setAttachments([])
    speechBaseRef.current = ''
    finalTranscriptRef.current = ''
    streamAssistantReply(queryToSend, history, {
      attachmentText,
      attachmentName: allNames,
      imageData: image?.imageData,
      imageMime: image?.imageMime,
      imageName: image?.name,
    })
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

  const handleAttachClick = () => fileInputRef.current?.click()

  // PDF / DOCX and other non-plain-text files are extracted server-side.
  const extractViaBackend = async (file) => {
    const token = localStorage.getItem('nyayaai_token')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(apiUrl('/extract'), {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || 'Could not process this file')
    return { content: data.text, truncated: data.truncated }
  }

  const readImageAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result || '')
        const [meta, b64] = result.split(',')
        const mimeMatch = meta.match(/data:(.*?);base64/)
        resolve({
          imageData: b64,
          imageMime: mimeMatch ? mimeMatch[1] : file.type || 'image/png',
          dataUrl: result,
        })
      }
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(file)
    })

  const handleFilesSelected = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = '' // allow re-selecting the same file later
    for (const file of files) {
      const id = ++attachIdRef.current
      const isImage = IMAGE_EXT.test(file.name) || (file.type || '').startsWith('image/')
      setAttachments((prev) => [...prev, { id, name: file.name, loading: true, isImage }])
      try {
        let result
        if (isImage) {
          // Screenshots / photos: sent to a vision model as base64.
          if (file.size > MAX_IMAGE_BYTES) throw new Error('Image too large (max 5 MB)')
          result = { isImage: true, ...(await readImageAsBase64(file)) }
        } else if (ATTACHABLE_EXT.test(file.name)) {
          // Plain text: read directly in the browser (no round-trip).
          const text = await file.text()
          result = { content: text.slice(0, MAX_ATTACH_CHARS), truncated: text.length > MAX_ATTACH_CHARS }
        } else {
          // PDF / DOCX / etc.: extract text on the server.
          result = await extractViaBackend(file)
        }
        setAttachments((prev) => prev.map((a) => (a.id === id ? { id, name: file.name, ...result } : a)))
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) => (a.id === id ? { id, name: file.name, error: err.message || 'Failed to read file' } : a)),
        )
      }
    }
  }

  const removeAttachment = (id) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id))

  const suggestions = [
    { title: "What is IPC Section 302?", icon: MessageSquare },
    { title: "Explain FIR filing process", icon: Bot },
    { title: "IPC to BNS mapping for 498A", icon: Sparkles },
    { title: "What are my bail rights?", icon: Circle },
  ]

  return (
    <div className="antialiased min-h-screen flex font-body-md text-body-md bg-background text-on-surface overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-900/80 z-20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* SideNavBar */}
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        handleNewChat={handleNewChat}
        recentSessions={recentSessions}
        archivedSessions={archivedSessions}
        renderSessionRow={renderSessionRow}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative min-w-0">
        {/* TopAppBar (Mobile Only) */}
        {!sidebarOpen && (
          <header className="flex md:hidden absolute top-0 w-full z-30 justify-between items-center px-4 h-16 bg-glass-bg backdrop-blur-md border-b border-glass-border shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)}>
                <span className="material-symbols-outlined text-secondary">menu</span>
              </button>
              <span className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface truncate">{chatTitle}</span>
            </div>
            <div className="flex gap-4 shrink-0">
              <span className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors cursor-pointer">notifications</span>
            </div>
          </header>
        )}

        {/* Chat Canvas */}
        <div className={`flex-1 min-h-0 overflow-y-auto p-4 md:p-8 ${!sidebarOpen ? 'mt-16' : ''} md:mt-0 flex flex-col items-center chat-scroll`}>
          <div className="w-full max-w-[800px] flex flex-col gap-8 pb-6">
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
                    className="w-full"
                  >
                    <ChatBubble
                      message={message}
                      isStreaming={false}
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
                className="self-start w-full"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-glass-border flex items-center justify-center shrink-0">
                    <img src={logo} alt="NyayaAI" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-label-caps text-label-caps text-secondary">NyayaAI is thinking...</span>
                </div>
                <div className="glass-panel rounded-lg p-6 border-l-4 border-l-secondary ai-think-glow max-w-fit">
                   <TypingIndicator />
                </div>
              </motion.div>
            )}

            {messages.length <= 1 && !isLoading && (
              <div className="w-full mb-8">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6"
                >
                  {suggestions.map((suggestion, i) => (
                    <motion.button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion.title)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-5 rounded-lg border border-glass-border bg-slate-800/50 hover:bg-slate-800 hover:border-secondary/30 transition-all text-left flex items-center gap-4 group"
                    >
                      <div className="p-2 rounded-full bg-surface-variant text-secondary group-hover:bg-secondary/20 transition-all shrink-0">
                        <suggestion.icon size={18} />
                      </div>
                      <h3 className="text-sm font-medium text-on-surface group-hover:text-secondary transition-colors">{suggestion.title}</h3>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area (in-flow so it never overlaps the last message's actions) */}
        <ChatInputArea
          input={input}
          setInput={setInput}
          handleKeyDown={handleKeyDown}
          handleSend={handleSend}
          isLoading={isLoading}
          attachments={attachments}
          handleAttachClick={handleAttachClick}
          handleFilesSelected={handleFilesSelected}
          removeAttachment={removeAttachment}
          isRecording={isRecording}
          recordingNotSupported={recordingNotSupported}
          toggleRecording={toggleRecording}
          textareaRef={textareaRef}
          fileInputRef={fileInputRef}
        />
      </main>

      {/* Session "..." options menu (fixed so it escapes the sidebar's overflow) */}
      {menu && (() => {
        const s = chatSessions.find((x) => x.id === menu.id)
        if (!s) return null
        return (
          <div
            data-session-menu
            style={{ position: 'fixed', top: menu.top, left: menu.left }}
            className="z-[9999] min-w-[184px] rounded-xl border border-glass-border bg-slate-800 shadow-2xl py-1"
          >
            <SessionMenuItem icon="ios_share" label="Share" onClick={() => shareSession(s.id)} />
            <SessionMenuItem icon="edit" label="Rename" onClick={() => startRename(s)} />
            <SessionMenuItem icon="push_pin" label={s.pinned ? 'Unpin' : 'Pin chat'} onClick={() => togglePin(s.id)} />
            <SessionMenuItem icon="inventory_2" label={s.archived ? 'Unarchive' : 'Archive'} onClick={() => toggleArchive(s.id)} />
            <SessionMenuItem
              icon="delete"
              label="Delete"
              danger
              onClick={() => { const id = s.id; setMenu(null); handleDeleteSession(id) }}
            />
          </div>
        )
      })()}

      {/* One-time legal disclaimer consent */}
      <DisclaimerModal ack={disclaimerAck} onAccept={acceptDisclaimer} />
    </div>
  )
}

export default Chat
