export interface RuntimeConfig {
  VITE_GOOGLE_CLIENT_ID?: string;
  VITE_GOOGLE_OAUTH_CLIENT_ID?: string;
  VITE_API_BASE_URL?: string;
  VITE_SENTRY_DSN?: string;
}

declare global {
  interface Window {
    __NYAYA_CONFIG__?: RuntimeConfig;
  }
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() ?? '';
}

const runtimeConfig = typeof window !== 'undefined' ? window.__NYAYA_CONFIG__ : undefined;

export const GOOGLE_CLIENT_ID = firstNonEmpty(
  runtimeConfig?.VITE_GOOGLE_CLIENT_ID,
  runtimeConfig?.VITE_GOOGLE_OAUTH_CLIENT_ID,
  import.meta.env.VITE_GOOGLE_CLIENT_ID,
  import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
);
