/** Frontier unit test (minimal) */
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';
import { computeFrontier } from '../../shared/prescriptive/prescriptive-frontier.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

function assert(cond: any, msg: string) { if (!cond) throw new Error(msg); }

const hard: ConstraintDefinition = { id: 'h', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 100' };

const samples = [
  { scenarioId: 'A', constraints: [ evaluateConstraint(hard, { metrics: { latency: 80 } }) ], factors: { latency: 80, cost: 500, demand: 50 } },
  { scenarioId: 'B', constraints: [ evaluateConstraint(hard, { metrics: { latency: 90 } }) ], factors: { latency: 90, cost: 400, demand: 55 } }, // dominates A on cost & demand but slower latency (not strict across all)
  { scenarioId: 'C', constraints: [ evaluateConstraint(hard, { metrics: { latency: 70 } }) ], factors: { latency: 70, cost: 700, demand: 60 } },
  { scenarioId: 'D', constraints: [ evaluateConstraint(hard, { metrics: { latency: 95 } }) ], factors: { latency: 95, cost: 300, demand: 40 } },
  { scenarioId: 'E', constraints: [ evaluateConstraint(hard, { metrics: { latency: 60 } }) ], factors: { latency: 60, cost: 600, demand: 70 } }
];

const frontier = computeFrontier({ samples });
assert(frontier.frontier.length > 0, 'frontier empty');
// Ensure no frontier point is dominated by another frontier point
// ساختار جدید: p.values
for (const p of frontier.frontier) {
  for (const q of frontier.frontier) {
    if (p === q) continue;
    const qv = q.values; const pv = p.values;
    const dominates = (qv.latency <= pv.latency && qv.cost <= pv.cost && qv.demand >= pv.demand) && (qv.latency < pv.latency || qv.cost < pv.cost || qv.demand > pv.demand);
    if (dominates) throw new Error('Dominated point remained in frontier');
  }
}
console.log(JSON.stringify({ status: 'FRONTIER_PASS', size: frontier.frontier.length }));
