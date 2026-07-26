import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, KeyRound, Sparkles, Shield } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/nyaya.jpeg';
import AetherHero from '../components/ui/aether-hero';

const formVariants = {
  initial: { opacity: 0, x: 30, scale: 0.97 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -30, scale: 0.97, transition: { duration: 0.25, ease: 'easeIn' } },
};

function PasswordStrength({ password }) {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: '' };
    if (password.length < 6) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (password.length < 10) return { level: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { level: 3, label: 'Strong', color: 'bg-emerald-500' };
  }, [password]);
  
  if (!password) return null;
  
  return (
    <div className="mt-2 w-full">
      <div className="flex gap-1">
        {[1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= strength.level ? strength.color : 'bg-surface-2'}`} />
        ))}
      </div>
      <p className={`text-xs mt-1 transition-colors duration-300 ${strength.level === 1 ? 'text-red-400' : strength.level === 2 ? 'text-yellow-400' : 'text-emerald-400'}`}>
        {strength.label}
      </p>
    </div>
  );
}

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, forgotPassword, resetPassword, isAuthenticated, loginWithGoogle } = useAuth();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        // Exchange the Google access token for our backend-issued JWT so that
        // authenticated endpoints (like /chat) accept the session.
        await loginWithGoogle(tokenResponse.access_token);
        navigate('/chat', { replace: true });
      } catch (err) {
        setError(err.message || 'Google sign-in failed');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => setError('Google sign-in was cancelled or failed')
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && mode !== 'reset-password') {
      navigate('/chat', { replace: true });
    }
  }, [isAuthenticated, navigate, mode]);

  // Clear messages on mode change
  useEffect(() => {
    setError('');
    setSuccess('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  }, [mode]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const result = await register(formData.name, formData.email, formData.password);
        setSuccess(result.message);
        setTimeout(() => navigate('/login'), 2000);
      } else if (mode === 'login') {
        await login(formData.email, formData.password);
        navigate('/chat', { replace: true });
      } else if (mode === 'forgot-password') {
        const result = await forgotPassword(formData.email);
        setSuccess(result.message);
      } else if (mode === 'reset-password') {
        const token = searchParams.get('token');
        if (!token) throw new Error('Invalid reset link');
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const result = await resetPassword(token, formData.password);
        setSuccess(result.message);
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'register': return 'Create Account';
      case 'forgot-password': return 'Reset Password';
      case 'reset-password': return 'New Password';
      default: return 'Welcome Back';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'register': return 'Join NyayaAI for AI-powered legal assistance';
      case 'forgot-password': return "Enter your email and we'll send you a reset link";
      case 'reset-password': return 'Choose a new secure password';
      default: return 'Sign in to your NyayaAI account';
    }
  };

  return (
    <div className="auth-container relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-navy">
      {/* Aether shader background (same cinematic effect as the landing hero) */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <AetherHero
          height="100%"
          overlayGradient="linear-gradient(180deg, rgba(6,9,16,0.88) 0%, rgba(6,9,16,0.66) 45%, rgba(6,9,16,0.88) 100%)"
          ariaLabel="Aurora auth background"
        >
          <></>
        </AetherHero>
      </div>

      {/* Background aurora effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <motion.div 
          animate={{ y: [-40, 40, -40], x: [-30, 30, -30], scale: [1, 1.1, 1] }} 
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} 
          className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-gold/10 rounded-full blur-[100px] md:blur-[140px]" 
        />
        <motion.div 
          animate={{ y: [40, -40, 40], x: [30, -30, 30], scale: [1.1, 1, 1.1] }} 
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} 
          className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] max-w-[500px] max-h-[500px] bg-muted-blue/15 rounded-full blur-[100px] md:blur-[130px]" 
        />
        <motion.div 
          animate={{ y: [-20, 20, -20], x: [20, -20, 20], scale: [1, 1.05, 1] }} 
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} 
          className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-gold/5 rounded-full blur-[120px] md:blur-[160px]" 
        />
      </div>

      {/* Large background logo watermark */}
      <div className="auth-logo-watermark opacity-5 pointer-events-none absolute inset-0 flex items-center justify-center mix-blend-overlay" aria-hidden="true">
        <img src={logo} alt="" className="w-[80vw] max-w-[800px] object-contain grayscale" />
      </div>

      {/* Auth card */}
      <motion.div
        className="auth-card relative z-10 w-full max-w-md mx-auto p-8 rounded-3xl surface-glass-strong border border-line shadow-2xl backdrop-blur-2xl"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Animated glowing border */}
        <div className="absolute inset-0 rounded-3xl border border-gold/30 animate-pulse pointer-events-none" />

        {/* Logo and brand */}
        <Link to="/" className="auth-brand flex flex-col items-center justify-center mb-8 gap-3 group">
          <div className="auth-brand-logo w-14 h-14 rounded-2xl border border-gold/40 bg-white shadow-lg flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(245,200,66,0.4)] group-hover:border-gold">
            <img src={logo} alt="NyayaAI" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <p className="auth-brand-name font-heading text-xl font-bold tracking-widest text-text-primary">NYAYA <span className="text-gold">AI</span></p>
          </div>
        </Link>

        {/* Title */}
        <div className="auth-header text-center mb-8">
          <AnimatePresence mode="wait">
            <motion.div key={mode} variants={formVariants} initial="initial" animate="animate" exit="exit">
              <h1 className="auth-title text-2xl font-bold text-text-primary mb-2">{getTitle()}</h1>
              <p className="auth-subtitle text-sm text-muted-blue">{getSubtitle()}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-message auth-message-error flex items-start gap-2 p-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              className="auth-message auth-message-success flex items-start gap-2 p-3 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <AnimatePresence mode="wait">
          <motion.form
            key={mode}
            onSubmit={handleSubmit}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="auth-form flex flex-col gap-5"
          >
            {mode === 'register' && (
              <div className="auth-input-group flex flex-col gap-1.5">
                <label className="auth-label text-sm font-medium text-text-primary" htmlFor="auth-name">Full Name</label>
                <div className="auth-input-wrapper relative flex items-center group">
                  <User className="auth-input-icon absolute left-3.5 h-4 w-4 text-muted-blue group-focus-within:text-gold transition-colors" />
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="auth-input w-full bg-surface-2 border border-line rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all placeholder-muted-blue/50"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {mode !== 'reset-password' && (
              <div className="auth-input-group flex flex-col gap-1.5">
                <label className="auth-label text-sm font-medium text-text-primary" htmlFor="auth-email">Email Address</label>
                <div className="auth-input-wrapper relative flex items-center group">
                  <Mail className="auth-input-icon absolute left-3.5 h-4 w-4 text-muted-blue group-focus-within:text-gold transition-colors" />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="auth-input w-full bg-surface-2 border border-line rounded-xl py-2.5 pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all placeholder-muted-blue/50"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset-password') && (
              <div className="auth-input-group flex flex-col gap-1.5">
                <div className="auth-label-row flex justify-between items-center">
                  <label className="auth-label text-sm font-medium text-text-primary" htmlFor="auth-password">
                    {mode === 'reset-password' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <Link to="/forgot-password" className="auth-forgot-link text-xs text-gold hover:text-gold-hover transition-colors">Forgot password?</Link>
                  )}
                </div>
                <div className="auth-input-wrapper relative flex items-center group">
                  <Lock className="auth-input-icon absolute left-3.5 h-4 w-4 text-muted-blue group-focus-within:text-gold transition-colors" />
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="auth-input auth-input-password w-full bg-surface-2 border border-line rounded-xl py-2.5 pl-10 pr-10 text-sm text-text-primary focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all placeholder-muted-blue/50"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-toggle-password absolute right-3.5 text-muted-blue hover:text-text-primary transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === 'register' && <PasswordStrength password={formData.password} />}
              </div>
            )}

            {(mode === 'register' || mode === 'reset-password') && (
              <div className="auth-input-group flex flex-col gap-1.5">
                <label className="auth-label text-sm font-medium text-text-primary" htmlFor="auth-confirm-password">Confirm Password</label>
                <div className="auth-input-wrapper relative flex items-center group">
                  <KeyRound className="auth-input-icon absolute left-3.5 h-4 w-4 text-muted-blue group-focus-within:text-gold transition-colors" />
                  <input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="auth-input auth-input-password w-full bg-surface-2 border border-line rounded-xl py-2.5 pl-10 pr-10 text-sm text-text-primary focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all placeholder-muted-blue/50"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="auth-toggle-password absolute right-3.5 text-muted-blue hover:text-text-primary transition-colors focus:outline-none"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="auth-submit-btn mt-2 w-full flex items-center justify-center gap-2 bg-gold hover:bg-gold-hover text-navy font-semibold py-3 px-4 rounded-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(245,200,66,0.3)] active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot-password' && 'Send Reset Link'}
                  {mode === 'reset-password' && 'Reset Password'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </motion.form>
        </AnimatePresence>

        {(mode === 'login' || mode === 'register') && (
          <div className="mt-5">
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-line"></div>
              <span className="flex-shrink-0 mx-4 text-muted-blue text-xs font-medium uppercase tracking-wider">Or continue with</span>
              <div className="flex-grow border-t border-line"></div>
            </div>
            
            <button
              type="button"
              onClick={() => googleLogin()}
              disabled={isLoading}
              className="mt-4 w-full flex items-center justify-center gap-3 bg-surface-2 hover:bg-surface-3 border border-line hover:border-gold/30 text-text-primary font-medium py-2.5 px-4 rounded-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </div>
        )}

        {/* Footer links */}
        <div className="auth-footer mt-8 text-center">
          {mode === 'login' && (
            <p className="auth-footer-text text-sm text-muted-blue">
              Don't have an account?{' '}
              <Link to="/register" className="auth-footer-link text-gold hover:text-gold-hover font-medium transition-colors">Create one</Link>
            </p>
          )}
          {mode === 'register' && (
            <p className="auth-footer-text text-sm text-muted-blue">
              Already have an account?{' '}
              <Link to="/login" className="auth-footer-link text-gold hover:text-gold-hover font-medium transition-colors">Sign in</Link>
            </p>
          )}
          {mode === 'forgot-password' && (
            <p className="auth-footer-text text-sm text-muted-blue">
              Remember your password?{' '}
              <Link to="/login" className="auth-footer-link text-gold hover:text-gold-hover font-medium transition-colors">Back to sign in</Link>
            </p>
          )}
          {mode === 'reset-password' && (
            <p className="auth-footer-text text-sm text-muted-blue">
              <Link to="/login" className="auth-footer-link text-gold hover:text-gold-hover font-medium transition-colors">Back to sign in</Link>
            </p>
          )}
        </div>

        {/* Bottom decorative line */}
        <div className="auth-bottom-accent absolute bottom-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-gold/50 rounded-t-full shadow-[0_0_10px_rgba(245,200,66,0.5)] animate-pulse" />
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        className="auth-page-footer relative z-10 mt-8 flex items-center gap-2 text-sm text-muted-blue"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Sparkles className="h-3.5 w-3.5 text-gold/60" />
        AI-powered legal assistance for everyone
      </motion.p>
    </div>
  );
}
