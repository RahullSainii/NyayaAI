#!/bin/sh
set -eu

CONFIG_PATH=/usr/share/nginx/html/env-config.js

google_client_id="${VITE_GOOGLE_CLIENT_ID:-${VITE_GOOGLE_OAUTH_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}}"
api_base_url="${VITE_API_BASE_URL:-}"
sentry_dsn="${VITE_SENTRY_DSN:-}"

json_escape() {
  printf '%s' "$1" | sed 's/\/\\/g; s/"/\"/g'
}

# Build the config object, only including non-empty values.
# Uses `window.__NYAYA_CONFIG__ = window.__NYAYA_CONFIG__ || {}` to preserve
# any values that Vite baked into the bundle at build time — we only override
# keys that have a real runtime value.
{
  echo '// Written by entrypoint script at container startup.'
  echo 'window.__NYAYA_CONFIG__ = window.__NYAYA_CONFIG__ || {};'
  [ -n "$google_client_id" ] && echo "window.__NYAYA_CONFIG__.VITE_GOOGLE_CLIENT_ID = \"$(json_escape "$google_client_id")\";"
  [ -n "$google_client_id" ] && echo "window.__NYAYA_CONFIG__.VITE_GOOGLE_OAUTH_CLIENT_ID = \"$(json_escape "$google_client_id")\";"
  [ -n "$api_base_url" ]    && echo "window.__NYAYA_CONFIG__.VITE_API_BASE_URL = \"$(json_escape "$api_base_url")\";"
  [ -n "$sentry_dsn" ]      && echo "window.__NYAYA_CONFIG__.VITE_SENTRY_DSN = \"$(json_escape "$sentry_dsn")\";"
  echo ''
} > "$CONFIG_PATH"

echo "[NyayaAI] env-config.js written — VITE_GOOGLE_CLIENT_ID=$( [ -n "$google_client_id" ] && echo 'set' || echo 'EMPTY' ) VITE_API_BASE_URL=$( [ -n "$api_base_url" ] && echo 'set' || echo 'EMPTY' )"