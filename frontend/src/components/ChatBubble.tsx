import React, { memo, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  Image as ImageIcon,
  RefreshCw,
  Share2,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
} from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { ChatMessage, ChatSource } from '../types';
import { BrandMark } from './ui/BrandMark';
import { exportAnswerToPdf } from '../lib/exportAnswer';
import { toPlainText, toSpokenText } from '../lib/text';

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
    return source.section || hostFromUrl(source.url) || 'Web source';
  }

  const lawType = source.law_type || 'Law';
  const section = source.section || 'Unknown';
  const page = source.page_number ? `, p. ${source.page_number}` : '';

  return `${lawType} Section ${section}${page}`;
};

const SOURCE_BADGES: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
  web: { icon: Globe, label: 'Web', cls: 'badge-neutral' },
  document: { icon: FileText, label: 'Your document', cls: 'badge-neutral' },
  image: { icon: ImageIcon, label: 'Your image', cls: 'badge-neutral' },
};

/** Says where the answer was grounded, when that is not the statute corpus. */
function SourceBadge({ sourceType }: { sourceType?: string }) {
  if (!sourceType) return null;
  const badge = SOURCE_BADGES[sourceType];
  if (!badge) return null;
  const Icon = badge.icon;

  return (
    <span className={`badge ${badge.cls}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {badge.label}
    </span>
  );
}

/* Markdown stripping lives in lib/text so copy, share, speech and PDF agree. */

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  active?: boolean;
  activeClass?: string;
  pressed?: boolean;
  children: ReactNode;
}

function ActionButton({ label, onClick, active, activeClass = 'text-gold', pressed, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={`grid h-7 w-7 place-items-center rounded-md transition-colors duration-150 hover:bg-surface-2 ${
        active ? activeClass : 'text-fg-subtle hover:text-fg-muted'
      }`}
    >
      {children}
    </button>
  );
}

interface MessageActionsProps {
  message: ChatMessage;
  /** The question this answers, used for the PDF header. */
  question?: string;
  onRegenerate?: () => void;
  onBranch?: () => void;
}

function MessageActions({ message, question, onRegenerate, onBranch }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [saving, setSaving] = useState(false);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  useEffect(
    () => () => {
      stopKeepAlive();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  const plainText = useMemo(() => toPlainText(message.content), [message.content]);
  const spokenText = useMemo(() => toSpokenText(message.content), [message.content]);

  const handleSavePdf = async () => {
    setSaving(true);
    try {
      await exportAnswerToPdf({
        question: question || 'Question not recorded',
        answer: message.content,
        sources: message.sources,
      });
    } catch (err) {
      console.error('Could not build the PDF:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'NyayaAI answer', text: plainText });
        return;
      } catch {
        /* cancelled — fall through to clipboard */
      }
    }
    handleCopy();
  };

  const handleReadAloud = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (speaking || synth.speaking) {
      stopKeepAlive();
      synth.cancel();
      setSpeaking(false);
      return;
    }

    if (!spokenText) return;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.lang = 'en-IN';

    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => /en[-_]IN/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      stopKeepAlive();
      setSpeaking(false);
    };
    utterance.onerror = () => {
      stopKeepAlive();
      setSpeaking(false);
    };

    setSpeaking(true);
    /* Chrome stalls long utterances; nudge it periodically. */
    stopKeepAlive();
    keepAliveRef.current = setInterval(() => {
      if (!synth.speaking) {
        stopKeepAlive();
        return;
      }
      synth.pause();
      synth.resume();
    }, 9000);

    setTimeout(() => synth.speak(utterance), 60);
  };

  return (
    <div className="mt-3 flex items-center gap-0.5 border-t border-line pt-2">
      <ActionButton
        label={copied ? 'Copied' : 'Copy answer'}
        onClick={handleCopy}
        active={copied}
        activeClass="text-affirm"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </ActionButton>

      <ActionButton
        label="Helpful"
        onClick={() => setFeedback((f) => (f === 'up' ? null : 'up'))}
        active={feedback === 'up'}
        activeClass="text-affirm"
        pressed={feedback === 'up'}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </ActionButton>

      <ActionButton
        label="Not helpful"
        onClick={() => setFeedback((f) => (f === 'down' ? null : 'down'))}
        active={feedback === 'down'}
        activeClass="text-danger"
        pressed={feedback === 'down'}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </ActionButton>

      <ActionButton label="Share answer" onClick={handleShare}>
        <Share2 className="h-3.5 w-3.5" />
      </ActionButton>

      <ActionButton
        label={saving ? 'Building PDF…' : 'Save as PDF, with citations'}
        onClick={handleSavePdf}
        active={saving}
      >
        <Download className="h-3.5 w-3.5" />
      </ActionButton>

      {onRegenerate && (
        <ActionButton label="Ask again" onClick={onRegenerate}>
          <RefreshCw className="h-3.5 w-3.5" />
        </ActionButton>
      )}

      <ActionButton
        label={speaking ? 'Stop reading' : 'Read aloud'}
        onClick={handleReadAloud}
        active={speaking}
        pressed={speaking}
      >
        {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </ActionButton>

      {onBranch && (
        <ActionButton label="Continue in a new conversation" onClick={onBranch}>
          <GitBranch className="h-3.5 w-3.5" />
        </ActionButton>
      )}
    </div>
  );
}

export interface ChatBubbleProps {
  message: ChatMessage;
  /** The preceding question, carried through so an export can name it. */
  question?: string;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onBranch?: () => void;
}

/**
 * Markdown mapping for answers. Statute headings pick up the label treatment so
 * a long reply scans like a structured note rather than a wall of prose.
 */
const MarkdownComponents: Components = {
  h1: ({ node, ...props }: any) => <h2 className="t-h3 text-fg" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="t-h3 text-fg" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="t-label lum-label text-gold" {...props} />,
  h4: ({ node, ...props }: any) => <h4 className="t-ui text-fg" {...props} />,
  h5: ({ node, ...props }: any) => <h5 className="t-ui text-fg" {...props} />,
  h6: ({ node, ...props }: any) => <h6 className="t-ui text-fg" {...props} />,
  hr: () => <hr className="divider my-4" />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="statute text-fg-subtle italic" {...props} />
  ),
  code: ({ node, className, children, ...props }: any) => {
    const isInline = !String(children).includes('\n') && !className;
    return isInline ? (
      <code
        className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.8125rem] text-gold-soft"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code
        className={`block overflow-x-auto rounded-md bg-ink p-3 font-mono text-[0.8125rem] text-fg-muted ring-1 ring-inset ring-line ${className || ''}`}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ node, ...props }: any) => <pre className="overflow-x-auto" {...props} />,
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="w-full border-collapse text-[0.8125rem]" {...props} />
    </div>
  ),
  thead: ({ node, ...props }: any) => <thead className="bg-surface-2" {...props} />,
  th: ({ node, ...props }: any) => (
    <th
      className="t-label border-b border-line px-3 py-2 text-left text-fg-subtle"
      {...props}
    />
  ),
  tr: ({ node, ...props }: any) => <tr className="border-b border-line last:border-0" {...props} />,
  td: ({ node, ...props }: any) => <td className="px-3 py-2 align-top text-fg-muted" {...props} />,
};

/** Citation chip with an expandable snippet of the retrieved passage. */
function Citation({ source, index }: { source: string | ChatSource; index: number }) {
  const [open, setOpen] = useState(false);

  if (isWebSource(source)) {
    const webSource = source as ChatSource;
    return (
      <a
        href={webSource.url}
        target="_blank"
        rel="noopener noreferrer"
        title={webSource.text_snippet || webSource.url}
        className="chip"
      >
        <Globe className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="max-w-[11rem] truncate">{formatSourceLabel(source)}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
      </a>
    );
  }

  const docSource = typeof source === 'object' && source !== null ? (source as ChatSource) : null;
  const snippet = docSource?.text_snippet;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => snippet && setOpen((v) => !v)}
        aria-expanded={snippet ? open : undefined}
        disabled={!snippet}
        className={`chip font-mono ${open ? 'chip-active' : ''} ${snippet ? '' : 'cursor-default'}`}
      >
        <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
        {formatSourceLabel(source)}
      </button>

      <AnimatePresence>
        {open && snippet && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className="overlay-panel absolute bottom-full left-0 z-30 mb-2 w-[19rem] max-w-[calc(100vw-3rem)] p-3"
          >
            <p className="t-label mb-1.5 text-fg-subtle">Retrieved passage {index + 1}</p>
            <p className="text-[0.8125rem] leading-relaxed text-fg-muted">{snippet}</p>
            {docSource?.page_number && (
              <p className="t-mono mt-2 text-fg-subtle">page {docSource.page_number}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ChatBubble = memo(function ChatBubble({
  message,
  question,
  isStreaming = false,
  onRegenerate,
  onBranch,
}: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const hasContent = Boolean(message.content && message.content.trim().length > 0);
  const showActions = !isUser && !isStreaming && hasContent;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg bg-surface-2 px-4 py-2.5 ring-1 ring-inset ring-line">
          <p className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-fg">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <BrandMark size="sm" />
        <span className="t-label text-fg-subtle">NyayaAI</span>
        <SourceBadge sourceType={message.sourceType} />
      </div>

      <div className="statute" data-answer>
        <div className={`prose-answer ${isStreaming && !hasContent ? 'stream-caret' : ''}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={MarkdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="mt-4">
            <p className="t-label mb-2 text-fg-subtle">
              {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.map((source, i) => (
                <Citation key={i} source={source} index={i} />
              ))}
            </div>
          </div>
        )}

        {showActions && (
          <MessageActions
            message={message}
            question={question}
            onRegenerate={onRegenerate}
            onBranch={onBranch}
          />
        )}
      </div>
    </div>
  );
});

export default ChatBubble;
