/** Phase 41 - Persistence Anti-Example Tests (Lightweight) */
import { PrescriptiveTraceRecorder } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';
import { persistExplainabilitySnapshot } from '../../server/services/explainability-persistence-service.ts';

process.env.PODSE_ROBUST_V1 = 'true';

(async function testNullSnapshot(){
  const res = await persistExplainabilitySnapshot(null as any);
  console.log('PERSIST_TEST_NULL', res);
})();

async function runDuplicatePolicy(){
  // fabricate snapshot minimal
  const session = PrescriptiveTraceRecorder.startSession();
  PrescriptiveTraceRecorder.recordAdjustment({
    constraintId:'c1', action:'TIGHTEN', originalExpression:'x <= 10', adjustedExpression:'x <= 9', segments:[{original:'x <= 10', adjusted:'x <= 9', deltaPct:-0.1}], violationDelta:-0.1, feasibilityDelta:0.05, estimationMode:false
  });
  PrescriptiveTraceRecorder.finalizePolicyVersion([{id:'c1', expression:'x <= 10'}], (PrescriptiveTraceRecorder.snapshot()?.adjustments||[]));
  const snap = PrescriptiveTraceRecorder.snapshot();
  const first = await persistExplainabilitySnapshot(snap as any);
  const second = await persistExplainabilitySnapshot(snap as any);
  console.log('PERSIST_TEST_DUP', { first, second });
}

async function runFeatureFlagDisabled(){
  process.env.PODSE_ROBUST_V1 = 'false';
  const res = await persistExplainabilitySnapshot(null as any);
  console.log('PERSIST_TEST_FLAG_DISABLED', res);
  process.env.PODSE_ROBUST_V1 = 'true';
}

async function runDbUnavailable(){
  const original = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const res = await persistExplainabilitySnapshot(null as any);
  console.log('PERSIST_TEST_DB_UNAVAILABLE', res);
  if (original) process.env.DATABASE_URL = original;
}

(async function sequence(){
  await runDbUnavailable();
  await runFeatureFlagDisabled();
  await runDuplicatePolicy();
})();
