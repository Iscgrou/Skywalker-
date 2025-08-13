/**
 * Simulation Engine Unit Tests (Iteration 39c v0.1)
 * Run: npm run test:prescriptive:simulation
 */
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';
import { computeConstraintSensitivityMetrics } from '../../shared/prescriptive/prescriptive-sensitivity.ts';
import { computeAdaptiveConstraintActions } from '../../shared/prescriptive/prescriptive-adaptive-constraints.ts';
import { simulateAdaptiveAdjustments } from '../../shared/prescriptive/prescriptive-adaptive-simulation.ts';
import { PrescriptiveTelemetry } from '../../shared/prescriptive/prescriptive-telemetry.ts';

process.env.PODSE_ROBUST_V1 = 'true';

function log(obj: any){ console.log(JSON.stringify(obj,null,2)); }

// Sample constraints
const constraints: ConstraintDefinition[] = [
  { id:'c_cost', version:'v1', kind:'HARD', severity:'BLOCK', expression:'cost <= 100', description:'Max cost' },
  { id:'c_latency', version:'v1', kind:'SOFT', severity:'WARN', expression:'latency <= 500', description:'Latency budget' },
  { id:'c_revenue', version:'v1', kind:'HARD', severity:'BLOCK', expression:'revenue >= 1000', description:'Min revenue' }
];

// Build scenarios with metrics
const samplesRaw = [
  { scenarioId:'s1', metrics: { cost:90, latency:400, revenue:1200 } },
  { scenarioId:'s2', metrics: { cost:110, latency:450, revenue:1300 } },
  { scenarioId:'s3', metrics: { cost:80, latency:550, revenue:900 } },
  { scenarioId:'s4', metrics: { cost:105, latency:480, revenue:1500 } }
];

// Evaluate baseline constraints per scenario
const evaluatedSamples = samplesRaw.map(s => ({ scenarioId: s.scenarioId, metrics: s.metrics, constraints: constraints.map(c => evaluateConstraint(c, { metrics: s.metrics })) }));

// Sensitivity metrics
const sensitivity = computeConstraintSensitivityMetrics(evaluatedSamples.map(s => ({ scenarioId: s.scenarioId, constraints: s.constraints })));

// Adaptive actions
const adaptive = computeAdaptiveConstraintActions(constraints, sensitivity.list);

// Filter for log brevity
console.log('ADAPTIVE_ACTIONS', adaptive.actions.map(a => ({ id:a.id, action:a.action, delta:a.suggestedDelta, reason:a.reason })));

// Run simulation
const sim = simulateAdaptiveAdjustments({ constraints, adaptive: adaptive.actions, samples: samplesRaw });

log({ status:'SIMULATION_PASS', adjustments: sim.adjustments.map(a => ({ id:a.id, applied:a.applied, violationDelta:a.predictedViolationDelta })), aggregate: sim.aggregate, notes: sim.notes, telemetry: PrescriptiveTelemetry.snapshot().counters });
