// Iteration 19 Adaptive Threshold Calibration Validation Harness
// Scenarios:
//  A Stable Low Variance → slopeWarn نزدیک حداقل و slopeCritical > slopeWarn
//  B High Slope Burst → slopeWarn سناریو B > سناریو A
//  C Volatility Cluster → volMomentumThreshold سناریو C > سناریو A
//  D Sparse Anomalies → anomalyClusterK = 2 (حداقل)
//  E Insufficient Samples → fallback=true

import { strategyPerformanceService } from './strategy-performance-service.ts';
import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';
import { strategyThresholdCalibrationService } from './strategy-threshold-calibration-service.ts';

async function fabricate(mod: (step:number,strat:string,w:number)=>number, steps:number) {
  for (let i=0;i<steps;i++) {
    const artifact = await strategyPerformanceService.getWeightDetails();
    await strategyWeightSnapshotService.snapshotCurrent({ artifact });
    const mem = strategyWeightSnapshotService._memState().items; const last = mem.slice(-artifact.strategies.length);
    last.forEach(r => { r.weight = mod(i, r.strategy, r.weight) as any; });
  }
}

async function scenarioA() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + (s%2===0? 0.0004 : -0.0003), 40); // small oscillation
  const rep = await strategyThresholdCalibrationService.computeAdaptiveThresholds({ calibrationWindow: 120 });
  const pass = rep.thresholds.slopeCritical > rep.thresholds.slopeWarn && rep.thresholds.slopeWarn < 0.005;
  return { name:'A Stable', rep, pass };
}

async function scenarioB() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + 0.01, 35); // strong drift
  // enforce linear ramp for first strategy
  const mem = strategyWeightSnapshotService._memState().items; const stratName = mem[0].strategy; let idx=0; let base: number|undefined;
  for (const r of mem) { if (r.strategy===stratName) { if (base===undefined) base = r.weight; r.weight = base + idx*0.02; idx++; } }
  const rep = await strategyThresholdCalibrationService.computeAdaptiveThresholds({ calibrationWindow: 120 });
  return { name:'B Burst', rep, pass: rep.thresholds.slopeWarn > 0.005 };
}

async function scenarioC() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + (s<18? 0.0005 : (s%2===0? 0.02:-0.018)), 36);
  // inject spread (volatilityMomentum uses spread) second half
  strategyWeightSnapshotService._testInjectSpreadAdjust((r,i)=> { const total = strategyWeightSnapshotService._memState().items.length; if (i > total - 36*4) { const batchPos = Math.floor((i-(total-36*4))/4); (r as any).spread = batchPos>=18? 3 + Math.random(): 0.4 + Math.random()*0.2; } });
  const rep = await strategyThresholdCalibrationService.computeAdaptiveThresholds({ calibrationWindow: 160 });
  return { name:'C Vol Cluster', rep, pass: rep.thresholds.volMomentum > 0.8 };
}

async function scenarioD() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricate((s,_st,w)=> w + 0.001, 22);
  // no spikes -> anomaliesRecent mostly 0
  const rep = await strategyThresholdCalibrationService.computeAdaptiveThresholds({ calibrationWindow: 100 });
  return { name:'D Sparse Anoms', rep, pass: rep.thresholds.anomalyClusterK === 2 };
}

async function scenarioE() {
  strategyWeightSnapshotService._testClearMemory();
  // very few samples (< minSamples)
  await fabricate((s,_st,w)=> w + 0.002, 3);
  const rep = await strategyThresholdCalibrationService.computeAdaptiveThresholds({ calibrationWindow: 50, minSamples: 10 });
  return { name:'E Fallback', rep, pass: rep.thresholds.fallback === true };
}

async function run() {
  const A = await scenarioA();
  const B = await scenarioB();
  const C = await scenarioC();
  const D = await scenarioD();
  const E = await scenarioE();
  const results = [A,B,C,D,E];
  results.forEach(r=> console.log(`${r.pass?'PASS':'FAIL'} - ${r.name}`, r.rep.thresholds));
  // Cross-scenario assertion: B slopeWarn > A slopeWarn
  const cross = B.rep.thresholds.slopeWarn > A.rep.thresholds.slopeWarn;
  if (!cross) console.log('FAIL - Cross Scenario slopeWarn ordering'); else console.log('PASS - Cross Scenario slopeWarn ordering');
  const all = results.every(r=> r.pass) && cross;
  console.log(all? 'ALL: PASS' : 'SOME FAILED');
}

if (process.env.RUN_CALIBRATION_VALIDATION || true) { run(); }
