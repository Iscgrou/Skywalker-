/**
 * Iteration 39 - Constraint Sensitivity Metrics (Phase Analytical)
 * Feature Flag Reuse: PODSE_ROBUST_V1 (در صورت غیرفعال بودن، خروجی خالی)
 */
import { EvaluatedConstraintResult } from './prescriptive-constraint-dsl.ts';
import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';

export interface ConstraintSensitivity {
  id: string;
  violationRate: number;
  support: number;
  evaluated: number;
  totalSamples: number;
  slackMean?: number; slackStd?: number; slackMin?: number; slackP10?: number; slackP90?: number;
  normalizedCriticality: number;
  volatility?: number; stabilityScore?: number;
  lowSupport: boolean;
}
export interface ConstraintSensitivitySummary { list: ConstraintSensitivity[]; generatedAt: string; }

function featureEnabled(): boolean { return process.env.PODSE_ROBUST_V1 === 'true'; }

function stats(values: number[]): { mean: number; std: number; min: number; p10: number; p90: number } | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a,b)=>a-b);
  const n = sorted.length;
  const mean = sorted.reduce((a,b)=>a+b,0)/n;
  const variance = n>1 ? sorted.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(n-1) : 0;
  const std = Math.sqrt(variance);
  const idx = (p: number) => sorted[Math.min(n-1, Math.floor(p*(n-1)))];
  return { mean, std, min: sorted[0], p10: idx(0.1), p90: idx(0.9) };
}

function computeSlack(r: EvaluatedConstraintResult): number | undefined {
  if (!r.operator) return undefined;
  if (r.valueLeft == null || r.valueRight == null) return undefined;
  const leftNum = Number(r.valueLeft); const rightNum = Number(r.valueRight);
  if (isNaN(leftNum) || isNaN(rightNum)) return undefined;
  switch(r.operator){
    case '<=': return rightNum - leftNum; // positive = margin
    case '<': return rightNum - leftNum;
    case '>=': return leftNum - rightNum;
    case '>': return leftNum - rightNum;
    default: return undefined; // == یا != حذف
  }
}

export function computeConstraintSensitivityMetrics(samples: { scenarioId: string; constraints: EvaluatedConstraintResult[] }[]): ConstraintSensitivitySummary {
  if (!featureEnabled()) return { list: [], generatedAt: new Date().toISOString() };
  const map: Record<string, { results: EvaluatedConstraintResult[] }> = {};
  for (const s of samples) {
    for (const c of s.constraints) {
      if (!map[c.definition.id]) map[c.definition.id] = { results: [] };
      map[c.definition.id].results.push(c);
    }
  }
  const totalSamples = samples.length;
  const list: ConstraintSensitivity[] = [];
  for (const id of Object.keys(map)) {
    const rs = map[id].results;
    const evaluable = rs.filter(r => r.status !== 'UNKNOWN' && r.status !== 'UNSUPPORTED' && r.status !== 'INSUFFICIENT_CONTEXT');
    const violations = evaluable.filter(r => r.status === 'VIOLATED');
    const violationRate = evaluable.length ? violations.length / evaluable.length : 0;
    const support = totalSamples ? evaluable.length / totalSamples : 0;
    const slackVals: number[] = [];
    for (const r of evaluable) {
      const sl = computeSlack(r);
      if (sl !== undefined) slackVals.push(sl);
    }
    const stat = stats(slackVals);
    let normalizedCriticality = violationRate;
    let volatility: number | undefined; let stabilityScore: number | undefined;
    if (stat) {
      normalizedCriticality = violationRate * (1 / (1 + Math.max(0, stat.mean)));
      volatility = (Math.abs(stat.mean) + 1e-9) > 0 ? stat.std / (Math.abs(stat.mean) + 1e-9) : undefined;
      stabilityScore = volatility !== undefined ? 1 - Math.min(1, volatility) : undefined;
    }
    list.push({
      id,
      violationRate,
      support,
      evaluated: evaluable.length,
      totalSamples,
      slackMean: stat?.mean,
      slackStd: stat?.std,
      slackMin: stat?.min,
      slackP10: stat?.p10,
      slackP90: stat?.p90,
      normalizedCriticality,
      volatility,
      stabilityScore,
      lowSupport: support < 0.2
    });
  }
  PrescriptiveTelemetry.counter('sensitivity.evals', list.length);
  return { list, generatedAt: new Date().toISOString() };
}
