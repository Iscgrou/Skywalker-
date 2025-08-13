// Phase 41: Explainability Persistence Service
// NOTE: We import db with explicit .ts extension to satisfy ESM bundler resolution rules.
// Service degrades gracefully when DATABASE_URL is absent (returns reason 'db_unavailable').
import { db } from '../db.ts';
import { explainabilitySessions, explainabilityAdjustments, explainabilityLineageEdges } from '../../shared/schema.ts';
import type { ExplainabilitySnapshot } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';

interface PersistResult { inserted: boolean; reason?: string; policyVersionId?: string; sessionId?: string; }

// In-memory fallback (when DATABASE_URL absent) to allow validation harness & tests to exercise idempotency logic.
interface MemorySession { policyVersionId: string; sessionId: string; startedAt?: string; finishedAt?: string; totalAdjustments?: number; estimationUsed?: boolean; }
const memorySessions: Record<string, MemorySession> = {};
const memorySnapshots: Record<string, ExplainabilitySnapshot> = {}; // keyed by policyVersionId

export function listMemoryExplainabilitySessions(limit: number): any[] {
  const items = Object.values(memorySessions)
    .sort((a,b)=> (b.startedAt||'').localeCompare(a.startedAt||''))
    .slice(0, limit)
    .map(m => ({
      sessionId: m.sessionId,
      policyVersionId: m.policyVersionId,
      totalAdjustments: m.totalAdjustments || 0,
      estimationUsed: !!m.estimationUsed,
      startedAt: m.startedAt,
      finishedAt: m.finishedAt
    }));
  return items;
}
export function getMemorySnapshot(policyVersionId: string): ExplainabilitySnapshot | null {
  return memorySnapshots[policyVersionId] || null;
}

export async function persistExplainabilitySnapshot(snapshot: ExplainabilitySnapshot | null): Promise<PersistResult> {
  if (process.env.PODSE_ROBUST_V1 !== 'true') return { inserted:false, reason:'feature_flag_disabled' };
  if (!snapshot) return { inserted:false, reason:'null_snapshot' };
  const memoryMode = !process.env.DATABASE_URL;
  if (memoryMode) {
    if (!snapshot.session?.policyVersionId) return { inserted:false, reason:'missing_policy_version' };
    if (memorySessions[snapshot.session.policyVersionId]) {
      return { inserted:false, reason:'already_persisted', policyVersionId: snapshot.session.policyVersionId, sessionId: memorySessions[snapshot.session.policyVersionId].sessionId };
    }
  memorySessions[snapshot.session.policyVersionId] = { policyVersionId: snapshot.session.policyVersionId, sessionId: snapshot.session.sessionId, startedAt: snapshot.session.startedAt, finishedAt: snapshot.session.finishedAt, totalAdjustments: snapshot.session.totalAdjustments, estimationUsed: snapshot.session.estimationUsed };
  memorySnapshots[snapshot.session.policyVersionId] = snapshot;
    return { inserted:true, policyVersionId: snapshot.session.policyVersionId, sessionId: snapshot.session.sessionId };
  }
  const { session, adjustments, lineage, telemetryCounters } = snapshot;
  if (!session?.policyVersionId) return { inserted:false, reason:'missing_policy_version' };
  // Idempotency: check existing policyVersionId
  const existing = await (db as any).select({ id: explainabilitySessions.id, sessionId: explainabilitySessions.sessionId })
    .from(explainabilitySessions)
    .where((await import('drizzle-orm')).eq(explainabilitySessions.policyVersionId, session.policyVersionId))
    .limit(1);
  if (existing.length) return { inserted:false, reason:'already_persisted', policyVersionId: session.policyVersionId, sessionId: existing[0].sessionId };

  // Insert session
  await (db as any).insert(explainabilitySessions).values({
    sessionId: session.sessionId,
    policyVersionId: session.policyVersionId,
    constraintsHash: session.constraintsHash,
    adjustedHash: session.adjustedHash,
    totalAdjustments: session.totalAdjustments,
    estimationUsed: session.estimationUsed,
    startedAt: new Date(session.startedAt),
    finishedAt: session.finishedAt ? new Date(session.finishedAt) : null,
    telemetryCounters: telemetryCounters || {},
    sessionNodes: lineage?.nodes || [],
    meta: { schemaVersion: snapshot.schemaVersion }
  });

  if (adjustments?.length) {
    const rows = adjustments.map(a => ({
      sessionId: session.sessionId,
      constraintId: a.constraintId,
      action: a.action,
      originalExpression: a.originalExpression,
      adjustedExpression: a.adjustedExpression,
      violationDelta: a.violationDelta ?? null,
      feasibilityDelta: a.feasibilityDelta ?? null,
      estimationMode: a.estimationMode,
      avgSegmentDeltaPct: a.segments?.length ? avg(a.segments.map((s:any)=> s.deltaPct).filter((x:number)=> typeof x==='number')) : null,
      segments: a.segments || []
    }));
    if (rows.length) await (db as any).insert(explainabilityAdjustments).values(rows);
  }

  if (lineage?.edges?.length) {
    const edges = lineage.edges.map(e => ({
      sessionId: session.sessionId,
      fromNode: e.from,
      toNode: e.to,
      edgeType: e.type,
      meta: e
    }));
    if (edges.length) await (db as any).insert(explainabilityLineageEdges).values(edges);
  }

  return { inserted:true, policyVersionId: session.policyVersionId, sessionId: session.sessionId };
}

function avg(arr: number[]): number | null { if(!arr.length) return null; return arr.reduce((a,b)=>a+b,0)/arr.length; }
