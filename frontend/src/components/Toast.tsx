import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Check, Info, X } from 'lucide-react';

interface ToastProps {
  toast: {
    id: string;
    message: string;
    variant: 'success' | 'error' | 'info';
  };
  onClose: () => void;
}

const TONE: Record<ToastProps['toast']['variant'], { icon: React.ElementType; cls: string }> = {
  success: { icon: Check, cls: 'text-affirm' },
  error: { icon: AlertCircle, cls: 'text-danger' },
  info: { icon: Info, cls: 'text-past' },
};

export const Toast: React.FC<ToastProps> = React.memo(({ toast, onClose }) => {
  const { icon: Icon, cls } = TONE[toast.variant];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.14 } }}
      transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className="overlay-panel flex w-[min(24rem,calc(100vw-2rem))] items-start gap-2.5 p-3"
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cls}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[0.8125rem] leading-relaxed text-fg">{toast.message}</p>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        className="grid h-5 w-5 shrink-0 place-items-center rounded text-fg-subtle transition-colors hover:text-fg"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
});

Toast.displayName = 'Toast';
