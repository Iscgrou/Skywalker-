// Iteration 22: Governance Alert Query & Analytics Service
// وظیفه: استخراج فهرست هشدارها + محاسبه متریک‌های تحلیلی پنجره‌ای بدون تغییر وضعیت.
// وابستگی: جدول ai_governance_alerts (Iteration 21) در shared/schema.

import { and, desc, asc, gte, lte, inArray, lt, gt, eq, or } from 'drizzle-orm';
import { db } from '../db.ts';
import { aiGovernanceAlerts } from '../../shared/schema.ts';
import { ensureDb } from '../db.ts';
import { strategyGovernanceAlertStore } from './strategy-governance-alert-store.ts';

type Severity = 'info' | 'warn' | 'critical';

export interface QueryAlertsInput {
  strategies?: string[];
  severities?: Severity[];
  alertIds?: string[];
  from?: string; // ISO
  to?: string;   // ISO
  limit?: number;
  order?: 'asc' | 'desc';
  cursor?: string; // Base64(JSON)
  includeContext?: boolean;
  includeRationale?: boolean;
  includeAckState?: boolean; // Iteration 24: اختیاری برای Projection وضعیت Ack
  includeEscalationState?: boolean; // Iteration 25: Projection وضعیت Escalation
  includeSuppressionState?: boolean; // Iteration 26: Projection وضعیت Suppression
}

export interface QueryAlertsResult {
  items: any[];
  pageInfo: { nextCursor?: string; hasMore: boolean };
  meta: any;
}

interface CursorShape { ts: string; id: number; dir: 'asc'|'desc'; }

function encodeCursor(c: CursorShape): string { return Buffer.from(JSON.stringify(c)).toString('base64'); }
function decodeCursor(s?: string): CursorShape | undefined {
  if (!s) return; try { const j = JSON.parse(Buffer.from(s, 'base64').toString()); if (j && j.ts && j.id!=null && (j.dir==='asc'||j.dir==='desc')) return j; } catch(_) {} return; }

const MAX_LIMIT = 500; const DEFAULT_LIMIT = 100; const MAX_WINDOW_DAYS = 14;

export async function queryAlerts(input: QueryAlertsInput = {}): Promise<QueryAlertsResult> {
  const now = new Date();
  let { strategies, severities, alertIds, from, to, limit, order='desc', cursor, includeContext=false, includeRationale=false, includeAckState=false, includeEscalationState=false, includeSuppressionState=false } = input;
  limit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  let dbAvailable = !!process.env.DATABASE_URL;
  // window defaults (24h if none)
  let fromDate = from ? new Date(from) : new Date(now.getTime() - 24*60*60*1000);
  let toDate = to ? new Date(to) : now;
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) throw new Error('Invalid from/to');
  if (fromDate > toDate) throw new Error('from > to');
  if ((toDate.getTime()-fromDate.getTime()) > MAX_WINDOW_DAYS*24*60*60*1000) { fromDate = new Date(toDate.getTime() - MAX_WINDOW_DAYS*24*60*60*1000); }
  if (strategies && strategies.length===0) return { items: [], pageInfo:{ hasMore:false }, meta:{ windowFrom: fromDate.toISOString(), windowTo: toDate.toISOString(), filtersApplied: { emptyStrategies:true } } };
  if (strategies && strategies.length>20) strategies = strategies.slice(0,20);
  // Memory fallback path
  if (!dbAvailable) {
    const all = strategyGovernanceAlertStore.list({ limit: 2000 });
    let arr = all.filter(r => {
      const ts = new Date(r.timestamp).getTime();
      return ts >= fromDate.getTime() && ts <= toDate.getTime();
    });
    if (strategies) arr = arr.filter(r => strategies!.includes(r.strategy));
    if (severities) arr = arr.filter(r => severities!.includes(r.severity as any));
    if (alertIds) arr = arr.filter(r => alertIds!.includes(r.id));
    arr.sort((a,b)=> order==='desc'? b.timestamp.localeCompare(a.timestamp): a.timestamp.localeCompare(b.timestamp));
    // Synthetic numeric id for stable pagination
  const withIdx = arr.map((r,i)=> ({ idx:i, r }));
    const cur = decodeCursor(cursor);
    let filtered = withIdx;
    if (cur) {
      filtered = withIdx.filter(x => {
        const condTs = x.r.timestamp.localeCompare(cur.ts);
        if (order==='desc') {
          return (condTs < 0) || (condTs===0 && x.idx < cur.id);
        } else {
          return (condTs > 0) || (condTs===0 && x.idx > cur.id);
        }
      });
    }
    const slice = filtered.slice(0, limit);
    const hasMore = filtered.length > limit;
    let nextCursor: string | undefined;
    if (hasMore && slice.length) {
      const last = slice[slice.length-1];
      nextCursor = encodeCursor({ ts: last.r.timestamp, id: last.idx, dir: order });
    }
  let items = slice.map(x => ({ id: (x.r as any)._memId ?? x.idx, alertTimestamp: x.r.timestamp, generatedAt: x.r.governanceGeneratedAt, strategy: x.r.strategy, alertId: x.r.id, severity: x.r.severity, message: x.r.message, hash: x.r.hash, dedupGroup: `${x.r.strategy}|${x.r.id}|${x.r.message}` }));
    if (includeAckState) {
      const { strategyGovernanceAlertAckService } = await import('./strategy-governance-alert-ack-service.ts');
        const ackMap = await strategyGovernanceAlertAckService.getAckState(items.map((i: any) => i.id));
      items = items.map(it => {
        const ack = ackMap[it.id];
        if (!ack) return { ...it, ack:{ acknowledged:false } };
        const mtta = Math.max(0, new Date(ack.acknowledgedAt).getTime() - new Date(it.alertTimestamp).getTime());
        return { ...it, ack:{ acknowledged:true, acknowledgedAt: ack.acknowledgedAt, mttaMs: mtta } };
      });
    }
    if (includeEscalationState) {
      const { governanceAlertEscalationService } = await import('./strategy-governance-alert-escalation-service.ts');
      const escMap = await governanceAlertEscalationService.getEscalationState(items.map((i:any)=> i.id));
        items = items.map((it: any) => ({ ...it, escalation: escMap[it.id] || { escalated:false } }));
    }
    if (includeSuppressionState) {
      try {
        const { governanceAlertSuppressionService } = await import('./strategy-governance-alert-suppression-service.ts');
        items = items.map((it: any) => {
          const supp = governanceAlertSuppressionService.getSuppressionState(it.dedupGroup || `${it.strategy}|${it.alertId}|${it.message}`);
          return { ...it, suppression: supp };
        });
      } catch { /* optional */ }
    }
    return {
      items,
      pageInfo: { hasMore, nextCursor },
      meta: { windowFrom: fromDate.toISOString(), windowTo: toDate.toISOString(), filtersApplied:{ strategies, severities, alertIds }, order, fallback:true, ackProjection: includeAckState, escalationProjection: includeEscalationState, suppressionProjection: includeSuppressionState }
    };
  }

  const c = decodeCursor(cursor);
  const conds: any[] = [ gte(aiGovernanceAlerts.alertTimestamp, fromDate), lte(aiGovernanceAlerts.alertTimestamp, toDate) ];
  if (strategies) conds.push(inArray(aiGovernanceAlerts.strategy, strategies));
  if (severities) conds.push(inArray(aiGovernanceAlerts.severity, severities));
  if (alertIds) conds.push(inArray(aiGovernanceAlerts.alertId, alertIds));
  if (c) {
    const cts = new Date(c.ts);
    if (!isNaN(cts.getTime())) {
      if (c.dir==='desc') {
        conds.push(or(
          lt(aiGovernanceAlerts.alertTimestamp, cts),
            and(eq(aiGovernanceAlerts.alertTimestamp, cts), lt(aiGovernanceAlerts.id, c.id))
        ));
      } else {
        conds.push(or(
          gt(aiGovernanceAlerts.alertTimestamp, cts),
            and(eq(aiGovernanceAlerts.alertTimestamp, cts), gt(aiGovernanceAlerts.id, c.id))
        ));
      }
    }
  }

  const baseCols: any = {
    id: aiGovernanceAlerts.id,
    alertTimestamp: aiGovernanceAlerts.alertTimestamp,
    generatedAt: aiGovernanceAlerts.generatedAt,
    strategy: aiGovernanceAlerts.strategy,
    alertId: aiGovernanceAlerts.alertId,
    severity: aiGovernanceAlerts.severity,
    message: aiGovernanceAlerts.message,
    hash: aiGovernanceAlerts.hash,
    dedupGroup: aiGovernanceAlerts.dedupGroup,
  };
  if (includeRationale) baseCols.rationale = aiGovernanceAlerts.rationale;
  if (includeContext) baseCols.context = aiGovernanceAlerts.context;

  const orderBy = order==='desc' ? [ desc(aiGovernanceAlerts.alertTimestamp), desc(aiGovernanceAlerts.id) ] : [ asc(aiGovernanceAlerts.alertTimestamp), asc(aiGovernanceAlerts.id) ];
  const rows = await (db as any).select(baseCols).from(aiGovernanceAlerts).where(and(...conds)).orderBy(...orderBy).limit(limit + 1);
  const hasMore = rows.length > limit;
  const slice = rows.slice(0, limit);
  let nextCursor: string | undefined;
  if (hasMore && slice.length) {
    const last = slice[slice.length-1];
    const tsIso = (last.alertTimestamp as any)?.toISOString?.() || new Date(last.alertTimestamp as any).toISOString();
    nextCursor = encodeCursor({ ts: tsIso, id: last.id, dir: order });
  }

  let items = slice.map((r: any) => ({ ...r, alertTimestamp: (r.alertTimestamp as any)?.toISOString?.() || new Date(r.alertTimestamp as any).toISOString(), generatedAt: (r.generatedAt as any)?.toISOString?.() || new Date(r.generatedAt as any).toISOString() }));
  if (includeAckState) {
    const { strategyGovernanceAlertAckService } = await import('./strategy-governance-alert-ack-service.ts');
      const ackMap = await strategyGovernanceAlertAckService.getAckState(items.map((i: any) => i.id));
  items = items.map((it: any) => {
      const ack = ackMap[it.id];
      if (!ack) return { ...it, ack:{ acknowledged:false } };
      const mtta = Math.max(0, new Date(ack.acknowledgedAt).getTime() - new Date(it.alertTimestamp).getTime());
      return { ...it, ack:{ acknowledged:true, acknowledgedAt: ack.acknowledgedAt, mttaMs: mtta } };
    });
  }
  if (includeEscalationState) {
    const { governanceAlertEscalationService } = await import('./strategy-governance-alert-escalation-service.ts');
    const escMap = await governanceAlertEscalationService.getEscalationState(items.map((i:any)=> i.id));
      items = items.map((it: any) => ({ ...it, escalation: escMap[it.id] || { escalated:false } }));
  }
  if (includeSuppressionState) {
    try {
      const { governanceAlertSuppressionService } = await import('./strategy-governance-alert-suppression-service.ts');
      items = items.map((it: any) => {
        const supp = governanceAlertSuppressionService.getSuppressionState(it.dedupGroup || `${it.strategy}|${it.alertId}|${it.message}`);
        return { ...it, suppression: supp };
      });
    } catch { /* optional */ }
  }
  return {
    items,
    pageInfo: { hasMore, nextCursor },
    meta: { windowFrom: fromDate.toISOString(), windowTo: toDate.toISOString(), filtersApplied: { strategies, severities, alertIds }, order, ackProjection: includeAckState, escalationProjection: includeEscalationState, suppressionProjection: includeSuppressionState }
  };
}

export interface AlertAnalyticsInput { strategies?: string[]; windowMs?: number; now?: Date; }
export interface AlertAnalyticsResult { window: any; counts: any; strategyBreakdown: any[]; dedupEffectiveness: any; lastCriticalAgoMs?: number; volatility: any; mix: any; anomalySignals?: any; }

export async function computeAlertAnalytics(input: AlertAnalyticsInput = {}): Promise<AlertAnalyticsResult> {
  const now = input.now ?? new Date();
  const windowMs = input.windowMs ?? 60*60*1000;
  const from = new Date(now.getTime() - windowMs);
  let strategies = input.strategies; if (strategies && strategies.length>20) strategies = strategies.slice(0,20);
  let dbAvailable = true;
  try { if (!process.env.DATABASE_URL) throw new Error('no db env'); } catch { dbAvailable = false; }
  if (!dbAvailable) {
    // Memory fallback
    const mem = strategyGovernanceAlertStore.list({ limit: 1000 });
    const rows = mem.filter(r => new Date(r.timestamp).getTime() >= from.getTime() && new Date(r.timestamp).getTime() <= now.getTime() && (!strategies || strategies.includes(r.strategy)) ).map(r => ({
      id: -1,
      strategy: r.strategy,
      alertId: r.id,
      severity: r.severity,
      alertTimestamp: r.timestamp,
      hash: r.hash
    }));
    // reuse reduction logic (inline minimal)
    const counts = { info:0, warn:0, critical:0 }; let total=0; const perStrategy = new Map<string,{ total:number; critical:number; lastCriticalAt?: Date; hashes:Set<string> }>(); const distinctHash = new Set<string>(); let lastCriticalAt: Date | undefined;
    rows.forEach((r: any)=>{ total++; counts[r.severity as Severity]++; const ps = perStrategy.get(r.strategy)||{ total:0, critical:0, lastCriticalAt:undefined, hashes:new Set<string>() }; ps.total++; ps.hashes.add(r.hash); if (r.severity==='critical'){ ps.critical++; const ts=new Date(r.alertTimestamp); ps.lastCriticalAt=ts; if(!lastCriticalAt||ts>lastCriticalAt) lastCriticalAt=ts;} perStrategy.set(r.strategy, ps); distinctHash.add(r.hash); });
    const raw=total, distinct=distinctHash.size, ratio= raw===0?1:distinct/raw;
    const strategyBreakdown=Array.from(perStrategy.entries()).map(([strategy,v])=>({ strategy,total:v.total,critical:v.critical,lastCriticalAt:v.lastCriticalAt?.toISOString(),densityPerHour:v.total/(windowMs/3600000) }));
    strategyBreakdown.sort((a,b)=>b.total-a.total);
    const lastCriticalAgoMs= lastCriticalAt? now.getTime()-lastCriticalAt.getTime(): undefined;
    const mix={ criticalPct: raw?counts.critical/raw:0, warnPct: raw?counts.warn/raw:0, infoPct: raw?counts.info/raw:0 };
    const volatility={ avgPerStrategyPerHour: strategyBreakdown.length? (strategyBreakdown.reduce((s,x)=>s+x.densityPerHour,0)/strategyBreakdown.length):0, topStrategy:strategyBreakdown[0]?.strategy };
    const anomalySignals={ criticalSpike: mix.criticalPct>0.6 && counts.critical>=5, densitySpike: volatility.avgPerStrategyPerHour> (raw/windowMs*3600000)*1.5 };
    return { window:{ from: from.toISOString(), to: now.toISOString(), durationMs: windowMs }, counts:{ total:raw, bySeverity:counts }, strategyBreakdown, dedupEffectiveness:{ distinct, raw, ratio }, lastCriticalAgoMs, volatility, mix, anomalySignals };
  }

  // DB path (do not access db proxy until after env check)
  try { ensureDb(); } catch { dbAvailable = false; }
  if (!dbAvailable) {
    // safety double-fallback (should not reach)
    return { window:{ from: from.toISOString(), to: now.toISOString(), durationMs: windowMs }, counts:{ total:0, bySeverity:{ info:0,warn:0,critical:0 } }, strategyBreakdown:[], dedupEffectiveness:{ distinct:0, raw:0, ratio:1 }, lastCriticalAgoMs: undefined, volatility:{ avgPerStrategyPerHour:0, topStrategy:undefined }, mix:{ criticalPct:0, warnPct:0, infoPct:0 }, anomalySignals:{}, };
  }

  const conds: any[] = [ gte(aiGovernanceAlerts.alertTimestamp, from), lte(aiGovernanceAlerts.alertTimestamp, now) ];
  if (strategies) conds.push(inArray(aiGovernanceAlerts.strategy, strategies));

  const rows = await (db as any).select({
    id: aiGovernanceAlerts.id,
    strategy: aiGovernanceAlerts.strategy,
    alertId: aiGovernanceAlerts.alertId,
    severity: aiGovernanceAlerts.severity,
    alertTimestamp: aiGovernanceAlerts.alertTimestamp,
    hash: aiGovernanceAlerts.hash,
  }).from(aiGovernanceAlerts).where(and(...conds));

  const counts = { info:0, warn:0, critical:0 }; let total=0;
  const perStrategy = new Map<string,{ total:number; critical:number; lastCriticalAt?: Date; hashes:Set<string> }>();
  const distinctHash = new Set<string>();
  let lastCriticalAt: Date | undefined;
  rows.forEach((r: any) => {
    total++; counts[r.severity as Severity]++;
    const ps = perStrategy.get(r.strategy) || { total:0, critical:0, lastCriticalAt: undefined, hashes: new Set<string>() };
    ps.total++; ps.hashes.add(r.hash);
    if (r.severity==='critical') { ps.critical++; const ts = new Date(r.alertTimestamp as any); ps.lastCriticalAt = ts; if (!lastCriticalAt || ts>lastCriticalAt) lastCriticalAt = ts; }
    perStrategy.set(r.strategy, ps);
    distinctHash.add(r.hash);
  });
  const raw = total; const distinct = distinctHash.size; const ratio = raw===0? 1 : distinct/raw;
  const strategyBreakdown = Array.from(perStrategy.entries()).map(([strategy, v]) => ({ strategy, total: v.total, critical: v.critical, lastCriticalAt: v.lastCriticalAt?.toISOString(), densityPerHour: v.total / (windowMs/3600000) }));
  strategyBreakdown.sort((a,b)=> b.total - a.total);
  const lastCriticalAgoMs = lastCriticalAt ? (now.getTime() - lastCriticalAt.getTime()) : undefined;
  const mix = { criticalPct: raw? counts.critical/raw:0, warnPct: raw? counts.warn/raw:0, infoPct: raw? counts.info/raw:0 };
  const volatility = { avgPerStrategyPerHour: strategyBreakdown.length? (strategyBreakdown.reduce((s,x)=>s+x.densityPerHour,0)/strategyBreakdown.length):0, topStrategy: strategyBreakdown[0]?.strategy };
  const anomalySignals = { criticalSpike: mix.criticalPct>0.6 && counts.critical>=5, densitySpike: volatility.avgPerStrategyPerHour> (raw/windowMs*3600000)*1.5 };

  return {
    window: { from: from.toISOString(), to: now.toISOString(), durationMs: windowMs },
    counts: { total, bySeverity: counts },
    strategyBreakdown,
    dedupEffectiveness: { distinct, raw, ratio },
    lastCriticalAgoMs,
    volatility,
    mix,
    anomalySignals,
  };
}

if (process.env.RUN_GOV_ALERT_QUERY_SMOKE==='1') {
  (async () => {
    console.log(await queryAlerts({ limit:5 }));
    console.log(await computeAlertAnalytics({ windowMs: 3600000 }));
  })();
}
