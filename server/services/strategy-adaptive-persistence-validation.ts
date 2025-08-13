// Iteration 29: Persistence Validation Harness (P1–P7)
// Usage: ts-node --loader ts-node/esm server/services/strategy-adaptive-persistence-validation.ts
// NOTE: Requires DATABASE_URL for full scenarios except P7 degrade.

import { adaptiveWeightsRunner } from './strategy-adaptive-runner.ts';
import { adaptivePersistenceService } from './strategy-adaptive-persistence-service.ts';
import { ensureDb, getPool } from '../db.ts';
import { adaptiveWeightsLatest, adaptiveWeightsHistory } from '../../shared/schema.ts';
import { adaptiveWeightTuningService } from './strategy-adaptive-weight-tuning-service.ts';
import { governanceAlertSuppressionService } from './strategy-governance-alert-suppression-service.ts';
import { eq, sql } from 'drizzle-orm';

interface ScenarioResult { id:string; pass:boolean; details:string; }

const results: ScenarioResult[] = [];

async function requireDb() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set for persistence validation');
  ensureDb();
}

async function resetTables() {
  const pool = getPool();
  if (!pool) return;
  const db = ensureDb();
  await db.delete(adaptiveWeightsLatest).where(eq(adaptiveWeightsLatest.version, 'v1'));
  // history truncate for version
  await db.execute(sql`DELETE FROM adaptive_weights_history WHERE version = 'v1'`);
}

function approxEqual(a:number,b:number,eps=1e-6){ return Math.abs(a-b)<=eps; }

async function P1_initialPersist(){
  try {
    await requireDb(); await resetTables();
    // Run a few cycles to reach applied state
    for (let i=0;i<4;i++) await adaptiveWeightsRunner.runOnce();
    // Wait a bit for async save
    await new Promise(r=>setTimeout(r,300));
    const db = ensureDb();
    const latest = await db.select().from(adaptiveWeightsLatest).where(eq(adaptiveWeightsLatest.version,'v1'));
    const historyCountRes = await db.execute(sql`SELECT COUNT(*)::int AS c FROM adaptive_weights_history WHERE version = 'v1'`);
    const historyCount = (historyCountRes as any).rows?.[0]?.c ?? 0;
    const pass = latest.length===1 && historyCount >=1;
    results.push({ id:'P1', pass, details: pass? 'latest row + history ok':`missing latest/history count=${historyCount}` });
  } catch (e:any){ results.push({ id:'P1', pass:false, details:e.message }); }
}

async function P2_debounceCooldown(){
  try {
    await requireDb();
    // Force cooldown cycles: simulate zero-error by calling computeAdjustment with metrics at targets
    const targetMetrics = { ackRate:0.85, escalationEffectiveness:0.7, falseSuppressionRate:0.10, suspectedFalseRate:0.15, reNoiseRate:0.20 };
    for (let i=0;i<15;i++) {
      adaptiveWeightTuningService.computeAdjustment(targetMetrics as any); // bypass runner for precision
      // manual persistence trigger mimic (only runner saves; here we just emulate cadence)
    }
    // Run runner a few cycles to let debounce condition evaluate
    for (let i=0;i<12;i++) await adaptiveWeightsRunner.runOnce();
    await new Promise(r=>setTimeout(r,400));
    const db = ensureDb();
    const historyCountRes = await db.execute(sql`SELECT COUNT(*)::int AS c FROM adaptive_weights_history WHERE version = 'v1'`);
    const count = (historyCountRes as any).rows?.[0]?.c ?? 0;
    // Heuristic: with debounce we expect < 12 (not saving every cooldown) but > 2
    const pass = count >2 && count < 12;
    results.push({ id:'P2', pass, details:`historyCount=${count}` });
  } catch (e:any){ results.push({ id:'P2', pass:false, details:e.message }); }
}

async function P3_crashRecovery(){
  try {
    await requireDb();
  const current = adaptiveWeightTuningService.getCurrentWeights();
    // Simulate crash: new service instance restore
    adaptiveWeightTuningService.restorePersistence({ ...current });
  const restored = adaptiveWeightTuningService.getCurrentWeights();
    const pass = Object.keys(current).every(k=> approxEqual((current as any)[k], (restored as any)[k], 1e-2));
    results.push({ id:'P3', pass, details: pass? 'weights stable after restore':'divergence post restore'});
  } catch(e:any){ results.push({ id:'P3', pass:false, details:e.message }); }
}

async function P4_freezePersistence(){
  try {
    await requireDb();
    // drive to freeze by feeding target metrics repeatedly through runner so consecutive zero error cycles
    const targetMetrics = { ackRate:0.85, escalationEffectiveness:0.7, falseSuppressionRate:0.10, suspectedFalseRate:0.15, reNoiseRate:0.20 };
    for (let i=0;i<30;i++) adaptiveWeightTuningService.computeAdjustment(targetMetrics as any);
    // Now force a runner cycle to persist freeze
    await adaptiveWeightsRunner.runOnce();
    await new Promise(r=>setTimeout(r,200));
    // Simulate restart restore
    const latest = await ensureDb().select().from(adaptiveWeightsLatest).where(eq(adaptiveWeightsLatest.version,'v1'));
    const row = latest[0];
    let freezeLoaded = false;
    if (row) {
      adaptiveWeightTuningService.restorePersistence({ ...row, w1:+row.w1, w2:+row.w2, w3:+row.w3, w4:+row.w4, w5:+row.w5 });
      if ((adaptiveWeightTuningService as any).st?.freezeActive) freezeLoaded = true; // internal peek
    }
    results.push({ id:'P4', pass: freezeLoaded, details: freezeLoaded? 'freeze restored':'freeze flag missing' });
  } catch(e:any){ results.push({ id:'P4', pass:false, details:e.message }); }
}

async function P5_suppressionRestore(){
  try {
    // create some suppression groups artificially
    governanceAlertSuppressionService.hydrateFromSnapshots([
      { dedupGroup:'G1', state:'SUPPRESSED', noiseScore:0.92, suppressedCount:3 },
      { dedupGroup:'G2', state:'ACTIVE', noiseScore:0.12, suppressedCount:0 }
    ]);
    // directly persist snapshots
    const snapshots = governanceAlertSuppressionService.getAllGroupSnapshots();
    await adaptivePersistenceService.saveSuppressionStates(snapshots);
    await new Promise(r=>setTimeout(r,150));
    // Clear and reload
    (governanceAlertSuppressionService as any).groups.clear();
    const load = await adaptivePersistenceService.loadSuppressionStates();
    if (load.ok && load.rows) governanceAlertSuppressionService.hydrateFromSnapshots(load.rows as any);
    const snapshot = governanceAlertSuppressionService.getAllGroupSnapshots();
    const g1 = snapshot.find(s=>s.dedupGroup==='G1');
    const pass = !!g1 && g1.state==='SUPPRESSED';
    results.push({ id:'P5', pass, details: pass? 'G1 restored suppressed':'G1 missing or wrong state' });
  } catch(e:any){ results.push({ id:'P5', pass:false, details:e.message }); }
}

async function P6_corruptionHandling(){
  try {
    await requireDb();
    const db = ensureDb();
    await db.execute(sql`DELETE FROM adaptive_weights_latest WHERE version='v1'`);
    // Insert corrupt (skewed) but non-null values; simulate missing by extreme value
    await db.execute(sql`INSERT INTO adaptive_weights_latest (version,w1,w2,w3,w4,w5,freeze_active) VALUES ('v1',0.9,0.3,0.0,0.1,0.05,false)`);
    const load = await adaptivePersistenceService.loadWeights();
    if (load.ok && load.row) adaptiveWeightTuningService.restorePersistence({ w1:+load.row.w1, w2:+load.row.w2, w3:+(load.row.w3||0), w4:+load.row.w4, w5:+load.row.w5 });
    const w = adaptiveWeightTuningService.getCurrentWeights();
    const sum = (Object.values(w) as number[]).reduce((s,v)=>s+v,0);
    const pass = Math.abs(sum-1) < 0.01;
    results.push({ id:'P6', pass, details:`sum=${sum.toFixed(4)}` });
  } catch(e:any){ results.push({ id:'P6', pass:false, details:e.message }); }
}

async function P7_dbUnavailable(){
  try {
    // Temporarily simulate no DB by clearing env
    const original = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    for (let i=0;i<5;i++) await adaptiveWeightsRunner.runOnce();
    const status = adaptiveWeightsRunner.getStatus();
    const pass = status.cycle >=5; // runner not crashed
    if (original) process.env.DATABASE_URL = original;
    results.push({ id:'P7', pass, details: pass? 'runner survived without DB':'runner halted' });
  } catch(e:any){ results.push({ id:'P7', pass:false, details:e.message }); }
}

async function runAll(){
  await P1_initialPersist();
  await P2_debounceCooldown();
  await P3_crashRecovery();
  await P4_freezePersistence();
  await P5_suppressionRestore();
  await P6_corruptionHandling();
  await P7_dbUnavailable();
  const summary = { allPass: results.every(r=>r.pass), results };
  console.log(JSON.stringify(summary, null, 2));
}

// ESM main detection poly
// @ts-ignore
const isMain = process.argv[1] && process.argv[1].endsWith('strategy-adaptive-persistence-validation.ts');
if (isMain) {
  runAll().catch(e=>{ console.error('Validation harness error', e); process.exit(1); });
}
