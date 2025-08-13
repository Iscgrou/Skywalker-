/** Telemetry Adaptive Summary Test */
import { computeConstraintSensitivityMetrics } from '../../shared/prescriptive/prescriptive-sensitivity.ts';
import { computeAdaptiveConstraintActions } from '../../shared/prescriptive/prescriptive-adaptive-constraints.ts';
import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

const c1: ConstraintDefinition = { id: 'lat', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200' };
const c2: ConstraintDefinition = { id: 'cost', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost < 5000' };

const scenarios = [
  { id: 'A', factors: { latency: 150, cost: 4000 } },
  { id: 'B', factors: { latency: 210, cost: 6000 } },
  { id: 'C', factors: { latency: 190, cost: 7000 } }
];

const samples = scenarios.map(s => ({
  scenarioId: s.id,
  factors: s.factors,
  constraints: [ evaluateConstraint(c1, { metrics: s.factors }), evaluateConstraint(c2, { metrics: s.factors }) ]
}));

const sensitivity = computeConstraintSensitivityMetrics(samples);
computeAdaptiveConstraintActions([c1,c2], sensitivity.list);
const snap = PrescriptiveTelemetry.snapshot();
const adaptive = (snap.rollups as any).adaptiveSummary;

if (!adaptive || !adaptive.top || adaptive.top.length === 0) {
  console.error(JSON.stringify({ status: 'ADAPTIVE_TELEMETRY_FAIL', snapshot: snap }));
  process.exit(1);
}
console.log(JSON.stringify({ status: 'ADAPTIVE_TELEMETRY_PASS', top: adaptive.top.length, stats: adaptive.stats }));
