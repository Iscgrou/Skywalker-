// Iteration 10 Validation Harness for Adaptive Strategy Weighting
import { strategyPerformanceService } from './strategy-performance-service.ts';

interface Scenario { name: string; apply: ()=>Promise<void>; expectation: (weights: Record<string,number>)=>void; }

function assert(cond: any, msg: string) { if (!cond) throw new Error(msg); }

async function runScenario(s: Scenario) {
  // reset (not exposed; recreate module state via no-op) -> we rely on internal memory; skipping deep reset for brevity
  console.log(`Scenario: ${s.name}`);
  await s.apply();
  const { weights } = await strategyPerformanceService.getWeights();
  console.log('Weights', weights);
  s.expectation(weights);
  console.log('✅ Passed');
}

const scenarios: Scenario[] = [
  {
    name: 'A Sparse Data (few decisions)',
    apply: async () => {
      await strategyPerformanceService.updateOnDecision({ strategy: 'STEADY', effectiveness: 0.6 });
    },
    expectation: (w) => {
      const sum = Object.values(w).reduce((a,b)=>a+b,0);
      assert(Math.abs(sum-1) < 0.001, 'weights must sum 1');
    }
  },
  {
    name: 'B Volatile One Strategy Spike',
    apply: async () => {
      for (let i=0;i<10;i++) await strategyPerformanceService.updateOnDecision({ strategy: 'EXPEDITE', effectiveness: 0.9 });
    },
    expectation: (w) => {
      assert(w['EXPEDITE'] > w['STEADY'], 'EXPEDITE should outrank STEADY');
    }
  },
  {
    name: 'C Uniform Strong Performance',
    apply: async () => {
      for (const s of ['RISK_MITIGATION','RE_ENGAGE']) {
        for (let i=0;i<5;i++) await strategyPerformanceService.updateOnDecision({ strategy: s, effectiveness: 0.85 });
      }
    },
    expectation: (w) => {
      // All should be reasonably close; floor ensures min
      const max = Math.max(...Object.values(w));
      const min = Math.min(...Object.values(w));
      assert(max - min < 0.5, 'spread should not explode');
    }
  },
  {
    name: 'D Recent Degradation of EXPEDITE',
    apply: async () => {
      for (let i=0;i<5;i++) await strategyPerformanceService.updateOnDecision({ strategy: 'EXPEDITE', effectiveness: 0.2 });
    },
    expectation: (w) => {
      assert(w['EXPEDITE'] < 0.6, 'EXPEDITE weight should reduce after degradation');
    }
  }
];

export async function runAdaptiveWeightingValidation() {
  for (const s of scenarios) {
    await runScenario(s);
  }
  console.log('All adaptive weighting scenarios passed');
}
// ESM execution helper (dynamic top-level call guarded by env variable)
if (process.env.RUN_STRATEGY_VALIDATION === '1') {
  runAdaptiveWeightingValidation().catch(e => { console.error('Validation failed', e); process.exit(1); });
}
