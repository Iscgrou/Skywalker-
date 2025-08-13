# Test Plan

## 1. Scope
Covers critical stability & integrity surfaces: auth/session, prescriptive explainability, financial invoices, governance alerts, readiness lifecycle, diff cache memory control, correlation tracing.

## 2. Environments
- Local (recommended): Node 20.x, PostgreSQL 15/16.
- Current container: Missing node/npm => dynamic tests blocked (follow Local Setup below).

## 3. Local Setup
```bash
# Clone & install
npm install
# Start postgres (example docker)
docker run -d --name pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
# Apply drizzle migrations (placeholder if script present)
# npx drizzle-kit migrate
npm run dev
```

## 4. Readiness & Lifecycle
1. Start server; poll `/ready` every 2s: expect `{status:"ready"}` immediately (framework) BUT prescriptive routes may 503 until engine flag set.
2. Before ~30s, call `/api/prescriptive/explain/history` -> expect 503 SERVICE_UNAVAILABLE.
3. After prescriptive engine init (~30-35s), route returns JSON list or feature_flag_disabled.

## 5. Correlation ID
1. `curl -i http://localhost:5000/api/health` (example) -> Response headers should include `x-request-id` (if route starts with /api). 
2. Supply custom `X-Request-Id: test123` -> Ensure echoed back unchanged.
3. Observe server logs: lines include `cid=test123`.

## 6. Invoice Transactions
1. Create invoice via `/api/invoices` (body minimal required fields).
2. Induce failure: after creation, temporarily modify code to throw inside transaction to confirm rollback (manual dev step).
3. Verify activity log has `invoice_created` entry only when commit succeeds.
4. Update invoice -> check activity log `invoice_updated` row.

## 7. Diff Endpoint Rate & Cache
1. Warm diff: call `/api/prescriptive/explain/diff?from=A&to=B` repeatedly with same params; second call should be faster (cache hit) and identical payload.
2. Exceed rate: vary params while keeping identity constant until 429 returned; confirm `retryMs` present.
3. Provide different `X-Request-Id` only (should NOT reset rate-limiter because identity uses session+role+UA).

## 8. Diff Cache Memory Watermark
Simulate large cache (temp reduce watermark env var):
```bash
EXPLAIN_DIFF_CACHE_WATERMARK_MB=30 npm run dev
```
1. Generate many distinct diff keys (> CACHE_MAX_ENTRIES * 1.5).
2. Confirm cache stats endpoint (future) or instrumentation shows trimming (log line "diff cache watermark trim").
3. When memory > watermark+50 (simulate by lowering watermark to 5), cache insertion is skipped.

## 9. Governance Alerts
1. Insert synthetic alerts (SQL or service) then call `/api/governance/alerts` with filters.
2. Ack one alert -> `/api/governance/alerts/:id/ack`; unack -> `/unack`; metrics endpoints return updated counts.

## 10. Security & Adaptive
Smoke test: `/api/governance/adaptive/metrics` (should respond <500ms) and `/api/security/status` after delayed init.

## 11. Logging Validation
1. Trigger API calls; ensure each line includes method, path, status, ms, and `cid=`.
2. Verify body is included only for small responses (<400 chars).

## 12. Manual Regression Checklist
- [ ] Readiness 503 before prescriptive init
- [ ] Correlation header round-trip
- [ ] Invoice create/update adds activity logs
- [ ] Diff cache produces hits & respects rate limit
- [ ] Watermark trim invoked (when simulated)
- [ ] Alerts ack/unack lifecycle
- [ ] Adaptive metrics endpoint accessible

## 13. Future Automated Tests (Vitest/Jest)
Describe minimal suites:
- auth.test.ts: login success/failure, session cookie presence.
- invoices.test.ts: create (mock DB), transactional rollback simulation.
- diff.test.ts: rate limit & cache behavior with mocked time.
- readiness.test.ts: route returns 503 when prescriptiveReady=false.

## 14. Risk-Based Prioritization
P1: Financial data integrity, Rate limiting security.
P2: Readiness gating, Activity logging.
P3: Cache trimming (memory safety), Structured logging.

## 15. Observability Enhancements (Backlog)
- Expose `/api/prescriptive/status` (includes readiness flags + cache stats)
- Add histogram for diff latency
- Structured log aggregator (ELK / OpenTelemetry) stub.

## 16. Runtime Absence Guidance
If environment lacks Node/npm (as in current container) dynamic execution cannot proceed. Use a local dev machine or Codespace with Node 20:
```bash
# Verify
node -v || curl -fsSL https://fnm.vercel.app/install | bash
# After install (restart shell)
fnm install 20
fnm use 20
```
Then proceed with Section 3.

## 17. Exit Criteria
All P1 items pass, plus no unbounded memory growth observed under load (monitor heap with `node --inspect`).

---
Prepared by Sherlock v1.0 methodology automation.
