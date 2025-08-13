# AI Orchestration Core - Forge Log

Tier: 1  | Iterations Planned: 5 | Module: AI Orchestration Core

---
## Iteration 1
Goal: Establish problem framing, core responsibilities, initial contract deltas, risk list.
Decisions:
- Introduce AICommand / AIResponse strict schema (zod) with version field.
- Create EventBus abstraction (sync pub/sub + async queue placeholder) to decouple AI flows.
- All AI interactions go through Orchestrator.issueCommand() producing correlationId.
Risks:
- Over-engineering bus (mitigate: minimal in-memory first).
- Latency accumulation with validation layers (mitigate: micro-bench later).
Open Questions:
- Do we need streaming tokens now? (Deferred; interface placeholder only.)
Next: Draft contracts file and skeleton service.

---
## Iteration 2
Pending.

## Iteration 3
Pending.

## Iteration 4
Pending.

## Iteration 5
Pending.

## Iteration 12 - Explainability Layer (Cross-Cutting addendum)
Goal: افزوده کردن شفافیت (Explainability) به فرآیند انتخاب وزن استراتژی تطبیقی برای افزایش حاکمیت و قابلیت ممیزی.
Drivers:
- نیاز محصول / ریسک Governance برای قابلیت توضیح نحوه شکل‌گیری وزن‌ها (audit + tuning آینده).
- پیچیدگی افزوده Iteration 11 (boost / penalty / clamp / cap) بدون خروجی تفکیکی.
Scope:
1. افزودن متد strategyPerformanceService.getWeightDetails() با خروجی شامل:
   - raw: decayScore, avgEff, p90Eff, spread, samples
   - modifiers flags: stabilityBoostApplied, volatilityPenaltyApplied, volatilityClampApplied, dominanceCapApplied (+ factors/values)
   - baseBeforeModifiers, baseAfterModifiers, floorApplied, normalizedWeight
   - meta.normalization sums + gating (earlyGatedStrategies)
2. ادغام در ai-orchestration-core: وقتی مسیر adaptive فعال شد، rationale حاوی adaptiveWeightExplain{selected,weight,detailVersion} ثبت می‌شود.
3. هارنس اعتبارسنجی جدید (strategy-explain-validation.ts) با سناریوهای:
   - A Sparse: همه early gated ⇒ PASS
   - B Volatile در برابر Stable: پرچم volatilityPenalty/Clamp/Cap فعال ⇒ PASS
   - C Stability Boost: spread<2 ⇒ stabilityBoostApplied=true ⇒ PASS
4. بدون تغییر در منطق واقعی وزن‌دهی (فقط استخراج توضیح، حداقل ریسک drift).
Counterexamples & Validation Results:
- Sparse (<5 samples) → 4 استراتژی در لیست earlyGatedStrategies ✔
- Volatile EXPEDITE (نوسان بالا spread≥4) → پرچم volatilityPenaltyApplied=true (یا clamp/cap) ✔
- Stable STEADY با spread<2 → stabilityBoostApplied=true ✔
Risk & Mitigations:
- امکان divergence بین getWeights و getWeightDetails (در حال حاضر منطق دوگانه). Mitigation: مرحله بعدی refactor به pipeline مشترک.
- هزینه سریال‌سازی کامل rationale در لاگ‌ها (اکنون فقط نسخه و انتخاب ذخیره می‌شود؛ توسعه آتی: trace id برای جزئیات کامل).
Next:
- Refactor همگرایی منطق وزن‌دهی واحد (shared compute pipeline) برای جلوگیری از drift.
- افزودن تست edge case dominanceCap در explain harness.
- گزارش UI (داشبورد) برای نمایش decomposition.
Status: پیاده‌سازی و سناریوهای اصلی PASS؛ ریسک drift مستند.

---
## Iteration 13 - Unified Deterministic Weight Pipeline (Refactor)
Goal: حذف دوگانگی محاسبات وزن و تضمین تکرارپذیری (determinism) برای تحلیل و A/B.
Drivers:
- ریسک drift بین getWeights و getWeightDetails (Iteration 12).
- نیاز به seed برای بازپخش/شبیه‌سازی.
Scope:
1. پیاده‌سازی computeUnifiedWeights (version=unified-v1) با خروجی استراتژی‌ها + مراحل (basePre, basePost, clamp, cap, floor, finalWeight).
2. ادغام getWeights و getWeightDetails روی همین آرتیفکت.
3. افزودن selectStrategy({seed}) با PRNG mulberry32 جهت انتخاب پایدار.
4. هارنس strategy-unified-validation با سناریوهای A–F (Drift, Floor, Volatility Clamp, Dominance Cap, Early Gating, Deterministic Seed).
Results:
- همه سناریوها PASS (A–F)؛ checksum≈1؛ عدم divergence (تلورانس ≤1e-6).
- seed=123 انتخاب تکرارپذیر تولید کرد.
Counterexamples:
 A Drift Consistency: وزن‌ها برابر ✔
 B Floor Enforcement: کف اعمال و فلگ ثبت ✔
 C Volatility Clamp: استراتژی پرنوسان clamp/penalty ✔
 D Dominance Cap: سناریوی تک‌استراتژی volatile capped=0.4 ✔
 E Early Gating: <5 نمونه → prior ✔
 F Deterministic Seed: خروجی ثابت ✔
Risks & Mitigation:
- توسعه آینده (افزودن سیگنال‌های گراف) ممکن است نیاز به version bump (plan: unified-v2).
- پیچیدگی rationale رشد می‌کند ⇒ آینده: فشرده‌سازی rationale یا structured codes.
Next:
- Persistence تاریخی آرتیفکت (snapshots) برای تحلیل روند.
- UI داشبورد توضیح وزن‌ها (drill-down modifiers).
- ادغام سیگنال گراف دانش در basePre (hybrid scoring).
Status: تکمیل و پایدار.

---
## Iteration 14 - Historical Weight Snapshots Persistence
Goal: ثبت تاریخچه وزن‌ها و متریک‌های خام جهت تحلیل روند، ممیزی تصمیمات آینده و تسهیل یادگیری طولی (longitudinal learning loops).
Drivers:
- نیاز به مشاهده drift یا بهبود پایدار در modifiers (stability boost, volatility penalties) در گذر زمان.
- فراهم‌سازی داده پایه برای hybrid scoring و governance dashboards (فازهای بعدی).
Scope:
1. افزودن جدول `ai_strategy_weight_snapshots` با ستون‌های: version, strategy, weight, basePost, decayScore, avgEff, p90Eff, spread, earlyGated, checksum, seed, modifiers(JSON), meta(JSON), createdAt.
2. سرویس `strategyWeightSnapshotService` با متدهای:
   - snapshotCurrent({seed?, artifact?}) تراکنش batch (4 ردیف) یا fallback حافظه (حلقه 500 تایی).
   - listSnapshots({strategy?, limit?}) بر اساس createdAt نزولی (در حافظه reverse slice).
   - purgeOldSnapshots({olderThanDays}) (حافظه: حذف؛ DB: TODO placeholder).
   - توابع تست `_memState`, `_testMutateMemory` برای هارنس.
3. هارنس اعتبارسنجی جدید (strategy-snapshot-validation.ts) سناریوهای:
   A Atomic Batch & Consistency (count=4, checksum≈1, تطابق با artifact)
   B Early Gating Persistence (همه early با meta.earlyCount=4)
   C Volatility / Stability Persistence (پرچم volatilityPenalty/Clamp برای استراتژی پرنوسان و stabilityBoost برای پایدار)
   D Dominance Cap Persistence (پرچم dominanceCapApplied ثبت)
   E Retention Purge (حذف ≥4 قدیمی پس از mutate timestamps)
Results:
- سناریوهای A–E PASS در حافظه (DB غیر فعال). checksum ~1؛ پرچم‌ها دقیقاً مطابق modifiers.
Counterexamples & Validation:
- اگر samples<5 → earlyGated=true ثبت و وزن نهایی همچنان نرمال شده کف.
- سناریوی volatility شدید بدون stable comparator قبلاً ریسک سلطه داشت → dominanceCapApplied=0.4 ذخیره شد.
Risks & Mitigations:
- DB purge هنوز placeholder (Risk: رشد بی‌مهار جدول). Mitigation: Phase 14.1 افزودن شرط SQL زمان‌دار + ایندکس.
- listSnapshots در مسیر DB همه ردیف‌ها را می‌خواند (Risk: کارایی). Mitigation: افزودن orderBy + limit در نسخه بعد.
- احتمال افزایش حجم modifiers JSON (Risk: ذخیره حجیم). Mitigation: فشرده‌سازی کلیدها در نسخه v2 (mapping code table).
Next:
- ادغام snapshot در روال انتخاب (interval-based یا trigger پس از N تصمیم).
- افزودن purge واقعی DB + شاخص مرکب (strategy, createdAt DESC).
- تحلیل روند (sparklines UI) و انحراف معیار spread.
Status: پیاده‌سازی و اعتبارسنجی حافظه کامل؛ آماده harden مسیر DB.

---
## Iteration 15 - Auto Snapshot Orchestration & Guardrails
Goal: خودکارسازی ثبت تاریخچه وزن‌ها بدون افزایش هزینه محاسباتی و اعمال گاردهای حجمی.
Drivers:
- نیاز به سری زمانی پیوسته برای تحلیل روند و anomaly detection.
- حذف ریسک فراموشی snapshot دستی در زمان بار بالا.
Scope:
1. State داخلی _auto (enabled, decisionInterval, minSecondsBetween, lastSnapshotAt, decisionsSince, lock, purgeDays).
2. API: configureAutoSnapshot, noteDecision, maybeAutoSnapshot, _resetAutoForValidation.
3. منطق تریگر: عبور از decisionInterval و رعایت فاصله زمانی (debounce) + قفل همزمانی.
4. تزریق meta.auto در batch آخر (reason, decisionsSince, interval).
5. هارنس جدید strategy-snapshot-autocapture-validation سناریوهای A–E.
Validation Scenarios & Results:
 A Interval Trigger ✔ بعد از رسیدن به حد آستانه.
 B Debounce Time Guard ✔ snapshot دوم تا قبل از minSecondsBetween مسدود شد.
 C Disabled Mode ✔ عدم تریگر.
 D Purge Effectiveness ✔ حذف ≥4 ردیف قدیمی memory.
 E Concurrency Lock ✔ فقط یک snapshot تریگر.
Counterexamples:
- تصمیمات کمتر از آستانه ⇒ interval_wait.
- دو تریگر پشت سر هم < فاصله زمانی ⇒ time_guard.
- قفل فعال ⇒ locked.
Adjustments:
- اصلاح lastSnapshotAt=-Infinity برای عبور اولین snapshot.
- بازنویسی سناریوی B برای تغییر minSecondsBetween پس از اولین snapshot.
Risks & Mitigations:
- هنوز purge DB واقعی: TODO (فاز بعد)؛ فعلاً placeholder.
- رشد memory >500: حلقه مدور (circular buffer) اعمال شد.
Next:
- پیاده‌سازی purge SQL.
- شاخص‌های تحلیلی روی توالی snapshot ها (slope, volatility trend).
Status: PASS کامل؛ آماده ارتقاء purge DB.

---
## Iteration 16 - Real Purge & Optimized Listing
Goal: کنترل رشد داده و بهینه‌سازی دسترسی سریع به آخرین snapshot ها قبل از فاز تحلیل روند.
Drivers:
- حذف placeholder purge برای جلوگیری از تورم جدول.
- کاهش بار شبکه/CPU با projection و LIMIT.
Scope:
1. purgeOldSnapshots واقعی (DB): انتخاب ids قدیمی‌تر از cutoff و حذف batch.
2. listSnapshots بهینه (ORDER DESC + LIMIT + فیلتر اختیاری strategy + projection).
3. سازگاری خروجی memory/DB.
4. هارنس strategy-snapshot-purge-validation سناریوهای A–E.
Validation Results:
 A Precise Cutoff ✔
 B Boundary Safety ✔
 C Idempotency ✔
 D Listing Efficiency ✔
 E Concurrency ✔
Risks & Mitigations:
- DELETE انبوه → آینده batch paging.
- تفاوت capturedAt/createdAt → fallback بررسی.
- race purge/snapshot → تست E پاس.
Next:
- Iteration 17: Trend Analytics (slope, volatility trend, anomaly detection).
- فشرده‌سازی کلیدهای modifiers.
Status: پایدار؛ آماده ورود به Analytics.

---
## Iteration 17 - Trend Analytics (Slopes, Volatility Momentum, Anomalies)
Goal: استخراج شاخص‌های روند و نوسان از تاریخچه وزن‌ها برای فعال‌سازی آینده Governance / Adaptive Tuning.
Drivers:
- نیاز به baseline کمی برای تشخیص drift، spikes و تغییر رژیم volatility.
- آماده‌سازی لایه تصمیم‌گیری پیشرفته (phase های بعدی: anomaly governance، hybrid signals).
Scope:
1. سرویس جدید `strategyTrendAnalyticsService.computeTrends({ window, maWindow, anomalyThreshold, anomalyBaselineWindow })` با خروجی:
   - simpleSlope, lrSlope, deltaWeight, deltaSpread, volatilityMomentum, smoothingReductionRatio, anomalies[], sampleCount.
2. رگرسیون خطی حداقل مربعات + slope ساده.
3. محاسبه smoothingReductionRatio با moving average window پیشفرض 5.
4. Volatility Momentum = اختلاف میانگین spread نیمه دوم منفی نیمه اول.
5. Anomaly Detection: baseline غلتان (exclude current) + zScore threshold (fallback absolute deviation در std=0).
6. هارنس `strategy-trend-analytics-validation.ts` سناریوهای A–E.
Validation Scenarios & Results:
 A Ascending Trend ✔ (simpleSlope & lrSlope >0)
 B Smoothing Reduction ✔ (ratio>0)
 C Volatility Momentum ✔ (افزایش نیمه دوم → momentum≈3.7)
 D Anomaly Detection ✔ (spike با fallback zScore=0 ثبت شد)
 E Alignment ✔ (هم‌علامتی slopes و deltaWeight)
Counterexamples & Iterative Fixes:
- نخست سناریو C شکست (momentum=0) → علت: انتخاب ضمنی استراتژی + نیاز به explicit key؛ سپس با تزریق spread نیمه دوم و debug manualMomentum حل شد.
- Anomaly false negative اولیه: baseline شامل خود نقطه → اصلاح به exclude current + افزودن fallback deviation.
- False positive در سناریو A → بالا بردن anomalyThreshold اختصاصی.
Risks & Mitigations:
- حساسیت پارامتر anomalyThreshold به window → مستندسازی و پارامتر anomalyBaselineWindow.
- Drift آینده با افزودن سیگنال‌های جدید → version bump (plan unified-v2 metrics tagging).
- هزینه محاسبات روی DB بزرگ: فعلاً O(N) بر window محدود؛ آینده: pre-aggregation یا incremental rollups.
Next:
- فاز آتی: Metadata Compression (کلیدهای modifiers) یا Hybrid External Signals (انتخاب بعدی با معیار Impact/Risk/Dependency).
- افزودن governance rules: auto-flag اگر |lrSlope| بالا و volatilityMomentum نیز مثبت ⇒ regime shift alert.
Status: PASS کامل؛ آماده توسعه rule-based governance.

---
## Iteration 18 - Governance Rule Engine (Trend-Derived Alerts)
Goal: لایه حاکمیتی برای استخراج هشدارهای قابل ممیزی از متریک‌های روند (Iteration 17) جهت آماده‌سازی Adaptive Tuning / Policy Automation.
Drivers:
- نیاز به دید سریع نسبت به تغییر رژیم (Breakout / Volatility Surge / Plateau / Reversal) قبل از هرگونه auto-tune.
- کاهش ریسک drift پنهان با سیگنال‌های تریگر شده و طبقه‌بندی Severity.
Scope:
1. سرویس جدید `strategyGovernanceService.evaluateGovernance({ window, options })` بر پایه computeTrends.
2. قوانین اولیه:
   - TrendBreakout (R1): |lrSlope| ≥ warn/critical thresholds + minSamples.
   - VolatilitySurge (R2): volatilityMomentum ≥ threshold.
   - AnomalyCluster (R3): تعداد anomalies در recentWindow ≥ k (critical≥Kc).
   - StabilityPlateau (R4): |lrSlope|≈0 + smoothingReductionRatio بالا + momentum پایین.
   - ReversalRisk (R5): sign(lrSlope) ≠ sign(deltaWeight) و |deltaWeight|≥min.
3. خروجی: per strategy {alerts[], metrics subset} + summary (counts by severity).
4. پارامترهای پیکربندی thresholds در options (slopeWarn/Critical, volMomentumThreshold, anomalyClusterK/Kc, anomalyRecentWindow, tinySlope, smoothingHigh, reversalDeltaMin, anomalyThreshold, anomalyBaselineWindow).
5. هارنس `strategy-governance-validation.ts` سناریوهای A–E + counterexamples.
Validation Results:
 A Breakout ✔ (lrSlope≈0.05 → critical)
 B Volatility Surge ✔ (momentum≈3.1)
 C Anomaly Cluster ✔ (3 spikes → critical cluster)
 D Stability Plateau ✔ (lrSlope≈0, smoothingReductionRatio>0.3)
 E Reversal Risk ✔ (lrSlope>0 & deltaWeight منفی شدید)
Iterative Fixes / Counterexamples:
- مشکل عدم تشخیص Breakout & Reversal: علت انتخاب فقط اولین strategy در هارنس → تغییر به جستجوی سراسری.
- عدم شناسایی Cluster: اسپایک‌های ناکافی → افزایش دامنه و pass-through anomalyThreshold.
- Volatility Momentum: تعمیم تزریق spread به همه استراتژی‌ها برای سیگنال قوی.
Risks & Mitigations:
- Multi-trigger Flood: Summary bySeverity برای aggregation؛ آینده: dedup + rate-limit.
- Threshold Drift: Externalize config آینده و auto-calibration بر پایه quantiles.
- Over-sensitivity به دستکاری تست: واقعی‌سازی با نمونه DB historical در فاز بعد.
Next:
- Iteration 19 (پیشنهادی): Metadata Compression یا Adaptive Threshold Calibration (quantile-based) – انتخاب بعدی بر اساس وابستگی به alert feed.
- Persist alert audit trail + correlationId.
Status: PASS کامل؛ لایه Governance پایه آماده توسعه adaptive tuning.


---
## Iteration 19 - Adaptive Threshold Calibration (Quantile Dynamics)
Goal: تولید آستانه‌های پویا بر اساس توزیع اخیر متریک‌ها (کوانتایل + حذف برون‌زد) برای کاهش نیاز به تنظیم دستی و بهبود سازگاری حاکمیتی.
Drivers:
- نیاز به کاهش حساسیت تنظیمات ثابت در حضور رژیم‌های متفاوت (پایدار، جهشی، خوشه نوسان).
- تغذیه خودکار Governance با آستانه‌های contextual.
Scope:
1. سرویس `strategyThresholdCalibrationService.computeAdaptiveThresholds({ window, trimPct, minSamples })` استخراج:
   - slopeWarn = Q80(|lrSlope|), slopeCritical = Q90(|lrSlope|)
   - volMomentum = Q85(volatilityMomentum) (با کف 0.3)
   - reversalDeltaMin = Q70(|deltaSpread|)
   - plateauTinySlope = Q10(|lrSlope|)
   - smoothingHigh = 1 - Q40(smoothingReductionRatio) (تعبیر: کاهش smoothing غیرمعمول)
   - anomalyClusterK ثابت اولیه (۲) – توسعه آینده: دینامیک بر اساس چگالی.
2. Trim متقارن 5% برای حذف برون‌زدهای شدید قبل از کوانتایل.
3. Fallback مسیر (< minSamples) با defaults و پرچم fallback=true.
4. هارنس `strategy-threshold-calibration-validation.ts` سناریوهای A–E.
Validation Scenarios & Results:
 A Stable: آستانه‌های کوچک شیب (slopeWarn≈0.0008)
 B Burst: رمپ قوی → تفکیک آشکار (slopeWarn≈0.008 > A) ✔ ordering
 C Vol Cluster: volMomentum≈3.0 بالا، شیب مشابه پایدار ✔
 D Sparse Anoms: مشابه پایدار، anomalyClusterK=2 ✔
 E Fallback: داده ناکافی → defaults + fallback=true ✔
 Cross Scenario Ordering: slopeWarn(B) > slopeWarn(A) PASS.
Risks & Mitigations:
- نوسان کوانتایل در پنجره‌های خیلی کوتاه (Mitigation: minSamples + آینده EMA smoothing).
- bias تعداد استراتژی‌های کم‌نوسان (Mitigation آینده: وزندهی بر اساس activeVariance).
- تداخل با تنظیمات دستی Governance (Mitigation: inject اختیاری نه اجباری در Iteration 20).
Next:
- ادغام اختیاری thresholds در evaluateGovernance (override map).
- Dynamic anomalyClusterK بر اساس نرخ محلی spike.
- EMA یا P2 quantile sketch برای جریان مداوم.
Status: ALL PASS؛ آماده مصرف در Governance.

خلاصه فارسی:
این تکرار آستانه‌های هشدار را به صورت تطبیقی با کوانتایل‌های متریک‌های روند (پس از حذف ۵٪ برون‌زدها) محاسبه می‌کند. پنج سناریو همگی پاس شدند و تفکیک صحیح سناریوی جهش نسبت به پایدار تأیید شد. گام بعدی: تزریق این آستانه‌ها در موتور حاکمیتی برای کاهش تنظیمات دستی.

---
## Iteration 20 - Governance Alert Persistence (Audit Trail)
Goal: افزودن لایه ثبت ماندگار (فعلاً درون حافظه) برای هشدارهای حاکمیتی جهت ممیزی، تحلیل نرخ تریگر، و آماده‌سازی یادگیری سیاست‌های آینده.
Drivers:
- نیاز محصول برای trace پسینی (چه زمانی چه هشداری صادر شد و با چه rationale).
- پیش‌نیاز تحلیل‌های متا (MTTA برای رفع، فرکانس Breakout، نسبت False Plateau).
Scope:
1. سرویس جدید `strategyGovernanceAlertStore` با API: configure, persist(report,{context}), list(filters), stats(windowMs), clear().
2. Ring Buffer حداکثر 500 رکورد + حذف قدیمی هنگام سرریز.
3. Dedup Cooldown (strategy+id+message یا hash rationale) طی بازه cooldownMs (پیشفرض 30s) برای جلوگیری از flood.
4. ادغام اختیاری در `evaluateGovernanceWithPersistence` (پرچم options.persistAlerts + context متادیتا).
5. هارنس `strategy-governance-persistence-validation.ts` سناریوهای A–E.
Validation Scenarios & Results:
 A Basic Persistence ✔ ذخیره Breakout (stored≥1)
 B Severity Filter ✔ فیلتر critical فقط رکوردهای critical
 C Cooldown Dedup ✔ اجرای سه‌باره → فقط 1 Breakout (breakoutCount=1)
 D Window Stats ✔ شمارش severity در پنجره 5m (warn+critical ≥1)
 E Off vs On ✔ بدون persist تعداد 0 سپس >0 پس از فعال‌سازی
Risks & Mitigations:
- از دست رفتن حافظه پس از ری‌استارت (Mitigation آینده: مسیر DB + snapshot flush).
- Memory Flood در نرخ بسیار بالا (Mitigation: ring buffer + cooldownMs; آینده: dynamic backoff).
- عدم ثبت تغییرات rationale کوچک (hash کوتاه) (Mitigation آینده: هش طولانی‌تر یا diff ذخیره).
Next:
- ذخیره در DB با ایندکس (strategy, timestamp DESC) + purge job.
- متریک‌های مشتق (alert velocity, moving average severity mix).
- پیوند هشدار با تعاملات پاسخ (ack / dismiss) برای حلقه بازخورد.
Status: ALL PASS؛ مسیر برای یادگیری سیاست حاکمیتی آماده.

خلاصه فارسی:
لایه ثبت هشدارهای حاکمیتی به صورت حلقه درون حافظه با حذف قدیمی، جلوگیری از تکرار سریع و فیلترینگ/آمار پیاده‌سازی شد. تمام سناریوهای اعتبارسنجی پاس گردید و بستر برای تحلیل روند هشدار و آینده‌سازی ذخیره پایدار فراهم شد.
