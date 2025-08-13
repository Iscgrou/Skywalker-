// Iteration 18 (Design Draft): Strategy Governance Rule Engine
// اهداف:
//  - استخراج هشدارهای حاکمیتی (Governance Alerts) از روی متریک‌های روند (Iteration 17) برای مشاهده تغییر رژیم، ریسک معکوس، خوشه آنومالی.
//  - فراهم کردن لایه میانی قبل از Adaptive Auto-Tuning (فازهای بعدی) با قرارداد پایدار.
// قرارداد:
//  evaluateGovernance({ window?, strategy?, options? }) => GovernanceReport
//  GovernanceReport: {
//    window, generatedAt,
//    strategies: Record<strategy, { alerts: RuleAlert[]; metrics: Partial<TrendMetrics>; }>,
//    summary: { totalAlerts, bySeverity: Record<'info'|'warn'|'critical', number> }
//  }
//  RuleAlert: { id, severity, message, rationale: any, timestamp }
// قوانین اولیه:
//  R1 TrendBreakout: |lrSlope| >= slopeWarnThreshold && sampleCount>=minSamples (critical اگر >= slopeCriticalThreshold)
//  R2 VolatilitySurge: volatilityMomentum >= volMomentumThreshold
//  R3 AnomalyCluster: anomalies در آخر recentWindow >= anomalyClusterK (critical اگر >= anomalyClusterCriticalK)
//  R4 StabilityPlateau: |lrSlope| < tinySlope && smoothingReductionRatio >= smoothingHigh && volatilityMomentum <= plateauVolMomentumCeil
//  R5 ReversalRisk: sign(lrSlope)!=0 و sign(deltaWeight) مخالف sign(lrSlope) و |deltaWeight| >= reversalDeltaMin
// سناریوهای نقض (Validation Harness): A Breakout، B Vol Surge، C Cluster، D Plateau، E Reversal و کنترل False Positive.
// ریسک‌ها:
//  - Overfitting thresholds: پارامترپذیر سازی و مستندسازی.
//  - Noise spikes: استفاده از sampleCount gating و anomaly cluster window.
// آینده:
//  - Rule weights + auto tuning.
//  - Persistence of alerts (audit trail).

import { strategyTrendAnalyticsService } from './strategy-trend-analytics-service.ts';
import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts'; // Iteration 20 persistence integration
// (Iteration 19 integration) Optional adaptive thresholds override interface
export interface AdaptiveThresholdsOverride {
  slopeWarn?: number; slopeCritical?: number; volMomentum?: number; reversalDeltaMin?: number;
  plateauTinySlope?: number; smoothingHigh?: number; anomalyClusterK?: number; anomalyClusterCriticalK?: number;
}

export interface RuleAlert { id: string; severity: 'info'|'warn'|'critical'; message: string; rationale: any; timestamp: string; }
interface GovernanceOptions {
  slopeWarnThreshold?: number; slopeCriticalThreshold?: number; minSamples?: number;
  volMomentumThreshold?: number; anomalyClusterK?: number; anomalyClusterCriticalK?: number; anomalyRecentWindow?: number;
  tinySlope?: number; smoothingHigh?: number; plateauVolMomentumCeil?: number;
  reversalDeltaMin?: number; anomalyThreshold?: number; anomalyBaselineWindow?: number;
  adaptiveThresholds?: AdaptiveThresholdsOverride; // new optional adaptive injection
  persistAlerts?: boolean; // if true, store alerts in persistence layer
  persistContext?: any; // optional context metadata
}

interface TrendMetricsSubset {
  lrSlope?: number|null; simpleSlope?: number|null; deltaWeight?: number|null; volatilityMomentum?: number|null;
  smoothingReductionRatio?: number|null; anomalies?: any[]; sampleCount?: number; deltaSpread?: number|null;
}

export interface GovernanceReport {
  window: number; generatedAt: string;
  strategies: Record<string, { alerts: RuleAlert[]; metrics: TrendMetricsSubset }>;
  summary: { totalAlerts: number; bySeverity: Record<'info'|'warn'|'critical', number> };
}

export const strategyGovernanceService = {
  async evaluateGovernance(params: { window?: number; strategy?: string; options?: GovernanceOptions } = {}): Promise<GovernanceReport> {
    const window = params.window ?? 120;
    const opts: Required<GovernanceOptions> = {
      slopeWarnThreshold: params.options?.slopeWarnThreshold ?? 0.0015,
      slopeCriticalThreshold: params.options?.slopeCriticalThreshold ?? 0.003,
      minSamples: params.options?.minSamples ?? 12,
      volMomentumThreshold: params.options?.volMomentumThreshold ?? 0.8,
      anomalyClusterK: params.options?.anomalyClusterK ?? 2,
      anomalyClusterCriticalK: params.options?.anomalyClusterCriticalK ?? 4,
      anomalyRecentWindow: params.options?.anomalyRecentWindow ?? 10,
      tinySlope: params.options?.tinySlope ?? 0.0002,
      smoothingHigh: params.options?.smoothingHigh ?? 0.25,
      plateauVolMomentumCeil: params.options?.plateauVolMomentumCeil ?? 0.1,
      reversalDeltaMin: params.options?.reversalDeltaMin ?? 0.003,
      anomalyThreshold: params.options?.anomalyThreshold ?? 2.5,
      anomalyBaselineWindow: params.options?.anomalyBaselineWindow ?? 5,
      adaptiveThresholds: params.options?.adaptiveThresholds
    } as any;
    // Apply adaptive overrides if provided (non-destructive, only replace specified fields)
    if (opts.adaptiveThresholds) {
      const a = opts.adaptiveThresholds;
      if (a.slopeWarn != null) opts.slopeWarnThreshold = a.slopeWarn;
      if (a.slopeCritical != null) opts.slopeCriticalThreshold = a.slopeCritical;
      if (a.volMomentum != null) opts.volMomentumThreshold = a.volMomentum;
      if (a.reversalDeltaMin != null) opts.reversalDeltaMin = a.reversalDeltaMin;
      if (a.plateauTinySlope != null) opts.tinySlope = a.plateauTinySlope;
      if (a.smoothingHigh != null) opts.smoothingHigh = a.smoothingHigh;
      if (a.anomalyClusterK != null) opts.anomalyClusterK = a.anomalyClusterK;
      if (a.anomalyClusterCriticalK != null) opts.anomalyClusterCriticalK = a.anomalyClusterCriticalK;
    }
  const trend = await strategyTrendAnalyticsService.computeTrends({ window, anomalyThreshold: params.options?.anomalyThreshold, anomalyBaselineWindow: params.options?.anomalyBaselineWindow });
    const report: GovernanceReport = { window, generatedAt: new Date().toISOString(), strategies: {}, summary: { totalAlerts: 0, bySeverity: { info:0,warn:0,critical:0 } } };

    Object.entries(trend.strategies).forEach(([strat, m]) => {
      const alerts: RuleAlert[] = [];
      const metrics: TrendMetricsSubset = {
        lrSlope: m.lrSlope, simpleSlope: m.simpleSlope, deltaWeight: m.deltaWeight,
        volatilityMomentum: m.volatilityMomentum, smoothingReductionRatio: m.smoothingReductionRatio,
        anomalies: m.anomalies, sampleCount: m.sampleCount, deltaSpread: m.deltaSpread
      };
      const nowIso = new Date().toISOString();
      const sign = (x:number|null|undefined)=> x==null?0:(x>0?1:(x<0?-1:0));
      // R1 Trend Breakout
      if (m.sampleCount >= opts.minSamples && m.lrSlope != null && Math.abs(m.lrSlope) >= opts.slopeWarnThreshold) {
        const sev: 'warn'|'critical' = Math.abs(m.lrSlope) >= opts.slopeCriticalThreshold ? 'critical' : 'warn';
        alerts.push({ id: 'TrendBreakout', severity: sev, message: `Breakout slope=${m.lrSlope}`, rationale: { lrSlope: m.lrSlope, simpleSlope: m.simpleSlope, sampleCount: m.sampleCount, thresholds: { warn: opts.slopeWarnThreshold, critical: opts.slopeCriticalThreshold } }, timestamp: nowIso });
      }
      // R2 Volatility Surge
      if (m.volatilityMomentum != null && m.volatilityMomentum >= opts.volMomentumThreshold) {
        alerts.push({ id: 'VolatilitySurge', severity: 'warn', message: `Volatility momentum=${m.volatilityMomentum}`, rationale: { volatilityMomentum: m.volatilityMomentum, threshold: opts.volMomentumThreshold }, timestamp: nowIso });
      }
      // R3 Anomaly Cluster
      if (m.anomalies && m.anomalies.length) {
        const recent = m.anomalies.filter(a => a.index >= (m.sampleCount - opts.anomalyRecentWindow));
        if (recent.length >= opts.anomalyClusterK) {
          const sev: 'warn'|'critical' = recent.length >= opts.anomalyClusterCriticalK ? 'critical' : 'warn';
            alerts.push({ id: 'AnomalyCluster', severity: sev, message: `Anomaly cluster size=${recent.length}`, rationale: { recentSize: recent.length, window: opts.anomalyRecentWindow, thresholds: { k: opts.anomalyClusterK, critical: opts.anomalyClusterCriticalK } }, timestamp: nowIso });
        }
      }
      // R4 Stability Plateau
      if (m.sampleCount >= opts.minSamples && m.lrSlope != null && Math.abs(m.lrSlope) < opts.tinySlope && (m.smoothingReductionRatio ?? 0) >= opts.smoothingHigh && (m.volatilityMomentum ?? 0) <= opts.plateauVolMomentumCeil) {
        alerts.push({ id: 'StabilityPlateau', severity: 'info', message: `Plateau (lrSlope≈0)`, rationale: { lrSlope: m.lrSlope, smoothingReductionRatio: m.smoothingReductionRatio, volatilityMomentum: m.volatilityMomentum, thresholds: { tinySlope: opts.tinySlope, smoothingHigh: opts.smoothingHigh } }, timestamp: nowIso });
      }
      // R5 Reversal Risk
      if (m.lrSlope != null && sign(m.lrSlope) !== 0 && m.deltaWeight != null && sign(m.deltaWeight) !== 0 && sign(m.lrSlope) !== sign(m.deltaWeight) && Math.abs(m.deltaWeight) >= opts.reversalDeltaMin) {
        alerts.push({ id: 'ReversalRisk', severity: 'warn', message: `Reversal risk: slope=${m.lrSlope} deltaWeight=${m.deltaWeight}`, rationale: { lrSlope: m.lrSlope, deltaWeight: m.deltaWeight, thresholds: { reversalDeltaMin: opts.reversalDeltaMin } }, timestamp: nowIso });
      }
      report.strategies[strat] = { alerts, metrics };
      alerts.forEach(a => { report.summary.totalAlerts++; report.summary.bySeverity[a.severity]++; });
    });
    return report;
  }
};
// Wrapper with persistence shortcut
export async function evaluateGovernanceWithPersistence(params: Parameters<typeof strategyGovernanceService.evaluateGovernance>[0] & { options?: any }) {
  const report = await strategyGovernanceService.evaluateGovernance(params as any);
  if (params?.options?.persistAlerts) {
    strategyGovernanceAlertStore.persist({ report, context: params.options?.persistContext });
  }
  return report;
}

export async function _debugGovernance() {
  const r = await strategyGovernanceService.evaluateGovernance({});
  console.log('GovernanceReport', JSON.stringify(r, null, 2));
}
