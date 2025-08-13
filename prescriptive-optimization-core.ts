/** Optimization Core (Iteration 37) */
import { DecisionVector, PolicyCandidate, ScenarioSet } from './prescriptive-types';

export interface OptimizationConfig {
  maxIterations: number;
}

export class OptimizationCore {
  constructor(private config: OptimizationConfig = { maxIterations: 30 }){}

  run(scenarios: ScenarioSet, evaluate:(d:DecisionVector)=>PolicyCandidate){
    const candidates: PolicyCandidate[] = [];
    let best: PolicyCandidate | null = null;
    for(let i=0;i<this.config.maxIterations;i++){
      const dv: DecisionVector = { dimensions: [Math.random(), Math.random()] };
      const pc = evaluate(dv);
      candidates.push(pc);
      if(!best || pc.aggregateScore>best.aggregateScore) best = pc;
    }
    return { best, candidates };
  }
}
