// Phase 41c: Explainability Diff Service
// Compares two explainability snapshots (by policyVersionId) and produces structured diff.
import { getExplainabilitySessionFull } from './explainability-retrieval-service.ts';
import type { ExplainabilitySnapshot, TraceAdjustmentRecord } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';

export interface AdjustmentDiffEntry {
  constraintId: string;
  action: string;
  originalExpression?: string;
  adjustedExpression?: string;
  violationDelta?: number;
  feasibilityDelta?: number;
  estimationMode?: boolean;
}
export interface ModifiedAdjustmentDiffEntry extends AdjustmentDiffEntry {
  from: AdjustmentDiffEntry;
  to: AdjustmentDiffEntry;
  deltas: {
    violationDeltaDiff?: number;
    feasibilityDeltaDiff?: number;
    expressionChanged: boolean;
    actionChanged: boolean;
    estimationModeChanged: boolean;
  };
}
export interface ExplainabilityDiffResult {
  ok: boolean;
  reason?: string;
  meta?: any;
  adjustments?: {
    added: AdjustmentDiffEntry[];
    removed: AdjustmentDiffEntry[];
    modified: ModifiedAdjustmentDiffEntry[];
    unchangedSample?: AdjustmentDiffEntry[];
  };
  lineage?: {
    nodeCountDelta: number;
    edgeCountDelta: number;
    addedNodes: string[];
    removedNodes: string[];
    addedEdges: number;
    removedEdges: number;
    affectedConstraints: string[];
  };
}

export async function diffExplainability(fromPv: string | undefined, toPv: string | undefined, opts: { includeLineage?: boolean } = {}): Promise<ExplainabilityDiffResult> {
  if (process.env.PODSE_ROBUST_V1 !== 'true') return { ok:false, reason:'feature_flag_disabled' };
  if (!fromPv) return { ok:false, reason:'missing_from' };
  if (!toPv) return { ok:false, reason:'missing_to' };
  if (fromPv === toPv) return { ok:false, reason:'same_version' };

  const fromFull = await getExplainabilitySessionFull(fromPv);
  const toFull = await getExplainabilitySessionFull(toPv);
  if (!(fromFull as any).found) return { ok:false, reason:'missing_from' };
  if (!(toFull as any).found) return { ok:false, reason:'missing_to' };
  const fromSnap = (fromFull as any).snapshot as ExplainabilitySnapshot;
  const toSnap = (toFull as any).snapshot as ExplainabilitySnapshot;

  const diff = computeAdjustmentDiff(fromSnap, toSnap);
  const lineage = opts.includeLineage ? computeLineageDiff(fromSnap, toSnap) : undefined;

  return {
    ok:true,
    meta: buildMeta(fromSnap, toSnap, diff),
    adjustments: diff,
    lineage
  };
}

function buildMeta(fromSnap: ExplainabilitySnapshot, toSnap: ExplainabilitySnapshot, diff: any) {
  return {
    from: pickSessionMeta(fromSnap),
    to: pickSessionMeta(toSnap),
    summary: {
      adjustmentCountDelta: (toSnap.session.totalAdjustments||0) - (fromSnap.session.totalAdjustments||0),
      addedCount: diff.added.length,
      removedCount: diff.removed.length,
      modifiedCount: diff.modified.length,
      unchangedCount: (diff.unchangedSample?.length || 0),
      estimationStateChanged: fromSnap.session.estimationUsed !== toSnap.session.estimationUsed,
    }
  };
}
function pickSessionMeta(s: ExplainabilitySnapshot) {
  const m = s.session;
  return { policyVersionId: m.policyVersionId, totalAdjustments: m.totalAdjustments, estimationUsed: m.estimationUsed, startedAt: m.startedAt, finishedAt: m.finishedAt };
}

function toEntry(a: TraceAdjustmentRecord): AdjustmentDiffEntry {
  return {
    constraintId: a.constraintId,
    action: a.action,
    originalExpression: a.originalExpression,
    adjustedExpression: a.adjustedExpression,
    violationDelta: a.violationDelta,
    feasibilityDelta: a.feasibilityDelta,
    estimationMode: a.estimationMode
  };
}

function computeAdjustmentDiff(fromSnap: ExplainabilitySnapshot, toSnap: ExplainabilitySnapshot) {
  const fromMap: Record<string, TraceAdjustmentRecord> = {};
  const toMap: Record<string, TraceAdjustmentRecord> = {};
  fromSnap.adjustments.forEach(a=> { if (!fromMap[a.constraintId]) fromMap[a.constraintId] = a; });
  toSnap.adjustments.forEach(a=> { if (!toMap[a.constraintId]) toMap[a.constraintId] = a; });
  const fromKeys = new Set(Object.keys(fromMap));
  const toKeys = new Set(Object.keys(toMap));
  const added: AdjustmentDiffEntry[] = [];
  const removed: AdjustmentDiffEntry[] = [];
  const modified: ModifiedAdjustmentDiffEntry[] = [];
  const unchangedSample: AdjustmentDiffEntry[] = [];

  for (const k of toKeys) if (!fromKeys.has(k)) added.push(toEntry(toMap[k]));
  for (const k of fromKeys) if (!toKeys.has(k)) removed.push(toEntry(fromMap[k]));

  for (const k of toKeys) {
    if (!fromKeys.has(k)) continue;
    const f = fromMap[k]; const t = toMap[k];
    const expressionChanged = (f.originalExpression !== t.originalExpression) || (f.adjustedExpression !== t.adjustedExpression);
    const actionChanged = f.action !== t.action;
    const estimationModeChanged = f.estimationMode !== t.estimationMode;
    const violationDeltaDiff = safeNumberDiff(f.violationDelta, t.violationDelta);
    const feasibilityDeltaDiff = safeNumberDiff(f.feasibilityDelta, t.feasibilityDelta);
    const numericChanged = violationDeltaDiff !== undefined || feasibilityDeltaDiff !== undefined;
    if (expressionChanged || actionChanged || estimationModeChanged || numericChanged) {
      modified.push({
        constraintId: k,
        action: t.action,
        from: toEntry(f),
        to: toEntry(t),
        originalExpression: t.originalExpression,
        adjustedExpression: t.adjustedExpression,
        violationDelta: t.violationDelta,
        feasibilityDelta: t.feasibilityDelta,
        estimationMode: t.estimationMode,
        deltas: {
          violationDeltaDiff,
          feasibilityDeltaDiff,
          expressionChanged,
          actionChanged,
          estimationModeChanged
        }
      });
    } else if (unchangedSample.length < 5) {
      unchangedSample.push(toEntry(t));
    }
  }
  return { added, removed, modified, unchangedSample };
}

function safeNumberDiff(a?: number, b?: number) {
  if (typeof a === 'number' && typeof b === 'number') {
    const d = b - a;
    if (d !== 0) return d;
  }
  return undefined;
}

function computeLineageDiff(fromSnap: ExplainabilitySnapshot, toSnap: ExplainabilitySnapshot) {
  const fNodes = new Set(fromSnap.lineage.nodes.map(n=> n.id));
  const tNodes = new Set(toSnap.lineage.nodes.map(n=> n.id));
  const fEdges = new Set(fromSnap.lineage.edges.map(e=> edgeSig(e)));
  const tEdges = new Set(toSnap.lineage.edges.map(e=> edgeSig(e)));
  const addedNodes: string[] = []; const removedNodes: string[] = [];
  const addedEdgesS: string[] = []; const removedEdgesS: string[] = [];
  for (const n of tNodes) if (!fNodes.has(n)) addedNodes.push(n);
  for (const n of fNodes) if (!tNodes.has(n)) removedNodes.push(n);
  for (const e of tEdges) if (!fEdges.has(e)) addedEdgesS.push(e);
  for (const e of fEdges) if (!tEdges.has(e)) removedEdgesS.push(e);
  const affectedConstraints = new Set<string>();
  const collectConstraint = (id: string) => { if (id.startsWith('C_')) affectedConstraints.add(id.slice(2)); };
  [...addedNodes, ...removedNodes].forEach(n=> collectConstraint(n));
  [...addedEdgesS, ...removedEdgesS].forEach(sig=> {
    const parts = sig.split('|');
    if (parts.length===3) { collectConstraint(parts[0]); collectConstraint(parts[2]); }
  });
  return {
    nodeCountDelta: toSnap.lineage.nodes.length - fromSnap.lineage.nodes.length,
    edgeCountDelta: toSnap.lineage.edges.length - fromSnap.lineage.edges.length,
    addedNodes,
    removedNodes,
    addedEdges: addedEdgesS.length,
    removedEdges: removedEdgesS.length,
    affectedConstraints: Array.from(affectedConstraints)
  };
}
function edgeSig(e: any) { return `${e.from}|${e.type}|${e.to}`; }
