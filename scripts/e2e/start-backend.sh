#!/usr/bin/env bash
set -euo pipefail

echo "[e2e:webServer:backend] Building backend before Playwright startup"
npm run build

echo "[e2e:webServer:backend] Starting backend on port ${PORT:-3005}"
exec env \
  NODE_ENV="${NODE_ENV:-test}" \
  E2E_START_SERVER="${E2E_START_SERVER:-true}" \
  PORT="${PORT:-3005}" \
  DATABASE_URL="${DATABASE_URL:-postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public}" \
  JWT_SECRET="${JWT_SECRET:-test-jwt-secret-key-for-testing}" \
  SESSION_SECRET="${SESSION_SECRET:-test-session-secret}" \
  CSRF_SECRET="${CSRF_SECRET:-test-csrf-secret}" \
  node dist/server.js
