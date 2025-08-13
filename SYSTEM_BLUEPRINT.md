# SYSTEM INTEGRITY BLUEPRINT

> Living technical dossier generated via Sherlock v1.0 methodology.

## Phase 1: Code-Derived System Blueprint (✅ Confirmed)

### 1. System Identity (Code-Only)
Monolithic modular TypeScript platform with:
- Express server (sessions, RBAC, CSRF, role integrity)
- React/Vite SPA (CRM + Financial + Prescriptive UI)
- PostgreSQL (Drizzle ORM, lazy init + health check)
- Intelligence Stack (staggered startup chain)
- Governance / Alerting / Explainability subsystems
- Adaptive + Strategic + Business Ops engines

### 2. Layer & Module Map
| Layer | Responsibility | Key Locations |
|-------|---------------|---------------|
| Transport & API | Routing, auth, security headers | `server/index.ts`, `server/routes.ts`, `server/routes/*` |
| Session & Security | Session store, CSRF, role integrity | `server/index.ts`, `middleware/*` |
| RBAC | Action-level permissions | `shared/rbac.ts` + `middleware/rbac` |
| Data Access | CRUD, retry, integrity, financial logic | `server/storage.ts`, `shared/schema.ts` |
| Financial Domain | Representatives, invoices, payments, batches | `shared/schema.ts` + storage ops |
| CRM Domain | Users, tasks, reports, snapshots, AI assist | `server/routes/crm-routes.ts` + services |
| Governance & Alerts | Alerts lifecycle & metrics | `strategy-governance-*.ts` services + routes |
| Predictive Engine (PAFE) | Ingestion→Features→Models→Serving→Insight→Integration→Security | `predictive-*.ts` + orchestrated in `server/index.ts` |
| Prescriptive Engine (PODSE) | Objectives, constraints, scenarios, optimization, frontier, guardrails, explanation | `prescriptive-*.ts`, `prescriptive-orchestrator.ts` |
| Adaptive Intelligence | Thresholds, correlation, pruning, tuning | `intel-*`, `strategy-adaptive-*`, `system-auto-tuning-service.ts` |
| Explainability | Session history, diff, redaction, cache, rate-limit | `explainability-*` services + related routes |
| Strategic / Business Ops | Executive / decision / ops orchestration | `strategy-*.ts` top-level |
| Audit & Telemetry | Activity logs, audit events, slow query log | `storage.ts`, `audit-logger.ts` |
| Frontend SPA | UI components & hooks | `client/src/*` |

### 3. Core Entities
Financial: representatives, salesPartners, invoiceBatches, invoices, payments, financialTransactions, invoiceEdits
Governance: aiGovernanceAlerts (+ ack/escalation/suppression tables inferred)
Integrity: dataIntegrityConstraints
Intelligence: intelRollups
CRM: crmUsers, crmTasks, crmTaskResults, representativeLevels, crmCulturalProfiles, aiKnowledgeBase
AI Config: aiConfiguration
Explainability: (sessions/diffs implied via retrieval services)
Activity & Audit: activityLogs, telegramSendHistory, settings

### 4. Principal Data Flows
1. Invoice Upload -> Parse -> Insert -> ActivityLog -> Recalc -> Telegram (opt) -> CRM cache invalidation
2. Governance Alert lifecycle (generate -> query -> ack/escalate/suppress -> metrics)
3. Predictive pipeline (ingest -> features -> modelsHub emit -> insight/integration -> serving cache)
4. Prescriptive prescribe() (scenarios -> optimize -> frontier -> guardrails -> explain)
5. CRM snapshots (cache, pagination, audit)
6. Explainability diff (retrieve -> diff -> redaction -> cache -> audit)
7. Adaptive startup chain (aggregator -> rollups -> thresholds -> correlation -> predictive -> prescriptive -> scenarios)
8. Strategic & Business Ops (post-core readiness, global exposure)

### 5. Dependency Chains (Sample Depth ≤7)
Client Hook -> `/api/prescriptive/explain/diff` -> `routes.ts` -> diff service -> retrieval service -> db proxy -> schema

### 6. Architectural Patterns (Observed)
- Progressive deferred initialization (timed setTimeout chain)
- Leader-gated heavy jobs (clusterCoordinator checks)
- Resilience via lazy DB + in-memory session fallback
- Multilayer caching (serving, diff, CRM snapshot, adaptive metrics)
- Rate limiting & redaction applied at Explainability boundary
- Global singleton engines on `globalThis`
- Financial atomic intent recorded via `financialTransactions`
- Audit-first mindset (broad event logging + activity logs)

### 7. Architectural Philosophy (Inferred)
Safety, staged adaptivity, observability, explainability, modularity inside a single process, cultural localization, extensibility by composition not framework complexity.

### 8. Potential Risk / Fragility Points
- Monolithic `routes.ts` surface area
- Non-deterministic startup timing (setTimeout jitter)
- Global namespace pollution (test isolation risk)
- Possible lack of explicit DB transactions around multi-write flows
- Redaction / rate-limit identity fallback to 'anon'
- Policy versioning (RBAC_VERSION) without migration broadcast

### 9. Improvement Opportunities
- Central lifecycle manager for engines
- Structured logging abstraction (JSON + correlation IDs)
- Repository segmentation of `storage.ts`
- Stronger transactional wrappers (e.g., drizzle transaction) for edits
- Formal engine health registry / readiness gating

### 10. Frontend Observations
- Hooks poll prescriptive/explain endpoints
- Unified auth page; manager unlock gating in CRM
- Rich component library with Radix + tailwind wrappers

### 11. Sample Data Lifecycles
Representative Creation -> ActivityLog -> dashboards & CRM snapshot
Invoice Edit -> financialTransactions (+ rollback metadata) -> integrity constraints validation potential
Prescriptive Request -> bestPolicy/explanations -> diff & history endpoints
Forecast Generation -> publish -> integration metrics -> serving cache / latency samples

### 12. Design Trade-offs
Startup ordering sacrifices determinism for simplicity; global singletons speed integration but reduce isolation; explainability / governance emphasis over raw model sophistication (placeholders/random scoring in optimization core).

---

## Phase 2: Symptom Triangulation & Root Cause Hypothesis (Updated)

### 2.1 Runtime Constraint
Node.js & package manager are absent in current container (apk install permission denied). All dynamic tests deferred; proceeding with Static Execution Blueprint so that as soon as runtime exists tests can be executed with zero design lag.

### 2.2 Static Risk Surface Mapping (Interaction Points)
| Area | Interaction Convergence | Potential Fault Classes |
|------|------------------------|--------------------------|
| Session & Security | Conditional skip for /portal*, layered CSRF & roleIntegrity | Missing CSRF bypass on new mutating route, session leakage, role drift |
| Massive routes file | High cohesion of unrelated domains | Regression coupling, unhandled errors, accidental route shadowing |
| Deferred Engine Startup | Timed setTimeout chain with jitter & leader checks | Race: endpoint queried before engine ready; partial state exposure |
| Financial Atomicity | Invoice edit + financialTransactions not always inside explicit DB transaction | Partial updates on failure, integrity constraint drift |
| Explainability Diff | Rate limit identity fallback, caching | Abuse / DoS, stale diff visibility, privilege redaction mismatch |
| Global Singletons | globalThis.* for engines | Memory retention across hot reload, state contamination in tests |
| Governance Alert Services | Multiple micro-service style files imported lazily | Import failure masked, silent degradation |
| CRM Snapshot Cache | Time-based invalidation only | Stale financial figures after rare mutation paths |
| Adaptive Tuning | Auto parameter adjustments | Over-convergence (too aggressive tightening) |
| Security Intelligence | Large asynchronous report generation | Latency spikes, blocking event loop during heavy summarization |

### 2.3 Preliminary Hypotheses (Without Incident Input)
H1: Early user interaction with predictive/prescriptive endpoints returns inconsistent or uninitialized status due to deferred startup.
H2: Invoice edit race can cause representative financial aggregates to drift if a retry occurs mid-update.
H3: Governance alert suppression / escalation metrics may report stale or partial aggregates when leader handoff (clusterCoordinator) is ambiguous (no real cluster semantics).
H4: Explainability diff rate limiting may be bypassed via repeated anonymous identities causing cache pollution & unbounded memory growth.
H5: CRM manager unlock TTL & exponential backoff logic may desynchronize with audit logging, causing phantom lockouts.
H6: Lack of structured correlation IDs hinders root cause trace for multi-service flows (difficult triage of cascading anomalies).
H7: Adaptive auto-tuning of max_failed_logins may reduce threshold too aggressively (tight loop) leading to false positive lockouts.

### 2.4 Static Impact Radius (Depth ≤3 Examples)
- Prescriptive Diff Endpoint → Diff Service → Retrieval Service → DB (alerts: redaction) (Radius: 3)
- Governance Escalation → Escalation Service → DB (alerts + escalations) → Metrics caching (Radius: 2)
- Invoice Upload → Storage (insert invoices) → ActivityLog → Representative financials recompute → CRM snapshot cache (Radius: 3)

### 2.5 Awaiting Dynamic Evidence (Data to Capture Once Runtime Available)
| Capture | Method | Purpose |
|---------|--------|---------|
| Startup Timeline | Timestamp logs for each engine init | Verify order & readiness gating |
| Session Behavior | Sequence of /api/auth/login then privileged route | Validate CSRF bypass + roleIntegrity post-login |
| Race Simulation | Rapid consecutive invoice edits | Detect integrity drift or duplicate transactions |
| Diff Rate Limiting | Multiple /api/prescriptive/explain/diff calls with identity variance | Confirm limiter & cache interplay |
| Alert Flow | Insert synthetic alert rows then query metrics | Validate aggregation freshness |
| Adaptive Parameter Evolution | Log parameter snapshots over 30m window | Ensure dampening not too aggressive |

### 2.6 Proposed Dynamic Test Scripts (Pseudo)
```bash
# 1. Readiness loop
until curl -sf localhost:5000/ready >/dev/null; do sleep 1; done
# 2. Login
curl -c c.jar -H 'Content-Type: application/json' -d '{"username":"mgr","password":"8679"}' localhost:5000/api/auth/login
# 3. Invoice creation (example shape, adjust to real schema)
curl -b c.jar -H 'Content-Type: application/json' -d '{"invoiceNumber":"T1001","representativeId":1,"amount":"1200.00","issueDate":"1404/05/20"}' localhost:5000/api/invoices
# 4. Governance alerts list
curl -b c.jar localhost:5000/api/governance/alerts?limit=5
# 5. Explain diff
curl -b c.jar 'localhost:5000/api/prescriptive/explain/diff?from=POLICY_A&to=POLICY_B&redaction=minimal'
```

### 2.7 Static Test Coverage Matrix (Planned)
| Domain | Test Focus | Status |
|--------|------------|--------|
| Auth & Session | Login, CSRF skip correctness, role propagation | Pending runtime |
| Financial | Invoice CRUD, batch code generation, debt recalculation | Pending |
| Governance | Alert query filters, ack/unack/escalate, metrics windows | Pending |
| Explainability | Diff caching + redaction combinations | Pending |
| Predictive | Forecast cache p95 latency calculation | Pending |
| Prescriptive | Run prescribe() after engine ready state | Pending |
| Adaptive | Threshold change log & parameter tuning | Pending |
| CRM | Snapshot caching invalidation after financial mutation | Pending |

### 2.8 Immediate Hardening Suggestions (Code-Level, Low-Risk)
1. (Implemented) Readiness guard middleware (all prescriptive explain routes protected until ready).
2. (Implemented) Correlation ID per request (X-Request-Id) added + request log emission.
3. (Implemented) Transaction wrapping for invoice create/update (atomic integrity + activity log).
4. (Planned) Replace setTimeout startup ordering with promise-based lifecycle orchestrator.
5. (Implemented) Strengthened diff rate limiter identity: composite session/role/UA string base64 encoded.
6. (Implemented) Diff cache memory watermark (trim at 150MB heap, skip caching if >200MB).
7. (Implemented) Structured logging helper (JSON lines via slog) – partial adoption (API lines). 

### 2.9 Metrics to Define (For Phase 4 Validation Later)
- predictive.serving.p95Latency
- prescriptive.frontier.hypervolume (baseline repeatability window)
- financial.transaction.rollbackRate
- governance.alerts.queryLatency
- explain.diff.cacheHitRatio
- adaptive.paramChangeIntervalMean

### 2.10 Pending Actions (Requires Runtime)
Runtime spin‑up & execution of Section 2.5 capture list.

### 2.11 Transition Gate to Phase 3
Will proceed to targeted impact-aware probing once runtime evidence for ≥3 hypotheses (H1–H7) collected.

---
*This file is a living artifact; updates occur per Sherlock phase progression.*
