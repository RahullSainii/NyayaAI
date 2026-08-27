import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toast: {
    id: string;
    message: string;
    variant: 'success' | 'error' | 'info';
  };
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = React.memo(({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 bg-surface border border-line rounded-lg shadow-lg p-4 pr-12 relative min-w-[300px]"
    >
      {icons[toast.variant]}
      <p className="text-sm text-fg font-medium">{toast.message}</p>
      <button
        onClick={onClose}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-fg-muted hover:text-fg rounded-md hover:bg-white/5 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
});

Toast.displayName = 'Toast';
