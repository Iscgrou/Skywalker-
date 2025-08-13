# Ripple Effect Analysis - Representative Intelligence Fusion (Draft)
Date: 2025-08-12

## Changes Introduced
- Contract file representative-intelligence-contracts.ts
- Service skeleton representative-intelligence-service.ts (basic aggregation + caching)
- Engagement table migration placeholder 0002
- Blueprint & Forge Log iteration 1 with counterexamples

## Counterexample Evaluation (Iteration 1)
1. No history: paymentVolatility/confidence=0 ✔ fallback works.
2. Conflicting cultural profiles: newest chosen; others ignored (need archival note) ➜ Improvement: store alternative count.
3. Debt spike anomaly: not yet handled ➜ Plan: add debt anomaly flag next iteration.
4. Sparse offer history: conversionRate null (confidence 0) ✔ prevents misleading 100%.
5. Inactivity contradiction: inactivityDays currently null; need lastInteraction computation.

## Proposed Adjustments for Iteration 2
- Add debtAnomaly flag + adjusted risk.
- Compute inactivityDays from last task_event / payment.
- Track alternativeCulturalProfiles count for transparency.
- Add followUpComplianceRate calculation (needs follow-up events mapping rule).

## System Impact
- Orchestrator can now request RepresentativeProfile for richer task.generate context (next wiring step pending).
- No breaking changes to existing APIs yet.

## Next Step Request
Proceed with Iteration 2 refinements & integrate orchestrator dependency injection for profile fetch.

---

## Iteration 2 Outcomes (Implemented)
Date: 2025-08-12

### Implemented Changes
- debtAnomaly + debtAnomalyFactor computed (heuristic baseline avg(sales,debt)).
- inactivityDays derived from latest task event timestamp (placeholder all events) until representative linkage lands.
- followUpComplianceRate derived from FOLLOW_UP_DUE vs FOLLOW_UP_DONE counts (temporary global scan, to refine with rep filter).
- lastInteractionAt stored as ISO string.
- alternativeProfilesCount = total cultural profiles - 1 (exposes ignored history).
- Orchestrator now injects repIntel under meta.repIntel for task.generate when representativeId provided.

### Counterexample Retest
1. No history: paymentVolatility.value/null confidence=0; inactivityDays null because no events; PASS.
2. Conflicting cultural profiles: alternativeProfilesCount surfaces count>0; still only newest chosen; mitigation visible; PASS.
3. Debt spike anomaly: If current debt 1.5x baseline triggers debtAnomaly=true; lacks temporal smoothing; marked for Iteration 3 tuning.
4. Sparse offer history: Unchanged logic keeps conversion rate null; PASS.
5. Inactivity contradiction: inactivityDays now numeric when events exist; still coarse (global events). Requires rep-scoped filter; flagged.

### Residual Risks / Planned Mitigations
- Global event scan may misattribute inactivity & follow-up compliance. Mitigation: add representativeId to taskEvents schema + migration, then filter.
- Debt anomaly heuristic may produce false positives for low baseline. Mitigation: introduce minimum baseline floor (e.g., 10,000) and 7d snapshot diff in next iteration.
- Performance: repeated full table scans for events; mitigate by adding composite index (representative_id, occurred_at) after schema change and caching inactivity for TTL.

### Ripple Summary
Low blast radius (new optional fields). Orchestrator enrichment is additive. Future schema change needed for precision; schedule for Iteration 3.

### Next Iteration (3) Focus Draft
- Add representativeId to taskEvents & migrate historical mapping logic.
- Replace debt anomaly heuristic with snapshot-based z-score (requires daily debt snapshots table).
- Implement engagementScore recalibration using inactivity & payment momentum decays.

