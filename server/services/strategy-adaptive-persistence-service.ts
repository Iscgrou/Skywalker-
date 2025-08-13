// Iteration 29: Adaptive Governance Persistence Service (skeleton)
// Responsibilities:
//  - Save latest adaptive weights (upsert single row per version) + history append
//  - Save suppression state snapshots (replace per dedupGroup)
//  - Load weights & suppression states at startup (graceful if tables empty)
//  - Audit each persistence action
//  - Light transactional safety (best-effort if DB available)

import { ensureDb, getPool } from '../db.ts';
import { adaptiveWeightsLatest, adaptiveWeightsHistory, suppressionStateLatest, governancePersistenceAudit } from '../../shared/schema.ts';
import { eq } from 'drizzle-orm';

export interface SaveWeightsInput {
  version?: string;
  weights: { w1:number; w2:number; w3:number; w4:number; w5:number };
  reason: string; // applied|cooldown|freeze
  cycle?: number;
  lastAdjustmentCycle?: number;
  freezeActive?: boolean;
  freezeSinceCycle?: number;
  consecutiveZeroErrorCycles?: number;
  metricsSnapshot?: any;
  meta?: any; // errs, deltas truncated
}

export class AdaptivePersistenceService {
  private version: string;
  constructor(version='v1') { this.version = version; }

  async saveWeights(input: SaveWeightsInput) {
    const started = Date.now();
    const pool = getPool();
    if (!pool) return { skipped:true, reason:'NO_DB' };
    ensureDb();
    const v = input.version || this.version;
    try {
      // Upsert latest (drizzle lacks native onConflict for pg-core pre 0.30; use SQL fallback)
  const conn = ensureDb();
  await conn.transaction(async (tx:any) => {
        // Try delete existing version row(s) (simple approach)
  await tx.delete(adaptiveWeightsLatest).where(eq(adaptiveWeightsLatest.version, v));
  await tx.insert(adaptiveWeightsLatest).values({
          version: v,
          w1: input.weights.w1, w2: input.weights.w2, w3: input.weights.w3, w4: input.weights.w4, w5: input.weights.w5,
          freezeActive: !!input.freezeActive,
          freezeSinceCycle: input.freezeSinceCycle,
          lastAdjustmentCycle: input.lastAdjustmentCycle,
          cycle: input.cycle,
          consecutiveZeroErrorCycles: input.consecutiveZeroErrorCycles,
          metricsSnapshot: input.metricsSnapshot
        });
  await tx.insert(adaptiveWeightsHistory).values({
          version: v,
          w1: input.weights.w1, w2: input.weights.w2, w3: input.weights.w3, w4: input.weights.w4, w5: input.weights.w5,
          reason: input.reason,
          cycle: input.cycle,
          lastAdjustmentCycle: input.lastAdjustmentCycle,
          freezeActive: !!input.freezeActive,
          meta: input.meta || null
        });
      });
  await ensureDb().insert(governancePersistenceAudit).values({ action:'SAVE_WEIGHTS', entity:'weights', version:v, count:1, durationMs: Date.now()-started, success:true });
      return { ok:true };
    } catch (e:any) {
      console.error('saveWeights failed', e);
  try { await ensureDb().insert(governancePersistenceAudit).values({ action:'SAVE_WEIGHTS', entity:'weights', version:v, count:1, durationMs: Date.now()-started, success:false, error: String(e?.message||e) }); } catch {}
      return { ok:false, error:String(e?.message||e) };
    }
  }

  async loadWeights(version?:string) {
    const started = Date.now();
    const pool = getPool();
    if (!pool) return { skipped:true, reason:'NO_DB' };
    ensureDb();
    const v = version || this.version;
    try {
  const rows = await ensureDb().select().from(adaptiveWeightsLatest).where(eq(adaptiveWeightsLatest.version, v)).limit(1);
      const row = rows[0];
  await ensureDb().insert(governancePersistenceAudit).values({ action:'LOAD_WEIGHTS', entity:'weights', version:v, count: row?1:0, durationMs: Date.now()-started, success:true });
      if (!row) return { ok:true, empty:true };
      return { ok:true, row };
    } catch (e:any) {
  try { await ensureDb().insert(governancePersistenceAudit).values({ action:'LOAD_WEIGHTS', entity:'weights', version:version||this.version, count:0, durationMs: Date.now()-started, success:false, error:String(e?.message||e) }); } catch {}
      return { ok:false, error:String(e?.message||e) };
    }
  }

  async saveSuppressionStates(snapshots: any[]) {
    const started = Date.now();
    const pool = getPool();
    if (!pool) return { skipped:true, reason:'NO_DB' };
    if (!Array.isArray(snapshots) || !snapshots.length) return { ok:true, skipped:true };
    ensureDb();
    try {
  const conn = ensureDb();
  await conn.transaction(async (tx:any) => {
        // Delete existing dedupGroups present in this batch then insert fresh
        const groups = snapshots.map(s=>s.dedupGroup).filter(Boolean);
        if (groups.length) {
          // naive delete loop (drizzle lacks in() poly by default without helpers available here)
            for (const g of groups) {
              await tx.delete(suppressionStateLatest).where(eq(suppressionStateLatest.dedupGroup, g));
            }
        }
        for (const s of snapshots) {
          await tx.insert(suppressionStateLatest).values({
            dedupGroup: s.dedupGroup,
            state: s.state,
            noiseScore: s.noiseScore,
            noiseScoreEnter: s.noiseScoreEnter,
            noiseScoreExit: s.noiseScoreExit,
            suppressedCount: s.suppressedCount,
            lastVolume: s.lastVolume,
            severityScope: s.severityScope,
            strategy: s.strategy,
            lastStateChangeAt: s.lastStateChangeAt ? new Date(s.lastStateChangeAt) : null,
            lastSuppressionStart: s.lastSuppressionStart ? new Date(s.lastSuppressionStart) : null,
            consecutiveStable: s.consecutiveStable,
            dynamicThresholds: s.dynamicThresholds || null,
            robustHighStreak: s.robustHighStreak
          });
        }
      });
  await ensureDb().insert(governancePersistenceAudit).values({ action:'SAVE_SUPPRESSION', entity:'suppression', count:snapshots.length, durationMs: Date.now()-started, success:true });
      return { ok:true };
    } catch (e:any) {
      console.error('saveSuppressionStates failed', e);
  try { await ensureDb().insert(governancePersistenceAudit).values({ action:'SAVE_SUPPRESSION', entity:'suppression', count:0, durationMs: Date.now()-started, success:false, error:String(e?.message||e) }); } catch {}
      return { ok:false, error:String(e?.message||e) };
    }
  }

  async loadSuppressionStates(limit=500) {
    const started = Date.now();
    const pool = getPool();
    if (!pool) return { skipped:true, reason:'NO_DB' };
    ensureDb();
    try {
  const rows = await ensureDb().select().from(suppressionStateLatest).limit(limit);
  await ensureDb().insert(governancePersistenceAudit).values({ action:'LOAD_SUPPRESSION', entity:'suppression', count:rows.length, durationMs: Date.now()-started, success:true });
      return { ok:true, rows };
    } catch (e:any) {
  try { await ensureDb().insert(governancePersistenceAudit).values({ action:'LOAD_SUPPRESSION', entity:'suppression', count:0, durationMs: Date.now()-started, success:false, error:String(e?.message||e) }); } catch {}
      return { ok:false, error:String(e?.message||e) };
    }
  }
}

export const adaptivePersistenceService = new AdaptivePersistenceService('v1');
