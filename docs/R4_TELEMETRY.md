# فاز R4 - Unified Telemetry & Observability

## 1. هدف
ایجاد سطح مشاهده‌پذیری یکپارچه بر روی Real-time Intelligence (R3) برای:
- تشخیص سریع انحراف نرخ رویداد / گلوگاه
- سنجش سلامت ریسک و مؤلفه‌های governance / security / anomaly
- پایه‌گذاری آتی برای Alerting تطبیقی و Auto-Tuning وزن‌ها

## 2. دامنه
شامل:
- TelemetryHub (in-memory aggregator)
- API های `/telemetry/summary` و `/telemetry/detailed`
- متریک‌های رویدادی، حافظه، ریست‌های Aggregator، پوشش پنجره‌ها
- نقش‌های مجاز: ANALYST, ADMIN, SUPER_ADMIN
خارج از دامنه در این فاز: Persisting تاریخی، Alerting خارجی، Export Prometheus

## 3. معماری خلاصه
```
[Producers] -> intelBus -> windowStore -> intelAggregator
                               |              |
                               +--> TelemetryHub (pull) -> /api/telemetry/*
```
Pull-based (عدم فشار اضافی)؛ بدون وابستگی خارجی.

## 4. متریک‌ها
- Bus: published, delivered, dropped, rejected, queueSize, EPS (استنتاجی)
- Aggregator: riskIndex, components.{governance,security,anomaly}, lastUpdated
- Windows: eventCount, domains, kinds (60s / 5m / 1h)
- Memory: rssMB, heapUsedMB

## 5. شاخص موفقیت (Success KPIs)
| KPI | Target | توضیح |
|-----|--------|-------|
| Latency جمع‌آوری | < 10ms | خواندن summary در بار عادی |
| Overhead CPU | < 1% | عدم لوپ محاسباتی جدید |
| Drop Ratio (steady) | < 0.5% | رویدادهای drop-oldest در نرخ نرمال |
| Rate Limit Trigger | صفر در نرمال | فعال فقط در سناریوهای سوء مصرف |

## 6. ریسک‌ها و کاهش
| ریسک | احتمال | اثر | کاهش |
|------|--------|-----|-------|
| افزایش coupling | متوسط | کندی توسعه فازهای بعد | لایه Hub فقط read-only |
| نبود persistent history | بالا | تحلیل طولانی‌مدت محدود | برنامه فاز R5/R6: persistence adapter |
| سرریز صف قبل از هشدار | متوسط | از دست رفتن سیگنال | اضافه کردن threshold هشدار در R5 |

## 7. توسعه آینده (Preview)
- Export Prometheus (`/metrics`) + labelهای domain/kind (R5)
- Adaptive thresholding برای riskIndex (R6)
- Correlation graph بین domains (R7)

## 8. وضعیت اجرا
✔ TelemetryHub پیاده‌سازی شد
✔ API ها ثبت شدند
✔ مستند حاضر افزوده شد
✖ Persistence تاریخی (فاز بعدی)
✖ Prometheus Export

## 9. معیار پذیرش
- پاسخ `/telemetry/summary` شامل riskIndex و bus.metrics و memory
- پاسخ `/telemetry/detailed` شامل snapshots سه پنجره
- بدون exception در لاگ هنگام بار عادی

## 10. تصمیمات طراحی کلیدی
- Pull aggregation بجای push جهت کاهش backpressure
- عدم افزودن Role Action جدید (استفاده از requireRoles) برای سرعت
- نگه‌داشت ساختار ساده تا قبل از Scale افقی

