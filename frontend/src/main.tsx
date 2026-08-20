import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google'

// Prefer the build-time env var; fall back to the current NyayaAI OAuth client.
// (A Google client ID is public — safe to keep as a default.)
const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '297216988135-akouchdgltbjqmbpsijifdrbaefst6s6.apps.googleusercontent.com'

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  )
}
