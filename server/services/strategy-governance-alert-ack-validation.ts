// Iteration 23 Validation Harness: Governance Alert Acknowledgements
// Scenarios: A ack flow, B idempotent double ack, C unack revert, D metrics, E edge cases & window clamp, F ack projection + severity breakdown

import { evaluateGovernanceWithPersistence } from './strategy-governance-service.ts';
import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts';
import { strategyGovernanceAlertAckService } from './strategy-governance-alert-ack-service.ts';
import { queryAlerts } from './strategy-governance-alert-query-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';

function hasDb(){ return !!process.env.DATABASE_URL; }

async function seedAlerts() {
  strategyGovernanceAlertStore.clear();
  strategyGovernanceAlertStore.configure({ mode: hasDb()? 'db':'memory' });
  await strategyWeightSnapshotService._testClearMemory?.();
  strategyGovernanceAlertStore.configure({ mode: hasDb()? 'db':'memory', cooldownMs: 0 });
  const base = Date.now() - 30*60*1000; // 30m ago
  for (let t=0;t<40;t++) {
    // Create stronger gradient so lrSlope & simpleSlope exceed thresholds easily
    const wAlpha = t * 0.002; // final ~0.078
    const wBeta  = t * 0.0025; // final ~0.0975 (higher slope)
    strategyWeightSnapshotService._testMutateMemory?.((mem:any)=>{
      mem.push({ strategy:'ALPHA', weight:wAlpha, basePost:wAlpha, decayScore:1, avgEff:1, p90Eff:1, spread:1+(t%7)*0.015, earlyGated:false, checksum:1, seed:1, modifiers:{}, meta:{}, createdAt:new Date(base + t*45000).toISOString() });
      mem.push({ strategy:'BETA',  weight:wBeta,  basePost:wBeta,  decayScore:1, avgEff:1, p90Eff:1, spread:1+(t%5)*0.02,  earlyGated:false, checksum:1, seed:1, modifiers:{}, meta:{}, createdAt:new Date(base + t*45000 + 500).toISOString() });
      while (mem.length>800) mem.shift();
    });
  }
  // Run governance several times to populate alerts variety
  for (let i=0;i<20;i++) {
    // tiny artificial delay to ensure unique timestamps ordering in memory
    await new Promise(r=> setTimeout(r, 5));
    await evaluateGovernanceWithPersistence({ options:{ persistAlerts:true, adaptiveThresholds:{ slopeWarn:0.0001, slopeCritical:0.0002 } } });
    // Inject synthetic multi-severity alerts to expand dataset for validation of pagination/ack variety
    const nowIso = new Date().toISOString();
    strategyGovernanceAlertStore.persist({ report: { generatedAt: nowIso, strategies: {
      SYNTH: { alerts: [
        { id: 'SyntheticInfo'+i, severity:'info', message: 'Synthetic info '+i, rationale:{ i }, timestamp: nowIso },
        { id: 'SyntheticWarn'+i, severity:'warn', message: 'Synthetic warn '+i, rationale:{ i }, timestamp: nowIso },
        { id: 'SyntheticCritical'+i, severity:'critical', message: 'Synthetic critical '+i, rationale:{ i }, timestamp: nowIso }
      ] }
    } } });
  }
  // Debug: log total alerts
  const totalMem = strategyGovernanceAlertStore.list({ limit: 2000 }).length;
  console.log('SEED_DEBUG totalAlerts=', totalMem);
}

async function scenarioA() {
  const list = await queryAlerts({ limit:20, order:'desc' });
  const first = list.items[0];
  if (!first) { console.log('FAIL - A Ack Flow (no alerts)'); return false; }
  const ack = await strategyGovernanceAlertAckService.ackAlert({ alertId: first.id, actor:'tester' });
  const ack2 = await strategyGovernanceAlertAckService.ackAlert({ alertId: first.id, actor:'tester' });
  const pass = !!ack.acknowledgedAt && ack2.alreadyAcked===true;
  console.log(pass? 'PASS':'FAIL', '- A Ack Flow', { ack, secondAck: ack2 });
  return pass;
}

async function scenarioB() {
  const list = await queryAlerts({ limit:50, order:'desc' });
  if (list.items.length < 2) { console.log('FAIL - B Double Ack (insufficient alerts)'); return false; }
  const target = list.items[1];
  await strategyGovernanceAlertAckService.ackAlert({ alertId: target.id, actor:'tester' });
  const again = await strategyGovernanceAlertAckService.ackAlert({ alertId: target.id, actor:'tester' });
  const pass = again.alreadyAcked === true;
  console.log(pass? 'PASS':'FAIL', '- B Double Ack', { alreadyAcked: again.alreadyAcked });
  return pass;
}

async function scenarioC() {
  const list = await queryAlerts({ limit:50, order:'desc' });
  const target = list.items.find(i=> i.severity==='warn' || i.severity==='info') || list.items[0];
  if (!target) { console.log('FAIL - C Unack (no target)'); return false; }
  await strategyGovernanceAlertAckService.ackAlert({ alertId: target.id, actor:'tester' });
  const un = await strategyGovernanceAlertAckService.unackAlert({ alertId: target.id });
  const re = await strategyGovernanceAlertAckService.unackAlert({ alertId: target.id });
  const pass = un.changed === true && re.changed === false;
  console.log(pass? 'PASS':'FAIL', '- C Unack Revert', { first: un, second: re });
  return pass;
}

async function scenarioD() {
  const metrics = await strategyGovernanceAlertAckService.getAckMetrics({ windowMs: 2*60*60*1000 });
  const structural = metrics.counts && metrics.window && typeof metrics.ackRate === 'number';
  const pOk = metrics.mtta && metrics.mtta.avgMs >=0 && metrics.mtta.p95Ms >=0;
  const pass = structural && pOk;
  console.log(pass? 'PASS':'FAIL', '- D Metrics', { total: metrics.counts.total, ackRate: metrics.ackRate, mttaAvg: metrics.mtta.avgMs });
  return pass;
}

async function scenarioE() {
  let edge1 = false; try { await strategyGovernanceAlertAckService.ackAlert({ alertId: -1 }); } catch { edge1 = true; }
  const metrics = await strategyGovernanceAlertAckService.getAckMetrics({ windowMs: 120*24*60*60*1000 }); // 120d -> clamp 30d
  const clamped = metrics.window.durationMs <= 30*24*60*60*1000 + 1000;
  const pass = edge1 && clamped;
  console.log(pass? 'PASS':'FAIL', '- E Edge & Clamp', { edge1, durationDays: metrics.window.durationMs/86400000 });
  return pass;
}

async function scenarioF() {
  // Query with ack projection
  const list = await queryAlerts({ limit:30, order:'desc', includeAckState:true });
  if (!list.items.length) { console.log('FAIL - F Ack Projection (no items)'); return false; }
  // Ack چند مورد میانی و دوباره Query
  const mid = list.items[Math.min(5, list.items.length-1)];
  if (mid) await strategyGovernanceAlertAckService.ackAlert({ alertId: mid.id, actor:'tester' });
  const list2 = await queryAlerts({ limit:30, order:'desc', includeAckState:true });
  const acknowledgedItems = list2.items.filter(i=> i.ack?.acknowledged);
  const hasAckFieldAll = list2.items.every(i=> !!i.ack && typeof i.ack.acknowledged==='boolean');
  // Metrics با breakdown
  const metrics = await strategyGovernanceAlertAckService.getAckMetrics({ windowMs: 2*60*60*1000, includeSeverityBreakdown:true });
  const sb = metrics.severityBreakdown || [];
  const structureOk = sb.every(r=> typeof r.severity==='string' && typeof r.total==='number' && typeof r.ackRate==='number');
  const pass = hasAckFieldAll && structureOk;
  console.log(pass? 'PASS':'FAIL', '- F Ack Projection & Breakdown', { ackedCount: acknowledgedItems.length, breakdown: sb });
  return pass;
}

(async function run(){
  await seedAlerts();
  const results = [] as boolean[];
  results.push(await scenarioA());
  results.push(await scenarioB());
  results.push(await scenarioC());
  results.push(await scenarioD());
  results.push(await scenarioE());
  results.push(await scenarioF());
  const all = results.every(Boolean);
  console.log(all? 'ALL: PASS':'SOME FAILED');
  if (!all) process.exit(1);
})();
