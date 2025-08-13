/**
 * Sensitivity Metrics Tests
 */
import { computeConstraintSensitivityMetrics } from '../../shared/prescriptive/prescriptive-sensitivity.ts';
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

const hard: ConstraintDefinition = { id: 'lat', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200' };
const soft: ConstraintDefinition = { id: 'cost', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost < 5000' };
const txt: ConstraintDefinition = { id: 'lbl', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'label > 10' }; // non-numeric unsupported slack

const scenarios = [
  { id: 'S1', metrics: { latency: 150, cost: 4000, label: 'HIGH' } },
  { id: 'S2', metrics: { latency: 210, cost: 6000, label: 'LOW' } },
  { id: 'S3', metrics: { latency: 190, cost: 7000, label: 'MED' } },
  { id: 'S4', metrics: { latency: 220, cost: 3000, label: 'MID' } },
  { id: 'S5', metrics: { latency: 199, cost: 4500, label: 'HIGH' } }
];

const samples = scenarios.map(s => ({
  scenarioId: s.id,
  constraints: [ evaluateConstraint(hard, { metrics: s.metrics }), evaluateConstraint(soft, { metrics: s.metrics }), evaluateConstraint(txt, { metrics: s.metrics }) ]
}));

const sensitivity = computeConstraintSensitivityMetrics(samples);

function expect(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }

// Assertions
expect(sensitivity.list.length === 3, 'expected three constraints');
const lat = sensitivity.list.find(c => c.id==='lat')!;
expect(lat.violationRate > 0 && lat.violationRate < 1, 'lat violationRate boundary');
expect(lat.slackMean !== undefined, 'lat should have slackMean');
const lbl = sensitivity.list.find(c => c.id==='lbl')!;
expect(lbl.slackMean === undefined, 'non-numeric slack excluded');
const lowSupport = sensitivity.list.find(c => c.id==='lbl')!; // all evaluated but unsupported comparisons produce UNSUPPORTED so excluded from evaluable
expect(lowSupport.support >= 0, 'support computed');

console.log(JSON.stringify({ status: 'SENSITIVITY_PASS', constraints: sensitivity.list.length }));
