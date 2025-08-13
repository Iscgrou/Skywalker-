/** Constraint & Feasibility Manager (Iteration 37) */
import { ConstraintSpec, DecisionVector } from './prescriptive-types';

export class ConstraintManager {
  private constraints: ConstraintSpec[] = [];
  register(c: ConstraintSpec){
    const e = this.constraints.find(x=>x.id===c.id);
    if(e) return; this.constraints.push(c);
  }
  list(){ return [...this.constraints]; }
  evaluate(decision: DecisionVector){
    // Placeholder: all constraints pass; simulate basic violation energy
    const violations: string[] = [];
    const violationEnergy = 0;
    const hardViolations = 0;
    const relaxed = 0;
    return { violations, violationEnergy, hardViolations, relaxed, feasible: hardViolations===0 };
  }
}
