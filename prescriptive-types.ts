/**
 * PODSE Core Shared Types (Iteration 37)
 */
export interface ObjectiveSpec {
  id: string;
  type: 'maximize' | 'minimize';
  weight: number;
  metricSource: string; // e.g. 'revenue_uplift', 'cost_saving'
  transform?: string; // optional transformation description
}

export interface ConstraintSpec {
  id: string;
  type: 'HARD' | 'SOFT';
  expression: string; // human-readable or DSL placeholder
  penaltyFn?: string; // symbolic reference for penalty
  priority?: number;
  boundOverride?: number;
}

export interface ScenarioInstance {
  id: string;
  factors: Record<string, number>;
  weight: number;
  isStress?: boolean;
}

export interface ScenarioSet {
  id: string;
  horizon: string;
  strategy: string;
  scenarios: ScenarioInstance[];
  coverageEstimate: number; // 0..1
  tailAugmented: boolean;
}

export interface DecisionVector {
  dimensions: number[]; // placeholder numeric encoding
  meta?: Record<string, any>;
}

export interface PolicyCandidate {
  policyId: string;
  decision: DecisionVector;
  scoreVector: Record<string, number>; // objectiveId -> value
  aggregateScore: number;
  feasibility: boolean;
  robustness?: number;
  guardrailStatus?: 'PENDING' | 'PASS' | 'FAIL';
  sensitivityMap?: Record<string, number>;
}

export interface ParetoFrontierMeta {
  policies: PolicyCandidate[];
  hypervolume: number;
  diversity: number;
}

export interface PrescriptiveRequest {
  requestId: string;
  horizon: 'P7D' | 'P30D' | 'P90D';
  objectives: { id: string; weightOverride?: number }[];
  constraintsOverride?: { id: string; boundOverride?: number }[];
  scenarioConfig?: { samples?: number; strategy?: string };
  context?: { scenarioContextId?: string; strategicIntentTag?: string };
}

export interface ExplanationBundle {
  rationale: string;
  topBindingConstraints: string[];
  sensitivityHotspots: string[];
  riskProfile: { robustness: number; tailGap: number };
}

export interface PrescriptiveResponse {
  requestId: string;
  bestPolicy: PolicyCandidate | null;
  paretoFrontMeta: { size: number; hypervolume: number; diversity: number };
  explanations: ExplanationBundle;
  auditRef: { runId: string; snapshotHash: string | null };
  eventsEmitted: string[];
  metrics: Record<string, number>;
}
