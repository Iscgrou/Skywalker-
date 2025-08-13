import { v4 as uuid } from 'uuid';
import { db } from '../db';
import { aiDecisionLog } from '../../shared/schema';
import { desc, eq } from 'drizzle-orm';

interface LogStrategyDecisionParams {
  representativeId?: number;
  strategy: string;
  rationale: string[];
  repIntel?: any;
  correlationId?: string;
}

class AiDecisionLogService {
  private DEDUPE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  async logStrategyDecision(p: LogStrategyDecisionParams) {
    if (p.representativeId) {
      const recent = await db.select().from(aiDecisionLog)
        .where(eq(aiDecisionLog.decisionType as any, 'TASK_STRATEGY'))
        .orderBy(desc(aiDecisionLog.createdAt))
        .limit(1);
      const last = recent[0];
      if (last && last.representativeId === p.representativeId) {
        const lastTime = (last as any).createdAt?.getTime?.() || 0;
        if (Date.now() - lastTime < this.DEDUPE_WINDOW_MS && (last.reasoning === p.rationale.join(' | '))) {
          return { skipped: true, reason: 'deduped' };
        }
      }
    }

    const reasoning = p.rationale.join(' | ');
    let confidenceScore = 55;
    const repIntel = p.repIntel || {};
    if (repIntel.debtAnomaly) confidenceScore = 85;
    else if (repIntel.responseLatencyP90?.value != null && repIntel.responseLatencyP90.value > 3600) confidenceScore = 70;
    else if (repIntel.engagementScore?.value != null && repIntel.engagementScore.value < 40) confidenceScore = 60;
    const confidences: number[] = [];
    ['responseLatencyP90','engagementScore','followUpComplianceRate'].forEach(k=>{ const c = repIntel?.[k]?.confidence; if (typeof c === 'number' && c>0) confidences.push(c*100); });
    if (confidences.length) {
      const avg = confidences.reduce((a,b)=>a+b,0)/confidences.length;
      confidenceScore = Math.round((confidenceScore + avg)/2);
    }

    await db.insert(aiDecisionLog).values({
      decisionId: uuid(),
      decisionType: 'TASK_STRATEGY',
      representativeId: p.representativeId,
      inputData: { strategy: p.strategy, correlationId: p.correlationId, repIntelVersion: repIntel.aiContextVersion, snapshot: { debtAnomaly: repIntel.debtAnomaly, engagement: repIntel.engagementScore?.value, latencyP90: repIntel.responseLatencyP90?.value } },
      reasoning,
      confidenceScore,
      expectedOutcome: this.expectedOutcomeForStrategy(p.strategy),
      contextFactors: { rationale: p.rationale },
      alternativeOptions: ['RISK_MITIGATION','EXPEDITE','RE_ENGAGE','STEADY'].filter(s=> s!==p.strategy),
      culturalConsiderations: repIntel.cultural || null
    }).catch(e=> console.error('aiDecisionLog insert error', e));

    return { logged: true };
  }

  private expectedOutcomeForStrategy(strategy: string){
    switch(strategy){
      case 'RISK_MITIGATION': return 'کاهش ریسک بدهی و آغاز پیگیری مالی';
      case 'EXPEDITE': return 'کاهش زمان چرخه پاسخ و تسریع انجام کار';
      case 'RE_ENGAGE': return 'افزایش تعامل و جلوگیری از ریسک ریزش';
      default: return 'حفظ وضعیت پایدار و نظارت سبک';
    }
  }
}

export const aiDecisionLogService = new AiDecisionLogService();
