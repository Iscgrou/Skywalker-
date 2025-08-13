/**
 * Phase 40 - Explainability Trace Recorder (MVP)
 */
import crypto from 'crypto';
import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';

export interface TraceSessionMeta {
  sessionId: string; startedAt: string; finishedAt?: string;
  policyVersionId?: string; constraintsHash?: string; adjustedHash?: string;
  totalAdjustments: number; estimationUsed: boolean;
}
export interface TraceAdjustmentRecord {
  recordId: string; sessionId: string; ts: string;
  constraintId: string; action: 'TIGHTEN'|'RELAX';
  originalExpression: string; adjustedExpression?: string;
  segments: { original: string; adjusted?: string; reasonSkipped?: string; oldValue?: number; newValue?: number; deltaPct?: number; }[];
  feasibilityDelta?: number; violationDelta?: number; estimationMode: boolean;
  notes?: string[]; priority?: number;
}
export interface LineageNode { id: string; kind: 'CONSTRAINT'|'SEGMENT'|'ACTION'|'EFFECT'; refId?: string; meta?: any; }
export interface LineageEdge { from: string; to: string; type: 'HAS_SEGMENT'|'APPLIED_AS'|'RESULTED_IN'; }
export interface LineageGraph { nodes: LineageNode[]; edges: LineageEdge[]; generatedAt: string; }
export interface ExplainabilitySnapshot { session: TraceSessionMeta; adjustments: TraceAdjustmentRecord[]; lineage: LineageGraph; telemetryCounters: Record<string, number>; schemaVersion: 'explain.v1'; }

class TraceRecorderCore {
  private currentSession: TraceSessionMeta | null = null;
  private records: TraceAdjustmentRecord[] = [];

  startSession(): TraceSessionMeta {
    const session: TraceSessionMeta = { sessionId: 'TS_'+Date.now().toString(36), startedAt: new Date().toISOString(), totalAdjustments: 0, estimationUsed: false };
    this.currentSession = session; this.records = [];
    PrescriptiveTelemetry.counter('explain.sessions.started',1);
    return session;
  }
  recordAdjustment(rec: Omit<TraceAdjustmentRecord,'recordId'|'sessionId'|'ts'>): TraceAdjustmentRecord | null {
    if(!this.currentSession) return null;
    const full: TraceAdjustmentRecord = { ...rec, recordId: 'TR_'+Math.random().toString(36).slice(2), sessionId: this.currentSession.sessionId, ts: new Date().toISOString() };
    this.records.push(full);
    this.currentSession.totalAdjustments = this.records.length;
    if (full.estimationMode) this.currentSession.estimationUsed = true;
    PrescriptiveTelemetry.counter('explain.trace.records',1);
    return full;
  }
  backfillDeltas(map: { [constraintId: string]: { feasibilityDelta?: number; violationDelta?: number } }) {
    for (const r of this.records) {
      const m = map[r.constraintId];
      if (m) { r.feasibilityDelta = m.feasibilityDelta ?? r.feasibilityDelta; r.violationDelta = m.violationDelta ?? r.violationDelta; }
    }
  }
  markAllRecordsEstimation() {
    if (!this.currentSession) return;
    let changed = false;
    for (const r of this.records) {
      if (!r.estimationMode) { r.estimationMode = true; changed = true; }
    }
    if (changed) this.currentSession.estimationUsed = true;
  }
  finalizePolicyVersion(constraints: { id:string; expression:string }[], adjustments: TraceAdjustmentRecord[]) {
    if(!this.currentSession) return;
    const constraintsHash = sha256Hex(constraints.map(c=> c.id+'|'+c.expression).sort().join('\n'));
    const adjustedHash = sha256Hex(adjustments.map(a=> a.constraintId+'|'+(a.adjustedExpression||a.originalExpression)).sort().join('\n'));
    const policyVersionId = sha256Hex(constraintsHash+':'+adjustedHash).slice(0,24);
    this.currentSession.constraintsHash = constraintsHash;
    this.currentSession.adjustedHash = adjustedHash;
    this.currentSession.policyVersionId = policyVersionId;
    this.currentSession.finishedAt = new Date().toISOString();
    PrescriptiveTelemetry.counter('explain.sessions.finished',1);
  }
  buildLineageGraph(): LineageGraph {
    const nodes: LineageNode[] = []; const edges: LineageEdge[] = [];
    const pushNode = (n: LineageNode) => { if(!nodes.find(x=>x.id===n.id)) nodes.push(n); };
    for (const r of this.records) {
      const cNodeId = 'C_'+r.constraintId;
      pushNode({ id: cNodeId, kind:'CONSTRAINT', refId: r.constraintId });
      const actionNodeId = 'A_'+r.recordId;
      pushNode({ id: actionNodeId, kind:'ACTION', refId: r.recordId, meta: { action: r.action, deltaPct: avgDelta(r.segments) } });
      edges.push({ from: cNodeId, to: actionNodeId, type:'APPLIED_AS' });
      r.segments.forEach((s,idx)=> {
        const segId = 'S_'+r.recordId+'_'+idx;
        pushNode({ id: segId, kind:'SEGMENT', meta: { original: s.original, adjusted: s.adjusted, reasonSkipped: s.reasonSkipped } });
        edges.push({ from: actionNodeId, to: segId, type:'HAS_SEGMENT' });
      });
      const effId = 'E_'+r.recordId;
      pushNode({ id: effId, kind:'EFFECT', meta: { feasibilityDelta: r.feasibilityDelta, violationDelta: r.violationDelta } });
      edges.push({ from: actionNodeId, to: effId, type:'RESULTED_IN' });
    }
    return { nodes, edges, generatedAt: new Date().toISOString() };
  }
  snapshot(): ExplainabilitySnapshot | null {
    if(!this.currentSession) return null;
    const lineage = this.buildLineageGraph();
    return { session: this.currentSession, adjustments: [...this.records], lineage, telemetryCounters: (PrescriptiveTelemetry as any).snapshot().counters || {}, schemaVersion:'explain.v1' };
  }
}

function sha256Hex(s: string): string { return crypto.createHash('sha256').update(s).digest('hex'); }
function avgDelta(segs: { deltaPct?: number }[]): number | undefined {
  const ds = segs.map(s=> s.deltaPct).filter((v): v is number => typeof v==='number' && !isNaN(v));
  if(!ds.length) return undefined;
  return ds.reduce((a,b)=>a+b,0)/ds.length;
}

export const PrescriptiveTraceRecorder = new TraceRecorderCore();
