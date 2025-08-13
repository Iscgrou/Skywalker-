// Iteration 23: Governance Alert Acknowledgement Service
// وظیفه: مدیریت Ack/Unack و متریک‌های SLA (MTTA) با fallback حافظه‌ای اگر DB در دسترس نباشد.
// طراحی: Idempotent ack (Unique alert_id) + متریک‌های پنجره‌ای.

import { db } from '../db.ts';
import { aiGovernanceAlerts, aiGovernanceAlertAcks } from '../../shared/schema.ts';
import { governanceAlertEscalationService } from './strategy-governance-alert-escalation-service.ts';
import { and, eq, gte, lte, inArray } from 'drizzle-orm';
import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts';

function hasDb() { return !!process.env.DATABASE_URL; }

// Memory fallback structures
interface MemAck { alertId: number; alertTimestamp: string; severity: string; dedupGroup?: string|null; acknowledgedAt: string; acknowledgedBy?: string; note?: string; meta?: any; }
const memoryAcks = new Map<number, MemAck>();

export interface AckResult { alertId: number; acknowledgedAt: string; alreadyAcked?: boolean; acknowledgedBy?: string; note?: string; }
export interface UnackResult { alertId: number; changed: boolean; }
export interface AckMetricsResult { window: { from: string; to: string; durationMs: number }; counts: any; mtta: { avgMs: number; p95Ms: number; samples: number }; ackRate: number; staleCritical: any[]; openCriticalCount: number; severityBreakdown?: { severity:string; total:number; acked:number; ackRate:number; mttaAvgMs:number; mttaP95Ms:number; }[] }

export const strategyGovernanceAlertAckService = {
  async ackAlert(params: { alertId: number; actor?: string; note?: string; meta?: any }) : Promise<AckResult> {
  if (!params || typeof params.alertId !== 'number' || params.alertId < 0) throw new Error('alertId required');
    const actor = params.actor || 'system';
    // Memory fallback
    if (!hasDb()) {
      const existing = memoryAcks.get(params.alertId);
      if (existing) return { alertId: params.alertId, acknowledgedAt: existing.acknowledgedAt, alreadyAcked: true, acknowledgedBy: existing.acknowledgedBy, note: existing.note };
      // Try to pull corresponding alert record from memory store via index (synthetic id from query service)
      const memList = strategyGovernanceAlertStore.list({ limit: 2000 });
      // memory list returns ascending by timestamp; synthetic id used = index after sort asc in query mapping.
      const sorted = [...memList].sort((a,b)=> a.timestamp.localeCompare(b.timestamp));
      const base = sorted[params.alertId];
      const nowIso = new Date().toISOString();
      const rec: MemAck = { alertId: params.alertId, alertTimestamp: base? base.timestamp: nowIso, severity: base? base.severity: 'info', dedupGroup: base? `${base.strategy}|${base.id}|${base.message}`: undefined, acknowledgedAt: nowIso, acknowledgedBy: actor, note: params.note, meta: params.meta };
  memoryAcks.set(params.alertId, rec);
  // Escalation linkage (memory)
  await governanceAlertEscalationService.recordAcknowledgement(params.alertId, new Date(rec.acknowledgedAt));
      return { alertId: params.alertId, acknowledgedAt: rec.acknowledgedAt, acknowledgedBy: actor, note: params.note };
    }
    // DB path
    const rows = await (db as any).select({ id: aiGovernanceAlerts.id, alertTimestamp: aiGovernanceAlerts.alertTimestamp, severity: aiGovernanceAlerts.severity, dedupGroup: aiGovernanceAlerts.dedupGroup })
      .from(aiGovernanceAlerts).where(eq(aiGovernanceAlerts.id, params.alertId)).limit(1);
    if (!rows.length) throw new Error('ALERT_NOT_FOUND');
    const r = rows[0];
    try {
      const inserted = await (db as any).insert(aiGovernanceAlertAcks).values({
        alertId: r.id,
        alertTimestamp: r.alertTimestamp,
        severity: r.severity,
        dedupGroup: r.dedupGroup,
        acknowledgedBy: actor,
        note: params.note,
        meta: params.meta,
      }).returning({ id: aiGovernanceAlertAcks.id, acknowledgedAt: aiGovernanceAlertAcks.acknowledgedAt });
  const ackIso = (inserted[0].acknowledgedAt as Date).toISOString();
  await governanceAlertEscalationService.recordAcknowledgement(r.id, new Date(ackIso));
  return { alertId: r.id, acknowledgedAt: ackIso, acknowledgedBy: actor, note: params.note };
    } catch (e:any) {
      const existing = await (db as any).select({ id: aiGovernanceAlertAcks.id, acknowledgedAt: aiGovernanceAlertAcks.acknowledgedAt, acknowledgedBy: aiGovernanceAlertAcks.acknowledgedBy, note: aiGovernanceAlertAcks.note })
        .from(aiGovernanceAlertAcks).where(eq(aiGovernanceAlertAcks.alertId, r.id)).limit(1);
      if (existing.length) {
  const ackIso = (existing[0].acknowledgedAt as Date).toISOString();
  await governanceAlertEscalationService.recordAcknowledgement(r.id, new Date(ackIso));
  return { alertId: r.id, acknowledgedAt: ackIso, alreadyAcked: true, acknowledgedBy: existing[0].acknowledgedBy, note: existing[0].note };
      }
      throw e;
    }
  },
  async unackAlert(params: { alertId: number }): Promise<UnackResult> {
  if (!params || typeof params.alertId !== 'number' || params.alertId < 0) throw new Error('alertId required');
    if (!hasDb()) {
      const existed = memoryAcks.delete(params.alertId);
      return { alertId: params.alertId, changed: existed };
    }
    await (db as any).delete(aiGovernanceAlertAcks).where(eq(aiGovernanceAlertAcks.alertId, params.alertId));
    const existing = await (db as any).select({ id: aiGovernanceAlertAcks.id }).from(aiGovernanceAlertAcks).where(eq(aiGovernanceAlertAcks.alertId, params.alertId));
    const changed = existing.length === 0;
    return { alertId: params.alertId, changed };
  },
  async getAckState(alertIds: number[]): Promise<Record<number, { acknowledgedAt: string }>> {
    const out: Record<number, { acknowledgedAt: string }> = {};
    if (!alertIds || !alertIds.length) return out;
    if (!hasDb()) {
      alertIds.forEach(id => { const a = memoryAcks.get(id); if (a) out[id] = { acknowledgedAt: a.acknowledgedAt }; });
      return out;
    }
    const rows = await (db as any).select({ alertId: aiGovernanceAlertAcks.alertId, acknowledgedAt: aiGovernanceAlertAcks.acknowledgedAt })
      .from(aiGovernanceAlertAcks).where(inArray(aiGovernanceAlertAcks.alertId, alertIds));
    rows.forEach((r:any)=> { out[r.alertId] = { acknowledgedAt: (r.acknowledgedAt as Date).toISOString() }; });
    return out;
  },
  async getAckMetrics(params: { windowMs?: number; criticalStaleMs?: number; strategies?: string[]; includeSeverityBreakdown?: boolean } = {}) {
    const now = new Date();
    let windowMs = params.windowMs ?? 60*60*1000;
    const maxWindow = 30*24*60*60*1000; if (windowMs > maxWindow) windowMs = maxWindow;
    const from = new Date(now.getTime() - windowMs);
    const criticalStaleMs = params.criticalStaleMs ?? 60*60*1000;
    const counts = { total:0, acked:0, unacked:0, bySeverity: { info:0, warn:0, critical:0 } } as any;
    const mttaSamples: number[] = [];
    let openCriticalCount = 0; const staleCritical: any[] = [];
  if (!hasDb()) {
      const memAlerts = strategyGovernanceAlertStore.list({ limit: 2000 });
      const perSeverity: Record<string,{ total:number; acked:number; samples:number[] }> = {};
      memAlerts.forEach(a => {
        const ts = new Date(a.timestamp);
        if (ts < from || ts > now) return;
        counts.total++; counts.bySeverity[a.severity] = (counts.bySeverity[a.severity]||0)+1;
        const ack = memoryAcks.get((a as any).dbId || -1);
        if (ack) { counts.acked++; mttaSamples.push(Math.max(0, new Date(ack.acknowledgedAt).getTime() - ts.getTime())); }
        else { counts.unacked++; if (a.severity==='critical') { openCriticalCount++; if (now.getTime() - ts.getTime() > criticalStaleMs) staleCritical.push({ strategy:a.strategy, timestamp:a.timestamp, ageMs: now.getTime() - ts.getTime() }); } }
        const sev = a.severity;
        const bucket = perSeverity[sev] || { total:0, acked:0, samples:[] };
        bucket.total++;
        if (ack) { bucket.acked++; bucket.samples.push(Math.max(0, new Date(ack.acknowledgedAt).getTime() - ts.getTime())); }
        perSeverity[sev] = bucket;
      });
      const mttaAvg = mttaSamples.length? mttaSamples.reduce((s,x)=>s+x,0)/mttaSamples.length:0;
      const p95 = percentile(mttaSamples, 0.95);
      const ackRate = counts.total? counts.acked / counts.total : 0;
      let severityBreakdown: any[] | undefined;
      if (params.includeSeverityBreakdown) {
        severityBreakdown = Object.entries(perSeverity).map(([sev,v])=> ({
          severity: sev,
            total: v.total,
            acked: v.acked,
            ackRate: v.total? v.acked / v.total : 0,
            mttaAvgMs: v.samples.length? v.samples.reduce((s,x)=>s+x,0)/v.samples.length:0,
            mttaP95Ms: percentile(v.samples, 0.95)
        }));
      }
      return { window:{ from: from.toISOString(), to: now.toISOString(), durationMs: windowMs }, counts, mtta:{ avgMs: mttaAvg, p95Ms: p95, samples: mttaSamples.length }, ackRate, staleCritical, openCriticalCount, severityBreakdown };
    }
    const conds: any[] = [ gte(aiGovernanceAlerts.alertTimestamp, from), lte(aiGovernanceAlerts.alertTimestamp, now) ];
    if (params.strategies && params.strategies.length) conds.push(inArray(aiGovernanceAlerts.strategy, params.strategies.slice(0,20)));
    const rows = await (db as any).select({
      id: aiGovernanceAlerts.id,
      alertTimestamp: aiGovernanceAlerts.alertTimestamp,
      severity: aiGovernanceAlerts.severity,
      strategy: aiGovernanceAlerts.strategy,
      ackId: aiGovernanceAlertAcks.id,
      ackAt: aiGovernanceAlertAcks.acknowledgedAt,
    }).from(aiGovernanceAlerts)
      .leftJoin(aiGovernanceAlertAcks, eq(aiGovernanceAlerts.id, aiGovernanceAlertAcks.alertId))
      .where(and(...conds));
    const perSeverity: Record<string,{ total:number; acked:number; samples:number[] }> = {};
    rows.forEach((r:any)=>{
      counts.total++; counts.bySeverity[r.severity] = (counts.bySeverity[r.severity]||0)+1;
      const ts = new Date(r.alertTimestamp as any);
      if (r.ackId) { counts.acked++; const mtta = Math.max(0, new Date(r.ackAt as any).getTime() - ts.getTime()); mttaSamples.push(mtta); }
      else { counts.unacked++; if (r.severity==='critical') { openCriticalCount++; const age = now.getTime() - ts.getTime(); if (age > criticalStaleMs) staleCritical.push({ strategy:r.strategy, id:r.id, ageMs:age, timestamp: ts.toISOString() }); } }
      const sev = r.severity;
      const bucket = perSeverity[sev] || { total:0, acked:0, samples:[] };
      bucket.total++;
      if (r.ackId) { bucket.acked++; const mtta = Math.max(0, new Date(r.ackAt as any).getTime() - ts.getTime()); bucket.samples.push(mtta); }
      perSeverity[sev] = bucket;
    });
    const mttaAvg = mttaSamples.length? mttaSamples.reduce((s,x)=>s+x,0)/mttaSamples.length:0;
    const p95 = percentile(mttaSamples, 0.95);
    const ackRate = counts.total? counts.acked / counts.total : 0;
    let severityBreakdown: any[] | undefined;
    if (params.includeSeverityBreakdown) {
      severityBreakdown = Object.entries(perSeverity).map(([sev,v])=> ({
        severity: sev,
        total: v.total,
        acked: v.acked,
        ackRate: v.total? v.acked / v.total : 0,
        mttaAvgMs: v.samples.length? v.samples.reduce((s,x)=>s+x,0)/v.samples.length:0,
        mttaP95Ms: percentile(v.samples, 0.95)
      }));
    }
    return { window:{ from: from.toISOString(), to: now.toISOString(), durationMs: windowMs }, counts, mtta:{ avgMs: mttaAvg, p95Ms: p95, samples: mttaSamples.length }, ackRate, staleCritical, openCriticalCount, severityBreakdown };
  }
};

function percentile(arr: number[], p: number) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a,b)=>a-b);
  const idx = Math.min(sorted.length-1, Math.max(0, Math.ceil(p*sorted.length)-1));
  return sorted[idx];
}

if (process.env.RUN_GOV_ALERT_ACK_SMOKE==='1') {
  (async () => {
    console.log(await strategyGovernanceAlertAckService.getAckMetrics({}));
  })();
}
