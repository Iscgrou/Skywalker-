/** Phase 41c - Explainability Diff Anti-Example Tests */
import { PrescriptiveTraceRecorder } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';
import { persistExplainabilitySnapshot } from '../../server/services/explainability-persistence-service.ts';
import { diffExplainability } from '../../server/services/explainability-diff-service.ts';

process.env.PODSE_ROBUST_V1 = 'true';

async function seedSnapshots() {
  // First snapshot
  PrescriptiveTraceRecorder.startSession();
  PrescriptiveTraceRecorder.recordAdjustment({ constraintId:'c1', action:'TIGHTEN', originalExpression:'x <= 10', adjustedExpression:'x <= 9', segments:[{original:'x <= 10', adjusted:'x <= 9', deltaPct:-0.1}], violationDelta:-0.1, feasibilityDelta:0.05, estimationMode:false });
  PrescriptiveTraceRecorder.finalizePolicyVersion([{id:'c1', expression:'x <= 10'}], (PrescriptiveTraceRecorder.snapshot()?.adjustments||[]));
  const snap1 = PrescriptiveTraceRecorder.snapshot();
  await persistExplainabilitySnapshot(snap1 as any);
  const pv1 = snap1?.session?.policyVersionId!;

  // Second snapshot with modification
  PrescriptiveTraceRecorder.startSession();
  PrescriptiveTraceRecorder.recordAdjustment({ constraintId:'c1', action:'RELAX', originalExpression:'x <= 10', adjustedExpression:'x <= 9.5', segments:[{original:'x <= 10', adjusted:'x <= 9.5', deltaPct:-0.05}], violationDelta:-0.05, feasibilityDelta:0.03, estimationMode:false });
  PrescriptiveTraceRecorder.recordAdjustment({ constraintId:'c2', action:'TIGHTEN', originalExpression:'y >= 5', adjustedExpression:'y >= 6', segments:[{original:'y >= 5', adjusted:'y >= 6', deltaPct:0.2}], violationDelta:0.2, feasibilityDelta:-0.02, estimationMode:false });
  PrescriptiveTraceRecorder.finalizePolicyVersion([{id:'c1', expression:'x <= 10'},{id:'c2', expression:'y >= 5'}], (PrescriptiveTraceRecorder.snapshot()?.adjustments||[]));
  const snap2 = PrescriptiveTraceRecorder.snapshot();
  await persistExplainabilitySnapshot(snap2 as any);
  const pv2 = snap2?.session?.policyVersionId!;
  return { pv1, pv2 };
}

(async function run(){
  const { pv1, pv2 } = await seedSnapshots();
  const same = await diffExplainability(pv1, pv1);
  console.log('DIFF_SAME', same.reason);
  const normal = await diffExplainability(pv1, pv2, { includeLineage: true });
  console.log('DIFF_NORMAL_SUMMARY', normal.meta?.summary);
  console.log('DIFF_ADDED', normal.adjustments?.added.map(a=>a.constraintId));
  console.log('DIFF_MODIFIED', normal.adjustments?.modified.map(m=>m.constraintId));
  process.env.PODSE_ROBUST_V1 = 'false';
  const flagOff = await diffExplainability(pv1, pv2);
  console.log('DIFF_FLAG_OFF', flagOff.reason);
})();
