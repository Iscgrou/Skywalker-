#!/usr/bin/env bash
set -euo pipefail

# Purpose: Seed multiple invoices and payments to produce many financial transactions,
# then verify paginated and filtered queries.

PORT="${PORT:-5000}"
BASE_URL="http://localhost:${PORT}"
COOKIE_FILE="/tmp/skywalker_multi_sess"
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
  PORT=${PORT} npm run dev >/tmp/skywalker_multi_server.log 2>&1 &
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

create_invoice() {
  local rep_id=$1
  local amount=$2
  local issue=$3
  local due=$4
  local payload
  payload=$(jq -n --argjson rep "$rep_id" --arg amt "$amount" --arg issue "$issue" --arg due "$due" '{representativeId: $rep, amount: $amt, issueDate: $issue, dueDate: $due, status: "unpaid", usageData: {type: "manual", batch: "multi"}}')
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d "$payload" \
    "${BASE_URL}/api/invoices/create-manual" | jq -r '.invoice.id'
}

create_payment() {
  local rep_id=$1
  local amount=$2
  local date=$3
  local desc=$4
  local payload
  payload=$(jq -n --argjson rep "$rep_id" --arg amt "$amount" --arg pdate "$date" --arg d "$desc" '{representativeId: $rep, amount: $amt, paymentDate: $pdate, description: $d}')
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d "$payload" \
    "${BASE_URL}/api/payments" | jq -r '.id'
}

main() {
  echo "== Ensure port free =="; ensure_port_free
  echo "== Start server =="; start_server
  echo "== Wait health =="; wait_health
  echo "== Login =="; login_admin

  RAND=$RANDOM
  REP_CODE="REP-MULTI-${RAND}"
  PANEL="panel_multi_${RAND}"

  echo "== Create representative =="
  REP_ID=$(curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
    -d "{\"code\":\"${REP_CODE}\",\"name\":\"Multi Rep ${RAND}\",\"panelUsername\":\"${PANEL}\"}" \
    "${BASE_URL}/api/representatives" | jq -r '.id')
  echo "REP_ID=${REP_ID}"

  echo "== Create 6 invoices (40000, 45000, 30000, 60000, 25000, 35000) =="
  INV_IDS=()
  AMOUNTS=(40000 45000 30000 60000 25000 35000)
  for i in ${!AMOUNTS[@]}; do
    issue_day=$(printf "%02d" $((9 + (i % 3))))
    due_day=$(printf "%02d" $((20 + (i % 4))))
    INV_ID=$(create_invoice "$REP_ID" "${AMOUNTS[$i]}" "2025-08-${issue_day}" "2025-08-${due_day}")
    INV_IDS+=("$INV_ID")
  done
  echo "Invoices: ${INV_IDS[*]}"

  echo "== Create 10 payments with mixed amounts/dates =="
  PAY_AMOUNTS=(15000 25000 40000 50000 10000 30000 20000 60000 18000 22000)
  PAY_DATES=("2025-08-10" "2025-08-10" "2025-08-11" "2025-08-11" "2025-08-11" "2025-08-11" "2025-08-12" "2025-08-12" "2025-08-12" "2025-08-12")
  for i in ${!PAY_AMOUNTS[@]}; do
    P=$(create_payment "$REP_ID" "${PAY_AMOUNTS[$i]}" "${PAY_DATES[$i]}" "multi seed p$((i+1))")
    echo "PAY_ID[$i]=$P"
  done

  echo "== Fetch transactions page 1 (limit 5) =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    "${BASE_URL}/api/financial/transactions?page=1&limit=5&representativeId=${REP_ID}&sort=newest" \
    | jq '{page: .pagination, types: [.data[].type], count: .pagination.totalCount}'

  echo "== Fetch transactions page 2 (limit 5) =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    "${BASE_URL}/api/financial/transactions?page=2&limit=5&representativeId=${REP_ID}&sort=newest" \
    | jq '{page: .pagination, sampleIds: [.data[].id]}'

  echo "== Filter by date range (2025-08-10..2025-08-11) =="
  curl -s -c "$COOKIE_FILE" -b "$COOKIE_FILE" \
    "${BASE_URL}/api/financial/transactions?page=1&limit=20&representativeId=${REP_ID}&dateFrom=2025-08-10&dateTo=2025-08-11&sort=oldest" \
    | jq '{count: .pagination.totalCount, dates: [.data[].createdAt]}'

  echo "== Multi-page seed and verification complete =="
}

main "$@"
