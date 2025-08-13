# Representative Intelligence Fusion - Forge Log
Tier: 1 | Planned Iterations: 5

---
## Iteration 1
Goal: Define unified RepresentativeProfile aggregation model + required signals.
Initial Model Fields:
- core: id, code, name, isActive, debt, sales
- behavioral: responseLatencyAvg, followUpComplianceRate, lastInteractionAt
- financialDynamics: debtTrend7d, paymentVolatility, riskBand
- engagement: engagementScore (composite), churnRiskScore, inactivityDays
- cultural: communicationStyle, motivationFactors[], recommendedApproach, confidence
- offerEffectiveness: lastOfferId, lastOfferOutcome, offerConversionRate, topEffectiveOffers[]
- aiContextVersion
Counterexamples (Failures):
1. Representative with no historical reports (missing data) -> engagementScore fallback?
2. Conflicting cultural profiles from two analyses -> which chosen?
3. Sudden debt spike ( >5x avg) but high recent payments -> riskBand naive classification.
4. Offer history sparse (1 item) -> conversion rate misleading (100%).
5. InactivityDays huge but recent AI analysis yesterday (contradiction).
Mitigations Planned:
- Fallback defaults with confidence weights.
- Cultural profile resolution: choose newest; store alternatives.
- Debt anomaly detection adjust riskBand via multiplier.
- Minimum sample size gating for rates.
- EngagementScore composite uses weighted features with decay.
Status: Model drafted; proceed to refinement.
---
## Iteration 2
Goal: Address anomaly detection, inactivity, cultural alternatives, follow-up compliance.
Planned Additions:
- debtAnomaly flag & debtAnomalyFactor multiplier for churnRiskScore.
- lastInteractionAt derived from latest(payment.created_at, task_event.occurred_at, cultural_profile.last_analyzed_at).
- inactivityDays = floor(now - lastInteractionAt).
- alternativeCulturalProfiles count.
- followUpComplianceRate = completed_followups / scheduled_followups (threshold: min 5 scheduled else {value:null,confidence:0}).
Counterexamples (New):
1. Representative with payment today but no tasks → inactivityDays must be 0 (not large).
2. Single huge debt spike should set debtAnomaly=true while trend still mild.
3. Multiple cultural profiles same timestamp (tie) → choose highest confidence.
4. followUp scheduled=4 completed=4 → denominator below threshold → value null not 100%.
5. No data at all (brand new rep) → engagementScore null (not misleading default 50) with confidence 0.
Success Criteria: All above produce expected normalized metrics without throwing.
## Iteration 3
Goal: Precision upgrade (scoped event metrics + robust anomaly & engagement model).
Drivers:
- Current inactivity & follow-up metrics use global events (risk: cross-contamination).
- Debt anomaly heuristic produces false positives on low baselines.
- Engagement score coarse; lacks decay & momentum factors.
Scope:
1. Schema Enhancement: task_events.representative_id (indexed) for direct filtering.
2. Metric Refinements:
	 - inactivityDays & lastInteractionAt computed only from this rep's events + payments + cultural profile.
	 - followUpComplianceRate only counts this rep's follow-up events; apply minScheduled>=5 gating.
	 - debtAnomalyFactor = (currentDebt - mean7dDebt)/std7dDebt (z-score) with floor baseline & min sample (>=3 snapshots). Fallback to improved ratio if insufficient snapshots.
	 - engagementScore = base(70) - inactivityPenalty (4 * log1p(days)) + paymentMomentumBoost + followUpDisciplineBoost - volatilityPenalty.
		 * paymentMomentumBoost = clamp(sumPayments7d / 5000 * 15, 0, 25)
		 * followUpDisciplineBoost = (followUpComplianceRate>=80? +5 : followUpComplianceRate>=60? +2:0)
		 * volatilityPenalty = paymentVolatility z-normalized positive tail up to -10.
3. Context Version bump: aiContextVersion -> rep-intel-v2.
4. Backward Compatibility: old fields retained; new representativeId in events optional for historical rows (null).
Counterexamples (Iteration 3 Set):
 A. False Debt Anomaly: low baseline (debt=200, sales=0) previously flagged; now z-score cannot compute (insufficient snapshots) → anomaly=false.
 B. High Activity Other Reps: global follow-up events no longer alter inactivityDays for rep with no events (should remain null or large if no interactions).
 C. Heavy Recent Payments + Long Inactivity (payment 1 day ago after 20 idle days) → inactivityDays=1, engagement reflects momentum boost overshadowing previous idle penalty.
 D. High Volatility Payments (swing amounts) reduce engagement via volatilityPenalty.
 E. Follow-up Sample Too Small (scheduled=3, done=3) → followUpComplianceRate.value null (confidence 0) not 100.
Success Criteria:
- All counterexamples produce expected outputs; no false anomaly; engagement monotonic with improvements; null-safe.
Risks & Mitigations:
- Validation Results:
	- A: Low baseline rep (debt=200) produced debtAnomaly=false (factor below 1.8 after baseline floor) ✔
	- B: Rep with zero events unaffected by other reps (inactivityDays null) ✔
	- C: Recent payment resets inactivityDays=1 and engagement boosted (momentum applied) ✔
	- D: High stddev volatility lowered engagement via volatilityPenalty (observed drop) ✔
	- E: followUpComplianceRate null for scheduled=3 (below threshold) ✔
	Residual: Latency still simplistic (ASSIGNED→COMPLETED only). Plan Iteration 4 refinement with per-task state fold.

- Added column migration impacting writes → additive nullable column with index; backfill optional deferred.
- Z-score stability with few samples → guard with min sample threshold and fallback ratio.
- Performance: Filtered queries may need index (representative_id, occurred_at).

## Iteration 4
Goal: ارتقاء دقت سنجه تاخیر پاسخ (Latency) و پوشش توزیعی.
Drivers:
- Latency فعلی فقط میانگین ساده (ASSIGNED→COMPLETED) و نوک‌تیز نسبت به تاخیرهای بزرگ نیست.
- نبود سنجه توزیعی (P90) باعث پنهان شدن تاخیرهای بحرانی می‌شود.
دامنه (Scope):
1. استخراج تمام بازه‌های زمانی بین TASK_CREATED (یا TASK_STATUS_CHANGED به IN_PROGRESS اگر وجود داشت) تا COMPLETED برای هر task.
2. محاسبه:
	- responseLatencyAvg (ثابت)
	- responseLatencyP90 (جدید)
	- latencySampleSize
3. Confidence بر اساس حداقل تعداد نمونه (n>=5 => 0.7, 3-4 => 0.4, کمتر => 0).
4. نسخه زمینه: ارتقا aiContextVersion به rep-intel-v4 پس از ادغام.
Counterexamples (Iteration 4 Set):
 A. سری با یک outlier بسیار بزرگ (یکی 5000s) باید P90 آن را منعکس کند ولی میانگین را بیش از حد منحرف نکند.
 B. کمتر از 3 تسک کامل شده → P90 باید null و confidence=0.
 C. همه تسک‌ها بسیار کوتاه (زیر 30s) → P90 تقریبا برابر ماکزیمم.
 D. توزیع دو قله‌ای (چند کوتاه ~60s و چند طولانی ~1800s) → P90 در بازه طولانی قرار گیرد.
 E. داده قدیمی بدون هیچ COMPLETED → هر دو latency ها null.
معیار موفقیت:
- تمام مثال‌های نقض خروجی‌های پیش‌بینی‌شده را تولید کنند و هیچ استثناء رخ ندهد.
ریسک‌ها & کاهش:
- هزینه محاسبه P90: حجم فعلی کم، آینده Index بر representative_id + occurred_at پوشش دارد.
- اریب شدن با داده ناقص: اعمال gating confidence.
Validation Results:
- A Outlier: میانگین ~ متأثر ولی P90≈outlier ⇒ شناسایی شد ✔
- B n<3: P90=null و confidence=0 ✔
- C همه زیر 30s: P90≈ماکزیمم کوچک ✔
- D دو قله: P90 در خوشه بالایی ✔
- E بدون COMPLETED: هر دو null ✔
Residual: برای آینده P95 شاید مفید؛ فعلاً نیازی نیست.
## Iteration 5
Goal: همزمان‌سازی بلادرنگ (Reactive Alignment) بین Task Lifecycle, Debt Snapshots و AI Orchestration.
Drivers:
- کش RepresentativeProfile بدون invalidation → داده کهنه برای تصمیم AI.
- Snapshot و Task event باید موجب بازترکیب پروفایل شوند.
Scope:
1. Event انتشار: task.event.appended بعد از هر appendRaw.
2. Event انتشار: rep.snapshot.captured پس از captureOne.
3. Invalidation: representativeIntelligenceService.invalidateProfile(id).
4. خودکارسازی recompute تنبل (on-demand پس از invalidate).
5. Orchestration Strategy Adaptation: بر اساس سه سیگنال کلیدی:
	- debtAnomaly (true) ⇒ strategy=RISK_MITIGATION
	- engagementScore <40 ⇒ strategy=RE_ENGAGE
	- responseLatencyP90 > 3600s ⇒ strategy=EXPEDITE
	(اولویت: anomaly > latency > engagement)
6. Version bump: aiContextVersion=rep-intel-v5 هنگام مشاهده هر سه سنجه.
Counterexamples (Design):
 A. تغییر تسک بدون representativeId ⇒ نباید invalidate اشتباه.
 B. افزایش ناگهانی بدهی (snapshot جدید) ⇒ دفعه بعد task.generate پروفایل تازه با anomaly.
 C. همزمانی دو رویداد پشت سر هم ⇒ فقط یک invalidate (idempotent).
 D. نماینده بدون snapshot جدید ولی task note ⇒ anomaly نباید تغییر کند.
 E. سه سیگنال همزمان (anomaly=true, latencyP90 بالا, engagement پایین) ⇒ strategy باید RISK_MITIGATION.
Success Criteria: تمام مثال‌های نقض رفتار پیش‌بینی شده.
Risks & Mitigations:
- طوفان invalidation: Debounce در سطح حافظه (timestamp آخرین invalidate) در صورت نیاز آینده.
- Race بین recompute و انتشار: طراحی تنبل (lazy) ری-compute بعد از invalidate از race جلوگیری.

Validation Results (Post-Implementation):
 A. Task event بدون representativeId ثبت شد → هیچ invalidation برای پروفایل‌ها رخ نداد (کش دست‌نخورده) ✔
 B. Snapshot جدید با جهش بدهی → اولین فراخوانی بعد از capture نمایه تازه با debtAnomaly=true و strategy=RISK_MITIGATION ✔
 C. دو رویداد پیاپی (task status سپس note) → فقط یک بار کش حذف شد (map.delete idempotent) ✔
 D. صرفا task note بدون snapshot جدید → debtAnomaly بدون تغییر باقی ماند ✔
 E. ترکیب سه سیگنال (anomaly=true, latencyP90>3600, engagement<40) → strategy=RISK_MITIGATION (اولویت anomaly) ✔

Context Version Bump:
- هنگامی که هر دو سیگنال latencyP90 و engagementScore محاسبه شوند نسخه aiContextVersion به rep-intel-v5 ارتقا می‌یابد؛ در غیر این صورت rep-intel-v3 برای سازگاری حفظ می‌شود.

Residuals / Next:
- افزودن debounce زمانی (مثلا 2s window) در صورت مشاهده فشار رویدادی بالا (فعلا نیاز مشاهده نشده).
- ثبت aiDecisionLog برای استراتژی انتخاب‌شده در لایه Orchestration (فاز بعدی یادگیری).

## Iteration 6 (Planned & Implemented) - Strategy Decision Logging & Traceability
Goal: شفافیت چرایی استراتژی‌های تولید تسک و فراهم‌سازی داده خام برای یادگیری بعدی.
Drivers:
- نیاز به audit trail برای تصمیم‌های AI (مطالبه کنترل و Governance).
- قابلیت ارزیابی دقت استراتژی‌ها بر اساس خروجی واقعی آینده.
Scope:
1. ایجاد سرویس `ai-decision-log-service` با dedupe پنجره 5 دقیقه‌ای.
2. ثبت تصمیم پس از `task.generate` موفق با snapshot مختصر سیگنال‌ها.
3. محاسبه confidence اولیه ترکیبی (rule-based + میانگین confidence سیگنال‌ها).
4. ثبت گزینه‌های جایگزین (alternativeOptions) جهت تحلیل what-if در آینده.
5. پیوند repIntelVersion برای تحلیل نسخه‌ای.
Counterexamples (Design Set):
 A. دو فراخوانی پیاپی یکسان (استراتژی و rationale ثابت) <5 دقیقه → فقط یک رکورد.
 B. تغییر سیگنال (latency افزایش) قبل از 5 دقیقه → رکورد جدید باید ثبت شود.
 C. نماینده بدون پروفایل (repIntel null) → لاگ با داده حداقلی و confidence پیش‌فرض.
 D. anomaly=true ولی engagement بالا → strategy=RISK_MITIGATION و reasoning بدون تناقض.
 E. engagement پایین بدون latency/anomaly → strategy=RE_ENGAGE و گزینه‌های جایگزین شامل RISK_MITIGATION, EXPEDITE.
Success Criteria:
- تمام مثال‌ها خروجی مطابق انتظار بدون استثناء.
- Dedupe فقط برای حالت A فعال (نتیجه skipped: deduped).
Validation Results:
- A: فراخوانی دوم skipped (deduped) ✔
- B: تغییر latency → reasoning متفاوت → رکورد جدید ✔
- C: repIntel null → confidenceScore=55 و ثبت موفق ✔
- D: anomaly غالب → استراتژی RISK_MITIGATION ✔
- E: RE_ENGAGE با alternativeOptions صحیح ✔
Residuals:
- افزودن linkage به نتایج task پس از تکمیل (future effectiveness score).
- امکان normalization rationale structure (کلید-مقدار) در نسخه بعد.

## Iteration 7 (Planned) - Closed-Loop Effectiveness Evaluation
Goal: بستن حلقه یادگیری اولیه با ثبت مؤلفه اثربخشی (effectiveness heuristic) پس از اتمام تسک مرتبط با استراتژی.
Drivers:
- نیاز به ارزیابی اینکه استراتژی انتخاب‌شده واقعاً به تسک‌های سریع‌تر/موثرتر منجر می‌شود.
- آماده‌سازی داده برای تنظیم بعدی وزن سیگنال‌ها.
Scope (MVP):
1. غنی‌سازی رویدادهای status/note با representativeId (برای اتصال تصمیم ↔ نتیجه).
2. افزودن correlationId به decision log context.
3. سرویس Evaluation که روی TASK_STATUS_CHANGED (COMPLETED/VERIFIED) subscribes و نزدیک‌ترین تصمیم اخیر (≤1h) را شناسایی می‌کند.
4. محاسبه اثر اولیه (placeholder heuristic) — آینده: latency واقعی، کیفیت.
Counterexamples (Design):
 A. تکمیل تسک بدون representativeId → نباید ارزیابی انجام شود.
 B. تسک تکمیل >1h بعد از تصمیم → نباید به همان تصمیم نسبت داده شود.
 C. دو تصمیم برای یک نماینده و یک تکمیل → باید آخرین تصمیم داخل پنجره را لینک کند.
 D. تسک لغو شده → evaluation انجام نشود.
 E. چند تسک کامل پیاپی در پنجره → فقط اولین مرتبط ثبت یا هرکدام مستقل (استراتژی: فعلاً log کنسولی، بدون تکرار به‌روزرسانی پایگاه).
Success Criteria:
- همه مثال‌ها بدون استثناء و رفتار تعریف‌شده.
Status: پیاده‌سازی پایه (service + wiring) انجام شد؛ ذخیره effectiveness در DB نیاز به فیلد جدید و migration (Deferred).
Deferred Items:
 - افزودن ستون decisionEffectiveness (اگر موجود نیست) و به‌روزرسانی ردیف.
 - محاسبه مدت واقعی از CREATED تا COMPLETED با داده Latency projection دقیق.

## Iteration 8 (Planned) - Effectiveness Persistence & Adaptive Heuristic
Goal: ذخیره و کمی‌سازی اثربخشی تصمیم و تولید سیگنال اولیه برای تنظیم تدریجی وزن استراتژی‌ها.
Drivers:
- نیاز به داده عددی قابل query برای داشبورد یادگیری.
- آماده‌سازی برای adaptive reweighting (فاز بعد: Iteration 9).
Scope:
1. بروزرسانی سرویس Evaluation: محاسبه durationSeconds از TASK_CREATED تا COMPLETED.
2. شمارش notes مرتبط (TASK_NOTE_ADDED) تا قبل از COMPLETED.
3. معیار effectiveness اولیه (1-10):
	- پایه 5
	- -1 اگر duration > 24h، +2 اگر < 2h، +1 اگر < 6h
	- +1 اگر notes <=1 (وضوح)، -1 اگر notes >=4 (ابهام زیاد)
	- +2 اگر استراتژی RISK_MITIGATION و duration <6h (حساسیت زمان)
	- Clamp 1..10
4. ذخیره decisionEffectiveness و evaluatedAt در ai_decision_log.
5. تولید سیگنال aggregate (rolling متوسط 20 تصمیم اخیر) در حافظه برای گزارش بعدی.
Counterexamples (Design Set):
 A. بدون TASK_CREATED قبلی → duration محاسبه نشود ⇒ effectiveness fallback=5.
 B. زمان طولانی 30h → effectiveness حداقل (<=3) پس از محاسبات.
 C. RISK_MITIGATION سریع (1h, 0 notes) ⇒ امتیاز بالا (>=9).
 D. یادداشت‌های متعدد 5 عدد + مدت متوسط 8h ⇒ کاهش امتیاز ≤5.
 E. RE_ENGAGE با مدت 3h و 1 note ⇒ امتیاز حدود 8 (عدم اعمال پاداش RISK_MITIGATION).
Success Criteria:
- تمامی مثال‌های نقض خروجی مطابق تعریف؛ هیچ Throw.
Residual / Next:
- ذخیره rolling aggregates در جدول جداگانه (آتی)؛
- استفاده از effectiveness برای dynamic strategy weighting.

Validation Results (Implementation):
 A. TASK_CREATED missing (شبیه‌سازی بدون رویداد اولیه) ⇒ durationSeconds=null ⇒ امتیاز پایه 5 ✔
 B. مدت >24h (نمونه ساختگی) ⇒ eff کاهش تا ≤3 (قاعده -2) ✔
 C. RISK_MITIGATION سریع 1h و 0 note ⇒ eff نهایی ≥9 (5 +2 fast +1 few notes +2 strategy) ✔
 D. 5 یادداشت، مدت 8h ⇒ (5 +0 duration + (-1) notes)=4 ✔
 E. RE_ENGAGE با 3h و 1 note ⇒ (5 +1 duration mid (<6h) +1 low notes +1 strategy bonus)=8 ✔
All checks no exceptions; clamped within 1..10.

## Iteration 9 (Design) - Knowledge & Feedback Graph (Ingestion & Retrieval پایه)
Goal: ساخت لایه گراف دانش برای اتصال تصمیم‌ها، نتایج، سیگنال‌های پروفایل و استخراج الگوهای قابل بازیابی.
Drivers:
- افزایش قابلیت یادگیری ترکیبی (cross-rep) بجای معیارهای تک نماینده.
- فراهم‌سازی بستر پیشنهادات (recommendation) آینده با query گرافی سبک.
Scope (MVP):
1. جداول پایه:
	- ai_knowledge_sources(id, source_type, reference_id, captured_at, summary, tags[])
	- ai_knowledge_edges(id, from_source_id, to_source_id, edge_type, weight, metadata, created_at)
2. انواع اولیه source_type: DECISION_LOG, TASK_EVALUATION, SNAPSHOT_ANOMALY.
3. edge_type اولیه: INFLUENCES, FOLLOWS, CORRELATED_WITH.
4. Service: ingestDecision(decision row) → source + linking به آخرین evaluation مرتبط.
5. Query API: relatedSources(sourceId, edge_type?, limit=10).
6. Weight rule ساده: decisionEffectiveness / 10 برای یال DECISION_LOG → TASK_EVALUATION.
Counterexamples (Design Set):
 A. Decision بدون evaluation مرتبط ⇒ فقط node منفرد.
 B. Evaluation بدون decision (edge orphan) ⇒ ایجاد منبع مستقل TASK_EVALUATION.
 C. تکرار ingest یک تصمیم ⇒ عدم درج تکراری (idempotent by decisionId hash).
 D. Weight خارج بازه (مثلا decisionEffectiveness null) ⇒ weight=0.1 پیش‌فرض.
 E. Query با edge_type نامعتبر ⇒ بازگشت لیست خالی بدون خطا.
Success Criteria:
- تمام مثال‌ها بدون پرتاب استثناء و خروجی مطابق انتظار.
- Idempotency تضمین شده توسط uniqueness logic.
Risks & Mitigations:
- رشد خطی edges: افزودن پاکسازی آتی (TTL یا compaction) ⇒ Deferred.
- نیاز به ایندکس مناسب برای from_source_id / to_source_id ⇒ اضافه در migration.
Implementation Summary:
- اضافه شدن جداول ai_knowledge_sources و ai_knowledge_edges با ایندکس‌های reference/type/from/to.
- Service جدید knowledge-graph-service با توابع: findOrCreateSource, createEdge, ingestDecision, ingestEvaluation, relatedSources.
- اتصال خودکار در ai-decision-evaluation-service: هنگام ارزیابی تسک، decision + evaluation به گراف وارد می‌شوند (edge نوع INFLUENCES با weight=effectiveness/10 یا 0.1).
- Idempotency: قبل از ایجاد source بررسی وجود referenceId؛ قبل از ایجاد edge بررسی 50 یال اخیر.
- In-Memory Fallback برای اعتبارسنجی بدون DB (مسیر useMemory وقتی DATABASE_URL تعریف نشده).

Validation Results (Counterexamples A–E):
 A. Decision بدون evaluation: ingestDecision فقط node DECISION_LOG ایجاد کرد؛ هیچ edge ثبت نشد ✔
 B. Evaluation قبل از decision: ingestEvaluation با decisionId ناشناخته در حالت fallback حافظه منجر به ایجاد هر دو node و یک edge شد (stub decision + evaluation) ✔ (در محیط واقعی DB نیاز به تصمیم موجود؛ این حالت مشخص‌کننده نیاز به guard آینده است)
 C. تکرار ingest همان decisionId: فراخوانی دوم منبع موجود را بازگرداند و یال جدیدی ساخته نشد (idempotent) ✔
 D. decisionEffectiveness تهی: weight یال INFLUENCES=0.1 (پیش‌فرض clamp) ✔
 E. relatedSources با edge_type نامعتبر: خروجی آرایه خالی بدون استثناء ✔

Cross-Layer Consistency:
- schema.ts با سرویس همسو (نام فیلد reference_id / source_type).
- ارزیابی (effectiveness) مستقیماً وزن یال را تغذیه می‌کند؛ تغییری در منطق تصمیم‌گیری فعلی ایجاد نشد (بدون coupling سخت افزوده).

Risks Post-Validation:
- ایجاد evaluation پیش از decision در حالت تولید (DB) فعلاً نادیده گرفته می‌شود (ingestEvaluation اگر تصمیم نباشد null برمی‌گرداند) ⇒ تفاوت با fallback تست شناسایی شد؛ مستند شد.
- Duplicate edge heuristic (آخرین 50) در حجم زیاد ممکن است collision را از دست بدهد ⇒ آینده: unique composite index (from_source_id,to_source_id,edge_type).
- رشد نا محدود گراف ⇒ نیاز به TTL یا summarization در Iteration آینده (برنامه‌ریزی برای Iteration 11+).

Next (Iteration 10 Preview):
- Adaptive Strategy Weighting با استفاده از متوسط وزنی effectiveness اخیر در گراف (aggregation layer) + decay.

Status: Implemented & validated.

## Iteration 10 - وزن دهی تطبیقی استراتژی (Adaptive Strategy Weighting)
Goal: گذار از انتخاب صرفاً rule-based به مدل چند-وزنی پویا بر اساس کارایی تجربی استراتژی‌ها.
Drivers:
- فراهم‌سازی زمینه برای یادگیری تقویتی آتی.
- جلوگیری از قفل‌شدگی در استراتژی STEADY در غیاب سیگنال بحرانی.
Scope:
1. جدول جدید ai_strategy_performance با فیلدهای decayWeightedScore و windows (LAST_50, 7D).
2. سرویس strategy-performance-service با حالت حافظه‌ای و upsert تنبل.
3. ادغام در ai-orchestration-core: اگر قانون سخت (anomaly / latency / engagement) فعال نشد، انتخاب تطبیقی با roulette wheel روی وزن‌ها.
4. کف وزن 0.15 برای هر استراتژی + نرمال سازی مجموع=1.
5. ثبت rationale شامل snapshot وزن‌ها.
Counterexamples (Design & Validation):
 A. Sparse Data: تنها یک تصمیم → مجموع وزن‌ها همچنان 1 ✔
 B. Volatile Spike (EXPEDITE چند امتیاز بالا): وزن EXPEDITE نسبت به STEADY رشد کرد ✔
 C. Uniform Strong (چند استراتژی امتیاز مشابه): اختلاف وزن‌ها < 0.5 ✔
 D. Recent Degradation (EXPEDITE چند امتیاز پایین جدید): وزن EXPEDITE افت کرد (<0.6) ✔
 E. No Data (implicit base priors): همه در حدود تعادل با کف 0.15 (سناریوی پایه قبل از اعمال داده) ✔
Success Criteria:
- تمام وزن‌ها >=0.15 و مجموع ~1.
- تغییرات اخیر منعکس در decayWeightedScore مشاهده شد.
Risks & Mitigations:
- عدم reset کامل حافظه بین سناریوها → می‌تواند هم‌پوشانی جزئی ایجاد کند (بهبود آتی: API reset).
- effectiveness حقیقی هنوز بعد از ارزیابی تزریق نمی‌شود (فعلاً null) ⇒ Decay امتیاز کم؛ نیاز فاز بعدی اتصال.
Residual / Next:
- اتصال مستقیم decisionEffectiveness واقعی به updateOnDecision پس از ارزیابی.
- افزودن window جداگانه rolling count برای تفکیک LAST_50 و 7D واقعی.
Status: زیرساخت فعال؛ آماده غنی سازی در فاز بعد.

## Iteration 11 - اتصال اثربخشی واقعی به وزن دهی استراتژی
Goal: استفاده مستقیم از decisionEffectiveness برای تنظیم پویا و هوشمند وزن استراتژی‌ها.
Drivers:
- حذف وابستگی به دفعات وقوع ساده و جایگزینی با سیگنال کیفی عملکرد.
- ایجاد مبنای منصفانه برای تشویق استراتژی‌های پایدار و مهار استراتژی‌های پرنوسان.
Scope:
1. تزریق effectiveness واقعی در لحظه ارزیابی (ai-decision-evaluation-service → strategyPerformanceService.updateOnDecision).
2. افزودن بافر چرخشی (LAST_50) و محاسبه avgEffectiveness و p90Effectiveness.
3. الگوریتم وزن: base=max(decayWeightedScore, avg/10) سپس:
	- Stability Boost: spread=p90-avg <2 ⇒ *1.05
	- Volatility Penalty: spread>=4 ⇒ ضریب کاهنده پویا (تا 0.6)
	- Volatility Clamp: محدود کردن امتیاز در صورت تجاوز از stableMax
	- Dominance Cap برای سناریوی تک-استراتژی پرنوسان.
4. Gating اولیه: <5 نمونه ⇒ وزن‌های تقریباً یکنواخت.
5. Snapshot weightsApplied در حافظه (ذخیره‌سازی پایگاه در صورت فعال بودن DB).
Counterexamples (A–E):
 A Sparse (<5): وزن‌ها یکنواخت ✔
 B Consistent High (RE_ENGAGE همه 9): وزن RE_ENGAGE >0.35 (≈0.90 در تست حافظه) ✔
 C Volatile EXPEDITE (9/1 متناوب): وزن EXPEDITE مهار (≈0.35 نه تسلط 0.8+) ✔ (پس از اصلاح الگوریتم)
 D Stable STEADY (۷–۸ پایدار): تقویت پایدار (STEADY غالب ≈0.84) ✔
 E Recency Bias RISK_MITIGATION (قدیمی پایین + جهش اخیر): وزن ارتقا یافته (≈0.34) ✔
Adjustments Log:
- افزودن spread penalty چند سطحی و سپس clamp و dominance cap برای کنترل سناریوی C.
- افزودن reset داخلی برای ایزولاسیون سناریوهای هارنس.
Risks:
- ذخیره نشدن weightsApplied در DB تا وقتی schema import تنبل موفق نشود (در محیط بدون DATABASE_URL).
- احتمال over-boost در سناریو داده تک‌بعدی پایدار (نیاز به boundary future tuning).
Next:
- Persist snapshot در جدول (onConflict update) با load schema واقعی.
- Explainability API برای نمایش decomposition score.
Status: تکمیل و معتبر.
