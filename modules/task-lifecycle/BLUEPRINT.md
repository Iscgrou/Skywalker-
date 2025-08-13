# Task Lifecycle & Event Sourcing - Foundry Blueprint (Draft)

## Purpose
Provide a canonical, observable lifecycle for tasks with granular status transitions and historical reconstruction capability.

## Core Concepts
- Task = Aggregated projection derived from ordered TaskEvents
- TaskEvent types (initial set):
  - TASK_CREATED { title, description, priority, representativeId?, assignedStaffId, dueAt }
  - TASK_STATUS_CHANGED { from, to }
  - TASK_NOTE_ADDED { note, addedBy }
  - TASK_REMINDER_LINKED { reminderId }
  - TASK_COMPLETED { outcomeSummary, completedAt }
- Status Enum: ASSIGNED → READ → IN_PROGRESS → PAUSED (optional) → COMPLETED → VERIFIED (optional) / CANCELLED (edge)

## Tables (new)
- task_events (append only)
- ai_command_log (from Orchestration phase; correlationId linkage)
- staff_shift_sessions (shift_start/end productivity)

## Invariants
- First event for taskId must be TASK_CREATED.
- Status transitions validated against allowed graph.
- VERIFIED only allowed after COMPLETED.

## APIs (draft)
POST /api/tasks (create) → emits TASK_CREATED
PATCH /api/tasks/:id/status {to} → emits TASK_STATUS_CHANGED (+ derived COMPLETED event when to=COMPLETED)
POST /api/tasks/:id/notes → emits TASK_NOTE_ADDED
GET /api/tasks/:id/events → raw history
GET /api/tasks/:id → projection (replay events)

## Projection Strategy
- v1 on-demand replay (query events then fold)
- v2 cached materialized view table (task_read_model)

## Metrics
- task_transition_latency_ms (ASSIGNED→READ, READ→IN_PROGRESS, etc.)
- task_status_count{status}
- task_completion_lead_time_ms (created→completed)

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Drift between crmTasks and events | Mark crmTasks legacy; new APIs ignore direct writes |
| Replay cost growth | Introduce snapshot every N events later |
| Incorrect transitions | Central validator function with unit tests |

## Next Steps
1. Implement schema additions.
2. Implement service with append + projection.
3. Hook orchestrator task.generate to emit TASK_CREATED using events path.
4. Backfill migration plan for existing crmTasks (deferred).
