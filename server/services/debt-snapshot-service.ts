// Debt Snapshot Service - Iteration 1
import { db } from '../db';
import { representatives, representativeDebtSnapshots, insertRepresentativeDebtSnapshotSchema } from '../../shared/schema';
import { eventBus } from './event-bus';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const todayUtcDate = () => new Date().toISOString().slice(0,10); // YYYY-MM-DD

export class DebtSnapshotService {
  async captureAll(date: string = todayUtcDate()) {
    const reps = await db.select().from(representatives);
    for (const rep of reps) {
      await this.captureOne(rep.id, date, rep.totalDebt as any, rep.totalSales as any);
    }
  }

  async captureOne(representativeId: number, date: string, totalDebt: string | number, totalSales: string | number) {
    const payload = {
      representativeId,
      date,
      totalDebt: (typeof totalDebt === 'string' ? totalDebt : totalDebt.toString()),
      totalSales: (typeof totalSales === 'string' ? totalSales : totalSales.toString())
    };
    const parsed = insertRepresentativeDebtSnapshotSchema.safeParse(payload);
    if (!parsed.success) return;
    // Idempotent insert: rely on (rep,date) index uniqueness by pre-check
    const existing = await db.select().from(representativeDebtSnapshots)
      .where(and(
        eq(representativeDebtSnapshots.representativeId, representativeId),
        eq(representativeDebtSnapshots.date, date)
      ));
    if (existing.length) return; // already captured
    try {
      await db.insert(representativeDebtSnapshots).values(parsed.data);
      eventBus.publish('rep.snapshot.captured', { representativeId, date });
    } catch {}
  }

  async getRecent(representativeId: number, days: number = 14) {
    const rows = await db.select().from(representativeDebtSnapshots)
      .where(eq(representativeDebtSnapshots.representativeId, representativeId))
      .orderBy(desc(representativeDebtSnapshots.date))
      .limit(days);
    return rows;
  }

  async getSeries(representativeId: number, start: string, end: string) {
    const rows = await db.select().from(representativeDebtSnapshots)
      .where(eq(representativeDebtSnapshots.representativeId, representativeId)); // TODO add date range filter when using proper operators
    return rows.filter(r => r.date >= start && r.date <= end).sort((a,b)=> a.date.localeCompare(b.date));
  }
}

export const debtSnapshotService = new DebtSnapshotService();
