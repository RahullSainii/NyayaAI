import { useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LegalSection } from '../types';

interface SectionCardProps {
  section: LegalSection;
  onClick: () => void;
}

/**
 * Interactive card displaying an IPC → BNS section mapping.
 * Uses CSS custom properties for the spotlight effect (no re-renders on mouse move).
 */
const SectionCard = memo(function SectionCard({ section, onClick }: SectionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  /** Update CSS custom properties for the radial gradient — zero re-renders */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    cardRef.current.style.setProperty('--spotlight-opacity', '1');
  };

  const handleMouseLeave = () => {
    cardRef.current?.style.setProperty('--spotlight-opacity', '0');
  };

  return (
    <motion.div
      layout
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileHover={{ y: -4 }}
      className="relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-sm transition-colors duration-300 hover:border-gold-line hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for IPC Section ${section.ipcSection} mapped to BNS Section ${section.bnsSection}`}
    >
      {/* Spotlight effect via CSS custom properties — no React state, no re-renders */}
      <div
        className="pointer-events-none absolute -inset-px rounded-xl transition duration-300"
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,215,0,0.06), transparent 40%)`,
          opacity: 'var(--spotlight-opacity, 0)',
        }}
      />

      <div className="relative z-10 flex h-full flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded bg-fg-muted/10 px-2.5 py-1 text-sm font-medium text-fg">
            IPC {section.ipcSection}
          </span>
          <ArrowRight className="h-4 w-4 text-gold transition-transform duration-200 group-hover:translate-x-1" />
          <span className="rounded bg-gold-dim px-2.5 py-1 text-sm font-medium text-gold">
            BNS {section.bnsSection}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-2 font-display text-lg font-semibold text-fg">
          {section.ipcTitle}
        </h3>

        <div className="mb-4 mt-2 flex items-start gap-2">
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-gold opacity-70" />
          <p className="line-clamp-2 text-sm text-fg-subtle">{section.bnsTitle}</p>
        </div>

        <div className="mt-auto border-t border-line-2 pt-4">
          <p className="mb-3 line-clamp-2 text-xs text-fg-subtle" title={section.punishment}>
            {section.punishment}
          </p>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                section.cognizable
                  ? 'border-red-500/20 bg-red-500/10 text-red-400'
                  : 'border-green-500/20 bg-green-500/10 text-green-400'
              }`}
            >
              {section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-xs ${
                section.bailable
                  ? 'border-green-500/20 bg-green-500/10 text-green-400'
                  : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              {section.bailable ? 'Bailable' : 'Non-Bailable'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default SectionCard;
