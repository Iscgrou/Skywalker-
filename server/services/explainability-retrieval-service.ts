// Phase 41b: Explainability Retrieval Service
// Provides unified retrieval over DB or in-memory fallback.
import { explainabilitySessions, explainabilityAdjustments, explainabilityLineageEdges } from '../../shared/schema.ts';
import { db } from '../db.ts';
import type { ExplainabilitySnapshot } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';
import { getMemorySnapshot, listMemoryExplainabilitySessions } from './explainability-persistence-service.ts';

interface ListOptions { limit?: number; afterSessionId?: string }
interface ListResult { sessions: any[]; nextCursor?: string }

const MAX_LIMIT = 100; const DEFAULT_LIMIT = 20;

export async function listExplainabilitySessions(opts: ListOptions = {}): Promise<ListResult | { reason: string }> {
  if (process.env.PODSE_ROBUST_V1 !== 'true') return { reason: 'feature_flag_disabled' };
  const limitRaw = (opts.limit && Number.isFinite(opts.limit)) ? opts.limit! : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(1, limitRaw), MAX_LIMIT);
  const memoryMode = !process.env.DATABASE_URL;
  if (memoryMode) {
    const sessions = listMemoryExplainabilitySessions(limit);
    return { sessions };
  }
  // DB path
  const rows = await (db as any).select({
    sessionId: explainabilitySessions.sessionId,
    policyVersionId: explainabilitySessions.policyVersionId,
    totalAdjustments: explainabilitySessions.totalAdjustments,
    estimationUsed: explainabilitySessions.estimationUsed,
    startedAt: explainabilitySessions.startedAt,
    finishedAt: explainabilitySessions.finishedAt
  }).from(explainabilitySessions)
    .orderBy((await import('drizzle-orm')).desc(explainabilitySessions.startedAt))
    .limit(limit);
  return { sessions: rows };
}

export async function getExplainabilitySessionMeta(policyVersionId: string): Promise<any> {
  if (process.env.PODSE_ROBUST_V1 !== 'true') return { reason:'feature_flag_disabled' };
  const memoryMode = !process.env.DATABASE_URL;
  if (memoryMode) {
    const snap = getMemorySnapshot(policyVersionId);
    if (!snap) return { found:false };
    const s = snap.session;
    return { found:true, session: { sessionId: s.sessionId, policyVersionId: s.policyVersionId, totalAdjustments: s.totalAdjustments, estimationUsed: s.estimationUsed, startedAt: s.startedAt, finishedAt: s.finishedAt } };
  }
  const row = await (db as any).select({
    sessionId: explainabilitySessions.sessionId,
    policyVersionId: explainabilitySessions.policyVersionId,
    totalAdjustments: explainabilitySessions.totalAdjustments,
    estimationUsed: explainabilitySessions.estimationUsed,
    startedAt: explainabilitySessions.startedAt,
    finishedAt: explainabilitySessions.finishedAt,
    sessionNodes: explainabilitySessions.sessionNodes
  }).from(explainabilitySessions)
    .where((await import('drizzle-orm')).eq(explainabilitySessions.policyVersionId, policyVersionId))
    .limit(1);
  if (!row.length) return { found:false };
  const r = row[0];
  return { found:true, session: { sessionId: r.sessionId, policyVersionId: r.policyVersionId, totalAdjustments: r.totalAdjustments, estimationUsed: r.estimationUsed, startedAt: r.startedAt, finishedAt: r.finishedAt } };
}

export async function getExplainabilitySessionFull(policyVersionId: string): Promise<any> {
  if (process.env.PODSE_ROBUST_V1 !== 'true') return { reason:'feature_flag_disabled' };
  const memoryMode = !process.env.DATABASE_URL;
  if (memoryMode) {
    const snap = getMemorySnapshot(policyVersionId);
    if (!snap) return { found:false };
    return { found:true, snapshot: snap };
  }
  const { eq } = await import('drizzle-orm');
  const rows = await (db as any).select().from(explainabilitySessions).where(eq(explainabilitySessions.policyVersionId, policyVersionId)).limit(1);
  if (!rows.length) return { found:false };
  const session = rows[0];
  const adjustments = await (db as any).select().from(explainabilityAdjustments).where(eq(explainabilityAdjustments.sessionId, session.sessionId));
  const edges = await (db as any).select().from(explainabilityLineageEdges).where(eq(explainabilityLineageEdges.sessionId, session.sessionId));
  const snapshot: ExplainabilitySnapshot = {
    schemaVersion: 'explain.v1',
    session: {
      sessionId: session.sessionId,
      policyVersionId: session.policyVersionId,
      constraintsHash: session.constraintsHash,
      adjustedHash: session.adjustedHash,
      totalAdjustments: session.totalAdjustments,
      estimationUsed: session.estimationUsed,
      startedAt: session.startedAt?.toISOString?.() || session.startedAt,
      finishedAt: session.finishedAt?.toISOString?.() || session.finishedAt
    },
    adjustments: adjustments.map((a:any)=> ({
      constraintId: a.constraintId,
      action: a.action,
      originalExpression: a.originalExpression,
      adjustedExpression: a.adjustedExpression,
      violationDelta: a.violationDelta ? Number(a.violationDelta) : undefined,
      feasibilityDelta: a.feasibilityDelta ? Number(a.feasibilityDelta) : undefined,
      estimationMode: a.estimationMode,
      segments: a.segments || []
    })),
  lineage: { nodes: session.sessionNodes || [], edges: edges.map((e:any)=> ({ from: e.fromNode, to: e.toNode, type: e.edgeType, meta: e.meta })), generatedAt: new Date().toISOString() },
    telemetryCounters: session.telemetryCounters || {}
  };
  return { found:true, snapshot };
}
