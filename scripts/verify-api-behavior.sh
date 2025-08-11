#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5000}"
BASE="http://localhost:${PORT}"

echo "== Verifying API behavior against ${BASE} =="

echo "-- Unknown /api should return JSON 404 --"
curl -s -i "${BASE}/api/_nope_" | sed -n '1,12p'

echo
echo "-- Login as admin --"
curl -s -c /tmp/sess -b /tmp/sess -H "Content-Type: application/json" \
  -d '{"username":"mgr","password":"8679"}' \
  "${BASE}/api/auth/login" | jq -r '.success'

echo
echo "-- Allocation details (alias + canonical) --"
for url in \
  "/api/payments/1/allocation-details" \
  "/api/finance/payments/1/allocation"; do
  echo "GET ${url}"
  curl -s -i -c /tmp/sess -b /tmp/sess "${BASE}${url}" | sed -n '1,20p'
  echo
done

echo "-- Representative financial summary (alias + canonical) --"
for url in \
  "/api/representatives/1/financial-summary" \
  "/api/finance/representatives/1/summary"; do
  echo "GET ${url}"
  curl -s -i -c /tmp/sess -b /tmp/sess "${BASE}${url}" | sed -n '1,20p'
  echo
done

echo "== Done =="
