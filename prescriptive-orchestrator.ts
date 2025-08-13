/** Prescriptive Orchestrator (Iteration 37) */
import { ObjectiveRegistry } from './prescriptive-objective-registry';
import { ConstraintManager } from './prescriptive-constraint-manager';
import { ScenarioSandbox } from './prescriptive-scenario-sandbox';
import { OptimizationCore } from './prescriptive-optimization-core';
import { ParetoFrontierBuilder } from './prescriptive-pareto-frontier';
import { GuardrailsEngine } from './prescriptive-guardrails';
import { ExplanationEngine } from './prescriptive-explanation';
import { PrescriptiveRequest, PrescriptiveResponse, PolicyCandidate } from './prescriptive-types';

export class PrescriptiveEngine {
  objectives = new ObjectiveRegistry();
  constraints = new ConstraintManager();
  sandbox = new ScenarioSandbox();
  optimizer = new OptimizationCore();
  frontier = new ParetoFrontierBuilder();
  guardrails = new GuardrailsEngine();
  explain = new ExplanationEngine();
  private initialized=false;
  private lastRun: { runId: string; frontierSize: number; hypervolume: number; diversity: number; bestPolicyId?: string } | null = null;

  async initialize(){
    if(this.initialized) return;
    // baseline objectives & constraints
    this.objectives.register({ id:'value', type:'maximize', weight:0.6, metricSource:'revenue_uplift' });
    this.objectives.register({ id:'cost', type:'minimize', weight:0.4, metricSource:'operational_cost' });
    this.constraints.register({ id:'budget_cap', type:'HARD', expression:'cost <= 100000' });
    this.initialized = true;
  }

  async prescribe(req: PrescriptiveRequest): Promise<PrescriptiveResponse>{
    if(!this.initialized) throw new Error('PrescriptiveEngine not initialized');
    const sc = this.sandbox.generate(req.horizon, req.scenarioConfig?.strategy || 'triangular', req.scenarioConfig?.samples || 50);
    const { best, candidates } = this.optimizer.run(sc, (d)=>this.evaluateDecision(d));
    const frontierMeta = this.frontier.build(candidates);
    const guard = best ? this.guardrails.evaluate(best) : { status:'PASS', reasons:[] };
  if(best) best.guardrailStatus = guard.status as 'PASS'|'PENDING'|'FAIL';
    const explanation = this.explain.build(best);
    const runId = 'RUN_'+Date.now();
    this.lastRun = { runId, frontierSize: frontierMeta.policies.length, hypervolume: frontierMeta.hypervolume, diversity: frontierMeta.diversity, bestPolicyId: best?.policyId };
    return {
      requestId: req.requestId,
      bestPolicy: best||null,
      paretoFrontMeta: { size: frontierMeta.policies.length, hypervolume: frontierMeta.hypervolume, diversity: frontierMeta.diversity },
      explanations: explanation,
      auditRef: { runId, snapshotHash: null },
      eventsEmitted: [],
      metrics: { scenarioCoverage: sc.coverageEstimate }
    };
  }

  private evaluateDecision(decision:any): PolicyCandidate {
    // Placeholder scoring
    const scoreVector = { value: Math.random()*100, cost: Math.random()*50 };
    const aggregateScore = scoreVector.value - scoreVector.cost*0.5;
    return { policyId: 'pol_'+Math.random().toString(36).slice(2), decision, scoreVector, aggregateScore, feasibility:true };
  }

  getStatus(): PrescriptiveStatus {
    return {
      initialized: this.initialized,
      objectives: this.objectives.snapshotWeights(),
      constraints: this.constraints.list().length,
      lastRun: this.lastRun
    };
  }
}

export interface PrescriptiveStatus {
  initialized: boolean;
  objectives: { id: string; weight: number }[];
  constraints: number;
  lastRun: { runId: string; frontierSize: number; hypervolume: number; diversity: number; bestPolicyId?: string } | null;
}


// Global singleton for early experimentation
if(!(globalThis as any).PrescriptiveEngine){
  (globalThis as any).PrescriptiveEngine = new PrescriptiveEngine();
}
