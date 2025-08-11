#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5000}"
BASE="http://localhost:${PORT}"

# Login
curl -s -c /tmp/sess -b /tmp/sess -H "Content-Type: application/json" \
  -d '{"username":"mgr","password":"8679"}' \
  "${BASE}/api/auth/login" >/dev/null

repId=1

# Create a BALANCE_CHECK constraint with very low maxDebt to force violation
curl -s -c /tmp/sess -b /tmp/sess -H "Content-Type: application/json" \
  -d '{"constraintType":"BALANCE_CHECK","entityType":"representative","entityId":'"${repId}"',"constraintRule":{"maxDebt":1}}' \
  "${BASE}/api/constraints" | jq -r '.id'

# Validate constraints (expect violations)
curl -s -c /tmp/sess -b /tmp/sess -H "Content-Type: application/json" \
  -d '{"entityType":"representative","entityId":'"${repId}"'}' \
  "${BASE}/api/constraints/validate" | jq

# Reconcile representative (generates financial transaction)
curl -s -c /tmp/sess -b /tmp/sess -X POST "${BASE}/api/reconcile/${repId}" | jq

# List financial transactions
curl -s -c /tmp/sess -b /tmp/sess "${BASE}/api/financial/transactions" | jq '.[0:5]'
