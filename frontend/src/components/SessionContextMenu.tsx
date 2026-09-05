import React, { memo, useEffect, useRef } from 'react';
import { Archive, Pencil, Pin, Share2, Trash2 } from 'lucide-react';
import { ChatSession } from '../types';

interface SessionContextMenuProps {
  session: ChatSession;
  position: { top: number; left: number };
  onClose: () => void;
  onShare: (id: string | number) => void;
  onRename: (session: ChatSession) => void;
  onTogglePin: (id: string | number) => void;
  onToggleArchive: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`menu-item ${danger ? 'menu-item-danger text-danger/85' : ''}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  );
}

export const SessionContextMenu: React.FC<SessionContextMenuProps> = memo(
  ({ session, position, onClose, onShare, onRename, onTogglePin, onToggleArchive, onDelete }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      /* Move focus into the menu so it can be driven from the keyboard. */
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onClose();
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', onClose);
      window.addEventListener('scroll', onClose, true);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('resize', onClose);
        window.removeEventListener('scroll', onClose, true);
      };
    }, [onClose]);

    return (
      <div
        ref={menuRef}
        data-session-menu
        role="menu"
        aria-label={`Options for ${session.title}`}
        style={{ position: 'fixed', top: position.top, left: position.left }}
        className="overlay-panel z-[9999] min-w-[190px] py-1"
      >
        <MenuItem
          icon={Share2}
          label="Copy transcript"
          onClick={() => {
            onShare(session.id);
            onClose();
          }}
        />
        <MenuItem
          icon={Pencil}
          label="Rename"
          onClick={() => {
            onRename(session);
            onClose();
          }}
        />
        <MenuItem
          icon={Pin}
          label={session.pinned ? 'Unpin' : 'Pin to top'}
          onClick={() => {
            onTogglePin(session.id);
            onClose();
          }}
        />
        <MenuItem
          icon={Archive}
          label={session.archived ? 'Unarchive' : 'Archive'}
          onClick={() => {
            onToggleArchive(session.id);
            onClose();
          }}
        />
        <div className="my-1 h-px bg-line" role="separator" />
        <MenuItem
          icon={Trash2}
          label="Delete"
          danger
          onClick={() => {
            onDelete(session.id);
            onClose();
          }}
        />
      </div>
    );
  },
);

SessionContextMenu.displayName = 'SessionContextMenu';
