# Ripple Effect Analysis - AI Orchestration Core (Initial Draft)

Date: 2025-08-12
Module: AI Orchestration Core

## Observed Changes
- Introduced new shared contract file `shared/ai-contracts.ts` (versioned envelopes + command schemas).
- Added in-memory event bus + orchestration skeleton.

## Impact on Macro-Blueprint
- Confirms feasibility of centralized command path.
- Validates need for persistence layer (ai_command_log) earlier than originally scheduled (to support replay & auditing) → Suggest elevating to Task Lifecycle phase coupling.

## Contract Deviations
- No conflict with existing `CONTRACTS.ts`; overlap minimal (different abstraction layer). Future alignment: unify naming for coaching insights vs. `CoachingInsightCommand` output shape.

## Risks Surfaced
| Risk | Description | Mitigation Proposal |
|------|-------------|---------------------|
| Persistence Gap | Commands/responses ephemeral in memory | Add DB logging before publishing completed event |
| Timeout Absence | Long model call would block pending map | Implement 5s watchdog + FAILED response |
| Handler Registry Static | Hard-coded responders reduces extensibility | Add dynamic registerResponder API |
| Validation Coverage | Only request validated; response flexible | Add per-command response schema |

## Proposed Adjustments
1. Add response schema map `SupportedResponses` in next iteration.
2. Introduce optional `expectedLatencyMs` in command envelope (future SLAs).
3. Add `origin` metadata (UI, scheduler, system) for analytics.

## No Re-Architecture Needed
- Current Macro-Blueprint stands; only sequencing refinement: incorporate command logging table before starting Task Event Sourcing to reuse patterns.

## Next Module Recommendation
Proceed with: Task Lifecycle & Event Sourcing (Tier 1) entering Forge.
Reason: Needed to emit canonical TaskCreated / TaskStatusChanged events that AI commands will increasingly rely on for context assembly.

## Approval Needed
Confirm to initiate Forge for Task Lifecycle & Event Sourcing.
