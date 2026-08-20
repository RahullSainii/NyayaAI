import { Dispatch, SetStateAction, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import logo from '../assets/nyaya.jpeg';
import { ChatSession } from '../types';

export interface ChatSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: Dispatch<SetStateAction<boolean>> | ((open: boolean) => void);
  handleNewChat: () => void;
  recentSessions: ChatSession[];
  archivedSessions: ChatSession[];
  renderSessionRow: (session: ChatSession, isArchived: boolean) => ReactNode;
  showArchived: boolean;
  setShowArchived: Dispatch<SetStateAction<boolean>> | ((fn: (v: boolean) => boolean) => void);
}

export default function ChatSidebar({
  sidebarOpen,
  setSidebarOpen,
  handleNewChat,
  recentSessions,
  archivedSessions,
  renderSessionRow,
  showArchived,
  setShowArchived
}: ChatSidebarProps) {
  return (
    <motion.nav
      initial={{ x: '-100%' }}
      animate={{ 
        x: sidebarOpen ? 0 : '-100%',
        width: sidebarOpen ? 280 : 0,
        opacity: sidebarOpen ? 1 : 0
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed md:relative left-0 top-0 h-full w-[280px] flex flex-col z-40 bg-slate-800 border-r border-glass-border shrink-0 overflow-hidden"
    >
      <div className="w-[280px] flex flex-col h-full">
        {/* Header */}
        <div className="p-6 flex items-center gap-4 border-b border-glass-border shrink-0">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 border border-glass-border flex items-center justify-center shrink-0">
            <img src={logo} alt="NyayaAI" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">NyayaAI</h1>
            <p className="font-label-caps text-label-caps text-on-surface-variant">Illuminated Justice</p>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden ml-auto p-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-1 py-4 flex flex-col overflow-y-auto">
          <button
            onClick={handleNewChat}
            className="mx-2 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary font-bold bg-white/5 hover:bg-white/10 transition-all duration-200 ease-in-out text-left"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add_comment</span>
            <span className="font-label-caps text-label-caps truncate">New Consultation</span>
          </button>

          <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
            Recents
          </div>

          {recentSessions.length === 0 && (
            <p className="px-4 py-2 text-xs text-on-surface-variant/40">No conversations yet.</p>
          )}
          {recentSessions.map((session) => renderSessionRow(session, false))}

          {archivedSessions.length > 0 && (
            <div className="mt-2 border-t border-glass-border pt-2">
              <button
                onClick={() => setShowArchived((v: boolean) => !v)}
                className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">{showArchived ? 'expand_more' : 'chevron_right'}</span>
                Archived ({archivedSessions.length})
              </button>
              {showArchived && archivedSessions.map((session) => renderSessionRow(session, true))}
            </div>
          )}
        </div>

        {/* Footer / CTA */}
        <div className="p-4 border-t border-glass-border shrink-0">
          <button className="w-full py-3 mb-4 rounded bg-secondary text-on-secondary font-label-caps text-label-caps hover:bg-secondary-container transition-colors">
            Upgrade to Pro
          </button>
          <div className="flex flex-col gap-1">
            <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-white/5 transition-colors" href="/">
              <span className="material-symbols-outlined">home</span>
              <span className="font-label-caps text-label-caps">Home</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-white/5 transition-colors" href="#">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-label-caps text-label-caps">Settings</span>
            </a>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
