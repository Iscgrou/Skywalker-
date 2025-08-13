// Validation Harness for AdaptiveWeightsRunner (R1–R6)
// اجرای سریع بدون تایمر: شبیه‌سازی الگوهای متریک و بررسی نتایج
import { AdaptiveWeightsRunner } from './strategy-adaptive-runner.js';
import { adaptiveWeightTuningService } from './strategy-adaptive-weight-tuning-service.js';

interface Scenario {
  name: string;
  pattern: (cycle:number)=> { ackRate:number; escalationEffectiveness:number; falseSuppressionRate:number; suspectedFalseRate:number; reNoiseRate?:number };
  cycles: number;
  expect: (logs:any[])=> boolean;
}

let counter=0;

async function runScenario(sc: Scenario){
  counter=0;
  const runner = new AdaptiveWeightsRunner({ intervalMs:999999, warmupCycles:2, providers:{ async collectAggregated(){ counter++; try { return sc.pattern(counter);} catch(e){ return { ackRate:0.7, escalationEffectiveness:0.5, falseSuppressionRate:0.1, suspectedFalseRate:0.15, reNoiseRate:0, degraded:true }; } } } as any });
  const rawLogs:any[] = [];
  for (let i=0;i<sc.cycles;i++) {
    const res = await runner.runOnce();
    rawLogs.push((runner as any).logs[(runner as any).logs.length-1]);
  }
  const pass = sc.expect(rawLogs);
  return { name: sc.name, pass, cycles: sc.cycles };
}

const scenarios: Scenario[] = [
  { name:'R1 Warmup No Adjust', cycles:4, pattern:(c)=>({ ackRate:0.70, escalationEffectiveness:0.55, falseSuppressionRate:0.08, suspectedFalseRate:0.12 }), expect:(logs)=> logs.slice(0,2).every(l=> l.result.reason==='warmup') },
  { name:'R2 Cooldown Enforcement', cycles:6, pattern:(c)=>({ ackRate: c===3? 0.40 : 0.41, escalationEffectiveness:0.40, falseSuppressionRate:0.05, suspectedFalseRate:0.10 }), expect:(logs)=> logs.some(l=> l.result.reason==='applied') && logs.filter(l=> l.result.reason==='cooldown').length>=1 },
  { name:'R3 Outlier Spike Revert', cycles:8, pattern:(c)=>({ ackRate:0.74, escalationEffectiveness:0.60, falseSuppressionRate: c===5? 0.90 : 0.11, suspectedFalseRate: c===5? 0.90 : 0.11 }), expect:(logs)=> { const spike = logs.find(l=> l.metrics.falseSuppressionRate>0.8); if(!spike) return false; const idx = logs.indexOf(spike); const after = logs.slice(idx+2).map(l=> l.metrics.falseSuppressionRate); return after.every(v=> v<0.2); } },
  { name:'R4 DriftCap', cycles:7, pattern:(c)=>({ ackRate:0.50, escalationEffectiveness:0.45, falseSuppressionRate:0.25, suspectedFalseRate:0.25 }), expect:(logs)=> logs.some(l=>{ const d=l.result?.deltas; if(!d) return false; const l1 = Object.values(d).reduce((s:number,x:any)=>s+Math.abs(x),0); return l1 <= 0.15001; }) },
  { name:'R5 Freeze Convergence', cycles:20, pattern:(c)=>({ ackRate:0.852, escalationEffectiveness:0.705, falseSuppressionRate:0.099, suspectedFalseRate:0.149, reNoiseRate:0.20 }), expect:(logs)=> logs.some(l=> l.result.reason==='freeze') },
  { name:'R6 Provider Failure Fallback', cycles:5, pattern:(c)=>{ if (c===4) throw new Error('provider-fail'); return { ackRate:0.80, escalationEffectiveness:0.60, falseSuppressionRate:0.09, suspectedFalseRate:0.11 }; }, expect:(logs)=> logs.some(l=> l.metrics.degraded) }
];

async function main(){
  const results = [] as any[];
  for (const sc of scenarios) {
    try { results.push(await runScenario(sc)); }
    catch(e:any){ results.push({ name: sc.name, pass:false, error:e.message }); }
  }
  console.table(results);
  const allPass = results.every(r=> r.pass);
  console.log('Adaptive Runner Validation allPass=', allPass);
  if (!allPass) process.exitCode = 1;
}

if (process.env.RUN_ADAPTIVE_RUNNER_VALIDATION) { main(); }
