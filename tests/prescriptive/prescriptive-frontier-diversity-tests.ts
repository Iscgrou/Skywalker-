/** Frontier Diversity Metrics Tests */
import { computeFrontier, computeFrontierDiversity, AxisSpec } from '../../shared/prescriptive/prescriptive-frontier.ts';

if (!process.env.PODSE_ROBUST_V1) process.env.PODSE_ROBUST_V1 = 'true';

// Build synthetic samples consistent with computeFrontier input
const sampleFactors = [
  { scenarioId: 'A', factors: { cost: 100, quality: 0.9, latency: 150 } },
  { scenarioId: 'B', factors: { cost: 120, quality: 0.85, latency: 140 } },
  { scenarioId: 'C', factors: { cost: 90, quality: 0.80, latency: 160 } },
  { scenarioId: 'D', factors: { cost: 200, quality: 0.95, latency: 130 } },
  { scenarioId: 'E', factors: { cost: 105, quality: 0.88, latency: 155 } }
];
// Constraints: empty list to treat all feasible
const samples = sampleFactors.map(s => ({ scenarioId: s.scenarioId, factors: s.factors, constraints: [] }));
const axes: AxisSpec[] = [
  { name: 'cost', direction: 'MIN', selector: f => f.cost },
  { name: 'quality', direction: 'MAX', selector: f => f.quality },
  { name: 'latency', direction: 'MIN', selector: f => f.latency }
];

const frontierResult = computeFrontier({ samples, axes });
const diversity = computeFrontierDiversity(frontierResult.frontier, axes);

function expect(cond: boolean, msg: string) { if (!cond) throw new Error(msg); }
expect(diversity.pointCount > 0, 'pointCount should be >0');
expect(!!diversity.axisSpreads && diversity.axisSpreads.length > 0, 'axisSpreads present');
expect(diversity.coverageScore !== undefined, 'coverageScore computed');

console.log(JSON.stringify({ status: 'FRONTIER_DIVERSITY_PASS', frontier: frontierResult.frontier.length, diversityPointCount: diversity.pointCount }));
