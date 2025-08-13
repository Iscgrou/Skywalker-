# R11: Resilience & Multi-Node Scaling

هدف: فراهم کردن تحمل‌پذیری خطا (fault tolerance)، جلوگیری از اجرای همزمان وظایف singleton در چند نود، و آماده‌سازی بستر scale-out افقی.

## اهداف کلیدی
- Leader Election پایدار با استفاده از Postgres Advisory Lock
- Heartbeat سبک و پایش سلامت نودها در جدول `cluster_nodes`
- جلوگیری از اجرای همزمان سرویس‌های سنگین (rollup writer, correlation, predictive, prescriptive, scenario) در چند نود
- API و Telemetry برای مشاهده وضعیت کلاستر
- آماده‌سازی Hook برای واکنش به تغییر Leader در آینده (hot failover)

## اجزاء
### 1. جدول `cluster_nodes`
ثبت هر نود با `node_id`, آخرین heartbeat (`last_seen`), و متادیتا.

### 2. Coordinator Service (`cluster-coordinator.ts`)
- تولید شناسه نود (UUID)
- Loop Heartbeat هر 5s => UPSERT در `cluster_nodes`
- Leader Election هر 7s: تلاش برای گرفتن advisory lock (کلید ثابت)
- کش سریع وضعیت (isLeader, lastLeaderChange)

### 3. Leader-Gated Startup
در `server/index.ts` فقط در صورت Leader بودن سرویس‌های singleton آغاز می‌شوند. نودهای follower فقط مسیرهای API و ingestion را ارائه می‌دهند.

### 4. Telemetry Integration
در `telemetry-hub.ts` فیلد `cluster` اضافه شد:
```
cluster: { nodeId, isLeader, leaderNodeId?, nodeCount }
```
(نمای محلی سریع؛ شمارش دقیق از API وضعیت کلاستر قابل استخراج است.)

### 5. API Endpoint
`GET /intel/cluster/status` برمی‌گرداند: وضعیت Leader، شناسه نود، مهر زمانی آخرین تغییر، و لیست نودهای فعال اخیر.

## چرخه حیات Leader
1. نود استارت می‌شود → Heartbeat آغاز
2. تلاش برای گرفتن advisory lock → در صورت موفقیت Leader می‌شود
3. Leader از دست می‌رود (کرش یا نت اسپلیت) → قفل آزاد می‌شود → نود دیگر در next election برنده می‌شود
4. Hook های onLeaderAcquire / onLeaderLose (پایه‌گذاری شده، قابل توسعه برای restart داینامیک وظایف)

## ملاحظات Failover
- دوره بین مرگ Leader و انتخاب جدید ≈ بازه election (حداکثر ~7s)
- وظایف singleton پس از تعویض Leader نیازمند راه‌اندازی مجدد داینامیک هستند (در فاز بعدی می‌توان اضافه کرد)
- امکان اضافه کردن hygiene job برای حذف رکوردهای stale نود (مثلاً >60s بی‌پاسخ) وجود دارد

## بهبودهای آینده
- Dynamic re-hydration: شروع / توقف سرویس‌های singleton در runtime هنگام تغییر Leader بدون نیاز به restart
- Health scoring پیشرفته و خروج نود ناسالم از رقابت انتخاب Leader
- Broadcast رویداد تغییر Leader برای کلاینت‌های WebSocket
- تعمیم advisory lock به چند domain (مثلاً وظایف شارد شده)

## تایید کیفیت
- Syntax و TypeScript بدون خطا پس از اضافه شدن فیلد cluster
- Telemetry summary اکنون شامل بخش cluster است (best-effort, O(1))
- Endpoint وضعیت کلاستر (status) پاسخ می‌دهد بدون وابستگی به اجرای وظایف singleton

---
این فاز بستر مقیاس‌پذیری و تحمل‌پذیری را برای فازهای بعدی (افزایش بار، تقسیم وظایف تحلیلی) آماده می‌کند.
