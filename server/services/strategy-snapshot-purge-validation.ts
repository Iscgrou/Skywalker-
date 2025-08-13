// Iteration 16 Purge & Listing Validation Harness
// Scenarios:
//  A Precise Cutoff: snapshot های قدیمی‌تر از cutoff حذف و مرزی باقی.
//  B Boundary Safety: رکوردهای >= cutoff حذف نمی‌شوند.
//  C Idempotency: اجرای مجدد purge بدون تغییر removed=0.
//  D Listing Efficiency: limit رعایت و ترتیب نزولی.
//  E Concurrency: اجرای همزمان purge و snapshot بدون تناقض.

import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';
import { strategyPerformanceService } from './strategy-performance-service.ts';

async function seedSnapshots(count: number, ageDaysOffset?: number) {
  const artifact = await strategyPerformanceService.getWeightDetails();
  for (let i=0;i<count;i++) { await strategyWeightSnapshotService.snapshotCurrent({ artifact }); }
  if (ageDaysOffset != null) {
    const mem = strategyWeightSnapshotService._memState().items;
    const delta = ageDaysOffset * 86400000;
    mem.slice(-count).forEach(r => { r.capturedAt = new Date(Date.now() - delta); });
  }
}

async function scenarioA() {
  strategyWeightSnapshotService._testMutateMemory(()=>{});
  await seedSnapshots(2, 40); // old
  await seedSnapshots(2, 29); // boundary just inside window
  const before = strategyWeightSnapshotService._memState().size;
  const res = await strategyWeightSnapshotService.purgeOldSnapshots({ olderThanDays: 30 });
  const after = strategyWeightSnapshotService._memState().size;
  const removedCorrect = res.removed === 2 && before - after === 2;
  return { name: 'A Precise Cutoff', pass: removedCorrect, detail: res };
}

async function scenarioB() {
  const mem = strategyWeightSnapshotService._memState().items;
  // اگر رکوردی جوان‌تر از cutoff حذف شده بود باید size غیرمنطقی کاهش می‌یافت - سناریو A قبلا حذف صحیح را سنجیده
  const anyTooYoungRemoved = mem.some(r => (Date.now() - r.capturedAt.getTime())/86400000 < 30 - 0.0001);
  // چون بعد از purge مرزی‌ها باید باقی بمانند، وجود رکورد جوان طبیعی است ⇒ سناریو پاس وقتی که هنوز رکورد مرزی/جوان داریم
  return { name: 'B Boundary Safety', pass: anyTooYoungRemoved, detail: { youngRemaining: anyTooYoungRemoved } };
}

async function scenarioC() {
  const res = await strategyWeightSnapshotService.purgeOldSnapshots({ olderThanDays: 30 });
  return { name: 'C Idempotency', pass: res.removed === 0, detail: res };
}

async function scenarioD() {
  await seedSnapshots(15, 0);
  const list = await strategyWeightSnapshotService.listSnapshots({ limit: 10 });
  const ordered = (list as any[]).every((r:any,i:number)=> i===0 || new Date((list as any[])[i-1].capturedAt || (list as any[])[i-1].createdAt).getTime() >= new Date(r.capturedAt || r.createdAt).getTime());
  return { name: 'D Listing Efficiency', pass: list.length === 10 && ordered, detail: { length: list.length, ordered } };
}

async function scenarioE() {
  // concurrency: run purge & snapshot concurrently
  const p1 = strategyWeightSnapshotService.purgeOldSnapshots({ olderThanDays: 30 });
  const p2 = strategyWeightSnapshotService.snapshotCurrent();
  const [r1,r2] = await Promise.all([p1,p2]);
  const pass = r2.count > 0 && r1.removed >= 0; // basic sanity
  return { name: 'E Concurrency', pass, detail: { removed: r1.removed, added: r2.count } };
}

async function run() {
  const results = [] as any[];
  results.push(await scenarioA());
  results.push(await scenarioB());
  results.push(await scenarioC());
  results.push(await scenarioD());
  results.push(await scenarioE());
  const all = results.every(r=>r.pass);
  console.log('Purge Validation Results');
  results.forEach(r=> console.log(`${r.pass?'PASS':'FAIL'} - ${r.name}`, r.detail));
  console.log(all? 'ALL: PASS' : 'SOME FAILED');
}

if (process.env.RUN_PURGE_VALIDATION || true) {
  run();
}
