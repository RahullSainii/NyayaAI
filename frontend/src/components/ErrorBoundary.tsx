import { Component, ErrorInfo, ReactNode } from 'react';

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
 * Wrap around <Routes> in App.tsx so a single page crash doesn't kill
 * the entire app.
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
    // In production you'd send this to Sentry / LogRocket / etc.
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--navy, #0b1322)',
          color: '#f5f7ff',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#e3bb56' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#8fa4cb', maxWidth: '480px', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            An unexpected error occurred. Please try refreshing the page. If the problem
            persists, clear your browser cache and try again.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '999px',
                border: 'none',
                background: 'linear-gradient(135deg, #f1cf75, #e3bb56, #c99433)',
                color: '#0b1322',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Refresh Page
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '0.75rem 2rem',
                borderRadius: '999px',
                border: '1px solid #24324f',
                background: 'transparent',
                color: '#8fa4cb',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
