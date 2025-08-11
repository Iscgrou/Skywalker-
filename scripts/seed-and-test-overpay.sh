#!/usr/bin/env bash
set -euo pipefail

# Purpose: Seed an overpayment scenario to verify split allocation and paginated transactions.

PORT="${PORT:-5000}"
BASE_URL="http://localhost:${PORT}"
COOKIE_FILE="/tmp/skywalker_overpay_sess"
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
PORT=${PORT} npm run dev >/tmp/skywalker_seed_overpay_server.log 2>&1 &
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
REP_CODE="REP-OP-${RAND}"
PANEL="panel_op_${RAND}"

echo "== Create representative ${REP_CODE} =="
REP_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "{\"code\":\"${REP_CODE}\",\"name\":\"Overpay Rep ${RAND}\",\"panelUsername\":\"${PANEL}\"}" \
  "${BASE_URL}/api/representatives" | jq -r '.id')

if [[ -z "${REP_ID}" || "${REP_ID}" == "null" ]]; then
  echo "Representative creation failed" >&2
  exit 1
fi
echo "REP_ID=${REP_ID}"

echo "== Create manual invoice 100000 =="
INVOICE_PAYLOAD=$(cat <<JSON
{
  "representativeId": ${REP_ID},
  "amount": "100000",
  "issueDate": "2025-08-11",
  "dueDate": "2025-08-20",
  "status": "unpaid",
  "usageData": {"type":"manual","note":"overpay-seed"}
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

echo "== Create first payment 80000 (auto-alloc) =="
PAY1=$(cat <<JSON
{
  "representativeId": ${REP_ID},
  "amount": "80000",
  "paymentDate": "2025-08-11",
  "description": "overpay test p1"
}
JSON
)
PAY1_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "${PAY1}" \
  "${BASE_URL}/api/payments" | jq -r '.id')
echo "PAY1_ID=${PAY1_ID}"

echo "== Create second payment 50000 (should split 20000 allocated + 30000 remainder) =="
PAY2=$(cat <<JSON
{
  "representativeId": ${REP_ID},
  "amount": "50000",
  "paymentDate": "2025-08-11",
  "description": "overpay test p2"
}
JSON
)
PAY2_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d "${PAY2}" \
  "${BASE_URL}/api/payments" | jq -r '.id')
echo "PAY2_ID=${PAY2_ID}"

echo "== Allocation details for both payments =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "${BASE_URL}/api/payments/${PAY1_ID}/allocation-details" | jq '{p1_alloc: {paymentId: .payment.id, allocatedAmount: .allocatedAmount, invoiceId: .invoiceId, remainderId: .remainderPayment?.id, tx: .transactionId}}'

curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "${BASE_URL}/api/payments/${PAY2_ID}/allocation-details" | jq '{p2_alloc: {paymentId: .payment.id, allocatedAmount: .allocatedAmount, invoiceId: .invoiceId, remainderId: .remainderPayment?.id, tx: .transactionId}}'

echo "== List payments for representative (show unallocated remainder) =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "${BASE_URL}/api/payments/representative/${REP_ID}" | jq '[.[] | {id, amount, isAllocated, invoiceId, description}]'

echo "== Transactions (paginated) for representative =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "${BASE_URL}/api/financial/transactions?page=1&limit=10&representativeId=${REP_ID}&sort=newest" \
  | jq '{pagination: .pagination, types: [.data[].type], statuses: [.data[].status], first: (.data[0] // null)}'

echo "== Overpay seed and verification complete =="
