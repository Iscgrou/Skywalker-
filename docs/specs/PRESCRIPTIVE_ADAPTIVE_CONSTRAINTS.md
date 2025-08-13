# Phase 39b - Adaptive Constraint Weighting & Tightening (Draft)

## 1. هدف (Objectives)
ایجاد مکانیزم سبک خودتنظیم برای:
- تشخیص قیود بحرانی (Critical) و افزایش وزن/سختی آنها.
- شناسایی قیود کم‌اثر یا باثبات و کاهش فشار (Relax) یا علامت‌گذاری برای ادغام/حذف.
- آماده‌سازی برای نسخه‌های آینده (Phase 40+) جهت حلقه بازخورد UI و تنظیمات مدیر.

## 2. ورودی‌ها
- خروجی Sensitivity: violationRate, support, slackMean, stabilityScore, normalizedCriticality, lowSupport.
- تعریف Constraint (شناسه، نوع HARD/SOFT).
- پیکربندی آستانه‌ها (AdaptiveConfig) با مقادیر پیش‌فرض:
  - criticalityHigh >= 0.4
  - criticalityLow < 0.05
  - stabilityHigh >= 0.75
  - supportLow < 0.2
  - slackTightenableMean < 15 (برای قیود با slackMean پایین مثبت)

## 3. خروجی‌ها
لیست تصمیم‌ها:
```
interface AdaptiveConstraintAction {
  id: string;
  action: 'TIGHTEN' | 'RELAX' | 'KEEP' | 'FLAG_REVIEW';
  reason: string;
  suggestedDelta?: number; // برای TIGHTEN/RELAX (مثلاً درصد تغییر حد)
  priority: number; // بالاتر = رسیدگی زودتر
}
```
Summary:
```
interface AdaptiveSummary { actions: AdaptiveConstraintAction[]; generatedAt: string; stats: { tighten: number; relax: number; keep: number; review: number } }
```

## 4. منطق تصمیم (Rule Engine v1)
ترتیب ارزیابی (اولین قانون منطبق غالب است مگر قانون FLAG):
1. اگر lowSupport=true → FLAG_REVIEW (reason: low_support) priority=60
2. اگر violationRate===0 و slackMean>50 → RELAX (reason: over_safe) priority=40 (suggestedDelta = -0.05)
3. اگر normalizedCriticality >= criticalityHigh → TIGHTEN (reason: high_criticality) priority=90 (suggestedDelta = +0.1)
4. اگر normalizedCriticality < criticalityLow و stabilityScore>=stabilityHigh → RELAX (reason: low_impact_stable) priority=50 (suggestedDelta = -0.1)
5. اگر slackMean!=null و slackMean > 0 و slackMean < slackTightenableMean و violationRate>0 → TIGHTEN (reason: narrow_margin) priority=70 (suggestedDelta = +0.05)
6. پیش‌فرض: KEEP priority=10

Note: اگر قید HARD است و RELAX انتخاب شد → تبدیل به FLAG_REVIEW (حفاظتی) مگر slackMean بسیار بالا باشد (>100).

## 5. Anti-Examples و پاسخ
| مورد | خطر | پاسخ |
|------|-----|------|
| slackMean null (عدم داده عددی) | قانون‌های slack اشتباه | پرش قوانین وابسته به slack |
| violationRate بسیار نوسانی (sample کم) | تصمیم زودهنگام | lowSupport flag مقدم |
| composite AND بدون valueLeft/right مستقیم | slack محاسبه نشده | تکیه فقط بر normalizedCriticality و violationRate |
| همه قوانین واجد شرایط (تعارض) | ابهام | ترتیب اولویت خطی + priority فاینال |
| suggestedDelta انباشتی خطرناک | تشدید بیش‌ازحد | نسخه v1 فقط پیشنهاد (بدون اعمال خودکار) |

## 6. Telemetry
- constraints.adaptive.actions += actions.length
- برچسب شمارنده تفکیکی (labels) فاز بعد (خارج scope فعلی)

## 7. ادغام با Rollups
Rollups بخش جدید optional: adaptiveSummary (احصاء فقط counts و top3 by priority)

## 8. معیار موفقیت
- تست نمونه با 5 قید حداقل 3 نوع اقدام تولید کند (TIGHTEN, RELAX, FLAG_REVIEW).
- عدم خطای TypeScript.
- زمان اجرا < 5ms برای 100 قید (تقریبی؛ سبک بودن منطق).

## 9. فازهای بعد
- Phase 39c: Adaptive Feedback Loop (آزمون اثر تغییرات پیشنهادی روی frontier).
- Phase 40: UI Exposure + Rollup Dashboards.
- Phase 41: Probabilistic / Bayesian Adjustment.

---
Draft آماده پیاده‌سازی.
