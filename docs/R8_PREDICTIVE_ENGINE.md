# R8: Short-Horizon Predictive Risk Engine

## هدف
پیش‌بینی کوتاه‌مدت (15 دقیقه آینده) برای مولفه‌های ریسک (governance / security / anomaly) و Risk Index جهت:
- آماده‌سازی proactive mitigation
- تغذیه حلقه‌های prescriptive در فازهای بعدی

## افق و گام‌ها
Horizons: 5m, 10m, 15m (سه گام 5 دقیقه‌ای)
به‌روزرسانی پیش‌بینی: هر 1 دقیقه

## مدل ترکیبی (Hybrid EMA + AR(1))
1. محاسبه EMA پایه:
$$ Base_t = \alpha X_t + (1-\alpha) Base_{t-1} $$
\( \alpha = 0.4 \)
2. مؤلفه بازگشت به میانگین (AR decay):
$$ F_{t+h} = Base_t + (\phi^{h/5})(X_t - Base_t) $$
\( \phi = 0.5 \)

## نرمال‌سازی جهت Risk Index
هر مؤلفه با همان تابع dampening لوگاریتمی R3/R6 نرمال می‌شود:
$$ norm(v) = \min(1, \frac{\log_{10}(1+v)}{2}) $$
سپس وزن‌های پویا (R6) اعمال:
$$ RiskForecast_h = 100 * ( norm(G_h)w_G + norm(S_h)w_S + norm(A_h)w_A ) $$

## بازه اطمینان (CI)
Residual ها: تفاوت بین مجموع مؤلفه‌های تحقق یافته و پیش‌بینی گام قبلی.
انحراف معیار بافر 200 residual اخیر: \(\sigma_r\)
CI تقریبی 80٪:
$$ CI_h = RiskForecast_h \pm 1.28 * \sigma_r $$
Clamped به بازه 0 تا 100.

## ساختار وضعیت
```
PredictiveState {
  lastUpdated: number
  residualStd: number
  model: { alpha:number; ar:number }
  points: Array<{
    horizonMin: number
    governance: number
    security: number
    anomaly: number
    riskIndex: number
    ciLow: number
    ciHigh: number
  }>
}
```

## API
GET `/api/intel/predictive/forecast` → PredictiveState

Telemetry Summary افزوده شد:
```
forecast: {
  horizons: number[]
  riskIndex: number[]
  ciLow: number[]
  ciHigh: number[]
}
```

## قیود و ملاحظات
- مدل بسیار سبک (بدون نیاز به وابستگی ML) برای latency پایین
- عدم استفاده از همبستگی بین اجزأ (R7) در این نسخه؛ توسعه آینده: تعدیل φ بر اساس ساختار گراف
- اگر داده ناکافی باشد، forecast از مقدار جاری مشتق می‌شود (factor→0)

## مسیر توسعه آینده (R9+)
- Dynamic parameter tuning (α, φ) مبتنی بر خطای اخیر
- ادغام گراف همبستگی برای multi-variate correction
- Kalman-like update برای کاهش نویز
- Scenario-conditioned forecasting (Load/Threat spikes)
- Drift detection روی residuals برای ریست مدل پایه

## وابستگی‌ها
- R6 weights برای riskIndex
- R7 correlation (آتی برای بهبود)
- Real-time snapshots (R3)

## نسخه
R8 Initial Implementation - MVP
