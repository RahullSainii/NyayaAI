import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex justify-start"
    >
      <div className="bg-surface border-l-2 border-gold/40 border-y border-r border-line rounded-2xl rounded-bl-md px-5 py-4 max-w-[300px] surface-glass shadow-sm">
        <div className="flex items-center gap-1.5 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-gold animate-pulse" />
          <span className="text-gold text-xs font-semibold tracking-wider uppercase">NyayaAI</span>
        </div>
        
        <div className="flex items-center gap-2 mb-1">
          <span className="text-fg-muted text-sm font-medium">Analyzing request</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-1 h-1 bg-gold rounded-full"
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
        
        <div className="mt-3 h-1.5 bg-surface-2 rounded-full overflow-hidden relative">
          <motion.div 
            className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
