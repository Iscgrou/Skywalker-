# فاز تحلیلی: Constraint Sensitivity & Frontier Diversity (Iteration 39 Draft)

## 1. چرایی (Why)
برای هدایت بهینه فازهای آتی (Refinement امتیاز Robustness، توسعه DSL با OR و پرانتز، بهبود Adaptive Weighting) نیاز به لایه تحلیلی است که:
- شدت و اثر هر قید را کمی‌سازی کند (Criticality).
- قیود کم‌اثر یا پرنویز را شناسایی کند (Candidate for pruning / merge).
- تنوع سطح جبهه پارتو را بسنجد (Risk of Overfitting به نقاط مشابه).
- ورودی تجربی برای تنظیمات پویا (Adaptive Tightening یا Relaxation) تولید کند.

## 2. دامنه (Scope)
این فاز دو ماژول سبک اضافه می‌کند:
1) Constraint Sensitivity Metrics
2) Frontier Diversity Metrics

بدون تغییر در API های موجود تصمیم‌گیری؛ فقط خروجی افزوده برای تحلیل.

## 3. مدل مفهومی
### 3.1 Constraint Sensitivity
برای هر Constraint در مجموعه سناریوها:
- violationRate = violations / evaluatedCount
- support = evaluatedCount / totalSamples (قیود با support پایین پرریسک)
- slackSamples: برای قیود مقایسه‌ای عددی (>,>=,<,<=) مقدار slack تعریف می‌شود.
  - تعریف slack استاندارد: (threshold - value) برای فرم های ≤ و < وقتی قید برقرار است؛ و (value - threshold) برای فرم های ≥ و > وقتی برقرار است. اگر نقض شده، slack منفی می‌شود (علامت حد فاصله تا رضایت).
  - برای == و !=: slack قابل تفسیر یکنواخت نیست → حذف از آماره‌های slack.
- slackMean / slackStd / slackMin / slackP10 / slackP90
- normalizedCriticality = violationRate * (1 / (1 + max(0, slackMean))) (تقریب: slackMean بزرگ → حاشیه امن → کاهش criticality)
- volatility = slackStd / (|slackMean| + ε)
- stabilityScore = 1 - min(1, volatility)

### 3.2 Frontier Diversity
برای مجموعه نقاط غیرمغلوب:
- objectiveRange, objectiveStd (اگر فقط یک هدف فعلاً objectiveValue)
- axisSpreads: برای axes دینامیک (min,max,range)
- pairwiseDistanceMean (در فضای محورهای نرمالیزه) برای سنجش تراکم.
- coverageScore = متوسط(range_i) پس از نرمال‌سازی هر محور به [0,1].

## 4. اولویت‌بندی معیارها
معیارهای انتخاب شده کم‌هزینه، تفسیرپذیر و قابل توسعه‌اند. از محاسبات پیچیده مثل Shapley فعلاً صرف نظر می‌شود (Phase 42+ احتمالی).

## 5. شبه‌کد Sensitivity
```
for each constraint c:
  evals = scenarios.filter(r has status != UNKNOWN/UNSUPPORTED/INSUFFICIENT_CONTEXT)
  violations = evals with status VIOLATED
  violationRate = violations / evals
  for each eval that is numeric inequality:
    slack = computeSlack(eval)
    collect
  compute stats (mean,std,...)
  normalizedCriticality = violationRate * 1/(1+max(0,slackMean))
```

## 6. Anti-Examples (مثال نقض) و پاسخ طراحی
| سناریو | ریسک | پاسخ طراحی |
|--------|------|-------------|
| همه slack ها صفر (==) | تقسیم بر صفر و گمراهی | حذف از تحلیل slack |
| تعداد نمونه کم (support < 0.2) | شاخص نویزی | پرچم lowSupport=true |
| اختلاط مقادیر متنی | NaN | فیلتر: فقط eval با valueLeft عددی و threshold عددی |
| Dynamic بدون context | skew support | اصلاً در evaluatedCount لحاظ نمی‌شود |
| Frontier با یک نقطه | std صفر → تقسیم | محافظت: اگر n<2 std=null |
| محور با range=0 | Coverage تورم | نرمال‌سازی range_i=0 → سهم صفر |
| فاصله جفتی با یک نقطه | NaN | distanceMean=null |

## 7. Telemetry
Counters:
- sensitivity.evals += totalConstraints
- frontier.diversity.computed += 1

## 8. خروجی API پیشنهادی
```
interface ConstraintSensitivity {
  id: string;
  violationRate: number;
  support: number;
  slackMean?: number; slackStd?: number; slackMin?: number; slackP10?: number; slackP90?: number;
  normalizedCriticality: number;
  volatility?: number; stabilityScore?: number;
  lowSupport: boolean;
}
interface ConstraintSensitivitySummary { list: ConstraintSensitivity[]; generatedAt: string; }

interface FrontierDiversityMetrics {
  pointCount: number;
  objectiveRange?: number; objectiveStd?: number;
  axisSpreads?: { axis: string; min: number; max: number; range: number }[];
  pairwiseDistanceMean?: number;
  coverageScore?: number;
  generatedAt: string;
}
```

## 9. همراستایی معماری
- به Robustness: فراهم‌کردن پایه برای adaptive difficulty (کاهش وزن قیود کم‌اثر).
- به Telemetry: قابل اتصال در Rollups آتی (Phase 40) برای داشبورد.
- به DSL توسعه‌ای: داده برای توجیه اضافه‌کردن OR در قیود غالب.
- به Frontier: سنجش کیفیت پخش راه‌حل‌ها قبل از اعمال diversification heuristics.

## 10. شاخص موفقیت (Success Criteria)
- اجرای تست نمونه با ≥3 قید و ≥5 سناریو تولید خروجی شامل حداقل یک قید lowSupport و یک قید critical.
- محاسبه diversity برای جبهه با ≥4 نقطه با coverageScore در (0,1].
- بدون خطای TypeScript و با زمان اجرای زیر 50ms برای 100x20 (تقریبی).

## 11. فازهای بعد مرتبط
- Phase 39b: Adaptive Constraint Tightening.
- Phase 40: Rollup Integration & Dashboard.
- Phase 41: DSL OR / Grouping.

---
Draft آماده پیاده‌سازی.
