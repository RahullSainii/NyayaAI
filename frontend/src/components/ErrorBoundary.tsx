import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render-phase crashes anywhere below it and shows a recovery screen
 * instead of a blank page.
 *
 * Styled with inline styles and literal colour values on purpose: this is the
 * last line of defence, so it must render correctly even if the stylesheet
 * itself failed to load. Token names are used where available, with the design
 * system's values as fallbacks.
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

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const buttonBase: CSSProperties = {
      height: '2.625rem',
      padding: '0 1rem',
      borderRadius: '9px',
      fontSize: '0.875rem',
      fontWeight: 600,
      cursor: 'pointer',
      border: 0,
    };

    return (
      <main
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: 'var(--color-ink, #07080e)',
          color: 'var(--color-fg, #eef0f6)',
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
          padding: '2rem',
          maxWidth: '34rem',
          marginInline: 'auto',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '0.6875rem',
            letterSpacing: '0.11em',
            textTransform: 'uppercase',
            color: 'var(--color-fg-subtle, #7d8499)',
          }}
        >
          Something broke
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-display, Georgia, serif)',
            fontSize: '1.75rem',
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          This screen failed to load
        </h1>

        <p
          style={{
            color: 'var(--color-fg-muted, #a4abbf)',
            lineHeight: 1.65,
            fontSize: '0.9375rem',
            margin: 0,
          }}
        >
          Reloading usually clears it. Nothing you had saved has been lost — conversations are kept
          on this device.
        </p>

        {this.state.error && (
          <details
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.875rem',
              borderRadius: '9px',
              border: '1px solid var(--color-line, #1c2032)',
              background: 'var(--color-surface, #10121d)',
              fontSize: '0.8125rem',
              color: 'var(--color-fg-muted, #a4abbf)',
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Technical detail</summary>
            <code
              style={{
                display: 'block',
                marginTop: '0.625rem',
                fontFamily: 'var(--font-mono, monospace)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--color-fg-subtle, #7d8499)',
              }}
            >
              {this.state.error.message}
            </code>
          </details>
        )}

        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.25rem' }}>
          <button
            onClick={this.handleReload}
            style={{
              ...buttonBase,
              background: 'var(--color-gold, #d9a94a)',
              color: '#14100a',
            }}
          >
            Reload the page
          </button>
          <button
            onClick={this.handleReset}
            style={{
              ...buttonBase,
              background: 'var(--color-surface-2, #161927)',
              color: 'var(--color-fg, #eef0f6)',
              boxShadow: 'inset 0 0 0 1px var(--color-line-2, #282d43)',
            }}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
}
