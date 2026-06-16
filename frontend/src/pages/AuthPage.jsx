import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, CheckCircle, AlertCircle, Loader2, KeyRound, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/nyayaai-logo.svg';

const particles = [
  { left: '8%', top: '12%', size: 4, delay: 0 },
  { left: '15%', top: '68%', size: 5, delay: 1.4 },
  { left: '25%', top: '30%', size: 3, delay: 0.6 },
  { left: '40%', top: '85%', size: 6, delay: 2.1 },
  { left: '55%', top: '15%', size: 4, delay: 1.0 },
  { left: '70%', top: '55%', size: 5, delay: 2.6 },
  { left: '82%', top: '22%', size: 3, delay: 0.3 },
  { left: '90%', top: '72%', size: 4, delay: 1.8 },
  { left: '35%', top: '50%', size: 5, delay: 0.9 },
  { left: '65%', top: '80%', size: 3, delay: 2.3 },
];

const formVariants = {
  initial: { opacity: 0, x: 30, scale: 0.97 },
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, x: -30, scale: 0.97, transition: { duration: 0.25, ease: 'easeIn' } },
};

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, forgotPassword, resetPassword, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="auth-container">
      {/* Background aura effects */}
      <div className="page-aura" />

      {/* Floating particles */}
      <div className="particle-field" aria-hidden="true">
        {particles.map((p) => (
          <span
            key={`${p.left}-${p.top}`}
            className="particle-dot"
            style={{ left: p.left, top: p.top, width: `${p.size}px`, height: `${p.size}px`, animationDelay: `${p.delay}s` }}
          />
        ))}
      </div>

      {/* Large background logo watermark */}
      <div className="auth-logo-watermark" aria-hidden="true">
        <img src={logo} alt="" className="auth-logo-watermark-img" />
      </div>

      {/* Auth card */}
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Card glow effect */}
        <div className="auth-card-glow" />

        {/* Logo and brand */}
        <Link to="/" className="auth-brand">
          <div className="auth-brand-logo">
            <img src={logo} alt="NyayaAI" />
          </div>
          <div>
            <p className="auth-brand-name">NYAYA <span className="text-gold">AI</span></p>
            <p className="auth-brand-tagline">Legal Chatbot for Everyone</p>
          </div>
        </Link>

        {/* Title */}
        <div className="auth-header">
          <AnimatePresence mode="wait">
            <motion.div key={mode} variants={formVariants} initial="initial" animate="animate" exit="exit">
              <h1 className="auth-title">{getTitle()}</h1>
              <p className="auth-subtitle">{getSubtitle()}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="auth-message auth-message-error"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div
              className="auth-message auth-message-success"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
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
            className="auth-form"
          >
            {mode === 'register' && (
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="auth-name">Full Name</label>
                <div className="auth-input-wrapper">
                  <User className="auth-input-icon" />
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="auth-input"
                    required
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {mode !== 'reset-password' && (
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="auth-email">Email Address</label>
                <div className="auth-input-wrapper">
                  <Mail className="auth-input-icon" />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="auth-input"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset-password') && (
              <div className="auth-input-group">
                <div className="auth-label-row">
                  <label className="auth-label" htmlFor="auth-password">
                    {mode === 'reset-password' ? 'New Password' : 'Password'}
                  </label>
                  {mode === 'login' && (
                    <Link to="/forgot-password" className="auth-forgot-link">Forgot password?</Link>
                  )}
                </div>
                <div className="auth-input-wrapper">
                  <Lock className="auth-input-icon" />
                  <input
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="auth-input auth-input-password"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="auth-toggle-password"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {(mode === 'register' || mode === 'reset-password') && (
              <div className="auth-input-group">
                <label className="auth-label" htmlFor="auth-confirm-password">Confirm Password</label>
                <div className="auth-input-wrapper">
                  <KeyRound className="auth-input-icon" />
                  <input
                    id="auth-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="auth-input auth-input-password"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="auth-toggle-password"
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
              className="auth-submit-btn"
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

        {/* Footer links */}
        <div className="auth-footer">
          {mode === 'login' && (
            <p className="auth-footer-text">
              Don't have an account?{' '}
              <Link to="/register" className="auth-footer-link">Create one</Link>
            </p>
          )}
          {mode === 'register' && (
            <p className="auth-footer-text">
              Already have an account?{' '}
              <Link to="/login" className="auth-footer-link">Sign in</Link>
            </p>
          )}
          {mode === 'forgot-password' && (
            <p className="auth-footer-text">
              Remember your password?{' '}
              <Link to="/login" className="auth-footer-link">Back to sign in</Link>
            </p>
          )}
          {mode === 'reset-password' && (
            <p className="auth-footer-text">
              <Link to="/login" className="auth-footer-link">Back to sign in</Link>
            </p>
          )}
        </div>

        {/* Bottom decorative line */}
        <div className="auth-bottom-accent" />
      </motion.div>

      {/* Bottom tagline */}
      <motion.p
        className="auth-page-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <Sparkles className="h-3 w-3 text-gold/60" />
        AI-powered legal assistance for everyone
      </motion.p>
    </div>
  );
}
