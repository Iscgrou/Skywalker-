// R1.3: Explainability Redaction Service
// Provides tiered redaction for explainability snapshots & diff results.
// Levels:
//  - minimal: only session meta & counts (no expressions / deltas / lineage details)
//  - partial: hide raw expressions & sensitive hashes; keep numeric deltas & actions
//  - full: original snapshot (no redaction)
// Role default mapping (least privilege):
//  VIEWER -> minimal, AUDITOR -> partial, ANALYST -> full, ADMIN/SUPER_ADMIN -> full, CRM_MANAGER -> partial, CRM -> minimal

import type { ExplainabilitySnapshot, TraceAdjustmentRecord } from '../../shared/prescriptive/prescriptive-trace-recorder.ts';
import type { ExplainabilityDiffResult, AdjustmentDiffEntry, ModifiedAdjustmentDiffEntry } from './explainability-diff-service.ts';
import type { Role } from '../../shared/rbac';

export type RedactionLevel = 'full' | 'partial' | 'minimal';

export function defaultRedactionForRole(role: Role | undefined): RedactionLevel {
  switch(role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
    case 'ANALYST': return 'full';
    case 'AUDITOR':
    case 'CRM_MANAGER': return 'partial';
    case 'VIEWER':
    case 'CRM':
    default: return 'minimal';
  }
}

interface RedactionMeta { level: RedactionLevel; removedExpressions?: number; removedHashes?: number; trimmedLineage?: boolean; hiddenFields?: string[]; }

export function redactSnapshot(snapshot: ExplainabilitySnapshot, level: RedactionLevel): { snapshot: any; redaction: RedactionMeta } {
  if (level === 'full') return { snapshot, redaction: { level:'full' } };
  let removedExpressions = 0; let removedHashes = 0; let trimmedLineage = false; const hiddenFields: string[] = [];
  const baseSession = { ...snapshot.session } as any;
  if (level === 'partial' || level === 'minimal') {
    if (baseSession.constraintsHash) { delete baseSession.constraintsHash; removedHashes++; hiddenFields.push('session.constraintsHash'); }
    if (baseSession.adjustedHash) { delete baseSession.adjustedHash; removedHashes++; hiddenFields.push('session.adjustedHash'); }
  }
  const redactAdj = (a: TraceAdjustmentRecord): any => {
    if (level === 'partial') {
      const copy: any = { constraintId: a.constraintId, action: a.action, violationDelta: a.violationDelta, feasibilityDelta: a.feasibilityDelta, estimationMode: a.estimationMode };
      if (a.originalExpression) { removedExpressions++; hiddenFields.push('adjustments.originalExpression'); }
      if (a.adjustedExpression) { removedExpressions++; hiddenFields.push('adjustments.adjustedExpression'); }
      return copy;
    }
    // minimal
    const copy: any = { constraintId: a.constraintId, action: a.action };
    if (a.violationDelta !== undefined || a.feasibilityDelta !== undefined) {
      // hide numeric detail entirely in minimal mode
      hiddenFields.push('adjustments.violationDelta');
      hiddenFields.push('adjustments.feasibilityDelta');
    }
    if (a.originalExpression) { removedExpressions++; hiddenFields.push('adjustments.originalExpression'); }
    if (a.adjustedExpression) { removedExpressions++; hiddenFields.push('adjustments.adjustedExpression'); }
    return copy;
  };
  const adjustments = snapshot.adjustments.map(a=> redactAdj(a as any));
  let lineage: any = undefined;
  if (snapshot.lineage) {
    if (level === 'partial') {
      // keep topology but strip meta payload inside edges; unknown node shape so copy only id
      lineage = { nodes: snapshot.lineage.nodes.map((n: any)=> ({ id: n.id })), edges: snapshot.lineage.edges.map((e: any)=> ({ from: e.from, to: e.to, type: e.type })), generatedAt: (snapshot.lineage as any).generatedAt };
      trimmedLineage = true; hiddenFields.push('lineage.edges.meta');
    } else if (level === 'minimal') {
      lineage = { nodeCount: snapshot.lineage.nodes.length, edgeCount: snapshot.lineage.edges.length };
      trimmedLineage = true; hiddenFields.push('lineage.nodes'); hiddenFields.push('lineage.edges');
    }
  }
  let telemetryCounters: any = {};
  if ((level as any) === 'full') telemetryCounters = snapshot.telemetryCounters; else hiddenFields.push('telemetryCounters');
  const redacted = { schemaVersion: snapshot.schemaVersion, session: baseSession, adjustments, lineage, telemetryCounters };
  return { snapshot: redacted, redaction: { level, removedExpressions, removedHashes, trimmedLineage, hiddenFields: Array.from(new Set(hiddenFields)) } };
}

export function redactDiffResult(diff: ExplainabilityDiffResult, level: RedactionLevel): { diff: any; redaction: RedactionMeta } {
  if (level === 'full') return { diff, redaction: { level:'full' } };
  let removedExpressions = 0; const hiddenFields: string[] = []; let trimmedLineage = false;
  const redactEntry = (e: AdjustmentDiffEntry): AdjustmentDiffEntry => {
    if (level === 'partial') {
      const r: AdjustmentDiffEntry = { constraintId: e.constraintId, action: e.action, violationDelta: e.violationDelta, feasibilityDelta: e.feasibilityDelta, estimationMode: (e as any).estimationMode };
      if ((e as any).originalExpression) { removedExpressions++; hiddenFields.push('diff.adjustments.originalExpression'); }
      if ((e as any).adjustedExpression) { removedExpressions++; hiddenFields.push('diff.adjustments.adjustedExpression'); }
      return r;
    }
    // minimal
    const r: AdjustmentDiffEntry = { constraintId: e.constraintId, action: e.action };
    if ((e as any).originalExpression) { removedExpressions++; hiddenFields.push('diff.adjustments.originalExpression'); }
    if ((e as any).adjustedExpression) { removedExpressions++; hiddenFields.push('diff.adjustments.adjustedExpression'); }
    return r;
  };
  const redactModified = (m: ModifiedAdjustmentDiffEntry): ModifiedAdjustmentDiffEntry => {
    const base: any = { constraintId: m.constraintId, action: m.action, deltas: { actionChanged: m.deltas.actionChanged, estimationModeChanged: m.deltas.estimationModeChanged } };
    if (level === 'partial') {
      base.violationDelta = m.violationDelta; base.feasibilityDelta = m.feasibilityDelta;
      if (m.deltas.violationDeltaDiff !== undefined) base.deltas.violationDeltaDiff = m.deltas.violationDeltaDiff;
      if (m.deltas.feasibilityDeltaDiff !== undefined) base.deltas.feasibilityDeltaDiff = m.deltas.feasibilityDeltaDiff;
    }
    return base as ModifiedAdjustmentDiffEntry;
  };
  const adj = diff.adjustments ? {
    added: diff.adjustments.added.map(a=> redactEntry(a)),
    removed: diff.adjustments.removed.map(a=> redactEntry(a)),
    modified: diff.adjustments.modified.map(m=> redactModified(m as any)),
    unchangedSample: []
  } : undefined;
  let lineage = diff.lineage;
  if (diff.lineage) {
    if (level === 'partial') {
      lineage = { ...diff.lineage, addedNodes: diff.lineage.addedNodes.length, removedNodes: diff.lineage.removedNodes.length } as any;
      trimmedLineage = true; hiddenFields.push('diff.lineage.addedNodes'); hiddenFields.push('diff.lineage.removedNodes');
    } else if (level === 'minimal') {
      lineage = { nodeCountDelta: diff.lineage.nodeCountDelta, edgeCountDelta: diff.lineage.edgeCountDelta } as any;
      trimmedLineage = true; hiddenFields.push('diff.lineage.*');
    }
  }
  return { diff: { ...diff, adjustments: adj, lineage }, redaction: { level, removedExpressions, trimmedLineage, hiddenFields: Array.from(new Set(hiddenFields)) } };
}
