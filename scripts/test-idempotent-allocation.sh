#!/usr/bin/env bash
set -euo pipefail

# Purpose: Verify idempotent allocation does not create duplicate transactions.

PORT="${PORT:-5000}"
BASE_URL="http://localhost:${PORT}"
COOKIE_FILE="/tmp/skywalker_idempo_sess"
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
  PORT=${PORT} npm run dev >/tmp/skywalker_idempo_server.log 2>&1 &
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

main() {
  echo "== Ensure port free =="; ensure_port_free
  echo "== Start server =="; start_server
  echo "== Wait health =="; wait_health
  echo "== Login =="; login_admin

  RAND=$RANDOM
  REP_CODE="REP-IDEMPO-${RAND}"
  PANEL="panel_idempo_${RAND}"

  echo "== Create representative =="
  REP_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d "{\"code\":\"${REP_CODE}\",\"name\":\"Idempo Rep ${RAND}\",\"panelUsername\":\"${PANEL}\"}" \
    "${BASE_URL}/api/representatives" | jq -r '.id')
  echo "REP_ID=${REP_ID}"

  echo "== Create invoice 50000 =="
  INV_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"50000","issueDate":"2025-08-11","dueDate":"2025-08-15","status":"unpaid","usageData":{"type":"manual","note":"idempo"}}' \
    "${BASE_URL}/api/invoices/create-manual" | jq -r '.invoice.id')
  echo "INV_ID=${INV_ID}"

  echo "== Create payment 50000 (auto-alloc) =="
  PAY_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"representativeId":'$REP_ID',"amount":"50000","paymentDate":"2025-08-11","description":"idempo test"}' \
    "${BASE_URL}/api/payments" | jq -r '.id')
  echo "PAY_ID=${PAY_ID}"

  echo "== Allocation details (after auto-alloc) =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    "${BASE_URL}/api/payments/${PAY_ID}/allocation-details" \
    | jq '{allocatedAmount: .allocatedAmount, invoiceId: .invoiceId, tx: .transactionId}'

  echo "== Try duplicate allocation (should be skipped) =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d '{"invoiceId":'$INV_ID'}' \
    -X POST "${BASE_URL}/api/payments/${PAY_ID}/allocate" | jq '{id, isAllocated, invoiceId}'

  echo "== Count payment transactions (should be 1) =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    "${BASE_URL}/api/financial/transactions?page=1&limit=10&entityType=payment&entityId=${PAY_ID}" \
    | jq '{count: .pagination.totalCount, types: [.data[].type], statuses: [.data[].status]}'

  echo "== Idempotency test complete =="
}

main "$@"
