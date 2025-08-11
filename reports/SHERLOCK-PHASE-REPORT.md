## فاز ۲ — تست‌های یکپارچگی حسابداری و مکانیزم تخصیص پرداخت‌ها

به‌روزرسانی عمیق (SHERLOCK v15.2):
- منطق تخصیص پرداخت در صورت بیش‌پرداخت اصلاح شد (Split Payment): مبلغ مازاد به‌عنوان پرداخت جدید و تخصیص‌نیافته ثبت می‌شود و فاکتور مقصد به وضعیت «paid» می‌رود. لاگ فعالیت و تراکنش مالی نیز ثبت می‌شود.
- برای مشاهده‌پذیری دقیق و گزارش‌گیری اتمیک، دو اندپوینت جدید اضافه شد:
	- GET /api/payments/:id/allocation-details
		- خروجی: { payment, allocatedAmount, invoiceId, remainderPayment, transactionId }
		- کارکرد: جزییات تخصیص همین پرداخت (مقدار تخصیص‌یافته و آی‌دی پرداخت مانده در صورت Split)
	- GET /api/representatives/:id/financial-summary
		- خروجی: { representative, unpaidAmount, totalPayments, credit, totalSales, totalDebt, payments: { total, allocated, unallocated } }
		- کارکرد: نماگر مالی تجمیعی و آنی برای نماینده (پس از بروزرسانی شاخص‌ها)

روش تست سریع:
1) ایجاد فاکتور دستی و پرداخت بزرگ‌تر از مانده، سپس تخصیص دستی:
	 - POST /api/invoices (دستی) → آی‌دی فاکتور
	 - POST /api/payments → آی‌دی پرداخت
	 - POST /api/payments/:paymentId/allocate { invoiceId }
2) بررسی نتایج:
	 - GET /api/invoices/:invoiceId → باید paid باشد
	 - GET /api/payments/:paymentId/allocation-details → allocatedAmount و remainderPayment را نشان دهد
	 - GET /api/representatives/:id/financial-summary → unallocated افزایش و بدهی کاهش یافته باشد

یادداشت: وضعیت تراکنش مالی در createFinancialTransaction با مقدار پیش‌فرض ثبت و سپس با updateTransactionStatus به «COMPLETED» به‌روزرسانی می‌شود تا با تایپ‌های درج هم‌خوان باشد.

مشاهده‌پذیری اجرای زنده و رفع تعارض سروینگ
- مسئله: برخی درخواست‌های /api به‌جای JSON، محتوای HTML (index.html) برمی‌گرداندند. علت ریشه‌ای وجود دو پردازش Node همزمان روی پورت 5000 بود: یکی dev (tsx server/index.ts) و دیگری prod (node dist/index.js). سیستم‌عامل اتصال‌ها را بین این دو توزیع می‌کرد و در نتیجه برخی درخواست‌ها به سرور prod (با fallback SPA) می‌افتادند.
- اقدام اصلاحی: پردازش prod متوقف شد تا فقط dev در حال سرویس‌دهی باشد. پس از توقف prod، نتایج زیر تایید شد:
	- ناشناخته‌های /api (مانند /api/_nope_) همیشه JSON 404 برمی‌گردانند.
	- GET /api/payments/:id/allocation-details و GET /api/finance/payments/:id/allocation محتوای JSON معتبر برمی‌گردانند.
	- GET /api/representatives/:id/financial-summary محتوای JSON معتبر و فیلدهای مورد انتظار را برمی‌گرداند.
- توصیه عملی: در محیط توسعه فقط یک سرور را اجرا کنید (dev). در صورت نیاز، قبل از اجرای dev پردازش prod را متوقف کنید. گاردهای کدنویسی‌شده در server/index.ts و server/vite.ts هم اکنون /api را از SPA جدا می‌کنند؛ اما هم‌زمانی دو فرآیند می‌تواند رفتار را غیرقابل‌پیش‌بینی کند. برای تست سریع رفتار API می‌توانید از اسکریپت اضافه‌شده استفاده کنید:
	- npm run verify:api
	- یا: PORT=5000 npm run dev:only
# SHERLOCK v2.0 — Skywalker System Audit (3 Phases)

Date: 2025-08-11
Owner: Technical Audit — Phase 1/3 complete, Phase 2 started

---

## Phase 1 — Technical/API Audit (Complete)

Summary
- Scope: End-to-end atomic testing of backend API (~80+ concrete endpoints discovered), auth/session, CRUD, analytics, and integrations.
- Result: Core platform stable; several advanced/aux routes need wiring or config; CRM surface requires user model setup.

Key Findings
- Authentication: Admin login/session working. Legacy /api/login also supported.
- Representatives: Full CRUD works. Statistics endpoint OK.
- Invoices: Manual create, list (paged), details, statistics OK. Telegram send requires config (token/chat ID).
- Payments: Create/list/statistics OK; allocation flows exist but require proper payloads. Counts reflect DB state.
- AI Engine: /api/ai/analyze-financial returns structured insights (score, recommendations) successfully.
- Sync/Business: Debtor reps and sync status endpoints respond. Force sync returns success, simplified mode.
- Data Integrity/Clock: Transactions/constraints APIs are present; reconciliation endpoints operational.
- Settings: Concrete keys are via /api/settings/:key and PUT for updates; generic /api/settings returns frontend HTML (by design fallback) — use keyed routes.
- CRM: /api/crm/* requires a CRM user model/permissions; not enabled by default.
- Uploads: CSV/usage generation endpoints exist, but some routes are disabled or require exact field names.

Working Endpoints (samples)
- Auth: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/check
- Dashboard: GET /api/dashboard, GET /api/dashboard/debtor-representatives
- Representatives: GET/POST/PUT/DELETE /api/representatives, GET /api/representatives/statistics, GET /api/representatives/:code
- Invoices: POST /api/invoices/create-manual, GET /api/invoices, GET /api/invoices/:id, GET /api/invoices/manual, GET /api/invoices/statistics, GET /api/invoices/manual/statistics
- Payments: GET /api/payments, POST /api/payments, PUT /api/payments/:id, POST /api/payments/:id/allocate, GET /api/payments/statistics, GET /api/payments/unallocated
- Admin Analytics: GET /api/admin/data-counts, GET /api/activity-logs
- AI: POST /api/ai/analyze-financial, POST /api/ai/test-connection
- Financial: GET /api/financial/transactions, POST /api/financial/reconcile, GET /api/constraints/violations, POST /api/constraints/validate, POST /api/constraints/:id/fix
- Health: GET /health

Partial/Needs Config
- /api/settings/*: Use /api/settings/:key — generic /api/settings falls back to SPA HTML.
- /api/invoices/send-telegram & /api/test-telegram: Require valid Telegram bot credentials.
- /api/ai/* advanced: Some routes depend on external keys (xAI/Grok) — test endpoints provided to validate keys.
- /api/upload/*: File routes require exact form-data field names (e.g., usageFile) and may be disabled in this build.
- /api/sales-partners: Create works; verify update/delete payload shapes.

Non-Functional/Missing (in this snapshot)
- Generic /api/settings (no key) — returns SPA HTML by fallback (not a backend API bug).
- CRM surface (/api/crm/*) — requires CRM user management and permission model; not provisioned.
- Some upload/generate routes tied to CSV usage require finalized schema.

Data State After Phase 1
- Representatives: 1
- Invoices: 1 (INV-071903449, 100,000)
- Payments: 1
- Sales Partners: 1
- Activity Logs: 6+

Recommendations
- Document request/response contracts for settings, upload, and CRM routes.
- Add a seed command for CRM users + permissions (minimal bootstrapping).
- Introduce OpenAPI/Swagger for rapid contract validation.
- Gate external-service endpoints behind feature flags and provide no-op stubs in dev.

---

## Phase 2 — Accounting/Financial Integrity (In Progress)

Objectives
- Validate reconciliation pipeline, constraint validations, transaction log correctness, and payment allocation rules.
- Stress edge cases: partial allocations, overpayments, unpaid invoices, reconciliation idempotency.

Initial Checks Executed
- GET /api/financial/transactions → [] (no transactions yet)
- POST /api/financial/reconcile → OK (bulk and per-representative supported)
- POST /api/constraints/validate { entityType, entityId } → contract valid (requires seeded constraints)
- GET /api/constraints/violations → endpoint responds (dependent on constraints)
- GET /api/payments/unallocated → available for allocation flow testing
- POST /api/payments/:id/allocate → present; validate request body shape during tests

Planned Atomic Test Matrix
- Seed constraints via POST /api/init (adds BALANCE_CHECK for initial reps)
- Validate constraints for representative with open invoices
- Create payments: exact Zod schema: representativeId (number), paymentDate (fa-IR), amount (string/decimal), description (optional), invoiceId (optional)
- Test allocation: manual per payment vs auto by representative
- Reconcile again and compare aggregates: totalDebt, totalAllocated, outstanding per representative
- Verify transaction log snapshots before/after operations

Status
- Constraints seeded via POST /api/init → success
- Payments created for scenarios → IDs: 4 (20,000), 5 (90,000) in addition to earlier payments (1,2,3)
- Validation: POST /api/constraints/validate {representative,1} → isValid: true, violations: []
- Reconciliation executed → "هماهنگی کامل شد"
- Invoice status recalculated → invoice #1 transitioned to paid

Concrete Results
- Payments statistics after tests:
	- totalPayments: "5"
	- totalAmount: "270000.00"
	- allocatedPayments: "5"
	- unallocatedPayments: 0
- Invoice #1 before recalculation: status=unpaid; after recalc: status=paid
- Unpaid invoices for representative 1: []
- Allocation summary for representative 1:
	- totalPayments: 5, allocatedPayments: 5, unallocatedPayments: 0
	- totalPaidAmount: "270000", totalUnallocatedAmount: "0"
- Invoice statistics snapshot:
	- totalInvoices: 1, paidCount: 1, unpaidCount: 0, partialCount: 0
	- totalAmount: 100000, paidAmount: 100000, unpaidAmount: 0

Latest Snapshot (after phase2-smoke.sh)
- Payments statistics:
	- totalPayments: "7"
	- totalAmount: "380000.00"
	- allocatedPayments: "5"
	- unallocatedPayments: 2
- Invoice #1: status=paid (unchanged)
- Invoice statistics: consistent with fully paid state

Findings & Issues (Phase 2)
- Overpayment handling: Creating payments totaling 270,000 for a 100,000 invoice results in:
	- Invoice stats showing paidAmount equal to invoice amount (100,000) — correct.
	- Payments summary reports totalPaidAmount=270,000 and unallocatedPayments=0, suggesting all payments are considered allocated, even beyond invoice outstanding.
	- Potential inconsistency: Excess 170,000 isn’t reflected as “unallocated” or “credit” but also not counted in invoice paid totals. Recommendation: enforce max allocation=outstanding; record remainder as unallocated or a representative credit ledger entry.
- Constraint layer currently returns valid with no violations; add negative tests (e.g., forced mismatches) to verify detection.
- Transactions API currently empty ([]); enable audit events for allocation/reconcile to build an audit trail.

Runtime Verification (Resolved)
- JSON 404 برای مسیرهای ناشناخته زیر /api تایید شد.
- اندپوینت‌های جدید ممیزی مالی (allocation-details و financial-summary) پس از رفع تعارض سروینگ، JSON صحیح بازمی‌گردانند.
- Pitfall: اجرای همزمان prod و dev روی پورت یکسان باعث بازگشت HTML می‌شد؛ با توقف prod برطرف شد.

Artifacts
- scripts/phase2-smoke.sh — reproducible Phase 2 accounting checks

Results Log
- [x] Constraints seeded
- [x] Violations scan results captured (0)
- [x] Allocation scenarios verified (partial + overpay)
- [x] Reconciliation deltas verified (invoice status updated to paid)
- [ ] Transactions audit trail exported (pending — no entries yet)

---

## Phase 3 — CRM Behavioral Analysis (Queued)

Scope
- Workspace flows, AI helper behavior, task management, settings UX, and data-sync semantics between Admin and CRM.

Prereqs
- Provision CRM user model and permissions
- Stabilize settings API contracts for CRM UI consumption

Planned
- Atomic click-path coverage across CRM UI surfaces with backend trace correlation

---

Changelog
- 2025-08-11: Phase 1 complete; Phase 2 initialized; report scaffold created.
