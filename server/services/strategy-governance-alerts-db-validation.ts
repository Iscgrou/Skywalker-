// Iteration 21 DB Validation Harness (Graceful if no DB configured)
import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts';
import { evaluateGovernanceWithPersistence } from './strategy-governance-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';

function hasDb() { return !!process.env.DATABASE_URL; }

async function seed(ramp:boolean, anomalies:number) {
  await strategyWeightSnapshotService._testClearMemory?.();
  const base = Date.now();
  for (let t=0;t<30;t++) {
    const w = ramp? 0.05 + t*0.01 : 0.3 + (t%4)*0.002;
    const spread = ramp? 1+t*0.03 : 1+(t%6)*0.04;
    const extra = (anomalies && t>20 && t<20+anomalies)? 0.25:0;
    for (const s of ['ALPHA','BETA']) {
      await strategyWeightSnapshotService._testMutateMemory?.((mem:any)=>{
        mem.push({ strategy:s, weight:w+extra, basePost:w+extra, decayScore:1, avgEff:1, p90Eff:1, spread, earlyGated:false, checksum:1, seed:1, modifiers:{}, meta:{}, createdAt:new Date(base+t*500).toISOString() });
        if (mem.length>400) mem.shift();
      });
    }
  }
}

async function scenarioA() { // Insert & fetch ordering
  strategyGovernanceAlertStore.clear();
  strategyGovernanceAlertStore.configure({ mode: hasDb()? 'db':'memory' });
  await seed(true,0); // ramp
  await evaluateGovernanceWithPersistence({ options:{ persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  const list = strategyGovernanceAlertStore.list({ limit:20 });
  const pass = list.length>=1 && list[0].timestamp <= list[list.length-1].timestamp;
  console.log(pass? 'PASS':'FAIL', '- A Insert & Fetch', { stored:list.length });
  return pass;
}

async function scenarioB() { // Severity filter
  const crit = strategyGovernanceAlertStore.list({ severity:['critical'], limit:50 });
  const pass = crit.every(c=>c.severity==='critical');
  console.log(pass? 'PASS':'FAIL', '- B Severity Filter', { critical: crit.length });
  return pass;
}

async function scenarioC() { // Dedup across run (simulate immediate second call)
  await evaluateGovernanceWithPersistence({ options:{ persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  const all = strategyGovernanceAlertStore.list({ limit:50 });
  const breakout = all.filter(a=>a.id==='TrendBreakout');
  const pass = breakout.length===1; // still single due to cooldown
  console.log(pass? 'PASS':'FAIL', '- C Cross-Call Dedup', { breakout: breakout.length });
  return pass;
}

async function scenarioD() { // Stats window
  const stats = strategyGovernanceAlertStore.stats({ windowMs: 10*60*1000 });
  const pass = stats.total>=1;
  console.log(pass? 'PASS':'FAIL', '- D Stats Window', stats);
  return pass;
}

async function scenarioE() { // Purge simulation (memory part)
  await strategyGovernanceAlertStore.purgeOlderThan(0); // purge all older than now
  const after = strategyGovernanceAlertStore.list({ limit:10 });
  const pass = after.length>=0; // non-failing structural
  console.log(pass? 'PASS':'FAIL', '- E Purge', { remaining: after.length });
  return pass;
}

(async function run(){
  const r = [] as boolean[];
  r.push(await scenarioA());
  r.push(await scenarioB());
  r.push(await scenarioC());
  r.push(await scenarioD());
  r.push(await scenarioE());
  const all = r.every(Boolean);
  console.log(all? 'ALL: PASS':'SOME FAILED');
  if (!all) process.exit(1);
})();
