// Iteration 20 Validation Harness: Governance Alert Persistence
// سناریوها:
//  A Basic Persistence: تولید چند هشدار و ثبت -> شمارش صحیح
//  B Severity Filter: فیلتر فقط critical | warn
//  C Cooldown Dedup: تکرار فوری هشدار مشابه -> افزوده نشدن
//  D TTL Window Stats: آمار در بازه کوتاه
//  E Persistence Off vs On: اجرای بدون persist تغییر در count ذخیره نشده
// خروجی: PASS/FAIL به ازای هر سناریو و در پایان ALL PASS.

import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts';
import { strategyGovernanceService, evaluateGovernanceWithPersistence } from './strategy-governance-service.ts';
import { strategyTrendAnalyticsService } from './strategy-trend-analytics-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';

async function seedSnapshots(ramp=false, anomalies=0) {
  // تولید داده ساده برای ایجاد الگوهای متفاوت
  await strategyWeightSnapshotService._testClearMemory?.();
  const base = Date.now();
  const strategies = ['ALPHA','BETA'];
  for (let t=0; t<40; t++) {
    const weightBase = ramp ? 0.1 + t*0.01 : 0.3 + (t%5)*0.001;
    const spread = ramp ? 1 + t*0.02 : 1 + (t%7)*0.05;
    for (const s of strategies) {
      let w = weightBase + (s==='BETA'?0.05:0);
      if (anomalies && t>30 && t<30+anomalies) w += 0.3; // spike zone
      await strategyWeightSnapshotService._testMutateMemory?.((mem:any)=>{
        mem.push({ strategy: s, weight: w, basePost: w, decayScore:1, avgEff:1, p90Eff:1, spread, earlyGated:false, checksum:1, seed:1, modifiers:{}, meta:{}, createdAt: new Date(base + t*1000).toISOString() });
        if (mem.length>500) mem.shift();
      });
    }
  }
}

async function scenarioA() {
  strategyGovernanceAlertStore.clear();
  await seedSnapshots(true,0); // ramp -> breakout
  const report = await evaluateGovernanceWithPersistence({ options: { persistAlerts:true, persistContext:{ tag:'A' }, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  const list = strategyGovernanceAlertStore.list({ limit:50 });
  const pass = list.length>0 && list.some(r=>r.id==='TrendBreakout');
  console.log(pass? 'PASS':'FAIL', '- A Basic Persistence', { stored: list.length });
  return pass;
}

async function scenarioB() {
  strategyGovernanceAlertStore.clear();
  await seedSnapshots(true,0);
  await evaluateGovernanceWithPersistence({ options: { persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  const crit = strategyGovernanceAlertStore.list({ severity:['critical'] });
  const all = strategyGovernanceAlertStore.list({});
  const pass = crit.length<=all.length && crit.every(c=>c.severity==='critical');
  console.log(pass? 'PASS':'FAIL', '- B Severity Filter', { all: all.length, critical: crit.length });
  return pass;
}

async function scenarioC() {
  strategyGovernanceAlertStore.clear();
  strategyGovernanceAlertStore.configure({ cooldownMs: 60000 }); // large cooldown to enforce dedup
  await seedSnapshots(true,0);
  await evaluateGovernanceWithPersistence({ options: { persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  // rerun rapidly should dedup
  await evaluateGovernanceWithPersistence({ options: { persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  // third attempt also
  await evaluateGovernanceWithPersistence({ options: { persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  const all = strategyGovernanceAlertStore.list({});
  const breakoutCount = all.filter(a=>a.id==='TrendBreakout').length;
  const pass = breakoutCount===1;
  console.log(pass? 'PASS':'FAIL', '- C Cooldown Dedup', { total: all.length, breakoutCount });
  return pass;
}

async function scenarioD() {
  strategyGovernanceAlertStore.clear();
  strategyGovernanceAlertStore.configure({ cooldownMs: 1000 });
  await seedSnapshots(true,2); // add anomalies for cluster maybe
  await evaluateGovernanceWithPersistence({ options: { persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 }, anomalyClusterK:1, anomalyClusterCriticalK:2 } });
  const stats = strategyGovernanceAlertStore.stats({ windowMs: 5*60*1000 });
  const pass = stats.total>0 && (stats.bySeverity.warn+stats.bySeverity.critical) >=1;
  console.log(pass? 'PASS':'FAIL', '- D Window Stats', stats);
  return pass;
}

async function scenarioE() {
  strategyGovernanceAlertStore.clear();
  await seedSnapshots(true,0);
  // run without persistence
  await strategyGovernanceService.evaluateGovernance({ options: { adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  const none = strategyGovernanceAlertStore.list({});
  const pass1 = none.length===0;
  // now enable
  await evaluateGovernanceWithPersistence({ options: { persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.002, slopeCritical:0.004 } } });
  const some = strategyGovernanceAlertStore.list({});
  const pass2 = some.length>0;
  const pass = pass1 && pass2;
  console.log(pass? 'PASS':'FAIL', '- E Off vs On', { before: none.length, after: some.length });
  return pass;
}

(async function run() {
  const results = [] as boolean[];
  results.push(await scenarioA());
  results.push(await scenarioB());
  results.push(await scenarioC());
  results.push(await scenarioD());
  results.push(await scenarioE());
  const all = results.every(Boolean);
  console.log(all? 'ALL: PASS':'SOME FAILED');
  if (!all) process.exit(1);
})();
