import React, { memo, useEffect, useRef } from 'react';
import { Share2, Pencil, Pin, Archive, Trash2 } from 'lucide-react';
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

export const SessionContextMenu: React.FC<SessionContextMenuProps> = memo(({
  session,
  position,
  onClose,
  onShare,
  onRename,
  onTogglePin,
  onToggleArchive,
  onDelete
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
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

  interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
  }

  const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, onClick, danger }) => (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
        danger 
          ? 'text-red-400 hover:bg-red-400/10' 
          : 'text-on-surface hover:bg-white/5'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" />
      <span>{label}</span>
    </button>
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{ position: 'fixed', top: position.top, left: position.left }}
      className="z-[9999] min-w-[184px] rounded-xl border border-glass-border bg-slate-800 shadow-2xl py-1"
    >
      <MenuItem icon={Share2} label="Share" onClick={() => { onShare(session.id); onClose(); }} />
      <MenuItem icon={Pencil} label="Rename" onClick={() => { onRename(session); onClose(); }} />
      <MenuItem icon={Pin} label={session.pinned ? 'Unpin' : 'Pin chat'} onClick={() => { onTogglePin(session.id); onClose(); }} />
      <MenuItem icon={Archive} label={session.archived ? 'Unarchive' : 'Archive'} onClick={() => { onToggleArchive(session.id); onClose(); }} />
      <MenuItem icon={Trash2} label="Delete" danger onClick={() => { onDelete(session.id); onClose(); }} />
    </div>
  );
});

SessionContextMenu.displayName = 'SessionContextMenu';
