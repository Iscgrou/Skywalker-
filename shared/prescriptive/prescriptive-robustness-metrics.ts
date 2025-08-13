/**
 * Iteration 38 - Prescriptive Optimization: Robustness Metrics (Skeleton)
 * وابسته به خروجی Constraint DSL و نمونه‌گیری سناریو.
 * Feature Flag: PODSE_ROBUST_V1
 */

import { EvaluatedConstraintResult } from './prescriptive-constraint-dsl';
import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';

export interface RobustnessInput {
  scenarioId: string;
  objectiveValue: number;
  constraints: EvaluatedConstraintResult[];
}

export interface RobustnessMetrics {
  sampleSize: number;
  feasibleRatio: number; // درصد سناریوهایی که هیچ HARD نقض ندارند
  softPenaltyMean: number; // میانگین نقض soft (placeholder)
  objectiveMean: number;
  objectiveStd?: number;
  tailObjectiveP10?: number;
  tailObjectiveP90?: number;
  tailSpanRatio?: number; // نسبت گستره tail به قدر مطلق میانگین
  softHealth?: number; // 1/(1+softPenaltyMean^γ)
  stabilityFactor?: number; // 1/(1+normalizedStd)
  tailResilience?: number; // تابعی از tailSpanRatio
  robustnessScore: number; // نسخه v2
  timestamp: string;
}

function featureEnabled(): boolean {
  return process.env.PODSE_ROBUST_V1 === 'true';
}

export function computeRobustnessMetrics(samples: RobustnessInput[]): RobustnessMetrics {
  PrescriptiveTelemetry.startSpan('robustness.compute');
  if (!featureEnabled()) {
    const disabled = { sampleSize: 0, feasibleRatio: 0, softPenaltyMean: 0, objectiveMean: 0, robustnessScore: 0, timestamp: new Date().toISOString() } as RobustnessMetrics;
    PrescriptiveTelemetry.endSpan('robustness.compute');
    return disabled;
  }
  if (samples.length === 0) {
    const empty = { sampleSize: 0, feasibleRatio: 0, softPenaltyMean: 0, objectiveMean: 0, robustnessScore: 0, timestamp: new Date().toISOString() } as RobustnessMetrics;
    PrescriptiveTelemetry.endSpan('robustness.compute');
    return empty;
  }

  let feasibleCount = 0;
  let softPenaltyAccum = 0;
  let sum = 0;
  const objectives: number[] = [];

  for (const s of samples) {
    let hardViolated = false;
    for (const c of s.constraints) {
      if (c.definition.kind === 'HARD' && c.status === 'VIOLATED') {
        hardViolated = true; // نشانه‌گذاری اما حلقه را نمی‌شکنیم تا soft ها هم شمارش شوند
      }
      if (c.definition.kind === 'SOFT' && c.status === 'VIOLATED') {
        softPenaltyAccum += 1; // وزن ثابت v1
      }
    }
    if (!hardViolated) feasibleCount++;
    sum += s.objectiveValue;
    objectives.push(s.objectiveValue);
  }

  objectives.sort((a,b)=>a-b);
  const p = (q:number)=> objectives[Math.min(objectives.length-1, Math.max(0, Math.floor(q*(objectives.length-1))))];

  const mean = sum / samples.length;
  // انحراف معیار ساده
  const variance = objectives.reduce((acc,v)=>acc + Math.pow(v-mean,2),0)/samples.length;
  const std = Math.sqrt(variance);

  // --- Calibration v2 ---
  const softPenaltyMean = softPenaltyAccum / samples.length;
  const gamma = 1; // در v2 ساده
  const softHealth = 1 / (1 + Math.pow(softPenaltyMean, gamma)); // کاهش یکنواخت
  // Stability: نرمال‌سازی std نسبت به |mean| برای scale invariance نسبی (اجتناب از تقسیم بر صفر)
  const denom = Math.max(1e-9, Math.abs(mean));
  const normalizedStd = std / denom;
  const stabilityFactor = 1 / (1 + normalizedStd);
  // Tail resilience: هرچه فاصله بین P90 و P10 نسبت به mean کوچک‌تر → امتیاز بالاتر
  const span = p(0.9) - p(0.1);
  const tailSpanRatio = span / (denom || 1);
  const tailResilience = 1 / (1 + Math.max(0, tailSpanRatio));
  // وزن‌دهی نسخه v2
  const w_h = 0.55, w_s = 0.15, w_stab = 0.15, w_tail = 0.15;
  const feasibleRatio = feasibleCount / samples.length;
  const robustnessScore = (w_h * feasibleRatio) + (w_s * softHealth) + (w_stab * stabilityFactor) + (w_tail * tailResilience);

  const result: RobustnessMetrics = {
    sampleSize: samples.length,
  feasibleRatio,
  softPenaltyMean,
  objectiveMean: mean,
  objectiveStd: std,
  tailObjectiveP10: p(0.1),
  tailObjectiveP90: p(0.9),
  tailSpanRatio,
  softHealth,
  stabilityFactor,
  tailResilience,
  robustnessScore,
  timestamp: new Date().toISOString()
  };
  PrescriptiveTelemetry.counter('robustness.samples', samples.length);
  PrescriptiveTelemetry.endSpan('robustness.compute');
  return result;
}
