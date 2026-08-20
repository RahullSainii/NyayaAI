import { useEffect } from 'react';
import { motion, Variants } from 'framer-motion';
import { X, ArrowRight, Scale, Shield, Gavel } from 'lucide-react';
import { LegalSection } from '../types';

interface MappingDrawerProps {
  section: LegalSection;
  onClose: () => void;
}

export default function MappingDrawer({ section, onClose }: MappingDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm"
        aria-hidden="true"
      />
      
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-surface-glass-strong border-l border-line shadow-2xl overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="p-6 md:p-8 flex-1">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-fg-muted/10 text-fg px-3 py-1.5 rounded-md text-sm font-medium">
                  IPC {section.ipcSection}
                </span>
                <ArrowRight className="w-4 h-4 text-gold" />
                <span className="bg-gold-dim text-gold px-3 py-1.5 rounded-md text-sm font-medium shadow-[0_0_10px_rgba(255,215,0,0.1)]">
                  BNS {section.bnsSection}
                </span>
              </div>
              <h2 id="drawer-title" className="text-2xl font-display font-bold text-fg">
                {section.ipcTitle}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface-2 text-fg-muted hover:text-fg transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-gold-dim/40 to-transparent border border-gold-line/30 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Scale className="w-16 h-16 text-gold" />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm font-semibold text-gold mb-2 uppercase tracking-wider flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" /> BNS Equivalent
                </h3>
                <p className="text-fg font-medium text-lg mb-1">{section.bnsTitle}</p>
                {section.bnsSection === 'Not Found' && (
                  <p className="text-sm text-fg-muted">This section currently has no exact mapping in BNS.</p>
                )}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-surface border border-line rounded-xl p-5">
              <h3 className="text-sm font-semibold text-fg-muted mb-3 flex items-center gap-2">
                <Gavel className="w-4 h-4" /> Punishment
              </h3>
              <p className="text-fg-subtle leading-relaxed">
                {section.punishment}
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
              <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors ${section.cognizable ? 'bg-red-500/5 border-red-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                <Shield className={`w-6 h-6 ${section.cognizable ? 'text-red-400' : 'text-green-400'}`} />
                <div>
                  <p className="text-xs text-fg-muted uppercase font-semibold mb-1">Nature</p>
                  <p className={`text-sm font-medium ${section.cognizable ? 'text-red-400' : 'text-green-400'}`}>
                    {section.cognizable ? 'Cognizable' : 'Non-Cognizable'}
                  </p>
                </div>
              </div>
              <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-colors ${section.bailable ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <Scale className={`w-6 h-6 ${section.bailable ? 'text-green-400' : 'text-red-400'}`} />
                <div>
                  <p className="text-xs text-fg-muted uppercase font-semibold mb-1">Bail</p>
                  <p className={`text-sm font-medium ${section.bailable ? 'text-green-400' : 'text-red-400'}`}>
                    {section.bailable ? 'Bailable' : 'Non-Bailable'}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="bg-surface border border-line rounded-xl p-5">
              <h3 className="text-sm font-semibold text-fg-muted mb-3">Description</h3>
              <p className="text-fg-subtle text-sm leading-relaxed">
                {section.description}
              </p>
            </motion.div>
          </motion.div>
        </div>

        <div className="p-6 border-t border-line bg-surface/50 backdrop-blur-md">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-surface-2 hover:bg-surface-3 text-fg rounded-xl font-medium transition-colors"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </>
  );
}
