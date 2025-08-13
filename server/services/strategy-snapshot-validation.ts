// Iteration 14 Snapshot Persistence Validation Harness
// Validates historical strategy weight snapshot service behaviors in memory mode.
// Scenarios:
//  A Atomic Batch & Consistency
//  B Early Gating Persistence
//  C Volatility Clamp / Penalty & Stability Boost Persistence
//  D Dominance Cap Persistence
//  E Retention Purge (memory)

import { strategyPerformanceService } from './strategy-performance-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';

type Result = { name: string; pass: boolean; detail?: any };

function approx(a:number,b:number,eps=1e-6){ return Math.abs(a-b)<=eps; }

async function scenarioA_AtomicBatch(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  // Feed enough data for two strategies only
  for (let i=0;i<8;i++){ await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness:7.2 }); }
  for (let i=0;i<8;i++){ await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: i%2?9:4 }); }
  const artifact = await strategyPerformanceService.getWeightDetails();
  const snap = await strategyWeightSnapshotService.snapshotCurrent({ artifact });
  const rows = strategyWeightSnapshotService._memState().items.slice(-4); // last batch (4 strategies)
  const countOk = snap.count === 4 && rows.length === 4;
  const weightsSum = parseFloat(rows.reduce((a,r)=>a+r.weight,0).toFixed(6));
  const checksumOk = approx(weightsSum, 1); // normalized
  const mapping: Record<string,number> = {}; artifact.strategies.forEach((s:any)=>mapping[s.name]=s.finalWeight);
  const weightMatch = rows.every(r=>approx(r.weight, mapping[r.strategy] ?? -1));
  return { name:'A Atomic Batch & Consistency', pass: countOk && checksumOk && weightMatch, detail: { countOk, checksumOk, weightMatch, weightsSum } };
}

async function scenarioB_EarlyGating(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  // <5 samples overall
  for (let i=0;i<3;i++){ await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness:7 }); }
  const artifact = await strategyPerformanceService.getWeightDetails();
  await strategyWeightSnapshotService.snapshotCurrent({ artifact });
  const rows = strategyWeightSnapshotService._memState().items.slice(-4);
  const allEarly = rows.every(r=>r.earlyGated === true);
  const earlyCountMeta = rows.every(r=> (r.meta?.earlyCount ?? 0) === 4);
  return { name:'B Early Gating Persistence', pass: allEarly && earlyCountMeta, detail: { allEarly, earlyCountMeta } };
}

async function scenarioC_VolatilityClampPenalty(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  // Create volatile EXPEDITE and stable STEADY
  for (let i=0;i<26;i++){ await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: i%2?9.5:0.5 }); }
  for (let i=0;i<26;i++){ await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness: 7.3 }); }
  const artifact = await strategyPerformanceService.getWeightDetails();
  await strategyWeightSnapshotService.snapshotCurrent({ artifact });
  const rows = strategyWeightSnapshotService._memState().items.slice(-4);
  const exp = rows.find(r=>r.strategy==='EXPEDITE');
  const std = rows.find(r=>r.strategy==='STEADY');
  const volatileFlag = !!(exp && (exp.modifiers?.volatilityPenaltyApplied || exp.modifiers?.volatilityClampApplied));
  const stabilityBoost = !!(std && std.modifiers?.stabilityBoostApplied);
  return { name:'C Volatility / Stability Persistence', pass: volatileFlag && stabilityBoost, detail: { volatileFlag, stabilityBoost } };
}

async function scenarioD_DominanceCap(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  // Only EXPEDITE crosses 5 samples (others remain early) AND is highly volatile (spread>=4) to trigger dominance cap
  const pattern = [0,10,0,10,0,10];
  for (const eff of pattern){ await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: eff }); }
  const artifact = await strategyPerformanceService.getWeightDetails();
  const expArt = artifact.strategies.find((s:any)=>s.name==='EXPEDITE');
  await strategyWeightSnapshotService.snapshotCurrent({ artifact });
  const rows = strategyWeightSnapshotService._memState().items.slice(-4);
  const expSnap = rows.find(r=>r.strategy==='EXPEDITE');
  const capInArtifact = !!(expArt && expArt.dominanceCapApplied === 0.4);
  const capInSnapshot = !!(expSnap && (expSnap.modifiers?.dominanceCapApplied === 0.4));
  return { name:'D Dominance Cap Persistence', pass: capInArtifact && capInSnapshot, detail: { capInArtifact, capInSnapshot, art: expArt, snap: expSnap?.modifiers } };
}

async function scenarioE_RetentionPurge(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  // Produce two snapshot batches
  for (let i=0;i<6;i++){ await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness:7 }); }
  let artifact = await strategyPerformanceService.getWeightDetails();
  await strategyWeightSnapshotService.snapshotCurrent({ artifact });
  for (let i=0;i<6;i++){ await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: i%2?9:3 }); }
  artifact = await strategyPerformanceService.getWeightDetails();
  await strategyWeightSnapshotService.snapshotCurrent({ artifact });
  // Mutate first batch capturedAt to old date
  strategyWeightSnapshotService._testMutateMemory(rows => {
    if (rows.length >=8) {
      const cutoff = new Date(Date.now() - 40*86400000);
      for (let i=0;i<4;i++){ rows[rows.length-8 + i].capturedAt = cutoff; }
    }
  });
  const before = strategyWeightSnapshotService._memState().size;
  const purge = await strategyWeightSnapshotService.purgeOldSnapshots({ olderThanDays: 30 });
  const after = strategyWeightSnapshotService._memState().size;
  const removedOk = purge.mode==='memory' && purge.removed >=4 && before - after === purge.removed;
  return { name:'E Retention Purge', pass: removedOk, detail: { before, after, removed: purge.removed } };
}

async function run() {
  const scenarios = [scenarioA_AtomicBatch, scenarioB_EarlyGating, scenarioC_VolatilityClampPenalty, scenarioD_DominanceCap, scenarioE_RetentionPurge];
  const results: Result[] = [];
  for (const s of scenarios) { results.push(await s()); }
  const all = results.every(r=>r.pass);
  console.log('Strategy Weight Snapshot Validation Results');
  results.forEach(r=> console.log(`${r.name}: ${r.pass ? 'PASS':'FAIL'}`));
  if (!all) {
    console.log('\nDetails of failed:');
    results.filter(r=>!r.pass).forEach(r=> console.log(r.name, r.detail));
  }
  console.log('ALL:', all? 'PASS':'FAIL');
}

run();
