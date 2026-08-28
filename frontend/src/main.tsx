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
    '[NyayaAI] VITE_GOOGLE_CLIENT_ID is empty. Google sign-in will not work.\n' +
    '  Sources checked:\n' +
    `    window.__NYAYA_CONFIG__.VITE_GOOGLE_CLIENT_ID = "${window.__NYAYA_CONFIG__?.VITE_GOOGLE_CLIENT_ID || '(missing)'}"\n` +
    `    import.meta.env.VITE_GOOGLE_CLIENT_ID       = "${import.meta.env.VITE_GOOGLE_CLIENT_ID || '(missing)'}"\n` +
    '  Fix: set VITE_GOOGLE_CLIENT_ID on the Render frontend service and redeploy.'
  );
} else {
  console.log(`[NyayaAI] GOOGLE_CLIENT_ID loaded (${GOOGLE_CLIENT_ID.substring(0, 12)}...)`);
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


