// Iteration 28: Adaptive Weight Tuning Validation Harness
// سناریوهای W1–W6 برای ارزیابی رفتار الگوریتم تنظیم وزن
import { adaptiveWeightTuningService as svc } from './strategy-adaptive-weight-tuning-service.ts';

interface WResult { id:string; pass:boolean; details:any }

function resetService(){ // create fresh instance by re-import? For simplicity weights not resetable yet -> manual hack
  // In real scenario we might export a factory; here we simulate by direct reassign (NOT ideal for prod)
  // @ts-ignore
  svc['st'].weights = { w1:0.3, w2:0.25, w3:0.15, w4:0.15, w5:0.15 };
  // @ts-ignore
  svc['st'].history = [];
  // @ts-ignore
  svc['st'].logs = [];
  // @ts-ignore
  svc['st'].cycle = 0;
  // @ts-ignore
  svc['st'].lastAdjustmentCycle = -Infinity;
  // @ts-ignore
  svc['st'].freezeActive = false;
}

function cloneWeights(){ return svc.getCurrentWeights(); }

async function scenarioW1(): Promise<WResult> {
  resetService();
  // ackRate پایین تر از هدف ⇒ افزایش w1 طی چند چرخه
  const metricsSeq = [0.55,0.58,0.6,0.62,0.64,0.66].map(a=>({
    ackRate:a,
    escalationEffectiveness:0.6,
    falseSuppressionRate:0.07,
    suspectedFalseRate:0.12,
    reNoiseRate:0.1
  }));
  const wSeries:any[]=[];
  for (const m of metricsSeq){ const r=svc.computeAdjustment(m); wSeries.push({cycle:r, weights: cloneWeights()}); }
  const finalW = cloneWeights();
  const pass = finalW.w1 > 0.3; // باید رشد کند
  return { id:'W1 Converging AckRate', pass, details:{ finalW } };
}

async function scenarioW2(): Promise<WResult> {
  resetService();
  // falseSuppressionRate بالاتر از هدف ⇒ کاهش w2,w3,w4 و افزایش w5
  const metricsSeq = [0.18,0.19,0.2].map(f=>({
    ackRate:0.87,
    escalationEffectiveness:0.68,
    falseSuppressionRate:f,
    suspectedFalseRate:0.14,
    reNoiseRate:0.1
  }));
  let before = cloneWeights();
  for (const m of metricsSeq) svc.computeAdjustment(m);
  const after = cloneWeights();
  const pass = (after.w2 < before.w2) && (after.w5 > before.w5);
  return { id:'W2 High False Suppression', pass, details:{ before, after } };
}

async function scenarioW3(): Promise<WResult> {
  resetService();
  // Deadband نوسان کوچک ⇒ عدم تغییر محسوس
  const metricsSeq = Array.from({length:5}).map(()=>({
    ackRate:0.848, // اختلاف 0.002 (< deadband)
    escalationEffectiveness:0.699,
    falseSuppressionRate:0.099,
    suspectedFalseRate:0.151,
    reNoiseRate:0.199
  }));
  const before = cloneWeights();
  for (const m of metricsSeq) svc.computeAdjustment(m);
  const after = cloneWeights();
  const drift = Math.abs(after.w1-before.w1)+Math.abs(after.w2-before.w2)+Math.abs(after.w3-before.w3)+Math.abs(after.w4-before.w4)+Math.abs(after.w5-before.w5);
  const pass = drift < 0.02; // تقریبا ثابت
  return { id:'W3 Deadband Stability', pass, details:{ drift, before, after } };
}

async function scenarioW4(): Promise<WResult> {
  resetService();
  // Cooldown: دو چرخه پشت سر هم با انحراف ⇒ فقط چرخه اول تغییر (دومی cooldown)
  const m1 = { ackRate:0.5, escalationEffectiveness:0.5, falseSuppressionRate:0.2, suspectedFalseRate:0.2, reNoiseRate:0.25 };
  const m2 = { ...m1 };
  const r1 = svc.computeAdjustment(m1);
  const wAfter1 = cloneWeights();
  const r2 = svc.computeAdjustment(m2);
  const wAfter2 = cloneWeights();
  const pass = r1.adjusted && !r2.adjusted && JSON.stringify(wAfter1)===JSON.stringify(wAfter2);
  return { id:'W4 Cooldown Enforcement', pass, details:{ r1:r1.reason, r2:r2.reason, wAfter1, wAfter2 } };
}

async function scenarioW5(): Promise<WResult> {
  resetService();
  // چند تغییر متوالی ⇒ بررسی Σw=1 و هیچ وزن < min
  const seq = Array.from({length:8}).map((_,i)=>({
    ackRate:0.5 + i*0.02,
    escalationEffectiveness:0.55,
    falseSuppressionRate:0.18,
    suspectedFalseRate:0.16,
    reNoiseRate:0.22
  }));
  for (const m of seq) svc.computeAdjustment(m);
  const w = cloneWeights();
  const sum = Object.values(w).reduce((s,x)=>s+x,0);
  const minOk = Object.values(w).every(v=> v>=0.049); // tolerance
  const pass = Math.abs(sum-1) < 1e-6 && minOk;
  return { id:'W5 Normalization Integrity', pass, details:{ weights:w, sum } };
}

async function scenarioW6(): Promise<WResult> {
  resetService();
  // Outlier spike یکباره falseSuppressionRate بسیار بالا فقط یک بار و سپس نرمال ⇒ نباید تغییر شدید دائمی رخ دهد
  const base = { ackRate:0.86, escalationEffectiveness:0.69, falseSuppressionRate:0.11, suspectedFalseRate:0.13, reNoiseRate:0.11 };
  const spike = { ...base, falseSuppressionRate:0.45 };
  const seq = [base, spike, base, base, base, base];
  const before = cloneWeights();
  for (const m of seq) svc.computeAdjustment(m);
  const after = cloneWeights();
  const totalDiff = Object.keys(before).reduce((s,k)=> s + Math.abs((after as any)[k] - (before as any)[k]),0);
  const pass = totalDiff < 0.2; // تغییر محدود
  return { id:'W6 Outlier Skip/Moderation', pass, details:{ before, after, totalDiff } };
}

export async function runAdaptiveWeightValidation(){
  const scenarios = [scenarioW1,scenarioW2,scenarioW3,scenarioW4,scenarioW5,scenarioW6];
  const results: WResult[] = [];
  for (const s of scenarios){ try { results.push(await s()); } catch(e:any){ results.push({ id:s.name, pass:false, details:{ error:e.message } }); } }
  const summary = { allPass: results.every(r=>r.pass), results };
  if (typeof process!=='undefined') console.log(JSON.stringify(summary,null,2));
  return summary;
}

if (process.argv[1] && process.argv[1].includes('strategy-adaptive-weight-validation')) {
  runAdaptiveWeightValidation();
}
