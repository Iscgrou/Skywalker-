#!/usr/bin/env bash
set -euo pipefail

# Purpose: Phase 3 smoke - create multiple unallocated payments, then run batch auto-allocation and verify.

PORT="${PORT:-5000}"
BASE_URL="http://localhost:${PORT}"
COOKIE_FILE="/tmp/skywalker_phase3_sess"
rm -f "$COOKIE_FILE" || true

ensure_port_free() {
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  else
    PIDS=$(lsof -ti tcp:"${PORT}" || true)
    [ -n "${PIDS}" ] && kill -9 ${PIDS} || true
  fi
}

start_server() {
  PORT=${PORT} npm run dev >/tmp/skywalker_phase3_server.log 2>&1 &
  SERVER_LAUNCH_PID=$!
  trap 'pkill -f "tsx server/index.ts" || true; kill ${SERVER_LAUNCH_PID} >/dev/null 2>&1 || true' EXIT
}

wait_health() {
  for i in {1..40}; do
    if curl -sf "${BASE_URL}/health" >/dev/null; then
      echo "Healthy"
      return 0
    fi
    sleep 0.5
  done
  echo "Health check failed" >&2
  exit 1
}

login_admin() {
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"username":"mgr","password":"8679"}' \
    "${BASE_URL}/api/auth/login" | jq -r '.success'
}

json() {
  jq -n "$1"
}

main() {
  echo "== Ensure port free =="; ensure_port_free
  echo "== Start server =="; start_server
  echo "== Wait health =="; wait_health
  echo "== Login =="; login_admin

  RAND=$RANDOM
  REP_CODE="REP-P3-${RAND}"
  PANEL="panel_p3_${RAND}"

  echo "== Create representative =="
  REP_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d "{\"code\":\"${REP_CODE}\",\"name\":\"Phase3 Rep ${RAND}\",\"panelUsername\":\"${PANEL}\"}" \
    "${BASE_URL}/api/representatives" | jq -r '.id')
  echo "REP_ID=${REP_ID}"

  echo "== Create 3 invoices (30000, 40000, 50000) =="
  I1=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"30000","issueDate":"2025-08-10","dueDate":"2025-08-20","status":"unpaid","usageData":{"type":"manual","batch":"p3"}}' \
    "${BASE_URL}/api/invoices/create-manual" | jq -r '.invoice.id')
  I2=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"40000","issueDate":"2025-08-10","dueDate":"2025-08-21","status":"unpaid","usageData":{"type":"manual","batch":"p3"}}' \
    "${BASE_URL}/api/invoices/create-manual" | jq -r '.invoice.id')
  I3=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"50000","issueDate":"2025-08-10","dueDate":"2025-08-22","status":"unpaid","usageData":{"type":"manual","batch":"p3"}}' \
    "${BASE_URL}/api/invoices/create-manual" | jq -r '.invoice.id')
  echo "Invoices: $I1 $I2 $I3"

  echo "== Create unallocated payments (skip auto) =="
  P1=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"15000","paymentDate":"2025-08-11","description":"p3-1"}' \
    "${BASE_URL}/api/payments?skipAuto=true" | jq -r '.id')
  P2=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"25000","paymentDate":"2025-08-11","description":"p3-2"}' \
    "${BASE_URL}/api/payments?skipAuto=true" | jq -r '.id')
  P3=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"60000","paymentDate":"2025-08-11","description":"p3-3"}' \
    "${BASE_URL}/api/payments?skipAuto=true" | jq -r '.id')
  echo "Payments: $P1 $P2 $P3"

  echo "== List unallocated payments =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    "${BASE_URL}/api/payments/unallocated?representativeId=${REP_ID}" | jq '[.[] | {id, amount, isAllocated}]'

  echo "== Run batch auto-allocation =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    -X POST "${BASE_URL}/api/payments/auto-allocate/batch/${REP_ID}" | jq '{success, allocated, totalAmount, details}'

  echo "== Phase 3 auto-allocation smoke complete =="
}

main "$@"
