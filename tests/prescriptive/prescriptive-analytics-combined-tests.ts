/** Combined Analytics Test: Sensitivity + Frontier Diversity */
import { computeConstraintSensitivityMetrics } from '../../shared/prescriptive/prescriptive-sensitivity.ts';
import { computeFrontier, computeFrontierDiversity, AxisSpec } from '../../shared/prescriptive/prescriptive-frontier.ts';
import { computeAdaptiveConstraintActions } from '../../shared/prescriptive/prescriptive-adaptive-constraints.ts';
import { simulateAdaptiveAdjustments } from '../../shared/prescriptive/prescriptive-adaptive-simulation.ts';
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

const cLatency: ConstraintDefinition = { id: 'lat', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200' };
const cCost: ConstraintDefinition = { id: 'cost', version: 'v1', kind: 'SOFT', severity: 'WARN', expression: 'cost < 5000' };

const scenarios = [
  { id: 'S1', factors: { latency: 150, cost: 4000, quality: 0.9 } },
  { id: 'S2', factors: { latency: 210, cost: 6000, quality: 0.85 } },
  { id: 'S3', factors: { latency: 190, cost: 7000, quality: 0.80 } },
  { id: 'S4', factors: { latency: 220, cost: 3000, quality: 0.95 } },
  { id: 'S5', factors: { latency: 199, cost: 4500, quality: 0.88 } }
];

const samples = scenarios.map(s => ({
  scenarioId: s.id,
  factors: s.factors,
  constraints: [ evaluateConstraint(cLatency, { metrics: s.factors }), evaluateConstraint(cCost, { metrics: s.factors }) ]
}));

const sensitivity = computeConstraintSensitivityMetrics(samples);
const axes: AxisSpec[] = [
  { name: 'latency', direction: 'MIN', selector: f => f.latency },
  { name: 'cost', direction: 'MIN', selector: f => f.cost },
  { name: 'quality', direction: 'MAX', selector: f => f.quality }
];
const frontierRes = computeFrontier({ samples, axes });
const diversity = computeFrontierDiversity(frontierRes.frontier, axes);
const adaptive = computeAdaptiveConstraintActions([cLatency, cCost], sensitivity.list);
const sim = simulateAdaptiveAdjustments({ constraints: [cLatency, cCost], adaptive: adaptive.actions, samples: scenarios.map(s => ({ scenarioId: s.id, metrics: s.factors })) });

console.log(JSON.stringify({ status: 'ANALYTICS_COMBINED_PASS', sensitivity: sensitivity.list.length, frontier: frontierRes.frontier.length, diversityPoints: diversity.pointCount, adaptiveTighten: adaptive.stats.tighten, adaptiveRelax: adaptive.stats.relax, adaptiveReview: adaptive.stats.review, simulationAdjusted: sim.adjustments.filter(a=>a.applied).length, feasibleDelta: sim.aggregate.feasibleRatioDelta }));
