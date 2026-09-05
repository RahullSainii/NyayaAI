import React, { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeft, Plus, Share2 } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';
import ChatBubble from '../components/ChatBubble';
import ChatInputArea from '../components/ChatInputArea';
import ChatSidebar from '../components/ChatSidebar';
import DisclaimerModal from '../components/DisclaimerModal';
import SelectionToolbar from '../components/SelectionToolbar';
import TypingIndicator from '../components/TypingIndicator';
import { SessionContextMenu } from '../components/SessionContextMenu';
import { SessionRow } from '../components/SessionRow';
import { buttonClass } from '../components/ui/Button';

import { useAttachments } from '../hooks/useAttachments';
import { useChatSessions } from '../hooks/useChatSessions';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useSpeechInput } from '../hooks/useSpeechInput';
import { useStreamingReply } from '../hooks/useStreamingReply';
import { useToast } from '../context/ToastContext';
import { useChatStore } from '../store/useChatStore';
import type { ChatMessage, ChatSession } from '../types';

/**
 * Opening prompts.
 *
 * Written as questions a person would actually arrive with, and grouped by the
 * kind of help each one represents, so the empty state teaches what the
 * assistant is for instead of listing keywords.
 */
const OPENERS: Array<{ kind: string; question: string }> = [
  { kind: 'Translate a section', question: 'What replaced IPC section 302 in the BNS?' },
  { kind: 'Understand a procedure', question: 'How do I file an FIR, and what if the police refuse?' },
  { kind: 'Know your position', question: 'When is an offence bailable, and who decides?' },
  { kind: 'Read a provision', question: 'Explain BNS section 85 in plain language.' },
];

export default function Chat() {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    input,
    setInput,
    isLoading,
    sidebarOpen,
    setSidebarOpen,
    disclaimerAck,
    acceptDisclaimer,
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

  useDocumentTitle(`${chatTitle} · NyayaAI`);

  const { streamAssistantReply, buildHistory, handleRegenerate } = useStreamingReply(
    messages,
    setMessages,
  );

  const { isRecording, recordingNotSupported, toggleRecording, speechBaseRef, finalTranscriptRef } =
    useSpeechInput(input, (value) => setInput(typeof value === 'function' ? value(input) : value));

  const {
    attachments,
    setAttachments,
    fileInputRef,
    handleAttachClick,
    handleFilesSelected,
    removeAttachment,
  } = useAttachments();

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composerFilledRef = useRef(false);

  /* A question handed over from another page (?q=…) is placed in the composer
     rather than sent, so the user stays in control of what gets asked. */
  useEffect(() => {
    const handoff = searchParams.get('q');
    if (!handoff || composerFilledRef.current) return;
    composerFilledRef.current = true;
    setInput(handoff);
    setSearchParams({}, { replace: true });
    textareaRef.current?.focus();
  }, [searchParams, setInput, setSearchParams]);

  useEffect(() => {
    persistSessions(isLoading);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, chatSessions, isLoading]);

  /* Grow the composer with its content, up to the max height set in CSS. */
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 144)}px`;
  }, [input]);

  const shareSession = async (id: number | string) => {
    setMenu(null);
    const active = chatSessions.find((s) => s.active);
    const msgs = active && active.id === id ? messages : sessionMessagesRef.current[id] || [];
    const transcript = msgs
      .filter((m) => !m.welcome && m.content && m.content.trim())
      .map((m) => `${m.role === 'user' ? 'You' : 'NyayaAI'}: ${m.content}`)
      .join('\n\n');

    if (!transcript) {
      showToast('This conversation is still empty.', 'info');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({ title: 'NyayaAI conversation', text: transcript });
        return;
      }
    } catch {
      /* cancelled — fall through to clipboard */
    }

    try {
      await navigator.clipboard.writeText(transcript);
      showToast('Transcript copied to your clipboard.', 'success');
    } catch {
      showToast('Could not copy the transcript.', 'error');
    }
  };

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    const docs = attachments.filter((a) => a.content);
    const image = attachments.find((a) => a.imageData);
    const ready = attachments.filter((a) => a.content || a.imageData);
    if ((!trimmed && ready.length === 0) || isLoading) return;

    if (attachments.some((a) => a.loading)) {
      showToast('Still reading your attachment — one moment.', 'info');
      return;
    }

    const history = buildHistory(messages);
    const allNames = ready.map((a) => a.name).join(', ');

    const MAX_ATTACH_TEXT_CHARS = 24000;
    const attachmentText = docs.length
      ? docs
          .map((a) => `--- ${a.name} ---\n${a.content}`)
          .join('\n\n')
          .slice(0, MAX_ATTACH_TEXT_CHARS)
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

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: displayContent } as ChatMessage,
    ]);

    if (activeSession && activeSession.title === 'New Conversation') {
      const seed = (trimmed || ready[0]?.name || 'New Conversation').slice(0, 50);
      setChatSessions((prev) =>
        prev.map((s) => (s.id === activeSession.id ? { ...s, title: seed } : s)),
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

  const handleBranch = (messageIndex: number) => {
    const newId = Date.now();
    const branchMessages = messages.slice(0, messageIndex + 1);

    setChatSessions((prev) => {
      const currentActive = prev.find((s) => s.active);
      if (currentActive) sessionMessagesRef.current[currentActive.id] = messages;
      return [
        { id: newId, title: 'Branched conversation', active: true },
        ...prev.map((session) => ({ ...session, active: false })),
      ];
    });

    sessionMessagesRef.current[newId] = branchMessages;
    setMessages(branchMessages);
    setInput('');
    showToast('Continuing in a new conversation.', 'success');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleAskAbout = (selectedText: string) => {
    sendMessage(`About this passage: "${selectedText}"\n\nExplain it further.`);
  };

  const startNewChat = () => {
    handleNewChat();
    setInput('');
    speechBaseRef.current = '';
    finalTranscriptRef.current = '';
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
    [
      renamingId,
      renameValue,
      setRenameValue,
      commitRename,
      cancelRename,
      handleSelectSession,
      openMenu,
    ],
  );

  /* The canned greeting is kept in state (sessions persist it) but never
     rendered: the empty state already says what the assistant is for, and
     showing both put two overlapping introductions on screen. */
  const visibleMessages = messages.filter((m) => !m.welcome);
  const isEmptyThread = visibleMessages.length === 0;
  const exchangeCount = visibleMessages.filter((m) => m.role === 'user').length;
  const lastVisible = visibleMessages[visibleMessages.length - 1];

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-ink">
      <DisclaimerModal ack={disclaimerAck} onAccept={acceptDisclaimer} />
      <SelectionToolbar onAskAbout={handleAskAbout} />

      {/* Scrim for the off-canvas sidebar, below lg only */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close conversations"
            className="scrim z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <ChatSidebar
        handleNewChat={startNewChat}
        recentSessions={recentSessions}
        archivedSessions={archivedSessions}
        renderSessionRow={renderSessionRow}
        showArchived={showArchived}
        setShowArchived={setShowArchived}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ------------------------------------------------------------ Header */}
        <header className="flex h-[var(--nav-h)] shrink-0 items-center gap-3 border-b border-line px-3 md:px-4">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Show conversations"
              aria-controls="chat-sidebar"
              aria-expanded={sidebarOpen}
              className={buttonClass({ variant: 'ghost', size: 'sm', iconOnly: true })}
            >
              <PanelLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="t-ui truncate text-fg">{chatTitle}</h1>
            <p className="t-xs text-fg-subtle">
              {exchangeCount === 0
                ? 'Nothing asked yet'
                : `${exchangeCount} question${exchangeCount > 1 ? 's' : ''} in this thread`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {activeSession && exchangeCount > 0 && (
              <button
                onClick={() => shareSession(activeSession.id)}
                className={buttonClass({ variant: 'ghost', size: 'sm' })}
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Copy transcript</span>
              </button>
            )}
            <button onClick={startNewChat} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </header>

        {/* ------------------------------------------------------------ Thread */}
        <main id="main-content" className="relative min-h-0 flex-1">
          {isEmptyThread ? (
            <div className="h-full overflow-y-auto">
              <div className="mx-auto w-full max-w-[46rem] px-4 py-12 md:py-16">
                <p className="eyebrow">Start here</p>
                <h2 className="t-h2 lum-heading mt-4">What would you like to know?</h2>
                <p className="t-lead mt-3 max-w-lg">
                  Ask in plain language. Answers come back with the provisions they were drawn from,
                  so you can check them.
                </p>

                <ul className="mt-8 overflow-hidden rounded-lg border border-line">
                  {OPENERS.map((opener, index) => (
                    <li key={opener.question} className={index > 0 ? 'border-t border-line' : ''}>
                      {/* Inset focus ring: these rows sit flush against a
                          clipped container, which would crop an offset one. */}
                      <button
                        onClick={() => sendMessage(opener.question)}
                        className="group flex w-full flex-col gap-1 bg-surface px-4 py-3.5 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:-outline-offset-2"
                      >
                        <span className="t-label text-fg-subtle">{opener.kind}</span>
                        <span className="text-[0.9375rem] text-fg-muted group-hover:text-fg">
                          {opener.question}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <p className="t-sm mt-6 text-fg-subtle">
                  You can also attach a document or a photo of a notice and ask about it.
                </p>
              </div>
            </div>
          ) : (
            <Virtuoso
              className="h-full w-full"
              data={visibleMessages}
              initialTopMostItemIndex={visibleMessages.length - 1}
              followOutput="smooth"
              itemContent={(index, message) => {
                const isLast = index === visibleMessages.length - 1;
                const isAnswer = message.role !== 'user';
                /* Extra air above each question, less between a question and
                   its answer: the pair reads as one exchange rather than the
                   thread reading as an evenly spaced list. */
                const spacing = isAnswer ? 'pt-2 pb-3' : index === 0 ? 'pt-6 pb-2' : 'pt-9 pb-2';
                return (
                  <div className={`mx-auto w-full max-w-[46rem] px-4 ${spacing}`}>
                    <ChatBubble
                      key={message.id || `msg-${index}`}
                      message={message}
                      /* The question this answers, for the PDF export header. */
                      question={
                        isAnswer
                          ? [...visibleMessages.slice(0, index)]
                              .reverse()
                              .find((m) => m.role === 'user')?.content
                          : undefined
                      }
                      isStreaming={isLoading && isLast && isAnswer}
                      onRegenerate={isAnswer && isLast && !isLoading ? handleRegenerate : undefined}
                      /* Branching splits the real message list, so map back to
                         the unfiltered index rather than the rendered one. */
                      onBranch={
                        message.role === 'user'
                          ? () => handleBranch(messages.indexOf(message))
                          : undefined
                      }
                    />
                  </div>
                );
              }}
              components={{
                Footer: () => (
                  <div className="mx-auto w-full max-w-[46rem] px-4 pb-8">
                    {isLoading && lastVisible?.role === 'user' && <TypingIndicator />}
                  </div>
                ),
              }}
            />
          )}

          {/* Streamed text is announced once it settles, not token by token. */}
          <p aria-live="polite" aria-atomic="true" className="sr-only">
            {isLoading
              ? 'NyayaAI is preparing an answer.'
              : lastVisible && lastVisible.role !== 'user'
                ? 'Answer ready.'
                : ''}
          </p>
        </main>

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
      </div>

      {menu && (
        <SessionContextMenu
          session={chatSessions.find((s) => s.id === menu.id)!}
          position={menu}
          onClose={() => setMenu(null)}
          onShare={shareSession}
          onRename={startRename}
          onTogglePin={togglePin}
          onToggleArchive={toggleArchive}
          onDelete={(id) => handleDeleteSession(id, isLoading)}
        />
      )}
    </div>
  );
}
