import { Dispatch, ReactNode, SetStateAction, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, Home, Plus, Replace, X } from 'lucide-react';
import { ChatSession } from '../types';
import { useChatStore } from '../store/useChatStore';
import { BrandLockup } from './ui/BrandMark';
import { buttonClass } from './ui/Button';

export interface ChatSidebarProps {
  handleNewChat: () => void;
  recentSessions: ChatSession[];
  archivedSessions: ChatSession[];
  renderSessionRow: (session: ChatSession, isArchived: boolean) => ReactNode;
  showArchived: boolean;
  setShowArchived: Dispatch<SetStateAction<boolean>> | ((fn: (v: boolean) => boolean) => void);
}

/**
 * Conversation list.
 *
 * One DOM node serves both breakpoints: an off-canvas sheet below `lg`, a
 * collapsible column at and above it. The previous version unmounted the whole
 * sidebar when closed, which made the desktop layout jump, and animated width
 * through Framer while also animating `x` — two systems fighting for the same
 * property.
 */
export default function ChatSidebar({
  handleNewChat,
  recentSessions,
  archivedSessions,
  renderSessionRow,
  showArchived,
  setShowArchived,
}: ChatSidebarProps) {
  const { sidebarOpen, setSidebarOpen } = useChatStore();

  /* Escape closes the sheet on small screens. */
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && window.innerWidth < 1024) setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <aside
      id="chat-sidebar"
      aria-label="Conversations"
      aria-hidden={!sidebarOpen}
      /* `visibility: hidden` (not just width/transform) is what takes the closed
         sidebar out of the tab order — otherwise keyboard focus walks into an
         off-screen conversation list. It is included in the transition so the
         slide-out still plays before the element disappears. */
      className={`fixed inset-y-0 left-0 z-50 w-[278px] shrink-0 overflow-hidden border-r border-line bg-ink-2 transition-[transform,width,visibility] duration-200 ease-out lg:static lg:z-auto ${
        sidebarOpen
          ? 'visible translate-x-0 lg:w-[278px]'
          : 'invisible -translate-x-full lg:w-0 lg:translate-x-0 lg:border-r-0'
      }`}
    >
      <div className="flex h-full w-[278px] flex-col">
        <div className="flex h-[var(--nav-h)] shrink-0 items-center justify-between gap-2 border-b border-line px-3">
          <BrandLockup to="/" />
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close conversations"
            aria-controls="chat-sidebar"
            aria-expanded={sidebarOpen}
            className={buttonClass({ variant: 'ghost', size: 'sm', iconOnly: true })}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={handleNewChat}
            className={buttonClass({ variant: 'secondary', className: 'w-full justify-start' })}
          >
            <Plus className="h-4 w-4 text-gold" aria-hidden="true" />
            New conversation
          </button>
        </div>

        <nav aria-label="Recent conversations" className="min-h-0 flex-1 overflow-y-auto pb-2">
          <h2 className="t-label px-4 pb-1.5 pt-2 text-fg-subtle">Recent</h2>

          {recentSessions.length === 0 ? (
            <p className="t-sm px-4 py-2 text-fg-subtle">Nothing yet.</p>
          ) : (
            <ul>{recentSessions.map((session) => renderSessionRow(session, false))}</ul>
          )}

          {archivedSessions.length > 0 && (
            <div className="mt-2 border-t border-line pt-2">
              <button
                onClick={() => setShowArchived((v: boolean) => !v)}
                aria-expanded={showArchived}
                className="t-label flex w-full items-center gap-1.5 px-4 py-2 text-fg-subtle transition-colors hover:text-fg-muted"
              >
                {showArchived ? (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                Archived · {archivedSessions.length}
              </button>
              {showArchived && (
                <ul>{archivedSessions.map((session) => renderSessionRow(session, true))}</ul>
              )}
            </div>
          )}
        </nav>

        <div className="shrink-0 border-t border-line p-2">
          <Link
            to="/mapping"
            className="menu-item rounded-md"
          >
            <Replace className="h-4 w-4" aria-hidden="true" />
            IPC → BNS lookup
          </Link>
          <Link to="/" className="menu-item rounded-md">
            <Home className="h-4 w-4" aria-hidden="true" />
            Home
          </Link>
        </div>
      </div>
    </aside>
  );
}
