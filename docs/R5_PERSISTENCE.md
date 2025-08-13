# فاز R5 - Historical Persistence & Rollups

## 1. هدف
ایجاد لایه پایدار برای نگهداری شمارش رویدادهای پنجره‌ای (60s / 5m / 1h) جهت:
- تحلیل روند (Trend) و کاهش نویز تصمیم‌گیری
- آماده‌سازی adaptive threshold و correlation در فازهای بعد
- کاهش ریسک از دست رفتن context پس از ری‌استارت

## 2. معماری
```
[Producers] -> intelBus -> windowStore -> aggregator
                           |                
                           +--> rollup-writer (30s) -> intel_rollups (PG)
```
Strategy: Pull snapshot → bucket_ts = floor(windowEnd/windowMs)*windowMs → درج domain & kind rows.

## 3. Schema
Table: intel_rollups
- bucket_ts timestamptz
- window_ms int (60_000 | 300_000 | 3_600_000)
- domain text
- kind text (یا '*' برای جمع دامنه)
- event_count int
Index: (window_ms, bucket_ts), (domain, kind, window_ms, bucket_ts)

## 4. Retention (آماده‌سازی آینده)
Env پیشنهادی:
- INTEL_ROLLUP_KEEP_60S_HOURS (پیشفرض 6)
- INTEL_ROLLUP_KEEP_5M_DAYS (پیشفرض 7)
- INTEL_ROLLUP_KEEP_1H_DAYS (پیشفرض 30)
(فعلاً فقط capture؛ پاکسازی در فاز بعد یا job روزانه اضافه می‌شود)

## 5. Flow نوشتن
1. هر 30 ثانیه flush()
2. Snapshot موجود اگر eventCount>0
3. جلوگیری از تکرار: اگر همان bucket_ts قبلاً نوشته شده skip
4. تولید ردیف‌های domain & kind (kind='*' اختیاری - فعلاً فعال)

## 6. API History
GET /intel/history
Query Params:
- windowMs (required) یکی از 60000,300000,3600000
- from, to (ISO) پیشفرض: 6 ساعت گذشته
- domain, kind (اختیاری)
- limit (<=5000)
خروجی: items[] مرتب بر اساس bucket_ts صعودی

## 7. KPI
- Bucket miss ratio < 1%
- Query 24h 5m window < 300ms (limit 2000) در محیط معمول
- عدم افزایش dropped در bus > 0.5% به دلیل flush

## 8. ریسک و کاهش
| ریسک | توضیح | کاهش |
|------|-------|-------|
| رشد حجم سریع | domain/kind انفجاری | Threshold minEventCount + merge future |
| قفل DB | batch بزرگ | batch کوچک، interval 30s |
| انحراف داده تکراری | دوباره نوشتن bucket | lastBucketWritten map |

## 9. توسعه آینده
- Merge & downsample job
- Persistence integrity audit
- Time-series export / Parquet
- Pre-computed anomaly baselines

## 10. وضعیت
✔ Schema & migration
✔ Writer Service
✔ Startup integration
✔ /intel/history API
✖ Retention cleanup (آینده)
✖ Downsampling advanced (آینده)

## 11. معیار پذیرش
- پاسخ /intel/history شامل ردیف‌های window درخواست شده
- درج bucket های متوالی هر ≥ یک دقیقه برای window 60s

