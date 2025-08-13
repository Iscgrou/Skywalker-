/**
 * 🛡️ ITERATION 36 - BREACH / FAILURE SCENARIOS (B1..B8)
 * Predictive Analytics & Forecasting Engine (PAFE)
 * هدف: تعریف سناریوهای نقض، تحلیل پیامد، راهکار (Mitigation), معیار پذیرش (Acceptance)
 */

interface BreachScenario {
  id: string;
  title: string;
  description: string;
  impact: string;
  rootCauses: string[];
  mitigation: string[];
  detectionSignals: string[];
  acceptanceCriteria: string[];
  status: 'PENDING' | 'DESIGNED' | 'PASS' | 'FAIL';
}

export const iteration36BreachScenarios: BreachScenario[] = [
  {
    id: 'B1',
    title: 'Data Drift Undetected',
    description: 'توزیع داده ورودی KPI تغییر کرده و مدل بدون تشخیص drift به خروجی نادرست ادامه می‌دهد.',
    impact: 'کاهش دقت پیش‌بینی، تصمیم اشتباه در SDSE.',
    rootCauses: [
      'عدم مانیتور شاخص‌های آماری',
      'عدم تعریف threshold مناسب',
      'تجمع تدریجی drift جزیی'
    ],
    mitigation: [
      'فعال‌سازی Drift Detector با PSI و KS proxy',
      'تعریف هشدار PAFE_FEATURE_DRIFT_DETECTED',
      'سوییچ موقت به baseline heuristic در health=degrading'
    ],
    detectionSignals: [
      'psi_score > 0.2',
      'ks_distance > 0.15',
      'delta moving mean > 3σ'
    ],
    acceptanceCriteria: [
      'تشخیص drift در < 2 چرخه مانیتور',
      'ارسال event هشدار',
      'ثبت تغییر health مدل به degrading'
    ],
    status: 'DESIGNED'
  },
  {
    id: 'B2',
    title: 'Model Performance Decay Hidden',
    description: 'کاهش تدریجی عملکرد بدون ماژول performance tracking.',
    impact: 'پیش‌بینی‌های نادرست بلندمدت و تصمیم اشتباه منابع.',
    rootCauses: [ 'عدم جمع‌آوری actuals', 'تاخیر در evaluation دوره‌ای' ],
    mitigation: [ 'Outcome Collector + scheduled evaluation', 'سقف decay مجاز (مثلاً MAPE رشد > 25%)', 'Trigger PAFE_MODEL_PERFORMANCE_DEGRADED' ],
    detectionSignals: [ 'mape_delta > 0.25', 'rmse_relative_increase > 0.3' ],
    acceptanceCriteria: [ 'تشخیص decay ≤ 1 دوره زمانی', 'بررسی خودکار retraining scheduling' ],
    status: 'DESIGNED'
  },
  {
    id: 'B3',
    title: 'Uncertainty Ignored',
    description: 'فقط p50 گزارش می‌شود و تصمیم‌گیر خطای دامنه ریسک را نمی‌بیند.',
    impact: 'تصمیم‌های پرریسک بدون آگاهی از بازه.',
    rootCauses: [ 'نبود interval generation', 'UI تطبیق‌نیافته', 'عدم الزام SDSE به مصرف bands' ],
    mitigation: [ 'تولید P10/P90', 'اعمال policy: اگر spread زیاد باشد → flag', 'انتشار bands در event PAFE_NEW_FORECAST_PUBLISHED' ],
    detectionSignals: [ 'absence of p10/p90 fields', 'prediction_spread_ratio > threshold' ],
    acceptanceCriteria: [ 'حداقل دو horizon شامل band کامل', 'SDSE دریافت و ذخیره scenarioContextId + bands' ],
    status: 'DESIGNED'
  },
  {
    id: 'B4',
    title: 'Serving Latency Spike',
    description: 'زمان پاسخ پیش‌بینی از SLA عبور می‌کند و SDSE کند می‌شود.',
    impact: 'کاهش responsive بودن تصمیم استراتژیک.',
    rootCauses: [ 'بار همزمان بالا', 'عدم caching', 'مدل پیچیده تک‌نخی' ],
    mitigation: [ 'Prediction Cache', 'Fallback به heuristic در latency>threshold', 'Queue async مسیر طولانی' ],
    detectionSignals: [ 'p95_latency_ms > 500', 'cache_hit_ratio < 0.3' ],
    acceptanceCriteria: [ 'p95_latency_ms < 300 پایدار', 'fallback فعال حداکثر 5% درخواست‌ها' ],
    status: 'DESIGNED'
  },
  {
    id: 'B5',
    title: 'Model Version Mismatch with SDSE Scenario',
    description: 'SDSE توصیه‌ای بر اساس مدل نسخه قدیمی تولید می‌کند ولی نسخه جدید منتشر شده.',
    impact: 'ناهماهنگی تصمیم و داده.',
    rootCauses: [ 'عدم ارسال version در event', 'cache ناسازگار', 'race condition در switch' ],
    mitigation: [ 'Version Manager + atomic swap', 'سناریو: scenarioContextId ذخیره', 'Event شامل modelVersion' ],
    detectionSignals: [ 'scenario.modelVersion != activeModelVersion', 'inconsistent forecastId lineage' ],
    acceptanceCriteria: [ 'عدم mismatch در تست 100 سناریو', 'log mismatch zero' ],
    status: 'DESIGNED'
  },
  {
    id: 'B6',
    title: 'Retraining Storm / Resource Exhaustion',
    description: 'چندین retraining همزمان منابع را قفل می‌کند.',
    impact: 'کاهش ظرفیت سروینگ و تاخیر.',
    rootCauses: [ 'Triggerهای متعدد همزمان', 'عدم rate limit', 'بدون صف زمان‌بندی' ],
    mitigation: [ 'Retraining Orchestrator با semaphore', 'Backoff + merge triggers', 'سقف همزمانی 1 یا 2' ],
    detectionSignals: [ 'active_retrain_jobs > 2', 'queue_wait_time > threshold' ],
    acceptanceCriteria: [ 'همزمانی مجاز رعایت', 'هیچ SLA سروینگ نقض نشده هنگام retrain' ],
    status: 'DESIGNED'
  },
  {
    id: 'B7',
    title: 'Explainability Gap Reduces Trust',
    description: 'مدیران دلیل پیش‌بینی را نمی‌فهمند → کاهش adoption.',
    impact: 'عدم استفاده از خروجی سیستم.',
    rootCauses: [ 'نبود attribution', 'UI فاقد insight', 'عدم ذخیره feature importance' ],
    mitigation: [ 'Explainability Service placeholder (topK features)', 'Event attach feature contributions', 'Exposure API /api/predictive/explain' ],
    detectionSignals: [ 'missing explanations count', 'executive_feedback_score < threshold' ],
    acceptanceCriteria: [ 'هر forecast شامل حداقل 3 feature driver', 'شاخص اعتماد > baseline' ],
    status: 'DESIGNED'
  },
  {
    id: 'B8',
    title: 'Data Quality Degradation (Silent)',
    description: 'کیفیت داده (تازگی، کامل بودن) افت می‌کند ولی پرچم نمی‌شود.',
    impact: 'ورودی آلوده به مدل → پیش‌بینی اشتباه.',
    rootCauses: [ 'عدم ثبت freshnessLag', 'نبود completeness score', 'skip qualityFlags' ],
    mitigation: [ 'Data Quality Assessor', 'Event PAFE_DATA_QUALITY_ISSUE', 'Abort training در severe case' ],
    detectionSignals: [ 'freshnessLagSec > SLA', 'completeness < 0.9' ],
    acceptanceCriteria: [ 'تمام رکوردهای ingestion دارای qualityFlags', 'quality alert < 1% false negative' ],
    status: 'DESIGNED'
  }
];

console.log('🛡️ Iteration 36 Breach Scenarios (B1..B8) defined. STATUS=DESIGNED');
