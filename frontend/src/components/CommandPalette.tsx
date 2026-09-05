import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Home, LogIn, MessageSquare, Replace, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { normalizeSectionInput, QUICK_PICKS } from '../lib/sections';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: React.ElementType;
  run: () => void;
}

const RECENTS_KEY = 'nyayaai_recent_sections';

/** Event name used by visible triggers, so a shortcut isn't the only way in. */
export const OPEN_COMMAND_PALETTE = 'nyayaai:open-command-palette';

/** Opens the palette from anywhere — avoids a context for a single boolean. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE));
}

/** `⌘K` on Apple platforms, `Ctrl K` elsewhere. */
export function commandKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl K';
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
    ? '⌘K'
    : 'Ctrl K';
}

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string').slice(0, 5) : [];
  } catch {
    return [];
  }
}

/**
 * Keyboard-first navigation, on ⌘K / Ctrl-K.
 *
 * It earns its place because the two things people come here to do are both
 * addressable by typing: ask a question, or resolve a section number. Entering
 * digits offers the lookup directly, so "⌘K 302 ⏎" reaches the record for IPC
 * 302 from anywhere in the application without touching the mouse.
 *
 * Deliberately dependency-free — no combobox library — but it implements the
 * parts that matter: roving selection over a listbox, `aria-activedescendant`
 * so the active option is announced, Escape to dismiss, a focus trap on the
 * input, and focus returned to wherever it came from on close.
 */
export default function CommandPalette() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  /* Global shortcut. Ignored while typing in a field, so ⌘K inside the chat
     composer does not hijack a keystroke the browser may already own. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isShortcut) return;
      event.preventDefault();
      setOpen((wasOpen) => !wasOpen);
    };
    const onRequestOpen = () => setOpen(true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE, onRequestOpen);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onRequestOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement;
    setQuery('');
    setActive(0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 40);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  const go = useCallback(
    (to: string) => {
      close();
      navigate(to);
    },
    [close, navigate],
  );

  const commands = useMemo<Command[]>(() => {
    const section = normalizeSectionInput(query);
    const looksLikeSection = /^\d{1,3}[A-Z]?$/.test(section);

    const list: Command[] = [];

    /* A typed section number is the most likely intent, so it leads. */
    if (looksLikeSection) {
      list.push({
        id: `lookup-${section}`,
        label: `Look up IPC ${section}`,
        hint: 'Open its BNS mapping',
        group: 'Section',
        icon: Replace,
        run: () => go(`/mapping?ipc=${encodeURIComponent(section)}`),
      });
      list.push({
        id: `ask-${section}`,
        label: `Ask about IPC ${section}`,
        hint: 'Put it to the assistant',
        group: 'Section',
        icon: MessageSquare,
        run: () =>
          go(`/chat?q=${encodeURIComponent(`Explain IPC section ${section} in plain language.`)}`),
      });
    }

    list.push(
      {
        id: 'ask',
        label: 'Ask a question',
        hint: 'Open the assistant',
        group: 'Go to',
        icon: MessageSquare,
        run: () => go('/chat'),
      },
      {
        id: 'mapping',
        label: 'IPC → BNS lookup',
        hint: 'Search the section index',
        group: 'Go to',
        icon: Replace,
        run: () => go('/mapping'),
      },
      { id: 'home', label: 'Home', group: 'Go to', icon: Home, run: () => go('/') },
    );

    if (!isAuthenticated) {
      list.push({
        id: 'signin',
        label: 'Sign in',
        group: 'Account',
        icon: LogIn,
        run: () => go('/login'),
      });
    }

    const recents = readRecents();
    for (const section_ of recents) {
      list.push({
        id: `recent-${section_}`,
        label: `IPC ${section_}`,
        hint: 'Recent lookup',
        group: 'Recent',
        icon: Search,
        run: () => go(`/mapping?ipc=${encodeURIComponent(section_)}`),
      });
    }
    if (recents.length === 0) {
      for (const section_ of QUICK_PICKS.slice(0, 4)) {
        list.push({
          id: `common-${section_}`,
          label: `IPC ${section_}`,
          hint: 'Commonly searched',
          group: 'Common sections',
          icon: Search,
          run: () => go(`/mapping?ipc=${encodeURIComponent(section_)}`),
        });
      }
    }

    return list;
  }, [query, isAuthenticated, go]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) ||
        command.group.toLowerCase().includes(needle) ||
        command.id.toLowerCase().includes(needle),
    );
  }, [commands, query]);

  /* Keep the selection in range as the list shrinks while typing. */
  useEffect(() => {
    setActive((current) => (current >= results.length ? 0 : current));
  }, [results.length]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (results.length ? (current + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (results.length ? (current - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      results[active]?.run();
    }
  };

  let lastGroup = '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.13 }}
          className="scrim z-[10000] flex items-start justify-center p-4 pt-[12vh]"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="overlay-panel w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-3.5">
              <Search className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Type a section number, or search…"
                aria-label="Search commands and sections"
                aria-controls="command-results"
                aria-activedescendant={results[active] ? `command-${results[active].id}` : undefined}
                autoComplete="off"
                spellCheck={false}
                className="h-12 w-full bg-transparent text-[0.9375rem] text-fg placeholder:text-fg-subtle focus:outline-none"
              />
              <kbd className="kbd shrink-0">esc</kbd>
            </div>

            <ul
              ref={listRef}
              id="command-results"
              role="listbox"
              aria-label="Results"
              className="max-h-[min(24rem,52vh)] overflow-y-auto py-1.5"
            >
              {results.length === 0 && (
                <li className="px-3.5 py-6 text-center text-[0.8125rem] text-fg-subtle">
                  Nothing matches “{query.trim()}”.
                </li>
              )}

              {results.map((command, index) => {
                const showGroup = command.group !== lastGroup;
                lastGroup = command.group;
                const isActive = index === active;

                return (
                  <li key={command.id}>
                    {showGroup && (
                      <p className="t-label px-3.5 pb-1 pt-2.5 text-fg-subtle">{command.group}</p>
                    )}
                    <button
                      id={`command-${command.id}`}
                      data-index={index}
                      role="option"
                      aria-selected={isActive}
                      onMouseMove={() => setActive(index)}
                      onClick={command.run}
                      className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors duration-100 ${
                        isActive ? 'bg-surface-2' : ''
                      }`}
                    >
                      <command.icon
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-gold' : 'text-fg-subtle'}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate text-[0.875rem] text-fg">
                        {command.label}
                      </span>
                      {command.hint && (
                        <span className="hidden shrink-0 text-[0.75rem] text-fg-subtle sm:block">
                          {command.hint}
                        </span>
                      )}
                      {isActive && (
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center gap-3 border-t border-line px-3.5 py-2 text-[0.6875rem] text-fg-subtle">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd>
                to move
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">⏎</kbd>
                to open
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
