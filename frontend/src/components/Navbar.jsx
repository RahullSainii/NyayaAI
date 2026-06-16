import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/nyayaai-logo.svg';

const navLinks = [
  { label: 'IPC to BNS', path: '/mapping' },
  { label: 'Sections', path: '/mapping' },
  { label: 'Ask AI', path: '/chat' },
  { label: 'About', href: '#features' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-navy/65 glass' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 pt-3 md:px-6">
        <div className="rounded-full border border-white/10 bg-surface/68 px-4 py-2.5 shadow-[0_18px_60px_rgba(5,10,20,0.32)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-gold/30 bg-[#f6f0e1] shadow-[0_10px_24px_rgba(245,200,66,0.14)]">
                <img src={logo} alt="NyayaAI logo" className="h-full w-full object-cover" />
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
                    to={link.path}
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

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 md:flex">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gold/20">
                    <User className="h-3.5 w-3.5 text-gold" />
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {user?.name?.split(' ')[0] || 'User'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm font-medium text-muted-blue transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/8 hover:text-red-400 active:scale-95 md:px-4 md:py-2.5"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="group relative inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-medium text-muted-blue backdrop-blur-sm transition-all duration-300 hover:border-gold/25 hover:bg-white/[0.06] hover:text-text-primary hover:shadow-[0_0_20px_rgba(245,200,66,0.06)] active:scale-95 md:px-5 md:py-2.5"
                >
                  <User className="h-3.5 w-3.5 transition-colors duration-300 group-hover:text-gold" />
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-gold/25 bg-gold/[0.08] px-4 py-2 text-sm font-semibold text-gold backdrop-blur-sm transition-all duration-300 hover:border-gold/40 hover:bg-gold/[0.14] hover:shadow-[0_0_30px_rgba(245,200,66,0.12)] active:scale-95 md:px-5 md:py-2.5"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-gold/10 via-transparent to-gold/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
