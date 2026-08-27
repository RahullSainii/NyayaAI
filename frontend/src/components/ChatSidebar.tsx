import { Dispatch, SetStateAction, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Home, ChevronRight, ChevronDown } from 'lucide-react';
import logo from '../assets/nyaya.jpeg';
import { ChatSession } from '../types';
import { useChatStore } from '../store/useChatStore';

export interface ChatSidebarProps {
  handleNewChat: () => void;
  recentSessions: ChatSession[];
  archivedSessions: ChatSession[];
  renderSessionRow: (session: ChatSession, isArchived: boolean) => ReactNode;
  showArchived: boolean;
  setShowArchived: Dispatch<SetStateAction<boolean>> | ((fn: (v: boolean) => boolean) => void);
}

export default function ChatSidebar({
  handleNewChat,
  recentSessions,
  archivedSessions,
  renderSessionRow,
  showArchived,
  setShowArchived,
}: ChatSidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useChatStore();

  return (
    <motion.nav
      initial={{ x: '-100%' }}
      animate={{
        x: sidebarOpen ? 0 : '-100%',
        width: sidebarOpen ? 280 : 0,
        opacity: sidebarOpen ? 1 : 0,
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 h-full w-[280px] shrink-0 flex-col overflow-hidden border-r border-glass-border bg-slate-800 md:relative"
      aria-label="Chat navigation"
    >
      <div className="flex h-full w-[280px] flex-col">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-4 border-b border-glass-border p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-glass-border bg-white/5">
            <img src={logo} alt="NyayaAI" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-on-surface font-headline-lg-mobile text-headline-lg-mobile">
              NyayaAI
            </h1>
            <p className="text-on-surface-variant font-label-caps text-label-caps">
              Illuminated Justice
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1.5 text-on-surface-variant transition-colors hover:text-on-surface md:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Session List */}
        <div className="flex flex-1 flex-col overflow-y-auto py-4">
          <button
            onClick={handleNewChat}
            className="mx-2 mb-2 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5 text-left font-bold text-secondary transition-all duration-200 ease-in-out hover:bg-white/10"
          >
            <Plus className="h-5 w-5" />
            <span className="truncate font-label-caps text-label-caps">New Consultation</span>
          </button>

          <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50">
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
                className="flex w-full items-center gap-1.5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/50 transition-colors hover:text-on-surface-variant"
              >
                {showArchived ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Archived ({archivedSessions.length})
              </button>
              {showArchived &&
                archivedSessions.map((session) => renderSessionRow(session, true))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-glass-border p-4">
          <div className="flex flex-col gap-1">
            <a
              className="flex items-center gap-3 rounded-lg px-4 py-2 text-on-surface-variant transition-colors hover:bg-white/5"
              href="/"
            >
              <Home className="h-5 w-5" />
              <span className="font-label-caps text-label-caps">Home</span>
            </a>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
