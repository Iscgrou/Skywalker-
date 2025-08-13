/**
 * Iteration 38d - Minimal Telemetry Layer (v1)
 * هدف: ایجاد مشاهده‌پذیری سبک برای ماژول‌های Prescriptive (Robustness / Frontier / Evaluation)
 * طراحی:
 *  - spans: {label,start,end,durationMs}
 *  - counters: Map<string, number>
 *  - schemaVersion: 'telemetry.v1'
 *  - سربار پایین: در صورت غیرفعال بودن فلگ اصلی PODSE_ROBUST_V1 غیرفعال
 */

interface SpanRec { label: string; start: number; end?: number; durationMs?: number; }

class TelemetryCore {
  private spans: SpanRec[] = [];
  private counters: Record<string, number> = {};
  private active: Record<string, SpanRec> = {};
  private adaptiveSummary?: { stats: any; top: any[]; generatedAt: string };
  schemaVersion = 'telemetry.v1';

  enabled() { return process.env.PODSE_ROBUST_V1 === 'true'; }

  startSpan(label: string) {
    if (!this.enabled()) return;
    const rec: SpanRec = { label, start: Date.now() };
    this.active[label] = rec;
  }
  endSpan(label: string) {
    if (!this.enabled()) return;
    const rec = this.active[label];
    if (!rec) return;
    rec.end = Date.now();
    rec.durationMs = rec.end - rec.start;
    this.spans.push(rec);
    delete this.active[label];
  }
  counter(name: string, inc: number = 1) {
    if (!this.enabled()) return;
    this.counters[name] = (this.counters[name] || 0) + inc;
  }
  attachAdaptiveSummary(summary: { actions: any[]; stats: any; generatedAt: string }) {
    if (!this.enabled()) return;
    const top = [...summary.actions].sort((a,b)=> b.priority - a.priority).slice(0,3);
    this.adaptiveSummary = { stats: summary.stats, top, generatedAt: summary.generatedAt };
  }
  /**
   * ساخت Rollups آماری از spans و counters برای مشاهده‌پذیری سطح بالاتر
   */
  private buildRollups() {
    // گروه‌بندی span ها بر اساس label
    const byLabel: Record<string, { count: number; totalMs: number; minMs: number; maxMs: number; avgMs: number; incomplete: number; }> = {};
    for (const s of this.spans) {
      const key = s.label;
      if (!byLabel[key]) byLabel[key] = { count: 0, totalMs: 0, minMs: Number.POSITIVE_INFINITY, maxMs: 0, avgMs: 0, incomplete: 0 };
      const bucket = byLabel[key];
      bucket.count++;
      if (s.durationMs == null || s.durationMs < 0) {
        bucket.incomplete++;
        continue;
      }
      const d = s.durationMs;
      bucket.totalMs += d;
      if (d < bucket.minMs) bucket.minMs = d;
      if (d > bucket.maxMs) bucket.maxMs = d;
    }
    for (const k of Object.keys(byLabel)) {
      const b = byLabel[k];
      if (b.minMs === Number.POSITIVE_INFINITY) b.minMs = 0;
      b.avgMs = b.count - b.incomplete > 0 ? b.totalMs / (b.count - b.incomplete) : 0;
    }
    const totalDurationMs = Object.values(byLabel).reduce((acc, b) => acc + b.totalMs, 0);

    // گروهبندی counters بر اساس پیشوند قبل از نخستین نقطه
    const counterGroups: Record<string, number> = {};
    for (const [k,v] of Object.entries(this.counters)) {
      const prefix = k.includes('.') ? k.split('.')[0] : k;
      counterGroups[prefix] = (counterGroups[prefix] || 0) + v;
    }

    // مشتقات خاص Prescriptive
    const constraintEvalSpanKey = 'constraints.evaluate.batch';
    const constraintSpanStats = byLabel[constraintEvalSpanKey];
    const totalConstraintEvalMs = constraintSpanStats ? constraintSpanStats.totalMs : 0;
    const constraintEvalBatches = constraintSpanStats ? constraintSpanStats.count : 0;
    const avgConstraintBatchMs = constraintSpanStats && constraintSpanStats.count - constraintSpanStats.incomplete > 0
      ? (constraintSpanStats.totalMs / (constraintSpanStats.count - constraintSpanStats.incomplete)) : 0;

    const constraintsEvaluated = this.counters['constraints.evaluated'] || 0;
    const hardViolations = this.counters['constraints.violation.hard'] || 0;
    const softViolations = this.counters['constraints.violation.soft'] || 0;
    const violationHardRate = constraintsEvaluated > 0 ? hardViolations / constraintsEvaluated : 0;
    const violationSoftRate = constraintsEvaluated > 0 ? softViolations / constraintsEvaluated : 0;

    return {
      spanStats: byLabel,
      totalSpans: this.spans.length,
      totalDurationMs,
      counters: { ...this.counters },
      counterGroups,
      derived: {
        totalConstraintEvalMs,
        constraintEvalBatches,
        avgConstraintBatchMs,
        constraintsEvaluated,
        hardViolations,
        softViolations,
        violationHardRate,
        violationSoftRate
  },
  adaptiveSummary: this.adaptiveSummary
    };
  }
  snapshot() {
    if (!this.enabled()) return { schemaVersion: this.schemaVersion, spans: [], counters: {}, rollups: { spanStats: {}, totalSpans: 0, totalDurationMs: 0, counters: {}, counterGroups: {}, derived: { totalConstraintEvalMs:0, constraintEvalBatches:0, avgConstraintBatchMs:0, constraintsEvaluated:0, hardViolations:0, softViolations:0, violationHardRate:0, violationSoftRate:0 } } };
    return { schemaVersion: this.schemaVersion, spans: [...this.spans], counters: { ...this.counters }, rollups: this.buildRollups(), timestamp: new Date().toISOString() };
  }
  reset() {
    this.spans = []; this.counters = {}; this.active = {};
  }
}

export const PrescriptiveTelemetry = new TelemetryCore();
