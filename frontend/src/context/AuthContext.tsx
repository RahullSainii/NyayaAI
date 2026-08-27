import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiUrl } from '../lib/api';
import type { User, AuthResponse, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Expected payload structure for our JWTs.
 */
interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
}

/**
 * Decode a JWT payload without any library (browser-only).
 * NOTE: This is for UI state interpretation only, not for security verification.
 * Do not trust the payload for secure operations.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the token's `exp` claim is in the past (or missing).
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || !payload.exp) return true;
  // 60-second grace buffer so we refresh slightly before actual expiry.
  return Date.now() >= (payload.exp * 1000) - 60_000;
}

// Helpers for localStorage
function setStoredAuth(token: string, user: User) {
  localStorage.setItem('nyayaai_token', token);
  localStorage.setItem('nyayaai_user', JSON.stringify(user));
}

function clearStoredAuth() {
  localStorage.removeItem('nyayaai_token');
  localStorage.removeItem('nyayaai_user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Attempt to silently refresh an expired token using the /auth/refresh endpoint.
  const tryRefreshToken = useCallback(async (currentToken: string, signal?: AbortSignal): Promise<string | null> => {
    try {
      const res = await fetch(apiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
        signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      
      if (signal?.aborted) return null;

      setUser(data.user);
      setToken(data.token);
      setStoredAuth(data.token, data.user);
      return data.token;
    } catch {
      return null;
    }
  }, []);

  // Effect to manage auto token refresh timer
  useEffect(() => {
    if (!token) return;

    const payload = decodeJwtPayload(token);
    if (!payload || !payload.exp) return;

    const controller = new AbortController();
    const expiresMs = payload.exp * 1000;
    // Refresh 1 minute before expiry
    const timeUntilRefresh = expiresMs - Date.now() - 60_000;

    if (timeUntilRefresh <= 0) {
      // Already expired or close to it, refresh now
      tryRefreshToken(token, controller.signal);
      return () => controller.abort();
    }

    const timer = setTimeout(() => {
      tryRefreshToken(token, controller.signal);
    }, timeUntilRefresh);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, tryRefreshToken]);

  // On mount: restore session, checking expiry.
  useEffect(() => {
    const controller = new AbortController();
    const savedUser = localStorage.getItem('nyayaai_user');
    const savedToken = localStorage.getItem('nyayaai_token');

    let mounted = true;

    if (savedUser && savedToken) {
      if (isTokenExpired(savedToken)) {
        // Token is expired — try a silent refresh.
        tryRefreshToken(savedToken, controller.signal).then((newToken) => {
          if (!mounted) return;
          if (!newToken) {
            // Refresh failed — force re-login.
            clearStoredAuth();
            setUser(null);
            setToken(null);
          }
          setLoading(false);
        });
        return () => {
          mounted = false;
          controller.abort();
        };
      }

      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        clearStoredAuth();
      }
    }
    setLoading(false);

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [tryRefreshToken]);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Login failed');
    }
    const data = await res.json();

    setUser(data.user);
    setToken(data.token);
    setStoredAuth(data.token, data.user);
    return data;
  };

  const googleLoginSuccess = (userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    setStoredAuth(tokenStr, userData);
  };

  // Exchange a Google access token for our own backend-issued JWT.
  const loginWithGoogle = async (accessToken: string): Promise<AuthResponse> => {
    const res = await fetch(apiUrl('/auth/google'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Google sign-in failed');
    }
    const data = await res.json();

    setUser(data.user);
    setToken(data.token);
    setStoredAuth(data.token, data.user);
    return data;
  };

  const register = async (name: string, email: string, password: string): Promise<{ message: string; user?: User; token?: string }> => {
    const res = await fetch(apiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Registration failed');
    }
    return res.json();
  };

  const forgotPassword = async (email: string): Promise<{ message: string }> => {
    const res = await fetch(apiUrl('/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Request failed');
    }
    return res.json();
  };

  const resetPassword = async (resetToken: string, password: string): Promise<{ message: string }> => {
    const res = await fetch(apiUrl('/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Reset failed');
    }
    return res.json();
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearStoredAuth();
  };

  const isAuthenticated = !!user && !!token && !isTokenExpired(token);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated,
      loading,
      login,
      googleLoginSuccess,
      loginWithGoogle,
      register,
      forgotPassword,
      resetPassword,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
