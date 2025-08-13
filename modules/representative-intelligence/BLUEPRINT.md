# Representative Intelligence Fusion - Blueprint (Draft)

## Purpose
Provide a single enriched RepresentativeProfile used by AI Orchestration & Task Generation for personalization, prioritization, and risk-aware decisioning.

## Data Sources
- representatives (base financial & status)
- payments (recent payments aggregate)
- invoices (debt trend, overdue count)
- crm_cultural_profiles / representative_levels (psych & cultural)
- crmTasks / task_events (interaction & task compliance signals)
- offers_incentives + offer_outcomes (future)
- task_reports_analysis (behavioral / next contact)

## Derived Metrics (v1)
| Metric | Formula (pseudo) | Notes |
|--------|------------------|-------|
| debtTrend7d | linearRegression(debt_t[-7..0]) | fallback 0 if <3 points |
| paymentVolatility | stddev(payments last 30d) | sample size gate >=2 |
| responseLatencyAvg | avg(task_events: CREATED→FIRST_STATUS != ASSIGNED) | fallback null |
| followUpComplianceRate | completed_followups / scheduled_followups | min denominator=5 else null |
| inactivityDays | today - lastInteractionAt | 0 if interaction today |
| engagementScore | weighted(z-scores: recency, compliance, payments) * 0.7 + culturalConfidence*0.3 | capped 0..100 |
| churnRiskScore | inverse(engagementScore) adjusted by debtGrowth | 0..100 |
| offerConversionRate | accepted_offers / offered_offers | denominator>=5 else null |

## Confidence Handling
Each sub-component produces {value, confidence}. Composite uses weighted average; missing values reduce weight, not inject zeros.

## API Contracts
GET /api/representatives/:id/profile → RepresentativeProfile
GET /api/representatives/profiles?ids=... → batch
POST /internal/rep-intel/recompute/:id → force recompute

## Caching Strategy
- In-memory LRU (max 1000 profiles, TTL 5m)
- Recompute triggers: payment insert, invoice status change, task completion, offer outcome.

## Event Subscriptions
- task_events: TASK_COMPLETED, TASK_STATUS_CHANGED (first transition)
- ai.command.completed (report.analyze) for cultural / behavior updates
- payments: (hook after insert)

## Failure Modes & Handling
| Failure | Strategy |
|---------|----------|
| Missing cultural profile | culturalConfidence=0, recommendedApproach='generic_respectful' |
| Sparse interaction history | engagementScore based solely on recency + debt stability |
| Conflicting debt signals | trust DB current debt; trend recalculated defensively |
| High anomaly in payments | flag paymentVolatilityHigh boolean |

## Metrics
- rep_profile_recompute_duration_ms
- rep_profile_cache_hit_ratio
- engagement_score_distribution (histogram)

## Security / Privacy
Return only non-sensitive aggregated metrics; raw financial transaction traces excluded.

## Future Extensions
- Time-decay vector store for qualitative notes.
- Offer outcome reinforcement learning hook.
- AB test experimental weighting schemes.
