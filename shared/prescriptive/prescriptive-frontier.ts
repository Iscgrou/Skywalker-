/**
 * Iteration 38c - Pareto Frontier Sketch (v1)
 * هدف: استخراج مجموعه نقاط غیرمغلوب از بین سناریوهای feasible برای محورها (latency↓, cost↓, demand↑)
 * Simplifications:
 *  - فقط سه محور ثابت (v1). قابل توسعه به پیکربندی محورها.
 *  - عدم خوشه‌بندی یا کاهش ابعادی؛ صرفاً فیلتر dominance.
 *  - معیار feasibility: عدم وجود HARD violation.
 * ضد مثال‌ها:
 *  1) سناریوی تکراری با مقادیر برابر → فقط یکی نگه داشته می‌شود (dedupe hash).
 *  2) مقدار نادیدنی (NaN یا undefined) در یکی از محورها → سناریو رد می‌شود.
 *  3) محوری با مقدار منفی غیرمنتظره (مثلاً cost<0) → پذیرفته ولی flag می‌شود.
 */
import { EvaluatedConstraintResult } from './prescriptive-constraint-dsl.ts';
import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';

/**
 * طراحی فاز بعد (Configurable Axes) - مستندات:
 * AxisSpec:
 *  - name: برچسب محور (مانند latency)
 *  - direction: 'MIN' | 'MAX'
 *  - selector: (factors) => number | undefined  (اگر NaN/undefined => سناریو invalid)
 * الگوریتم غالبیت عمومی:
 *  - a dominates b اگر برای همه محورها بهتر یا مساوی (با توجه به جهت) و حداقل در یکی بهتر Strict باشد.
 * Backward Compatibility: در صورت فقدان axes از مجموعه پیش‌فرض (latency↓, cost↓, demand↑) استفاده می‌شود.
 * Anti-Examples:
 *  1) محور تکراری (دو بار latency) → در نسخه v1.1 اجازه داده می‌شود و هر دو لحاظ؛ آینده: نرمال‌سازی.
 *  2) selector برگرداندن NaN → سناریو حذف (discardedInvalid++).
 *  3) همه سناریوها همسان → همه در فرانتیر (هیچ Strict بهتر نیست).
 *  4) همه infeasible → frontier خالی.
 *  5) محور بدون پوشش (selector همیشه undefined) → همه سناریوها invalid.
 */
export interface AxisSpec { name: string; direction: 'MIN' | 'MAX'; selector: (factors: Record<string, number>) => number | undefined; }

export interface FrontierPointDynamic {
  scenarioId: string;
  values: Record<string, number>; // محور -> مقدار
  meta?: Record<string, any>;
}

export interface FrontierComputationInput {
  samples: { scenarioId: string; constraints: EvaluatedConstraintResult[]; factors: Record<string, number>; }[];
  axes?: AxisSpec[]; // در صورت عدم حضور، پیش فرض قبلی
}

export interface FrontierResult {
  frontier: FrontierPointDynamic[];
  dominatedCount: number;
  considered: number;
  feasibleCount: number;
  discardedInvalid: number;
  warnings?: string[];
  axesUsed?: { name: string; direction: 'MIN'|'MAX' }[];
}

// Diversity Metrics Interfaces (Iteration 39)
export interface FrontierDiversityMetrics {
  pointCount: number;
  objectiveRange?: number; objectiveStd?: number;
  axisSpreads?: { axis: string; min: number; max: number; range: number }[];
  pairwiseDistanceMean?: number;
  coverageScore?: number;
  generatedAt: string;
}

function statsBasic(values: number[]): { range: number; std?: number } {
  if (!values.length) return { range: 0 };
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min;
  if (values.length < 2) return { range };
  const mean = values.reduce((a,b)=>a+b,0)/values.length;
  const variance = values.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(values.length-1);
  return { range, std: Math.sqrt(variance) };
}

export function computeFrontierDiversity(points: FrontierPointDynamic[], axes: AxisSpec[]): FrontierDiversityMetrics {
  if (!points.length) return { pointCount: 0, generatedAt: new Date().toISOString() };
  // در نسخه فعلی FrontierPointDynamic فقط values دارد؛ objectiveValue حذف یا در axes مدل می‌شود.
  const objStats = { range: 0 };
  const axisSpreads: { axis: string; min: number; max: number; range: number }[] = [];
  for (const ax of axes) {
    const vals = points.map(p => p.values[ax.name]).filter(v => typeof v === 'number' && !isNaN(v));
    if (!vals.length) continue;
    const min = Math.min(...vals); const max = Math.max(...vals); axisSpreads.push({ axis: ax.name, min, max, range: max - min });
  }
  // Pairwise distance in normalized axis space
  let pairwiseDistanceMean: number | undefined;
  if (points.length > 1 && axisSpreads.length) {
    const normRanges: Record<string, { min: number; range: number }> = {};
    for (const sp of axisSpreads) normRanges[sp.axis] = { min: sp.min, range: sp.range || 1 };
    let sum = 0; let count = 0;
    for (let i=0;i<points.length;i++) {
      for (let j=i+1;j<points.length;j++) {
        let d2 = 0;
        for (const ax of axisSpreads) {
          const a = (points[i].values[ax.axis] - normRanges[ax.axis].min) / (normRanges[ax.axis].range || 1);
          const b = (points[j].values[ax.axis] - normRanges[ax.axis].min) / (normRanges[ax.axis].range || 1);
          d2 += Math.pow(a-b,2);
        }
        sum += Math.sqrt(d2); count++;
      }
    }
    pairwiseDistanceMean = count ? sum / count : undefined;
  }
  // coverageScore = average normalized ranges
  let coverageScore: number | undefined;
  if (axisSpreads.length) {
    const normed: number[] = axisSpreads.map(sp => sp.range === 0 ? 0 : 1);
    coverageScore = normed.reduce((a,b)=>a+b,0)/axisSpreads.length;
  }
  PrescriptiveTelemetry.counter('frontier.diversity.computed',1);
  return {
    pointCount: points.length,
    objectiveRange: objStats.range,
    axisSpreads,
    pairwiseDistanceMean,
    coverageScore,
    generatedAt: new Date().toISOString()
  };
}

function featureEnabled(): boolean { return process.env.PODSE_ROBUST_V1 === 'true'; }

function isFeasible(constraints: EvaluatedConstraintResult[]): boolean {
  return constraints.every(c => !(c.definition.kind === 'HARD' && c.status === 'VIOLATED'));
}

function dominatesDynamic(a: FrontierPointDynamic, b: FrontierPointDynamic, axes: AxisSpec[]): boolean {
  let strictly = false;
  for (const ax of axes) {
    const av = a.values[ax.name];
    const bv = b.values[ax.name];
    if (av === undefined || bv === undefined) return false; // نباید رخ دهد اگر قبلاً فیلتر شده
    if (ax.direction === 'MIN') {
      if (av > bv) return false;
      if (av < bv) strictly = true;
    } else { // MAX
      if (av < bv) return false;
      if (av > bv) strictly = true;
    }
  }
  return strictly;
}

export function computeFrontier(input: FrontierComputationInput): FrontierResult {
  PrescriptiveTelemetry.startSpan('frontier.compute');
  if (!featureEnabled()) {
    const disabled: FrontierResult = { frontier: [], dominatedCount: 0, considered: 0, feasibleCount: 0, discardedInvalid: 0 };
    PrescriptiveTelemetry.endSpan('frontier.compute');
    return disabled;
  }
  const warnings: string[] = [];
  const axes: AxisSpec[] = input.axes && input.axes.length ? input.axes : [
    { name: 'latency', direction: 'MIN', selector: f => f.latency },
    { name: 'cost', direction: 'MIN', selector: f => f.cost },
    { name: 'demand', direction: 'MAX', selector: f => f.demand }
  ];
  const feasible: FrontierPointDynamic[] = [];
  let discardedInvalid = 0;
  for (const s of input.samples) {
    if (!isFeasible(s.constraints)) continue;
    const values: Record<string, number> = {};
    let invalid = false;
    for (const ax of axes) {
      const val = ax.selector(s.factors);
      if (val === undefined || val === null || Number.isNaN(val)) { invalid = true; break; }
      values[ax.name] = val as number;
      if (ax.name === 'cost' && val! < 0) warnings.push(`Negative cost in ${s.scenarioId}`);
    }
    if (invalid) { discardedInvalid++; continue; }
    feasible.push({ scenarioId: s.scenarioId, values });
  }
  // Dedupe
  const hash = (p: FrontierPointDynamic) => axes.map(a => p.values[a.name]).join('|');
  const seen = new Set<string>();
  const deduped: FrontierPointDynamic[] = [];
  for (const p of feasible) { const h = hash(p); if (!seen.has(h)) { seen.add(h); deduped.push(p); } }

  // Compute frontier by simple O(n^2) dominance filtering (Acceptable for small n)
  const frontier: FrontierPointDynamic[] = [];
  let dominatedCount = 0;
  for (let i=0;i<deduped.length;i++) {
    let isDominated = false;
    for (let j=0;j<deduped.length;j++) {
      if (i===j) continue;
      if (dominatesDynamic(deduped[j], deduped[i], axes)) { isDominated = true; break; }
    }
    if (isDominated) dominatedCount++; else frontier.push(deduped[i]);
  }

  const result: FrontierResult = {
    frontier,
    dominatedCount,
    considered: input.samples.length,
    feasibleCount: feasible.length,
    discardedInvalid,
    warnings: warnings.length ? warnings : undefined,
    axesUsed: axes.map(a => ({ name: a.name, direction: a.direction }))
  };
  PrescriptiveTelemetry.counter('frontier.considered', input.samples.length);
  PrescriptiveTelemetry.counter('frontier.feasible', feasible.length);
  PrescriptiveTelemetry.endSpan('frontier.compute');
  return result;
}
