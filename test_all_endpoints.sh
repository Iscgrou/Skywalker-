#!/bin/bash
# SHERLOCK v2.0 Atomic Endpoint Testing Script
# Complete API Testing with Data Simulation

BASE_URL="http://localhost:5000"
ADMIN_COOKIE=""
CRM_COOKIE=""

echo "🔬 SHERLOCK v2.0 - شروع تست اتمیک تمام اندپوینت‌ها"
echo "================================================"

# Ensure only one server (dev) is listening to avoid SPA fallback on /api
if pgrep -fa "node dist/index.js" >/dev/null 2>&1; then
    echo "⚠️ Detected production server on port 5000; stopping to avoid route collisions..."
    pkill -f "node dist/index.js" || true
    sleep 1
fi

# Helper function to extract cookies
extract_cookie() {
    echo "$1" | grep -o 'set-cookie: [^;]*' | cut -d' ' -f2-
}

# Helper function to make authenticated requests
admin_request() {
    curl -s -H "Cookie: $ADMIN_COOKIE" "$@"
}

crm_request() {
    curl -s -H "Cookie: $CRM_COOKIE" "$@"
}

echo "🔑 === AUTHENTICATION TESTS ==="

# Test 1: Health Check
echo -n "1. Health Check: "
HEALTH=$(curl -s $BASE_URL/health | jq -r '.status' 2>/dev/null || echo "FAIL")
echo $HEALTH

# Test 2: Admin Login
echo -n "2. Admin Login: "
ADMIN_LOGIN=$(curl -s -c /tmp/admin_cookies -X POST $BASE_URL/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"mgr","password":"8679"}')
if echo "$ADMIN_LOGIN" | jq -e '.success' >/dev/null 2>&1; then
    ADMIN_COOKIE=$(cat /tmp/admin_cookies | grep -v '#' | awk '{print $6"="$7}' | tr '\n' ';')
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 3: CRM Login 
echo -n "3. CRM Login: "
CRM_LOGIN=$(curl -s -c /tmp/crm_cookies -X POST $BASE_URL/api/crm/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"crm","password":"8679"}')
if echo "$CRM_LOGIN" | jq -e '.success' >/dev/null 2>&1; then
    CRM_COOKIE=$(cat /tmp/crm_cookies | grep -v '#' | awk '{print $6"="$7}' | tr '\n' ';')
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 4: Admin Auth Check
echo -n "4. Admin Auth Check: "
AUTH_CHECK=$(admin_request $BASE_URL/api/auth/check)
if echo "$AUTH_CHECK" | jq -e '.authenticated' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 5: CRM Auth Check
echo -n "5. CRM Auth Check: "
CRM_AUTH_CHECK=$(crm_request $BASE_URL/api/crm/auth/user)
if echo "$CRM_AUTH_CHECK" | jq -e '.username' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "💾 === DASHBOARD & DATA TESTS ==="

# Test 6: Dashboard Data
echo -n "6. Dashboard Data: "
DASHBOARD=$(admin_request $BASE_URL/api/dashboard)
if echo "$DASHBOARD" | jq -e '.totalRevenue' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 7: Representatives List
echo -n "7. Representatives List: "
REPS=$(admin_request $BASE_URL/api/representatives)
if echo "$REPS" | jq -e '. | type == "array"' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 8: Representatives Statistics
echo -n "8. Representatives Statistics: "
REP_STATS=$(admin_request $BASE_URL/api/representatives/statistics)
if echo "$REP_STATS" | jq -e '.totalCount' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "🏗️ === CREATE REPRESENTATIVE TEST ==="

# Test 9: Create Representative
echo -n "9. Create Representative: "
CREATE_REP=$(admin_request -X POST $BASE_URL/api/representatives \
    -H "Content-Type: application/json" \
    -d '{
        "code": "TEST001",
        "name": "فروشگاه تست",
        "ownerName": "علی تست",
        "panelUsername": "test001",
        "phone": "09123456789",
        "publicId": "test001-public"
    }')
if echo "$CREATE_REP" | jq -e '.id' >/dev/null 2>&1; then
    REP_ID=$(echo "$CREATE_REP" | jq -r '.id')
    echo "✅ SUCCESS (ID: $REP_ID)"
else
    echo "❌ FAILED"
    REP_ID=1  # fallback
fi

echo ""
echo "📄 === INVOICE TESTS ==="

# Test 10: Create Manual Invoice
echo -n "10. Create Manual Invoice: "
CREATE_INVOICE=$(admin_request -X POST $BASE_URL/api/invoices/create-manual \
    -H "Content-Type: application/json" \
    -d '{
        "representativeId": '$REP_ID',
        "amount": "100000",
        "issueDate": "1403/05/15",
        "description": "فاکتور تست"
    }')
if echo "$CREATE_INVOICE" | jq -e '.success' >/dev/null 2>&1; then
    INVOICE_ID=$(echo "$CREATE_INVOICE" | jq -r '.invoice.id')
    echo "✅ SUCCESS (ID: $INVOICE_ID)"
else
    echo "❌ FAILED"
    INVOICE_ID=1  # fallback
fi

# Test 11: Get Invoices List
echo -n "11. Get Invoices List: "
INVOICES=$(admin_request $BASE_URL/api/invoices)
if echo "$INVOICES" | jq -e '. | type == "array"' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 12: Get Invoice Statistics
echo -n "12. Get Invoice Statistics: "
INV_STATS=$(admin_request $BASE_URL/api/invoices/statistics)
if echo "$INV_STATS" | jq -e '.totalInvoices' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "💰 === PAYMENT TESTS ==="

# Test 13: Create Payment
echo -n "13. Create Payment: "
CREATE_PAYMENT=$(admin_request -X POST $BASE_URL/api/payments \
    -H "Content-Type: application/json" \
    -d '{
        "representativeId": '$REP_ID',
        "amount": "50000",
        "paymentDate": "1403/05/16",
        "description": "پرداخت تست"
    }')
if echo "$CREATE_PAYMENT" | jq -e '.id' >/dev/null 2>&1; then
    PAYMENT_ID=$(echo "$CREATE_PAYMENT" | jq -r '.id')
    echo "✅ SUCCESS (ID: $PAYMENT_ID)"
else
    echo "❌ FAILED"
    PAYMENT_ID=1  # fallback
fi

# Test 14: Get Payments List
echo -n "14. Get Payments List: "
PAYMENTS=$(admin_request $BASE_URL/api/payments)
if echo "$PAYMENTS" | jq -e '. | type == "array"' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 15: Payment Statistics
echo -n "15. Payment Statistics: "
PAY_STATS=$(admin_request $BASE_URL/api/payments/statistics)
if echo "$PAY_STATS" | jq -e '.totalAmount' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 15.1: Payment Allocation Details (audit)
echo -n "15.1 Payment Allocation Details (audit): "
ALLOC_DETAILS=$(admin_request $BASE_URL/api/payments/${PAYMENT_ID:-1}/allocation-details)
if echo "$ALLOC_DETAILS" | jq -e '.payment.id' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 15.2: Finance Alias for Allocation Details
echo -n "15.2 Finance Allocation Alias: "
FIN_ALLOC=$(admin_request $BASE_URL/api/finance/payments/${PAYMENT_ID:-1}/allocation)
if echo "$FIN_ALLOC" | jq -e '.payment.id' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "🔧 === CRM SPECIFIC TESTS ==="

# Test 16: CRM Representatives List
echo -n "16. CRM Representatives List: "
CRM_REPS=$(crm_request $BASE_URL/api/crm/representatives)
if echo "$CRM_REPS" | jq -e '.data | type == "array"' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 17: CRM Representatives Statistics
echo -n "17. CRM Representatives Statistics: "
CRM_REP_STATS=$(crm_request $BASE_URL/api/crm/representatives/statistics)
if echo "$CRM_REP_STATS" | jq -e '.totalCount' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 18: CRM Payment Creation
echo -n "18. CRM Payment Creation: "
CRM_PAYMENT=$(crm_request -X POST $BASE_URL/api/crm/payments \
    -H "Content-Type: application/json" \
    -d '{
        "representativeId": '$REP_ID',
        "amount": "25000",
        "paymentDate": "1403/05/17",
        "description": "پرداخت CRM تست"
    }')
if echo "$CRM_PAYMENT" | jq -e '.id' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "🔄 === SYNCHRONIZATION TESTS ==="

# Test 19: Debt Synchronization
echo -n "19. Debt Synchronization: "
DEBT_SYNC=$(admin_request -X POST $BASE_URL/api/crm/representatives/$REP_ID/sync-debt \
    -H "Content-Type: application/json" \
    -d '{
        "reason": "test_sync",
        "timestamp": "'$(date -Iseconds)'"
    }')
if echo "$DEBT_SYNC" | jq -e '.success' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 20: Dashboard Refresh
echo -n "20. Dashboard Stats Refresh: "
REFRESH_STATS=$(admin_request -X POST $BASE_URL/api/dashboard/refresh-stats \
    -H "Content-Type: application/json" \
    -d '{"reason": "test_refresh"}')
if echo "$REFRESH_STATS" | jq -e '.success' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "🤖 === AI SYSTEM TESTS ==="

# Test 21: AI Status
echo -n "21. AI System Status: "
AI_STATUS=$(admin_request $BASE_URL/api/ai/status)
if echo "$AI_STATUS" | jq -e '.status' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 22: AI Test Connection
echo -n "22. AI Test Connection: "
AI_TEST=$(admin_request -X POST $BASE_URL/api/ai/test-connection)
if echo "$AI_TEST" | jq -e '.status' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "⚙️ === SETTINGS & CONFIGURATION TESTS ==="

# Test 23: Get Settings
echo -n "23. Get Settings (sample): "
SETTINGS=$(admin_request $BASE_URL/api/settings/portal_title)
if [ "$SETTINGS" != "" ]; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 24: CRM Settings
echo -n "24. CRM Settings: "
CRM_SETTINGS=$(crm_request $BASE_URL/api/crm/settings)
if echo "$CRM_SETTINGS" | jq -e '.success' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "📊 === WORKSPACE & TASK TESTS ==="

# Test 25: Workspace Tasks
echo -n "25. Workspace Tasks: "
WORKSPACE_TASKS=$(admin_request $BASE_URL/api/workspace/tasks)
if echo "$WORKSPACE_TASKS" | jq -e '. | type == "array"' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 26: Workspace Dashboard
echo -n "26. Workspace Dashboard: "
WORKSPACE_DASH=$(admin_request $BASE_URL/api/workspace/dashboard)
if echo "$WORKSPACE_DASH" | jq -e '.success' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "🔗 === COUPLING & INTEGRATION TESTS ==="

# Test 27: Coupling Sync Metrics
echo -n "27. Coupling Sync Metrics: "
SYNC_METRICS=$(admin_request $BASE_URL/api/coupling/sync-metrics)
if echo "$SYNC_METRICS" | jq -e '.metrics' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

# Test 28: Coupling Dashboard
echo -n "28. Coupling Dashboard: "
COUPLING_DASH=$(admin_request $BASE_URL/api/coupling/dashboard)
if echo "$COUPLING_DASH" | jq -e '.adminPanelData' >/dev/null 2>&1; then
    echo "✅ SUCCESS"
else
    echo "❌ FAILED"
fi

echo ""
echo "🎯 === PUBLIC & PORTAL TESTS ==="

# Test 29: Public Portal (if representative exists)
echo -n "29. Public Portal: "
if [ "$REP_ID" != "1" ]; then
    # Get the representative to find publicId
    REP_DETAIL=$(admin_request $BASE_URL/api/representatives/TEST001)
    if echo "$REP_DETAIL" | jq -e '.publicId' >/dev/null 2>&1; then
        PUBLIC_ID=$(echo "$REP_DETAIL" | jq -r '.publicId')
        PORTAL=$(curl -s $BASE_URL/api/portal/$PUBLIC_ID)
        if echo "$PORTAL" | jq -e '.name' >/dev/null 2>&1; then
            echo "✅ SUCCESS"
        else
            echo "❌ FAILED"
        fi
    else
        echo "❌ NO PUBLIC ID"
    fi
else
    echo "⏭️ SKIPPED (No Rep Created)"
fi

echo ""
echo "📈 === FINAL SUMMARY ==="
echo "تست کامل ۲۹ اندپوینت اصلی انجام شد."
echo "برای نتایج دقیق‌تر، خروجی JSON را بررسی کنید."
echo "================================================"

# Cleanup
rm -f /tmp/admin_cookies /tmp/crm_cookies
