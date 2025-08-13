// Iteration 26: Adaptive Suppression Service (V1 Skeleton)
// مسئول: ارزیابی امتیاز نویز و اعمال حالت suppression (Mode B: Mute Flag)
// NOTE: V1 فقط حافظه؛ در صورت وجود DATABASE_URL بعدا مسیر DB افزوده می‌شود.

interface SuppressionConfig {
  evalIntervalMs: number;
  hysteresis: { high: number; low: number };
  minSamples: number;
  minVolume: number; // V_min
  stableRecoveryWindows: number; // R_stableWindow (number of consecutive eval cycles)
  recoveryAckRateJump: number; // AckRecoveryThreshold jump after exit for false suppression detection
  weights: { w1:number; w2:number; w3:number; w4:number; w5:number }; // (1-ackRate), suspectedFalseRate, volumeNorm, (1-dedupRatio), escalationIneffectiveness
  escalationEffectivenessBlockThreshold: number; // اگر effectiveness >= این مقدار بلوک suppression
  allowSuppressCritical?: boolean; // پیش فرض false (critical بلوک شود)
  // Iteration 27 (Robust Mode Config additions)
  robust?: {
    enabled: boolean;
    historySize: number; // N
    minSamplesForRobust: number; // حداقل نمونه برای فعال شدن median+MAD
    kHigh: number; // ضریب بالا
    kLow: number;  // ضریب پایین
    epsilonMad: number; // حداقل MAD برای اجتناب از تقسیم بر صفر
  // Iteration 27 enhancement: حداقل عبورهای متوالی زمانی که dynHigh کمتر از staticHigh است
  minConsecutiveAboveHigh?: number; // اگر dynHigh < staticHigh ⇒ نیاز به این تعداد عبور متوالی قبل از ورود به suppression
  };
}

export type SuppressionState = 'ACTIVE' | 'CANDIDATE' | 'SUPPRESSED' | 'MONITORING';

interface GroupRuntimeState {
  dedupGroup: string;
  strategy?: string;
  severityScope?: string; // track dominant severity or scope string (critical|high|warn|info)
  state: SuppressionState;
  noiseScore: number;
  noiseScoreEnter?: number;
  noiseScoreExit?: number;
  suppressedCount: number;
  startedAt?: Date;
  recoveredAt?: Date;
  lastEvalAt?: Date;
  consecutiveStable: number;
  lastVolume: number;
  metricsSnapshot?: any; // store last composite metrics for debugging
  // Tracking for metrics
  suppressionDurations: number[]; // ms durations of completed suppression windows
  lastSuppressionStart?: Date;
  lastAckRateInside?: number[]; // collect ackRates during suppression
  lastAckRateAfterExit?: number[]; // ackRates post exit (for false suppression detection)
  lastStateChangeAt?: Date;
  // Iteration 27: Rolling history برای ساخت thresholds پویا
  history?: {
    ackRate: number[];
    suspectedFalseRate: number[];
    volume: number[];
    dedupRatio: number[];
    escalationIneff: number[];
    noiseScoreRaw: number[]; // history از امتیاز خام جهت median/MAD
    outlierClampedCount: number;
  };
  dynamicThresholds?: { high?: number; low?: number; noiseMedian?: number; noiseMad?: number; };
  // Robust gating streak counter (Iteration 27)
  robustHighStreak?: number; // شمار عبورهای متوالی از effHigh وقتی dynHigh پایین‌تر از staticHigh است
}

export class GovernanceAlertSuppressionService {
  private cfg: SuppressionConfig;
  private groups: Map<string, GroupRuntimeState> = new Map();
  private testSignals: Map<string, any[]> = new Map();
  private metrics: { falseSuppressCount:number; suppressExitCount:number; totalSuppressedVolume:number; totalOriginalVolume:number } = { falseSuppressCount:0, suppressExitCount:0, totalSuppressedVolume:0, totalOriginalVolume:0 };
  constructor(cfg: SuppressionConfig){ this.cfg = cfg; }

  // Iteration 28: Runtime weight update (Adaptive Weight Tuning integration)
  setWeights(newW: Partial<{ w1:number; w2:number; w3:number; w4:number; w5:number }>) {
    const cur = this.cfg.weights;
    const merged = { ...cur, ...newW } as { w1:number; w2:number; w3:number; w4:number; w5:number };
    // sanitize: clamp to [0.0001, 1]
    for (const k of Object.keys(merged)) {
      // @ts-ignore
      merged[k] = Math.min(1, Math.max(0.0001, merged[k]));
    }
    // normalize sum to 1 for stability
    const sum = merged.w1 + merged.w2 + merged.w3 + merged.w4 + merged.w5;
    if (sum > 0) {
      merged.w1 /= sum; merged.w2 /= sum; merged.w3 /= sum; merged.w4 /= sum; merged.w5 /= sum;
    }
    this.cfg.weights = merged;
    return { updated:true, weights: { ...merged } };
  }

  // تزریق سیگنال تست برای هارنس
  setTestSignals(dedupGroup: string, seq: any[]) { this.testSignals.set(dedupGroup, [...seq]); }
  setGroupMeta(dedupGroup: string, meta: { severityScope?: string; strategy?: string }) {
    let g = this.groups.get(dedupGroup);
    if (!g) {
      g = { dedupGroup, state:'ACTIVE', noiseScore:0, suppressedCount:0, consecutiveStable:0, lastVolume:0, suppressionDurations:[], lastAckRateInside:[], lastAckRateAfterExit:[], metricsSnapshot:null } as GroupRuntimeState;
      this.groups.set(dedupGroup, g);
    }
    if (meta.severityScope) g.severityScope = meta.severityScope;
    if (meta.strategy) g.strategy = meta.strategy;
  }
  resetAll() { this.groups.clear(); this.testSignals.clear(); this.metrics = { falseSuppressCount:0, suppressExitCount:0, totalSuppressedVolume:0, totalOriginalVolume:0 }; }

  // fetchSignals: ابتدا از صف تست، سپس placeholder واقعی
  private async fetchSignals(dedupGroup: string): Promise<{ ackRate:number; suspectedFalseRate:number; volume:number; dedupRatio:number; escalationEffectiveness:number; escalationIneffectiveness:number; severity?:string }>{
    const q = this.testSignals.get(dedupGroup);
    if (q && q.length) {
      const pop = q.shift();
      // normalize & clamp
      const norm = (v:number, lo=0, hi=1)=> Math.min(hi, Math.max(lo, v));
      return {
        ackRate: norm(pop.ackRate ?? 0),
        suspectedFalseRate: norm(pop.suspectedFalseRate ?? 0),
        volume: Math.max(0, pop.volume ?? 0),
        dedupRatio: norm(pop.dedupRatio ?? 1),
        escalationEffectiveness: norm(pop.escalationEffectiveness ?? 0),
        escalationIneffectiveness: norm(1 - (pop.escalationEffectiveness ?? 0)),
        severity: pop.severity
      };
    }
    return { ackRate: 0.2, suspectedFalseRate: 0.4, volume: 20, dedupRatio: 0.8, escalationEffectiveness: 0.3, escalationIneffectiveness: 0.7 };
  }

  private computeVolumeNorm(volume: number): number {
    // Basic min-max normalization placeholder; future: dynamic window-based
    const maxRef = Math.max(volume, this.cfg.minVolume * 5, 1);
    return Math.min(1, volume / maxRef);
  }

  private computeNoiseScore(sig: { ackRate:number; suspectedFalseRate:number; volume:number; dedupRatio:number; escalationIneffectiveness:number; }): number {
    const vNorm = this.computeVolumeNorm(sig.volume);
    const { w1,w2,w3,w4,w5 } = this.cfg.weights;
    const raw = w1*(1 - sig.ackRate) + w2*sig.suspectedFalseRate + w3*vNorm + w4*(1 - sig.dedupRatio) + w5*sig.escalationIneffectiveness;
    return +Math.min(1, Math.max(0, raw)).toFixed(4);
  }

  // Iteration 27 helper: push value into rolling array respecting historySize
  private pushHistory(arr: number[] | undefined, val: number, max: number): number[] {
    if (!arr) return [val];
    arr.push(val);
    if (arr.length > max) arr.splice(0, arr.length - max);
    return arr;
  }

  private computeMedianMad(values: number[]): { median:number; mad:number } {
    if (!values.length) return { median:0, mad:0 };
    const sorted=[...values].sort((a,b)=>a-b);
    const mid=Math.floor(sorted.length/2);
    const median = sorted.length%2? sorted[mid] : (sorted[mid-1]+sorted[mid])/2;
    const deviations = sorted.map(v=> Math.abs(v - median));
    const dSorted = deviations.sort((a,b)=>a-b);
    const midD = Math.floor(dSorted.length/2);
    const mad = dSorted.length%2? dSorted[midD] : (dSorted[midD-1]+dSorted[midD])/2;
    return { median, mad };
  }

  private transition(group: GroupRuntimeState, next: SuppressionState, reason: string){
    const prev = group.state;
    const now = new Date();
    if (prev === next) return { prev, next, reason:'noop' };
    // Track previous suppression start for duration
    let durationMs: number | undefined;
    if (prev === 'SUPPRESSED' && group.lastSuppressionStart) {
      durationMs = now.getTime() - group.lastSuppressionStart.getTime();
    }
    if (next === 'SUPPRESSED') {
      group.lastSuppressionStart = now;
      group.noiseScoreEnter = group.noiseScore;
      group.lastAckRateInside = [];
      // reentry check (reNoise candidate) – compare with recoveredAt timestamp
      if (group.recoveredAt) {
        const reMs = now.getTime() - group.recoveredAt.getTime();
        (this as any)._recentReentries = (this as any)._recentReentries || [];
        (this as any)._recentReentries.push({ dedupGroup: group.dedupGroup, reMs, at: now });
      }
    }
    if (prev === 'SUPPRESSED' && next !== 'SUPPRESSED') {
      group.recoveredAt = now;
      group.noiseScoreExit = group.noiseScore;
      if (group.lastSuppressionStart) {
        const dur = now.getTime() - group.lastSuppressionStart.getTime();
        group.suppressionDurations.push(dur);
        this.metrics.suppressExitCount++;
        (this as any)._recentExits = (this as any)._recentExits || [];
        (this as any)._recentExits.push({ dedupGroup: group.dedupGroup, at: now });
      }
      // false suppression detection: ackRateJump
      if (group.lastAckRateInside && group.lastAckRateInside.length) {
        const insideAvg = group.lastAckRateInside.reduce((s,x)=>s+x,0)/group.lastAckRateInside.length;
        if (group.lastAckRateAfterExit && group.lastAckRateAfterExit.length) {
          const afterAvg = group.lastAckRateAfterExit.reduce((s,x)=>s+x,0)/group.lastAckRateAfterExit.length;
          if ((afterAvg - insideAvg) >= this.cfg.recoveryAckRateJump) this.metrics.falseSuppressCount++;
        }
      }
      group.lastAckRateAfterExit = [];
    }
    // Additional detection when completing recovery (MONITORING -> ACTIVE)
    if (prev === 'MONITORING' && next === 'ACTIVE' && group.lastSuppressionStart) {
      if (group.lastAckRateInside && group.lastAckRateInside.length && group.lastAckRateAfterExit && group.lastAckRateAfterExit.length) {
        const insideAvg = group.lastAckRateInside.reduce((s,x)=>s+x,0)/group.lastAckRateInside.length;
        const afterAvg = group.lastAckRateAfterExit.reduce((s,x)=>s+x,0)/group.lastAckRateAfterExit.length;
        if ((afterAvg - insideAvg) >= this.cfg.recoveryAckRateJump) this.metrics.falseSuppressCount++;
      }
      group.lastAckRateAfterExit = [];
      group.lastSuppressionStart = undefined;
    }
    group.state = next;
    group.lastStateChangeAt = now;
    group.lastEvalAt = now;
    // Append to in-memory history buffer for future persistence layer hook (Iteration 30 persistence phase)
    (this as any)._transitions = (this as any)._transitions || [];
    (this as any)._transitions.push({ dedupGroup: group.dedupGroup, prevState: prev, newState: next, changedAt: now, durationMs, noiseScoreEnter: group.noiseScoreEnter, noiseScoreExit: group.noiseScoreExit });
    // Trim buffers
    const buf = (this as any)._transitions; if (buf.length>500) buf.splice(0, buf.length-500);
    const exits = (this as any)._recentExits; if (exits && exits.length>300) exits.splice(0, exits.length-300);
    const reentries = (this as any)._recentReentries; if (reentries && reentries.length>300) reentries.splice(0, reentries.length-300);
    return { prev, next, reason };
  }

  async evaluateSuppressionWindow(dedupGroups: string[]) {
    const results: any[] = [];
    const startBatch = Date.now();
    for (const g of dedupGroups) {
      let st = this.groups.get(g);
      if (!st) { st = { dedupGroup: g, state: 'ACTIVE', noiseScore: 0, suppressedCount:0, consecutiveStable:0, lastVolume:0, suppressionDurations:[], lastAckRateInside:[], lastAckRateAfterExit:[], metricsSnapshot:null } as GroupRuntimeState; this.groups.set(g, st); }
      const signals = await this.fetchSignals(g);
      if (signals.severity && !st.severityScope) st.severityScope = signals.severity;
      const noiseRaw = this.computeNoiseScore({ ackRate: signals.ackRate, suspectedFalseRate: signals.suspectedFalseRate, volume: signals.volume, dedupRatio: signals.dedupRatio, escalationIneffectiveness: signals.escalationIneffectiveness });
      // Initialize history if needed
      const rCfg = this.cfg.robust;
      if (!st.history && rCfg) {
        st.history = { ackRate:[], suspectedFalseRate:[], volume:[], dedupRatio:[], escalationIneff:[], noiseScoreRaw:[], outlierClampedCount:0 };
      }
      if (st.history && rCfg) {
        const hs = rCfg.historySize;
        st.history.ackRate = this.pushHistory(st.history.ackRate, signals.ackRate, hs);
        st.history.suspectedFalseRate = this.pushHistory(st.history.suspectedFalseRate, signals.suspectedFalseRate, hs);
        st.history.volume = this.pushHistory(st.history.volume, signals.volume, hs);
        st.history.dedupRatio = this.pushHistory(st.history.dedupRatio, signals.dedupRatio, hs);
        st.history.escalationIneff = this.pushHistory(st.history.escalationIneff, signals.escalationIneffectiveness, hs);
        st.history.noiseScoreRaw = this.pushHistory(st.history.noiseScoreRaw, noiseRaw, hs);
        // Compute dynamic thresholds only if enough samples
        if (st.history.noiseScoreRaw.length >= (rCfg.minSamplesForRobust||0) && rCfg.enabled) {
          const { median, mad } = this.computeMedianMad(st.history.noiseScoreRaw);
          const adjMad = Math.max(mad, rCfg.epsilonMad);
            let candidateHigh = Math.min(1, Math.max(0, median + rCfg.kHigh * adjMad));
            let candidateLow = Math.min(1, Math.max(0, median + rCfg.kLow * adjMad));
            const staticHigh = this.cfg.hysteresis.high; const staticLow = this.cfg.hysteresis.low;
            // Drift detection: اگر آخرین 4 نمونه noiseScoreRaw روند صعودی داشته باشد آستانه را اجازه می‌دهیم نزدیک‌تر بماند به candidateHigh
            let driftUp=false;
            if (st.history?.noiseScoreRaw.length>=5) {
              const last5 = st.history.noiseScoreRaw.slice(-5);
              driftUp = last5.every((v,i,arr)=> i===0 || v>=arr[i-1]);
            }
            // Blend: اگر driftUp true ⇒ highDyn = max(candidateHigh, staticHigh*0.7) وگرنه جلوگیری از افت شدید: max(candidateHigh, staticHigh*0.85)
            let highDyn = driftUp ? Math.max(candidateHigh, staticHigh*0.7) : Math.max(candidateHigh, staticHigh*0.85);
            let lowDyn = candidateLow;
            st.dynamicThresholds = { high: highDyn, low: lowDyn, noiseMedian: median, noiseMad: adjMad };
        }
      }
      // Decide which thresholds to use (placeholder: still static until Task for dynamic activation)
      st.noiseScore = noiseRaw; // will later replace with robust-adjusted if needed
      st.metricsSnapshot = signals; st.lastEvalAt = new Date();
      const { high, low } = this.cfg.hysteresis;
      const dynHigh = st.dynamicThresholds?.high;
      const dynLow = st.dynamicThresholds?.low;
      // For now default to static; later tasks will switch to dyn* when robust.enabled فعال و thresholds موجود
      const effHigh = (this.cfg.robust?.enabled && dynHigh)? dynHigh : high;
      const effLow = (this.cfg.robust?.enabled && dynLow)? dynLow : low;
      // Robust gating: اگر dynHigh پایین‌تر از staticHigh باشد، برای جلوگیری از تحریک به واسطه outlier تک، نیاز به چند عبور متوالی داریم
      const needGate = !!(this.cfg.robust?.enabled && dynHigh && dynHigh < high);
      const gateMin = this.cfg.robust?.minConsecutiveAboveHigh || 1;
      if (needGate) {
        if (st.noiseScore >= effHigh) st.robustHighStreak = (st.robustHighStreak || 0) + 1; else st.robustHighStreak = 0;
      } else {
        st.robustHighStreak = 0; // reset وقتی gating لازم نیست
      }
      const blockBySeverity = (st.severityScope === 'critical' && !this.cfg.allowSuppressCritical);
      const blockByEscalationEff = signals.escalationEffectiveness >= this.cfg.escalationEffectivenessBlockThreshold;
      // track volume stats
      this.metrics.totalOriginalVolume += signals.volume;
      if (st.state === 'SUPPRESSED') this.metrics.totalSuppressedVolume += signals.volume;
      // collect ack rates for false suppression detection windows
      if (st.state === 'SUPPRESSED') {
        st.lastAckRateInside?.push(signals.ackRate);
      } else if (st.lastSuppressionStart) {
        st.lastAckRateAfterExit?.push(signals.ackRate);
      }

      switch (st.state) {
        case 'ACTIVE':
          st.consecutiveStable = 0;
  if (!blockBySeverity && !blockByEscalationEff && signals.volume >= this.cfg.minVolume && st.noiseScore >= effHigh && (!needGate || (st.robustHighStreak||0) >= gateMin)) this.transition(st, 'CANDIDATE', 'noise>=high');
          break;
        case 'CANDIDATE':
          if (blockBySeverity || blockByEscalationEff) { this.transition(st, 'ACTIVE', 'blocked'); break; }
          if (signals.volume < this.cfg.minVolume) { this.transition(st, 'ACTIVE', 'volume<min'); break; }
  if (st.noiseScore >= effHigh && (!needGate || (st.robustHighStreak||0) >= gateMin)) this.transition(st, 'SUPPRESSED', 'confirm>=high');
      else if (st.noiseScore < effLow) this.transition(st, 'ACTIVE', 'noise<low');
          break;
        case 'SUPPRESSED':
          st.suppressedCount += 1;
      if (st.noiseScore < effLow) { st.consecutiveStable += 1; this.transition(st, 'MONITORING', 'dropBelowLow'); }
          else st.consecutiveStable = 0;
          break;
        case 'MONITORING':
      if (st.noiseScore < effLow) { st.consecutiveStable += 1; if (st.consecutiveStable >= this.cfg.stableRecoveryWindows) { this.transition(st, 'ACTIVE', 'stableRecovery'); } }
      else if (st.noiseScore >= effHigh && !blockBySeverity && !blockByEscalationEff) { st.consecutiveStable = 0; this.transition(st, 'SUPPRESSED', 'reSpiked'); }
          else st.consecutiveStable = 0;
          break;
      }
    results.push({ group: g, state: st.state, noiseScore: st.noiseScore, blocked: blockBySeverity || blockByEscalationEff, dynHigh: st.dynamicThresholds?.high, dynLow: st.dynamicThresholds?.low });
    }
    const batchMs = Date.now() - startBatch;
    return { evaluated: results.length, groups: results, batchMs };
  }

  getSuppressionState(dedupGroup: string) {
    const g = this.groups.get(dedupGroup);
    if (!g) return { suppressed:false };
    return { suppressed: g.state === 'SUPPRESSED', state: g.state, noiseScore: g.noiseScore, mode: g.state==='SUPPRESSED'? 'MUTE':'NONE', since: g.lastSuppressionStart?.toISOString() };
  }

  // Iteration 29: Snapshot accessor (minimal fields for persistence restore)
  getAllGroupSnapshots() {
    const out: any[] = [];
    for (const g of this.groups.values()) {
      out.push({
        dedupGroup: g.dedupGroup,
        state: g.state,
        noiseScore: g.noiseScore,
        noiseScoreEnter: g.noiseScoreEnter,
        noiseScoreExit: g.noiseScoreExit,
        suppressedCount: g.suppressedCount,
        lastVolume: g.lastVolume,
        severityScope: g.severityScope,
        strategy: g.strategy,
        lastStateChangeAt: g.lastStateChangeAt?.toISOString(),
        lastSuppressionStart: g.lastSuppressionStart?.toISOString(),
        consecutiveStable: g.consecutiveStable,
        dynamicThresholds: g.dynamicThresholds,
        robustHighStreak: g.robustHighStreak
      });
    }
    return out;
  }

  // Iteration 29: Hydrate groups from persisted snapshots (idempotent merge)
  hydrateFromSnapshots(snapshots: any[]) {
    if (!snapshots || !Array.isArray(snapshots)) return { hydrated:0 };
    let count=0;
    for (const s of snapshots) {
      if (!s?.dedupGroup) continue;
      let existing = this.groups.get(s.dedupGroup) as any;
      if (!existing) {
        existing = { dedupGroup: s.dedupGroup, state:'ACTIVE', noiseScore:0, suppressedCount:0, consecutiveStable:0, lastVolume:0, suppressionDurations:[], lastAckRateInside:[], lastAckRateAfterExit:[], metricsSnapshot:null } as any;
        this.groups.set(s.dedupGroup, existing);
      }
      const g = existing as any; // now guaranteed
      g.state = s.state || g.state;
      g.noiseScore = s.noiseScore ?? g.noiseScore;
      g.noiseScoreEnter = s.noiseScoreEnter;
      g.noiseScoreExit = s.noiseScoreExit;
      g.suppressedCount = s.suppressedCount ?? g.suppressedCount;
      g.lastVolume = s.lastVolume ?? g.lastVolume;
      g.severityScope = s.severityScope || g.severityScope;
      g.strategy = s.strategy || g.strategy;
      g.lastStateChangeAt = s.lastStateChangeAt? new Date(s.lastStateChangeAt): g.lastStateChangeAt;
      g.lastSuppressionStart = s.lastSuppressionStart? new Date(s.lastSuppressionStart): g.lastSuppressionStart;
      g.consecutiveStable = s.consecutiveStable ?? g.consecutiveStable;
      g.dynamicThresholds = s.dynamicThresholds || g.dynamicThresholds;
      g.robustHighStreak = s.robustHighStreak ?? g.robustHighStreak;
      count++;
    }
    return { hydrated: count };
  }

  // Placeholder metrics – will expand in later step
  getSuppressionMetrics() {
    let active = 0, suppressed=0, monitoring=0, candidate=0;
    for (const g of this.groups.values()) {
      if (g.state==='ACTIVE') active++; else if (g.state==='SUPPRESSED') suppressed++; else if (g.state==='MONITORING') monitoring++; else if (g.state==='CANDIDATE') candidate++;
    }
    const falseSuppressionRate = this.metrics.suppressExitCount? +(this.metrics.falseSuppressCount / this.metrics.suppressExitCount).toFixed(4):0;
    const recentExits = (this as any)._recentExits || [];
    const recentReentries = (this as any)._recentReentries || [];
    const horizonMs = 20 * 60 * 1000; // placeholder horizon (20 minutes logical cycles vs time) – will align with cycles later
    const now = Date.now();
    const windowExits = recentExits.filter((e:any)=> now - e.at.getTime() <= horizonMs);
    const windowReentries = recentReentries.filter((r:any)=> now - r.at.getTime() <= horizonMs && r.reMs <= horizonMs);
    const exitGroups = new Set(windowExits.map((e:any)=>e.dedupGroup));
    // Count reentries whose group had an exit in window and reMs constraint satisfied
    let reNoise = 0;
    for (const r of windowReentries) if (exitGroups.has(r.dedupGroup)) reNoise++;
    const reNoiseRate = windowExits.length? +(reNoise / windowExits.length).toFixed(4):0;
    return { active, suppressed, monitoring, candidate, falseSuppressionRate, reNoiseRate };
  }

  getRecentTransitions(limit:number = 100){
  const buf = (this as any)._transitions || [];
  return buf.slice(-limit);
  }
}

export const governanceAlertSuppressionService = new GovernanceAlertSuppressionService({
  evalIntervalMs: 60000,
  hysteresis: { high: 0.65, low: 0.45 },
  minSamples: 5,
  minVolume: 5,
  stableRecoveryWindows: 3,
  recoveryAckRateJump: 0.3,
  weights: { w1:0.3, w2:0.25, w3:0.15, w4:0.15, w5:0.15 },
  escalationEffectivenessBlockThreshold: 0.6,
  allowSuppressCritical: false,
  robust: { enabled: true, historySize: 30, minSamplesForRobust: 8, kHigh: 1.2, kLow: 0.4, epsilonMad: 0.01, minConsecutiveAboveHigh: 2 }
});

// Local percentile helper (replicated to avoid cross-import complexity)
function percentileLocal(arr: number[], p: number) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a,b)=>a-b);
  const idx = Math.min(sorted.length-1, Math.max(0, Math.ceil(p*sorted.length)-1));
  return sorted[idx];
}
