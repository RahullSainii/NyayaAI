#!/bin/sh
set -eu

CONFIG_PATH=/usr/share/nginx/html/env-config.js

google_client_id="${VITE_GOOGLE_CLIENT_ID:-${VITE_GOOGLE_OAUTH_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}}"
api_base_url="${VITE_API_BASE_URL:-}"
sentry_dsn="${VITE_SENTRY_DSN:-}"

# If no runtime env vars are set, keep the build-time env-config.js untouched.
# This avoids overwriting values that Vite baked into the bundle during build.
if [ -z "$google_client_id" ] && [ -z "$api_base_url" ] && [ -z "$sentry_dsn" ]; then
  echo "[NyayaAI] No runtime env vars set — keeping build-time env-config.js"
  exit 0
fi

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

echo "[NyayaAI] Runtime env-config.js written with VITE_GOOGLE_CLIENT_ID=$( [ -n "$google_client_id" ] && echo 'set' || echo 'empty' )"