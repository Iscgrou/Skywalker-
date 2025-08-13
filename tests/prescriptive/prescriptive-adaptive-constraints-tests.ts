/** Adaptive Constraint Actions Tests */
import { computeConstraintSensitivityMetrics } from '../../shared/prescriptive/prescriptive-sensitivity.ts';
import { computeAdaptiveConstraintActions } from '../../shared/prescriptive/prescriptive-adaptive-constraints.ts';
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

// Define constraints
const c1: ConstraintDefinition = { id: 'lat', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200' };
const c2: ConstraintDefinition = { id: 'cost', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost < 5000' };
const c3: ConstraintDefinition = { id: 'margin', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'margin >= 30' };
const c4: ConstraintDefinition = { id: 'stability', version: 'v1', kind: 'SOFT', severity: 'INFO', expression: 'stability_score >= 0.9' };
const c5: ConstraintDefinition = { id: 'rare', version: 'v1', kind: 'SOFT', severity: 'INFO', expression: 'rare_metric <= 10' };
// قید با حاشیه بسیار بالا برای ایجاد RELAX (over_safe)
const c6: ConstraintDefinition = { id: 'buffer', version: 'v1', kind: 'SOFT', severity: 'INFO', expression: 'buffer <= 1000' };

// Build scenarios
const scen = [
  { id: 'S1', factors: { latency: 150, cost: 4000, margin: 32, stability_score: 0.95, rare_metric: 5, buffer: 120 } },
  { id: 'S2', factors: { latency: 210, cost: 6000, margin: 35, stability_score: 0.94, rare_metric: 6, buffer: 130 } },
  { id: 'S3', factors: { latency: 190, cost: 7000, margin: 10, stability_score: 0.96, rare_metric: 7, buffer: 110 } },
  { id: 'S4', factors: { latency: 220, cost: 3000, margin: 8, stability_score: 0.97, rare_metric: 8, buffer: 100 } },
  { id: 'S5', factors: { latency: 199, cost: 4500, margin: 31, stability_score: 0.93, rare_metric: 9, buffer: 140 } }
];

const samples = scen.map(s => ({
  scenarioId: s.id,
  factors: s.factors,
  constraints: [
    evaluateConstraint(c1, { metrics: s.factors }),
    evaluateConstraint(c2, { metrics: s.factors }),
    evaluateConstraint(c3, { metrics: s.factors }),
    evaluateConstraint(c4, { metrics: s.factors }),
  evaluateConstraint(c5, { metrics: s.factors }),
  evaluateConstraint(c6, { metrics: s.factors })
  ]
}));

const sensitivity = computeConstraintSensitivityMetrics(samples);
const actionsSummary = computeAdaptiveConstraintActions([c1,c2,c3,c4,c5,c6], sensitivity.list);

function assert(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }
assert(actionsSummary.actions.length === 6, 'expected 6 actions');

const hasTighten = actionsSummary.actions.some(a => a.action === 'TIGHTEN');
const hasRelaxOrFlag = actionsSummary.actions.some(a => a.action === 'RELAX' || a.action === 'FLAG_REVIEW');
assert(hasTighten, 'should have at least one TIGHTEN');
assert(hasRelaxOrFlag, 'should have at least one RELAX/FLAG');

console.log(JSON.stringify({ status: 'ADAPTIVE_PASS', tighten: actionsSummary.stats.tighten, relax: actionsSummary.stats.relax, review: actionsSummary.stats.review }));
