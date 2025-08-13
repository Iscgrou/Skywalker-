/**
 * AND Expression Tests (v1.1)
 * Validates linear AND semantics & precedence.
 * Run: npm run test:prescriptive:constraint:and
 */
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

interface Case { name: string; def: ConstraintDefinition; ctx: any; expect: string; }
const cases: Case[] = [
  {
    name: 'all satisfied simple numeric',
    def: { id: 'and1', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200 AND cost < 5000' },
    ctx: { metrics: { latency: 150, cost: 4000 } },
    expect: 'SATISFIED'
  },
  {
    name: 'one violated causes violated',
    def: { id: 'and2', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'latency <= 200 AND cost < 5000' },
    ctx: { metrics: { latency: 250, cost: 4000 } },
    expect: 'VIOLATED'
  },
  {
    name: 'dynamic missing metric -> insufficient context precedence over unsupported/unknown',
    def: { id: 'and3', version: 'v1', kind: 'DYNAMIC', severity: 'WARN', expression: 'adaptive_score >= 0.8 AND cost < 5000' },
    ctx: { metrics: { cost: 3000 } },
    expect: 'INSUFFICIENT_CONTEXT'
  },
  {
    name: 'unknown when missing metric in non-dynamic',
    def: { id: 'and4', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'revenue > 1000 AND latency < 300' },
    ctx: { metrics: { latency: 100 } },
    expect: 'UNKNOWN'
  },
  {
    name: 'unsupported sub-expression due to invalid operator',
    def: { id: 'and5', version: 'v1', kind: 'HARD', severity: 'BLOCK', expression: 'profit >> 10 AND latency < 300' },
    ctx: { metrics: { profit: 50, latency: 100 } },
    expect: 'UNSUPPORTED'
  },
  {
    name: 'precedence violated dominates others',
    def: { id: 'and6', version: 'v1', kind: 'DYNAMIC', severity: 'WARN', expression: 'adaptive_score >= 0.8 AND latency < 300 AND cost < 5000' },
    ctx: { metrics: { adaptive_score: 0.9, latency: 400, cost: 4000 } },
    expect: 'VIOLATED'
  }
];

const results = cases.map(c => ({ name: c.name, r: evaluateConstraint(c.def, c.ctx) }));
let pass = 0; const failures: any[] = [];
for (const { name, r } of results) {
  if (r.status === cases.find(cc => cc.name === name)!.expect) pass++; else failures.push({ name, got: r.status, expect: cases.find(cc => cc.name === name)!.expect, details: r.details });
}

if (failures.length === 0) {
  console.log(JSON.stringify({ status: 'AND_PASS', cases: pass }));
} else {
  console.error(JSON.stringify({ status: 'AND_FAIL', failures }));
  process.exit(1);
}
