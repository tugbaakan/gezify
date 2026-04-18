#!/bin/sh
set -e
# Runtime config for the static SPA: Vite bakes VITE_* only at build time; Railway
# variables are reliable at container start. Safe JSON via jq (client id is public).
JSON="$(
  jq -n \
    --arg api "${VITE_API_URL:-}" \
    --arg google "${VITE_GOOGLE_CLIENT_ID:-}" \
    --arg redir "${VITE_GOOGLE_REDIRECT_URI:-}" \
    '{VITE_API_URL:$api,VITE_GOOGLE_CLIENT_ID:$google,VITE_GOOGLE_REDIRECT_URI:$redir}'
)"
printf 'window.__ENV = %s;\n' "$JSON" >/srv/env-config.js
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
