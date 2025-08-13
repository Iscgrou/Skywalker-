// Iteration 19 (Design Draft): Adaptive Threshold Calibration Service
// هدف: تولید مقادیر پویا برای آستانه‌های Governance (Iteration 18) بر اساس توزیع اخیر متریک‌های روند (Iteration 17)
// رویکرد:
//  - جمع‌آوری سری متریک‌ها در بازه window بزرگ‌تر (calibrationWindow)
//  - محاسبه قدر مطلق یا مستقیم برای هر متریک کلیدی، اعمال برش (trim) درصدی برای حذف outlier های شدید
//  - استخراج quantile ها (Q50, Q80, Q90, Q95) و نگاشت به آستانه‌ها:
//     slopeWarn = Q80(|lrSlope|) ∧ کف مینیمم پایه
//     slopeCritical = max(Q90, slopeWarn*1.3)
//     volMomentumThreshold = Q80(volatilityMomentum+)
//     reversalDeltaMin = Q70(|deltaWeight|) با سقف cap
//     plateauTinySlope = Q40(|lrSlope|) * 0.6 (محدود به حداکثر tinySlopeBase)
//     smoothingHigh = Q80(smoothingReductionRatio)
//     anomalyClusterK: بر اساس Q80(countAnomaliesRecent) ولی حداقل 2، حداکثر 5
//  - بازگشت thresholds + آمار (diagnostics) برای ممیزی.
// قرارداد:
//  computeAdaptiveThresholds({ calibrationWindow?, trimPct?, minSamples?, strategy? }): Promise<AdaptiveThresholdReport>
// AdaptiveThresholdReport: { window, sampleStrategies, metricsSamples, thresholds, diagnostics }
// Counterexamples Validation Harness:
//  A Stable Low Variance -> آستانه‌ها نزدیک پایه و تفکیک منطقی (critical>warn)
//  B High Slope Burst -> slopeWarn/critical بالاتر از سناریوی A
//  C Volatility Cluster -> volMomentumThreshold افزایش
//  D Sparse Anomalies -> anomalyClusterK = 2 (min)
//  E Insufficient Samples -> بازگشت defaults (flag: fallback:true)
// ریسک‌ها:
//  - Overreaction به outlier منفرد: trimPct + minSamples gating
//  - Drift طولانی مدت: آینده roll-forward EMA بر quantiles

import { strategyTrendAnalyticsService } from './strategy-trend-analytics-service.ts';

interface AdaptiveThresholds {
  slopeWarn: number; slopeCritical: number; volMomentum: number; reversalDeltaMin: number; plateauTinySlope: number; smoothingHigh: number; anomalyClusterK: number; fallback: boolean;
}
interface AdaptiveThresholdReport {
  window: number; sampleStrategies: number; thresholds: AdaptiveThresholds; diagnostics: any;
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0; if (q<=0) return sorted[0]; if (q>=1) return sorted[sorted.length-1];
  const pos = (sorted.length -1)* q; const base = Math.floor(pos); const frac = pos - base; const next = sorted[Math.min(base+1, sorted.length-1)];
  return sorted[base] + (next - sorted[base])*frac;
}

export const strategyThresholdCalibrationService = {
  async computeAdaptiveThresholds(opts: { calibrationWindow?: number; trimPct?: number; minSamples?: number; strategy?: string } = {}): Promise<AdaptiveThresholdReport> {
    const window = opts.calibrationWindow ?? 300;
    const trimPct = opts.trimPct ?? 0.02;
    const minSamples = opts.minSamples ?? 8;
    const trends = await strategyTrendAnalyticsService.computeTrends({ window });
    const values = { lrSlope: [] as number[], volatilityMomentum: [] as number[], deltaWeight: [] as number[], smoothingReductionRatio: [] as number[], anomaliesRecent: [] as number[] };
    let strategiesCount = 0;
    Object.values(trends.strategies).forEach(m => {
      if (m.sampleCount < minSamples) return; strategiesCount++;
      if (m.lrSlope!=null) values.lrSlope.push(Math.abs(m.lrSlope));
      if (m.volatilityMomentum!=null) values.volatilityMomentum.push(Math.max(0, m.volatilityMomentum));
      if (m.deltaWeight!=null) values.deltaWeight.push(Math.abs(m.deltaWeight));
      if (m.smoothingReductionRatio!=null) values.smoothingReductionRatio.push(m.smoothingReductionRatio);
      const recentAnoms = m.anomalies.filter(a => a.index >= (m.sampleCount - 10)).length;
      values.anomaliesRecent.push(recentAnoms);
    });
    const fallback = strategiesCount === 0 || values.lrSlope.length === 0;
    const defaults: AdaptiveThresholds = { slopeWarn:0.0015, slopeCritical:0.003, volMomentum:0.8, reversalDeltaMin:0.005, plateauTinySlope:0.0002, smoothingHigh:0.25, anomalyClusterK:2, fallback };
    if (fallback) return { window, sampleStrategies: strategiesCount, thresholds: defaults, diagnostics: { mode:'fallback' } };
    function prep(arr: number[]) {
      if (!arr.length) return arr;
      const sorted = [...arr].sort((a,b)=>a-b);
      const cut = Math.floor(sorted.length*trimPct);
      return sorted.slice(cut, sorted.length - cut || sorted.length);
    }
    const lr = prep(values.lrSlope); const vol = prep(values.volatilityMomentum); const dw = prep(values.deltaWeight); const sm = prep(values.smoothingReductionRatio); const an = prep(values.anomaliesRecent);
    const q = (arr:number[],p:number)=> quantile(arr,p);
    const slopeWarn = Math.max(0.0008, q(lr,0.80));
    const slopeCritical = Math.max(q(lr,0.90), slopeWarn*1.3);
    const volMomentum = Math.max(0.3, q(vol,0.80));
    const reversalDeltaMin = Math.min(0.05, Math.max(0.002, q(dw,0.70)));
    const plateauTinySlope = Math.min(0.001, q(lr,0.40)*0.6 || 0.0002);
    const smoothingHigh = Math.min(0.9, Math.max(0.10, q(sm,0.80)));
    const anomalyClusterK = Math.min(5, Math.max(2, Math.round(q(an,0.80))));
    const thresholds: AdaptiveThresholds = { slopeWarn: parseFloat(slopeWarn.toFixed(6)), slopeCritical: parseFloat(slopeCritical.toFixed(6)), volMomentum: parseFloat(volMomentum.toFixed(6)), reversalDeltaMin: parseFloat(reversalDeltaMin.toFixed(6)), plateauTinySlope: parseFloat(plateauTinySlope.toFixed(6)), smoothingHigh: parseFloat(smoothingHigh.toFixed(6)), anomalyClusterK, fallback:false };
    const diagnostics = { counts: { lr:lr.length, vol:vol.length, dw:dw.length, sm:sm.length, an:an.length }, rawSamples: values, quantiles: { lr:{q40:q(lr,0.4), q80:q(lr,0.8), q90:q(lr,0.9)}, vol:{q80:q(vol,0.8)}, dw:{q70:q(dw,0.7)}, sm:{q80:q(sm,0.8)}, an:{q80:q(an,0.8)} } };
    return { window, sampleStrategies: strategiesCount, thresholds, diagnostics };
  }
};

export async function _debugAdaptiveThresholds() {
  const r = await strategyThresholdCalibrationService.computeAdaptiveThresholds({});
  console.log('AdaptiveThresholds', JSON.stringify(r, null, 2));
}
