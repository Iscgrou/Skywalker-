// Iteration 28: Adaptive Weight Tuning Service (Skeleton)
// هدف: تنظیم پویا وزن‌های NoiseScore برای نزدیک کردن متریک‌های حاکمیتی به اهداف SLA بدون نوسان و overfit.
// -----------------------------------------------------------------------------
// Design Summary:
// Weights (initial): w1 (1-ackRate), w2 (suspectedFalseRate), w3 (volumeNorm), w4 (1-dedupRatio), w5 (escalationIneffectiveness)
// Adaptive layer adjusts these within [w_min, w_max] and renormalizes Σw=1.
// Metrics Inputs (Aggregated Window): ackRate, escalationEffectiveness, falseSuppressionRate, suspectedFalseRate, reNoiseRate (future placeholder)
// Targets:
//   ackRate >= T_ack (good when higher) => if below target increase weight on (1-ackRate)
//   escalationEffectiveness >= T_eff (good when higher) => if below target increase weight on escalationIneffectiveness
//   falseSuppressionRate <= T_false (good when lower) => if above target decrease weights that push suppression (e.g., suspectedFalse, (1-dedupRatio), volumeNorm) and increase weight on escalationIneffectiveness (safety)
//   suspectedFalseRate <= T_sFalse (good when lower) => if above, increase weight suspectedFalseRate to react faster (paradox accepted to penalize) or optionally shift to dedup component
//   reNoiseRate <= T_reNoise (future) => if above, increase persistence sensitivity (currently map to volumeNorm or (1-dedupRatio))
// Error Calculation:
//   For metric m with target T and direction dir (dir = -1 if higher is better, +1 if lower is better):
//      err = dir * (m - T)
//   deadband: if |err| < deadband ⇒ err=0
//   scaledAdj = k * err (k=adjustFactor)
//   clamp per component: |Δw_i| <= maxDelta
// Drift Guard:
//   Aggregate L1 drift in one cycle = Σ|Δw_i| ≤ maxCycleDrift → if exceeded scale all Δ proportionally.
// Cooldown:
//   After any non-zero adjustment, enforce cooldownCycles before next adjustments (unless severeDeviation > severeThreshold).
// Outlier Skip:
//   If a metric classified as outlier via median+MAD over history (|v - median| > outlierMadK * MAD) skip its adjustment this cycle.
// History:
//   Keep last H cycles of metrics for outlier assessment and convergence tracking.
// Convergence Metric:
//   adaptationConvergence = mean(|err_i|) over last convWindow cycles. If below convThreshold for stableCycles ⇒ freeze adjustments.
// Logging:
//   Each adjustment push log entry { ts, old, proposed, applied, metrics, errVector }.
// -----------------------------------------------------------------------------

export interface AdaptiveWeightMetricsSnapshot {
  ackRate: number; // [0,1]
  escalationEffectiveness: number; // [0,1]
  falseSuppressionRate: number; // [0,1]
  suspectedFalseRate: number; // [0,1]
  reNoiseRate?: number; // optional future
}

export interface AdaptiveWeightConfig {
  initial: { w1:number; w2:number; w3:number; w4:number; w5:number };
  min: number;
  max: number;
  adjustFactor: number; // k
  maxDelta: number; // per weight delta cap
  deadband: number;
  cooldownCycles: number;
  maxCycleDrift: number; // L1 drift cap
  targets: { ackRate:number; escalationEffectiveness:number; falseSuppressionRate:number; suspectedFalseRate:number; reNoiseRate:number };
  outlierMadK: number; // چند برابر MAD برای پرچم outlier
  historySize: number;
  convergenceWindow: number;
  convergenceThreshold: number; // میانگین |err| زیر این ⇒ candidate freeze
  stableFreezeCycles: number; // چند چرخه زیر آستانه برای freeze
  severeDeviationThreshold: number; // اگر |err| > این ⇒ نادیده گرفتن cooldown
  minFreezeHoldCycles: number; // قفل موقت پس از freeze
}

export interface AdaptiveWeightsState {
  weights: { w1:number; w2:number; w3:number; w4:number; w5:number };
  lastAdjustmentCycle: number;
  cycle: number;
  history: { metrics: AdaptiveWeightMetricsSnapshot; errors: Record<string, number> }[];
  freezeActive?: boolean;
  freezeSinceCycle?: number;
  logs: any[];
  lastSevereAdjustmentCycle?: number; // آخرین چرخه‌ای که به دلیل انحراف شدید اجازه بایپس cooldown داده شد
  consecutiveZeroErrorCycles?: number; // شمار چرخه‌های متوالی که همه خطاها صفر (بعد از deadband) بوده است
}

export class AdaptiveWeightTuningService {
  private cfg: AdaptiveWeightConfig;
  private st: AdaptiveWeightsState;
  constructor(cfg: AdaptiveWeightConfig){
    this.cfg = cfg;
    this.st = { weights: { ...cfg.initial }, lastAdjustmentCycle: -Infinity, cycle:0, history:[], logs:[] };
  }

  getCurrentWeights(){ return { ...this.st.weights }; }

  private normalize(weights: { w1:number; w2:number; w3:number; w4:number; w5:number }){
    const sum = Object.values(weights).reduce((s,x)=>s+x,0) || 1;
    const norm = Object.fromEntries(Object.entries(weights).map(([k,v])=>[k, v/sum]));
    return norm as typeof weights;
  }

  private clampAll(weights: { w1:number; w2:number; w3:number; w4:number; w5:number }){
    const c = { ...weights };
    for (const k of Object.keys(c)) {
      c[k as keyof typeof c] = Math.min(this.cfg.max, Math.max(this.cfg.min, c[k as keyof typeof c]));
    }
    return c;
  }

  private detectOutliers(metricSeries: number[]): { median:number; mad:number; isOutlier:(v:number)=>boolean } {
    if (!metricSeries.length) return { median:0, mad:0, isOutlier:()=>false };
    const sorted=[...metricSeries].sort((a,b)=>a-b); const mid=Math.floor(sorted.length/2);
    const median = sorted.length%2? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
    const deviations = sorted.map(v=>Math.abs(v-median)).sort((a,b)=>a-b);
    const midD = Math.floor(deviations.length/2);
    const mad = deviations.length%2? deviations[midD] : (deviations[midD-1]+deviations[midD])/2;
    const adjMad = Math.max(mad, 1e-6);
    return { median, mad:adjMad, isOutlier:(v:number)=> Math.abs(v-median) > this.cfg.outlierMadK * adjMad };
  }

  computeAdjustment(metrics: AdaptiveWeightMetricsSnapshot){
    this.st.cycle++;
    const { targets, deadband, adjustFactor, maxDelta, cooldownCycles, maxCycleDrift, severeDeviationThreshold } = this.cfg;

    // Build error directions
    // higher good ⇒ direction = -1 (اگر کمتر از هدف باشد err منفی می‌شود ⇒ Δ مثبت)
    const dir = {
      ackRate: -1,
      escalationEffectiveness: -1,
      falseSuppressionRate: +1,
      suspectedFalseRate: +1,
      reNoiseRate: +1
    };

    // Extract history arrays for outlier detection
    const hAck = this.st.history.map(h=>h.metrics.ackRate);
    const hEsc = this.st.history.map(h=>h.metrics.escalationEffectiveness);
    const hFalse = this.st.history.map(h=>h.metrics.falseSuppressionRate);
    const hSus = this.st.history.map(h=>h.metrics.suspectedFalseRate);
    const hRe = this.st.history.map(h=>h.metrics.reNoiseRate || 0);

    const outAck = this.detectOutliers(hAck); const outEsc = this.detectOutliers(hEsc);
    const outFalse = this.detectOutliers(hFalse); const outSus = this.detectOutliers(hSus); const outRe = this.detectOutliers(hRe);

    const errs: Record<string, number> = {};
    function computeErr(name: keyof AdaptiveWeightMetricsSnapshot & string, val:number, tgt:number, direction:number){
      const raw = direction * (val - tgt);
      return Math.abs(raw) < deadband ? 0 : raw;
    }

    errs.ackRate = computeErr('ackRate', metrics.ackRate, targets.ackRate, dir.ackRate);
    errs.escalationEffectiveness = computeErr('escalationEffectiveness', metrics.escalationEffectiveness, targets.escalationEffectiveness, dir.escalationEffectiveness);
    errs.falseSuppressionRate = computeErr('falseSuppressionRate', metrics.falseSuppressionRate, targets.falseSuppressionRate, dir.falseSuppressionRate);
    errs.suspectedFalseRate = computeErr('suspectedFalseRate', metrics.suspectedFalseRate, targets.suspectedFalseRate, dir.suspectedFalseRate);
    errs.reNoiseRate = computeErr('reNoiseRate', metrics.reNoiseRate||0, targets.reNoiseRate, dir.reNoiseRate);

    // Track consecutive zero-error cycles
    const allZeroErr = Object.values(errs).every(e=> e === 0);
    if (allZeroErr) this.st.consecutiveZeroErrorCycles = (this.st.consecutiveZeroErrorCycles||0) + 1;
    else this.st.consecutiveZeroErrorCycles = 0;

    // Early deterministic freeze gate: اگر تعداد چرخه‌های بدون خطا به حد آستانه برسد
    if (!this.st.freezeActive && (this.st.consecutiveZeroErrorCycles||0) >= this.cfg.stableFreezeCycles) {
      this.recordHistory(metrics, errs);
      this.st.freezeActive = true; this.st.freezeSinceCycle = this.st.cycle;
      return { adjusted:false, reason:'freeze', weights: this.getCurrentWeights(), errs };
    }

    let severeDeviation = Object.values(errs).some(e=>Math.abs(e) > severeDeviationThreshold);
    // جلوگیری از بایپس متوالی: اگر چرخه قبلی نیز severe بود و adjustment انجام شده، این بار severe را نادیده بگیر تا cooldown اعمال شود
    if (severeDeviation && this.st.lastSevereAdjustmentCycle !== undefined && (this.st.cycle - this.st.lastSevereAdjustmentCycle) === 1) {
      severeDeviation = false; // enforce cooldown this cycle
    }

    // Freeze logic
    if (this.st.freezeActive) {
      if (this.st.freezeSinceCycle !== undefined && (this.st.cycle - this.st.freezeSinceCycle) >= this.cfg.minFreezeHoldCycles) {
        // evaluate convergence exit
        const recent = this.st.history.slice(-this.cfg.convergenceWindow);
        const meanAbsErr = recent.length? recent.reduce((s,h)=> s + (Object.values(h.errors).reduce((ss,ee)=>ss+Math.abs(ee),0)/Object.values(h.errors).length),0)/recent.length : Infinity;
        if (meanAbsErr > this.cfg.convergenceThreshold) {
          this.st.freezeActive = false; this.st.freezeSinceCycle = undefined;
        }
      }
    }

    if (this.st.freezeActive) {
      this.recordHistory(metrics, errs);
      return { adjusted:false, reason:'freeze', weights: this.getCurrentWeights(), errs };
    }

    // Cooldown check (must occur BEFORE building deltas) – skip if severe deviation triggers override
    const cyclesSinceAdj = this.st.cycle - this.st.lastAdjustmentCycle;
  if (!severeDeviation && cyclesSinceAdj < cooldownCycles) {
      this.recordHistory(metrics, errs);
      // NEW: Convergence check even during cooldown to allow freeze بدون نیاز به adjustment اجباری
      const recent = this.st.history.slice(-this.cfg.convergenceWindow);
      if (recent.length >= this.cfg.convergenceWindow) {
        const meanAbsErr = recent.reduce((s,h)=> s + (Object.values(h.errors).reduce((ss,ee)=>ss+Math.abs(ee),0)/Object.values(h.errors).length),0)/recent.length;
        if (meanAbsErr <= this.cfg.convergenceThreshold) {
          const allBelow = recent.slice(-this.cfg.stableFreezeCycles).length>=this.cfg.stableFreezeCycles && recent.slice(-this.cfg.stableFreezeCycles).every(h=>{
            const localMean = Object.values(h.errors).reduce((ss,ee)=>ss+Math.abs(ee),0)/Object.values(h.errors).length;
            return localMean <= this.cfg.convergenceThreshold;
          });
          if (allBelow) {
            this.st.freezeActive = true; this.st.freezeSinceCycle = this.st.cycle;
            return { adjusted:false, reason:'freeze', weights: this.getCurrentWeights(), errs };
          }
        }
      }
      return { adjusted:false, reason:'cooldown', weights: this.getCurrentWeights(), errs };
    }

    // Determine which metrics are outliers (skip adjustments from them)
    const skip = {
      ackRate: outAck.isOutlier(metrics.ackRate),
      escalationEffectiveness: outEsc.isOutlier(metrics.escalationEffectiveness),
      falseSuppressionRate: outFalse.isOutlier(metrics.falseSuppressionRate),
      suspectedFalseRate: outSus.isOutlier(metrics.suspectedFalseRate),
      reNoiseRate: outRe.isOutlier(metrics.reNoiseRate||0)
    };

    // Map errors to weight deltas
    // Mapping strategy:
    //  ackRate err -> w1 (1-ackRate)
    //  suspectedFalseRate err -> w2
    //  volume not directly controlled here (w3 reserved for volumeNorm neutrality; small balancing via falseSuppressionRate err)
    //  dedup (w4) influenced by falseSuppressionRate err and suspectedFalseRate err (shared risk)
    //  escalationEffectiveness err -> w5 (escalationIneffectiveness)
    //  falseSuppressionRate err positive -> reduce w2,w3,w4 proportionally and increase w5

    const deltas: Record<string, number> = { w1:0,w2:0,w3:0,w4:0,w5:0 };

    const apply = (key:string, err:number)=>{
      if (err===0) return;
      const raw = adjustFactor * err; // err sign drives direction
      deltas[key] += Math.max(-maxDelta, Math.min(maxDelta, raw));
    };

    if (!skip.ackRate) apply('w1', errs.ackRate);
    if (!skip.suspectedFalseRate) apply('w2', errs.suspectedFalseRate);
    if (!skip.escalationEffectiveness) apply('w5', errs.escalationEffectiveness);

    if (!skip.falseSuppressionRate && errs.falseSuppressionRate !==0) {
      const fsErr = errs.falseSuppressionRate; // positive means metric>target (bad)
      // Reduce noise-driving weights w2,w3,w4 and slightly boost w5
      const reduce = adjustFactor * fsErr;
      deltas.w2 -= Math.max(-maxDelta, Math.min(maxDelta, reduce*0.5));
      deltas.w3 -= Math.max(-maxDelta, Math.min(maxDelta, reduce*0.2));
      deltas.w4 -= Math.max(-maxDelta, Math.min(maxDelta, reduce*0.3));
      deltas.w5 += Math.max(-maxDelta, Math.min(maxDelta, reduce*0.4));
    }

    // Optional: distribute suspectedFalseRate err partially to w4 for dedup sensitivity
    if (!skip.suspectedFalseRate && errs.suspectedFalseRate>0) {
      deltas.w4 += Math.max(-maxDelta, Math.min(maxDelta, adjustFactor * errs.suspectedFalseRate * 0.2));
    }

    // Combine and enforce per-cycle L1 drift cap
    const l1 = Object.values(deltas).reduce((s,x)=>s+Math.abs(x),0);
    if (l1 > maxCycleDrift && l1>0) {
      const scale = maxCycleDrift / l1;
      for (const k of Object.keys(deltas)) deltas[k] *= scale;
    }

    // Early freeze detection when no change needed (all deltas zero) و خطاها در آستانه همگرایی
    if (l1 === 0) {
      type HistLike = { errors: Record<string, number> };
      const recent: HistLike[] = [...this.st.history.slice(-this.cfg.convergenceWindow) as any, { errors: errs }];
      if (recent.length >= this.cfg.stableFreezeCycles) {
        const meanAbsErr = recent.reduce((s:number,h:HistLike)=> {
          const vals = Object.values(h.errors) as number[];
          const local = vals.reduce((ss,ee)=> ss + Math.abs(ee), 0) / (vals.length || 1);
          return s + local;
        },0)/recent.length;
        if (meanAbsErr <= this.cfg.convergenceThreshold) {
          const lastSlice = recent.slice(-this.cfg.stableFreezeCycles);
          const allBelow = lastSlice.every(h=> {
            const vals = Object.values(h.errors) as number[];
            const localMean = vals.reduce((ss,ee)=> ss + Math.abs(ee),0)/(vals.length||1);
            return localMean <= this.cfg.convergenceThreshold;
          });
          if (allBelow) {
            this.st.freezeActive = true; this.st.freezeSinceCycle = this.st.cycle;
            this.recordHistory(metrics, errs);
            return { adjusted:false, reason:'freeze', weights: this.getCurrentWeights(), errs };
          }
        }
      }
    }

    // Apply deltas
    const old = { ...this.st.weights };
    const proposed = { ...old } as any;
    for (const k of Object.keys(proposed)) proposed[k] += deltas[k];

    // Clamp & normalize
    const clamped = this.clampAll(proposed);
    const normalized = this.normalize(clamped);

    // Convergence detection (post-apply)
    this.st.lastAdjustmentCycle = this.st.cycle;
    if (Object.values(errs).some(e=>Math.abs(e) > severeDeviationThreshold)) {
      this.st.lastSevereAdjustmentCycle = this.st.cycle;
    }
    this.st.weights = normalized;

    this.recordHistory(metrics, errs);

    // Check convergence to maybe activate freeze next cycles
    const recent = this.st.history.slice(-this.cfg.convergenceWindow);
    const meanAbsErr = recent.length? recent.reduce((s,h)=> s + (Object.values(h.errors).reduce((ss,ee)=>ss+Math.abs(ee),0)/Object.values(h.errors).length),0)/recent.length : Infinity;
    if (meanAbsErr <= this.cfg.convergenceThreshold) {
      const allBelow = recent.length>=this.cfg.stableFreezeCycles && recent.every(h=>{
        const localMean = Object.values(h.errors).reduce((ss,ee)=>ss+Math.abs(ee),0)/Object.values(h.errors).length;
        return localMean <= this.cfg.convergenceThreshold;
      });
      if (allBelow) {
        this.st.freezeActive = true; this.st.freezeSinceCycle = this.st.cycle;
      }
    }

    this.st.logs.push({ ts: Date.now(), old, deltas, proposed, applied: normalized, metrics, errs, skip });

    return { adjusted:true, weights: normalized, deltas, errs, skip, reason:'applied' };
  }

  private recordHistory(metrics: AdaptiveWeightMetricsSnapshot, errors: Record<string,number>) {
    this.st.history.push({ metrics, errors });
    if (this.st.history.length > this.cfg.historySize) this.st.history.splice(0, this.st.history.length - this.cfg.historySize);
  }

  getLogs(){ return this.st.logs.slice(); }

  // Iteration 29: Restore state from persistence (weights + freeze flags)
  restorePersistence(row: { w1:number; w2:number; w3:number; w4:number; w5:number; freezeActive?:boolean; freezeSinceCycle?:number; lastAdjustmentCycle?:number; cycle?:number; consecutiveZeroErrorCycles?:number }) {
    if (!row) return;
    const weights: { [k:string]: number } = { w1: +row.w1, w2:+row.w2, w3:+row.w3, w4:+row.w4, w5:+row.w5 };
    const sum = (Object.values(weights) as number[]).reduce((s,v)=>s+v,0) || 1;
    for (const k of Object.keys(weights)) {
      const val = weights[k];
      weights[k] = typeof val === 'number' && isFinite(val) ? val / sum : 0;
    }
  this.st.weights = weights as { w1:number; w2:number; w3:number; w4:number; w5:number };
    if (row.freezeActive) { this.st.freezeActive = true; this.st.freezeSinceCycle = row.freezeSinceCycle ?? 0; }
    if (typeof row.lastAdjustmentCycle === 'number') this.st.lastAdjustmentCycle = row.lastAdjustmentCycle;
    if (typeof row.cycle === 'number') this.st.cycle = row.cycle;
    if (typeof row.consecutiveZeroErrorCycles === 'number') this.st.consecutiveZeroErrorCycles = row.consecutiveZeroErrorCycles;
    this.st.logs.push({ ts:Date.now(), restore:true, weights: { ...this.st.weights }, freeze:this.st.freezeActive });
  }
}

export const adaptiveWeightTuningService = new AdaptiveWeightTuningService({
  initial: { w1:0.3, w2:0.25, w3:0.15, w4:0.15, w5:0.15 },
  min: 0.05,
  max: 0.6,
  adjustFactor: 0.2,
  maxDelta: 0.05,
  deadband: 0.03,
  cooldownCycles: 3,
  maxCycleDrift: 0.15,
  targets: { ackRate:0.85, escalationEffectiveness:0.7, falseSuppressionRate:0.10, suspectedFalseRate:0.15, reNoiseRate:0.20 },
  outlierMadK: 4,
  historySize: 60,
  convergenceWindow: 6,
  convergenceThreshold: 0.015,
  stableFreezeCycles: 6,
  severeDeviationThreshold: 0.12,
  minFreezeHoldCycles: 10
});
