import { useState, useRef, useEffect } from 'react';
import type { ChatSession, ChatMessage, ChatMenuState } from '../types';
import { useChatStore } from '../store/useChatStore';

export const CHATS_KEY = 'nyayaai_chats';

export const WELCOME_MESSAGE: ChatMessage = {
  role: 'ai',
  welcome: true,
  content:
    "Namaste! I'm NyayaAI, your AI-powered Indian legal assistant. I can help you with:\n\n- IPC to BNS section mappings\n- Criminal law procedures\n- FIR filing guidance\n- CrPC provisions\n\nHow can I assist you today?",
  sources: [],
};

export const DEFAULT_SESSIONS: ChatSession[] = [
  { id: 1, title: 'New Conversation', active: true },
];

export interface PersistedChatData {
  sessions: ChatSession[];
  messages: Record<string | number, ChatMessage[]>;
}

/**
 * Loads persisted chat sessions and messages from localStorage.
 */
export const loadPersistedChats = (): PersistedChatData | null => {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.sessions)) return null;
    return data;
  } catch {
    return null;
  }
};

/**
 * Custom hook for managing chat sessions, messages, and related UI states.
 */
export function useChatSessions() {
  const persistedChats = useRef<PersistedChatData | null>(loadPersistedChats()).current;
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const active = (persistedChats?.sessions || []).find((s) => s.active);
    if (active && persistedChats?.messages?.[active.id]?.length) {
      return persistedChats.messages[active.id];
    }
    return [WELCOME_MESSAGE];
  });
  
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(
    persistedChats?.sessions?.length ? persistedChats.sessions : DEFAULT_SESSIONS
  );
  
  const [menu, setMenu] = useState<ChatMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<number | string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);

  const sessionMessagesRef = useRef<Record<string | number, ChatMessage[]>>(
    persistedChats?.messages ? { ...persistedChats.messages } : {}
  );

  /**
   * Persists sessions + messages to localStorage.
   */
  const persistSessions = (isLoading: boolean) => {
    if (isLoading) return;
    const active = chatSessions.find((s) => s.active);
    const map = { ...sessionMessagesRef.current };
    if (active) map[active.id] = messages;
    sessionMessagesRef.current = map;
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify({ sessions: chatSessions, messages: map }));
    } catch {
      /* storage full or unavailable */
    }
  };

  const activeSession = chatSessions.find((session) => session.active);
  const chatTitle = activeSession ? activeSession.title : 'New Conversation';
  const nonArchived = chatSessions.filter((s) => !s.archived);
  const recentSessions = [
    ...nonArchived.filter((s) => s.pinned),
    ...nonArchived.filter((s) => !s.pinned),
  ];
  const archivedSessions = chatSessions.filter((s) => s.archived);

  /**
   * Selects an existing chat session.
   */
  const handleSelectSession = (id: number | string) => {
    setChatSessions((prev) => {
      const currentActive = prev.find((s) => s.active);
      if (currentActive) {
        sessionMessagesRef.current[currentActive.id] = messages;
      }
      return prev.map((session) => ({ ...session, active: session.id === id }));
    });
    const targetSession = chatSessions.find((s) => s.id === id);
    if (targetSession && sessionMessagesRef.current[id]) {
      setMessages(sessionMessagesRef.current[id]);
    } else if (targetSession) {
      setMessages([WELCOME_MESSAGE]);
    }
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  /**
   * Starts a new chat session.
   */
  const handleNewChat = () => {
    const newId = Date.now();
    setChatSessions((prev) => {
      const currentActive = prev.find((s) => s.active);
      if (currentActive) {
        sessionMessagesRef.current[currentActive.id] = messages;
      }
      return [
        { id: newId, title: 'New Conversation', active: true },
        ...prev.map((session) => ({ ...session, active: false })),
      ];
    });
    setMessages([WELCOME_MESSAGE]);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  /**
   * Deletes a chat session.
   */
  const handleDeleteSession = (id: number | string, isLoading: boolean) => {
    if (isLoading) return;

    const wasActive = chatSessions.find((s) => s.id === id)?.active;
    const remaining = chatSessions.filter((s) => s.id !== id);
    const map = { ...sessionMessagesRef.current };
    delete map[id];

    if (remaining.length === 0) {
      const newId = Date.now();
      sessionMessagesRef.current = {};
      setChatSessions([{ id: newId, title: 'New Conversation', active: true }]);
      setMessages([WELCOME_MESSAGE]);
      return;
    }

    let nextSessions = remaining;
    if (wasActive) {
      nextSessions = remaining.map((s, i) => ({ ...s, active: i === 0 }));
      const firstMsgs = map[nextSessions[0].id];
      setMessages(firstMsgs && firstMsgs.length ? firstMsgs : [WELCOME_MESSAGE]);
    }
    sessionMessagesRef.current = map;
    setChatSessions(nextSessions);
  };

  /**
   * Opens the options menu for a session.
   */
  const openMenu = (event: React.MouseEvent<HTMLElement>, id: number | string) => {
    event.stopPropagation();
    if (menu?.id === id) {
      setMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setMenu({
      id,
      top: Math.min(rect.bottom + 4, window.innerHeight - 240),
      left: Math.max(8, Math.min(rect.right - 184, window.innerWidth - 192)),
    });
  };

  const startRename = (session: ChatSession) => {
    setMenu(null);
    setRenamingId(session.id);
    setRenameValue(session.title);
  };

  const commitRename = (id: number | string) => {
    const title = renameValue.trim().slice(0, 80) || 'Untitled';
    setChatSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title } : s)));
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const togglePin = (id: number | string) => {
    setMenu(null);
    setChatSessions((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)));
  };

  const toggleArchive = (id: number | string) => {
    setMenu(null);
    const target = chatSessions.find((s) => s.id === id);
    if (!target) return;
    const willArchive = !target.archived;

    if (willArchive && target.active) {
      const others = chatSessions.filter((s) => s.id !== id && !s.archived);
      if (others.length) {
        const nextId = others[0].id;
        const nextMsgs = sessionMessagesRef.current[nextId];
        setMessages(nextMsgs && nextMsgs.length ? nextMsgs : [WELCOME_MESSAGE]);
        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, archived: true, active: false } : { ...s, active: s.id === nextId }
          )
        );
      } else {
        const newId = Date.now();
        setMessages([WELCOME_MESSAGE]);
        setChatSessions((prev) => [
          { id: newId, title: 'New Conversation', active: true },
          ...prev.map((s) => (s.id === id ? { ...s, archived: true, active: false } : { ...s, active: false })),
        ]);
      }
    } else {
      setChatSessions((prev) => prev.map((s) => (s.id === id ? { ...s, archived: willArchive } : s)));
    }
  };

  const shareSession = async (id: number | string) => {
    setMenu(null);
    const active = chatSessions.find((s) => s.active);
    const msgs = active && active.id === id ? messages : sessionMessagesRef.current[id] || [];
    const transcript = msgs
      .filter((m) => !m.welcome && m.content && m.content.trim())
      .map((m) => `${m.role === 'user' ? 'You' : 'NyayaAI'}: ${m.content}`)
      .join('\n\n');
    if (!transcript) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NyayaAI Conversation', text: transcript });
        return;
      }
    } catch {
      /* user cancelled -> fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(transcript);
      alert('Conversation copied to clipboard.');
    } catch {
      /* clipboard unavailable */
    }
  };

  // Close menu on click outside or escape
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-session-menu]') && !target.closest('[data-session-optbtn]')) {
        setMenu(null);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  return {
    messages,
    setMessages,
    chatSessions,
    setChatSessions,
    menu,
    setMenu,
    renamingId,
    setRenamingId,
    renameValue,
    setRenameValue,
    showArchived,
    setShowArchived,
    sessionMessagesRef,
    activeSession,
    chatTitle,
    nonArchived,
    recentSessions,
    archivedSessions,
    handleSelectSession,
    handleNewChat,
    handleDeleteSession,
    openMenu,
    startRename,
    commitRename,
    cancelRename,
    togglePin,
    toggleArchive,
    shareSession,
    persistSessions,
  };
}
