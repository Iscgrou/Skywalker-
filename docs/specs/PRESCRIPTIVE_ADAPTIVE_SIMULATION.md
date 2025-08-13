# Spec: Prescriptive Adaptive Simulation (Phase 39c)

نسخه: v0.1 (Draft)  
Feature Flag: `PODSE_ROBUST_V1` (در صورت false → خروجی خالی / غیرفعال)

## 1. هدف (Purpose)
ایجاد یک موتور "چه-میشود-اگر" غیرمخرب برای اعمال مجازی (TIGHTEN / RELAX) پیشنهادات Adaptive Constraint Actions و تخمین تأثیر بر:
- نرخ امکان‌پذیری سناریوها (Feasibility Ratio)
- اندازه و تنوع فرانتیر (Pareto Frontier Size & Diversity)
- نرخ تخلف (Violation Rate Δ) هر قید
- توزیع مجدد Criticality تقریبی

## 2. دامنه (In Scope)
- اعمال درصدی بر اعداد آستانه قیدهای قابل تنظیم (عملگرهای عددی: `<, <=, >, >=`).
- پشتیبانی از قیود AND خطی (هر قطعه مستقل تنظیم می‌شود) v1.1.
- محاسبه مجدد یا تخمین (Fallback Heuristic) در صورت نبود متریک‌های خام.
- تولید خروجی Preview برای UI و API خلاصه.

## 3. خارج از دامنه (Out of Scope v1)
- تعدیل قیود با عملگرهای `==` و `!=`.
- کش چند نسخه‌ای Simulation.
- ارزیابی مجدد هدف‌ها (Objectives) با الگوریتم بهینه سازی سنگین.
- مدل علیتی و توضیح چرایی تغییرات (Phase 40+).

## 4. ورودی‌ها (Inputs)
```ts
interface SimulationInputSample {
  scenarioId: string;
  metrics: Record<string, number | string | boolean | null | undefined>; // برای ارزیابی مجدد
  // اختیاری: نتایج ارزیابی قبلی (Baseline) در صورت وجود
  baselineConstraints?: EvaluatedConstraintResult[];
}

interface SimulationRunRequest {
  constraints: ConstraintDefinition[]; // اصل
  adaptive: AdaptiveConstraintAction[]; // خروجی مرحله adaptive
  samples: SimulationInputSample[]; // سناریوهای پایه
  frontierCandidates?: { id: string; metrics: Record<string, number>; }[]; // گزینه‌های سیاست (اختیاری)
  frontierAxes?: AxisSpec[]; // برای بازسازی فرانتیر
}
```

## 5. خروجی (Outputs)
```ts
interface AdjustedConstraintPreview {
  id: string;
  originalExpression: string;
  adjustedExpression?: string; // اگر قابل تنظیم
  segments?: { original: string; adjusted?: string; reasonSkipped?: string; oldValue?: number; newValue?: number; deltaPct?: number; operator?: string; }[];
  action?: 'TIGHTEN' | 'RELAX';
  suggestedDelta?: number; // از adaptive
  applied: boolean; // false اگر هیچ سگمنتی تنظیم نشد
  estimationMode: boolean; // true اگر به جای ارزیابی واقعی تخمینی استفاده شد
  predictedViolationDelta?: number; // (adjusted - baseline)
}

interface SimulationAggregateDelta {
  feasibleRatioBefore?: number;
  feasibleRatioAfter?: number;
  feasibleRatioDelta?: number;
  frontierSizeBefore?: number;
  frontierSizeAfter?: number;
  frontierSizeDelta?: number;
  diversityBefore?: any; // reuse structure از computeFrontierDiversity
  diversityAfter?: any;
  diversityDelta?: any; // differences در فیلدهای عددی
}

interface SimulationPreviewResult {
  generatedAt: string;
  adjustments: AdjustedConstraintPreview[];
  aggregate: SimulationAggregateDelta;
  notes: string[]; // هشدارها یا محدودیت ها
}
```

## 6. منطق تنظیم (Adjustment Logic)
جدول جهت:
- عملگرهای Upper-Bound: `<`, `<=` → Tighten = کاهش مقدار؛ Relax = افزایش مقدار.
- عملگرهای Lower-Bound: `>`, `>=` → Tighten = افزایش مقدار؛ Relax = کاهش مقدار.
فرمول پایه (d = |suggestedDelta|):
- Upper + TIGHTEN: `new = old * (1 - d)`
- Upper + RELAX: `new = old * (1 + d)` (چون delta منفی می‌آید، با قدرتم مطلق ساده می‌شود)
- Lower + TIGHTEN: `new = old * (1 + d)`
- Lower + RELAX: `new = old * (1 - d)`
Clamping:
- اگر `new` منفی شود در قیود غیرمنفی → clamp به 0 و درج هشدار.
- اگر `new` بسیار کوچک (old>0 و new < old*0.01) → هشدار over-tight.

## 7. الگوریتم کلی
1. فیلتر اکشن‌ها: فقط TIGHTEN/RELAX با `suggestedDelta`.
2. ساخت نقشه شناسه → تعریف قید.
3. برای هر قید:
   - Split AND (اگر وجود دارد) → قطعات.
   - هر قطعه: parse ساده (سه بخشی). اگر عملگر پشتیبانی نشد → reasonSkipped.
   - تشخیص oldValue عددی؛ در غیر اینصورت skip.
   - اعمال فرمول جدید.
4. تولید expression جدید (بازسازی AND با اتصال " AND ").
5. ارزیابی مجدد سناریوها (اگر metrics موجود):
   - برای هر sample همه قیود Adjusted (یا baseline برای others) evaluate.
   - محاسبه feasibleRatioBefore/After (سناریو feasible اگر هیچ HARD violated ندارد).
6. اگر frontierCandidates و frontierAxes موجود:
   - baseline: فیلتر candidates با قیود baseline HARD.
   - adjusted: فیلتر candidates با قیود Adjusted.
   - computeFrontier روی هر مجموعه و diversity.
7. اگر metrics غایب یا ارزیابی شکست خورد → estimationMode=true و محاسبه تقریب violationDelta هر قید:
   - TIGHTEN: `predictedΔ ≈ + (d / (avgSlack + 1e-9)) * scaling` با scaling= min(1, avgSlackFactor) (بهبود برای فاز بعد).
   - RELAX: `predictedΔ ≈ - d * 0.5` (کاهش تقریبی).
8. تلمتری: افزایش counters
   - `adaptive.simulation.runs` = 1
   - `adaptive.simulation.adjusted` = تعداد قیود با applied=true

## 8. Anti-Examples و پاسخ طراحی
| مورد | توضیح | رفتار |
|------|-------|-------|
| `revenue == 1000` + TIGHTEN | عملگر غیرقابل تنظیم | skip segment, applied=false |
| `cost <= abc` | مقدار غیرعددی | skip segment |
| `a <= 100 AND b == "X"` | بخش دوم غیرعددی | فقط a تنظیم می‌شود |
| suggestedDelta بسیار بزرگ `-0.9` RELAX | افزایش 90% | مجاز ولی notes هشدار large-relax |
| oldValue=0 و TIGHTEN روی lower-bound `>=0` | بی‌اثر | skip(delta 0) |
| newValue منفی | clamp به 0 + note |

## 9. خطاها و Notes
- اگر هیچ قیدی تنظیم نشد → note "no_adjustable_constraints".
- اگر frontierAxes داده شد ولی candidates نه → note "missing_frontier_candidates".
- زمان ارزیابی مجدد شکست (throw) → note با شناسه قید.

## 10. توسعه آینده (Phase 40+ Hooks)
- اتصال Explainability: ثبت lineage (قید → قطعه → تغییر مقدار → اثر delta).
- Policy Versioning: خروجی Simulation به عنوان draft version.
- Causal Graph Integration: تبدیل predictedΔ به causal edge weight.

## 11. معیارهای پذیرش (Acceptance Criteria)
- تست tighten-only: feasibleRatioAfter <= feasibleRatioBefore (یا برابر اگر قید غیر فعال بود).
- تست relax-only: feasibleRatioAfter >= feasibleRatioBefore.
- Mixed: deltas مطابق signs منطقی.
- No-op: adjustments array خالی applied=true ندارد.
- Anti-case ها پوشش و گزارش notes.
- Telemetry counters افزایش می‌یابند.

## 12. ریسک‌ها و Mitigation
| ریسک | توضیح | Mitigation |
|------|-------|------------|
| تخمین نادقیق violation | نبود داده خام | flag estimationMode + future recalibration |
| اثر تجمعی چند tighten | ضرب شدید feasibility | محدودسازی delta فردی + هشدار over-tight |
| Drift بین baseline و زمان اجرای Simulation | داده samples قدیمی | اضافه کردن timestamp و توصیه refresh |

## 13. Interface نهایی (پیش نویس)
```ts
export interface SimulationPreviewResult { /* ... از بالا ... */ }
export function simulateAdaptiveAdjustments(req: SimulationRunRequest): SimulationPreviewResult { /* پیاده سازی */ }
```

## 14. چرخه اعتبارسنجی داخلی
1. اجرای تست واحد tighten-only.
2. بررسی Anti-Example ها.
3. مانیتور تلمتری counters.
4. بازبینی دستی خروجی adjustments برای یک ورودی ساختگی.

---
وضعیت: Draft آماده برای Implementation.
