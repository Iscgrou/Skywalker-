/** Phase 41b - Explainability Retrieval Anti-Example Tests */
import { PrescriptiveTraceRecorder } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';
import { persistExplainabilitySnapshot } from '../../server/services/explainability-persistence-service.ts';
import { listExplainabilitySessions, getExplainabilitySessionMeta, getExplainabilitySessionFull } from '../../server/services/explainability-retrieval-service.ts';

process.env.PODSE_ROBUST_V1 = 'true';

async function seedSnapshot() {
  const session = PrescriptiveTraceRecorder.startSession();
  PrescriptiveTraceRecorder.recordAdjustment({
    constraintId:'cX', action:'RELAX', originalExpression:'y >= 5', adjustedExpression:'y >= 4', segments:[{original:'y >= 5', adjusted:'y >= 4', deltaPct:0.2}], violationDelta:0.2, feasibilityDelta:-0.05, estimationMode:false
  });
  PrescriptiveTraceRecorder.finalizePolicyVersion([{id:'cX', expression:'y >= 5'}], (PrescriptiveTraceRecorder.snapshot()?.adjustments||[]));
  const snap = PrescriptiveTraceRecorder.snapshot();
  await persistExplainabilitySnapshot(snap as any); // memory mode
  return snap?.session?.policyVersionId;
}

(async function runTests(){
  const pv = await seedSnapshot();
  const list1 = await listExplainabilitySessions({ limit: 5 });
  console.log('RETRIEVE_LIST_1', list1);
  const metaOk = await getExplainabilitySessionMeta(pv!);
  console.log('RETRIEVE_META_OK', metaOk);
  const fullOk = await getExplainabilitySessionFull(pv!);
  console.log('RETRIEVE_FULL_OK', { found: fullOk.found, adjustments: fullOk.snapshot?.adjustments?.length });
  const metaMissing = await getExplainabilitySessionMeta('nonexistent_pv');
  console.log('RETRIEVE_META_MISSING', metaMissing);
  process.env.PODSE_ROBUST_V1 = 'false';
  const listFlag = await listExplainabilitySessions({});
  console.log('RETRIEVE_LIST_FLAG_DISABLED', listFlag);
})();
