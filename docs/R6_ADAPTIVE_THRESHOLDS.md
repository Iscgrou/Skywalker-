# R6: Adaptive Thresholds & Dynamic Risk Weighting

## اهداف
- حذف وابستگی به وزن‌های ثابت در Risk Index
- استفاده از baseline های تاریخی (mean/std) برای تشخیص انحراف
- تنظیم پویا و هموار شده وزن‌ها با EMA برای جلوگیری از نوسان شدید

## منابع داده
1. Real-time snapshots (60s / 300s) از `intelWindowStore`
2. Historical rollups از جدول `intel_rollups` (window=1h یا fallback=5m) در بازه 6 ساعت اخیر

## محاسبات
### Baseline
برای هر kind (`governance.alert`, `security.signal`, `user.anomaly`):
```
mean = Σv / n
variance = Σ(v-mean)^2 / n
std = sqrt(variance)
threshold = mean + K * std   (K = 1.8)
```
Fallback آگر std≈0 و mean>0 ⇒ threshold = mean * 1.5

### Deviation Score
```
if sample < 5 → 0
score = max(0, (current - mean) / (std || mean || 1))
```
Current = تعداد 60s اخیر برای kind مربوطه.

### Dynamic Weights
Base weights: (G=0.40, S=0.35, A=0.25)
```
impactFactor = 1 + α * clamp(score,0..3)    (α=0.15)
adjusted = base * impactFactor
Normalize → Clamp هر وزن بین 0.15..0.55 → Re-normalize
EMA smoothing (β=0.2):
new = prev*(1-β) + candidate*β
```

### Risk Index Integration
در `intel-aggregator` از weights پویا استفاده می‌شود:
```
riskIndex = (gScore*wG + sScore*wS + aScore*wA) * 100
```
که gScore/sScore/aScore نرمال شده log-dampening هستند.

## API
GET `/api/intel/adaptive/status`
- baselines (mean/std/threshold/sample)
- rawScores (deviation ها)
- weights جاری + زمان آخرین محاسبه

POST `/api/intel/adaptive/weights` (ADMIN)
- body: `{ governance?, security?, anomaly? }`
- Manual override → clamp + normalize

## Startup Sequence
1. Aggregator start (5s interval)
2. Rollup Writer start (jitter ~1.5–3.5s)
3. Adaptive Threshold Service start (delay 5–9s) → اولین compute فوری

## توسعه آتی (R7+)
- ادغام correlation graph برای کشف همبستگی متقاطع در وزن‌دهی
- Multi-factor baseline (روز/ساعت) برای الگوهای دیورنال
- Bayesian updating بجای ساده mean/std
- Drift detection (CUSUM / EDD) برای بازتنظیم β و K

## مراقبت‌های کیفی
- حداقل نمونه (sample >=5) برای اعتبار baseline
- Clamp وزن‌ها جلوگیری از سلطه یک سیگنال
- EMA برای جلوگیری از jitter کوتاه مدت

## وابستگی‌ها
- `intel_rollups` (R5)
- `intel-aggregator` (R3/R6 تغییر یافته)

## نسخه
R6 Initial Implementation - MVP
