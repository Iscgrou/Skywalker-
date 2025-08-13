// R5: Intel Rollup Writer Service
// مسئولیت: ذخیره دوره‌ای snapshot های پنجره‌ای در جدول intel_rollups با retention ساده

import { intelWindowStore } from './intel-window-store';
import { db } from '../db';
import { intelRollups } from '../../shared/schema';

interface RollupWriterOptions {
  intervalMs?: number; // بررسی دوره‌ای
  windows?: number[];  // لیست پنجره‌هایی که باید persist شوند
  minEventThreshold?: number; // اگر eventCount==0 صرفنظر شود
}

class IntelRollupWriterService {
  private timer?: any;
  private opts: Required<RollupWriterOptions>;
  private lastBucketWritten: Record<string, number> = {}; // key: window -> bucket_ts
  constructor(options?: RollupWriterOptions){
    this.opts = {
      intervalMs: options?.intervalMs ?? 30_000,
      windows: options?.windows ?? [60_000, 300_000, 3_600_000],
      minEventThreshold: options?.minEventThreshold ?? 1
    };
  }

  start(){
    if (this.timer) return;
    this.timer = setInterval(()=> this.flush(), this.opts.intervalMs);
    this.flush();
  }
  stop(){ if (this.timer) clearInterval(this.timer); }

  private async flush(){
    for (const w of this.opts.windows){
      const snap = intelWindowStore.getSnapshot(w);
      if (!snap) continue;
      if (snap.eventCount < this.opts.minEventThreshold) continue;
      // bucket_ts = floor(to / window)
      const bucketTs = Math.floor(snap.to / w) * w; // ms
      const key = String(w);
      if (this.lastBucketWritten[key] === bucketTs) continue; // already written this bucket
      // Persist per domain+kind (explode counts)
      const rows: any[] = [];
      for (const [domain, domainCount] of Object.entries(snap.byDomain)){
        // domain summary row (kind='*') optional: skip to reduce volume
        rows.push({ bucketTs: new Date(bucketTs), windowMs: w, domain, kind: '*', eventCount: domainCount });
      }
      for (const [kind, count] of Object.entries(snap.byKind)){
        // assume kind format domain.kind2; attempt domain extraction
        const domain = kind.split('.')[0] || 'generic';
        rows.push({ bucketTs: new Date(bucketTs), windowMs: w, domain, kind, eventCount: count });
      }
      try {
        if (rows.length){
          await db.insert(intelRollups).values(rows as any);
          this.lastBucketWritten[key] = bucketTs;
        }
      } catch(e){
        // swallow to avoid breaking loop; could log later
      }
    }
  }
}

export const intelRollupWriter = new IntelRollupWriterService();
