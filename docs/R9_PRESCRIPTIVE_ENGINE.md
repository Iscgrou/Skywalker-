# R9: Prescriptive Intelligence Engine

## هدف
تولید پیشنهادهای اجرایی (actionable recommendations) بر پایه وضعیت جاری، پیش‌بینی کوتاه‌مدت، همبستگی سیگنال‌ها و وزن‌های تطبیقی.

## ورودی‌ها
- Risk State (R3/R6): riskIndex + component scores
- Adaptive Weights (R6)
- Correlation Graph (R7)
- Predictive Forecast (R8)
- Baselines (R6 adaptive thresholds)

## دسته‌بندی پیشنهادها
| Category | توضیح |
|----------|-------|
| ESCALATE_RISK | افزایش واکنش، تخصیص منابع |
| TUNE_WEIGHT | تنظیم جزئی وزن‌ها جهت تعادل سیگنال |
| SUPPRESS_NOISE | پیشنهاد کاهش نویز (آتی) |
| INVESTIGATE_SIGNAL | بررسی علت مشترک بین سیگنال‌های همبسته |
| ADJUST_THRESHOLD | تنظیم آستانه هشدار |

## ساختار Recommendation
```
{
  id: string,
  ts: number,
  category: 'ESCALATE_RISK'|'TUNE_WEIGHT'|'SUPPRESS_NOISE'|'INVESTIGATE_SIGNAL'|'ADJUST_THRESHOLD',
  title: string,
  description: string,
  rationale: string,
  impactScore: number (1..100),
  applies?: { weightDelta?: { governance?:number; security?:number; anomaly?:number } },
  status: 'PENDING' | 'APPLIED' | 'SKIPPED'
}
```

## قواعد MVP
1. Escalate اگر forecast 10m > 70 و CI پایین > 55.
2. Tune Weight اگر فاصله بین بیشترین و کمترین وزن > 0.18 ⇒ انتقال 0.03.
3. Investigate اگر یک یال strong (|r|>=0.75) و هر دو component > 50.
4. Adjust Threshold اگر governance baseline mean < 2 ولی riskIndex > 60.

(قواعد SUPPRESS_NOISE رزرو برای نسخه بعد.)

## چرخه ارزیابی
- هر 2 دقیقه یکبار بازتولید لیست پیشنهادها (id جدید).
- وضعیت اعمال شده در حافظه نگهداری (ephemeral).

## API
GET `/api/intel/prescriptive/recommendations`
POST `/api/intel/prescriptive/apply` body: `{ id }`
- اعمال وزن‌ها (برای TUNE_WEIGHT) با `intelAggregator.setWeights`.

## Telemetry
```
prescriptive: {
  pending: number,
  lastEval: timestamp
}
```

## مسیر توسعه آینده (R10+)
- اولویت‌بندی پویا با استفاده از graph centrality
- Chain actions (multi-step remediation plans)
- ادغام با موتور سناریو (R10 Strategic Scenario Intelligence)
- ثبت audit trail برای اعمال تغییرات (persist recommendations)
- Reinforcement feedback (موفقیت / شکست اجرا)

## محدودیت‌ها
- Stateless persistence (فعلاً در حافظه)
- عدم rollback وزن‌ها (بررسی آینده)
- همپوشانی پیشنهادها deduplicate نشده (future clustering)

## نسخه
R9 Initial Implementation - MVP
