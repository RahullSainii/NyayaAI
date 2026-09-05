import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/Toast';
import { AnimatePresence } from 'framer-motion';

export interface ToastContextType {
  showToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; variant: 'success' | 'error' | 'info' }>>([]);

  const showToast = useCallback((message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* The stack ignores pointer events so it never blocks the UI beneath it;
          each toast re-enables them for its own dismiss button. */}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[9999] flex flex-col items-center gap-2 sm:left-auto sm:right-4 sm:items-end">
        <AnimatePresence>
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onClose={() => removeToast(toast.id)} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
