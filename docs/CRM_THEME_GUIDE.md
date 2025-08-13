# راهنمای تم CRM Neo Aurora

## لایه توکن‌ها
سه سطح: Base (خام) → Semantic (معنایی) → Component (اختصاصی).

## متغیرهای ریشه (نمونه)
```css
:root[data-theme='crm-light'] { /* ... */ }
:root[data-theme='crm-dark'] { /* ... */ }
```

## استفاده در JSX
```tsx
<div className="crm-card p-4">
  <h3 className="text-sm font-semibold">نمونه</h3>
</div>
```

## کلاس‌های کلیدی
- crm-card / crm-card-raised
- crm-kpi ، crm-kpi-delta
- crm-filter-bar ، crm-chip ، crm-chip-active
- crm-timeline ، crm-timeline-item
- crm-nav-rail ، crm-nav-btn

## راهنمای دسترسی
- کنتراست متن اصلی ≥ 4.5:1
- حلقه فوکوس: box-shadow لایه دوگانه
- کاهش حرکت: احترام به prefers-reduced-motion

## توصیه عملکردی
- از گرادیان فقط در حاشیه یا استروک اصلی برند
- در لیست‌های بزرگ (بیش از 100 ردیف) انیمیشن‌های ورود را حذف کنید

## توسعه آینده
- Theme Switcher
- Density Modes (comfortable/compact)
- Chart token scaling

## ماژول Diff Explainability (Phase 41c UI)
### هدف
نمای شفاف تغییرات بین دو نسخه Policy (افزوده / حذف / تغییر یافته) + خلاصه lineage دلتا.

### حالات UI
- idle: انتخاب نشده
- incomplete: فقط یک نسخه انتخاب
- loading: درخواست در حال اجرا
- error: reason (feature_flag_disabled | same_version | missing_from | missing_to)
- empty: هیچ تغییر
- changes: نمایش بخش‌های سه‌گانه

### ساختار داده
ExplainabilityDiffResult.meta.summary => counts و adjustmentCountDelta.
adjustments.added[] | removed[] | modified[] (با deltas.* flags)
lineage (اختیاری) => nodeCountDelta / edgeCountDelta / affectedConstraints

### ضد مثال‌ها (Anti-Examples)
- same_version: پیام هشدار عدم امکان مقایسه
- feature_flag_disabled: پیام نیاز فعالسازی قابلیت
- missing_*: نسخه قدیمی از تاریخچه حذف یا هنوز موجود نشده
- large_set > 200: خلاصه‌سازی (truncate) و نمایش تعداد اضافی

### الگوی رنگ
- Added: success token
- Removed: danger token
- Modified: warning/info chips برای نوع تغییر (expr/act/estim)

### بهینه‌سازی‌های آتی
- Virtualization برای > 2000 رکورد
- Diff expression highlighting token-level
```
