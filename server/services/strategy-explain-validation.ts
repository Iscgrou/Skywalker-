// Validation harness for explainability (Iteration 12)
import { strategyPerformanceService } from './strategy-performance-service.ts';

async function scenarioSparse() {
  strategyPerformanceService._resetForValidation?.();
  // Only a few samples for two strategies; others untouched => all four should be early gated
  for (let i=0;i<3;i++) {
    await strategyPerformanceService.updateOnDecision({ strategy: 'STEADY', effectiveness: 5.0 });
    await strategyPerformanceService.updateOnDecision({ strategy: 'EXPEDITE', effectiveness: 4.0 });
  }
  const d = await strategyPerformanceService.getWeightDetails();
  return d.meta.gating.earlyGatedStrategies.length === 4 ? 'PASS' : 'FAIL';
}

async function scenarioStableVsVolatile() {
  strategyPerformanceService._resetForValidation?.();
  // Stable STEADY around 7; volatile EXPEDITE swings low/high creating spread >=4
  for (let i=0;i<30;i++) {
    await strategyPerformanceService.updateOnDecision({ strategy: 'STEADY', effectiveness: 7.2 });
    const eff = i % 2 ===0 ? 0.5 : 9.5; // large spread
    await strategyPerformanceService.updateOnDecision({ strategy: 'EXPEDITE', effectiveness: eff });
  }
  const d = await strategyPerformanceService.getWeightDetails();
  const exp = d.strategies.find((s:any)=>s.name==='EXPEDITE');
  const hasVolPenalty = exp.modifiers.volatilityPenaltyApplied || exp.modifiers.volatilityClampApplied || exp.modifiers.dominanceCapApplied;
  return hasVolPenalty ? 'PASS' : 'FAIL';
}

async function scenarioStabilityBoost() {
  strategyPerformanceService._resetForValidation?.();
  for (let i=0;i<20;i++) {
    await strategyPerformanceService.updateOnDecision({ strategy: 'STEADY', effectiveness: 6.8 });
  }
  const d = await strategyPerformanceService.getWeightDetails();
  const st = d.strategies.find((s:any)=>s.name==='STEADY');
  return st.modifiers.stabilityBoostApplied ? 'PASS' : 'FAIL';
}

async function run() {
  const results = [] as string[];
  results.push('Scenario A (Sparse): ' + await scenarioSparse());
  results.push('Scenario B (Stable vs Volatile penalties): ' + await scenarioStableVsVolatile());
  results.push('Scenario C (Stability Boost): ' + await scenarioStabilityBoost());
  console.log('\nExplainability Validation Results');
  console.log(results.join('\n'));
}

run();
