/**
 * Centralized API helper with auth token injection and 401 handling.
 *
 * All backend calls should go through `apiFetch` or `apiUrl` so that
 * token refresh, logout-on-expiry, and base URL resolution are handled
 * in a single place.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''

/**
 * Build a full API URL from a relative path (e.g. `/auth/login`).
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

/**
 * Wrapper around `fetch` that automatically:
 *  - Attaches the Authorization header when a token exists in localStorage.
 *  - Sets Content-Type to JSON for POST/PUT/PATCH bodies.
 *  - Redirects to /login on 401 responses (token expired / invalid).
 *
 * Returns the raw Response so callers can handle status codes themselves.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('nyayaai_token')
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Auto-set JSON content type for requests with a body (unless overridden).
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(apiUrl(path), { ...options, headers })

  // Global 401 handler: clear stale credentials and redirect to login.
  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('nyayaai_token')
    localStorage.removeItem('nyayaai_user')
    window.location.href = '/login'
    // Return a never-resolving promise so callers don't process the 401 body.
    return new Promise(() => {})
  }

  return res
}
