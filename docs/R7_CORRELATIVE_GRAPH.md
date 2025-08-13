# R7: Correlative Signal Graph

## هدف
مدل‌سازی روابط آماری بین سیگنال‌های رخداد (event kinds) برای:
- کشف هم‌حرکتی (co-movement) بین دامنه‌های حاکمیتی، امنیتی و آنومالی
- آماده‌سازی برای R8 (پیش‌بینی و وزن‌دهی مبتنی بر ساختار گراف)
- کاهش نویز با شناسایی الگوهای همبسته و ایجاد فیلترهای هوشمند

## محدوده MVP
Kinds فعلی: `governance.alert`, `security.signal`, `user.anomaly`
پنجره اولیه: 5m rollups (fallback به 1h اگر داده ناکافی)
بازه نگاه به گذشته: 24h
به‌روزرسانی: هر 10 دقیقه

## فرمول
ضریب همبستگی پیرسون:

$$ r_{X,Y} = \frac{\sum_i (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_i (x_i-\bar{x})^2 \sum_i (y_i-\bar{y})^2}} $$

اعتبار: حداقل هم‌پوشانی (overlap) >= 10 bucket.
آستانه ثبت یال: |r| >= 0.60
تقسیم‌بندی شدت:
- strong: |r| >= 0.75
- moderate: 0.60 <= |r| < 0.75

## ساختار داده
```
GraphState {
  lastComputed: number
  windowMs: number
  lookbackHours: number
  nodes: Array<{
    kind: string
    mean: number
    variance: number
    degree: number
    total: number
  }>
  edges: Array<{
    source: string
    target: string
    r: number
    strength: 'moderate'|'strong'
    samples: number   // طول سری کوتاه‌تر
    overlap: number   // bucket های مشترک دقیقا همزمان
  }>
}
```

## API
GET `/api/intel/correlations`
- خروجی: `{ updatedAt, edges }`

GET `/api/intel/correlations/graph`
- خروجی کامل GraphState

Telemetry Summary (R4 توسعه یافته):
```
correlations: {
  edges: number
  strongest?: { pair:[kindA, kindB], r:number }
}
```

## منطق انتخاب پنجره
1. تلاش با window=5m
2. اگر مجموع نمونه‌ها < (kinds * minOverlap) ⇒ fallback به 1h

## قیود و محافظ‌ها
- اگر σ=0 یا variance صفر ⇒ correlation نامعتبر
- اگر overlap < minOverlap ⇒ رد
- محدود بودن kinds هنگام MVP جهت سادگی و عملکرد

## مسیر توسعه آینده (R8+)
- پشتیبانی negative correlation به عنوان یال معکوس (sign نگهداری می‌شود ولی فعلا absolute threshold)
- وزن‌دهی گره‌ها با centrality (degree / weighted degree)
- استفاده از گراف در dynamic weight tuning (تقویت خوشه‌های متنوع برای جلوگیری از bias)
- کشف جوامع (community detection) برای خوشه‌بندی ریسک
- rolling / incremental correlation updates به جای full recompute

## وابستگی‌ها
- `intel_rollups` (R5)
- Adaptive weights (R6) در آینده مصرف سیگنال گراف برای تعدیل حاشیه‌ای

## نسخه
R7 Initial Implementation - MVP
