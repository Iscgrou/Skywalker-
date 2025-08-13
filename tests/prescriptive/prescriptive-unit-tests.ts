/**
 * Unit Tests v1 - Prescriptive Constraint DSL & Robustness Metrics
 * هدف: پوشش سریع سناریوهای مرزی و ضد مثال‌ها بدون افزودن فریمورک (اجرای دستی)
 * اجرا: npm run test:prescriptive:unit
 */
import { parseConstraintExpression, evaluateConstraint, summarizeConstraintResults, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';
import { computeRobustnessMetrics, RobustnessInput } from '../../shared/prescriptive/prescriptive-robustness-metrics.ts';

// اطمینان از فعال بودن فلگ هنگام اجرای تست حتی اگر اسکریپت فراموش کند
if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';
const FLAG = process.env.PODSE_ROBUST_V1 === 'true';
if (!FLAG) {
  console.log('[PODSE_ROBUST_V1 disabled] Skipping tests.');
  process.exit(0);
}

interface TestCase { name: string; run: () => void; }
const failures: { name: string; error: any }[] = [];
function t(name: string, fn: () => void) { try { fn(); } catch (e) { failures.push({ name, error: e }); } }
function assert(cond: any, msg: string) { if (!cond) throw new Error(msg); }

// 1) Parser Tests
 t('parse valid simple expression', () => {
  const p = parseConstraintExpression('latency <= 200');
  assert(!('error' in p), 'should parse');
 });
 t('parse invalid operator', () => {
  const p = parseConstraintExpression('revenue >> 100');
  assert('error' in p, 'should flag unsupported operator');
 });
 t('parse missing RHS', () => {
  const p = parseConstraintExpression('profit >');
  assert('error' in p, 'should detect missing right side');
 });

// 2) Evaluation Tests
const baseConstraint: ConstraintDefinition = { id: 'c1', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200' };
 t('evaluate satisfied boundary', () => {
  const r = evaluateConstraint(baseConstraint, { metrics: { latency: 200 } });
  assert(r.status === 'SATISFIED', 'expected SATISFIED at boundary');
 });
 t('evaluate violated', () => {
  const r = evaluateConstraint(baseConstraint, { metrics: { latency: 250 } });
  assert(r.status === 'VIOLATED', 'expected VIOLATED');
 });
 t('conditional unmatched returns UNKNOWN', () => {
  const cond: ConstraintDefinition = { id: 'c2', version: 'v1', kind: 'CONDITIONAL', severity: 'INFO', expression: 'demand >= 10', activationPredicate: 'region == EU' };
  const r = evaluateConstraint(cond, { metrics: { region: 'NA', demand: 5 } });
  assert(r.status === 'UNKNOWN', 'expected UNKNOWN when activation not matched');
 });
 t('dynamic insufficient context', () => {
  const dyn: ConstraintDefinition = { id: 'c3', version: 'v1', kind: 'DYNAMIC', severity: 'WARN', expression: 'adaptive_score >= 0.8', requiredContextKeys: ['adaptive_score'] };
  const r = evaluateConstraint(dyn, { metrics: {} });
  assert(r.status === 'INSUFFICIENT_CONTEXT', 'expected INSUFFICIENT_CONTEXT');
 });

// 3) Summary Tests
 t('summary counts', () => {
  const defs: ConstraintDefinition[] = [
    baseConstraint,
    { id: 'c2', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 100' },
    { id: 'c3', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost <= 5000' }
  ];
  const ctx = { metrics: { latency: 150, cost: 7000 } };
  const results = defs.map(d => evaluateConstraint(d, ctx));
  const sum = summarizeConstraintResults(results);
  assert(sum.total === 3, 'total mismatch');
  assert(sum.satisfied === 1, 'satisfied mismatch');
  assert(sum.violated === 2, 'violated mismatch (one hard + one soft)');
 });

// 4) Robustness Metrics Tests
 t('robustness basic calculation', () => {
  const hard: ConstraintDefinition = { id: 'h', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 100' };
  const soft: ConstraintDefinition = { id: 's', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost <= 5000' };
  const samples: RobustnessInput[] = [
    { scenarioId: 'A', objectiveValue: 10, constraints: [ evaluateConstraint(hard, { metrics: { latency: 90 } }), evaluateConstraint(soft, { metrics: { cost: 4000 } }) ] },
    { scenarioId: 'B', objectiveValue: 5, constraints: [ evaluateConstraint(hard, { metrics: { latency: 120 } }), evaluateConstraint(soft, { metrics: { cost: 6000 } }) ] }
  ];
  const metrics = computeRobustnessMetrics(samples);
  // با فعال بودن فلگ باید نمونه‌ها محاسبه شوند
  assert(metrics.sampleSize === 2, `sample size mismatch: ${metrics.sampleSize}`);
  assert(Math.abs(metrics.feasibleRatio - 0.5) < 1e-9, `feasibleRatio expected 0.5 got ${metrics.feasibleRatio}`);
  assert(Math.abs(metrics.softPenaltyMean - 0.5) < 1e-9, `softPenaltyMean expected 0.5 got ${metrics.softPenaltyMean}`);
  assert(metrics.robustnessScore > 0 && metrics.robustnessScore <= 1, `robustnessScore range got ${metrics.robustnessScore}`);
 });

// 5) Unsupported non-numeric comparison
 t('unsupported non-numeric yields UNSUPPORTED', () => {
  const def: ConstraintDefinition = { id: 'txt', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'label > 10' };
  const r = evaluateConstraint(def, { metrics: { label: 'HIGH' } });
  assert(r.status === 'UNSUPPORTED', 'expected UNSUPPORTED with non-numeric comparison');
 });

// گزارش نهایی
if (failures.length === 0) {
  console.log(JSON.stringify({ status: 'PASS', total: 12 }));
} else {
  console.error(JSON.stringify({ status: 'FAIL', failures: failures.map(f => ({ name: f.name, error: String(f.error) })) }));
  process.exit(1);
}
