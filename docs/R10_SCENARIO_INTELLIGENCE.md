# R10: Scenario Intelligence Engine

## هدف
ارائه سناریوهای آینده‌نگر بر مبنای لایه‌های پیشین (Real-time, Adaptive, Correlation, Predictive, Prescriptive) برای تصمیم‌گیری سریع.

## انواع سناریو (MVP)
1. BASE – استمرار روند فعلی (پیش‌بینی کوتاه‌مدت R8)
2. SURGE – شوک افزایش 30٪ شدت سیگنال (تقویت شده با degree همبستگی)
3. MITIGATED – اثر فرضی اعمال یک پیشنهاد تنظیم وزن (TUNE_WEIGHT)

## ساختار Scenario
```
{
  id: string,
  label: string,
  kind: 'BASE'|'SURGE'|'MITIGATED',
  horizonMins: number[],
  riskSeries: number[],
  ciLow?: number[],
  ciHigh?: number[],
  deltaVsBase: { horizonMin:number; riskDelta:number }[],
  assumptions: string[],
  recommendedActions?: string[]
}
```

## منطق تولید
- Base: مستقیم از `intelPredictiveEngine`.
- Surge: اعمال فاکتور 1.3 * میانگین (1 + 0.1 * degree) گره‌های همبستگی.
- Mitigated: اگر پیشنهاد وزن `TUNE_WEIGHT` در حالت PENDING باشد، کاهش 5% + مجموع delta وزن پیشنهادی روی riskIndex.

## دوره اجرا
هر 2 دقیقه همراه با prescriptive cycle.

## API
GET `/api/intel/scenarios` → `{ lastGenerated, scenarios[] }`

## Telemetry
```
scenarios: { count, lastGen, worstSurge }
```

## مسیر توسعه آینده (R11+)
- Multi-shock matrix (±X% رشد هر component)
- Monte Carlo با توزیع آماری residuals
- Correlation-aware component re-simulation (جایگزین scale مستقیم risk)
- سناریوهای زنجیره‌ای (sequence actions)
- ذخیره تاریخی سناریوها و مقایسه accuracy

## محدودیت‌ها
- بدون ذخیره‌سازی دائمی
- ساده‌سازی scale مستقیم riskIndex (نه کاملا مبتنی بر داده خام component)

## نسخه
R10 Initial Implementation - MVP
