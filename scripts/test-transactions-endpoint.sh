#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:${PORT:-5000}"
COOKIE_FILE="/tmp/skywalker_tx_sess"
rm -f "$COOKIE_FILE" || true

echo "== Login =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -d '{"username":"mgr","password":"8679"}' \
  "$BASE_URL/api/auth/login" >/dev/null

echo "== Page 1 (default) =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "$BASE_URL/api/financial/transactions?page=1&limit=5" | jq '.pagination, (.data | length)'

echo "== Filter: status=COMPLETED, type=PAYMENT_ALLOCATE =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "$BASE_URL/api/financial/transactions?page=1&limit=5&status=COMPLETED&type=PAYMENT_ALLOCATE" | jq '.pagination, (.data | length)'

echo "== Filter: representativeId=1 sort=oldest =="
curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
  "$BASE_URL/api/financial/transactions?page=1&limit=5&representativeId=1&sort=oldest" | jq '.pagination, (.data[0] | {transactionId, createdAt})'

echo "Done"
