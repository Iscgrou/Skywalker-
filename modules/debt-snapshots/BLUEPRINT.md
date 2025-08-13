# Debt Snapshot Service - Blueprint (Iteration 1)

## Purpose
Provide reliable historical series for representative debt & sales to support anomaly detection (z-score) and trend analytics, replacing heuristic approximations.

## Data Model
Table: representative_debt_snapshots
Columns:
- id (serial PK)
- representative_id (int, FK-like to representatives.id)
- date (date, YYYY-MM-DD, unique with representative_id)
- total_debt (numeric 15,2)
- total_sales (numeric 15,2)
- captured_at (timestamp default now)

Indexes:
- unique(representative_id, date)
- idx(rep_id, date desc)

## Capture Logic
captureAll():
1. Determine todayDate (UTC date string) → or configurable TZ.
2. For each active representative: upsert snapshot if not exists.
3. Use representatives.totalDebt / totalSales as current values (later extend with computed aggregates).
Idempotency: rely on unique index; on conflict DO NOTHING.

## Query API
- getRecent(repId, days=14): last N ordered desc.
- getSeries(repId, start, end): inclusive date range.

## Anomaly Integration
Representative Intelligence:
- Retrieve last N (e.g., 14) snapshots.
- If count >= 5: compute mean, std of total_debt; z = (current - mean)/std (guard std>0).
- Anomaly if z >= 2.0 (tunable). Provide z as debtAnomalyFactor.
- If std==0 (flat) and current > mean * 1.5 -> anomaly (fallback rule).
- If snapshots <5 -> do not evaluate (debtAnomaly=null, factor=null) and fallback to heuristic ratio only if needed for risk surfaces, but do not mark anomaly.

## Versioning
On integration: RepresentativeProfile.aiContextVersion -> rep-intel-v3

## Risks & Mitigations
- Data Gaps: schedule daily job; missing days lower confidence.
- Timezones: store date in UTC; future improvement - business timezone per rep.
- Performance: initial capture loops over all reps; acceptable at current scale; batch with LIMIT/OFFSET if needed.

## Future Iterations
- Event driven partial recapture on payment mutations.
- Additional metrics: averageDailyDebtChange, debtVolatility.
- Compression: weekly aggregation after 90 days.
