# Ripple Effect Analysis - Task Lifecycle & Event Sourcing
Date: 2025-08-12
Module: Task Lifecycle

## Observed Changes
- Added tables: task_events, ai_command_log, staff_shift_sessions.
- Orchestrator now persists ai_command_log and emits TASK_CREATED for task.generate.

## Impact
- Establishes foundation for shifting from crmTasks table to event-derived projection.
- ai_command_log persistence reduces risk of lost AI interactions.

## Contract Alignment
- Events align with Nexus TaskEvent concept.
- No conflict with existing crmTasks yet; transitional duplication acceptable short-term.

## New Risks
| Risk | Description | Mitigation |
|------|-------------|------------|
| Incomplete projection parity | crmTasks still source for some UI | Add projection adapter layer & gradually migrate UI endpoints. |
| Hard-coded assignedStaffId=0 | Placeholder may create orphan tasks | Introduce assignment strategy in Representative Intelligence phase. |
| Missing indices for query patterns | Large event counts degrade read | Add composite index (task_id, occurred_at) in next migration. |

## Adjustments Proposed
1. Add snapshot mechanism (task_read_model) after N>50 events per task.
2. Introduce staff assignment heuristic before enabling AI-generated tasks in production.
3. Expand TASK_COMPLETED event emission logic in orchestrator responses when appropriate.

## Next Module Recommendation
Proceed to Representative Intelligence Fusion (Tier 1) to supply richer context for task generation & assignment.

## Approval Requested
Confirm advancing Representative Intelligence Fusion into Forge.
