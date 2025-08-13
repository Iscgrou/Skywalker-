// Iteration 13 Unified Pipeline Validation Harness
import { strategyPerformanceService } from './strategy-performance-service.ts';

// Helpers
async function feed(pattern: Array<{strategy:string; eff:number}>) {
  for (const p of pattern) {
    await strategyPerformanceService.updateOnDecision({ strategy: p.strategy, effectiveness: p.eff });
  }
}
function roughlyEqual(a:number,b:number, eps=1e-6){ return Math.abs(a-b)<=eps; }

async function scenarioA_Drift() {
  strategyPerformanceService._resetForValidation();
  // provide enough mixed data
  for (let i=0;i<10;i++) {
    await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness:7 });
    await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: i%2===0?9:3 });
  }
  const w = await strategyPerformanceService.getWeights();
  const details = await strategyPerformanceService.getWeightDetails();
  const map1 = w.weights; const map2: Record<string,number> = {}; details.strategies.forEach((s:any)=>map2[s.name]=s.finalWeight);
  const pass = Object.keys(map1).every(k=>roughlyEqual(map1[k], map2[k]));
  return { name:'A Drift Consistency', pass };
}

async function scenarioB_Floor() {
  strategyPerformanceService._resetForValidation();
  // feed extremely low effectiveness to make raw base small
  for (let i=0;i<6;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness:0.1 }); }
  for (let i=0;i<6;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness:0.2 }); }
  const details = await strategyPerformanceService.getWeightDetails();
  const floorFlags = details.strategies.filter((s:any)=>s.floorApplied).length >=1;
  const minWeight = Math.min(...details.strategies.map((s:any)=>s.finalWeight));
  return { name:'B Floor Enforcement', pass: floorFlags && minWeight>0 };
}

async function scenarioC_VolatilityClamp() {
  strategyPerformanceService._resetForValidation();
  for (let i=0;i<30;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: i%2?9.5:0.5 }); }
  for (let i=0;i<30;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness: 7.2 }); }
  const details = await strategyPerformanceService.getWeightDetails();
  const exp = details.strategies.find((s:any)=>s.name==='EXPEDITE');
  const pass = !!(exp.clampApplied || exp.modifiers.volatilityPenaltyApplied);
  return { name:'C Volatility Clamp', pass };
}

async function scenarioD_DominanceCap() {
  strategyPerformanceService._resetForValidation();
  // only EXPEDITE has enough samples and is volatile
  for (let i=0;i<6;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: i%2?9.5:0.5 }); }
  const details = await strategyPerformanceService.getWeightDetails();
  const exp = details.strategies.find((s:any)=>s.name==='EXPEDITE');
  const pass = exp.dominanceCapApplied === 0.4 || exp.modifiers.dominanceCapApplied;
  return { name:'D Dominance Cap', pass };
}

async function scenarioE_EarlyGating() {
  strategyPerformanceService._resetForValidation();
  // Provide <5 samples for all
  for (let i=0;i<3;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness: 7 }); }
  const details = await strategyPerformanceService.getWeightDetails();
  const allEarly = details.meta.earlyGatedStrategies.length === 4;
  return { name:'E Early Gating', pass: allEarly };
}

async function scenarioF_DeterministicSeed() {
  strategyPerformanceService._resetForValidation();
  for (let i=0;i<12;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'STEADY', effectiveness: 7.5 }); }
  for (let i=0;i<12;i++) { await strategyPerformanceService.updateOnDecision({ strategy:'EXPEDITE', effectiveness: i%2?9:4 }); }
  const sel1 = await strategyPerformanceService.selectStrategy({ seed: 123 });
  const sel2 = await strategyPerformanceService.selectStrategy({ seed: 123 });
  return { name:'F Deterministic Seed', pass: sel1.strategy === sel2.strategy };
}

async function run() {
  const scenarios = [scenarioA_Drift, scenarioB_Floor, scenarioC_VolatilityClamp, scenarioD_DominanceCap, scenarioE_EarlyGating, scenarioF_DeterministicSeed];
  const results = [] as any[];
  for (const sc of scenarios) { results.push(await sc()); }
  const passAll = results.every(r=>r.pass);
  console.log('Unified Pipeline Validation Results');
  results.forEach(r=>console.log(`${r.name}: ${r.pass?'PASS':'FAIL'}`));
  console.log('ALL:', passAll?'PASS':'FAIL');
}
run();
