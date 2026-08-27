import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './index.css';
import { GOOGLE_CLIENT_ID } from './lib/runtimeConfig';

import * as Sentry from '@sentry/react';


// Initialize Sentry for error tracking
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  enabled: import.meta.env.PROD && !!import.meta.env.VITE_SENTRY_DSN, // Only enable in prod if DSN exists
});

if (!GOOGLE_CLIENT_ID) {
  console.error(
    '[NyayaAI] Missing VITE_GOOGLE_CLIENT_ID. Google sign-in will not work.\n' +
    '  → Create frontend/.env (NOT the repo-root .env) with:\n' +
    '      VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com\n' +
    '  → Then restart the dev server or rebuild.'
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    '[NyayaAI] Root element #root not found in the document. ' +
    'Check your index.html file.'
  );
}

createRoot(rootElement).render(
  <StrictMode>
    {GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);


