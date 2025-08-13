/** Frontier configurable axes tests */
import { computeFrontier, AxisSpec } from '../../shared/prescriptive/prescriptive-frontier.ts';
import { EvaluatedConstraintResult } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';
if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1='true';

function makeSample(id:string, factors:Record<string,number>, hardOk=true): {scenarioId:string; constraints:EvaluatedConstraintResult[]; factors:Record<string,number>} {
  const constraints: EvaluatedConstraintResult[] = [
    { definition: { id:'h', version:'v1', kind:'HARD', severity:'BLOCK', expression:'x <= 1' }, status: hardOk? 'SATISFIED':'VIOLATED', timestamp:new Date().toISOString() }
  ];
  return { scenarioId:id, constraints, factors };
}

// سناریو: محور سفارشی واحد (cost MIN)
const samples1 = [
  makeSample('A',{ cost:100, latency:5, demand:10 }),
  makeSample('B',{ cost:80, latency:7, demand:9 }),
  makeSample('C',{ cost:120, latency:3, demand:11 })
];
const axes1: AxisSpec[] = [ { name:'cost', direction:'MIN', selector:f=>f.cost } ];
const r1 = computeFrontier({ samples: samples1, axes: axes1 });
if (r1.frontier.length !== 1) throw new Error('Single-axis frontier should have exactly one optimal point');

// سناریو: محورها ترکیبی (latency MIN, demand MAX) بدون cost
const axes2: AxisSpec[] = [ { name:'latency', direction:'MIN', selector:f=>f.latency }, { name:'demand', direction:'MAX', selector:f=>f.demand } ];
const r2 = computeFrontier({ samples: samples1, axes: axes2 });
// B: latency 7 demand 9, A:5/10, C:3/11 -> C dominates A, A dominates B, frontier باید فقط C باشد
if (r2.frontier.length !== 1) throw new Error('Latency/Demand frontier expected single point');

// سناریو: همه مقادیر برابر → همه در فرانتیر
const samplesEqual = [
  makeSample('E1',{ cost:50, latency:10, demand:5 }),
  makeSample('E2',{ cost:50, latency:10, demand:5 }),
  makeSample('E3',{ cost:50, latency:10, demand:5 })
];
const r3 = computeFrontier({ samples: samplesEqual });
if (r3.frontier.length !== 1) throw new Error('Dedup equal points should keep one');

// سناریو: محور با مقدار NaN → حذف سناریو
const samplesNaN = [ makeSample('N1',{ cost: 10, latency: 5, demand: 7 }), makeSample('N2',{ cost: 20, latency: Number.NaN, demand: 9 }) ];
const r4 = computeFrontier({ samples: samplesNaN });
if (r4.discardedInvalid < 1) throw new Error('NaN factor should discard sample');

// سناریو: همه infeasible → frontier خالی
const infeasible = [ makeSample('I1',{ cost:5, latency:1, demand:1 }, false), makeSample('I2',{ cost:6, latency:2, demand:1 }, false) ];
const r5 = computeFrontier({ samples: infeasible });
if (r5.frontier.length !== 0 || r5.feasibleCount !== 0) throw new Error('All infeasible should yield empty frontier');

console.log(JSON.stringify({ status:'FRONTIER_CONFIG_PASS', f1:r1.frontier.length, f2:r2.frontier.length, equal:r3.frontier.length, discarded:r4.discardedInvalid }));
