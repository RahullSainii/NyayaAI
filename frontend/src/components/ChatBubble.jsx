import { motion } from 'framer-motion';

const formatSourceLabel = (source) => {
  if (typeof source === 'string') return source;

  const lawType = source.law_type || 'Law';
  const section = source.section || 'Unknown';
  const page = source.page_number ? `, p. ${source.page_number}` : '';

  return `${lawType} Section ${section}${page}`;
};

export default function ChatBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[75%] ${
          isUser
            ? 'bg-card border border-border rounded-2xl rounded-br-md px-4 py-3'
            : 'bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3'
        }`}
      >
        {/* AI label */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-gold text-xs">⚖</span>
            <span className="text-gold text-xs font-semibold tracking-wide">
              NyayaAI
            </span>
          </div>
        )}

        {/* Message content */}
        <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {/* Source citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {message.sources.map((source, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 bg-muted-blue/10 text-muted-blue text-xs px-2.5 py-1 rounded-lg border border-muted-blue/20"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {formatSourceLabel(source)}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
