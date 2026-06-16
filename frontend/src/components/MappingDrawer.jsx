import { motion } from 'framer-motion';

export default function MappingDrawer({ section, onClose }) {
  if (!section) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-navy/60 glass z-40"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed top-0 right-0 h-full w-full max-w-lg bg-surface border-l border-border z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-blue font-medium mb-1">
              <span className="bg-muted-blue/10 px-2 py-0.5 rounded-md">
                IPC §{section.ipcSection}
              </span>
              <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="bg-gold/10 text-gold px-2 py-0.5 rounded-md">
                BNS §{section.bnsSection}
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold text-text-primary">
              {section.ipcTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-blue hover:text-text-primary transition-colors p-2 rounded-xl hover:bg-card"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 chat-scroll">
          {/* BNS Equivalent */}
          <div>
            <h3 className="text-xs font-semibold text-muted-blue uppercase tracking-wider mb-2">
              BNS Equivalent
            </h3>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-gold font-heading text-lg font-semibold">
                Section {section.bnsSection}
              </p>
              <p className="text-text-primary text-sm mt-1">{section.bnsTitle}</p>
            </div>
          </div>

          {/* Punishment */}
          <div>
            <h3 className="text-xs font-semibold text-muted-blue uppercase tracking-wider mb-2">
              Punishment
            </h3>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-text-primary text-sm leading-relaxed">
                {section.punishment}
              </p>
            </div>
          </div>

          {/* Classification */}
          <div>
            <h3 className="text-xs font-semibold text-muted-blue uppercase tracking-wider mb-2">
              Classification
            </h3>
            <div className="flex gap-3">
              <div className={`flex-1 border rounded-xl p-4 text-center ${
                section.cognizable
                  ? 'bg-muted-blue/5 border-muted-blue/20'
                  : 'bg-gold/5 border-gold/20'
              }`}>
                <p className={`text-sm font-semibold ${
                  section.cognizable ? 'text-muted-blue' : 'text-gold'
                }`}>
                  {section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
                </p>
                <p className="text-muted-blue/60 text-xs mt-1">
                  {section.cognizable
                    ? 'Police can arrest without warrant'
                    : 'Warrant required for arrest'}
                </p>
              </div>
              <div className={`flex-1 border rounded-xl p-4 text-center ${
                section.bailable
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}>
                <p className={`text-sm font-semibold ${
                  section.bailable ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {section.bailable ? 'Bailable' : 'Non-Bailable'}
                </p>
                <p className="text-muted-blue/60 text-xs mt-1">
                  {section.bailable
                    ? 'Bail is a right'
                    : 'Bail at court discretion'}
                </p>
              </div>
            </div>
          </div>

          {/* Full Description */}
          <div>
            <h3 className="text-xs font-semibold text-muted-blue uppercase tracking-wider mb-2">
              Details
            </h3>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-text-primary text-sm leading-relaxed">
                {section.description}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full bg-card border border-border text-text-primary rounded-xl px-4 py-2.5 hover:border-muted-blue transition-all text-sm font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>
    </>
  );
}
