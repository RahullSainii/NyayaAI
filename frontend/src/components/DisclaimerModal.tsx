import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrandMark } from './ui/BrandMark';

export interface DisclaimerModalProps {
  ack: boolean;
  onAccept: () => void;
}

/**
 * Shown once, before the first question.
 *
 * Deliberately plain: three short statements and one button. A legal disclaimer
 * that looks like a marketing panel is easy to dismiss without reading.
 */
export default function DisclaimerModal({ ack, onAccept }: DisclaimerModalProps) {
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (ack) {
      previousFocusRef.current?.focus();
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement;
    const focusTimer = setTimeout(() => acceptBtnRef.current?.focus(), 80);

    /* One focusable element, so Tab simply stays on it. */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        event.preventDefault();
        acceptBtnRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ack]);

  return (
    <AnimatePresence>
      {!ack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="scrim z-[10000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
          aria-describedby="disclaimer-body"
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
            className="overlay-panel w-full max-w-md p-6"
          >
            <BrandMark size="md" />

            <h2 id="disclaimer-title" className="t-h3 mt-4 text-fg">
              Before you begin
            </h2>

            <ul id="disclaimer-body" className="mt-4">
              {[
                'NyayaAI gives general information about Indian law for understanding. It is not a lawyer and this is not legal advice.',
                'Using it creates no lawyer–client relationship, and nothing you type here is privileged.',
                'Answers can be incomplete or wrong. Check them against the provisions cited, and consult an advocate about your own situation.',
              ].map((line) => (
                <li
                  key={line}
                  className="border-t border-line py-3 text-[0.8125rem] leading-relaxed text-fg-muted"
                >
                  {line}
                </li>
              ))}
            </ul>

            <button
              ref={acceptBtnRef}
              type="button"
              onClick={onAccept}
              className="btn btn-primary btn-lg mt-6 w-full"
            >
              I understand
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
