// R3: Real-time Intelligence Core Types
// تمرکز: قرارداد پایدار برای تبادل رویداد بین لایه‌های امنیت، رفتار، عملیات و استراتژی
// Design Goals:
// - نسخه‌بندی صریح (schemaVersion + hash)
// - Envelope سبک، بدون کوپل به جزئیات داخلی سرویس‌ها
// - قابلیت redaction و tagging
// - تحمل افزودن فیلدهای آینده (forward-compatible)

import crypto from 'crypto';

// دامنه‌های منطقی رویداد
export type IntelDomain =
  | 'audit'
  | 'behavior'
  | 'security'
  | 'governance'
  | 'ops'
  | 'predictive'
  | 'prescriptive';

// انواع پایه رویداد (high-level semantic kind)
export type IntelEventKind =
  | 'user.activity'
  | 'user.anomaly'
  | 'policy.change'
  | 'security.signal'
  | 'ops.metric'
  | 'model.forecast'
  | 'optimization.suggestion'
  | 'governance.alert';

// سطح حساسیت برای کنترل redaction
export type IntelSensitivity = 'public' | 'internal' | 'restricted' | 'secret';

// Priority برای مصرف‌کنندگان پایین‌دستی (مثلاً پنجره‌های سریع)
export type IntelPriority = 1 | 2 | 3 | 4 | 5; // 1=lowest latency critical=5? (معکوس تفسیر نشود)

// Payload کلی (باز، ولی در Envelope generic می‌شود)
export interface IntelBasePayload {
  summary?: string;
  actorId?: string;
  resourceId?: string;
  ip?: string;
  geo?: string;
  tags?: string[];
  metrics?: Record<string, number>;
  data?: Record<string, any>;
}

// Envelope اصلی رویداد
export interface IntelEventEnvelope<P extends IntelBasePayload = IntelBasePayload> {
  id: string;                // snowflake-like id یا uuid
  ts: number;                // epoch millis
  domain: IntelDomain;       // دامنه منطقی
  kind: IntelEventKind;      // نوع معنایی رویداد
  priority: IntelPriority;   // اولویت پردازش
  sensitivity: IntelSensitivity; // سطح حساسیت
  source: string;            // ماژول / سرویس مبدا
  schemaVersion: number;     // نسخه قرارداد
  schemaHash: string;        // hash پایدار تعریف فعلی
  payload: P;                // داده انعطاف‌پذیر
  correlationId?: string;    // زنجیره رویدادی
  parentId?: string;         // رویداد والد در صورت وجود
  flags?: string[];          // پرچم‌های پردازشی (e.g., 'derived','aggregated')
}

// نسخه جاری قرارداد
export const INTEL_SCHEMA_VERSION = 1;

// محاسبه هش ساده قرارداد (برای آشکارسازی تغییر ناخواسته)
// توجه: در صورت تغییر تایپ‌ها، این هش را به‌روز می‌کنیم.
function computeSchemaHash(): string {
  const schemaSignature = [
    'IntelDomain:audit,behavior,security,governance,ops,predictive,prescriptive',
    'IntelEventKind:user.activity,user.anomaly,policy.change,security.signal,ops.metric,model.forecast,optimization.suggestion,governance.alert',
    'Fields:id,ts,domain,kind,priority,sensitivity,source,schemaVersion,schemaHash,payload,correlationId,parentId,flags'
  ].join('|');
  return crypto.createHash('sha256').update(schemaSignature).digest('hex').slice(0,16);
}

export const INTEL_SCHEMA_HASH = computeSchemaHash();

// کارخانه تولید Envelope
export function createIntelEvent<P extends IntelBasePayload>(partial: Omit<IntelEventEnvelope<P>, 'schemaVersion' | 'schemaHash' | 'id' | 'ts'> & { id?: string; ts?: number; }): IntelEventEnvelope<P> {
  return {
    id: partial.id || generateId(),
    ts: partial.ts || Date.now(),
    schemaVersion: INTEL_SCHEMA_VERSION,
    schemaHash: INTEL_SCHEMA_HASH,
    ...partial,
  };
}

// تولید ID ساده (در آینده می‌توان Snowflake افزود)
export function generateId(): string {
  return 'EVT-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8);
}

// ابزار redaction ساده بر اساس حساسیت
export function redactEnvelope<P extends IntelBasePayload>(env: IntelEventEnvelope<P>): IntelEventEnvelope<P> {
  if (env.sensitivity === 'restricted' || env.sensitivity === 'secret') {
    const clone = { ...env, payload: { ...env.payload } };
    if (clone.payload.ip) clone.payload.ip = '***.***.***.***';
    if (clone.payload.geo) clone.payload.geo = 'REDACTED';
    if (clone.payload.data) {
      // حذف کلیدهای محتمل حساس
      for (const k of Object.keys(clone.payload.data)) {
        if (/token|secret|key|password/i.test(k)) {
          clone.payload.data[k] = 'REDACTED';
        }
      }
    }
    return clone;
  }
  return env;
}

// Type Guard برای بررسی سلامت Envelope
export function isIntelEvent(obj: any): obj is IntelEventEnvelope {
  return obj && typeof obj === 'object' && typeof obj.id === 'string' && typeof obj.ts === 'number' && obj.schemaVersion === INTEL_SCHEMA_VERSION;
}

// Minimal runtime validator (قابل توسعه با zod در آینده)
export function validateIntelEvent(env: IntelEventEnvelope): { ok: boolean; errors?: string[] } {
  const errors: string[] = [];
  if (!env.id) errors.push('id missing');
  if (!env.domain) errors.push('domain missing');
  if (!env.kind) errors.push('kind missing');
  if (env.schemaVersion !== INTEL_SCHEMA_VERSION) errors.push('schemaVersion mismatch');
  if (env.schemaHash !== INTEL_SCHEMA_HASH) errors.push('schemaHash mismatch');
  return { ok: errors.length === 0, errors: errors.length ? errors : undefined };
}

// Metrics shape برای فازهای بعد (Aggregator)
export interface IntelAggregationSnapshot {
  windowMs: number;
  eventCount: number;
  byDomain: Record<string, number>;
  byKind: Record<string, number>;
  lastTs: number;
  riskIndex?: number; // محاسبه R3.5
}

// اعلان آماده بودن قرارداد
// (می‌توان در log استارتاپ نمایش داد)
export function logIntelContractReady(logger?: { info: (...a:any[])=>any }) {
  logger?.info?.('intel_contract_ready', 'Intel event contract registered', { version: INTEL_SCHEMA_VERSION, hash: INTEL_SCHEMA_HASH });
}
