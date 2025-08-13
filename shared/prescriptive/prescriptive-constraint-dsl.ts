/**
 * Iteration 38e - Prescriptive Optimization: Constraint DSL (v1.1 AND Support)
 * Feature Flag: PODSE_ROBUST_V1
 *
 * اهداف نسخه v1:
 * - تعریف حداقلی ساختار Constraint ها (Hard, Soft, Conditional, Dynamic)
 * - پارسر بسیار ساده (فرمت key OP value) با پشتیبانی عملگرهای اولیه: ==, !=, >, >=, <, <=
 * - AND خطی (expr1 AND expr2 AND expr3) بدون پرانتز یا OR (v1.1)
 * - ارزیابی Placeholder (برگشت نتیجه UNKNOWN برای شرایط پیچیده)
 *
 * ضد مثال (Anti-Examples) که باید هندل یا رد شوند:
 * 1) "revenue >> 1000"  (عملگر ناشناخته) → parse خطا
 * 2) "profit_margin >=" (مقدار تهی) → parse خطا
 * 3) "(a > 5) AND b < 3" (پرانتز) → UNSUPPORTED در v1.1
 * 4) "region == EU && latency < 200" (استفاده از &&) → باید جداگانه تعریف شود
 * 5) Dynamic constraint بدون context لازم → نتیجه INSUFFICIENT_CONTEXT
 */

export type ConstraintKind = 'HARD' | 'SOFT' | 'CONDITIONAL' | 'DYNAMIC';
export type ConstraintSeverity = 'BLOCK' | 'WARN' | 'INFO';
export type ConstraintEvalStatus = 'SATISFIED' | 'VIOLATED' | 'UNKNOWN' | 'UNSUPPORTED' | 'INSUFFICIENT_CONTEXT';

export interface ConstraintDefinition {
  id: string;
  version: string; // 'v1'
  kind: ConstraintKind;
  severity: ConstraintSeverity;
  /** فرمت ساده: metric OP value  (مثلا total_cost <= 50000) */
  expression: string;
  /** توضیح انسانی برای گزارش */
  description?: string;
  /** وابستگی به فیلدهای context برای Dynamic/Conditional */
  requiredContextKeys?: string[];
  /** شرایط فعال‌سازی (مثلا only apply if region=="EU") */
  activationPredicate?: string; // ساده در v1: key==value
}

export interface ConstraintContext {
  metrics: Record<string, number | string | boolean | null | undefined>;
  flags?: Record<string, boolean>;
  meta?: Record<string, any>;
}

export interface EvaluatedConstraintResult {
  definition: ConstraintDefinition;
  status: ConstraintEvalStatus;
  details?: string;
  valueLeft?: any;
  valueRight?: any;
  operator?: string;
  activationMatched?: boolean;
  timestamp: string;
}

const SUPPORTED_OPERATORS = ['==','!=','>','>=','<','<='];

interface ParsedExpression {
  left: string; operator: string; right: string;
}

import { PrescriptiveTelemetry } from './prescriptive-telemetry.ts';

function featureEnabled(): boolean {
  return process.env.PODSE_ROBUST_V1 === 'true';
}

/**
 * پارسر بسیار ساده: "metricName OP literal".
 * در v1: literal به صورت string نگه‌داری و در ارزیابی تفسیر ساده می‌شود.
 */
export function parseConstraintExpression(expr: string): ParsedExpression | { error: string } {
  const trimmed = expr.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length < 3) return { error: 'Invalid expression structure' };
  const [left, operator, ...rest] = parts;
  if (!SUPPORTED_OPERATORS.includes(operator)) return { error: `Unsupported operator: ${operator}` };
  const right = rest.join(' ');
  if (!right) return { error: 'Missing right-hand value' };
  return { left, operator, right };
}

// --- AND Support Helpers (v1.1) ---
function isAndExpression(expression: string): boolean {
  return /\sAND\s/i.test(expression) && !/[()]/.test(expression);
}
function parseAndExpression(expression: string): (ParsedExpression | { error: string })[] {
  return expression.split(/\sAND\s/i).map(seg => parseConstraintExpression(seg));
}

/**
 * ارزیابی ساده Constraint - در صورت پیچیدگی یا نبود context کافی UNKNOWN/INSUFFICIENT_CONTEXT برمی‌گرداند.
 */
export function evaluateConstraint(def: ConstraintDefinition, ctx: ConstraintContext): EvaluatedConstraintResult {
  if (!featureEnabled()) {
    return {
      definition: def,
      status: 'UNKNOWN',
      details: 'Feature flag PODSE_ROBUST_V1 disabled',
      timestamp: new Date().toISOString()
    };
  }

  // Activation predicate ساده: key==value
  let activationMatched = true;
  if (def.activationPredicate) {
    const activation = parseConstraintExpression(def.activationPredicate);
    if ('error' in activation) {
      activationMatched = false;
    } else {
      const actual = ctx.metrics[activation.left];
      activationMatched = String(actual) === activation.right.replace(/"/g,'');
    }
  }
  if (!activationMatched) {
    return {
      definition: def,
      status: 'UNKNOWN',
      details: 'Activation predicate not matched (skipped)',
      activationMatched: false,
      timestamp: new Date().toISOString()
    };
  }

  // Composite AND evaluation
  if (isAndExpression(def.expression)) {
    const segments = parseAndExpression(def.expression);
    const evaluated: { expr: string; status: ConstraintEvalStatus; reason?: string }[] = [];
    let agg: ConstraintEvalStatus = 'SATISFIED';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if ('error' in seg) {
        evaluated.push({ expr: `SEG${i}`, status: 'UNSUPPORTED', reason: seg.error });
        // precedence update only if nothing higher seen yet
        if (agg === 'SATISFIED' || agg === 'UNKNOWN') agg = 'UNSUPPORTED';
        continue;
      }
      const { left, operator, right } = seg;
      const raw = ctx.metrics[left];
      if (raw === undefined || raw === null) {
        const st: ConstraintEvalStatus = def.kind === 'DYNAMIC' ? 'INSUFFICIENT_CONTEXT' : 'UNKNOWN';
        evaluated.push({ expr: `${left} ${operator} ${right}`, status: st, reason: 'Missing metric' });
        // precedence ladder: VIOLATED > INSUFFICIENT_CONTEXT > UNSUPPORTED > UNKNOWN > SATISFIED
        if (st === 'INSUFFICIENT_CONTEXT' && agg !== 'VIOLATED') agg = 'INSUFFICIENT_CONTEXT';
        else if (st === 'UNKNOWN' && (agg === 'SATISFIED')) agg = 'UNKNOWN';
        continue;
      }
      const numLeft = typeof raw === 'number' ? raw : Number(raw);
      const numRight = Number(right);
      let cmp: boolean | null = null;
      if (operator === '==') cmp = String(raw) === right.replace(/"/g, '');
      else if (operator === '!=') cmp = String(raw) !== right.replace(/"/g, '');
      else if (isNaN(numLeft) || isNaN(numRight)) cmp = null; else {
        switch (operator) {
          case '>': cmp = numLeft > numRight; break;
          case '>=': cmp = numLeft >= numRight; break;
          case '<': cmp = numLeft < numRight; break;
          case '<=': cmp = numLeft <= numRight; break;
        }
      }
      if (cmp === null) {
        evaluated.push({ expr: `${left} ${operator} ${right}`, status: 'UNSUPPORTED', reason: 'Non-numeric comparison' });
        if (agg === 'SATISFIED' || agg === 'UNKNOWN') agg = 'UNSUPPORTED';
        continue;
      }
      const segStatus: ConstraintEvalStatus = cmp ? 'SATISFIED' : 'VIOLATED';
      evaluated.push({ expr: `${left} ${operator} ${right}`, status: segStatus });
      if (segStatus === 'VIOLATED') agg = 'VIOLATED';
    }
    PrescriptiveTelemetry.counter('constraints.evaluated',1);
    if (agg === 'VIOLATED') {
      if (def.kind === 'HARD') PrescriptiveTelemetry.counter('constraints.violation.hard',1); else PrescriptiveTelemetry.counter('constraints.violation.soft',1);
    }
    return {
      definition: def,
      status: agg,
      details: 'AND[' + evaluated.map(e => `${e.expr}:${e.status}`).join(' | ') + ']',
      timestamp: new Date().toISOString()
    };
  }

  const parsed = parseConstraintExpression(def.expression);
  if ('error' in parsed) {
    return {
      definition: def,
      status: 'UNSUPPORTED',
      details: parsed.error,
      timestamp: new Date().toISOString()
    };
  }

  const { left, operator, right } = parsed;
  const rawLeft = ctx.metrics[left];

  if (rawLeft === undefined || rawLeft === null) {
    if (def.kind === 'DYNAMIC') {
      return { definition: def, status: 'INSUFFICIENT_CONTEXT', details: 'Missing dynamic metric', timestamp: new Date().toISOString() };
    }
    return { definition: def, status: 'UNKNOWN', details: 'Metric not present', timestamp: new Date().toISOString() };
  }

  const numLeft = typeof rawLeft === 'number' ? rawLeft : Number(rawLeft);
  const numRight = Number(right);

  let comparison: boolean | null = null;
  if (operator === '==' ) comparison = String(rawLeft) === right.replace(/"/g,'');
  else if (operator === '!=') comparison = String(rawLeft) !== right.replace(/"/g,'');
  else if (isNaN(numLeft) || isNaN(numRight)) {
    comparison = null; // نمی‌توان قیاس عددی کرد
  } else {
    switch(operator){
      case '>': comparison = numLeft > numRight; break;
      case '>=': comparison = numLeft >= numRight; break;
      case '<': comparison = numLeft < numRight; break;
      case '<=': comparison = numLeft <= numRight; break;
    }
  }

  if (comparison === null) {
    const res: EvaluatedConstraintResult = { definition: def, status: 'UNSUPPORTED', details: 'Non-numeric comparison unsupported in v1', valueLeft: rawLeft, valueRight: right, operator, timestamp: new Date().toISOString() };
    PrescriptiveTelemetry.counter('constraints.evaluated',1);
    return res;
  }

  const finalStatus: ConstraintEvalStatus = comparison ? 'SATISFIED' : 'VIOLATED';
  const result: EvaluatedConstraintResult = {
    definition: def,
    status: finalStatus,
    valueLeft: rawLeft,
    valueRight: right,
    operator,
    activationMatched,
    timestamp: new Date().toISOString()
  };
  PrescriptiveTelemetry.counter('constraints.evaluated',1);
  if (finalStatus === 'VIOLATED') {
    if (def.kind === 'HARD') PrescriptiveTelemetry.counter('constraints.violation.hard',1); else PrescriptiveTelemetry.counter('constraints.violation.soft',1);
  }
  return result;
}

export interface ConstraintEvaluationSummary {
  total: number; satisfied: number; violated: number; unknown: number; unsupported: number; insufficient: number;
  tightnessIndex?: number; // فاز بعدی محاسبه واقعی
}

export function summarizeConstraintResults(results: EvaluatedConstraintResult[]): ConstraintEvaluationSummary {
  const summary: ConstraintEvaluationSummary = { total: results.length, satisfied:0, violated:0, unknown:0, unsupported:0, insufficient:0 };
  for (const r of results) {
  if (r.status === 'SATISFIED') summary.satisfied++; else if (r.status === 'VIOLATED') summary.violated++; else if (r.status === 'UNKNOWN') summary.unknown++; else if (r.status === 'UNSUPPORTED') summary.unsupported++; else if (r.status === 'INSUFFICIENT_CONTEXT') summary.insufficient++; 
  }
  return summary;
}
