import { motion } from 'framer-motion';

export default function SectionCard({ section, onClick }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-muted-blue transition-all duration-300 group"
    >
      {/* IPC → BNS header */}
      <div className="flex items-center gap-2 text-xs text-muted-blue font-medium mb-3">
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

      {/* IPC Title */}
      <h3 className="font-heading text-lg font-semibold text-text-primary group-hover:text-gold transition-colors duration-200">
        {section.ipcTitle}
      </h3>

      {/* BNS Title */}
      <p className="text-muted-blue text-sm mt-1">
        → {section.bnsTitle}
      </p>

      {/* Punishment */}
      <p className="text-muted-blue/70 text-xs mt-3 leading-relaxed line-clamp-2">
        {section.punishment}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span
          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
            section.cognizable
              ? 'bg-muted-blue/10 text-muted-blue border border-muted-blue/20'
              : 'bg-gold/10 text-gold border border-gold/20'
          }`}
        >
          {section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
        </span>
        <span
          className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
            section.bailable
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {section.bailable ? 'Bailable' : 'Non-Bailable'}
        </span>
      </div>
    </motion.div>
  );
}
