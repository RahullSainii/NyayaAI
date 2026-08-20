import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LegalSection } from '../types';

interface SectionCardProps {
  section: LegalSection;
  onClick: () => void;
}

export default function SectionCard({ section, onClick }: SectionCardProps) {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      layout
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden cursor-pointer group bg-surface border border-line rounded-xl p-6 transition-colors duration-300 hover:border-gold-line shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col"
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
      <div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,215,0,0.06), transparent 40%)`,
        }}
      />

      <div className="relative z-10 flex flex-col h-full flex-1">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-fg-muted/10 text-fg px-2.5 py-1 rounded text-sm font-medium">
            IPC {section.ipcSection}
          </span>
          <motion.div
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <ArrowRight className="w-4 h-4 text-gold" />
          </motion.div>
          <span className="bg-gold-dim text-gold px-2.5 py-1 rounded text-sm font-medium">
            BNS {section.bnsSection}
          </span>
        </div>

        <h3 className="font-display text-lg font-semibold text-fg mb-2 line-clamp-2">
          {section.ipcTitle}
        </h3>
        
        <div className="flex gap-2 items-start mt-2 mb-4">
          <ArrowRight className="w-4 h-4 text-gold mt-1 shrink-0 opacity-70" />
          <p className="text-fg-subtle text-sm line-clamp-2">
            {section.bnsTitle}
          </p>
        </div>

        <div className="mt-auto pt-4 border-t border-line-2">
          <p className="text-xs text-fg-subtle mb-3 line-clamp-2" title={section.punishment}>
            {section.punishment}
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${section.cognizable ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
              {section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${section.bailable ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
              {section.bailable ? 'Bailable' : 'Non-Bailable'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
