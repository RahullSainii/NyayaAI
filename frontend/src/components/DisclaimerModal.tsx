import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export interface DisclaimerModalProps {
  ack: boolean;
  onAccept: () => void;
}

/**
 * Legal disclaimer modal shown before the user's first chat interaction.
 * Implements proper dialog accessibility: role, aria-modal, focus management.
 */
export default function DisclaimerModal({ ack, onAccept }: DisclaimerModalProps) {
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ack) {
      // Save the currently focused element to restore later
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the accept button after animation completes
      const timer = setTimeout(() => {
        acceptBtnRef.current?.focus();
      }, 100);

      // Trap focus within the modal
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          // Only one focusable element, keep focus on it
          e.preventDefault();
          acceptBtnRef.current?.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    }
  }, [ack]);

  return (
    <AnimatePresence>
      {!ack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
          aria-describedby="disclaimer-description"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="w-full max-w-md rounded-2xl border border-secondary/30 p-6 shadow-2xl glass-panel"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-secondary/30 bg-secondary/10">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <h2
                id="disclaimer-title"
                className="text-lg font-semibold text-on-surface font-headline-lg-mobile"
              >
                Before you begin
              </h2>
            </div>

            <div id="disclaimer-description">
              <p className="mb-3 text-sm leading-relaxed text-on-surface-variant">
                NyayaAI is an AI assistant that provides{' '}
                <strong className="text-on-surface">general legal information</strong> about
                Indian law for educational purposes. It is{' '}
                <strong className="text-on-surface">not a lawyer</strong> and its responses may
                be incomplete or inaccurate.
              </p>
              <p className="mb-5 text-sm leading-relaxed text-on-surface-variant">
                Nothing here creates a lawyer-client relationship or constitutes legal advice.
                For decisions about your specific situation, consult a qualified advocate.
              </p>
            </div>

            <button
              ref={acceptBtnRef}
              type="button"
              onClick={onAccept}
              className="w-full rounded-xl bg-secondary py-2.5 font-semibold text-on-secondary transition-colors hover:bg-secondary-container focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              I understand
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
