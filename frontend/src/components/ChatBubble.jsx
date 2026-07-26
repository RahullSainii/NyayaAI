import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, FileText, Copy, Check, ThumbsUp, ThumbsDown,
  Share2, RefreshCw, MoreHorizontal, Volume2, VolumeX, GitBranch,
  MessageSquare, Globe, ExternalLink,
} from 'lucide-react';

const isWebSource = (source) =>
  typeof source === 'object' && source.law_type === 'WEB';

const hostFromUrl = (url = '') => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const formatSourceLabel = (source) => {
  if (typeof source === 'string') return source;

  if (isWebSource(source)) {
    // For web results, prefer the page title, falling back to the domain.
    return source.section || hostFromUrl(source.url) || 'Web source';
  }

  const lawType = source.law_type || 'Law';
  const section = source.section || 'Unknown';
  const page = source.page_number ? `, p. ${source.page_number}` : '';

  return `${lawType} Section ${section}${page}`;
};

function formatInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-fg">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-surface-2 text-gold-soft px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

const splitTableRow = (line) => {
  let l = line.trim();
  if (l.startsWith('|')) l = l.slice(1);
  if (l.endsWith('|')) l = l.slice(0, -1);
  return l.split('|').map((c) => c.trim());
};

const isTableRow = (line) => /\|/.test(line);
const isTableSeparator = (line) =>
  /^\s*\|?[\s:|-]*-{2,}[\s:|-]*\|?\s*$/.test(line) && line.includes('-');

function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listType = null;

  const flushList = () => {
    if (listItems.length > 0) {
      const Tag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(<Tag key={`l-${elements.length}`} className={listType === 'ol' ? 'list-decimal pl-5 space-y-1.5 my-3 marker:text-gold marker:font-semibold text-fg' : 'list-disc pl-5 space-y-1.5 my-3 marker:text-gold text-fg'}>{listItems}</Tag>);
      listItems = [];
      listType = null;
    }
  };

  const headingClass = {
    1: 'text-lg font-bold text-fg mt-4 mb-2',
    2: 'text-base font-bold text-fg mt-3 mb-2',
    3: 'text-[13px] font-semibold text-gold-soft uppercase tracking-wide mt-3 mb-1.5',
    4: 'text-sm font-semibold text-fg mt-2 mb-1',
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // --- Table block: header row followed by a |---|---| separator ---
    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushList();
      const headers = splitTableRow(line);
      const rows = [];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]) && !isTableSeparator(lines[j])) {
        rows.push(splitTableRow(lines[j]));
        j++;
      }
      elements.push(
        <div key={`t-${i}`} className="my-3 overflow-x-auto rounded-lg border border-line-2">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-surface-2">
                {headers.map((h, hi) => (
                  <th key={hi} className="text-left font-semibold text-gold-soft px-3 py-2 border-b border-line-2">
                    {formatInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line/40 last:border-0">
                  {r.map((c, ci) => (
                    <td key={ci} className="px-3 py-2 text-fg align-top">{formatInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j - 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)/);
    const numberedMatch = line.match(/^\s*\d+\.\s+(.+)/);

    if (headingMatch) {
      flushList();
      const level = Math.min(headingMatch[1].length, 4);
      const Tag = `h${Math.min(headingMatch[1].length, 6)}`;
      elements.push(
        <Tag key={`h-${i}`} className={headingClass[level] || headingClass[4]}>
          {formatInline(headingMatch[2])}
        </Tag>
      );
    } else if (bulletMatch) {
      if (listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(<li key={i}>{formatInline(bulletMatch[1])}</li>);
    } else if (numberedMatch) {
      if (listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(<li key={i}>{formatInline(numberedMatch[1])}</li>);
    } else {
      flushList();
      if (line.trim() === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        elements.push(<p key={i} className="mb-1.5 text-fg leading-[1.65]">{formatInline(line)}</p>);
      }
    }
  }
  flushList();
  return elements;
}

/* Strip markdown so copy / share / read-aloud get clean text */
const toPlainText = (text = '') =>
  text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');

function TextSelectionToolbar({ onAskAbout }) {
  const [selection, setSelection] = useState(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [copiedSel, setCopiedSel] = useState(false);
  const toolbarRef = useRef(null);

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

      setPosition({
        top: rect.top - 52,
        left: rect.left + rect.width / 2,
      });

      setSelection(text);
    };

    const handleMouseDown = (e) => {
      if (toolbarRef.current && toolbarRef.current.contains(e.target)) return;
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
    } catch {
      const ta = document.createElement('textarea');
      ta.value = selection;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedSel(true);
    setTimeout(() => setCopiedSel(false), 1500);
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
        className="relative flex items-center gap-0.5 bg-surface-2/95 border border-line-2 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-2xl p-1.5"
      >
        {/* Arrow pointer */}
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-surface-2/95 border-r border-b border-line-2" />

        <button
          type="button"
          onClick={handleAsk}
          className="relative flex items-center gap-2 px-3.5 py-2 text-[13px] font-semibold text-ink bg-gradient-to-b from-gold-bright via-gold to-[#b88d3e] hover:from-gold hover:via-[#c99433] hover:to-[#a67c2a] rounded-xl transition-all whitespace-nowrap shadow-[0_2px_8px_rgba(212,166,78,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-95"
        >
          <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
          Ask NyayaAI
        </button>

        <div className="w-px h-5 bg-line-2 mx-0.5" />

        <button
          type="button"
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-xl transition-all whitespace-nowrap active:scale-95 ${
            copiedSel
              ? 'text-emerald-400 bg-emerald-400/10 shadow-[0_0_12px_rgba(52,211,153,0.15)]'
              : 'text-fg-muted hover:text-fg hover:bg-white/5'
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

function ActionButton({ label, onClick, active, activeClass = 'text-gold', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-1.5 rounded-lg transition-colors hover:bg-surface-2 ${
        active ? activeClass : 'text-fg-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

function MessageActions({ message, onRegenerate, onBranch }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const menuRef = useRef(null);

  // Close the "..." menu on outside click
  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Stop speech if this message unmounts
  useEffect(() => () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const plainText = toPlainText(message.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = plainText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    if (!synth) return;
    setMenuOpen(false);

    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'en-IN';
    utterance.rate = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  };

  return (
    <div className="flex items-center gap-0.5 mt-3 pt-2 border-t border-line/40 relative">
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

      {/* Speaking indicator button (always visible while reading) */}
      {speaking && (
        <ActionButton label="Stop reading" onClick={handleReadAloud} active activeClass="text-gold">
          <VolumeX className="w-3.5 h-3.5" />
        </ActionButton>
      )}

      {/* "..." menu — Branch in new chat / Read aloud */}
      <div className="relative" ref={menuRef}>
        <ActionButton label="More actions" onClick={() => setMenuOpen((o) => !o)} active={menuOpen}>
          <MoreHorizontal className="w-3.5 h-3.5" />
        </ActionButton>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 z-30 min-w-[190px] rounded-xl border border-line bg-surface shadow-xl backdrop-blur-xl overflow-hidden"
            >
              {onBranch && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onBranch(); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors text-left"
                >
                  <GitBranch className="w-4 h-4" />
                  Branch in new chat
                </button>
              )}
              <button
                type="button"
                onClick={handleReadAloud}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors text-left"
              >
                {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {speaking ? 'Stop reading' : 'Read aloud'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {message.sources && message.sources.length > 0 && (
        <span className="ml-1.5 text-xs text-fg-faint flex items-center gap-1">
          <FileText className="w-3 h-3" /> {message.sources.length} source{message.sources.length > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

export default function ChatBubble({ message, isStreaming = false, onRegenerate, onBranch, onAskAbout }) {
  const isUser = message.role === 'user';
  const showActions = !isUser && !isStreaming && message.content && message.content.trim().length > 0;
  const [expandedSource, setExpandedSource] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[85%] md:max-w-[78%] ${
          isUser
            ? 'bg-gradient-to-br from-surface-2 to-surface border border-gold-line/60 rounded-2xl rounded-br-sm px-5 py-3.5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]'
            : 'bg-gradient-to-br from-surface to-ink-3 border border-line-2 rounded-2xl rounded-bl-sm px-5 py-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.03)] relative overflow-hidden'
        }`}
      >
        {!isUser && (
          <>
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-gold via-gold-soft to-transparent opacity-90" />
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gold/10 border border-gold-line/50">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
              </div>
              <span className="text-gold text-[11px] font-semibold tracking-[0.15em] uppercase">
                NyayaAI
              </span>
              {message.sourceType === 'web' && (
                <span
                  title="Answered from general web sources, not the verified statute database"
                  className="flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30"
                >
                  <Globe className="w-3 h-3" /> Web
                </span>
              )}
            </div>
          </>
        )}

        <div className={`text-sm ${!isUser ? 'relative chat-bubble-content' : ''}`}>
          {isUser ? (
            <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              {renderMarkdown(message.content)}
              {!isStreaming && onAskAbout && (
                <TextSelectionToolbar onAskAbout={onAskAbout} />
              )}
            </>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-line/50">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-faint mb-2 flex items-center gap-1.5">
              {message.sourceType === 'web' ? (
                <><Globe className="w-3 h-3" /> Web sources</>
              ) : (
                <><FileText className="w-3 h-3" /> Legal sources</>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, i) => {
                const web = isWebSource(source);

                if (web) {
                  // Web results open the original page in a new tab.
                  return (
                    <motion.a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={source.text_snippet || source.url}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="group flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border bg-sky-500/5 text-sky-300 border-sky-500/25 hover:bg-sky-500/10 hover:border-sky-400/40 transition-colors max-w-[16rem]"
                    >
                      <Globe className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      <span className="font-medium truncate">{formatSourceLabel(source)}</span>
                      <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-90 shrink-0" />
                    </motion.a>
                  );
                }

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSource(expandedSource === i ? null : i)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                        expandedSource === i
                          ? 'bg-gold/10 border-gold/30 text-gold'
                          : 'bg-surface-2 text-muted-blue border-border/50 hover:border-gold/30 hover:bg-gold/5'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 opacity-70" />
                      <span className="font-medium">{formatSourceLabel(source)}</span>
                    </button>
                    <AnimatePresence>
                      {expandedSource === i && source.text_snippet && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full left-0 mb-2 z-30 w-72 p-3 rounded-xl border border-line bg-surface shadow-xl backdrop-blur-xl text-left"
                        >
                          <p className="text-xs text-fg-muted leading-relaxed">{source.text_snippet}</p>
                          <div className="mt-2 flex items-center gap-1.5 text-fg-faint">
                            <FileText className="w-3 h-3" />
                            <span className="text-[10px]">Page {source.page_number || 'N/A'}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {showActions && (
          <MessageActions message={message} onRegenerate={onRegenerate} onBranch={onBranch} />
        )}
      </div>
    </motion.div>
  );
}
