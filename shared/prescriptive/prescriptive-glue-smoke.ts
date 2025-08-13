/**
 * Iteration 38 - Prescriptive Glue Smoke Test (v1)
 * زنجیره: Sampler -> Constraints Eval -> Summary -> Robustness Metrics
 * هدف: تایید یکپارچگی مسیر پایه قبل از پیچیده‌سازی.
 */

import { generateScenarioBatch } from './prescriptive-scenario-sampler.ts';
import { ConstraintDefinition, evaluateConstraint, summarizeConstraintResults } from './prescriptive-constraint-dsl.ts';
import { computeRobustnessMetrics, RobustnessInput } from './prescriptive-robustness-metrics.ts';
import { computeFrontier } from './prescriptive-frontier.ts';
import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';

function featureEnabled() { return process.env.PODSE_ROBUST_V1 === 'true'; }

if (!featureEnabled()) {
  // اگر فلگ خاموش است خروج آرام
  // eslint-disable-next-line no-console
  console.log('[PODSE_ROBUST_V1 disabled] Skipping prescriptive smoke.');
} else {
  // 1) تعریف Constraints نمونه
  const constraints: ConstraintDefinition[] = [
    { id: 'c_latency', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 220', description: 'Latency must stay under threshold' },
    { id: 'c_cost_soft', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost <= 6000', description: 'Prefer lower cost' },
    { id: 'c_demand_region', version: 'v1', kind: 'CONDITIONAL', severity: 'INFO', expression: 'demand >= 10', activationPredicate: 'region == EU', description: 'Demand minimum in EU' },
    { id: 'c_dynamic_missing', version: 'v1', kind: 'DYNAMIC', severity: 'WARN', expression: 'adaptive_score >= 0.7', requiredContextKeys: ['adaptive_score'] }
  ];

  // 2) تولید سناریوها
  const seed = Number(process.env.PODSE_ROBUST_SEED || Date.now());
  PrescriptiveTelemetry.startSpan('sampler.generate');
  const scenarios = generateScenarioBatch({ total: 30, strata: [ { id: 'normal', weight: 2 }, { id: 'high_load', weight: 1 } ], tailFocusRatio: 0.2 }, seed);
  PrescriptiveTelemetry.endSpan('sampler.generate');

  // 3) تزریق context ساده (در v1 region فقط EU برای نیمی از normal)
  const resultsPerScenario: { scenarioId: string; constraintResults: any[]; objective: number; factors: Record<string, number> }[] = [];

  for (const s of scenarios) {
    const isEU = s.stratumId === 'normal' && parseInt(s.scenarioId.split('-')[1] || '0',10) % 2 === 0;
    const ctx = {
      metrics: {
        ...s.factors,
        region: isEU ? 'EU' : 'NA'
        // adaptive_score عمداً حذف شده تا DYNAMIC به INSUFFICIENT_CONTEXT برسد
      }
    };
  PrescriptiveTelemetry.startSpan('constraints.evaluate.batch');
  const evaluated = constraints.map(c => evaluateConstraint(c, ctx));
  PrescriptiveTelemetry.endSpan('constraints.evaluate.batch');
    const objective = (100 - (s.factors.latency || 0)) + (s.factors.demand || 0) - (s.factors.cost || 0)/1000; // فرمول ساده موقت
  resultsPerScenario.push({ scenarioId: s.scenarioId, constraintResults: evaluated, objective, factors: s.factors });
  }

  // 4) خلاصه Constraints
  const flat = resultsPerScenario.flatMap(r => r.constraintResults);
  const summary = summarizeConstraintResults(flat);

  // 5) ساخت ورودی متریک Robustness
  const robustnessInputs: RobustnessInput[] = resultsPerScenario.map(r => ({
    scenarioId: r.scenarioId,
    objectiveValue: r.objective,
    constraints: r.constraintResults
  }));
  const robustness = computeRobustnessMetrics(robustnessInputs);

  // 6) خروجی نهایی
  // eslint-disable-next-line no-console
  const frontier = computeFrontier({ samples: resultsPerScenario.map(r => ({ scenarioId: r.scenarioId, constraints: r.constraintResults, factors: r.factors })) });
  const telemetry = PrescriptiveTelemetry.snapshot();
  console.log(JSON.stringify({ summary, robustness, frontier, telemetry, seed }, null, 2));
}
