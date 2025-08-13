// Iteration 25: Governance Alert Escalation Service (skeleton)
// مسئول: اجرای sweep دوره‌ای، Escalate کردن Alerts، و محاسبه ProjectionState
import { db, ensureDb } from '../db.ts';
import { aiGovernanceAlerts, aiGovernanceAlertEscalations } from '../../shared/schema.ts';
import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts';
import { eq, and, inArray, gt } from 'drizzle-orm';

interface EscalationConfig {
  runIntervalMs: number;
  baseSlaMs: Record<string, number>; // severity -> ms
  nMinSamples: number;
  cooldownMinMs: number;
  cooldownMaxMs: number;
  effectivenessWindowFactor: number; // 0..1
}

interface EscalationRecord {
  id: number;
  alertId: number;
  alertTimestamp: Date;
  severity: string;
  escalatedAt: Date;
  reasonCode: string;
  thresholdMs: number | null;
  ageMsAtEscalation: number | null;
  cooldownUntil: Date | null;
  ackAfterEscalationMs: number | null;
  meta: any;
  createdAt: Date;
}

export interface EscalationStateProjection {
  escalated: boolean;
  escalatedAt?: string;
  reason?: string;
  cooldownEndsAt?: string;
}

// Placeholder for MTTA samples integration
async function getSeverityMttaSamples(severity: string): Promise<number[]> {
  // TODO: integrate with ack metrics service
  return [];
}

function computeThreshold(severity: string, samples: number[], cfg: EscalationConfig): { threshold: number; guardband: number; base: number; usedDynamic: boolean } {
  const base = cfg.baseSlaMs[severity] ?? 5 * 60 * 1000;
  if (!samples || samples.length < cfg.nMinSamples) {
    return { threshold: base, guardband: Math.floor(base * 0.2), base, usedDynamic: false };
  }
  const sorted = [...samples].sort((a,b)=>a-b);
  const p75Idx = Math.min(sorted.length-1, Math.floor(sorted.length * 0.75));
  const p75 = sorted[p75Idx];
  const guardband = Math.max(Math.floor(p75 * 0.2), Math.floor(base * 0.1));
  const dynamic = p75 + guardband;
  const threshold = Math.max(base, dynamic);
  return { threshold, guardband, base, usedDynamic: true };
}

export class GovernanceAlertEscalationService {
  private cfg: EscalationConfig;
  constructor(cfg: EscalationConfig) { this.cfg = cfg; }
  private _memEsc: Map<number, EscalationRecord & { manual?: boolean }> = new Map();
  private _idSeq = 1;
  private isDbMode() { return !!process.env.DATABASE_URL && (strategyGovernanceAlertStore as any)._state?.mode === 'db'; }

  async escalateAlert(alertRow: any, reasonCode: string = 'STALE_UNACK', manual?: boolean) {
    const ageMs = Date.now() - new Date(alertRow.alertTimestamp).getTime();
    const samples = await getSeverityMttaSamples(alertRow.severity);
    const { threshold } = computeThreshold(alertRow.severity, samples, this.cfg);
    const cooldownMs = Math.min(Math.max(Math.floor(threshold * 0.5), this.cfg.cooldownMinMs), this.cfg.cooldownMaxMs);
    const cooldownUntil = new Date(Date.now() + cooldownMs);
    if (!this.isDbMode()) {
      // memory path
      const existing = this._memEsc.get(alertRow.id);
      if (existing && !manual) return existing;
      const rec: any = {
        id: this._idSeq++, alertId: alertRow.id, alertTimestamp: new Date(alertRow.alertTimestamp), severity: alertRow.severity,
        escalatedAt: new Date(), reasonCode, thresholdMs: threshold, ageMsAtEscalation: ageMs,
        cooldownUntil, ackAfterEscalationMs: null, meta: { manual: !!manual }, createdAt: new Date()
      };
      this._memEsc.set(alertRow.id, rec);
      return rec;
    }
    ensureDb();
    const existing = await (db as any).select().from(aiGovernanceAlertEscalations).where(eq(aiGovernanceAlertEscalations.alertId, alertRow.id)).limit(1);
    if (existing.length && !manual) return existing[0];
    const inserted = await (db as any).insert(aiGovernanceAlertEscalations).values({
      alertId: alertRow.id,
      alertTimestamp: alertRow.alertTimestamp,
      severity: alertRow.severity,
      reasonCode,
      thresholdMs: threshold,
      ageMsAtEscalation: ageMs,
      cooldownUntil,
      meta: { manual: !!manual }
    }).returning();
    return inserted[0];
  }

  async runSweep(now: Date = new Date()) {
    const escalated: EscalationRecord[] = [] as any;
    const severities = ['critical','high'];
    if (!this.isDbMode()) {
      const memAlerts = strategyGovernanceAlertStore.list({ limit: 1000 });
      for (let idx = 0; idx < memAlerts.length; idx++) {
        const a: any = memAlerts[idx];
        const memId = a._memId != null ? a._memId : idx;
        const severity = a.severity;
        if (!severities.includes(severity)) continue;
        const ageMs = now.getTime() - new Date(a.timestamp).getTime();
        const base = this.cfg.baseSlaMs[severity] ?? 300000;
        if (ageMs < base) continue;
        const samples = await getSeverityMttaSamples(severity);
        const { threshold } = computeThreshold(severity, samples, this.cfg);
        if (ageMs < threshold) continue;
  const rec = await this.escalateAlert({ id: memId, alertTimestamp: a.timestamp, severity }, 'STALE_UNACK');
        if (rec) escalated.push(rec as any);
      }
      return { escalatedCount: escalated.length, escalations: escalated };
    }
    ensureDb();
    const minBase = Math.min(...severities.map(s => this.cfg.baseSlaMs[s] ?? 300000));
    const _cutoff = new Date(now.getTime() - minBase); // placeholder optimization
    const candidates = await (db as any).select().from(aiGovernanceAlerts)
      .where(and(
        inArray(aiGovernanceAlerts.severity, severities as any),
        eq(aiGovernanceAlerts.acknowledged, false),
        gt(aiGovernanceAlerts.alertTimestamp, new Date(0))
      ));
    for (const c of candidates) {
      const ageMs = now.getTime() - new Date(c.alertTimestamp).getTime();
      const base = this.cfg.baseSlaMs[c.severity] ?? 300000;
      if (ageMs < base) continue;
      const samples = await getSeverityMttaSamples(c.severity);
      const { threshold } = computeThreshold(c.severity, samples, this.cfg);
      if (ageMs < threshold) continue;
      const rec = await this.escalateAlert(c, 'STALE_UNACK');
      if (rec) escalated.push(rec as any);
    }
    return { escalatedCount: escalated.length, escalations: escalated };
  }

  async getEscalationState(alertIds: number[]): Promise<Record<number, EscalationStateProjection>> {
    if (!alertIds.length) return {};
    if (!this.isDbMode()) {
      const map: Record<number, EscalationStateProjection> = {};
      for (const id of alertIds) {
        const r: any = this._memEsc.get(id);
        if (r) map[id] = { escalated: true, escalatedAt: r.escalatedAt.toISOString(), reason: r.reasonCode, cooldownEndsAt: r.cooldownUntil?.toISOString() };
      }
      return map;
    }
    ensureDb();
    const rows = await (db as any).select().from(aiGovernanceAlertEscalations).where(inArray(aiGovernanceAlertEscalations.alertId, alertIds));
    const map: Record<number, EscalationStateProjection> = {};
    for (const r of rows) {
      map[r.alertId] = {
        escalated: true,
        escalatedAt: r.escalatedAt?.toISOString(),
        reason: r.reasonCode || undefined,
        cooldownEndsAt: r.cooldownUntil?.toISOString()
      };
    }
    return map;
  }
  // Debug helper for memory mode to retrieve all escalations
  _debugAllMem() {
    if (this.isDbMode()) return [] as any[];
    return Array.from(this._memEsc.values()).map(r => ({ ...r, alertTimestampIso: r.alertTimestamp.toISOString() }));
  }

  async getEscalationMetrics(params: { windowMs?: number } = {}) {
    const now = new Date();
    const windowMs = Math.min(params.windowMs ?? 60*60*1000, 30*24*60*60*1000);
    const from = new Date(now.getTime() - windowMs);
    let rows: any[] = [];
    if (!this.isDbMode()) {
      rows = Array.from(this._memEsc.values());
    } else {
      ensureDb();
      rows = await (db as any).select({
        alertId: aiGovernanceAlertEscalations.alertId,
        escalatedAt: aiGovernanceAlertEscalations.escalatedAt,
        severity: aiGovernanceAlertEscalations.severity,
        ackAfterEscalationMs: aiGovernanceAlertEscalations.ackAfterEscalationMs,
        thresholdMs: aiGovernanceAlertEscalations.thresholdMs,
        ageMsAtEscalation: aiGovernanceAlertEscalations.ageMsAtEscalation
      }).from(aiGovernanceAlertEscalations);
    }
    rows = rows.filter(r => new Date(r.escalatedAt).getTime() >= from.getTime());
    const total = rows.length;
    let active = 0; const ackLags: number[] = []; let suspectedFalse = 0;
    for (const r of rows) {
      if (r.ackAfterEscalationMs == null) active++;
      else {
        ackLags.push(r.ackAfterEscalationMs);
        if (r.thresholdMs && r.ackAfterEscalationMs < Math.floor((r.thresholdMs * 0.2))) suspectedFalse++;
      }
    }
    const effectivenessWinFactor = this.cfg.effectivenessWindowFactor;
    let effectiveCount = 0;
    for (const r of rows) {
      if (r.ackAfterEscalationMs != null && r.thresholdMs) {
        const effWin = Math.floor(r.thresholdMs * effectivenessWinFactor);
        if (r.ackAfterEscalationMs <= effWin) effectiveCount++;
      }
    }
    const effectivenessRate = total? effectiveCount/total:0;
    const suspectedFalseRate = total? suspectedFalse/total:0;
    const meanLag = ackLags.length? ackLags.reduce((s,x)=>s+x,0)/ackLags.length:0;
    const p95Lag = percentileLocal(ackLags, 0.95);
    return {
      window: { from: from.toISOString(), to: now.toISOString(), durationMs: windowMs },
      totalEscalations: total,
      activeEscalations: active,
      effectivenessRate,
      suspectedFalseRate,
      meanAckAfterEscalationMs: meanLag,
      p95AckAfterEscalationMs: p95Lag
    };
  }
  async recordAcknowledgement(alertId: number, ackAt: Date) {
    if (!alertId && alertId!==0) return;
    if (!this.isDbMode()) {
      const rec: any = this._memEsc.get(alertId);
      if (rec && rec.ackAfterEscalationMs == null) {
        rec.ackAfterEscalationMs = Math.max(0, ackAt.getTime() - rec.escalatedAt.getTime());
      }
      return;
    }
    try {
      ensureDb();
      // Update only if null to preserve first ack latency
      await (db as any).execute(`UPDATE ai_governance_alert_escalations SET ack_after_escalation_ms = CASE WHEN ack_after_escalation_ms IS NULL THEN $1 ELSE ack_after_escalation_ms END WHERE alert_id = $2`, [0, alertId]);
      // Need escalatedAt to compute real delta; fetch if still null
      const row = await (db as any).select({ escalatedAt: aiGovernanceAlertEscalations.escalatedAt, ackAfterEscalationMs: aiGovernanceAlertEscalations.ackAfterEscalationMs })
        .from(aiGovernanceAlertEscalations).where(eq(aiGovernanceAlertEscalations.alertId, alertId)).limit(1);
      if (row.length) {
        const r = row[0];
        if (r.ackAfterEscalationMs == null) {
          const delta = Math.max(0, ackAt.getTime() - (r.escalatedAt as Date).getTime());
          await (db as any).execute(`UPDATE ai_governance_alert_escalations SET ack_after_escalation_ms = $1 WHERE alert_id = $2`, [delta, alertId]);
        }
      }
    } catch (e) {
      console.warn('recordAcknowledgement escalation update failed', e);
    }
  }
}

function percentileLocal(arr: number[], p: number) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a,b)=>a-b);
  const idx = Math.min(sorted.length-1, Math.max(0, Math.ceil(p*sorted.length)-1));
  return sorted[idx];
}

export const governanceAlertEscalationService = new GovernanceAlertEscalationService({
  runIntervalMs: 60000,
  baseSlaMs: { critical: 5*60*1000, high: 15*60*1000 },
  nMinSamples: 8,
  cooldownMinMs: 2*60*1000,
  cooldownMaxMs: 30*60*1000,
  effectivenessWindowFactor: 0.8
});
