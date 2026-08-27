/**
 * Centralized API client helper module for NyayaAI.
 *
 * Provides typed, resilient HTTP request handling with:
 * - Automatic base URL resolution via environment variables (`VITE_API_BASE_URL`).
 * - Auth token injection from `localStorage` into `Authorization` header.
 * - Automatic `Content-Type: application/json` header for JSON string payloads.
 * - Configurable request timeout with `AbortController` (defaults to 30s).
 * - Safe headers normalization supporting `Headers` instances, arrays, and plain objects.
 * - Session expiration event dispatching on 401 Unauthorized responses to avoid hard page reloads.
 * - Structured `ApiError` and `ApiTimeoutError` error throwing instead of hanging promises.
 *
 * @module lib/api
 */

/**
 * Event name dispatched on `window` when an authenticated API request receives a 401 response.
 * React context providers or navigation listeners can subscribe to this event to handle logout/redirect gracefully.
 */
export const SESSION_EXPIRED_EVENT = 'nyayaai:session-expired';

/**
 * Default timeout for API requests in milliseconds (30 seconds).
 */
export const DEFAULT_API_TIMEOUT_MS = 30_000;

/**
 * Detail object carried by the `SESSION_EXPIRED_EVENT` CustomEvent.
 */
export interface SessionExpiredEventDetail {
  /** The endpoint path that triggered the 401 status. */
  path: string;
  /** The HTTP status code (always 401). */
  status: number;
}

/**
 * Options accepted by `apiFetch`, extending standard `RequestInit`.
 */
export interface ApiFetchOptions extends RequestInit {
  /**
   * Request timeout in milliseconds.
   * Defaults to `DEFAULT_API_TIMEOUT_MS` (30,000ms).
   * Set to `0` or `Infinity` to disable timeout.
   */
  timeoutMs?: number;

  /**
   * If true, prevents automatic attachment of the `Authorization: Bearer <token>` header.
   * Useful for public endpoints where sending a stale token might cause unnecessary rejection.
   * Defaults to `false`.
   */
  skipAuth?: boolean;
}

/**
 * Custom error class thrown when an API request fails with an HTTP error status code (e.g. 401, 404, 500).
 */
export class ApiError extends Error {
  /** HTTP status code returned by the server. */
  readonly status: number;
  /** HTTP status text returned by the server. */
  readonly statusText: string;
  /** The raw Fetch Response object. */
  readonly response: Response;
  /** Optional parsed response body payload. */
  readonly data?: unknown;

  constructor(message: string, response: Response, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
    this.data = data;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Custom error class thrown when an API request exceeds the configured `timeoutMs` threshold.
 */
export class ApiTimeoutError extends Error {
  /** Timeout threshold in milliseconds that was exceeded. */
  readonly timeoutMs: number;
  /** The target URL of the timed-out request. */
  readonly url: string;

  constructor(timeoutMs: number, url: string) {
    super(`Request to ${url} timed out after ${timeoutMs}ms`);
    this.name = 'ApiTimeoutError';
    this.timeoutMs = timeoutMs;
    this.url = url;
    Object.setPrototypeOf(this, ApiTimeoutError.prototype);
  }
}

/**
 * Base API URL derived from the Vite environment variable, stripped of any trailing slash.
 */
const API_BASE_URL: string = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || ''
);

/**
 * Builds a normalized, absolute or origin-relative API endpoint URL.
 *
 * @param path - Relative endpoint path (e.g., `/auth/login` or `chat`).
 * @returns Full URL string combining `API_BASE_URL` and `path`.
 *
 * @example
 * ```ts
 * apiUrl('/auth/login'); // -> 'http://localhost:8000/auth/login' (or '/auth/login')
 * apiUrl('chat');        // -> 'http://localhost:8000/chat'
 * ```
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

/**
 * Wrapper around the browser's native `fetch` that automatically:
 * - Attaches the `Authorization: Bearer <token>` header when a token is present in `localStorage`.
 * - Sets `Content-Type: application/json` for string request bodies when not explicitly provided.
 * - Handles headers correctly whether passed as `Headers` instance, array, or object.
 * - Implements a timeout via `AbortController` (default: 30 seconds), while respecting any external `signal`.
 * - Emits a `SESSION_EXPIRED_EVENT` and throws `ApiError` on 401 responses instead of hanging or hard-redirecting.
 *
 * @param path - API path (relative to `API_BASE_URL`, e.g., `/chat` or `/auth/refresh`).
 * @param options - Extended fetch options including `timeoutMs` and `skipAuth`.
 * @returns Resolves with the raw `Response` for successful or non-401 responses.
 *
 * @throws {ApiTimeoutError} If the request exceeds `timeoutMs`.
 * @throws {ApiError} If the server responds with 401 Unauthorized for non-auth endpoints.
 * @throws {TypeError | DOMException} If network fails or external abort signal is triggered.
 *
 * @example
 * ```ts
 * // Basic GET request with default 30s timeout
 * const res = await apiFetch('/cases');
 * const data = await res.json();
 *
 * // POST request with custom timeout
 * const res = await apiFetch('/chat', {
 *   method: 'POST',
 *   body: JSON.stringify({ message: 'Hello NyayaAI' }),
 *   timeoutMs: 15000,
 * });
 * ```
 */
export async function apiFetch(
  path: string,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_API_TIMEOUT_MS,
    skipAuth = false,
    ...fetchOptions
  } = options;

  // Safely normalize headers supporting Headers instance, Record, or string[][]
  const headers = new Headers(fetchOptions.headers);

  // Inject Bearer token from localStorage if available and not skipped
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('nyayaai_token') : null;
  if (!skipAuth && token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Auto-set JSON content type for requests with a string body if not already specified
  if (
    fetchOptions.body &&
    typeof fetchOptions.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  // Configure timeout controller
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let didTimeout = false;

  if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, timeoutMs);
  }

  // If caller provided an external AbortSignal, link it to our controller
  const externalSignal = fetchOptions.signal;
  let externalAbortListener: (() => void) | undefined;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalAbortListener = () => {
        controller.abort(externalSignal.reason);
      };
      externalSignal.addEventListener('abort', externalAbortListener, { once: true });
    }
  }

  const url = apiUrl(path);

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });

    // Global 401 handler for non-auth endpoints: clear storage, dispatch event, throw error
    if (res.status === 401 && !path.startsWith('/auth/')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('nyayaai_token');
        localStorage.removeItem('nyayaai_user');
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<SessionExpiredEventDetail>(SESSION_EXPIRED_EVENT, {
            detail: {
              path,
              status: res.status,
            },
          })
        );
      }

      throw new ApiError('Session expired. Please log in again.', res);
    }

    return res;
  } catch (error: unknown) {
    if (didTimeout) {
      throw new ApiTimeoutError(timeoutMs, url);
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    if (externalSignal && externalAbortListener) {
      externalSignal.removeEventListener('abort', externalAbortListener);
    }
  }
}

