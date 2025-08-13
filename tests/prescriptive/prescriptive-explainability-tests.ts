/**
 * Phase 40 - Explainability & Lineage Anti-Example Tests (MVP)
 */
import { simulateAdaptiveAdjustments } from '../../shared/prescriptive/prescriptive-adaptive-simulation.ts';
import { computeAdaptiveConstraintActions } from '../../shared/prescriptive/prescriptive-adaptive-constraints.ts';
import { evaluateConstraint, ConstraintDefinition } from '../../shared/prescriptive/prescriptive-constraint-dsl.ts';
import { PrescriptiveTraceRecorder } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';

process.env.PODSE_ROBUST_V1 = 'true';

function log(label: string, obj: any){ console.log(label+':'+JSON.stringify(obj,null,2)); }

function manualAdaptive(id: string, action: 'TIGHTEN'|'RELAX', suggestedDelta: number){
  return { id, action, suggestedDelta, reason:'test_case' } as any;
}

// 1. No Adjustments (delta zero)
(function testNoAdjustments(){
  const constraints: ConstraintDefinition[] = [ { id:'c_cost', version:'v1', kind:'HARD', severity:'BLOCK', expression:'cost <= 100', description:'Max cost' } ];
  const adaptive = [ manualAdaptive('c_cost','TIGHTEN', 0) ];
  const samples = [ { scenarioId:'s1', metrics:{ cost:90 } } ];
  const sim = simulateAdaptiveAdjustments({ constraints, adaptive, samples });
  const snap = PrescriptiveTraceRecorder.snapshot();
  log('EXPLAIN_TEST_NO_ADJUST', { notes: sim.notes, adjustments: sim.adjustments, trace: { total: snap?.session.totalAdjustments } });
})();

// 2. Estimation Mode (one sample missing metrics)
(function testEstimationMode(){
  const constraints: ConstraintDefinition[] = [ { id:'c_cost', version:'v1', kind:'HARD', severity:'BLOCK', expression:'cost <= 100', description:'Max cost' } ];
  const adaptive = [ manualAdaptive('c_cost','TIGHTEN', 0.1) ];
  const samples = [ { scenarioId:'s1', metrics:{ cost:90 } }, { scenarioId:'s2', metrics: undefined as any } ];
  const sim = simulateAdaptiveAdjustments({ constraints, adaptive, samples });
  const snap = PrescriptiveTraceRecorder.snapshot();
  log('EXPLAIN_TEST_ESTIMATION', { estimationFlag: sim.notes.includes('estimation_mode'), predicted: sim.adjustments[0].predictedViolationDelta, traceEstimationUsed: snap?.session.estimationUsed });
})();

// 3. Multi-segment unsupported second segment
(function testMultiSegmentUnsupported(){
  const constraints: ConstraintDefinition[] = [ { id:'c_mix', version:'v1', kind:'HARD', severity:'BLOCK', expression:'cost <= 100 AND status == ACTIVE', description:'Mixed' } ];
  const adaptive = [ manualAdaptive('c_mix','RELAX', 0.2) ];
  const samples = [ { scenarioId:'s1', metrics:{ cost:90, status:'ACTIVE' } } ];
  const sim = simulateAdaptiveAdjustments({ constraints, adaptive, samples });
  log('EXPLAIN_TEST_MULTI_SEG', { segs: sim.adjustments[0].segments?.map(s=>({ original:s.original, skipped:s.reasonSkipped, adjusted:s.adjusted })) });
})();

// 4. Multiple adjustments realistic
(async function testMultipleAdjustments(){
  const constraints: ConstraintDefinition[] = [
    { id:'c_cost', version:'v1', kind:'HARD', severity:'BLOCK', expression:'cost <= 100', description:'Max cost' },
    { id:'c_latency', version:'v1', kind:'SOFT', severity:'WARN', expression:'latency <= 500', description:'Latency budget' }
  ];
  const samples = [ { scenarioId:'s1', metrics:{ cost:110, latency:450 } }, { scenarioId:'s2', metrics:{ cost:95, latency:520 } } ];
  const evaluated = samples.map(s => ({ scenarioId:s.scenarioId, metrics:s.metrics, constraints: constraints.map(c => evaluateConstraint(c, { metrics:s.metrics })) }));
  const { computeConstraintSensitivityMetrics } = await import('../../shared/prescriptive/prescriptive-sensitivity.ts');
  const sensitivity = computeConstraintSensitivityMetrics(evaluated.map(s=> ({ scenarioId:s.scenarioId, constraints:s.constraints })));
  const adaptiveFull = computeAdaptiveConstraintActions(constraints, sensitivity.list);
  const sim = simulateAdaptiveAdjustments({ constraints, adaptive: adaptiveFull.actions, samples });
  const snap = PrescriptiveTraceRecorder.snapshot();
  log('EXPLAIN_TEST_MULTI_ADJ', { applied: sim.adjustments.filter(a=>a.applied).length, traceRecords: snap?.adjustments.length });
})();
