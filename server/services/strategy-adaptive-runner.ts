// Iteration 28: Adaptive Runner Integration
// مسئول: حلقه زمان‌بندی شده برای جمع‌آوری متریک‌های حاکمیتی و اعمال تنظیم وزن‌ها
// لایه‌ها: Metrics Aggregation -> AdaptiveWeightTuningService -> Suppression Weight Injection -> Logging & Safeguards
// فرض‌های موقت (A1-A3) تا پیش از Persistence:
//  A1: ackRate & escalationEffectiveness در صورت نبود provider از defaults استفاده می‌شود.
//  A2: suspectedFalseRate فعلاً با تقریب falseSuppressionRate (یا provider) پر می‌شود.
//  A3: reNoiseRate غیرفعال (0) تا حلقه persistence/reenqueue آماده شود.

import { adaptiveWeightTuningService } from './strategy-adaptive-weight-tuning-service.js';
import { governanceAlertSuppressionService } from './strategy-governance-alert-suppression-service.js';
import { adaptivePersistenceService } from './strategy-adaptive-persistence-service.js';

export interface MetricsProviderResult {
  ackRate: number;
  escalationEffectiveness: number;
  falseSuppressionRate: number;
  suspectedFalseRate: number;
  reNoiseRate?: number;
  degraded?: boolean; // اگر fallback استفاده شده
}

export interface AdaptiveRunnerConfig {
  intervalMs: number;
  warmupCycles: number;
  providers?: Partial<MetricsProviders>;
  logLimit?: number;
  persistence?: { debounceCooldownEvery?: number };
}

export interface MetricsProviders {
  collectAggregated(): Promise<MetricsProviderResult>;
}

class DefaultMetricsProvider implements MetricsProviders {
  async collectAggregated(): Promise<MetricsProviderResult> {
    try {
      const sup = governanceAlertSuppressionService.getSuppressionMetrics();
      const falseSuppressionRate = sup.falseSuppressionRate || 0;
      // TODO: در آینده ackRate و escalationEffectiveness از لایه ack/escalation واقعی استخراج شود
      const ackRate = 0.72; // فرض موقت A1
      const escalationEffectiveness = 0.55; // فرض موقت A1
      // تقریب suspectedFalseRate: استفاده موقت از falseSuppressionRate (A2)
      const suspectedFalseRate = Math.min(0.95, falseSuppressionRate * 1.05);
      return { ackRate, escalationEffectiveness, falseSuppressionRate, suspectedFalseRate, reNoiseRate:0 };
    } catch (e) {
      // fallback defaults
      return { ackRate:0.7, escalationEffectiveness:0.5, falseSuppressionRate:0.08, suspectedFalseRate:0.12, reNoiseRate:0, degraded:true };
    }
  }
}

interface RunnerStateLogEntry {
  ts: number;
  cycle: number;
  metrics: MetricsProviderResult;
  result: any;
  appliedWeights?: any;
}

export class AdaptiveWeightsRunner {
  private cfg: AdaptiveRunnerConfig;
  private metricsProvider: MetricsProviders;
  private timer?: NodeJS.Timeout;
  private cycle = 0;
  private logs: RunnerStateLogEntry[] = [];
  private lastResult?: any;
  // Persistence integration state
  private lastWeightSaveCycle = 0;
  private lastSuppressionSaveCycle = 0;
  private cooldownDebounceCounter = 0;
  private disabledPersistence = false;
  private consecutivePersistenceFailures = 0;
  private dirtySuppression = false;
  private suppressionGroupCountBaseline = 0;
  private loadPerformed = false;
  private errorWindow: number[] = [];
  private failureRatio = 0;
  private hydrated = false;
  constructor(cfg: AdaptiveRunnerConfig){
    this.cfg = cfg;
    this.metricsProvider = cfg.providers?.collectAggregated ? { collectAggregated: cfg.providers.collectAggregated } : new DefaultMetricsProvider();
  }

  getStatus(){
    return {
      running: !!this.timer,
      cycle: this.cycle,
      lastResult: this.lastResult,
      logs: this.logs.slice(-10),
      currentWeights: adaptiveWeightTuningService.getCurrentWeights(),
      failureRatio: this.failureRatio,
      persistenceDisabled: this.disabledPersistence,
      hydrated: this.hydrated
    };
  }
  getLogs(limit:number=50){
    const lim = Math.min(200, Math.max(1, limit));
    return this.logs.slice(-lim);
  }
  getPersistenceWindow(){
    const size = this.errorWindow.length;
    const failures = this.errorWindow.reduce((s,v)=>s+v,0);
    return { size, failures, failureRatio: this.failureRatio, disabled: this.disabledPersistence };
  }

  private pushLog(entry: RunnerStateLogEntry){
    this.logs.push(entry);
    const limit = this.cfg.logLimit ?? 200;
    if (this.logs.length > limit) this.logs.splice(0, this.logs.length - limit);
  }

  // New awaited hydration start
  async startAsync(){
    if (this.timer) return;
    await this.performHydration();
    this.hydrated = true;
    this.start();
  }
  private async performHydration(){
    if (this.loadPerformed) return;
    this.loadPerformed = true;
    try {
      const res = await adaptivePersistenceService.loadWeights();
      if (res.ok && res.row) {
        const w = res.row;
        const weights = { w1:+w.w1, w2:+w.w2, w3:+w.w3, w4:+w.w4, w5:+w.w5 };
        const sum = Object.values(weights).reduce((s,v)=>s+v,0);
        if (sum>0) governanceAlertSuppressionService.setWeights(Object.fromEntries(Object.entries(weights).map(([k,v])=>[k, v/sum])) as any);
      }
    } catch {}
    try {
      const r = await adaptivePersistenceService.loadSuppressionStates();
      if (r.ok && r.rows?.length) {
        governanceAlertSuppressionService.hydrateFromSnapshots(r.rows.map((rr:any)=>({
          dedupGroup: rr.dedupGroup,
          state: rr.state,
          noiseScore: Number(rr.noiseScore),
          noiseScoreEnter: rr.noiseScoreEnter? Number(rr.noiseScoreEnter): undefined,
          noiseScoreExit: rr.noiseScoreExit? Number(rr.noiseScoreExit): undefined,
          suppressedCount: rr.suppressedCount,
          lastVolume: rr.lastVolume,
          severityScope: rr.severityScope,
          strategy: rr.strategy,
          lastStateChangeAt: rr.lastStateChangeAt,
          lastSuppressionStart: rr.lastSuppressionStart,
          consecutiveStable: rr.consecutiveStable,
          dynamicThresholds: rr.dynamicThresholds,
          robustHighStreak: rr.robustHighStreak
  })));
      }
    } catch {}
  }

  async runOnce(){
    this.cycle++;
    if (!this.hydrated && !this.loadPerformed) {
      await this.performHydration();
      this.hydrated = true;
    }
    const metrics = await this.metricsProvider.collectAggregated();
    // Warm-up phase: فقط ثبت تاریخچه برای adaptive بدون اعمال setWeights
    if (this.cycle <= this.cfg.warmupCycles) {
      const warmRes = adaptiveWeightTuningService.computeAdjustment(metrics); // الگوریتم داخلی safeguards دارد
      this.lastResult = { ...warmRes, reason: 'warmup' };
      this.pushLog({ ts: Date.now(), cycle: this.cycle, metrics, result: this.lastResult });
      return this.lastResult;
    }
    const res = adaptiveWeightTuningService.computeAdjustment(metrics);
    this.lastResult = res;
    let appliedWeights = undefined;
    if (res.adjusted && res.weights) {
      appliedWeights = governanceAlertSuppressionService.setWeights(res.weights);
    }
    this.pushLog({ ts: Date.now(), cycle: this.cycle, metrics, result: res, appliedWeights });

    // ---- Persistence Logic ----
    if (!this.disabledPersistence) {
      const reason = res.reason;
      const changedWeights = res.adjusted === true;
      const isFreeze = reason === 'freeze';
    const debounceEvery = this.cfg.persistence?.debounceCooldownEvery ?? 5; // default fallback
      // Debounce: if cooldown cycles accumulate without changes only save every 5 cycles
      if (reason === 'cooldown' && !changedWeights) this.cooldownDebounceCounter++; else this.cooldownDebounceCounter = 0;
      const shouldSaveWeights = changedWeights || isFreeze || (this.cooldownDebounceCounter >= debounceEvery && (this.cycle - this.lastWeightSaveCycle) >= debounceEvery);
      if (shouldSaveWeights) {
        adaptivePersistenceService.saveWeights({
          weights: res.weights || adaptiveWeightTuningService.getCurrentWeights(),
          reason: reason,
          cycle: this.cycle,
          lastAdjustmentCycle: res.adjusted? this.cycle : undefined,
          freezeActive: reason==='freeze',
          metricsSnapshot: metrics,
          meta: { errs: res.errs, skip: res.skip }
        }).then(r=>{
      this.recordPersistenceOutcome(!!r.ok);
      if (r.ok === true) {
            this.lastWeightSaveCycle = this.cycle;
          }
        }).catch(()=>{ this.recordPersistenceOutcome(false); });
      }

      // Suppression snapshots decision
      const currentGroups = governanceAlertSuppressionService.getAllGroupSnapshots();
      const suppressedCount = currentGroups.filter((g:any)=> g.state === 'SUPPRESSED').length;
      const deltaGroups = Math.abs(currentGroups.length - this.suppressionGroupCountBaseline);
      const significantSuppressionChange = suppressedCount >=3 && (deltaGroups >=3 || (this.suppressionGroupCountBaseline>0 && (deltaGroups/this.suppressionGroupCountBaseline) >=0.25));
      const cycleIntervalHit = (this.cycle - this.lastSuppressionSaveCycle) >= 10;
      if (significantSuppressionChange || cycleIntervalHit) {
        adaptivePersistenceService.saveSuppressionStates(currentGroups).then(r=>{
          this.recordPersistenceOutcome(!!r.ok);
          if (r.ok === true) {
            this.lastSuppressionSaveCycle = this.cycle;
            this.suppressionGroupCountBaseline = currentGroups.length;
          }
        }).catch(()=>{ this.recordPersistenceOutcome(false); });
      }
    }
    return { ...res, appliedWeights };
  }

  start(){
    if (this.timer) return;
    this.timer = setInterval(()=>{ this.runOnce().catch(err=>{
      this.pushLog({ ts: Date.now(), cycle: this.cycle, metrics:{ ackRate:0, escalationEffectiveness:0, falseSuppressionRate:0, suspectedFalseRate:0, reNoiseRate:0, degraded:true }, result:{ error: err?.message||'runOnce-failed' } });
    }); }, this.cfg.intervalMs);
  }

  stop(){
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
  }

  private recordPersistenceOutcome(ok:boolean){
    this.errorWindow.push(ok?0:1);
    if (this.errorWindow.length>50) this.errorWindow.splice(0, this.errorWindow.length-50);
    const size = this.errorWindow.length;
    const fails = this.errorWindow.reduce((s,v)=>s+v,0);
    this.failureRatio = size? fails/size : 0;
    if (!ok) {
      if (size>=10 && this.failureRatio >= 0.6) this.disabledPersistence = true;
    } else {
      // Hysteresis re-enable
      if (this.disabledPersistence && size>=10 && this.failureRatio < 0.2) this.disabledPersistence = false;
    }
  }
}

// Singleton runner (startable by server bootstrap)
export const adaptiveWeightsRunner = new AdaptiveWeightsRunner({ intervalMs: 60_000, warmupCycles: 2 });

// Optional demo without full server
if (process.env.RUN_ADAPTIVE_RUNNER_DEMO) {
  (async ()=>{
    console.log('[AdaptiveRunner] Demo start');
    for (let i=0;i<10;i++) {
      const r = await adaptiveWeightsRunner.runOnce();
      console.log('Cycle', i+1, r.reason, r.weights||'', r.errs || '', r.appliedWeights? r.appliedWeights.weights: '');
    }
    console.log('[AdaptiveRunner] Demo end');
  })();
}
