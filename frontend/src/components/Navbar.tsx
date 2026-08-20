import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, LogOut, User, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/nyaya.jpeg';

interface NavLinkItem {
  label: string;
  path?: string;
  href?: string;
}

const navLinks: NavLinkItem[] = [
  { label: 'IPC to BNS', path: '/mapping' },
  { label: 'Sections', path: '/mapping' },
  { label: 'Ask AI', path: '/chat' },
  { label: 'About', href: '#features' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'surface-glass-strong' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 pt-3 md:px-6">
          <div className="rounded-full border border-white/10 bg-surface/68 px-4 py-2.5 shadow-[0_18px_60px_rgba(5,10,20,0.32)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4">
              <Link to="/" className="flex min-w-0 items-center gap-3 group">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-[0_10px_24px_rgba(245,200,66,0.14)] transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(245,200,66,0.5)] group-hover:border-gold">
                  <img src={logo} alt="NyayaAI logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-lg font-semibold leading-none tracking-[0.12em] text-text-primary md:text-xl">
                    NYAYA <span className="text-gold">AI</span>
                  </p>
                  <p className="mt-1 hidden text-[10px] uppercase tracking-[0.24em] text-muted-blue md:block">
                    Legal chatbot for everyone
                  </p>
                </div>
              </Link>

              <div className="hidden items-center gap-7 md:flex">
                {navLinks.map((link) => {
                  const isActive = link.path ? location.pathname === link.path : location.pathname === '/';

                  if (link.href) {
                    return (
                      <a
                        key={link.label}
                        href={link.href}
                        className="relative text-sm font-medium text-muted-blue transition-all duration-200 hover:-translate-y-0.5 hover:text-text-primary"
                      >
                        {link.label}
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={link.label}
                      to={link.path || '/'}
                      className={`relative text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'text-gold'
                          : 'text-muted-blue hover:text-text-primary hover:-translate-y-0.5'
                      }`}
                    >
                      {link.label}
                      {isActive && (
                        <motion.div
                          layoutId="navbar-indicator"
                          className="absolute -bottom-1 left-0 right-0 h-0.5 rounded-full bg-gold"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                {isAuthenticated ? (
                  <div className="hidden md:flex items-center gap-3">
                    <div className="group relative hidden items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 md:flex transition-all">
                      <div className="absolute inset-0 rounded-full border border-gold/30 opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity" />
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/20 relative z-10">
                        <User className="h-3.5 w-3.5 text-gold" />
                      </div>
                      <span className="text-sm font-medium text-text-primary relative z-10">
                        {user?.name?.split(' ')[0] || 'User'}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm font-medium text-muted-blue transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 active:scale-95 md:px-4 md:py-2.5"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden md:inline">Logout</span>
                    </button>
                  </div>
                ) : (
                  <div className="hidden md:flex items-center gap-3">
                    <Link
                      to="/login"
                      className="group relative inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-fg-muted transition-all duration-300 hover:border-gold/40 hover:text-gold hover:bg-gold/[0.06] hover:shadow-[0_0_20px_rgba(212,166,78,0.08)] active:scale-[0.97] backdrop-blur-md"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] border border-white/[0.08] transition-all duration-300 group-hover:bg-gold/15 group-hover:border-gold/30">
                        <User className="h-3.5 w-3.5 transition-colors duration-300 group-hover:text-gold" />
                      </div>
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-b from-gold-bright via-gold to-[#b88d3e] px-5 py-2.5 text-sm font-bold text-ink transition-all duration-300 hover:shadow-[0_0_28px_rgba(212,166,78,0.35),0_4px_16px_rgba(212,166,78,0.2)] active:scale-[0.97] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/25 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        Get Started
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    </Link>
                  </div>
                )}
                
                <button 
                  className="md:hidden p-2 text-muted-blue hover:text-text-primary focus:outline-none"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open Menu"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] surface-glass-strong backdrop-blur-2xl flex flex-col md:hidden"
          >
            <div className="flex justify-end p-6">
              <button onClick={() => setMobileOpen(false)} className="p-2 text-text-primary" aria-label="Close Menu">
                <X className="h-8 w-8" />
              </button>
            </div>
            
            <div className="flex flex-col items-center justify-center flex-1 gap-8">
              {navLinks.map((link, i) => {
                const isActive = link.path ? location.pathname === link.path : location.pathname === '/';
                return (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                  >
                    {link.href ? (
                      <a href={link.href} onClick={() => setMobileOpen(false)} className="text-3xl font-display font-medium text-text-primary hover:text-gold transition-colors">
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.path || '/'} onClick={() => setMobileOpen(false)} className={`text-3xl font-display font-medium transition-colors ${isActive ? 'text-gold' : 'text-text-primary hover:text-gold'}`}>
                        {link.label}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: navLinks.length * 0.1, duration: 0.4 }}
                className="mt-8 flex flex-col gap-4 w-3/4 max-w-xs"
              >
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 mb-4">
                      <User className="h-5 w-5 text-gold" />
                      <span className="text-lg font-medium text-text-primary">{user?.name || 'User'}</span>
                    </div>
                    <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 font-medium hover:bg-red-500/20 transition-colors">
                      <LogOut className="h-5 w-5" />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)} className="relative flex items-center justify-center gap-2.5 w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3.5 text-fg-muted font-medium hover:border-gold/40 hover:text-gold hover:bg-gold/[0.06] transition-all backdrop-blur-md overflow-hidden">
                      <User className="h-4 w-4" />
                      Sign In
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)} className="relative flex items-center justify-center gap-2.5 w-full rounded-full bg-gradient-to-b from-gold-bright via-gold to-[#b88d3e] px-5 py-3.5 text-ink font-bold hover:shadow-[0_0_28px_rgba(212,166,78,0.35)] transition-all overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/25 before:to-transparent">
                      <span className="relative z-10 flex items-center gap-2">
                        Get Started <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
