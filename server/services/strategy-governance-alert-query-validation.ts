// Iteration 22 Validation Harness: Governance Alert Query & Analytics
// Scenarios: A ordering, B pagination consistency, C filters, D analytics sanity, E invalid cursor & window clamp

import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts';
import { evaluateGovernanceWithPersistence } from './strategy-governance-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';
import { queryAlerts, computeAlertAnalytics } from './strategy-governance-alert-query-service.ts';

function hasDb() { return !!process.env.DATABASE_URL; }

async function seedSamples() {
  strategyGovernanceAlertStore.clear();
  strategyGovernanceAlertStore.configure({ mode: hasDb()? 'db':'memory' });
  await strategyWeightSnapshotService._testClearMemory?.();
  const base = Date.now() - 3600_000; // 1h ago base
  for (let t=0;t<60;t++) { // 60 intervals
    const slope = 0.02 + (t/2000);
    for (const strat of ['ALPHA','BETA','GAMMA']) {
      await strategyWeightSnapshotService._testMutateMemory?.((mem:any)=>{
        mem.push({ strategy:strat, weight:slope, basePost:slope, decayScore:1, avgEff:1, p90Eff:1, spread:1+(t%5)*0.02, earlyGated:false, checksum:1, seed:1, modifiers:{}, meta:{}, createdAt:new Date(base + t*60000 + (strat==='GAMMA'?500:0)).toISOString() });
        if (mem.length>800) mem.shift();
      });
    }
  }
  // Run governance twice to create duplicates for dedupEffectiveness
  await evaluateGovernanceWithPersistence({ options:{ persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.01, slopeCritical:0.015 } } });
  await evaluateGovernanceWithPersistence({ options:{ persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.01, slopeCritical:0.015 } } });
}

async function scenarioA() {
  const aDesc = await queryAlerts({ limit:10, order:'desc' });
  const aAsc = await queryAlerts({ limit:10, order:'asc' });
  const orderedDesc = aDesc.items.every((v,i,arr)=> i===0 || arr[i-1].alertTimestamp >= v.alertTimestamp);
  const orderedAsc = aAsc.items.every((v,i,arr)=> i===0 || arr[i-1].alertTimestamp <= v.alertTimestamp);
  const pass = orderedDesc && orderedAsc;
  console.log(pass? 'PASS':'FAIL', '- A Ordering', { descCount:aDesc.items.length, ascCount:aAsc.items.length });
  return pass;
}

async function scenarioB() {
  const page1 = await queryAlerts({ limit:5, order:'desc' });
  const page2 = page1.pageInfo.nextCursor? await queryAlerts({ limit:5, order:'desc', cursor: page1.pageInfo.nextCursor }): { items:[] };
  const ids1 = page1.items.map(i=>i.id);
  const ids2 = page2.items.map(i=>i.id);
  const overlap = ids1.filter(x=>ids2.includes(x));
  const pass = overlap.length===0; // no duplication
  console.log(pass? 'PASS':'FAIL', '- B Pagination', { ids1, ids2, overlap });
  return pass;
}

async function scenarioC() {
  const filtered = await queryAlerts({ severities:['critical'], strategies:['ALPHA'], limit:50 });
  const pass = filtered.items.every(i=> i.severity==='critical' && i.strategy==='ALPHA');
  console.log(pass? 'PASS':'FAIL', '- C Filter', { count: filtered.items.length });
  return pass;
}

async function scenarioD() {
  const analytics = await computeAlertAnalytics({ windowMs: 2*60*60*1000 });
  const totalCheck = analytics.counts.total === (analytics.counts.bySeverity.info + analytics.counts.bySeverity.warn + analytics.counts.bySeverity.critical);
  const ratioCheck = analytics.dedupEffectiveness.ratio <= 1 && analytics.dedupEffectiveness.ratio > 0;
  const pass = totalCheck && ratioCheck;
  console.log(pass? 'PASS':'FAIL', '- D Analytics', { total: analytics.counts.total, ratio: analytics.dedupEffectiveness.ratio });
  return pass;
}

async function scenarioE() {
  const invalidCursor = '___not_base64__';
  let ok = true;
  try { await queryAlerts({ cursor: invalidCursor, limit:5 }); } catch { ok=false; }
  const oversize = await queryAlerts({ from: new Date(Date.now()-40*24*60*60*1000).toISOString(), limit:1 }); // request > 14d clamp
  const spanMs = new Date(oversize.meta.windowTo).getTime() - new Date(oversize.meta.windowFrom).getTime();
  const clamped = spanMs <= 14*24*60*60*1000 + 1000; // tolerance
  const pass = ok && clamped;
  console.log(pass? 'PASS':'FAIL', '- E Cursor+Clamp', { ok, clamped, spanDays: spanMs/86400000 });
  return pass;
}

(async function run(){
  await seedSamples();
  const results: boolean[] = [];
  results.push(await scenarioA());
  results.push(await scenarioB());
  results.push(await scenarioC());
  results.push(await scenarioD());
  results.push(await scenarioE());
  const all = results.every(Boolean);
  console.log(all? 'ALL: PASS':'SOME FAILED');
  if (!all) process.exit(1);
})();
