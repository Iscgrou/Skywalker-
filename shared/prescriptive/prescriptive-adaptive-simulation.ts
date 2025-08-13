/**
 * Iteration 39c - Adaptive Simulation Engine (v0.1)
 * What-if غیرمخرب برای اعمال مجازی TIGHTEN / RELAX و محاسبه دلتاهای Feasibility / Frontier.
 */
import { ConstraintDefinition, evaluateConstraint } from './prescriptive-constraint-dsl.ts';
import { AdaptiveConstraintAction } from './prescriptive-adaptive-constraints.ts';
import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';
import { AxisSpec, computeFrontier, computeFrontierDiversity, FrontierResult } from './prescriptive-frontier.ts';
import { PrescriptiveTraceRecorder } from './prescriptive-trace-recorder.ts';

interface SimulationInputSample {
  scenarioId: string;
  metrics: Record<string, number | string | boolean | null | undefined>;
  baselineConstraints?: any[]; // Optional pre-evaluated results (not required)
}

export interface AdjustedConstraintSegment {
  original: string;
  adjusted?: string;
  reasonSkipped?: string;
  oldValue?: number;
  newValue?: number;
  deltaPct?: number;
  operator?: string;
}

export interface AdjustedConstraintPreview {
  id: string;
  originalExpression: string;
  adjustedExpression?: string;
  segments?: AdjustedConstraintSegment[];
  action?: 'TIGHTEN' | 'RELAX'; // محدود به دو حالت قابل تنظیم
  suggestedDelta?: number;
  applied: boolean;
  estimationMode: boolean;
  predictedViolationDelta?: number;
}

export interface SimulationAggregateDelta {
  feasibleRatioBefore?: number;
  feasibleRatioAfter?: number;
  feasibleRatioDelta?: number;
  frontierSizeBefore?: number;
  frontierSizeAfter?: number;
  frontierSizeDelta?: number;
  diversityBefore?: any;
  diversityAfter?: any;
  diversityDelta?: any;
}

export interface SimulationRunRequest {
  constraints: ConstraintDefinition[];
  adaptive: AdaptiveConstraintAction[];
  samples: SimulationInputSample[];
  frontierCandidates?: { id: string; metrics: Record<string, number>; }[];
  frontierAxes?: AxisSpec[];
}

export interface SimulationPreviewResult {
  generatedAt: string;
  adjustments: AdjustedConstraintPreview[];
  aggregate: SimulationAggregateDelta;
  notes: string[];
}

function featureEnabled(): boolean { return process.env.PODSE_ROBUST_V1 === 'true'; }

// --- Helpers ---
const UPPER_OPS = new Set(['<','<=']);
const LOWER_OPS = new Set(['>','>=']);

function parseAtomic(expr: string): { left: string; op: string; right: string } | undefined {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 3) return;
  const [left, op, ...rest] = parts;
  return { left, op, right: rest.join(' ') };
}

function splitAnd(expression: string): string[] {
  if (/\sAND\s/i.test(expression) && !/[()]/.test(expression)) {
    return expression.split(/\sAND\s/i).map(s=>s.trim());
  }
  return [expression];
}

function adjustValue(oldVal: number, op: string, suggestedDelta: number, action: 'TIGHTEN'|'RELAX'): { newVal: number; applied: boolean; note?: string } {
  const d = Math.abs(suggestedDelta);
  if (d === 0) return { newVal: oldVal, applied: false, note: 'zero_delta' };
  let newVal = oldVal;
  if (UPPER_OPS.has(op)) {
    if (action === 'TIGHTEN') newVal = oldVal * (1 - d); else newVal = oldVal * (1 + d);
  } else if (LOWER_OPS.has(op)) {
    if (action === 'TIGHTEN') newVal = oldVal * (1 + d); else newVal = oldVal * (1 - d);
  } else {
    return { newVal: oldVal, applied: false, note: 'unsupported_operator' };
  }
  if (!isFinite(newVal)) return { newVal: oldVal, applied: false, note: 'non_finite_new_value' };
  if (newVal < 0 && oldVal >= 0) {
    newVal = 0;
    return { newVal, applied: true, note: 'clamped_negative_to_zero' };
  }
  return { newVal, applied: true };
}

function rebuildExpression(segments: AdjustedConstraintSegment[]): string {
  return segments.map(s => s.adjusted ?? s.original).join(' AND ');
}

function computeFeasibleRatio(resultsPerScenario: any[][], constraintDefs: ConstraintDefinition[]): number {
  // feasible if no HARD violated
  let feasible = 0;
  for (const arr of resultsPerScenario) {
    const hardViolation = arr.some(r => r.status === 'VIOLATED' && r.definition?.kind === 'HARD');
    if (!hardViolation) feasible++;
  }
  return resultsPerScenario.length ? feasible / resultsPerScenario.length : 0;
}

export function simulateAdaptiveAdjustments(req: SimulationRunRequest): SimulationPreviewResult {
  if (!featureEnabled()) return { generatedAt: new Date().toISOString(), adjustments: [], aggregate: {}, notes: ['feature_disabled'] };
  const notes: string[] = [];
  // Phase 40: Start trace session (protected)
  let traceSessionStarted = false;
  try { PrescriptiveTraceRecorder.startSession(); traceSessionStarted = true; } catch(e) { notes.push('trace_session_start_failed'); }
  const constraintMap: Record<string, ConstraintDefinition> = {};
  for (const c of req.constraints) constraintMap[c.id] = c;
  const actionable = req.adaptive.filter(a => (a.action === 'TIGHTEN' || a.action === 'RELAX') && typeof a.suggestedDelta === 'number');
  const adjustments: AdjustedConstraintPreview[] = [];

  for (const act of actionable) {
    const def = constraintMap[act.id];
    if (!def) { adjustments.push({ id: act.id, originalExpression: '', applied: false, estimationMode: true, action: act.action as 'TIGHTEN'|'RELAX', suggestedDelta: act.suggestedDelta }); continue; }
    const segStrs = splitAnd(def.expression);
    const segResults: AdjustedConstraintSegment[] = [];
    let anyApplied = false;
    for (const seg of segStrs) {
      const parsed = parseAtomic(seg);
      if (!parsed) { segResults.push({ original: seg, reasonSkipped: 'cannot_parse' }); continue; }
      const { left, op, right } = parsed;
      const num = Number(right);
      if (isNaN(num)) { segResults.push({ original: seg, reasonSkipped: 'non_numeric_literal', operator: op }); continue; }
      if (!UPPER_OPS.has(op) && !LOWER_OPS.has(op)) { segResults.push({ original: seg, reasonSkipped: 'unsupported_operator', operator: op }); continue; }
  const adj = adjustValue(num, op, act.suggestedDelta!, act.action as 'TIGHTEN'|'RELAX');
      if (adj.applied) anyApplied = true;
      const adjustedExpr = adj.applied ? `${left} ${op} ${adj.newVal}` : seg;
      segResults.push({ original: seg, adjusted: adjustedExpr !== seg ? adjustedExpr : undefined, oldValue: num, newValue: adj.newVal, deltaPct: adj.applied ? (adj.newVal - num)/num : 0, operator: op, reasonSkipped: !adj.applied ? adj.note : undefined });
    }
    const adjustedExpression = anyApplied ? rebuildExpression(segResults) : undefined;
    adjustments.push({
      id: act.id,
      originalExpression: def.expression,
      adjustedExpression,
      segments: segResults,
  action: act.action as 'TIGHTEN'|'RELAX',
      suggestedDelta: act.suggestedDelta,
      applied: anyApplied,
      estimationMode: false
    });

    // Record trace for applied adjustments (initially without deltas)
    if (anyApplied && traceSessionStarted) {
      try {
        PrescriptiveTraceRecorder.recordAdjustment({
          constraintId: act.id,
          action: act.action as 'TIGHTEN'|'RELAX',
          originalExpression: def.expression,
          adjustedExpression: adjustedExpression,
          segments: segResults.map(s=> ({ original: s.original, adjusted: s.adjusted, reasonSkipped: s.reasonSkipped, oldValue: s.oldValue, newValue: s.newValue, deltaPct: s.deltaPct })),
          feasibilityDelta: undefined,
          violationDelta: undefined,
          estimationMode: false,
          notes: []
        });
      } catch(e) { /* swallow to avoid impacting simulation */ }
    }
  }

  if (!adjustments.some(a => a.applied)) notes.push('no_adjustable_constraints');

  // Re-evaluation (if metrics exist)
  const canEvaluate = req.samples.every(s => !!s.metrics);
  let feasibleBefore: number | undefined; let feasibleAfter: number | undefined;
  if (canEvaluate) {
    const baselineResultsPerScenario: any[][] = [];
    const adjustedResultsPerScenario: any[][] = [];
    for (const s of req.samples) {
      const base: any[] = []; const adj: any[] = [];
      for (const c of req.constraints) {
        const res = evaluateConstraint(c, { metrics: s.metrics });
        base.push(res);
        // find adjustment
        const adjPreview = adjustments.find(a => a.id === c.id && a.applied && a.adjustedExpression);
        if (adjPreview) {
          const adjustedDef: ConstraintDefinition = { ...c, expression: adjPreview.adjustedExpression! };
          adj.push(evaluateConstraint(adjustedDef, { metrics: s.metrics }));
        } else {
          adj.push(res);
        }
      }
      baselineResultsPerScenario.push(base);
      adjustedResultsPerScenario.push(adj);
    }
    feasibleBefore = computeFeasibleRatio(baselineResultsPerScenario, req.constraints);
    feasibleAfter = computeFeasibleRatio(adjustedResultsPerScenario, req.constraints);
    // violation deltas approximation per constraint (actual difference)
    for (const adjPrev of adjustments) {
      if (!adjPrev.applied) continue;
      let violBefore = 0; let violAfter = 0; let evalCount = 0;
      const idx = req.constraints.findIndex(c => c.id === adjPrev.id);
      for (let i=0;i<req.samples.length;i++) {
        const b = baselineResultsPerScenario[i][idx];
        const a = adjustedResultsPerScenario[i][idx];
        if (b.status !== 'UNKNOWN' && b.status !== 'UNSUPPORTED' && b.status !== 'INSUFFICIENT_CONTEXT') {
          evalCount++;
          if (b.status === 'VIOLATED') violBefore++;
          if (a.status === 'VIOLATED') violAfter++;
        }
      }
      if (evalCount>0) adjPrev.predictedViolationDelta = (violAfter - violBefore)/evalCount;
    }
  } else {
    // Estimation fallback
    notes.push('estimation_mode');
    for (const adjPrev of adjustments) {
      if (!adjPrev.applied) continue;
      const d = Math.abs(adjPrev.suggestedDelta || 0);
      // Simple heuristic: tighten increases violation; relax decreases
      adjPrev.estimationMode = true;
      adjPrev.predictedViolationDelta = adjPrev.action === 'TIGHTEN' ? +(d * 0.3) : -(d * 0.2);
    }
    if (traceSessionStarted) {
      try { PrescriptiveTraceRecorder.markAllRecordsEstimation(); } catch(e) { /* ignore */ }
    }
  }

  // Frontier optional
  let frontierSizeBefore: number | undefined; let frontierSizeAfter: number | undefined;
  let diversityBefore: any; let diversityAfter: any; let diversityDelta: any;
  if (req.frontierCandidates && req.frontierAxes) {
    const filterViolations = (cands: { id:string; metrics: Record<string, number>; }, mode: 'baseline'|'adjusted'): boolean => {
      for (const c of req.constraints) {
        const adjPreview = adjustments.find(a => a.id === c.id && a.applied && a.adjustedExpression);
        const expr = (mode==='adjusted' && adjPreview?.adjustedExpression)? adjPreview.adjustedExpression: c.expression;
        // quick parse: only support single atomic for filtering performance; if AND use evaluateConstraint for accuracy
        if (/\sAND\s/i.test(expr)) {
          const res = evaluateConstraint({ ...c, expression: expr }, { metrics: cands.metrics });
          if (res.status === 'VIOLATED' && c.kind === 'HARD') return false;
        } else {
          const parsed = parseAtomic(expr);
          if (parsed) {
            const val = Number(cands.metrics[parsed.left]);
            const thr = Number(parsed.right);
            if (!isNaN(val) && !isNaN(thr)) {
              let violated = false;
              switch(parsed.op){
                case '<': violated = !(val < thr); break;
                case '<=': violated = !(val <= thr); break;
                case '>': violated = !(val > thr); break;
                case '>=': violated = !(val >= thr); break;
              }
              if (violated && c.kind === 'HARD') return false;
            }
          }
        }
      }
      return true;
    };
    const baselineCands = req.frontierCandidates.filter(c => filterViolations(c,'baseline'));
    const adjustedCands = req.frontierCandidates.filter(c => filterViolations(c,'adjusted'));
  const frontierBefore: FrontierResult = computeFrontier({ samples: baselineCands.map(c => ({ scenarioId: c.id, constraints: [], factors: c.metrics })), axes: req.frontierAxes });
  const frontierAfter: FrontierResult = computeFrontier({ samples: adjustedCands.map(c => ({ scenarioId: c.id, constraints: [], factors: c.metrics })), axes: req.frontierAxes });
  frontierSizeBefore = frontierBefore.frontier.length; frontierSizeAfter = frontierAfter.frontier.length;
  diversityBefore = computeFrontierDiversity(frontierBefore.frontier, req.frontierAxes);
  diversityAfter = computeFrontierDiversity(frontierAfter.frontier, req.frontierAxes);
    // diversity delta (numeric fields)
    if (diversityBefore && diversityAfter) {
      diversityDelta = {};
      for (const k of Object.keys(diversityBefore)) {
        const vb = (diversityBefore as any)[k]; const va = (diversityAfter as any)[k];
        if (typeof vb === 'number' && typeof va === 'number') diversityDelta[k] = va - vb;
      }
    }
  } else if (req.frontierAxes && !req.frontierCandidates) {
    notes.push('missing_frontier_candidates');
  }

  const aggregate: SimulationAggregateDelta = {
    feasibleRatioBefore: feasibleBefore,
    feasibleRatioAfter: feasibleAfter,
    feasibleRatioDelta: (feasibleBefore!=null && feasibleAfter!=null) ? (feasibleAfter - feasibleBefore) : undefined,
    frontierSizeBefore,
    frontierSizeAfter,
    frontierSizeDelta: (frontierSizeBefore!=null && frontierSizeAfter!=null) ? (frontierSizeAfter - frontierSizeBefore) : undefined,
    diversityBefore,
    diversityAfter,
    diversityDelta
  };

  PrescriptiveTelemetry.counter('adaptive.simulation.runs',1);
  PrescriptiveTelemetry.counter('adaptive.simulation.adjusted', adjustments.filter(a=>a.applied).length);

  // Backfill deltas into trace records & finalize policy version
  if (traceSessionStarted) {
    try {
      const feasibleDelta = (feasibleBefore!=null && feasibleAfter!=null)? (feasibleAfter - feasibleBefore): undefined;
      const deltaMap: Record<string, { feasibilityDelta?: number; violationDelta?: number }> = {};
      for (const a of adjustments) {
        if (!a.applied) continue;
        deltaMap[a.id] = { feasibilityDelta: feasibleDelta, violationDelta: a.predictedViolationDelta };
      }
      PrescriptiveTraceRecorder.backfillDeltas(deltaMap);
      // finalize policy version with constraints + trace records snapshot
      const snapshot = PrescriptiveTraceRecorder.snapshot();
      PrescriptiveTraceRecorder.finalizePolicyVersion(
        req.constraints.map(c=> ({ id: c.id, expression: c.expression })),
        (snapshot?.adjustments||[]).filter(r => r.adjustedExpression)
      );
    } catch(e) { notes.push('trace_finalize_failed'); }
  }

  return { generatedAt: new Date().toISOString(), adjustments, aggregate, notes };
}

export default simulateAdaptiveAdjustments;
