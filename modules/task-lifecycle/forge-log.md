# Task Lifecycle & Event Sourcing - Forge Log
Tier: 1 | Planned Iterations: 5

## Iteration 1
Goal: Define event model + minimal tables (task_events, ai_command_log, staff_shift_sessions) & risks.
Decisions:
- Append-only task_events drives derived crmTasks state (later a projector can back-fill if needed).
- ai_command_log persists orchestration envelopes for replay & auditing.
- staff_shift_sessions captures shift start/end + compute effective_seconds post-close.
Risks:
- Dual-source-of-truth (crmTasks vs events). Mitigation: mark crmTasks transitional; future read models generated from events.
- Event explosion. Mitigation: enforce minimal event types initially.
Open Questions:
- Need tombstone events for deletions? (Defer; no hard delete initially).
Next: Add schema + migration.
