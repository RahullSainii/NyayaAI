import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, MessageSquare } from 'lucide-react';

const MIN_SELECTION_LENGTH = 3;
const TOOLBAR_HALF_WIDTH = 104;

/**
 * Follow-up affordance for text selected inside an answer.
 *
 * Mounted once per page. The previous implementation lived inside ChatBubble, so
 * every answer in the thread registered its own `mouseup` listener on
 * `document` and rendered its own copy of the toolbar — cost that grew with the
 * length of the conversation.
 */
export default function SelectionToolbar({ onAskAbout }: { onAskAbout?: (text: string) => void }) {
  const [selection, setSelection] = useState<string | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number>(0);

  const dismiss = useCallback(() => {
    setSelection(null);
    setCopied(false);
  }, []);

  useEffect(() => {
    const handleSelectionEnd = (event: MouseEvent | KeyboardEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) return;

      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';

      if (!sel || sel.isCollapsed || text.length < MIN_SELECTION_LENGTH) {
        dismiss();
        return;
      }

      /* Only offer the action for text inside an answer, not the whole page. */
      const anchor = sel.anchorNode;
      const element = anchor instanceof Element ? anchor : anchor?.parentElement;
      if (!element?.closest('[data-answer]')) {
        dismiss();
        return;
      }

      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const above = rect.top - 50;

      setPosition({
        top: above < 8 ? rect.bottom + 10 : above,
        left: Math.min(
          Math.max(rect.left + rect.width / 2, TOOLBAR_HALF_WIDTH + 8),
          window.innerWidth - TOOLBAR_HALF_WIDTH - 8,
        ),
      });
      setSelection(text);
      setCopied(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };

    document.addEventListener('mouseup', handleSelectionEnd);
    document.addEventListener('keyup', handleSelectionEnd);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', dismiss, true);

    return () => {
      document.removeEventListener('mouseup', handleSelectionEnd);
      document.removeEventListener('keyup', handleSelectionEnd);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', dismiss, true);
      window.clearTimeout(copyTimerRef.current);
    };
  }, [dismiss]);

  const handleCopy = async () => {
    if (!selection) return;
    try {
      await navigator.clipboard.writeText(selection);
      setCopied(true);
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(dismiss, 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  const handleAsk = () => {
    if (!selection || !onAskAbout) return;
    onAskAbout(selection);
    window.getSelection()?.removeAllRanges();
    dismiss();
  };

  return (
    <AnimatePresence>
      {selection && (
        <motion.div
          ref={toolbarRef}
          initial={{ opacity: 0, y: 4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.13, ease: [0.25, 1, 0.5, 1] }}
          style={{ top: position.top, left: position.left }}
          className="overlay-panel fixed z-[9999] flex -translate-x-1/2 items-center gap-1 p-1"
        >
          {onAskAbout && (
            <button onClick={handleAsk} className="btn btn-primary btn-sm">
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              Ask about this
            </button>
          )}
          <button onClick={handleCopy} className="btn btn-ghost btn-sm">
            {copied ? (
              <Check className="h-3.5 w-3.5 text-affirm" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
