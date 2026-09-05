import React, { memo } from 'react';
import { MessageSquare, MoreHorizontal, Pin } from 'lucide-react';
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

/**
 * One conversation in the sidebar. The options button stays in the tab order at
 * all times and is only dimmed until hover, so it is reachable without a mouse.
 */
export const SessionRow: React.FC<SessionRowProps> = memo(
  ({
    session,
    isArchived = false,
    isRenaming,
    renameValue,
    onRenameChange,
    onRenameCommit,
    onRenameCancel,
    onSelect,
    onMenuOpen,
  }) => {
    const isCurrent = Boolean(session.active) && !isArchived;

    if (isRenaming) {
      return (
        <li className="px-2 py-1">
          <label className="sr-only" htmlFor={`rename-${session.id}`}>
            Rename conversation
          </label>
          <input
            id={`rename-${session.id}`}
            autoFocus
            value={renameValue}
            onChange={(event) => onRenameChange(event.target.value)}
            onBlur={() => onRenameCommit(session.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onRenameCommit(session.id);
              } else if (event.key === 'Escape') {
                onRenameCancel();
              }
            }}
            className="input h-9 text-[0.8125rem]"
          />
        </li>
      );
    }

    return (
      <li className="group relative px-2">
        <div
          className={`flex items-center rounded-md transition-colors duration-150 ${
            isCurrent ? 'bg-surface-2' : 'hover:bg-surface-2/60'
          }`}
        >
          <button
            onClick={() => onSelect(session.id)}
            aria-current={isCurrent ? 'true' : undefined}
            className="flex min-w-0 flex-1 items-center gap-2.5 py-2 pl-2.5 pr-1 text-left"
          >
            {session.pinned ? (
              <Pin
                className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-gold' : 'text-fg-subtle'}`}
                aria-label="Pinned"
              />
            ) : (
              <MessageSquare
                className={`h-3.5 w-3.5 shrink-0 ${isCurrent ? 'text-gold' : 'text-fg-subtle'}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`truncate text-[0.8125rem] ${
                isCurrent ? 'font-medium text-fg' : 'text-fg-muted'
              }`}
            >
              {session.title}
            </span>
          </button>

          <button
            data-session-optbtn
            onClick={(event) => onMenuOpen(event, session.id)}
            aria-label={`Options for ${session.title}`}
            aria-haspopup="menu"
            className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-fg-subtle opacity-60 transition-all duration-150 hover:bg-surface-3 hover:text-fg focus-visible:opacity-100 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </li>
    );
  },
);

SessionRow.displayName = 'SessionRow';
