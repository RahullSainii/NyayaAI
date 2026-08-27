import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, MessageSquare, Circle, Sparkles, Menu } from 'lucide-react';
import ChatBubble from '../components/ChatBubble';
import TypingIndicator from '../components/TypingIndicator';
import ChatSidebar from '../components/ChatSidebar';
import ChatInputArea from '../components/ChatInputArea';
import DisclaimerModal from '../components/DisclaimerModal';
import { SessionRow } from '../components/SessionRow';
import { SessionContextMenu } from '../components/SessionContextMenu';
import { Virtuoso } from 'react-virtuoso';

import { useChatSessions } from '../hooks/useChatSessions';
import { useStreamingReply } from '../hooks/useStreamingReply';
import { useSpeechInput } from '../hooks/useSpeechInput';
import { useAttachments } from '../hooks/useAttachments';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useChatStore } from '../store/useChatStore';
import type { ChatMessage, ChatSession } from '../types';

const suggestions = [
  { title: "What is IPC Section 302?", icon: MessageSquare },
  { title: "Explain FIR filing process", icon: Bot },
  { title: "IPC to BNS mapping for 498A", icon: Sparkles },
  { title: "What are my bail rights?", icon: Circle },
];

export default function Chat() {
  const { showToast } = useToast();
  
  const { 
    input, setInput, 
    isLoading, 
    sidebarOpen, setSidebarOpen, 
    disclaimerAck, acceptDisclaimer 
  } = useChatStore();

  const {
    messages,
    setMessages,
    chatSessions,
    setChatSessions,
    menu,
    setMenu,
    renamingId,
    renameValue,
    setRenameValue,
    showArchived,
    setShowArchived,
    sessionMessagesRef,
    activeSession,
    chatTitle,
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
    persistSessions,
  } = useChatSessions();

  useDocumentTitle(chatTitle);

  const {
    streamAssistantReply,
    buildHistory,
    handleRegenerate,
  } = useStreamingReply(messages, setMessages);


  const {
    isRecording,
    recordingNotSupported,
    toggleRecording,
    speechBaseRef,
    finalTranscriptRef,
  } = useSpeechInput(
    input,
    (value) => setInput(typeof value === 'function' ? value(input) : value)
  );

  const {
    attachments,
    setAttachments,
    fileInputRef,
    handleAttachClick,
    handleFilesSelected,
    removeAttachment,
  } = useAttachments();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    persistSessions(isLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatSessions, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const customShareSession = async (id: number | string) => {
    setMenu(null);
    const active = chatSessions.find((s) => s.active);
    const msgs = active && active.id === id ? messages : sessionMessagesRef.current[id] || [];
    const transcript = msgs
      .filter((m) => !m.welcome && m.content && m.content.trim())
      .map((m) => `${m.role === 'user' ? 'You' : 'NyayaAI'}: ${m.content}`)
      .join('\n\n');
    
    if (!transcript) {
      showToast('No messages to share.', 'info');
      return;
    }
    
    try {
      if (navigator.share) {
        await navigator.share({ title: 'NyayaAI Conversation', text: transcript });
        return;
      }
    } catch {
      /* user cancelled or failed -> fall through to clipboard */
    }
    
    try {
      await navigator.clipboard.writeText(transcript);
      showToast('Conversation copied to clipboard.', 'success');
    } catch {
      showToast('Failed to copy conversation.', 'error');
    }
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    const docs = attachments.filter((a) => a.content);
    const image = attachments.find((a) => a.imageData);
    const ready = attachments.filter((a) => a.content || a.imageData);
    if ((!trimmed && ready.length === 0) || isLoading) return;
    if (attachments.some((a) => a.loading)) {
      showToast('Please wait for attachments to finish processing.', 'info');
      return;
    }

    const history = buildHistory(messages);
    const allNames = ready.map((a) => a.name).join(', ');

    const MAX_ATTACH_TEXT_CHARS = 24000;
    const attachmentText = docs.length
      ? docs.map((a) => `--- ${a.name} ---\n${a.content}`).join('\n\n').slice(0, MAX_ATTACH_TEXT_CHARS)
      : '';

    const queryToSend =
      trimmed ||
      (image
        ? 'What does this image show? Explain any legal relevance.'
        : docs.length
          ? `Please analyse the attached document${docs.length > 1 ? 's' : ''} (${allNames}).`
          : '');

    const note = ready.length ? `${trimmed ? '\n\n' : ''}[Attached: ${allNames}]` : '';
    const displayContent = `${trimmed}${note}`.trim() || `[Attached: ${allNames}]`;

    const userMessage: ChatMessage = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: displayContent 
    };
    
    setMessages((prev) => [...prev, userMessage]);

    if (activeSession && activeSession.title === 'New Conversation') {
      const seed = (trimmed || ready[0]?.name || 'New Conversation').slice(0, 50);
      setChatSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, title: seed } : s))
      );
    }

    setInput('');
    setAttachments([]);
    speechBaseRef.current = '';
    finalTranscriptRef.current = '';
    
    streamAssistantReply(queryToSend, history, {
      attachmentText,
      attachmentName: allNames,
      imageData: image?.imageData,
      imageMime: image?.imageMime,
      imageName: image?.name,
    });
  };

  const handleSend = () => sendMessage(input);
  const handleSuggestionClick = (text: string) => sendMessage(text);

  const handleBranch = (messageIndex: number) => {
    const newId = Date.now();
    const branchMessages = messages.slice(0, messageIndex + 1);

    setChatSessions((prev) => {
      const currentActive = prev.find((s) => s.active);
      if (currentActive) {
        sessionMessagesRef.current[currentActive.id] = messages;
      }
      return [
        { id: newId, title: 'Branched Chat', active: true },
        ...prev.map((session) => ({ ...session, active: false })),
      ];
    });

    sessionMessagesRef.current[newId] = branchMessages;
    setMessages(branchMessages);
    setInput('');
    showToast('Branched into a new conversation.', 'success');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleAskAbout = (selectedText: string) => {
    const query = `Regarding: "${selectedText}"\n\nTell me more about this.`;
    sendMessage(query);
  };

  const renderSessionRow = useCallback(
    (session: ChatSession, isArchived: boolean = false) => (
      <SessionRow
        key={session.id}
        session={session}
        isArchived={isArchived}
        isRenaming={renamingId === session.id}
        renameValue={renameValue}
        onRenameChange={setRenameValue}
        onRenameCommit={commitRename}
        onRenameCancel={cancelRename}
        onSelect={handleSelectSession}
        onMenuOpen={(e, id) => openMenu(e as unknown as React.MouseEvent<HTMLElement>, id)}
      />
    ),
    [renamingId, renameValue, setRenameValue, commitRename, cancelRename, handleSelectSession, openMenu]
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <DisclaimerModal ack={disclaimerAck} onAccept={acceptDisclaimer} />

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
            />
            <ChatSidebar
              handleNewChat={() => {
                handleNewChat();
                setInput('');
                speechBaseRef.current = '';
                finalTranscriptRef.current = '';
              }}
              recentSessions={recentSessions}
              archivedSessions={archivedSessions}
              renderSessionRow={renderSessionRow}
              showArchived={showArchived}
              setShowArchived={setShowArchived}
            />
          </>
        )}
      </AnimatePresence>

      <main id="main-content" className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 shrink-0 flex items-center px-4 justify-between md:justify-end border-b border-surface">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-on-surface hover:bg-surface transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-[24px] h-[24px]" />
            </button>
          )}
        </header>

          <div className="flex-1 min-h-0 relative">
            <Virtuoso
              className="w-full h-full"
              data={messages}
              initialTopMostItemIndex={messages.length - 1}
              followOutput="smooth"
              itemContent={(index, message) => (
                <div className="max-w-3xl mx-auto px-4 py-3">
                  <ChatBubble
                    key={message.id || `msg-${index}`}
                    message={message}
                    onRegenerate={
                      message.role === 'ai' && message === messages[messages.length - 1]
                        ? handleRegenerate
                        : undefined
                    }
                    onBranch={
                      message.role === 'user'
                        ? () => handleBranch(messages.indexOf(message))
                        : undefined
                    }
                    onAskAbout={handleAskAbout}
                  />
                </div>
              )}
              components={{
                Footer: () => (
                  <div className="max-w-3xl mx-auto px-4 space-y-6 pb-6">
                    {isLoading && <TypingIndicator />}
                    {messages.length === 1 && messages[0].welcome && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-8"
                      >
                        {suggestions.map((suggestion, index) => {
                          const Icon = suggestion.icon;
                          return (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion.title)}
                              className="flex items-center gap-3 p-4 rounded-xl border border-surface bg-surface/30 hover:bg-surface/60 transition-colors text-left"
                            >
                              <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                <Icon className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-medium text-on-surface">
                                {suggestion.title}
                              </span>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )
              }}
            />
          </div>

        <div className="p-4 bg-gradient-to-t from-background via-background to-transparent shrink-0">
          <div className="max-w-3xl mx-auto">
            <ChatInputArea
              handleKeyDown={handleKeyDown}
              handleSend={handleSend}
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
            <div className="text-center mt-3 text-xs text-on-surface-variant font-medium">
              NyayaAI can make mistakes. Consider verifying important legal information.
            </div>
          </div>
        </div>
      </main>

      {menu && (
        <SessionContextMenu
          session={chatSessions.find(s => s.id === menu.id)!}
          position={menu}
          onClose={() => setMenu(null)}
          onShare={customShareSession}
          onRename={startRename}
          onTogglePin={togglePin}
          onToggleArchive={toggleArchive}
          onDelete={(id) => handleDeleteSession(id, isLoading)}
        />
      )}
    </div>
  );
}
