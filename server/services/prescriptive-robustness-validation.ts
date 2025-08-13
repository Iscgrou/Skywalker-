/**
 * Iteration 38 - Harness اعتبارسنجی Robustness / Constraints (V1)
 * هدف: ایجاد حلقه بازخورد سریع برای DSL محدودیت، متریک‌های Robustness و طبقه‌بندی استیت‌ها.
 * سه مجموعه سناریو:
 *  1) ALL_PASS: تمام محدودیت‌های سخت و نرم باید SATISFIED / UNKNOWN (برای شرطی غیرفعال) باشند.
 *  2) ALL_FAIL: طراحی مقادیر که اکثر HARD نقض شوند + فعال‌سازی شرطی برای VIOLATED.
 *  3) MIXED: ترکیب پاسخ‌ها + پوشش DYNAMIC با و بدون context.
 * ضد مثال‌های کلیدی که باید پوشش داده شوند:
 *  - شرطی region == EU وقتی region != EU => UNKNOWN نه VIOLATED.
 *  - کمبود adaptive_score => INSUFFICIENT_CONTEXT برای DYNAMIC.
 *  - اپراتور معتبر ولی مقدار مرزی (== و <=) درست ارزیابی شود.
 */
import { ConstraintDefinition, evaluateConstraint, summarizeConstraintResults } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';
import { computeRobustnessMetrics, RobustnessInput } from '../../shared/prescriptive/prescriptive-robustness-metrics.ts';
import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';

function featureEnabled() { return process.env.PODSE_ROBUST_V1 === 'true'; }
if (!featureEnabled()) {
  // eslint-disable-next-line no-console
  console.log('[PODSE_ROBUST_V1 disabled] Skipping prescriptive robustness validation.');
  process.exit(0);
}

// تعریف Constraints ثابت برای تست (مشابه smoke با تغییرات مرزی)
const constraints: ConstraintDefinition[] = [
  { id: 'latency_cap', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200' },
  { id: 'cost_pref', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost <= 4000' },
  { id: 'eu_demand_min', version: 'v1', kind: 'CONDITIONAL', severity: 'INFO', expression: 'demand >= 50', activationPredicate: 'region == EU' },
  { id: 'adaptive_score_min', version: 'v1', kind: 'DYNAMIC', severity: 'WARN', expression: 'adaptive_score >= 0.8', requiredContextKeys: ['adaptive_score'] }
];

interface Scenario { id: string; metrics: Record<string, any>; }

// 1) ALL_PASS: latency پایین، cost پایین، region NA پس شرطی غیر فعال، adaptive_score حاضر و بالا
const allPass: Scenario[] = Array.from({ length: 5 }).map((_,i) => ({
  id: `P${i}`,
  metrics: { latency: 150, cost: 2000, region: 'NA', demand: 10, adaptive_score: 0.95 }
}));

// 2) ALL_FAIL: latency بالا، cost بالا، region EU فعال + demand پایین => violation، adaptive_score پایین => violation
const allFail: Scenario[] = Array.from({ length: 5 }).map((_,i) => ({
  id: `F${i}`,
  metrics: { latency: 350, cost: 9000, region: 'EU', demand: 20, adaptive_score: 0.3 }
}));

// 3) MIXED: حالات ترکیبی + حذف adaptive_score در برخی
const mixed: Scenario[] = [
  { id: 'M1', metrics: { latency: 180, cost: 5000, region: 'EU', demand: 49, adaptive_score: 0.85 } }, // CONDITIONAL VIOLATED (49 < 50), cost soft violated
  { id: 'M2', metrics: { latency: 199, cost: 3999, region: 'EU', demand: 55, adaptive_score: 0.81 } }, // All satisfied
  { id: 'M3', metrics: { latency: 210, cost: 4100, region: 'NA', demand: 5 } }, // latency violated, cost violated, conditional UNKNOWN, dynamic insufficient
  { id: 'M4', metrics: { latency: 50, cost: 10000, region: 'EU', demand: 60, adaptive_score: 0.79 } }, // soft violated, dynamic violated
  { id: 'M5', metrics: { latency: 50, cost: 1000, region: 'NA', demand: 5, adaptive_score: 0.9 } } // mostly satisfied
];

function evalSet(label: string, scenarios: Scenario[]) {
  const perScenario = scenarios.map(s => {
    const res = constraints.map(c => evaluateConstraint(c, { metrics: s.metrics }));
    return { id: s.id, results: res, metrics: s.metrics };
  });
  const flat = perScenario.flatMap(r => r.results);
  const summary = summarizeConstraintResults(flat);
  const robustnessInputs: RobustnessInput[] = perScenario.map(r => ({
    scenarioId: r.id,
    objectiveValue: objectiveFormula(r.metrics),
    constraints: r.results
  }));
  const robustness = computeRobustnessMetrics(robustnessInputs);
  return { label, perScenario, summary, robustness };
}

function objectiveFormula(m: Record<string, any>) {
  return (100 - (m.latency ?? 0)) + (m.demand ?? 0) - (m.cost ?? 0)/1000 + (m.adaptive_score ? m.adaptive_score * 10 : 0);
}

// اجرای ست‌ها
const sets = [
  evalSet('ALL_PASS', allPass),
  evalSet('ALL_FAIL', allFail),
  evalSet('MIXED', mixed)
];

// معیارهای پذیرش (Assertions ساده)
interface Expectation { label: string; predicate: () => boolean; msg: string; }
const expectations: Expectation[] = [
  { label: 'ALL_PASS no violations', predicate: () => sets[0].summary.violated === 0, msg: 'ALL_PASS نباید violation داشته باشد.' },
  { label: 'ALL_FAIL has violations', predicate: () => sets[1].summary.violated > 0, msg: 'ALL_FAIL باید violation داشته باشد.' },
  { label: 'MIXED has insufficient', predicate: () => sets[2].summary.insufficient > 0, msg: 'MIXED باید حداقل یک INSUFFICIENT_CONTEXT داشته باشد.' },
  { label: 'Conditional unknown outside EU', predicate: () => sets[0].summary.unknown > 0, msg: 'شرطی در ALL_PASS باید UNKNOWN ثبت شود.' }
];

const failures = expectations.filter(e => !e.predicate());

const seed = Number(process.env.PODSE_ROBUST_SEED || 0);
const output = {
  timestamp: new Date().toISOString(),
  seed,
  constraints: constraints.map(c => ({ id: c.id, kind: c.kind })),
  sets: sets.map(s => ({ label: s.label, summary: s.summary, robustness: s.robustness })),
  expectations: expectations.map(e => ({ label: e.label, passed: e.predicate() })),
  failures: failures.map(f => ({ label: f.label, msg: f.msg })),
  telemetry: PrescriptiveTelemetry.snapshot() // Adding rollups in the output
};

// eslint-disable-next-line no-console
console.log(JSON.stringify(output, null, 2));

if (failures.length > 0) {
  // eslint-disable-next-line no-console
  console.error(`Validation FAILED (${failures.length} expectations)`);
  process.exit(1);
} else {
  // eslint-disable-next-line no-console
  console.log('Validation PASSED');
}
