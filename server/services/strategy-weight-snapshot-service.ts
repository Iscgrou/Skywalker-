// Iteration 14: Strategy Weight Snapshot Persistence Service
// Iteration 15: Auto Snapshot Orchestration & Optimization (interval + debounce + concurrency lock)
// Iteration 16 (Design Draft): Real DB Purge + Optimized Listing
// اهداف Iteration 16:
//  - پیاده سازی حذف واقعی قدیمی‌ها در حالت DB: DELETE با شرط created_at < cutoff و بازگشت تعداد حذف شده.
//  - جلوگیری از بار اضافه: اجرای purge داخل maybeAutoSnapshot فقط در صورت تنظیم purgeDays.
//  - بهینه سازی listSnapshots در حالت DB: projection حداقلی ستون‌های پرمصرف UI، ORDER BY created_at DESC, LIMIT N در خود SQL (جلوگیری از fetch کل جدول).
//  - افزودن امکان فیلتر strategy در کوئری مستقیم.
// قراردادهای جدید/بهبود یافته:
//  listSnapshots({ strategy?, limit? }): در DB -> SELECT فیلدهای: strategy, weight, modifiers, meta, created_at, captured_at, version, spread, early_gated ORDER BY created_at DESC LIMIT ? [+ WHERE strategy=?]
//  purgeOldSnapshots({ olderThanDays? }): در DB -> اجرای DELETE و بازگشت { removed, mode:'db' }.
// سناریوهای اعتبارسنجی Purge (Harness جدید Iteration 16):
//  A Precise Cutoff: رکورد دقیقا قدیمی‌تر از cutoff حذف و رکورد در مرز باقی می‌ماند.
//  B Boundary Safety: هیچ رکورد >= cutoff حذف نمی‌شود.
//  C Idempotency: اجرای دوباره purge بدون تغییر زمانی removed=0.
//  D Listing Efficiency: listSnapshots(limit=K) هرگز بیش از K ردیف برنمی‌گرداند و مرتب نزولی است.
//  E Concurrency Safety: همزمانی purge و snapshot باعث از دست رفتن قفل یا شکست در snapshot نمی‌شود (snapshot موفق است، purge تعداد صحیح حذف‌ها را گزارش می‌دهد).
// ریسک‌ها و Mitigation:
//  - حذف اشتباهی (Off-by-one): استفاده از < cutoff (نه <=) و تست مرزی.
//  - قفل طولانی Transactions: عملیات DELETE بدون JOIN و ایندکس بر created_at ⇒ سریع؛ در صورت حجم بالا می‌توان batch paging در Iteration بعد.
//  - Drift بین projection DB و memory: حفظ شکل خروجی یکسان.
// گسترش آینده (Iteration بعد): Trend Analytics (slope, volatility trend) بعد از پاکسازی صحیح داده‌ها.
// اهداف:
//  - ثبت خودکار snapshot پس از الگوی تصمیم‌گیری بدون تحمیل هزینه اضافه (debounced + interval gating)
//  - کاهش احتمال انفجار حجم با purge واقعی (DB + حافظه)
//  - بهبود listSnapshots (ordering و projection حداقلی)
//  - قابل پیکربندی بودن برای سناریوهای load مختلف
// قرارداد پیشنهادی:
//  configureAutoSnapshot({ enabled?: boolean; decisionInterval?: number; minSecondsBetween?: number; purgeDays?: number }): void
//  noteDecision(): علامت زدن وقوع تصمیم (افزایش شمارنده) و تلاش برای maybeAutoSnapshot()
//  maybeAutoSnapshot({ reason?: string }): Promise<{ triggered: boolean; reason: string; mode: 'memory'|'db'|null }>
//  purgeOldSnapshots({ olderThanDays? }): اکنون حذف واقعی (DB) + memory
// State داخلی:
//  _auto: { enabled, decisionInterval, minSecondsBetween, lastSnapshotAt, decisionsSince, lock }
// معیار تریگر:
//  - enabled=true
//  - decisionsSince >= decisionInterval
//  - now - lastSnapshotAt >= minSecondsBetween (ثانیه)
// سناریوهای اعتبارسنجی (هارنس Iteration 15):
//  A Interval Trigger: بعد از N تصمیم snapshot رخ می‌دهد.
//  B Debounce Time Guard: قبل از minSecondsBetween نباید snapshot دوم ثبت شود.
//  C Disabled Mode: وقتی enabled=false هیچ snapshot ثبت نمی‌شود.
//  D Purge Effectiveness: بعد از تزریق timestamps قدیمی، purge حذف >= انتظار.
//  E Concurrency Lock: دو فراخوانی موازی maybeAutoSnapshot فقط یک snapshot واقعی می‌سازد.
// ریسک‌ها:
//  - Race condition: حل با قفل ساده Promise queue / boolean lock.
//  - Drift performance: computeUnifiedWeights هر snapshot ⇒ محدودسازی با interval/time gating.
//  - رشد DB: purge واقعی + index موجود.
// نسخه‌بندی:
//  - افزودن meta.auto: { reason, decisionsSince, interval } در هر snapshot.

import { aiStrategyWeightSnapshots } from '../../shared/schema.ts';
import { desc, lt, inArray, eq } from 'drizzle-orm';
import { strategyPerformanceService } from './strategy-performance-service.ts';

// Lazy db import holder
let dbRef: any = null; let dbTried = false;
async function getDb() {
  if (dbRef || dbTried) return dbRef; dbTried = true;
  try { if (process.env.DATABASE_URL) { dbRef = (await import('../db.ts')).db; } } catch { dbRef = null; }
  return dbRef;
}

// In-memory fallback circular buffer (when no DB)
interface SnapshotRow { id?: number; capturedAt: Date; version: string; strategy: string; weight: number; basePost: number|null; decayScore: number|null; avgEff: number|null; p90Eff: number|null; spread: number|null; earlyGated: boolean; checksum: number|null; seed?: number|null; modifiers: any; meta: any; }
const memoryBuffer: SnapshotRow[] = []; const MAX_MEM = 500;

async function hasDb() { return !!(await getDb()); }

export const strategyWeightSnapshotService = {
  async snapshotCurrent(opts: { seed?: number; artifact?: any } = {}) {
    // reuse existing artifact if provided to avoid recompute
    const artifact = opts.artifact || await strategyPerformanceService.getWeightDetails();
    const capturedAt = new Date();
    const seed = opts.seed;
    const rows: SnapshotRow[] = artifact.strategies.map((s: any) => ({
      capturedAt,
      version: artifact.version || artifact.meta?.version || 'unified-v1',
      strategy: s.name,
      weight: s.finalWeight,
      basePost: s.basePostModifiers ?? null,
      decayScore: s.decayScore ?? null,
      avgEff: s.avgEff ?? null,
      p90Eff: s.p90Eff ?? null,
      spread: s.spread ?? null,
      earlyGated: s.earlyGated || false,
      checksum: artifact.normalization?.checksum ?? null,
      seed: seed ?? null,
      modifiers: { ...s.modifiers, floorApplied: s.floorApplied, clampApplied: s.clampApplied, dominanceCapApplied: s.dominanceCapApplied },
      meta: { earlyCount: artifact.meta?.earlyGatedStrategies?.length || 0, sums: artifact.normalization }
    }));
    if (!(await hasDb())) {
      rows.forEach(r => { memoryBuffer.push(r); if (memoryBuffer.length > MAX_MEM) memoryBuffer.shift(); });
      return { persisted: 'memory', count: rows.length };
    }
    const db = await getDb();
    await db.transaction(async (trx: any) => {
      for (const r of rows) {
        await trx.insert(aiStrategyWeightSnapshots).values({
          version: r.version,
          strategy: r.strategy,
          weight: r.weight,
          basePost: r.basePost,
          decayScore: r.decayScore,
          avgEff: r.avgEff,
          p90Eff: r.p90Eff,
          spread: r.spread,
          earlyGated: r.earlyGated,
          checksum: r.checksum,
          seed: r.seed ?? null,
          modifiers: r.modifiers,
          meta: r.meta
        } as any);
      }
    });
    return { persisted: 'db', count: rows.length };
  },
  async listSnapshots(opts: { strategy?: string; limit?: number } = {}) {
    const limit = opts.limit ?? 100;
    if (!(await hasDb())) {
      return memoryBuffer.filter(r => !opts.strategy || r.strategy === opts.strategy).slice(-limit).reverse();
    }
    const db = await getDb();
    // Optimized projection & server-side filtering / ordering / limiting
    // NOTE: drizzle simplified where/order since dynamic strategy optional
    let q: any = db.select({
      strategy: aiStrategyWeightSnapshots.strategy,
      weight: aiStrategyWeightSnapshots.weight,
      modifiers: aiStrategyWeightSnapshots.modifiers,
      meta: aiStrategyWeightSnapshots.meta,
      createdAt: aiStrategyWeightSnapshots.createdAt,
      capturedAt: aiStrategyWeightSnapshots.capturedAt,
      version: aiStrategyWeightSnapshots.version,
      spread: aiStrategyWeightSnapshots.spread,
      earlyGated: aiStrategyWeightSnapshots.earlyGated
    }).from(aiStrategyWeightSnapshots)
      .orderBy(desc(aiStrategyWeightSnapshots.createdAt))
      .limit(limit);
  if (opts.strategy) { q = q.where(eq(aiStrategyWeightSnapshots.strategy, opts.strategy)); }
    const rows = await q;
    return rows;
  },
  async purgeOldSnapshots(opts: { olderThanDays?: number } = {}) {
    const days = opts.olderThanDays ?? 30;
    if (!(await hasDb())) {
      const cutoff = Date.now() - days*86400000;
      let removed = 0;
      for (let i=memoryBuffer.length-1;i>=0;i--) { if (memoryBuffer[i].capturedAt.getTime() < cutoff) { memoryBuffer.splice(i,1); removed++; } }
      return { removed, mode: 'memory' };
    }
    const db = await getDb();
    const cutoffDate = new Date(Date.now() - days*86400000);
    // Perform DELETE with cutoff (strictly older than cutoff)
    // drizzle lacks returning count for simple deletes -> fetch ids first limited by safety window for determinism if extremely large
    const toDelete = await db.select({ id: aiStrategyWeightSnapshots.id })
      .from(aiStrategyWeightSnapshots)
      .where(lt(aiStrategyWeightSnapshots.createdAt, cutoffDate));
    const ids = toDelete.map((r:any)=> r.id);
    if (ids.length) {
      await db.delete(aiStrategyWeightSnapshots).where(inArray(aiStrategyWeightSnapshots.id, ids));
    }
    return { removed: ids.length, mode: 'db' };
  },
  _memState() { return { size: memoryBuffer.length, items: memoryBuffer }; },
  // Test-only helper to mutate memory snapshot timestamps (Iteration 14 validation)
  _testMutateMemory(mutator: (rows: SnapshotRow[]) => void) { mutator(memoryBuffer); }
  , _testClearMemory() { memoryBuffer.splice(0, memoryBuffer.length); }
  , _testInjectSpreadAdjust(fn: (r: SnapshotRow, idx: number) => void) { memoryBuffer.forEach((r,i)=> fn(r,i)); }
  , _auto: { enabled: false, decisionInterval: 25, minSecondsBetween: 120, purgeDays: 30, lastSnapshotAt: -Infinity, decisionsSince: 0, lock: false },
  _resetAutoForValidation() { this._auto.lastSnapshotAt = -Infinity; this._auto.decisionsSince = 0; this._auto.lock = false; },
  configureAutoSnapshot(cfg: Partial<{ enabled: boolean; decisionInterval: number; minSecondsBetween: number; purgeDays: number }>) {
    const prevEnabled = this._auto.enabled;
    Object.assign(this._auto, cfg);
    if (cfg.enabled && !prevEnabled) { this._auto.lastSnapshotAt = -Infinity; this._auto.decisionsSince = 0; }
    if (cfg.decisionInterval != null) this._auto.decisionInterval = cfg.decisionInterval;
    if (cfg.minSecondsBetween != null) this._auto.minSecondsBetween = cfg.minSecondsBetween;
    if (cfg.purgeDays != null) this._auto.purgeDays = cfg.purgeDays;
  },
  noteDecision() { this._auto.decisionsSince++; },
  async maybeAutoSnapshot(opts: { reason?: string } = {}) {
    const a = this._auto;
    const now = Date.now();
    if (!a.enabled) return { triggered: false, reason: 'disabled', mode: null as any };
    if (a.lock) return { triggered: false, reason: 'locked', mode: null as any };
    if (a.decisionsSince < a.decisionInterval) return { triggered: false, reason: 'interval_wait', mode: null as any };
    if (isFinite(a.lastSnapshotAt) && (now - a.lastSnapshotAt)/1000 < a.minSecondsBetween) return { triggered: false, reason: 'time_guard', mode: null as any };
    a.lock = true;
    try {
      const artifact = await strategyPerformanceService.getWeightDetails();
      const res = await this.snapshotCurrent({ artifact });
      a.lastSnapshotAt = Date.now();
      const taken = a.decisionsSince; a.decisionsSince = 0;
      if (a.purgeDays) { await this.purgeOldSnapshots({ olderThanDays: a.purgeDays }); }
      if (!(await hasDb())) {
        const last = memoryBuffer.slice(-artifact.strategies.length);
        last.forEach(r => { r.meta = { ...r.meta, auto: { reason: opts.reason || 'interval', decisionsSince: taken, interval: a.decisionInterval } }; });
      }
      return { triggered: true, reason: opts.reason || 'interval', mode: res.persisted };
    } finally { a.lock = false; }
  }
};
