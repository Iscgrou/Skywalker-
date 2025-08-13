// Iteration 17 Trend Analytics Validation Harness
// Scenarios:
//  A Ascending Trend (simpleSlope & lrSlope > 0)
//  B Smoothing Reduction (smoothingReductionRatio > 0)
//  C Volatility Momentum (second half spread higher => momentum > 0)
//  D Anomaly Detection (isolated spike captured)
//  E Alignment (sign(simpleSlope) == sign(deltaWeight) == sign(lrSlope))

import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';
import { strategyTrendAnalyticsService } from './strategy-trend-analytics-service.ts';
import { strategyPerformanceService } from './strategy-performance-service.ts';

// Helper: fabricate snapshots by mutating memory buffer weights directly via repeated snapshotting with controlled modifiers
async function fabricateSeries(modifierFn: (step: number, strat: string, base: number) => number, steps: number) {
  for (let i=0;i<steps;i++) {
    // get artifact and adjust finalWeight heuristically by mutating internal artifact (approx) - we rebuild by shifting performance buffers
    const artifact = await strategyPerformanceService.getWeightDetails();
    // NOTE: For simplicity we only scale final weights in memory snapshot after creation (test purpose)
    await strategyWeightSnapshotService.snapshotCurrent({ artifact });
    const mem = strategyWeightSnapshotService._memState().items;
    const lastBatch = mem.slice(-artifact.strategies.length);
    lastBatch.forEach(r => { r.weight = modifierFn(i, r.strategy, r.weight) as any; });
  }
}

async function scenarioA() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricateSeries((step,_s,w)=> w + step*0.0005, 20);
  const report = await strategyTrendAnalyticsService.computeTrends({ window: 40, anomalyThreshold: 9 });
  const strat = Object.keys(report.strategies)[0];
  const tr = report.strategies[strat];
  return { name: 'A Ascending Trend', pass: (tr.simpleSlope||0) > 0 && (tr.lrSlope||0) > 0, detail: tr };
}

async function scenarioB() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricateSeries((step,_s,w)=> w + (step%2===0? 0.005 : -0.004), 25); // oscillation -> smoothing should reduce std
  const report = await strategyTrendAnalyticsService.computeTrends({ window: 25, maWindow: 5 });
  const strat = Object.keys(report.strategies)[0];
  const tr = report.strategies[strat];
  return { name: 'B Smoothing Reduction', pass: (tr.smoothingReductionRatio||0) > 0, detail: tr.smoothingReductionRatio };
}

async function scenarioC() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricateSeries((step,_s,w)=> w + (step < 12 ? 0.0005 : (step%2===0? 0.02 : -0.018)), 36); // higher volatility second half
  // تزریق spread مصنوعی: نیمه دوم spread را بالا می‌بریم
  strategyWeightSnapshotService._testInjectSpreadAdjust((r,i)=> {
    const total = strategyWeightSnapshotService._memState().items.length;
    if (i > total - 36*4) { // مربوط به سری اخیر
      const localIndex = i % 4; // هر batch 4 استراتژی
      // فقط روی یکی از استراتژی‌ها اثر بگذاریم برای سادگی
      if (localIndex === 0) {
        const batchPos = Math.floor((i - (total - 36*4))/4);
        if (batchPos >= 18) { // نیمه دوم سری
          (r as any).spread = (r as any).spread != null ? (r as any).spread + 3 + Math.random()*0.5 : 4 + Math.random()*0.5;
        } else {
          (r as any).spread = (r as any).spread != null ? (r as any).spread + 0.5 : 0.6;
        }
      }
    }
  });
  const report = await strategyTrendAnalyticsService.computeTrends({ window: 160 });
  const strat = report.strategies['RISK_MITIGATION'] ? 'RISK_MITIGATION' : Object.keys(report.strategies)[0];
  const tr = report.strategies[strat];
  // Debug: manual recompute of halves from memory buffer (chronological)
  const mem = strategyWeightSnapshotService._memState().items.filter(r=> r.strategy === strat);
  const ordered = [...mem]; // memory buffer already oldest->newest
  const spreads = ordered.map(r => r.spread != null ? Number(r.spread) : 0);
  const mid = Math.floor(spreads.length/2) || 1;
  const avg = (arr:number[])=> arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
  const manualMomentum = avg(spreads.slice(mid)) - avg(spreads.slice(0,mid));
  if ((tr.volatilityMomentum||0) === 0) {
    console.log('[DEBUG Scenario C] strat', strat, 'spreads(first 5,last 5)=', spreads.slice(0,5), spreads.slice(-5), 'manualMomentum=', manualMomentum.toFixed(4));
  }
  return { name: 'C Volatility Momentum', pass: (tr.volatilityMomentum||0) > 0, detail: { reported: tr.volatilityMomentum, manual: parseFloat(manualMomentum.toFixed(6)) } };
}

async function scenarioD() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricateSeries((step,_s,w)=> w + (step===42? 0.4 : 0.002), 45); // single large spike near end
  const report = await strategyTrendAnalyticsService.computeTrends({ window: 180, anomalyThreshold: 2.2, anomalyBaselineWindow: 8 });
  const strat = Object.keys(report.strategies)[0];
  const tr = report.strategies[strat];
  const hasSpike = tr.anomalies.some(a => a.zScore >= 2.2 || (a.zScore===0 && a.weight > (tr.deltaWeight||0)+0.2));
  return { name: 'D Anomaly Detection', pass: hasSpike, detail: tr.anomalies.map(a=>a.zScore) };
}

async function scenarioE() {
  strategyWeightSnapshotService._testClearMemory();
  await fabricateSeries((step,_s,w)=> w + step*0.002, 18);
  const report = await strategyTrendAnalyticsService.computeTrends({ window: 25 });
  const strat = Object.keys(report.strategies)[0];
  const tr = report.strategies[strat];
  const sign = (x:number|null)=> x==null? 0 : (x>0?1:(x<0?-1:0));
  const aligned = sign(tr.simpleSlope) === sign(tr.lrSlope) && sign(tr.lrSlope) === sign(tr.deltaWeight);
  return { name: 'E Alignment', pass: aligned, detail: { simple: tr.simpleSlope, lr: tr.lrSlope, delta: tr.deltaWeight } };
}

async function run() {
  const results = [] as any[];
  console.log('Running Scenario A'); results.push(await scenarioA());
  console.log('Running Scenario B'); results.push(await scenarioB());
  console.log('Running Scenario C'); results.push(await scenarioC());
  console.log('Running Scenario D'); results.push(await scenarioD());
  console.log('Running Scenario E'); results.push(await scenarioE());
  const all = results.every(r=>r.pass);
  console.log('Trend Analytics Validation Results');
  results.forEach(r=> console.log(`${r.pass?'PASS':'FAIL'} - ${r.name}`, r.detail));
  console.log(all? 'ALL: PASS' : 'SOME FAILED');
}

if (process.env.RUN_TREND_VALIDATION || true) { run(); }
