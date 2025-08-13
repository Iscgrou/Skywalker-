// Representative Intelligence Service - Fusion Engine (Tier 1 Skeleton)
import { db } from '../db';
import { representatives, payments, invoices, crmCulturalProfiles, taskEvents, representativeDebtSnapshots } from '../../shared/schema';
import { eq, desc, and, sql, gt, lt } from 'drizzle-orm';
import { RepresentativeProfile, RepresentativeProfileSchema } from '../../shared/representative-intelligence-contracts';
import { eventBus } from './event-bus';

interface CacheEntry { profile: RepresentativeProfile; ts: number; }
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<number, CacheEntry>();

function num(val: any, def=0){ const n= Number(val); return Number.isFinite(n)? n: def; }

export class RepresentativeIntelligenceService {
  invalidateProfile(id: number){
    cache.delete(id);
  }
  async getProfile(id: number): Promise<RepresentativeProfile | null> {
    const c = cache.get(id);
    if (c && Date.now() - c.ts < CACHE_TTL_MS) return c.profile;
    const profile = await this.recompute(id);
    return profile;
  }

  async getProfiles(ids: number[]): Promise<RepresentativeProfile[]> {
    const results: RepresentativeProfile[] = [];
    for (const id of ids) {
      const p = await this.getProfile(id); if (p) results.push(p);
    }
    return results;
  }

  async recompute(id: number): Promise<RepresentativeProfile | null> {
    const rep = await (db as any).query.representatives.findFirst({ where: eq(representatives.id, id) });
    if (!rep) return null;

  // Debt trend 7d: simple delta between debt now (rep.totalDebt) and 7d ago (approx by summing payments in that window) - placeholder heuristic
  // TODO: Replace with proper daily snapshot diff once snapshot table lands
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7*24*3600*1000);
  // Approximate: assume debt decreases by payments; gather last 7d payments
  const recentPayments = await db.select().from(payments).where(and(eq(payments.representativeId, id)));
  const last7dPaid = recentPayments.filter(p=> (p.createdAt && p.createdAt > sevenDaysAgo)).reduce((s,p)=> s + num(p.amount),0);
  const debt7dAgoApprox = num(rep.totalDebt) + last7dPaid; // if only decreases via payments
  const debtTrend7d = { value: debt7dAgoApprox? ( (num(rep.totalDebt) - debt7dAgoApprox) / debt7dAgoApprox * 100 ): 0, confidence: 0.3 };

    // Payments volatility
    const payments30 = await db.select().from(payments).where(eq(payments.representativeId, id));
    const amounts = payments30.map(p => num(p.amount));
    const mean = amounts.length ? amounts.reduce((a,b)=>a+b,0)/amounts.length : 0;
    const variance = amounts.length>1 ? amounts.reduce((s,a)=> s + Math.pow(a-mean,2),0)/(amounts.length-1) : 0;
    const stddev = Math.sqrt(variance);
    const paymentVolatility = { value: amounts.length>1? stddev : null, confidence: amounts.length>1? 0.6:0 };

    // Cultural profile (latest)
    const cult = await db.select().from(crmCulturalProfiles).where(eq(crmCulturalProfiles.representativeId, id));
    const latestCult = cult.sort((a,b)=> (b.lastAnalyzedAt?.getTime()||0)-(a.lastAnalyzedAt?.getTime()||0))[0];

    // Interaction latency & follow-up compliance (scoped by representativeId)
    const events = await db.select().from(taskEvents).where(eq(taskEvents.representativeId as any, id));
  let latencySum = 0, latencyCount = 0, followUpDue = 0, followUpDone = 0;
  const latencySamples: number[] = [];
    let lastInteractionAt: Date | null = null;
    const taskFirstAssign: Record<string, Date> = {};
    for (const ev of events) {
      if (ev.occurredAt && (!lastInteractionAt || ev.occurredAt > lastInteractionAt)) lastInteractionAt = ev.occurredAt;
      if (ev.type === 'FOLLOW_UP_DUE') followUpDue++;
      if (ev.type === 'FOLLOW_UP_DONE') followUpDone++;
      if (ev.type === 'TASK_CREATED' && ev.occurredAt) {
        taskFirstAssign[ev.taskId] = ev.occurredAt;
      } else if (ev.type === 'TASK_STATUS_CHANGED' && (ev.payload as any)?.to === 'COMPLETED' && ev.occurredAt) {
        const start = taskFirstAssign[ev.taskId];
        if (start) {
          const dur = (ev.occurredAt.getTime() - start.getTime())/1000; // seconds
          latencySum += dur;
          latencyCount++;
          latencySamples.push(dur);
        }
      }
    }
    latencySamples.sort((a,b)=> a-b);
    const p90 = latencySamples.length ? latencySamples[Math.min(latencySamples.length-1, Math.floor(latencySamples.length*0.9))] : null;
    const latencyConfidence = latencySamples.length >=5 ? 0.7 : latencySamples.length>=3 ? 0.4 : 0;
    const responseLatencyAvg = { value: latencyCount? latencySum/latencyCount : null, confidence: latencyConfidence };
    const responseLatencyP90 = { value: p90, confidence: latencyConfidence };
    const followUpComplianceRate = (followUpDue >=5) ? { value: (followUpDone/followUpDue*100), confidence: 0.6 } : { value: null, confidence: 0 };
    const inactivityDays = { value: lastInteractionAt? ( (now - lastInteractionAt.getTime())/(24*3600*1000) ): null, confidence: lastInteractionAt? 0.7: 0 };

    // Engagement score heuristic v2
    const recent30dPayments = recentPayments.filter(p=> p.createdAt && (now - p.createdAt.getTime()) < 30*24*3600*1000);
    const recent7dPayments = recentPayments.filter(p=> p.createdAt && (now - p.createdAt.getTime()) < 7*24*3600*1000);
    const volume30d = recent30dPayments.reduce((s,p)=> s + num(p.amount),0);
    const volume7d = recent7dPayments.reduce((s,p)=> s + num(p.amount),0);
    // momentum ratio 7d vs 30d portion
    const momentum = volume30d? (volume7d / volume30d) : 0;
    let engagementVal: number | null = null;
    if (inactivityDays.value != null) {
      const inactivityPenalty = inactivityDays.value != null ? 4 * Math.log1p(inactivityDays.value as number) * 5 : 0; // scaled log penalty
      const paymentMomentumBoost = Math.min(25, (volume7d/5000)*15 + momentum*10);
      const followUpBoost = (followUpComplianceRate.value != null && (followUpComplianceRate.value as number) >= 80) ? 5 : (followUpComplianceRate.value != null && (followUpComplianceRate.value as number) >=60 ? 2 : 0);
      const volatilityPenalty = paymentVolatility.value != null ? Math.min(10, (paymentVolatility.value as number)/1000 * 10) : 0;
      engagementVal = Math.max(0, 70 + paymentMomentumBoost + followUpBoost - inactivityPenalty - volatilityPenalty);
    }
    const engagementScore = { value: engagementVal, confidence: engagementVal!=null? 0.5: 0 };
    const churnRiskScore = { value: engagementScore.value!=null? 100 - engagementScore.value : null, confidence: engagementScore.confidence };

    // Debt anomaly detection v3: use snapshots if sufficient
    const snapshots = await db.select().from(representativeDebtSnapshots)
      .where(eq(representativeDebtSnapshots.representativeId, id))
      .orderBy(desc(representativeDebtSnapshots.date))
      .limit(30);
    let debtAnomaly = false; let debtAnomalyFactor: number | null = null;
    if (snapshots.length >=5) {
      const series = snapshots.map(s=> num(s.totalDebt));
      const meanDebt = series.reduce((a,b)=>a+b,0)/series.length;
      const varianceDebt = series.reduce((s,a)=> s + Math.pow(a-meanDebt,2),0)/series.length;
      const stdDebt = Math.sqrt(varianceDebt);
      if (stdDebt > 0) {
        debtAnomalyFactor = (num(rep.totalDebt) - meanDebt) / stdDebt; // z-score
        debtAnomaly = debtAnomalyFactor >= 2.0;
      } else {
        // flat series: treat large jump as anomaly if >50% over mean
        debtAnomalyFactor = meanDebt ? num(rep.totalDebt)/meanDebt : null;
        debtAnomaly = debtAnomalyFactor != null && debtAnomalyFactor > 1.5;
      }
    } else {
      // insufficient snapshots: do not flag anomaly (factor remains null)
      debtAnomaly = false;
      debtAnomalyFactor = null;
    }

    // alternativeProfilesCount placeholder: count of cultural profiles - 1 (if >1 variants exist)
    const alternativeProfilesCount = Math.max(0, (cult.length || 0) - 1);

  // Determine context version bump: rep-intel-v5 when debtAnomaly evaluated AND latency & engagement computed (even if not triggering strategy)
  const hasLatency = responseLatencyP90.value != null;
  const hasEngagement = engagementScore.value != null;
  const contextVersion = (hasLatency && hasEngagement) ? 'rep-intel-v5' : 'rep-intel-v3';

  const profile: RepresentativeProfile = {
      id: rep.id,
      code: rep.code,
      name: rep.name,
      isActive: !!rep.isActive,
      debt: num(rep.totalDebt),
      sales: num(rep.totalSales),
  debtAnomaly,
  debtAnomalyFactor: Number.isFinite(debtAnomalyFactor as any)? debtAnomalyFactor : null,
      debtTrend7d,
      paymentVolatility,
  responseLatencyAvg,
  responseLatencyP90,
      followUpComplianceRate,
      inactivityDays,
      engagementScore,
      churnRiskScore,
      lastInteractionAt: lastInteractionAt? lastInteractionAt.toISOString(): null,
      cultural: {
        communicationStyle: latestCult?.communicationStyle || null,
        motivationFactors: latestCult?.motivationFactors as any || null,
        recommendedApproach: latestCult?.recommendedApproach || null,
        confidence: latestCult ? num(latestCult.confidence)/100 : 0
      },
      alternativeProfilesCount,
      offers: {
        lastOfferId: null,
        lastOfferOutcome: null,
        offerConversionRate: { value: null, confidence: 0 },
        topEffectiveOffers: []
      },
  aiContextVersion: contextVersion
    };

    const parsed = RepresentativeProfileSchema.safeParse(profile);
    if (!parsed.success) {
      console.error('RepresentativeProfile validation failed', parsed.error.format());
      return null;
    }
    cache.set(id, { profile, ts: Date.now() });
    return profile;
  }
}

export const representativeIntelligenceService = new RepresentativeIntelligenceService();

// Event subscriptions for cache invalidation (Iteration 5)
eventBus.subscribe('task.event.appended', (ev: any) => {
  if (ev?.representativeId) representativeIntelligenceService.invalidateProfile(ev.representativeId);
});

eventBus.subscribe('rep.snapshot.captured', (payload: any) => {
  if (payload?.representativeId) representativeIntelligenceService.invalidateProfile(payload.representativeId);
});
