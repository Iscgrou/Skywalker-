// AI Orchestration Core - Skeleton (Tier 1)
import { v4 as uuid } from 'uuid';
import { AiCommandEnvelope, AiCommandEnvelopeSchema, AiResponseEnvelope, AiResponseEnvelopeSchema, SupportedCommandNames, validateCommandPayload } from '../../shared/ai-contracts';
import { db } from '../db';
import { aiCommandLog } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { taskLifecycleService } from './task-lifecycle-service';
import { eventBus } from './event-bus';
import { representativeIntelligenceService } from './representative-intelligence-service';
import { aiDecisionLogService } from './ai-decision-log-service';
import { strategyPerformanceService } from './strategy-performance-service.ts';

interface IssueResult { accepted: boolean; errors?: string[]; correlationId?: string; }

export class AiOrchestrationCore {
  private pending = new Map<string, { command: AiCommandEnvelope; issuedAt: number }>();
  private responders: Record<SupportedCommandNames, (payload: any, envelope: AiCommandEnvelope) => Promise<any>> = {
    'task.generate': async (p) => {
      // Enrich with representative intelligence context + adaptive strategy selection (Iteration 5)
      let repProfile: any = null;
      if ((p as any).representativeId != null) {
        repProfile = await representativeIntelligenceService.getProfile((p as any).representativeId).catch(()=>null);
      }
      // Derive strategy based on prioritized signals (anomaly > latency > engagement)
      let strategy = 'STEADY';
      const rationale: string[] = [];
      if (repProfile) {
        const anomaly = repProfile.debtAnomaly === true;
        const latency = repProfile.responseLatencyP90?.value != null ? repProfile.responseLatencyP90.value : null;
        const engagement = repProfile.engagementScore?.value != null ? repProfile.engagementScore.value : null;
        if (anomaly) { strategy = 'RISK_MITIGATION'; rationale.push('Debt anomaly detected (z-score >= 2)'); }
        else if (latency != null && latency > 3600) { strategy = 'EXPEDITE'; rationale.push('High P90 latency > 3600s'); }
        else if (engagement != null && engagement < 40) { strategy = 'RE_ENGAGE'; rationale.push('Low engagement score < 40'); }
        else { rationale.push('No critical signals; steady strategy'); }
        // If all three signals present, escalate rationale clarity
        if (anomaly && latency != null && engagement != null) {
          rationale.push('All key signals present (anomaly + latency + engagement)');
        }
      } else {
        rationale.push('Representative profile unavailable; default strategy');
      }
      // If still STEADY (no hard rule) -> apply adaptive weighting selection (Iteration 10)
      if (strategy === 'STEADY') {
        try {
          const selection = await strategyPerformanceService.selectStrategy({ /* seed optional for reproducibility */ });
          strategy = selection.strategy;
          rationale.push('Adaptive weighting applied (unified)', `Weights=${JSON.stringify(selection.weights)}`);
          rationale.push('adaptiveWeightExplain=' + JSON.stringify({selected: strategy, weight: selection.weights[strategy], detailVersion: selection.artifact.version}));
        } catch (e:any) {
          rationale.push('Adaptive weighting fallback (error)');
        }
      }
      const priorityMap: Record<string,string> = {
        RISK_MITIGATION: 'URGENT',
        EXPEDITE: 'HIGH',
        RE_ENGAGE: 'MEDIUM',
        STEADY: 'LOW'
      };
      const priority = priorityMap[strategy] || 'LOW';
      const draft = {
        title: `AI ${strategy.replace('_',' ')} Task`,
        description: 'Auto-generated task based on adaptive strategy',
        priority
      };
      return { taskDraft: draft, meta: { strategy, priority, rationale, repIntel: repProfile } };
    },
    'report.analyze': async (p) => ({ insights: ['stub'], nextContactDate: null }),
    'coaching.insight': async (p) => ({ strengths: [], weaknesses: [], guidance: [] })
  };

  issueCommand(name: SupportedCommandNames, payload: any, actor: AiCommandEnvelope['actor'] = 'SYSTEM'): IssueResult {
    const payloadValidation = validateCommandPayload(name, payload);
    if (!payloadValidation.success) {
      return { accepted: false, errors: payloadValidation.error.errors.map(e => e.message) };
    }
    const envelope: AiCommandEnvelope = {
      version: 'v1',
      correlationId: uuid(),
      issuedAt: new Date().toISOString(),
      command: name,
      actor,
      payload: payloadValidation.data
    };
    const envCheck = AiCommandEnvelopeSchema.safeParse(envelope);
    if (!envCheck.success) {
      return { accepted: false, errors: envCheck.error.errors.map(e => e.message) };
    }
    this.pending.set(envelope.correlationId, { command: envelope, issuedAt: Date.now() });
    // persist log (initial)
    db.insert(aiCommandLog).values({
      correlationId: envelope.correlationId,
      command: envelope.command,
      envelope: envelope as any,
      status: 'PENDING',
      validationPassed: true
    }).catch(e => console.error('ai_command_log insert error', e));
    eventBus.publish('ai.command.issued', envelope);
    // Immediate inline dispatch (placeholder for async model call)
    this.dispatch(envelope).catch(err => console.error('Dispatch error', err));
    return { accepted: true, correlationId: envelope.correlationId };
  }

  private async dispatch(envelope: AiCommandEnvelope) {
    const handler = this.responders[envelope.command as SupportedCommandNames];
    let responseBody: any;
    let status: AiResponseEnvelope['status'] = 'SUCCESS';
    let validation = { passed: true as const };
    try {
      responseBody = handler ? await handler(envelope.payload, envelope) : { error: 'NO_HANDLER' };
    } catch (e:any) {
      status = 'FAILED';
      responseBody = { error: e.message || 'unknown' };
      validation = { passed: false, errors: ['runtime-error'] } as any;
    }
    const response: AiResponseEnvelope = {
      version: 'v1',
      correlationId: envelope.correlationId,
      receivedAt: new Date().toISOString(),
      status,
      output: status === 'SUCCESS' ? responseBody : undefined,
      error: status === 'FAILED' ? responseBody.error : undefined,
      validation
    };
    const respCheck = AiResponseEnvelopeSchema.safeParse(response);
    if (!respCheck.success) {
      console.error('Response validation failed', respCheck.error.format());
    }
    // Side-effect: if task.generate success -> emit TASK_CREATED event via lifecycle service
    if (envelope.command === 'task.generate' && status === 'SUCCESS') {
      const taskId = `T-${envelope.correlationId.slice(0,8)}`;
      await taskLifecycleService.createTask({
        taskId,
        title: responseBody.taskDraft?.title || 'AI Task Draft',
        description: responseBody.taskDraft?.description || 'Generated by AI',
        representativeId: (envelope.payload as any).representativeId,
        assignedStaffId: 0,
        priority: responseBody.meta?.strategy || 'LOW',
        correlationId: envelope.correlationId
      }).catch(e => console.error('createTask error', e));
      // Log decision (strategy traceability)
      if ((envelope.payload as any).representativeId) {
        aiDecisionLogService.logStrategyDecision({
          representativeId: (envelope.payload as any).representativeId,
          strategy: responseBody.meta?.strategy,
          rationale: responseBody.meta?.rationale || [],
          repIntel: responseBody.meta?.repIntel,
          correlationId: envelope.correlationId
        }).catch(e=> console.error('decisionLog error', e));
      }
      // Feed performance service with placeholder effectiveness = null now (updated post evaluation later)
      strategyPerformanceService.updateOnDecision({ strategy: responseBody.meta?.strategy, effectiveness: null }).catch(()=>{});
    }
    eventBus.publish('ai.command.completed', response);
    // update log
  db.update(aiCommandLog).set({
      response: response as any,
      completedAt: new Date(),
      status: response.status,
      validationPassed: response.validation.passed
  }).where(eq(aiCommandLog.correlationId, envelope.correlationId)).catch(e => console.error('ai_command_log update error', e));
    this.pending.delete(envelope.correlationId);
  }
}

export const aiOrchestrationCore = new AiOrchestrationCore();
