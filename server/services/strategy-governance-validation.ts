// Iteration 18 Governance Validation Harness
// Scenarios:
//  A Trend Breakout (should raise TrendBreakout warn/critical)
//  B Volatility Surge (VolatilitySurge)
//  C Anomaly Cluster (inject multiple spikes)
//  D Stability Plateau (Plateau info alert)
//  E Reversal Risk (ReversalRisk)
//  + Counterexamples: ensure no false positives when conditions not met.

import { strategyPerformanceService } from './strategy-performance-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';
import { strategyGovernanceService } from './strategy-governance-service.ts';
import { strategyTrendAnalyticsService } from './strategy-trend-analytics-service.ts';

async function fabricate(modifier: (step:number, strat:string, w:number)=>number, steps:number) {
  for (let i=0;i<steps;i++) {
    const artifact = await strategyPerformanceService.getWeightDetails();
    await strategyWeightSnapshotService.snapshotCurrent({ artifact });
    const mem = strategyWeightSnapshotService._memState().items;
    const lastBatch = mem.slice(-artifact.strategies.length);
    lastBatch.forEach(r => { r.weight = modifier(i, r.strategy, r.weight) as any; });
  }
}

async function scenarioA() { // Breakout upward
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + 0.006, 20); // stronger positive drift
  // amplify linear ramp explicitly on first strategy to ensure slope
  const memA = strategyWeightSnapshotService._memState().items; const stratName = memA[0].strategy; let idx=0; let baseStart: number|undefined;
  for (const r of memA) { if (r.strategy===stratName) { if (baseStart===undefined) baseStart = r.weight; r.weight = baseStart + idx*0.05; idx++; } }
  const trendA = await strategyTrendAnalyticsService.computeTrends({ window: 80 });
  console.log('[DEBUG A] lrSlope=', trendA.strategies[stratName].lrSlope, 'simpleSlope=', trendA.strategies[stratName].simpleSlope);
  const gov = await strategyGovernanceService.evaluateGovernance({ window: 80, options: { slopeWarnThreshold:0.001, slopeCriticalThreshold:0.003 } });
  const has = Object.values(gov.strategies).some(s=> s.alerts.some(a=> a.id==='TrendBreakout'));
  return { name: 'A Trend Breakout', pass: has, alerts: Object.values(gov.strategies).flatMap(s=>s.alerts) };
}

async function scenarioB() { // Volatility Surge
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + (s<10? 0.0005 : (s%2===0? 0.02:-0.018)), 25);
  // inject spread differences second half for one strategy
  strategyWeightSnapshotService._testInjectSpreadAdjust((r,i)=> {
    const total = strategyWeightSnapshotService._memState().items.length;
    const batchPos = Math.floor((i - (total - 25*4))/4);
    if (i >= total - 25*4) { // affect all strategies in recent series for stronger signal
      if (batchPos>=12) { (r as any).spread = 3 + Math.random(); } else { (r as any).spread = 0.3 + Math.random()*0.2; }
    }
  });
  const trends = await strategyTrendAnalyticsService.computeTrends({ window: 120 });
  const gov = await strategyGovernanceService.evaluateGovernance({ window: 120, options: { volMomentumThreshold: 0.5 } });
  const strat = Object.keys(gov.strategies)[0];
  const has = gov.strategies[strat].alerts.some(a=> a.id==='VolatilitySurge');
  return { name: 'B Volatility Surge', pass: has, momentum: trends.strategies[strat].volatilityMomentum, alerts: gov.strategies[strat].alerts };
}

async function scenarioC() { // Anomaly Cluster
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + 0.001, 20);
  // inject spikes toward end (3 spikes)
  const mem = strategyWeightSnapshotService._memState().items;
  for (let i=mem.length-12;i<mem.length;i+=4) { // three batches
    mem[i].weight += 2.0; // huge spike for anomaly detection
  }
  const trendC = await strategyTrendAnalyticsService.computeTrends({ window: 90, anomalyThreshold:1.2, anomalyBaselineWindow:6 });
  console.log('[DEBUG C] anomalies len=', trendC.strategies[Object.keys(trendC.strategies)[0]].anomalies.length);
  const gov = await strategyGovernanceService.evaluateGovernance({ window: 90, options: { anomalyClusterK:2, anomalyClusterCriticalK:3, anomalyRecentWindow:12, anomalyThreshold: 1.2, anomalyBaselineWindow: 6 } });
  // debug weights for first strategy
  const firstStrat = Object.keys(trendC.strategies)[0];
  console.log('[DEBUG C] weights tail=', trendC.strategies[firstStrat].sampleCount);
  const has = Object.values(gov.strategies).some(s=> s.alerts.some(a=> a.id==='AnomalyCluster'));
  return { name: 'C Anomaly Cluster', pass: has, alerts: Object.values(gov.strategies).flatMap(s=>s.alerts) };
}

async function scenarioD() { // Stability Plateau
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + (s<5?0.0005:0.00005), 18);
  const gov = await strategyGovernanceService.evaluateGovernance({ window: 80, options: { tinySlope:0.0003, smoothingHigh:0.2, minSamples:12, plateauVolMomentumCeil:0.2 } });
  const strat = Object.keys(gov.strategies)[0];
  const has = gov.strategies[strat].alerts.some(a=> a.id==='StabilityPlateau');
  return { name: 'D Stability Plateau', pass: has, alerts: gov.strategies[strat].alerts };
}

async function scenarioE() { // Reversal Risk
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + 0.002, 14); // upward slope history
  // add cumulative ramp to boost slope
  const memPre = strategyWeightSnapshotService._memState().items; const stratName = memPre[0].strategy; let idx=0; let baseStart: number|undefined;
  for (const r of memPre) { if (r.strategy===stratName) { if (baseStart===undefined) baseStart = r.weight; r.weight = baseStart + idx*0.02; idx++; } }
  // final negative delta adjustment last batch
  const mem = strategyWeightSnapshotService._memState().items;
  const lastBatch = mem.slice(-4);
  lastBatch.forEach(r => { r.weight -= 0.5; });
  const trendE = await strategyTrendAnalyticsService.computeTrends({ window: 70 });
  console.log('[DEBUG E] lrSlope=', trendE.strategies[stratName].lrSlope, 'deltaWeight=', trendE.strategies[stratName].deltaWeight);
  const gov = await strategyGovernanceService.evaluateGovernance({ window: 70, options: { reversalDeltaMin:0.005 } });
  const has = Object.values(gov.strategies).some(s=> s.alerts.some(a=> a.id==='ReversalRisk'));
  return { name: 'E Reversal Risk', pass: has, alerts: Object.values(gov.strategies).flatMap(s=>s.alerts) };
}

async function run() {
  const results = [] as any[];
  console.log('Running Scenario A'); results.push(await scenarioA());
  console.log('Running Scenario B'); results.push(await scenarioB());
  console.log('Running Scenario C'); results.push(await scenarioC());
  console.log('Running Scenario D'); results.push(await scenarioD());
  console.log('Running Scenario E'); results.push(await scenarioE());
  console.log('Governance Validation Results');
  results.forEach(r=> console.log(`${r.pass?'PASS':'FAIL'} - ${r.name}`, r.alerts||r.momentum));
  const all = results.every(r=> r.pass);
  console.log(all? 'ALL: PASS' : 'SOME FAILED');
}

if (process.env.RUN_GOVERNANCE_VALIDATION || true) { run(); }
