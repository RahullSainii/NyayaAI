import React, { useEffect, useRef, useState, useMemo, ReactNode, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Copy, Check, ThumbsUp, ThumbsDown,
  Share2, RefreshCw, Volume2, VolumeX, GitBranch,
  MessageSquare, Globe, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import logo from '../assets/nyaya.jpeg';
import { ChatMessage, ChatSource } from '../types';

const isWebSource = (source: string | ChatSource): boolean =>
  typeof source === 'object' && source !== null && source.law_type === 'WEB';

const hostFromUrl = (url = ''): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const formatSourceLabel = (source: string | ChatSource): string => {
  if (typeof source === 'string') return source;
  if (!source) return 'Unknown source';

  if (isWebSource(source)) {
    // For web results, prefer the page title, falling back to the domain.
    return source.section || hostFromUrl(source.url) || 'Web source';
  }

  const lawType = source.law_type || 'Law';
  const section = source.section || 'Unknown';
  const page = source.page_number ? `, p. ${source.page_number}` : '';

  return `${lawType} Section ${section}${page}`;
};

const SOURCE_BADGES: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
  web: { icon: Globe, label: 'Web', cls: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  document: { icon: FileText, label: 'Document', cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  image: { icon: ImageIcon, label: 'Image', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
};

function SourceBadge({ sourceType }: { sourceType?: string }) {
  if (!sourceType) return null;
  const badge = SOURCE_BADGES[sourceType];
  if (!badge) return null;
  const Icon = badge.icon;
  return (
    <span
      title={`Answer based on: ${badge.label}`}
      className={`flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full border ${badge.cls}`}
    >
      <Icon className="w-3 h-3" />
      {badge.label}
    </span>
  );
}

/* Strip markdown so copy / share / read-aloud get clean, natural text */
const toPlainText = (text = ''): string =>
  text
    .replace(/^#{1,6}\s+/gm, '')            // headings
    .replace(/^\s*[-*]\s+/gm, '')            // bullet markers
    .replace(/^\s*\d+\.\s+/gm, '')           // numbered list markers
    .replace(/\|/g, ' ')                     // table pipes
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')   // code
    .replace(/\*\*([^*]+)\*\*/g, '$1')       // bold
    .replace(/\[(\d+)\]/g, '')               // [1] citation refs
    .replace(/\n{2,}/g, '. ')                // paragraph breaks -> pause
    .replace(/[ \t]+/g, ' ')
    .trim();

function TextSelectionToolbar({ onAskAbout }: { onAskAbout?: (text: string) => void }) {
  const [selection, setSelection] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [copiedSel, setCopiedSel] = useState<boolean>(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 3) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Prefer showing above the selection; if there's no room, show below.
      const above = rect.top - 52;
      const top = above < 8 ? rect.bottom + 12 : above;
      const left = Math.min(
        Math.max(rect.left + rect.width / 2, 90),
        window.innerWidth - 90,
      );

      setPosition({ top, left });
      setSelection(text);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && toolbarRef.current.contains(e.target as Node)) return;
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const handleCopy = async () => {
    if (!selection) return;
    try {
      await navigator.clipboard.writeText(selection);
      setCopiedSel(true);
      setTimeout(() => setCopiedSel(false), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleAsk = () => {
    if (!selection || !onAskAbout) return;
    onAskAbout(selection);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  if (!selection) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-[9999] pointer-events-auto"
      style={{ top: `${position.top}px`, left: `${position.left}px`, transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.92 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center gap-0.5 glass-panel rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] p-1.5"
      >
        {/* Arrow pointer */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-slate-800 border-r border-b border-glass-border" />

        <button
          type="button"
          onClick={handleAsk}
          className="relative flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-on-secondary bg-secondary hover:bg-secondary-container rounded-xl transition-all whitespace-nowrap shadow-[0_2px_8px_rgba(255,202,69,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-95"
        >
          <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
          Ask NyayaAI
        </button>

        <div className="w-px h-5 bg-glass-border mx-0.5" />

        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-xl transition-all whitespace-nowrap active:scale-95 ${
            copiedSel
              ? 'text-emerald-400 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5'
          }`}
        >
          {copiedSel ? (
            <Check className="w-4 h-4" strokeWidth={2.5} />
          ) : (
            <Copy className="w-4 h-4" strokeWidth={2} />
          )}
          {copiedSel ? 'Copied!' : 'Copy'}
        </button>
      </motion.div>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  active?: boolean;
  activeClass?: string;
  children: ReactNode;
}

function ActionButton({ label, onClick, active, activeClass = 'text-secondary', children }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-lg transition-colors hover:bg-white/5 ${
        active ? activeClass : 'text-on-surface-variant hover:text-on-surface'
      }`}
    >
      {children}
    </button>
  );
}

interface MessageActionsProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onBranch?: () => void;
}

function MessageActions({ message, onRegenerate, onBranch }: MessageActionsProps) {
  const [copied, setCopied] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [speaking, setSpeaking] = useState<boolean>(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  // Stop speech if this message unmounts
  useEffect(() => () => {
    stopKeepAlive();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const plainText = useMemo(() => toPlainText(message.content), [message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NyayaAI Answer', text: plainText });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    handleCopy();
  };

  const handleReadAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth) {
      alert('Text-to-speech is not supported in this browser.');
      return;
    }

    // Toggle off if it's already reading.
    if (speaking || synth.speaking) {
      stopKeepAlive();
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const text = plainText;
    if (!text) return;

    synth.cancel(); // clear anything stuck in the queue

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1;
    utterance.pitch = 1;

    // Prefer an English voice if the list is populated (loads async in Chrome).
    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /en[-_]IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => { stopKeepAlive(); setSpeaking(false); };
    utterance.onerror = () => { stopKeepAlive(); setSpeaking(false); };

    setSpeaking(true);
    // Chrome pauses long utterances after ~15s; nudge it to keep going.
    stopKeepAlive();
    keepAliveRef.current = setInterval(() => {
      if (!synth.speaking) { stopKeepAlive(); return; }
      synth.pause();
      synth.resume();
    }, 9000);

    // A tiny delay after cancel() improves reliability in Chrome.
    setTimeout(() => synth.speak(utterance), 60);
  };

  return (
    <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-glass-border relative">
      <ActionButton label={copied ? 'Copied!' : 'Copy'} onClick={handleCopy} active={copied} activeClass="text-emerald-400">
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </ActionButton>

      <ActionButton
        label="Good response"
        onClick={() => setFeedback((f) => (f === 'up' ? null : 'up'))}
        active={feedback === 'up'}
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </ActionButton>

      <ActionButton
        label="Bad response"
        onClick={() => setFeedback((f) => (f === 'down' ? null : 'down'))}
        active={feedback === 'down'}
        activeClass="text-red-400"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </ActionButton>

      <ActionButton label="Share" onClick={handleShare}>
        <Share2 className="w-3.5 h-3.5" />
      </ActionButton>

      {onRegenerate && (
        <ActionButton label="Regenerate" onClick={onRegenerate}>
          <RefreshCw className="w-3.5 h-3.5" />
        </ActionButton>
      )}

      <ActionButton
        label={speaking ? 'Stop reading' : 'Read aloud'}
        onClick={handleReadAloud}
        active={speaking}
        activeClass="text-secondary"
      >
        {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </ActionButton>

      {onBranch && (
        <ActionButton label="Branch in new chat" onClick={onBranch}>
          <GitBranch className="w-3.5 h-3.5" />
        </ActionButton>
      )}

      {message.sources && message.sources.length > 0 && (
        <span className="ml-1.5 text-xs text-on-surface-variant/60 flex items-center gap-1">
          <FileText className="w-3 h-3" /> {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export interface ChatBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onBranch?: () => void;
  onAskAbout?: (text: string) => void;
}

const MarkdownComponents: Components = {
  h1: ({node, ...props}: any) => <h1 className="text-lg font-bold text-on-surface mt-4 mb-2" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="text-base font-bold text-on-surface mt-3 mb-2" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-[13px] font-semibold text-secondary uppercase tracking-wide mt-3 mb-1.5" {...props} />,
  h4: ({node, ...props}: any) => <h4 className="text-sm font-semibold text-on-surface mt-2 mb-1" {...props} />,
  h5: ({node, ...props}: any) => <h5 className="text-sm font-semibold text-on-surface mt-2 mb-1" {...props} />,
  h6: ({node, ...props}: any) => <h6 className="text-sm font-semibold text-on-surface mt-2 mb-1" {...props} />,
  p: ({node, ...props}: any) => <p className="mb-1.5 text-on-surface-variant leading-[1.65]" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-5 space-y-1.5 my-3 marker:text-secondary text-on-surface-variant" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 space-y-1.5 my-3 marker:text-secondary marker:font-semibold text-on-surface-variant" {...props} />,
  li: ({node, ...props}: any) => <li {...props} />,
  strong: ({node, ...props}: any) => <strong className="font-semibold text-on-surface" {...props} />,
  em: ({node, ...props}: any) => <em className="italic" {...props} />,
  code: ({node, className, children, ...props}: any) => {
    const isInline = !String(children).includes('\n') && !className;
    return isInline ? (
      <code className="bg-slate-800 text-secondary px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
    ) : (
      <code className={`block bg-slate-800 p-3 rounded-lg overflow-x-auto text-sm my-3 font-mono text-secondary ${className || ''}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({node, ...props}: any) => <pre className="my-3 overflow-x-auto rounded-lg" {...props} />,
  table: ({node, ...props}: any) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-glass-border">
      <table className="w-full text-xs border-collapse" {...props} />
    </div>
  ),
  thead: ({node, ...props}: any) => <thead className="bg-slate-800" {...props} />,
  th: ({node, ...props}: any) => <th className="text-left font-semibold text-secondary px-3 py-2 border-b border-glass-border" {...props} />,
  tbody: ({node, ...props}: any) => <tbody {...props} />,
  tr: ({node, ...props}: any) => <tr className="border-b border-glass-border/40 last:border-0" {...props} />,
  td: ({node, ...props}: any) => <td className="px-3 py-2 text-on-surface align-top" {...props} />,
  a: ({node, ...props}: any) => <a className="text-sky-400 underline hover:text-sky-300" target="_blank" rel="noopener noreferrer" {...props} />
};

const ChatBubble = memo(function ChatBubble({
  message,
  isStreaming = false,
  onRegenerate,
  onBranch,
  onAskAbout
}: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const showActions = !isUser && !isStreaming && !!message.content && message.content.trim().length > 0;
  const [expandedSource, setExpandedSource] = useState<number | null>(null);

  if (isUser) {
    return (
      <div className="self-end max-w-[85%] ml-auto mb-4">
        <div className="bg-slate-800 rounded-lg p-5 rounded-tr-none text-on-surface">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="self-start w-full mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-glass-border flex items-center justify-center shrink-0">
          <img src={logo} alt="NyayaAI" className="w-full h-full object-cover" />
        </div>
        <span className="font-label-caps text-label-caps text-secondary">NyayaAI Analysis</span>
        <SourceBadge sourceType={message.sourceType} />
      </div>
      <div className="glass-panel rounded-lg p-6 border-l-4 border-l-secondary ai-think-glow text-on-surface-variant">
        <div className="text-sm chat-bubble-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={MarkdownComponents}
          >
            {message.content}
          </ReactMarkdown>
          {!isStreaming && onAskAbout && (
            <TextSelectionToolbar onAskAbout={onAskAbout} />
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-glass-border">
            {message.sources.map((source: string | ChatSource, i: number) => {
              if (isWebSource(source)) {
                const webSource = source as ChatSource;
                return (
                  <a
                    key={i}
                    href={webSource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={webSource.text_snippet || webSource.url}
                    className="px-3 py-1 rounded-full bg-slate-800 text-on-surface-variant font-citation text-citation cursor-pointer hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{formatSourceLabel(source)}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                );
              }

              const docSource = typeof source === 'object' && source !== null ? (source as ChatSource) : null;

              return (
                <div key={i} className="relative">
                  <button
                    type="button"
                    onClick={() => setExpandedSource(expandedSource === i ? null : i)}
                    className={`px-3 py-1 rounded-full font-citation text-citation cursor-pointer transition-colors flex items-center gap-1.5 ${
                      expandedSource === i
                        ? 'bg-gold-light text-on-secondary-container hover:bg-secondary'
                        : 'bg-slate-800 text-on-surface-variant hover:bg-slate-700'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>{formatSourceLabel(source)}</span>
                  </button>
                  <AnimatePresence>
                    {expandedSource === i && docSource?.text_snippet && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 mb-2 z-30 w-72 p-3 rounded-xl border border-glass-border bg-slate-800 shadow-xl backdrop-blur-xl text-left"
                      >
                        <p className="text-xs text-on-surface-variant leading-relaxed">{docSource.text_snippet}</p>
                        <div className="mt-2 flex items-center gap-1.5 text-on-surface-variant/70">
                          <FileText className="w-3 h-3" />
                          <span className="text-[10px]">Page {docSource.page_number || 'N/A'}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {showActions && (
          <div className="mt-2">
             <MessageActions message={message} onRegenerate={onRegenerate} onBranch={onBranch} />
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatBubble;
