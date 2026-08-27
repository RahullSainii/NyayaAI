import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, apiUrl, ApiError, ApiTimeoutError, SESSION_EXPIRED_EVENT } from './api';

describe('API Layer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('apiUrl', () => {
    it('appends paths correctly to the base URL', () => {
      expect(apiUrl('/test')).toContain('/test');
    });
  });

  describe('apiFetch', () => {
    it('adds Authorization header if token exists in localStorage', async () => {
      localStorage.setItem('nyayaai_token', 'fake-jwt-token');
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      await apiFetch('/dummy');

      expect(fetch).toHaveBeenCalled();
      const fetchArgs = vi.mocked(fetch).mock.calls[0];
      const headers = fetchArgs[1]?.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    });

    it('returns Response object for non-200 responses (except 401)', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Bad Request' }),
      } as Response);

      const res = await apiFetch('/dummy');
      expect(res.status).toBe(400);
      expect(res.ok).toBe(false);
    });

    it('dispatches SESSION_EXPIRED_EVENT and throws ApiError on 401 Unauthorized', async () => {
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Unauthorized' }),
      } as Response);

      await expect(apiFetch('/dummy')).rejects.toThrow(ApiError);
      
      const eventArg = dispatchSpy.mock.calls.find(
        (call) => (call[0] as CustomEvent).type === SESSION_EXPIRED_EVENT
      );
      expect(eventArg).toBeDefined();
    });

    it('throws ApiTimeoutError if request exceeds timeout', async () => {
      vi.useFakeTimers();
      
      vi.mocked(fetch).mockImplementationOnce((_, init) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('The user aborted a request.', 'AbortError'));
            });
          }
        });
      });

      const promise = apiFetch('/dummy', { timeoutMs: 100 });
      
      vi.advanceTimersByTime(101);
      
      await expect(promise).rejects.toThrow(ApiTimeoutError);
      vi.useRealTimers();
    });
  });
});
