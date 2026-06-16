import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex justify-start"
    >
      <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-gold text-xs">⚖</span>
          <span className="text-gold text-xs font-semibold tracking-wide">
            NyayaAI
          </span>
        </div>
        <div className="flex items-center gap-1.5 py-1">
          <span className="typing-dot w-2 h-2 bg-gold rounded-full inline-block" />
          <span className="typing-dot w-2 h-2 bg-gold rounded-full inline-block" />
          <span className="typing-dot w-2 h-2 bg-gold rounded-full inline-block" />
        </div>
      </div>
    </motion.div>
  );
}
