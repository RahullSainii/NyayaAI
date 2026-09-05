import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { normalizeSectionInput, toMappingResult, type MappingResult } from '../lib/sections';
import type { ApiMappingResult } from '../types';

const RECENTS_KEY = 'nyayaai_recent_sections';
const MAX_RECENTS = 6;

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string').slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

export type LookupStatus = 'idle' | 'loading' | 'done' | 'error';

/**
 * IPC → BNS lookup against `/map`.
 *
 * Shared by the landing hero and the mapping page so both stay in step: same
 * normalisation, same three outcomes, same recent history. In-flight requests
 * are aborted when a newer lookup starts, so fast typing can't render a stale
 * answer.
 */
export function useSectionLookup() {
  const [status, setStatus] = useState<LookupStatus>('idle');
  const [result, setResult] = useState<MappingResult | null>(null);
  const [error, setError] = useState<string>('');
  const [recents, setRecents] = useState<string[]>(readRecents);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const rememberSection = useCallback((section: string) => {
    setRecents((prev) => {
      const next = [section, ...prev.filter((s) => s !== section)].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — history is a convenience, not a requirement */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus('idle');
    setResult(null);
    setError('');
  }, []);

  const lookup = useCallback(
    async (rawValue: string): Promise<MappingResult | null> => {
      const section = normalizeSectionInput(rawValue);
      if (!section) {
        reset();
        return null;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus('loading');
      setError('');

      try {
        const response = await apiFetch(`/map?ipc=${encodeURIComponent(section)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));

        const payload: ApiMappingResult = await response.json();
        const mapped = toMappingResult(payload);

        if (controller.signal.aborted) return null;
        setResult(mapped);
        setStatus('done');
        if (mapped.outcome !== 'unindexed') rememberSection(mapped.ipcSection);
        return mapped;
      } catch (err) {
        if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return null;
        setResult(null);
        setStatus('error');
        setError('Could not reach the mapping service. Check your connection and try again.');
        return null;
      }
    },
    [reset, rememberSection],
  );

  return { status, result, error, recents, lookup, reset };
}
