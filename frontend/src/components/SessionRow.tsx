import React, { memo } from 'react';
import { Pin, MessageSquare, Clock, MoreHorizontal } from 'lucide-react';
import { ChatSession } from '../types';

interface SessionRowProps {
  session: ChatSession;
  isArchived?: boolean;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameCommit: (id: string | number) => void;
  onRenameCancel: () => void;
  onSelect: (id: string | number) => void;
  onMenuOpen: (e: React.MouseEvent, id: string | number) => void;
}

export const SessionRow: React.FC<SessionRowProps> = memo(({
  session,
  isArchived = false,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onSelect,
  onMenuOpen
}) => {
  return (
    <div
      data-session-row
      className={`group relative flex items-center border-l-4 ${
        session.active && !isArchived ? 'border-secondary bg-white/5' : 'border-transparent hover:bg-white/5'
      }`}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={() => onRenameCommit(session.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); onRenameCommit(session.id); }
            else if (e.key === 'Escape') onRenameCancel();
          }}
          className="flex-1 mx-3 my-2 bg-slate-900 border border-secondary/50 rounded px-2 py-1 text-sm text-on-surface focus:outline-none"
        />
      ) : (
        <>
          <button
            onClick={() => onSelect(session.id)}
            aria-label={`Select session ${session.title}`}
            className={`flex items-center gap-3 pl-4 py-3 flex-1 min-w-0 text-left ${
              session.active && !isArchived ? 'text-secondary font-bold' : 'text-on-surface-variant'
            }`}
          >
            <span className="shrink-0">
              {session.pinned ? (
                <Pin className="w-5 h-5" />
              ) : session.active && !isArchived ? (
                <MessageSquare className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </span>
            <span className="font-label-caps text-label-caps truncate">{session.title}</span>
          </button>
          <button
            data-session-optbtn
            onClick={(e) => onMenuOpen(e, session.id)}
            title="Options"
            aria-label={`Options for ${session.title}`}
            aria-haspopup="menu"
            className="p-2 mr-1 rounded-md text-on-surface-variant/50 hover:text-on-surface hover:bg-white/10 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all shrink-0"
          >
            <MoreHorizontal className="w-[18px] h-[18px]" />
          </button>
        </>
      )}
    </div>
  );
});

SessionRow.displayName = 'SessionRow';
