// Iteration 30: Adaptive Persistence Prune Service
// مسئول: حذف ایمن داده های تاریخ گذشته برای کنترل رشد و حفظ کارایی
// TTL ها: weights_history & suppression_state_history => 14d ، persistence_audit => 7d
// Batch زمان-آگاه با adaptive sizing

import { db } from '../db.ts';
import { sql } from 'drizzle-orm';

interface PruneRunOptions { msBudget?: number; now?: Date }
interface TableSummary { table: string; deleted: number; batches: number; lastBatchSize: number; elapsedMs: number; surge?: boolean; error?: string }

class AdaptivePruneService {
  private running = false;
  private lastRunAt?: number;
  private consecutiveNoop = 0;
  async runPrune(opts: PruneRunOptions = {}): Promise<{ summary: TableSummary[]; totalDeleted: number; elapsedMs: number; skipped?: boolean; reason?: string }> {
    if (this.running) return { summary: [], totalDeleted: 0, elapsedMs: 0, skipped:true, reason:'ALREADY_RUNNING' };
    // اگر DB موجود نباشد (memory harness) skip
    try { (db as any).execute; } catch { return { summary:[], totalDeleted:0, elapsedMs:0, skipped:true, reason:'NO_DB' }; }
    this.running = true;
    const started = Date.now();
    const msBudget = opts.msBudget ?? 200;
    const nowTs = opts.now ? opts.now.getTime() : Date.now();
    const t14 = new Date(nowTs - 14*24*60*60*1000);
    const t7 = new Date(nowTs - 7*24*60*60*1000);

    const work: { name:string; horizon: Date; pk: string; tableSql: string; deleteWhere: string; audit?: boolean }[] = [
      { name:'governance_persistence_audit', horizon: t7, pk: 'id', tableSql: 'governance_persistence_audit', deleteWhere: 'created_at < $1', audit:true },
      { name:'suppression_state_history', horizon: t14, pk: 'id', tableSql: 'suppression_state_history', deleteWhere: 'changed_at < $1' },
      { name:'adaptive_weights_history', horizon: t14, pk: 'id', tableSql: 'adaptive_weights_history', deleteWhere: 'created_at < $1' }
    ];

    const summary: TableSummary[] = [];

    for (const item of work) {
      let batchSize = 500;
      let deletedTotal = 0; let batches = 0; const tStart = Date.now();
      while (true) {
        const loopStart = Date.now();
        const q = sql.raw(`WITH d AS (SELECT ${item.pk} FROM ${item.tableSql} WHERE ${item.deleteWhere} ORDER BY ${item.pk} ASC LIMIT ${batchSize}) DELETE FROM ${item.tableSql} USING d WHERE ${item.tableSql}.${item.pk} = d.${item.pk}`);
        let affected = 0;
        try {
          // drizzle raw execute fallback
          // @ts-ignore
          const r = await (db as any).execute(q, [item.horizon]);
          affected = (r as any).rowCount ?? 0;
        } catch (e:any) {
          summary.push({ table: item.name, deleted: deletedTotal, batches, lastBatchSize: batchSize, elapsedMs: Date.now()-tStart, error: e.message });
          affected = 0; // break
          break;
        }
        deletedTotal += affected; batches++;
        const loopElapsed = Date.now() - loopStart;
        if (loopElapsed > 500) { // Slow safeguard -> stop further heavy deletes for this table
          break;
        }
        if (affected === 0) break;
        // Adaptive sizing
        if (loopElapsed < 30 && batchSize < 5000) batchSize = Math.min(5000, batchSize * 2);
        else if (loopElapsed > 80) batchSize = Math.max(100, Math.floor(batchSize / 2));
        if ((Date.now() - started) >= msBudget) break; // budget global
      }
      const elapsedMs = Date.now() - tStart;
      summary.push({ table: item.name, deleted: deletedTotal, batches, lastBatchSize: batchSize, elapsedMs, surge: deletedTotal > 50000 });
      if ((Date.now() - started) >= msBudget) break; // budget exhausted
    }

    const totalDeleted = summary.reduce((s,x)=>s+x.deleted,0);
    if (totalDeleted === 0) this.consecutiveNoop++; else this.consecutiveNoop = 0;
    this.running = false; this.lastRunAt = Date.now();
    return { summary, totalDeleted, elapsedMs: Date.now()-started };
  }
}

export const adaptivePruneService = new AdaptivePruneService();
