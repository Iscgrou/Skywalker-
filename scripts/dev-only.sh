#!/usr/bin/env bash
set -euo pipefail

# Load .env if present
if [ -f ".env" ]; then
  # shellcheck disable=SC1091
  source .env
fi

PORT="${PORT:-5000}"

echo "== Ensuring no other process is listening on port ${PORT} =="
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
else
  # Fallback to lsof
  PIDS=$(lsof -ti tcp:"${PORT}" || true)
  if [ -n "${PIDS}" ]; then
    echo "Killing PIDs: ${PIDS}"
    kill -9 ${PIDS} || true
  fi
fi

echo "== Starting dev server on :${PORT} =="
npm run dev
