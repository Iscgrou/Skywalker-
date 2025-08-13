// Iteration 17 (Design Draft): Trend Analytics Service
// اهداف:
//  - استخراج شاخص‌های روند و نوسان از توالی snapshot های وزن استراتژی.
//  - آماده‌سازی برای anomaly detection و adaptive tuning در لایه‌های بالاتر.
// قرارداد پیشنهادی:
//  computeTrends(opts?: { window?: number; maWindow?: number; anomalyThreshold?: number; strategy?: string }): Promise<TrendReport>
//  TrendReport: { window, count, strategies: Record<string, { simpleSlope, lrSlope, deltaWeight, deltaSpread, volatilityMomentum, anomalies: AnomalyPoint[], smoothingReductionRatio, sampleCount }> }
//  - simpleSlope: (آخرین وزن - اولین وزن)/windowLen
//  - lrSlope: شیب خط رگرسیون حداقل مربعات روی (index, weight)
//  - deltaWeight: اختلاف وزن آخر نسبت به میانگین 3 نمونه پایانی قبل از آخرین نمونه
//  - deltaSpread: همان منطق برای spread
//  - volatilityMomentum: اختلاف میانگین spread نیمه دوم منفی نیمه اول (جهت تغییر نوسان)
//  - smoothingReductionRatio: 1 - (std(movingAvg(weights))/std(weights)) بیانگر اثر smoothing
//  - anomalies: نقاطی که |وزن - movingAvg| > anomalyThreshold * movingStd
// الزامات طراحی:
//  - عدم وابستگی مستقیم به DB: استفاده از strategyWeightSnapshotService.listSnapshots.
//  - سازگاری در حالت حافظه.
//  - محاسبات O(N) برای هر استراتژی.
// مثال نقض‌ها (Validation Harness):
//  A روند صعودی یکنواخت => simpleSlope>0 و lrSlope≈simpleSlope.
//  B Smoothing کاهش انحراف => smoothingReductionRatio>0.
//  C Volatility Momentum: افزایش نوسان نیمه دوم => momentum>0.
//  D Anomaly: یک spike مجزا باید در anomalies ثبت شود.
//  E Alignment: lrSlope و جهت deltaWeight هم‌علامت.

import { strategyWeightSnapshotService } from './strategy-weight-snapshot-service.ts';

interface AnomalyPoint { index: number; weight: number; zScore: number; timestamp: Date; }
interface StrategyTrend {
  simpleSlope: number|null;
  lrSlope: number|null;
  deltaWeight: number|null;
  deltaSpread: number|null;
  volatilityMomentum: number|null;
  smoothingReductionRatio: number|null;
  anomalies: AnomalyPoint[];
  sampleCount: number;
}
export interface TrendReport { window: number; count: number; strategies: Record<string, StrategyTrend>; }

function linearRegressionSlope(values: number[]): number|null {
  if (values.length < 2) return null;
  const n = values.length; const xs = values.map((_,i)=>i);
  const sumX = xs.reduce((a,b)=>a+b,0); const sumY = values.reduce((a,b)=>a+b,0);
  const sumXY = values.reduce((a,b,i)=> a + b*xs[i], 0);
  const sumX2 = xs.reduce((a,b)=> a + b*b, 0);
  const denom = (n*sumX2 - sumX*sumX);
  if (denom === 0) return 0;
  const slope = (n*sumXY - sumX*sumY)/denom;
  return slope;
}

function movingAverage(arr: number[], w: number): number[] {
  if (w <=1) return [...arr];
  const out: number[] = []; let sum = 0; for (let i=0;i<arr.length;i++){ sum+=arr[i]; if (i>=w) sum-=arr[i-w]; if (i>=w-1) out.push(sum/Math.min(w,i+1)); }
  while (out.length < arr.length) out.unshift(arr[out.length-1] ?? arr[0]);
  return out.slice(-arr.length);
}

function std(arr: number[]): number { if (arr.length===0) return 0; const m = arr.reduce((a,b)=>a+b,0)/arr.length; return Math.sqrt(arr.reduce((a,b)=> a+(b-m)*(b-m),0)/arr.length); }

export const strategyTrendAnalyticsService = {
  async computeTrends(opts: { window?: number; maWindow?: number; anomalyThreshold?: number; anomalyBaselineWindow?: number; strategy?: string } = {}): Promise<TrendReport> {
    const window = opts.window ?? 60;
    const maWindow = opts.maWindow ?? 5;
    const anomalyThreshold = opts.anomalyThreshold ?? 2.5;
    const anomalyBaselineWindow = opts.anomalyBaselineWindow ?? maWindow;
    const snaps = await strategyWeightSnapshotService.listSnapshots({ strategy: opts.strategy, limit: window });
    const byStrategy: Record<string, any[]> = {};
    for (const s of snaps) { (byStrategy[s.strategy] ||= []).push(s); }
    const strategies: Record<string, StrategyTrend> = {};
    Object.entries(byStrategy).forEach(([strat, rows]) => {
      const ordered = [...rows].reverse();
      const weights = ordered.map(r => parseFloat(r.weight));
      const spreads = ordered.map(r => r.spread != null ? parseFloat(r.spread as any) : 0);
      const n = weights.length;
      if (n === 0) { strategies[strat] = { simpleSlope:null, lrSlope:null, deltaWeight:null, deltaSpread:null, volatilityMomentum:null, smoothingReductionRatio:null, anomalies:[], sampleCount:0 }; return; }
      const simpleSlope = n>1 ? (weights[n-1]-weights[0])/(n-1) : 0;
      const lrSlope = linearRegressionSlope(weights);
      const last3Base = n>3 ? weights.slice(n-4, n-1) : weights.slice(0, n-1);
      const meanLast3 = last3Base.length? last3Base.reduce((a,b)=>a+b,0)/last3Base.length : weights[0];
      const deltaWeight = n>1 ? (weights[n-1]-meanLast3) : 0;
      const spreadLast3Base = spreads.length>3 ? spreads.slice(n-4, n-1) : spreads.slice(0, n-1);
      const meanSpreadLast3 = spreadLast3Base.length? spreadLast3Base.reduce((a,b)=>a+b,0)/spreadLast3Base.length : spreads[0];
      const deltaSpread = n>1 ? (spreads[n-1]-meanSpreadLast3) : 0;
      const mid = Math.floor(n/2) || 1; const firstHalf = spreads.slice(0, mid); const secondHalf = spreads.slice(mid);
      const avg = (arr:number[])=> arr.length? arr.reduce((a,b)=>a+b,0)/arr.length : 0;
      const volatilityMomentum = avg(secondHalf)-avg(firstHalf);
      const ma = movingAverage(weights, maWindow);
      const rawStd = std(weights); const smoothStd = std(ma);
      const smoothingReductionRatio = rawStd>0? 1 - (smoothStd/rawStd) : 0;
      const anomalies: AnomalyPoint[] = [];
      for (let i=0;i<weights.length;i++) {
        const winStart = Math.max(0, i - anomalyBaselineWindow);
        const baseSlice = weights.slice(winStart, i); // exclude current
        if (baseSlice.length < 2) continue;
        const m = avg(baseSlice);
        const sd = std(baseSlice);
        const point = weights[i];
        if (sd > 0) {
          const z = (point - m)/sd;
            if (Math.abs(z) > anomalyThreshold) {
              anomalies.push({ index: i, weight: point, zScore: parseFloat(z.toFixed(2)), timestamp: new Date((ordered[i].capturedAt || ordered[i].createdAt)) });
            }
        } else {
          // fallback absolute deviation threshold
          if (Math.abs(point - m) > 0.05) {
            anomalies.push({ index: i, weight: point, zScore: 0, timestamp: new Date((ordered[i].capturedAt || ordered[i].createdAt)) });
          }
        }
      }
      strategies[strat] = {
        simpleSlope: parseFloat(simpleSlope.toFixed(6)),
        lrSlope: lrSlope!=null? parseFloat(lrSlope.toFixed(6)) : null,
        deltaWeight: parseFloat(deltaWeight.toFixed(6)),
        deltaSpread: parseFloat(deltaSpread.toFixed(6)),
        volatilityMomentum: parseFloat(volatilityMomentum.toFixed(6)),
        smoothingReductionRatio: parseFloat(smoothingReductionRatio.toFixed(6)),
        anomalies,
        sampleCount: n
      };
    });
    return { window, count: snaps.length, strategies };
  }
};

export async function _debugPrintTrends() {
  const r = await strategyTrendAnalyticsService.computeTrends({});
  console.log('TrendReport', JSON.stringify(r, null, 2));
}
