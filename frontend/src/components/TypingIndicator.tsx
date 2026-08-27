import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

/** Animated typing indicator shown while NyayaAI generates a response. */
export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex justify-start"
      role="status"
      aria-live="polite"
      aria-label="NyayaAI is generating a response"
    >
      <div className="max-w-[300px] rounded-2xl rounded-bl-md border-y border-r border-l-2 border-line border-l-gold/40 bg-surface px-5 py-4 shadow-sm surface-glass">
        <div className="mb-3 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-gold" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gold">NyayaAI</span>
        </div>

        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium text-fg-muted">Analyzing request</span>
          <div className="flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1 w-1 rounded-full bg-gold"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>

        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </div>
    </motion.div>
  );
}
