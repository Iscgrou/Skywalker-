# Debt Snapshot Service - Forge Log
Tier: 1 (Supports Representative Intelligence precision)
Planned Iterations: 2 (v1 daily capture + v2 incremental / anomaly hooks)

---
## Iteration 1
Goal: Persist daily per-representative financial posture (debt, sales) to enable robust trends & anomaly z-scores.
Scope:
- Table: representative_debt_snapshots(id, representative_id, date, total_debt, total_sales, captured_at).
- Service: captureAll() (idempotent per day), getRecent(repId, days), getSeries(repId, start, end).
- Integration: Representative Intelligence uses last N (>=7) snapshots to compute mean/std for debt anomaly; fallback to heuristic if <3 snapshots.
- Context Version bump when integrated (rep-intel-v3 planned next iteration).
Counterexamples (Iteration 1 design):
1. Missing snapshots (brand new) -> fallback heuristic still works; no divide-by-zero.
2. Outlier single spike among stable series -> z-score > threshold flagged.
3. Gradual increase (monotonic) -> z-score stays low; no false anomaly.
4. Sparse irregular days (only 2 snapshots) -> anomaly not evaluated (null) to avoid noise.
5. Duplicate capture same day -> second capture ignored (idempotent) not double row.
Success Criteria: All counterexamples produce stable outputs without exceptions.
Validation Results:
- 1 Missing snapshots: rep with 0 snapshots returns anomaly=false, factor=null ✔
- 2 Single spike: synthetic series `[1000, 1005, 995, 1010, 2000]` z > 2 flagged anomaly ✔
- 3 Gradual increase series `[1000, 1050, 1100, 1150, 1200]` std moderate z < 2 no anomaly ✔
- 4 Sparse (2 snapshots) -> anomaly false, factor null ✔
- 5 Duplicate capture same day skipped (row count unchanged) ✔
Residual Risks: No date range filtering in getSeries DB query (in-memory filter) – acceptable for small set, optimize later.
Next: Integrate into Representative Intelligence (done) bump context version.
---
## Iteration 2 (Planned)
- Incremental event-driven deltas & partial recapture on payment/invoice changes.
- Rolling window optimization & caching.
- Multi-metric expansion (credit utilization, average invoice size).
