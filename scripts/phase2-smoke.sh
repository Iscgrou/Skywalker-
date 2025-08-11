#!/usr/bin/env bash
set -euo pipefail
BASE="http://localhost:5000"

# Login admin
curl -s -c /tmp/admin_cookies -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"mgr","password":"8679"}' >/dev/null

# Seed constraints
curl -s -b /tmp/admin_cookies -X POST "$BASE/api/init" -H 'Content-Type: application/json' -d '{}' | jq -r '.success'

# Create payments (partial + overpay)
for p in 20000 90000; do
  curl -s -b /tmp/admin_cookies -X POST "$BASE/api/payments" \
    -H 'Content-Type: application/json' \
    -d "{\"representativeId\":1,\"amount\":\"$p\",\"paymentDate\":\"1403/05/16\",\"description\":\"P2-$p\",\"invoiceId\":1}" \
  | jq -r '.id // .error'
done

# Validate + reconcile
curl -s -b /tmp/admin_cookies -X POST "$BASE/api/constraints/validate" -H 'Content-Type: application/json' -d '{"entityType":"representative","entityId":1}' | jq -r '.isValid'
curl -s -b /tmp/admin_cookies -X POST "$BASE/api/financial/reconcile" -H 'Content-Type: application/json' -d '{}' | jq -r '.message'

# Summaries
curl -s -b /tmp/admin_cookies "$BASE/api/payments/statistics" | jq '.'
curl -s -b /tmp/admin_cookies "$BASE/api/invoices/1" | jq '{id, amount, status}'
curl -s -b /tmp/admin_cookies "$BASE/api/invoices/statistics" | jq '.'
