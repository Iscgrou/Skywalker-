// Iteration 15 Auto Snapshot Validation Harness
// Scenarios:
//  A Interval Trigger
//  B Debounce Time Guard
//  C Disabled Mode
//  D Purge Effectiveness
//  E Concurrency Lock

import { strategyPerformanceService } from './strategy-performance-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';

interface Result { name: string; pass: boolean; detail?: any }

function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

async function feed(strategy:string, n:number, effPattern: (i:number)=>number){
  for (let i=0;i<n;i++){ await strategyPerformanceService.updateOnDecision({ strategy, effectiveness: effPattern(i) }); strategyWeightSnapshotService.noteDecision(); }
}

async function scenarioA_Interval(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  strategyWeightSnapshotService.configureAutoSnapshot({ enabled:true, decisionInterval:5, minSecondsBetween:1, purgeDays:7 });
  await feed('STEADY', 4, ()=>7); // below interval
  let r1 = await strategyWeightSnapshotService.maybeAutoSnapshot();
  await feed('STEADY', 1, ()=>7);
  const r2 = await strategyWeightSnapshotService.maybeAutoSnapshot();
  const pass = !r1.triggered && r2.triggered;
  return { name:'A Interval Trigger', pass, detail:{ r1, r2 } };
}

async function scenarioB_Debounce(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  // @ts-ignore
  strategyWeightSnapshotService._resetAutoForValidation();
  strategyWeightSnapshotService.configureAutoSnapshot({ enabled:true, decisionInterval:2, minSecondsBetween:0 });
  await feed('STEADY',2,()=>7); // meets interval
  const first = await strategyWeightSnapshotService.maybeAutoSnapshot();
  // Increase minSecondsBetween after first snapshot to test guard
  strategyWeightSnapshotService.configureAutoSnapshot({ minSecondsBetween:3 });
  await feed('STEADY',2,()=>7);
  const second = await strategyWeightSnapshotService.maybeAutoSnapshot();
  const pass = first.triggered && !second.triggered && second.reason==='time_guard';
  return { name:'B Debounce Time Guard', pass, detail:{ first, second } };
}

async function scenarioC_Disabled(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  strategyWeightSnapshotService.configureAutoSnapshot({ enabled:false, decisionInterval:1, minSecondsBetween:0 });
  await feed('STEADY',3,()=>7);
  const r = await strategyWeightSnapshotService.maybeAutoSnapshot();
  return { name:'C Disabled Mode', pass: !r.triggered && r.reason==='disabled', detail:r };
}

async function scenarioD_Purge(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  strategyWeightSnapshotService.configureAutoSnapshot({ enabled:true, decisionInterval:2, minSecondsBetween:0, purgeDays:1 });
  // create two snapshots separated by manual timestamp mutate
  await feed('STEADY',2,()=>7); await strategyWeightSnapshotService.maybeAutoSnapshot();
  await feed('EXPEDITE',2,i=> i%2?9:3); await strategyWeightSnapshotService.maybeAutoSnapshot();
  // mutate first batch to old
  strategyWeightSnapshotService._testMutateMemory(rows => { if (rows.length>=8){ for (let i=0;i<4;i++){ rows[rows.length-8+i].capturedAt = new Date(Date.now()- 3*86400000); } } });
  const before = strategyWeightSnapshotService._memState().size;
  const purge = await strategyWeightSnapshotService.purgeOldSnapshots({ olderThanDays: 2 });
  const after = strategyWeightSnapshotService._memState().size;
  const pass = purge.removed>=4 && before-after===purge.removed;
  return { name:'D Purge Effectiveness', pass, detail:{ before, after, purge } };
}

async function scenarioE_Lock(): Promise<Result> {
  strategyPerformanceService._resetForValidation();
  strategyWeightSnapshotService.configureAutoSnapshot({ enabled:true, decisionInterval:1, minSecondsBetween:0 });
  await feed('STEADY',1,()=>7);
  // Fire two maybeAutoSnapshot concurrently
  const [r1, r2] = await Promise.all([
    strategyWeightSnapshotService.maybeAutoSnapshot({ reason:'concurrent-test' }),
    strategyWeightSnapshotService.maybeAutoSnapshot({ reason:'concurrent-test' })
  ]);
  const triggeredCount = [r1,r2].filter(r=>r.triggered).length;
  return { name:'E Concurrency Lock', pass: triggeredCount===1, detail:{ r1, r2, triggeredCount } };
}

async function run(){
  const scenarios = [scenarioA_Interval, scenarioB_Debounce, scenarioC_Disabled, scenarioD_Purge, scenarioE_Lock];
  const results: Result[] = [];
  for (const s of scenarios) results.push(await s());
  const all = results.every(r=>r.pass);
  console.log('Auto Snapshot Validation Results');
  results.forEach(r=>console.log(`${r.name}: ${r.pass? 'PASS':'FAIL'}`));
  if (!all){ console.log('\nFailed Details:'); results.filter(r=>!r.pass).forEach(r=>console.log(r.name, r.detail)); }
  console.log('ALL:', all? 'PASS':'FAIL');
}
run();
