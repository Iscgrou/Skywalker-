/**
 * Iteration 39b - Adaptive Constraint Weighting & Tightening (v1 Rule Engine)
 */
import { ConstraintDefinition } from './prescriptive-constraint-dsl.ts';
import { ConstraintSensitivity } from './prescriptive-sensitivity.ts';
import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';

export interface AdaptiveConfig {
  criticalityHigh: number;
  criticalityLow: number;
  stabilityHigh: number;
  supportLow: number;
  slackTightenableMean: number;
}
export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  criticalityHigh: 0.4,
  criticalityLow: 0.05,
  stabilityHigh: 0.75,
  supportLow: 0.2,
  slackTightenableMean: 15
};

export interface AdaptiveConstraintAction {
  id: string;
  action: 'TIGHTEN' | 'RELAX' | 'KEEP' | 'FLAG_REVIEW';
  reason: string;
  suggestedDelta?: number;
  priority: number;
}
export interface AdaptiveSummary { actions: AdaptiveConstraintAction[]; generatedAt: string; stats: { tighten: number; relax: number; keep: number; review: number } }

function featureEnabled(): boolean { return process.env.PODSE_ROBUST_V1 === 'true'; }

export function computeAdaptiveConstraintActions(
  constraints: ConstraintDefinition[],
  sensitivityList: ConstraintSensitivity[],
  cfg: AdaptiveConfig = DEFAULT_ADAPTIVE_CONFIG
): AdaptiveSummary {
  if (!featureEnabled()) return { actions: [], generatedAt: new Date().toISOString(), stats: { tighten:0, relax:0, keep:0, review:0 } };
  const sensMap: Record<string, ConstraintSensitivity> = {};
  for (const s of sensitivityList) sensMap[s.id] = s;
  const actions: AdaptiveConstraintAction[] = [];
  for (const def of constraints) {
    const s = sensMap[def.id];
    if (!s) { // بدون داده حساسیت
      actions.push({ id: def.id, action: 'FLAG_REVIEW', reason: 'no_sensitivity_data', priority: 50 });
      continue;
    }
    let decided: AdaptiveConstraintAction | undefined;
    const crit = s.normalizedCriticality;
    const violRate = s.violationRate;
    const slackMean = s.slackMean;
    const stability = s.stabilityScore ?? 0;
    // Rule 1: low support
    if (!decided && s.lowSupport) decided = { id: def.id, action: 'FLAG_REVIEW', reason: 'low_support', priority: 60 };
    // Rule 2: over safe
    if (!decided && violRate === 0 && slackMean !== undefined && slackMean > 50) decided = { id: def.id, action: 'RELAX', reason: 'over_safe', suggestedDelta: -0.05, priority: 40 };
    // Rule 3: high criticality
    if (!decided && crit >= cfg.criticalityHigh) decided = { id: def.id, action: 'TIGHTEN', reason: 'high_criticality', suggestedDelta: 0.1, priority: 90 };
    // Rule 4: low impact stable
    if (!decided && crit < cfg.criticalityLow && stability >= cfg.stabilityHigh) decided = { id: def.id, action: 'RELAX', reason: 'low_impact_stable', suggestedDelta: -0.1, priority: 50 };
    // Rule 5: narrow margin with violations
    if (!decided && slackMean !== undefined && slackMean > 0 && slackMean < cfg.slackTightenableMean && violRate > 0) decided = { id: def.id, action: 'TIGHTEN', reason: 'narrow_margin', suggestedDelta: 0.05, priority: 70 };
    // Default
    if (!decided) decided = { id: def.id, action: 'KEEP', reason: 'default', priority: 10 };
    // HARD relax guard
    if (def.kind === 'HARD' && decided.action === 'RELAX' && !(slackMean !== undefined && slackMean > 100)) {
      decided = { id: def.id, action: 'FLAG_REVIEW', reason: 'hard_relax_guard', priority: 65 };
    }
    actions.push(decided);
  }
  const stats = { tighten:0, relax:0, keep:0, review:0 };
  for (const a of actions) {
    if (a.action === 'TIGHTEN') stats.tighten++; else if (a.action === 'RELAX') stats.relax++; else if (a.action === 'KEEP') stats.keep++; else stats.review++;
  }
  PrescriptiveTelemetry.counter('constraints.adaptive.actions', actions.length);
  const summary = { actions, generatedAt: new Date().toISOString(), stats };
  PrescriptiveTelemetry.attachAdaptiveSummary(summary);
  return summary;
}
