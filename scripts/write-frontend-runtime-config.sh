#!/bin/sh
set -eu

CONFIG_PATH=/usr/share/nginx/html/env-config.js

google_client_id="${VITE_GOOGLE_CLIENT_ID:-${VITE_GOOGLE_OAUTH_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}}"
api_base_url="${VITE_API_BASE_URL:-}"
sentry_dsn="${VITE_SENTRY_DSN:-}"

json_escape() {
  printf '%s' "$1" | sed 's/\/\\/g; s/"/\"/g'
}

cat > "$CONFIG_PATH" <<EOF
window.__NYAYA_CONFIG__ = {
  VITE_GOOGLE_CLIENT_ID: "$(json_escape "$google_client_id")",
  VITE_GOOGLE_OAUTH_CLIENT_ID: "$(json_escape "$google_client_id")",
  VITE_API_BASE_URL: "$(json_escape "$api_base_url")",
  VITE_SENTRY_DSN: "$(json_escape "$sentry_dsn")"
};
EOF