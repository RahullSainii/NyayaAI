import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLockup, BrandMark } from './ui/BrandMark';
import { buttonClass } from './ui/Button';
import { commandKeyLabel, openCommandPalette } from './CommandPalette';

interface NavLinkItem {
  label: string;
  path: string;
  /** Short description shown in the mobile sheet, where there is room for it. */
  hint: string;
}

const NAV_LINKS: NavLinkItem[] = [
  { label: 'Ask', path: '/chat', hint: 'Put a question to the assistant' },
  { label: 'IPC → BNS', path: '/mapping', hint: 'Look up a section in the new code' },
];

const SCROLL_THRESHOLD = 8;

/**
 * Primary navigation.
 *
 * The desktop bar only appears at `lg`. Below that the full row (lockup, links,
 * two account actions) does not fit, which is why the previous `md` breakpoint
 * let "Get Started" collide with "Sign In" around 1024px.
 */
export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const rafRef = useRef(0);

  const handleScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    });
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll]);

  /* Mobile sheet: lock the page, trap Tab, close on Escape, restore focus. */
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sheetRef.current) return;

      const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const focusTimer = window.setTimeout(() => {
      sheetRef.current?.querySelector<HTMLElement>('a[href], button')?.focus();
    }, 60);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      toggleRef.current?.focus();
    };
  }, [menuOpen]);

  /* Close the sheet on navigation. */
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Account';

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200 ${
          scrolled
            ? 'border-line bg-ink/85 backdrop-blur-xl backdrop-saturate-150'
            : 'border-transparent bg-transparent'
        }`}
      >
        <nav
          aria-label="Primary"
          className="container-page flex h-[var(--nav-h)] items-center justify-between gap-6"
        >
          <BrandLockup to="/" showTagline />

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`lum-interactive relative flex h-8 items-center rounded-md px-3 text-[0.875rem] font-medium ${
                      isActive ? 'text-fg' : 'text-fg-subtle hover:text-fg'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gold shadow-[0_0_10px_rgb(var(--lum-gold)/0.55)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop account actions */}
          <div className="hidden items-center gap-2 lg:flex">
            {/* A visible trigger, so the shortcut is discoverable rather than
                a hidden feature only power users ever find. */}
            <button
              onClick={openCommandPalette}
              aria-label="Open the command palette to search sections"
              className="mr-1 flex h-8 items-center gap-2 rounded-md bg-surface-2 px-2.5 text-[0.8125rem] text-fg-subtle ring-1 ring-inset ring-line transition-colors duration-150 hover:bg-surface-3 hover:text-fg"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              Search
              <kbd className="kbd ml-1">{commandKeyLabel()}</kbd>
            </button>

            {isAuthenticated ? (
              <>
                <span className="flex items-center gap-2 pr-1 text-[0.8125rem] text-fg-muted">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-[0.625rem] font-bold text-gold">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                  {firstName}
                </span>
                <button onClick={handleLogout} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonClass({ variant: 'ghost', size: 'sm' })}>
                  Sign in
                </Link>
                <Link to="/chat" className={buttonClass({ variant: 'primary', size: 'sm' })}>
                  Ask a question
                </Link>
              </>
            )}
          </div>

          {/* Mobile trigger */}
          <button
            ref={toggleRef}
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Open menu"
            className={buttonClass({ variant: 'ghost', iconOnly: true, className: 'lg:hidden' })}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-[60] bg-ink/95 backdrop-blur-md lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <motion.div
              ref={sheetRef}
              initial={{ y: -12 }}
              animate={{ y: 0 }}
              exit={{ y: -12 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="flex h-full flex-col"
            >
              <div className="container-page flex h-[var(--nav-h)] shrink-0 items-center justify-between">
                <BrandLockup to={null} showTagline />
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className={buttonClass({ variant: 'ghost', size: 'sm', iconOnly: true })}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="container-page flex min-h-0 flex-1 flex-col overflow-y-auto pb-8 pt-4">
                <ul className="flex flex-col">
                  {NAV_LINKS.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                      <li key={link.path} className="border-b border-line">
                        <Link
                          to={link.path}
                          aria-current={isActive ? 'page' : undefined}
                          className="flex items-baseline justify-between gap-4 rounded-md py-4"
                        >
                          <span className="flex flex-col gap-1">
                            {/* Gold means "current" throughout the app, so the
                                active route is lit the same way badge-current is. */}
                            <span
                              className={`t-h3 ${isActive ? 'lum-label text-gold' : 'text-fg'}`}
                            >
                              {link.label}
                            </span>
                            <span className="t-sm text-fg-subtle">{link.hint}</span>
                          </span>
                          {isActive && <span className="badge badge-current">Current</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-8 flex flex-col gap-2.5">
                  {isAuthenticated ? (
                    <>
                      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3.5 py-3">
                        <BrandMark size="sm" />
                        <span className="min-w-0">
                          <span className="t-ui block truncate text-fg">{user?.name || 'Signed in'}</span>
                          {user?.email && (
                            <span className="t-xs block truncate text-fg-subtle">{user.email}</span>
                          )}
                        </span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className={buttonClass({ variant: 'secondary', size: 'lg', className: 'w-full' })}
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/chat"
                        className={buttonClass({ variant: 'primary', size: 'lg', className: 'w-full' })}
                      >
                        Ask a question
                      </Link>
                      <Link
                        to="/login"
                        className={buttonClass({ variant: 'secondary', size: 'lg', className: 'w-full' })}
                      >
                        Sign in
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
