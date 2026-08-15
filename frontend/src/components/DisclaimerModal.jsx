import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function DisclaimerModal({ ack, onAccept }) {
  return (
    <AnimatePresence>
      {!ack && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="max-w-md w-full glass-panel border border-secondary/30 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/30">
                <Sparkles className="h-4 w-4 text-secondary" />
              </div>
              <h2 className="font-headline-lg-mobile text-lg font-semibold text-on-surface">Before you begin</h2>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
              NyayaAI is an AI assistant that provides <strong className="text-on-surface">general legal
              information</strong> about Indian law for educational purposes. It is
              <strong className="text-on-surface"> not a lawyer</strong> and its responses may be
              incomplete or inaccurate.
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
              Nothing here creates a lawyer-client relationship or constitutes legal advice.
              For decisions about your specific situation, consult a qualified advocate.
            </p>
            <button
              type="button"
              onClick={onAccept}
              className="w-full bg-secondary text-on-secondary font-semibold py-2.5 rounded-xl hover:bg-secondary-container transition-colors"
            >
              I understand
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
