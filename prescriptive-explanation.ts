/** Prescriptive Insight Generator (Iteration 37) */
import { ExplanationBundle, PolicyCandidate } from './prescriptive-types';

export class ExplanationEngine {
  build(policy: PolicyCandidate | null): ExplanationBundle {
    if(!policy){
      return { rationale: 'NO_POLICY', topBindingConstraints: [], sensitivityHotspots: [], riskProfile: { robustness: 0, tailGap: 0 } };
    }
    return {
      rationale: 'BASELINE_PLACEHOLDER',
      topBindingConstraints: [],
      sensitivityHotspots: Object.keys(policy.sensitivityMap||{}).slice(0,3),
      riskProfile: { robustness: policy.robustness||0, tailGap: 0 }
    };
  }
}
