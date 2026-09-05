import { motion } from 'framer-motion';
import { BrandMark } from './ui/BrandMark';

/**
 * Shown between sending a question and the first token arriving.
 *
 * It mirrors the answer layout exactly — same mark, same label, same margin
 * rule — so the reply appears to resolve in place instead of one component
 * being swapped for a differently shaped one.
 */
export default function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      role="status"
      aria-label="Searching the statutes"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <BrandMark size="sm" />
        <span className="t-label text-fg-subtle">NyayaAI</span>
      </div>

      <div className="statute flex items-center gap-2.5">
        <span className="t-sm text-fg-subtle">Searching the statutes</span>
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="thinking-dot h-1 w-1 rounded-full bg-gold" />
          ))}
        </span>
      </div>
    </motion.div>
  );
}
