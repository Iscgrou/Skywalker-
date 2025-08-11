#!/usr/bin/env bash
set -euo pipefail

# Purpose: Seed minimal data (rep, invoice, payment) to generate financial transactions,
# then query the paginated /api/financial/transactions endpoint to verify it returns data.

PORT="${PORT:-5000}"
BASE_URL="http://localhost:${PORT}"
COOKIE_FILE="/tmp/skywalker_seed_tx_sess"
rm -f "$COOKIE_FILE" || true

echo "== Ensure port ${PORT} is free =="
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
else
  PIDS=$(lsof -ti tcp:"${PORT}" || true)
  if [ -n "${PIDS}" ]; then
    echo "Killing PIDs: ${PIDS}"
    kill -9 ${PIDS} || true
  fi
fi

echo "== Start dev server in background =="
PORT=${PORT} npm run dev >/tmp/skywalker_seed_tx_server.log 2>&1 &
SERVER_LAUNCH_PID=$!

cleanup() {
  echo "\n== Cleanup: stopping dev server =="
  pkill -f 'tsx server/index.ts' || true
  kill ${SERVER_LAUNCH_PID} >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "== Wait for /health =="
for i in {1..40}; do
  if curl -sf "${BASE_URL}/health" >/dev/null; then
    echo "Healthy"
    break
  fi
  sleep 0.5
  if [[ $i -eq 40 ]]; then
    echo "Health check failed" >&2
    exit 1
  fi
done

echo "== Login as admin =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d '{"username":"mgr","password":"8679"}' \
  "${BASE_URL}/api/auth/login" | jq -r '.success'

RAND=$RANDOM
REP_CODE="REP-TX-${RAND}"
PANEL="panel_tx_${RAND}"

echo "== Create representative ${REP_CODE} =="
REP_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"${REP_CODE}\",\"name\":\"Test TX Rep ${RAND}\",\"panelUsername\":\"${PANEL}\"}" \
  "${BASE_URL}/api/representatives" | jq -r '.id')

if [[ -z "${REP_ID}" || "${REP_ID}" == "null" ]]; then
  echo "Representative creation failed" >&2
  exit 1
fi
echo "REP_ID=${REP_ID}"

echo "== Create manual invoice =="
INVOICE_PAYLOAD=$(cat <<JSON
{
  "representativeId": ${REP_ID},
  "amount": "100000",
  "issueDate": "2025-08-11",
  "dueDate": "2025-08-20",
  "status": "unpaid",
  "usageData": {"type":"manual","note":"seed"}
}
JSON
)
INV_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "${INVOICE_PAYLOAD}" \
  "${BASE_URL}/api/invoices/create-manual" | jq -r '.invoice.id')

if [[ -z "${INV_ID}" || "${INV_ID}" == "null" ]]; then
  echo "Invoice creation failed" >&2
  exit 1
fi
echo "INV_ID=${INV_ID}"

echo "== Create payment (auto-allocates to oldest unpaid invoice) =="
PAYLOAD=$(cat <<JSON
{
  "representativeId": ${REP_ID},
  "amount": "60000",
  "paymentDate": "2025-08-11",
  "description": "seed test"
}
JSON
)
PAY_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "${PAYLOAD}" \
  "${BASE_URL}/api/payments" | jq -r '.id')

if [[ -z "${PAY_ID}" || "${PAY_ID}" == "null" ]]; then
  echo "Payment creation failed" >&2
  exit 1
fi
echo "PAY_ID=${PAY_ID}"

echo "== Allocation details for payment =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "${BASE_URL}/api/payments/${PAY_ID}/allocation-details" | jq '{paymentId: .payment.id, invoiceId: .invoiceId, allocatedAmount: .allocatedAmount, transactionId: .transactionId}'

echo "== Transactions (paginated) for representative =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "${BASE_URL}/api/financial/transactions?page=1&limit=5&representativeId=${REP_ID}" | jq '{pagination: .pagination, first: (.data[0] // null)}'

echo "== All good =="
