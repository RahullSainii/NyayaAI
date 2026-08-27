import { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary — catches render-phase crashes in any child tree
 * and shows a recovery UI instead of a blank white screen.
 *
 * Uses CSS custom properties so the fallback renders correctly even if
 * Tailwind/PostCSS fails to load. This is intentional — the error boundary
 * is the last line of defense and must be self-contained.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, errorInfo);
    Sentry.captureException(error, { extra: { errorInfo } });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-ink, #060910)',
            color: 'var(--color-fg, #f0f2f8)',
            fontFamily: 'var(--font-body, system-ui, sans-serif)',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          {/* Decorative glow */}
          <div
            style={{
              position: 'absolute',
              width: '300px',
              height: '300px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(212,166,78,0.08), transparent 70%)',
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1
              style={{
                fontSize: '2rem',
                fontFamily: 'var(--font-display, Georgia, serif)',
                fontWeight: 600,
                marginBottom: '0.75rem',
                color: 'var(--color-gold, #d4a64e)',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                color: 'var(--color-fg-muted, #9aa4be)',
                maxWidth: '480px',
                lineHeight: 1.7,
                marginBottom: '2rem',
                fontSize: '0.95rem',
              }}
            >
              An unexpected error occurred. Please try refreshing the page.
              If the problem persists, clear your browser cache and try again.
            </p>

            {this.state.error && (
              <details
                style={{
                  maxWidth: '480px',
                  marginBottom: '1.5rem',
                  textAlign: 'left',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--color-line, #1e2a4a)',
                  background: 'var(--color-surface, #131a2e)',
                  fontSize: '0.8rem',
                  color: 'var(--color-fg-muted, #9aa4be)',
                }}
              >
                <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Error details
                </summary>
                <code style={{ fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {this.state.error.message}
                </code>
              </details>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={this.handleRefresh}
                style={{
                  padding: '0.85rem 2rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--color-gold-bright, #f5e0a0), var(--color-gold, #d4a64e))',
                  color: 'var(--color-ink, #060910)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.85rem 2rem',
                  borderRadius: '999px',
                  border: '1px solid var(--color-line, #1e2a4a)',
                  background: 'transparent',
                  color: 'var(--color-fg-muted, #9aa4be)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseOver={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = 'var(--color-gold-line, rgba(212,166,78,0.28))';
                }}
                onMouseOut={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = 'var(--color-line, #1e2a4a)';
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
