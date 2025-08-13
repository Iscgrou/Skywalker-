// Iteration 26: Suppression Validation Harness (S1–S10)
import { governanceAlertSuppressionService as svc } from './strategy-governance-alert-suppression-service.ts';

interface ScenarioResult { id:string; pass:boolean; details?:any; }

function approx(a:number,b:number, eps=0.001){ return Math.abs(a-b)<=eps; }

async function runCycle(groups:string[]) {
  return await svc.evaluateSuppressionWindow(groups);
}

async function scenarioS1(): Promise<ScenarioResult> {
  const g = 'G_NOISY_LOW_ACK';
  svc.resetAll();
  svc.setGroupMeta(g,{ severityScope:'warn' });
  // Sequence: high noise sustained
  svc.setTestSignals(g, Array.from({length:5}).map(()=>({ ackRate:0.05, suspectedFalseRate:0.6, volume:15, dedupRatio:0.6, escalationEffectiveness:0.2 })) );
  const states: string[] = [];
  for (let i=0;i<5;i++){ const r = await runCycle([g]); states.push(r.groups[0].state); }
  const pass = states.includes('CANDIDATE') && states.includes('SUPPRESSED');
  return { id:'S1 Activation', pass, details:{ states } };
}

async function scenarioS2(): Promise<ScenarioResult> {
  const g='G_HYSTERESIS'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
  // Oscillation around thresholds: 0.50 - 0.62 (<high=0.65) should not enter SUPPRESSED
  const seq = [0.5,0.58,0.61,0.59,0.52,0.6].map(n=>({ ackRate:1-n, suspectedFalseRate:n*0.6, volume:12, dedupRatio:0.7, escalationEffectiveness:0.1 }));
  svc.setTestSignals(g, seq);
  const st: string[] = [];
  for (let i=0;i<seq.length;i++){ const r= await runCycle([g]); st.push(r.groups[0].state); }
  const pass = !st.includes('SUPPRESSED');
  return { id:'S2 Hysteresis Stability', pass, details:{ states:st } };
}

async function scenarioS3(): Promise<ScenarioResult> {
  const g='G_BLOCK_ESC_EFF'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
  // High escalation effectiveness should block suppression
  const seq = Array.from({length:6}).map(()=>({ ackRate:0.1, suspectedFalseRate:0.5, volume:20, dedupRatio:0.5, escalationEffectiveness:0.9 }));
  svc.setTestSignals(g, seq);
  const st: string[] = [];
  for (let i=0;i<6;i++){ const r= await runCycle([g]); st.push(r.groups[0].state); }
  const pass = !st.includes('SUPPRESSED');
  return { id:'S3 Escalation Safety Valve', pass, details:{ states:st } };
}

async function scenarioS4(): Promise<ScenarioResult> {
  const g='G_RECOVERY'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
  // Enter suppression first
  const noisy = Array.from({length:4}).map(()=>({ ackRate:0.05, suspectedFalseRate:0.55, volume:18, dedupRatio:0.6, escalationEffectiveness:0.1 }));
  const recovery = Array.from({length:4}).map(()=>({ ackRate:0.6, suspectedFalseRate:0.2, volume:6, dedupRatio:0.85, escalationEffectiveness:0.1 }));
  svc.setTestSignals(g, [...noisy, ...recovery]);
  const st: string[] = [];
  for (let i=0;i<8;i++){ const r= await runCycle([g]); st.push(r.groups[0].state); }
  const pass = st.includes('SUPPRESSED') && st[st.length-1]==='ACTIVE';
  return { id:'S4 Recovery Exit', pass, details:{ states:st } };
}

async function scenarioS5(): Promise<ScenarioResult> {
  const g='G_FALSE_SUPP'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
  // Low ack inside suppression then jump after exit
  const noisy = Array.from({length:3}).map(()=>({ ackRate:0.05, suspectedFalseRate:0.5, volume:15, dedupRatio:0.65, escalationEffectiveness:0.05 }));
  const stable = Array.from({length:3}).map(()=>({ ackRate:0.1, suspectedFalseRate:0.4, volume:10, dedupRatio:0.7, escalationEffectiveness:0.05 }));
  const recoverPhase = Array.from({length:3}).map(()=>({ ackRate:0.7, suspectedFalseRate:0.15, volume:6, dedupRatio:0.85, escalationEffectiveness:0.05 }));
  svc.setTestSignals(g, [...noisy, ...stable, ...recoverPhase]);
  let metricsBefore = svc.getSuppressionMetrics();
  for (let i=0;i<9;i++){ await runCycle([g]); }
  const metricsAfter = svc.getSuppressionMetrics();
  const pass = metricsAfter.falseSuppressionRate > metricsBefore.falseSuppressionRate;
  return { id:'S5 False Suppression Detection', pass, details:{ before:metricsBefore.falseSuppressionRate, after:metricsAfter.falseSuppressionRate } };
}

async function scenarioS6(): Promise<ScenarioResult> {
  const g='G_MODE_B'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
  svc.setTestSignals(g, Array.from({length:5}).map(()=>({ ackRate:0.05, suspectedFalseRate:0.6, volume:14, dedupRatio:0.6, escalationEffectiveness:0.1 })) );
  let suppressedSeen = false;
  for (let i=0;i<5;i++){ const r= await runCycle([g]); if (r.groups[0].state==='SUPPRESSED') suppressedSeen=true; }
  const proj = svc.getSuppressionState(g);
  const pass = suppressedSeen && proj.suppressed === true && proj.mode==='MUTE';
  return { id:'S6 Mode B Projection', pass, details:{ projection:proj } };
}

async function scenarioS7(): Promise<ScenarioResult> {
  const g='G_SPIKE_HIGH_ACK'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
  svc.setTestSignals(g, Array.from({length:5}).map(()=>({ ackRate:0.9, suspectedFalseRate:0.1, volume:30, dedupRatio:0.9, escalationEffectiveness:0.05 })) );
  const st: string[] = [];
  for (let i=0;i<5;i++){ const r= await runCycle([g]); st.push(r.groups[0].state); }
  const pass = !st.includes('SUPPRESSED');
  return { id:'S7 Density Spike With High Ack', pass, details:{ states:st } };
}

async function scenarioS8(): Promise<ScenarioResult> {
  // Mixed severity – critical should block even if noisy
  const g='G_MIXED_CRITICAL'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'critical' });
  svc.setTestSignals(g, Array.from({length:6}).map(()=>({ ackRate:0.05, suspectedFalseRate:0.6, volume:16, dedupRatio:0.6, escalationEffectiveness:0.2, severity:'critical' })) );
  const st: string[] = [];
  for (let i=0;i<6;i++){ const r= await runCycle([g]); st.push(r.groups[0].state); }
  const pass = !st.includes('SUPPRESSED');
  return { id:'S8 Critical Block', pass, details:{ states:st } };
}

async function scenarioS9(): Promise<ScenarioResult> {
  // Performance – 500 groups
  svc.resetAll();
  const groups = Array.from({length:500}).map((_,i)=>'BATCH_'+i);
  for (const g of groups) {
    svc.setGroupMeta(g,{ severityScope:'warn' });
    svc.setTestSignals(g, [{ ackRate:0.2, suspectedFalseRate:0.3, volume:10, dedupRatio:0.8, escalationEffectiveness:0.2 }]);
  }
  const r = await runCycle(groups);
  const pass = r.batchMs < 50 && r.evaluated===500;
  return { id:'S9 Performance Batch', pass, details:{ batchMs:r.batchMs, evaluated:r.evaluated } };
}

async function scenarioS10(): Promise<ScenarioResult> {
  // Time drift robustness simulated by alternating signals (ackRate extremes)
  const g='G_DRIFT'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
  const seq = [0.05,0.9,0.07,0.85,0.06,0.8].map(a=>({ ackRate:a, suspectedFalseRate:0.4, volume:12, dedupRatio:0.7, escalationEffectiveness:0.2 }));
  svc.setTestSignals(g, seq);
  const st: string[] = [];
  for (let i=0;i<seq.length;i++){ const r= await runCycle([g]); st.push(r.groups[0].noiseScore.toFixed(3)); }
  // noiseScore should stay within [0,1]
  const within = st.every(s=> parseFloat(s)>=0 && parseFloat(s)<=1);
  return { id:'S10 Drift Robustness', pass: within, details:{ noiseSamples:st } };
}

export async function runSuppressionValidation() {
  const scenarios = [scenarioS1,scenarioS2,scenarioS3,scenarioS4,scenarioS5,scenarioS6,scenarioS7,scenarioS8,scenarioS9,scenarioS10];
  // Iteration 27: Robust Threshold New Scenarios
  async function scenarioS11(): Promise<ScenarioResult> {
    // Outlier Spike: یک spike شدید نباید بلافاصله suppression دهد اگر median هنوز پایین است
    const g='G_OUTLIER_SPIKE'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
    // history پایه با نویز متوسط
    const base = Array.from({length:8}).map(()=>({ ackRate:0.5, suspectedFalseRate:0.3, volume:8, dedupRatio:0.8, escalationEffectiveness:0.2 }));
    // یک spike شدید تک
    const spike = [{ ackRate:0.01, suspectedFalseRate:0.9, volume:40, dedupRatio:0.4, escalationEffectiveness:0.1 }];
    svc.setTestSignals(g, [...base, ...spike]);
    let suppressed=false; let lastDyn:any;
    for (let i=0;i<base.length+spike.length;i++){ const r= await runCycle([g]); if (r.groups[0].state==='SUPPRESSED') suppressed=true; lastDyn={ dynHigh:r.groups[0].dynHigh, dynLow:r.groups[0].dynLow }; }
    const pass = !suppressed; // نباید suppress شود
    return { id:'S11 Outlier Spike', pass, details:lastDyn };
  }
  async function scenarioS12(): Promise<ScenarioResult> {
    // Gradual Drift: افزایش تدریجی باید نهایتاً suppression دهد (threshold حرکت می‌کند ولی عقب نمی‌ماند)
    const g='G_GRADUAL_DRIFT'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
    const seq:number[] = [0.4,0.42,0.45,0.48,0.5,0.53,0.56,0.6,0.63,0.66,0.7];
    svc.setTestSignals(g, seq.map(a=>({ ackRate:1-a, suspectedFalseRate: a*0.5, volume:10, dedupRatio:0.75, escalationEffectiveness:0.2 }))); // noiseRaw تقریبی a
    let finalState=''; let dynSeries:number[]=[];
    for (let i=0;i<seq.length;i++){ const r= await runCycle([g]); finalState=r.groups[0].state; if (r.groups[0].dynHigh) dynSeries.push(r.groups[0].dynHigh); }
    const pass = ['CANDIDATE','SUPPRESSED'].includes(finalState); // باید وارد فاز بالا شود
    return { id:'S12 Gradual Drift Adaptation', pass, details:{ finalState, dynHighSeries: dynSeries.slice(-5) } };
  }
  async function scenarioS13(): Promise<ScenarioResult> {
    // Ack Improvement Stability: پس از نویز و بهبود ack، نباید دوباره suppress سریع رخ دهد
    const g='G_ACK_IMPROVE'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
    const noisy = Array.from({length:9}).map(()=>({ ackRate:0.1, suspectedFalseRate:0.6, volume:15, dedupRatio:0.6, escalationEffectiveness:0.2 }));
    const improve = Array.from({length:6}).map(()=>({ ackRate:0.85, suspectedFalseRate:0.2, volume:9, dedupRatio:0.85, escalationEffectiveness:0.2 }));
    const relapse = [{ ackRate:0.2, suspectedFalseRate:0.4, volume:11, dedupRatio:0.75, escalationEffectiveness:0.2 }];
    svc.setTestSignals(g, [...noisy, ...improve, ...relapse]);
    let states:string[]=[];
    for (let i=0;i<noisy.length+improve.length+relapse.length;i++){ const r= await runCycle([g]); states.push(r.groups[0].state); }
    const last = states[states.length-1];
    // اگر robust درست کار کند پس از بهبود طولانی، یک relapse کوچک نباید فوراً SUPPRESSED بدهد
    const pass = last !== 'SUPPRESSED';
    return { id:'S13 Ack Improvement Stability', pass, details:{ tailStates: states.slice(-6) } };
  }
  async function scenarioS14(): Promise<ScenarioResult> {
    // Robust vs Naive Diff: نشان می‌دهد dynHigh با median+MAD کمتر حساس به outlier نسبت به ثابت است
    const g='G_ROBUST_DIFF'; svc.resetAll(); svc.setGroupMeta(g,{ severityScope:'warn' });
    const normal = Array.from({length:8}).map(()=>({ ackRate:0.55, suspectedFalseRate:0.25, volume:8, dedupRatio:0.82, escalationEffectiveness:0.2 }));
    const outliers = [ { ackRate:0.05, suspectedFalseRate:0.9, volume:35, dedupRatio:0.5, escalationEffectiveness:0.2 }, { ackRate:0.04, suspectedFalseRate:0.88, volume:30, dedupRatio:0.52, escalationEffectiveness:0.2 } ];
    svc.setTestSignals(g, [...normal, ...outliers]);
    let dynHighVals:number[]=[]; let suppressed=false;
    for (let i=0;i<normal.length+outliers.length;i++){ const r= await runCycle([g]); dynHighVals.push(r.groups[0].dynHigh||0); if (r.groups[0].state==='SUPPRESSED') suppressed=true; }
    const staticHigh=0.65; const lastDyn = dynHighVals[dynHighVals.length-1];
    // انتظار: dynHigh نسبت به staticHigh بالاتر یا نزدیک باقی مانده تا outlier فوری suppress نکند
  const pass = !suppressed && lastDyn >= staticHigh*0.6; // حداقل 60% مقدار ثابت (robust حفظ فاصله معنی دار)
    return { id:'S14 Robust vs Naive Diff', pass, details:{ lastDyn, staticHigh } };
  }
  scenarios.push(scenarioS11, scenarioS12, scenarioS13, scenarioS14);
  const results: ScenarioResult[] = [];
  for (const fn of scenarios) {
    try { results.push(await fn()); } catch(e:any){ results.push({ id: fn.name, pass:false, details:{ error: e.message } }); }
  }
  const summary = { allPass: results.every(r=>r.pass), results };
  if (typeof process!=='undefined' && process.env.NODE_ENV!=='production') {
    console.log(JSON.stringify(summary,null,2));
  }
  return summary;
}

// ESM entry detection (بدون تکیه بر import.meta.main که در TS types نیست)
if (process.argv[1] && process.argv[1].includes('strategy-governance-alert-suppression-validation')) {
  runSuppressionValidation();
}
