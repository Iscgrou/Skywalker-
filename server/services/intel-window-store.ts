// R3.4: Intel Window Store & Ring Buffers
// هدف: نگهداری شمارنده های رویداد در پنجره های زمانی چندگانه برای مصرف سریع API / Aggregator
// پنجره های فعال: 60s, 300s, 3600s

import { IntelEventEnvelope } from './intel-types';

interface Bucket {
  ts: number;              // شروع باکت (ثانیه)
  total: number;
  byDomain: Record<string, number>;
  byKind: Record<string, number>;
}

interface WindowConfig {
  windowMs: number;
  bucketSizeMs: number; // عموماً 1s
  buckets: Bucket[];
  index: number;        // pointer حلقوی
}

interface Snapshot {
  windowMs: number;
  from: number;
  to: number;
  eventCount: number;
  byDomain: Record<string, number>;
  byKind: Record<string, number>;
}

const WINDOW_SPECS = [
  { windowMs: 60_000, bucketSizeMs: 1000 },
  { windowMs: 300_000, bucketSizeMs: 1000 },
  { windowMs: 3_600_000, bucketSizeMs: 1000 },
];

export class IntelWindowStore {
  private windows: WindowConfig[] = [];

  constructor(){
    for (const spec of WINDOW_SPECS) {
      const bucketCount = Math.ceil(spec.windowMs / spec.bucketSizeMs);
      const buckets: Bucket[] = Array.from({ length: bucketCount }, () => ({ ts:0, total:0, byDomain:{}, byKind:{} }));
      this.windows.push({ windowMs: spec.windowMs, bucketSizeMs: spec.bucketSizeMs, buckets, index:0 });
    }
  }

  ingest(evt: IntelEventEnvelope){
    const now = Date.now();
    for (const w of this.windows) {
      const bucketSpan = w.bucketSizeMs;
      const bucketTs = Math.floor(evt.ts / bucketSpan) * bucketSpan; // align to second boundary
      const bucketCount = w.buckets.length;
      // advance index if current slot outdated
      let current = w.buckets[w.index];
      if (bucketTs !== current.ts) {
        // ممکن است چند ثانیه جلو رفته باشیم => roll forward تا برسیم
        const steps = Math.min(bucketCount, Math.max(1, Math.floor((bucketTs - current.ts) / bucketSpan)));
        for (let s=0; s<steps; s++) {
          w.index = (w.index + 1) % bucketCount;
          w.buckets[w.index] = { ts: current.ts + bucketSpan * (s+1), total:0, byDomain:{}, byKind:{} };
        }
        current = w.buckets[w.index];
        // اگر هنوز timestamp sync نیست (init حالت) => ریست
        if (current.ts !== bucketTs) {
          current.ts = bucketTs;
          current.total = 0; current.byDomain = {}; current.byKind = {};
        }
      }
      // accumulate
      current.total++;
      current.byDomain[evt.domain] = (current.byDomain[evt.domain]||0)+1;
      current.byKind[evt.kind] = (current.byKind[evt.kind]||0)+1;
      // housekeeping: (اختیاری) حذف باکت هایی که خیلی قدیمی هستند در snapshot logic هندل می‌شود
    }
  }

  getSnapshot(windowMs: number): Snapshot | undefined {
    const w = this.windows.find(w=> w.windowMs === windowMs);
    if (!w) return undefined;
    const now = Date.now();
    const horizon = now - windowMs;
    const bucketSpan = w.bucketSizeMs;
    const bucketCount = w.buckets.length;
    const byDomain: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let total = 0;
    for (let i=0; i<bucketCount; i++) {
      const idx = (w.index - i + bucketCount) % bucketCount;
      const b = w.buckets[idx];
      if (!b.ts || b.ts < horizon) break; // قدیمی تر از افق پنجره
      total += b.total;
      for (const [d,v] of Object.entries(b.byDomain)) byDomain[d] = (byDomain[d]||0)+v;
      for (const [k,v] of Object.entries(b.byKind)) byKind[k] = (byKind[k]||0)+v;
    }
    return { windowMs, from: horizon, to: now, eventCount: total, byDomain, byKind };
  }

  getAllSnapshots(): Snapshot[] {
    return this.windows.map(w=> this.getSnapshot(w.windowMs)!).filter(Boolean);
  }
}

export const intelWindowStore = new IntelWindowStore();
