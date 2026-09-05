import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { BrandFullLogo, BrandLockup } from '../components/ui/BrandMark';
import { AuthBackdrop } from '../components/ui/Backdrop';
import { Notice } from '../components/ui/Feedback';
import { buttonClass } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { BNS_COMMENCEMENT, INDEX_STATS } from '../lib/sections';
import { GOOGLE_CLIENT_ID } from '../lib/runtimeConfig';

type Mode = 'login' | 'register' | 'forgot-password' | 'reset-password';

const COPY: Record<Mode, { title: string; subtitle: string; submit: string }> = {
  login: {
    title: 'Sign in',
    subtitle: 'Pick up where you left off.',
    submit: 'Sign in',
  },
  register: {
    title: 'Create an account',
    subtitle: 'Your conversations stay on your account, so you can come back to them.',
    submit: 'Create account',
  },
  'forgot-password': {
    title: 'Reset your password',
    subtitle: 'Enter the email you signed up with and we will send a reset link.',
    submit: 'Send reset link',
  },
  'reset-password': {
    title: 'Choose a new password',
    subtitle: 'Pick something you have not used elsewhere.',
    submit: 'Save password',
  },
};

const MIN_PASSWORD_LENGTH = 6;

/** Strength meter. Advisory only — the server enforces the actual minimum. */
function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: '', bar: '', text: '' };

    let score = 0;
    if (password.length >= MIN_PASSWORD_LENGTH) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { level: 1, label: 'Weak', bar: 'bg-danger', text: 'text-danger' };
    if (score <= 3) return { level: 2, label: 'Fair', bar: 'bg-caution', text: 'text-caution' };
    return { level: 3, label: 'Strong', bar: 'bg-affirm', text: 'text-affirm' };
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-0.5 flex-1 rounded-full transition-colors duration-200 ${
              i <= strength.level ? strength.bar : 'bg-line-2'
            }`}
          />
        ))}
      </div>
      <p className={`t-xs mt-1.5 ${strength.text}`}>
        {strength.label} password
        <span className="sr-only"> — at least {MIN_PASSWORD_LENGTH} characters required</span>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

function GoogleButton({
  disabled,
  onStart,
  onSuccess,
  onError,
  loginWithGoogle,
}: {
  disabled: boolean;
  onStart: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
  loginWithGoogle: (accessToken: string) => Promise<unknown>;
}) {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        onStart();
        await loginWithGoogle(tokenResponse.access_token);
        onSuccess();
      } catch (err: unknown) {
        onError(err instanceof Error ? err.message : 'Google sign-in failed.');
      }
    },
    onError: () => onError('Google sign-in was cancelled.'),
  });

  return (
    <button
      type="button"
      onClick={() => googleLogin()}
      disabled={disabled}
      className={buttonClass({ variant: 'secondary', className: 'w-full' })}
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );
}

export interface AuthPageProps {
  mode?: Mode;
}

export default function AuthPage({ mode = 'login' }: AuthPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, register, forgotPassword, resetPassword, isAuthenticated, loginWithGoogle } =
    useAuth();

  /* Where to go once signed in: the page that sent us here, or the assistant. */
  const redirectTo = (location.state as { from?: string } | null)?.from || '/chat';

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const copy = COPY[mode];
  useDocumentTitle(`${copy.title} · NyayaAI`);

  useEffect(() => {
    if (isAuthenticated && mode !== 'reset-password') navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, mode, redirectTo]);

  useEffect(() => {
    setError('');
    setSuccess('');
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  }, [mode]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    if (error) setError('');
  };

  const needsConfirm = mode === 'register' || mode === 'reset-password';
  const mismatch =
    needsConfirm &&
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) throw new Error('The passwords do not match.');
        if (formData.password.length < MIN_PASSWORD_LENGTH) {
          throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
        }
        const result = await register(formData.name, formData.email, formData.password);
        setSuccess(result.message);
        setTimeout(() => navigate('/login'), 2000);
      } else if (mode === 'login') {
        await login(formData.email, formData.password);
        navigate(redirectTo, { replace: true });
      } else if (mode === 'forgot-password') {
        const result = await forgotPassword(formData.email);
        setSuccess(result.message);
      } else {
        const token = searchParams.get('token');
        if (!token) throw new Error('This reset link is not valid. Request a new one.');
        if (formData.password !== formData.confirmPassword) throw new Error('The passwords do not match.');
        const result = await resetPassword(token, formData.password);
        setSuccess(result.message);
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-ink lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* One shader behind both columns. `isolate` above makes this element's
          stacking context the blend root for it. */}
      <AuthBackdrop />

      {/* ------------------------------------------------------- Context panel */}
      {/* No background of its own: an opaque panel here would hide the effect. */}
      <aside className="relative hidden border-r border-line lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link to="/" aria-label="NyayaAI home" className="relative w-fit">
          <BrandFullLogo className="w-52" />
        </Link>

        <div className="relative max-w-md">
          <p className="eyebrow">Why an account</p>
          <h2 className="t-h2 lum-heading mt-4">
            Your conversations, kept where you left them.
          </h2>
          <p className="t-lead mt-4">
            Questions about the Bharatiya Nyaya Sanhita rarely end in one exchange. An account keeps
            each thread — and the provisions it cited — available when you come back to it.
          </p>

          <ul className="mt-10 flex gap-12">
            <li>
              <p className="t-numeral lum-metric text-2xl leading-none">{INDEX_STATS.indexed}</p>
              <p className="t-sm mt-1.5 text-fg-subtle">IPC sections indexed</p>
            </li>
            <li>
              <p className="t-numeral lum-metric text-2xl leading-none">
                {INDEX_STATS.withEquivalent}
              </p>
              <p className="t-sm mt-1.5 text-fg-subtle">Mapped to the BNS</p>
            </li>
          </ul>
        </div>

        <p className="t-xs relative text-fg-subtle">
          The BNS replaced the Indian Penal Code on {BNS_COMMENCEMENT}. NyayaAI provides educational
          information, not legal advice.
        </p>
      </aside>

      {/* --------------------------------------------------------------- Form */}
      {/* Readability here comes from AuthBackdrop's veil, which thickens to
          near-solid ink under this column, so no local background is needed. */}
      <div className="relative flex flex-1 flex-col">
        <div className="relative flex items-center justify-between px-5 pt-5 lg:hidden">
          <BrandLockup to="/" />
          <Link to="/" className="t-sm link-quiet inline-flex items-center gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Home
          </Link>
        </div>

        <div className="relative flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[25rem]">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              >
                <h1 className="t-h1 lum-heading">{copy.title}</h1>
                <p className="t-body mt-2 text-fg-muted">{copy.subtitle}</p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex flex-col gap-3" aria-live="polite">
              {error && (
                <Notice tone="error" icon={<AlertCircle className="h-4 w-4" aria-hidden="true" />}>
                  {error}
                </Notice>
              )}
              {success && (
                <Notice tone="success" icon={<Check className="h-4 w-4" aria-hidden="true" />}>
                  {success}
                </Notice>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {mode === 'register' && (
                <div className="field">
                  <label className="field-label" htmlFor="auth-name">
                    Full name
                  </label>
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="input"
                    required
                    autoComplete="name"
                  />
                </div>
              )}

              {mode !== 'reset-password' && (
                <div className="field">
                  <label className="field-label" htmlFor="auth-email">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="input"
                    required
                    autoComplete="email"
                    autoFocus={mode === 'login'}
                  />
                </div>
              )}

              {mode !== 'forgot-password' && (
                <div className="field">
                  <div className="flex items-baseline justify-between gap-3">
                    <label className="field-label" htmlFor="auth-password">
                      {mode === 'reset-password' ? 'New password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <Link to="/forgot-password" className="t-xs link">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input input-action"
                      required
                      minLength={mode === 'login' ? undefined : MIN_PASSWORD_LENGTH}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      aria-describedby={mode === 'register' ? 'password-hint' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-fg-subtle transition-colors hover:text-fg"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {mode === 'register' ? (
                    formData.password ? (
                      <PasswordStrength password={formData.password} />
                    ) : (
                      <p id="password-hint" className="field-hint">
                        At least {MIN_PASSWORD_LENGTH} characters.
                      </p>
                    )
                  ) : null}
                </div>
              )}

              {needsConfirm && (
                <div className="field">
                  <label className="field-label" htmlFor="auth-confirm">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-confirm"
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="input input-action"
                      required
                      autoComplete="new-password"
                      aria-invalid={mismatch || undefined}
                      aria-describedby={mismatch ? 'confirm-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      aria-pressed={showConfirm}
                      className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-md text-fg-subtle transition-colors hover:text-fg"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {mismatch && (
                    <p id="confirm-error" className="field-error">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      The passwords do not match.
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || mismatch}
                className={buttonClass({ variant: 'primary', size: 'lg', className: 'mt-1 w-full' })}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Working…
                  </>
                ) : (
                  <>
                    {copy.submit}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </form>

            {(mode === 'login' || mode === 'register') && (
              <>
                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line" />
                  <span className="t-label text-fg-subtle">or</span>
                  <span className="h-px flex-1 bg-line" />
                </div>

                {GOOGLE_CLIENT_ID ? (
                  <GoogleButton
                    disabled={isLoading}
                    onStart={() => {
                      setError('');
                      setIsLoading(true);
                    }}
                    onSuccess={() => navigate(redirectTo, { replace: true })}
                    onError={(message) => {
                      setError(message);
                      setIsLoading(false);
                    }}
                    loginWithGoogle={loginWithGoogle}
                  />
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Google sign-in is not configured for this deployment"
                    className={buttonClass({ variant: 'secondary', className: 'w-full' })}
                  >
                    <GoogleIcon />
                    Google sign-in unavailable
                  </button>
                )}
              </>
            )}

            <p className="t-sm mt-8 text-fg-subtle">
              {mode === 'login' && (
                <>
                  New here?{' '}
                  <Link to="/register" className="link">
                    Create an account
                  </Link>
                </>
              )}
              {mode === 'register' && (
                <>
                  Already have an account?{' '}
                  <Link to="/login" className="link">
                    Sign in
                  </Link>
                </>
              )}
              {(mode === 'forgot-password' || mode === 'reset-password') && (
                <Link to="/login" className="link inline-flex items-center gap-1.5">
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Back to sign in
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
