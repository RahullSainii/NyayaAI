import React, { lazy, Suspense, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import { SkipToContent } from './components/SkipToContent';
import CommandPalette from './components/CommandPalette';
import { Spinner } from './components/ui/Feedback';

// Lazy-load route-level components for automatic code splitting.
const Landing  = lazy(() => import('./pages/Landing'));
const Chat     = lazy(() => import('./pages/Chat'));
const Mapping  = lazy(() => import('./pages/Mapping'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Shared page transition duration in seconds */
const PAGE_TRANSITION_DURATION = 0.25;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback label="Checking your session" />;
  }

  if (!isAuthenticated) {
    /* Carry the attempted destination through sign-in, so a link like
       /chat?q=… still lands on the question the user came for. */
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }

  return children;
}

/**
 * Shared waiting screen for lazy route chunks and the session check.
 *
 * Deliberately quiet — a full-page spinner that appears for 80ms reads as a
 * flicker, so this is a small mark low in the viewport rather than a centred
 * loader that draws the eye.
 */
function RouteFallback({ label }: { label: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-ink">
      <Spinner size="lg" label={label} />
    </div>
  );
}

/** Shared page enter/exit animation wrapper */
const PageTransition = memo(function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: PAGE_TRANSITION_DURATION }}
    >
      {children}
    </motion.div>
  );
});

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<RouteFallback label="Loading" />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route
            path="/"
            element={
              <PageTransition>
                <Landing />
              </PageTransition>
            }
          />
          <Route
            path="/login"
            element={
              <PageTransition>
                <AuthPage mode="login" />
              </PageTransition>
            }
          />
          <Route
            path="/register"
            element={
              <PageTransition>
                <AuthPage mode="register" />
              </PageTransition>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PageTransition>
                <AuthPage mode="forgot-password" />
              </PageTransition>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PageTransition>
                <AuthPage mode="reset-password" />
              </PageTransition>
            }
          />
          <Route
            path="/chat"
            element={
              <PageTransition>
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              </PageTransition>
            }
          />
          <Route
            path="/mapping"
            element={
              <PageTransition>
                <Mapping />
              </PageTransition>
            }
          />
          {/* Catch-all 404 — now wrapped in PageTransition for consistent animation */}
          <Route
            path="*"
            element={
              <PageTransition>
                <NotFound />
              </PageTransition>
            }
          />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <SkipToContent />
            <CommandPalette />
            <AnimatedRoutes />
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}
