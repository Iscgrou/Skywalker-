# AI Orchestration Core - Foundry Blueprint (Draft)

Tier: 1  | Forge Iterations: 5 (in-progress)

## Strategic Purpose
Single entry & control layer for all AI interactions: commands in, validated + observable responses out. Ensures:
- Contract enforcement (schema + version)
- Decoupling producers (manager UI, schedulers, services) from model providers
- Audit / replay via event publication
- Future multi-model arbitration capability

## Responsibilities
1. Accept AICommand (structured) → assign correlationId.
2. Validate payload (zod) & envelope.
3. Publish ai.command.issued event.
4. Invoke appropriate execution handler (LLM / internal heuristic) via responder registry.
5. Validate response (AiResponseEnvelope) & publish ai.command.completed.
6. Track pending requests (timeout, TTL future enhancement).
7. Emit metrics (latency, success rate, validation failure count) (TODO hooks).

## Out-of-Scope (v1)
- Streaming token relay
- Distributed queue integration
- Multi-model voting
- Long-running tool execution

## Contract Compliance Mapping
| Nexus Concept | Implemented Artifact | Notes |
|---------------|----------------------|-------|
| AICommand | AiCommandEnvelopeSchema | version = 'v1' enforced |
| AIResponse | AiResponseEnvelopeSchema | validation block included |
| Events | event-bus topics | ai.command.issued/completed |
| Correlation | correlationId (uuid) | Unique per command |
| Validation | zod schemas | SupportedCommands registry |

## Data Flow
Producer → issueCommand(name,payload) → envelope stored pending → publish issued → handler dispatch → response validated → publish completed → remove pending.

## Error Modes & Handling
| Scenario | Handling | Future Improvement |
|----------|----------|--------------------|
| Invalid payload | reject (accepted=false) | central error catalog |
| Handler throws | status=FAILED + validation.passed=false | classify errors (transient/permanent) |
| Response schema violation | logged console | escalate metric alert |
| Timeout (planned) | (not yet) | implement watchdog + status=FAILED |

## Metrics (Planned Hooks)
- ai_orch_commands_total{command, status}
- ai_orch_latency_ms_bucket{command}
- ai_orch_validation_failures_total
- ai_orch_pending_gauge

## Security / Audit
- All envelopes immutable after issue.
- Future: sign envelope hash for tamper detection.

## Testing Strategy
1. Unit: payload validation success/failure per command.
2. Unit: handler exception → FAILED response.
3. Integration (future): subscribe to bus and assert event ordering.
4. Property (future): random payload generator within constraints.

## Extension Points
- registerResponder(name, fn) (to be added when external engines plugged).
- streaming channel (EventSource/WebSocket) hooking to correlationId.

## Open Risks
- Silent handler latency (no timeout): add configurable max 5s.
- Memory leak pending map: TTL cleanup scheduler.

## Next Steps (post blueprint)
1. Add timeout watchdog & metrics hooks.
2. Persist envelopes to ai_command_log (DB) for replay.
3. Replace inline responders with adapter to existing Grok engine.
4. Add command: followup.generate.
