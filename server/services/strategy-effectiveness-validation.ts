// Iteration 11 Validation Harness: Real Effectiveness Integration
import { strategyPerformanceService } from './strategy-performance-service.ts';

interface Scenario { name: string; apply: ()=>Promise<void>; assert: (weights: Record<string,number>)=>void; }
function assert(cond: any, msg: string){ if(!cond) throw new Error(msg); }

async function runScenario(s: Scenario){
  // isolate
  (strategyPerformanceService as any)._resetForValidation?.();
  console.log(`Scenario: ${s.name}`);
  await s.apply();
  const { weights } = await strategyPerformanceService.getWeights();
  console.log('Weights', weights);
  s.assert(weights);
  console.log('✅ Passed');
}

// Helper to push multiple effectiveness entries
async function push(strategy: string, effs: number[]){
  for (const e of effs) await strategyPerformanceService.updateOnDecision({ strategy, effectiveness: e });
}

const scenarios: Scenario[] = [
  { // A Sparse
    name: 'A Early Sparse (<5 samples gating)',
    apply: async () => { await push('STEADY',[7,8,7,8]); },
    assert: (w) => {
      const vals = Object.values(w);
      const max = Math.max(...vals); const min = Math.min(...vals);
      assert(max - min < 0.1, 'Sparse gating should keep weights near uniform');
    }
  },
  { // B Consistent High RE_ENGAGE
    name: 'B Consistent High RE_ENGAGE',
    apply: async () => { await push('RE_ENGAGE', Array.from({length:20}, ()=>9)); },
    assert: (w) => {
      assert(w['RE_ENGAGE'] > 0.35, 'RE_ENGAGE should dominate after consistent high effectiveness');
    }
  },
  { // C Volatile EXPEDITE
    name: 'C Volatile EXPEDITE alternating 9/1',
    apply: async () => { const pattern = Array.from({length:16}, (_,i)=> i%2===0?9:1); await push('EXPEDITE', pattern); },
    assert: (w) => {
      // Volatility penalty should prevent extremely high weight
      assert(w['EXPEDITE'] < 0.4, 'EXPEDITE volatile weight should be limited');
    }
  },
  { // D Stable STEADY
    name: 'D Stable STEADY narrow spread',
    apply: async () => { await push('STEADY', [7,7,8,8,7,8,7,8,7,8]); },
    assert: (w) => {
      assert(w['STEADY'] >= 0.20, 'STEADY should not be penalized and likely modestly boosted');
    }
  },
  { // E Recency Bias RISK_MITIGATION
    name: 'E Recency Bias RISK_MITIGATION late improvement',
    apply: async () => { await push('RISK_MITIGATION',[2,3,2,4,3,2,9,9,8]); },
    assert: (w) => {
      // Expect at least modest lift over uniform floor (0.15) after recent improvements
      assert(w['RISK_MITIGATION'] > 0.2, 'RISK_MITIGATION should get lift from recent improvements');
    }
  }
];

export async function runStrategyEffectivenessValidation(){
  for (const s of scenarios) { await runScenario(s); }
  console.log('All Iteration 11 scenarios passed');
}

if (process.env.RUN_STRATEGY_EFF_VALIDATION==='1') {
  runStrategyEffectivenessValidation().catch(e => { console.error('Validation failed', e); process.exit(1); });
}
