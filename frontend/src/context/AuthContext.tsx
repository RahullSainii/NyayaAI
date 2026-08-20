import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiUrl } from '../lib/api';
import type { User, AuthResponse, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Decode a JWT payload without any library (browser-only).
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): { exp?: number; [key: string]: any } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Attempt to silently refresh an expired token using the /auth/refresh
  // endpoint added in Day 2. Falls back to logout if the refresh fails.
  const tryRefreshToken = useCallback(async (currentToken: string): Promise<string | null> => {
    try {
      const res = await fetch(apiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('nyayaai_token', data.token);
      localStorage.setItem('nyayaai_user', JSON.stringify(data.user));
      return data.token;
    } catch {
      return null;
    }
  }, []);

  // On mount: restore session, checking expiry.
  useEffect(() => {
    const savedUser = localStorage.getItem('nyayaai_user');
    const savedToken = localStorage.getItem('nyayaai_token');

    if (savedUser && savedToken) {
      if (isTokenExpired(savedToken)) {
        // Token is expired — try a silent refresh.
        tryRefreshToken(savedToken).then((newToken) => {
          if (!newToken) {
            // Refresh failed — force re-login.
            localStorage.removeItem('nyayaai_user');
            localStorage.removeItem('nyayaai_token');
          }
          setLoading(false);
        });
        return; // loading stays true until refresh completes
      }

      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem('nyayaai_user');
        localStorage.removeItem('nyayaai_token');
      }
    }
    setLoading(false);
  }, [tryRefreshToken]);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await fetch(apiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('nyayaai_token', data.token);
    localStorage.setItem('nyayaai_user', JSON.stringify(data.user));
    return data;
  };

  const googleLoginSuccess = (userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    localStorage.setItem('nyayaai_token', tokenStr);
    localStorage.setItem('nyayaai_user', JSON.stringify(userData));
  };

  // Exchange a Google access token for our own backend-issued JWT.
  const loginWithGoogle = async (accessToken: string): Promise<AuthResponse> => {
    const res = await fetch(apiUrl('/auth/google'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Google sign-in failed');

    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('nyayaai_token', data.token);
    localStorage.setItem('nyayaai_user', JSON.stringify(data.user));
    return data;
  };

  const register = async (name: string, email: string, password: string): Promise<{ message: string; user?: User; token?: string }> => {
    const res = await fetch(apiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    return data;
  };

  const forgotPassword = async (email: string): Promise<{ message: string }> => {
    const res = await fetch(apiUrl('/auth/forgot-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
  };

  const resetPassword = async (resetToken: string, password: string): Promise<{ message: string }> => {
    const res = await fetch(apiUrl('/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Reset failed');
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('nyayaai_token');
    localStorage.removeItem('nyayaai_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token && !!user,
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
