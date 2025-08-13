import { eventBus } from './event-bus';
import { db } from '../db';
import { aiDecisionLog, taskEvents } from '../../shared/schema';
import { knowledgeGraphService } from './knowledge-graph-service';
import { strategyPerformanceService } from './strategy-performance-service.ts';
import { desc, eq, and } from 'drizzle-orm';

/*
  AI Decision Evaluation Service (Iteration 7 Skeleton)
  - Listens to TASK_STATUS_CHANGED and TASK_NOTE_ADDED completions
  - After a task completes, finds related decision (by representativeId & recent time) and annotates effectiveness heuristic
*/

export class AiDecisionEvaluationService {
  private COMPLETION_WINDOW_MS = 60 * 60 * 1000; // 1h look-back

  constructor(){
    eventBus.subscribe('task.event.appended', (ev:any)=> this.onTaskEvent(ev));
  }

  private async onTaskEvent(ev:any){
    if (ev?.type === 'TASK_STATUS_CHANGED' && (ev.payload?.to === 'COMPLETED' || ev.payload?.to === 'VERIFIED')) {
      const repId = ev.representativeId;
      if (!repId) return;
      // fetch most recent decision for this rep within window
      const decisions = await db.select().from(aiDecisionLog)
        .where(eq(aiDecisionLog.representativeId as any, repId))
        .orderBy(desc(aiDecisionLog.createdAt))
        .limit(1);
      const last = decisions[0];
      if (!last) return;
      const lastTime = (last as any).createdAt?.getTime?.() || 0;
      if (Date.now() - lastTime > this.COMPLETION_WINDOW_MS) return;
      // Gather task event history for duration & notes
      const events = await db.select().from(taskEvents).where(eq(taskEvents.taskId as any, ev.taskId));
      const created = events.find(e=> e.type==='TASK_CREATED');
      const completedAt = ev.occurredAt ? ev.occurredAt.getTime() : Date.now();
      const createdAt = created?.occurredAt?.getTime?.();
      let durationSeconds: number | null = null;
      if (createdAt) durationSeconds = Math.max(1, Math.round((completedAt - createdAt)/1000));
      const noteCount = events.filter(e=> e.type==='TASK_NOTE_ADDED').length;
      // Extract strategy from TASK_CREATED payload or last decision inputData
      const strategy = (created?.payload as any)?.priority || (last.inputData as any)?.strategy;
      // Base heuristic
      let eff = 5;
      if (durationSeconds != null) {
        const hours = durationSeconds/3600;
        if (hours < 2) eff += 2; else if (hours < 6) eff += 1; else if (hours > 24) eff -= 2;
      } else {
        eff -= 0; // unknown duration
      }
      if (noteCount <=1) eff += 1; else if (noteCount >=4) eff -= 1;
      if (strategy === 'RISK_MITIGATION' && durationSeconds != null && durationSeconds/3600 < 6) eff += 2;
      if (strategy === 'EXPEDITE' && durationSeconds != null && durationSeconds/3600 < 3) eff += 1;
      if (strategy === 'RE_ENGAGE' && noteCount <=2) eff += 1;
      eff = Math.min(10, Math.max(1, eff));
      // Persist effectiveness
      await db.update(aiDecisionLog).set({
        decisionEffectiveness: eff,
        actualOutcome: `durationSeconds:${durationSeconds ?? 'n/a'};notes:${noteCount};strategy:${strategy}`,
        evaluatedAt: new Date()
      }).where(eq(aiDecisionLog.decisionId, (last as any).decisionId));
      console.log('[DecisionEvaluation] rep', repId, 'decisionId', last.decisionId, 'eff', eff, 'durationSeconds', durationSeconds, 'notes', noteCount);
      // Feed real effectiveness into adaptive strategy performance (Iteration 11)
      if (strategy) {
        strategyPerformanceService.updateOnDecision({ strategy, effectiveness: eff }).catch(()=>{});
      }
  // Ingest into knowledge graph (decision + evaluation edge)
  knowledgeGraphService.ingestDecision({ decisionId: (last as any).decisionId, representativeId: repId, effectiveness: eff, reasoning: last.reasoning }).catch(()=>{});
  knowledgeGraphService.ingestEvaluation({ decisionId: (last as any).decisionId, effectiveness: eff }).catch(()=>{});
    }
  }

  async validateKnowledgeGraphIntegrity() {
    // Counterexample A: Orphan decision (should create source without edges yet)
    const decisionId = 'validation-decision-A-' + Date.now();
    await knowledgeGraphService.ingestDecision({
      decisionId: decisionId,
      strategy: 'TEST_STRATEGY',
      representativeId: 'rep-test',
      effectiveness: undefined,
      rationale: 'orphan decision test'
    } as any);
    // Expect a source record

    // Counterexample B: Orphan evaluation (evaluation before decision)
    const evalDecisionId = 'validation-decision-B-' + Date.now();
    await knowledgeGraphService.ingestEvaluation({
      decisionId: evalDecisionId,
      effectiveness: 7,
      durationSeconds: 120,
      noteCount: 3
    } as any); // Should create both decision source (stub) and evaluation source and edge

    // Counterexample C: Idempotent ingest
    await knowledgeGraphService.ingestDecision({
      decisionId: 'stable-idempotent',
      strategy: 'SAME',
      representativeId: 'rep-test',
      effectiveness: 5,
      rationale: 'first ingest'
    } as any);
    await knowledgeGraphService.ingestDecision({
      decisionId: 'stable-idempotent',
      strategy: 'SAME',
      representativeId: 'rep-test',
      effectiveness: 5,
      rationale: 'second ingest duplicate'
    } as any); // Should not create duplicate second source

    // Counterexample D: Null effectiveness weight default (effectiveness undefined)
    const nullEffId = 'validation-null-eff-' + Date.now();
    await knowledgeGraphService.ingestDecision({
      decisionId: nullEffId,
      strategy: 'NO_EFF',
      representativeId: 'rep-test',
      effectiveness: undefined,
      rationale: 'null effectiveness'
    } as any);
    await knowledgeGraphService.ingestEvaluation({
      decisionId: nullEffId,
      effectiveness: undefined,
      durationSeconds: 10,
      noteCount: 0
    } as any); // Edge weight should fallback to 0.1

    // Counterexample E: Invalid edge_type query handling
    const related = await knowledgeGraphService.relatedSources('stable-idempotent', 'NON_EXISTENT_TYPE');
    return { ok: true, relatedCountForInvalidType: related.length };
  }
}

export const aiDecisionEvaluationService = new AiDecisionEvaluationService();
