# Spec: Prescriptive Explainability & Lineage (Phase 40 MVP)

نسخه: v0.1 (Draft)
Feature Flag: `PODSE_ROBUST_V1`

## 1. هدف
ایجاد لایه شفافیت برای چرخه تصمیم تجویزی: ثبت تغییرات قیود (Adaptive/Simulation)، نگاشت اثر به شاخص‌های امکان‌پذیری و نقشه Lineage برای آماده‌سازی Governance (Phase 41) و Causal (Phase 42).

## 2. دامنه (In Scope v0.1)
- Trace ثبت رویدادهای تنظیم قید (TIGHTEN/RELAX) با متادیتا (delta, feasibilityΔ, violationΔ).
- Session موقت (Simulation یا Adaptive batch) با قابلیت snapshot.
- Versioning پایه Policy (hash مبتنی بر expressions).
- Lineage Graph ساده (Constraint → Segment → Action → Effect).
- Endpoint latest snapshot.

### Out of Scope v0.1
- Explanation طبیعی زبان (NLG)
- گراف علیتی وزندار
- Rollback نسخه
- Persistence (در حافظه فقط)

## 3. مدل داده
```ts
interface TraceSessionMeta {
  sessionId: string; startedAt: string; finishedAt?: string; policyVersionId?: string;
  constraintsHash?: string; adjustedHash?: string; totalAdjustments: number; estimationUsed: boolean;
}

interface TraceAdjustmentRecord {
  recordId: string; sessionId: string; ts: string;
  constraintId: string; action: 'TIGHTEN'|'RELAX';
  originalExpression: string; adjustedExpression?: string;
  segments: { original: string; adjusted?: string; reasonSkipped?: string; oldValue?: number; newValue?: number; deltaPct?: number; }[];
  feasibilityDelta?: number; violationDelta?: number; estimationMode: boolean;
  notes?: string[]; priority?: number;
}

interface LineageNode { id: string; kind: 'CONSTRAINT'|'SEGMENT'|'ACTION'|'EFFECT'; refId?: string; meta?: any; }
interface LineageEdge { from: string; to: string; type: 'HAS_SEGMENT'|'APPLIED_AS'|'RESULTED_IN'; }
interface LineageGraph { nodes: LineageNode[]; edges: LineageEdge[]; generatedAt: string; }

interface ExplainabilitySnapshot {
  session: TraceSessionMeta; adjustments: TraceAdjustmentRecord[]; lineage: LineageGraph;
  telemetryCounters: Record<string, number>; schemaVersion: 'explain.v1';
}
```

## 4. جریان (Flow)
1. startSession() → ایجاد meta با sessionId.
2. هر adjustment در Simulation → recordAdjustment().
3. بعد از محاسبه feasibility → backfillDeltas() فراخوانی برای درج violationDelta / feasibilityDelta بر اساس aggregate.
4. finalizePolicyVersion(constraints[], adjustments[]) → محاسبه hashes.
5. buildLineageGraph(adjustments) → تولید nodes/edges.
6. latestExplainabilitySnapshot() → بازگشت ساختار ExplainabilitySnapshot.

## 5. Hashing
```
constraintsHash = SHA256(sorted(constraint.id + '|' + constraint.expression))
adjustedHash    = SHA256(sorted(adj.constraintId + '|' + (adj.adjustedExpression||adj.originalExpression)))
policyVersionId = first12Hex(SHA256(constraintsHash + ':' + adjustedHash))
```

## 6. Anti-Examples
| مورد | توضیح | رفتار |
|------|-------|-------|
| قید بدون adjustedExpression | عدم تغییر، ولی ضبط برای شفافیت | deltaPct=0, adjustedExpression=undefined |
| همه segments skipped | feasibilityDelta فقط 0 | notes=['all_segments_skipped'] |
| estimationMode=true | اثر تقریبی | flag estimationUsed در session |
| چندبار ثبت همان constraint | رکوردهای مستقل | aggregate later در UI |
| تغییر بدون deltaPct (old=0) | deltaPct='NA_ZERO_BASE' | جلوگیری از تقسیم بر صفر |

## 7. معیار پذیرش
- ایجاد Snapshot ≤ O(n) بر اساس n=adjustments.
- Graph nodes = Σ segments + adjustments*2 (constraint, effect) حداکثر.
- همه رکوردها دارای sessionId معتبر.
- PolicyVersionId پایدار برای اجرای تکراری بدون تغییر.

## 8. Telemetry
- counter: explain.trace.records
- counter: explain.sessions.started
- counter: explain.sessions.finished

## 9. توسعه آینده
Phase 41: Persist + Version store.  
Phase 42: Causal weighting: افزودن edge types RESULTED_IN با وزن.

## 10. ریسک‌ها
| ریسک | توضیح | Mitigation |
|------|-------|-----------|
| تورم حافظه | رشد رکوردها | محدودیت N آخر (ring buffer) در فاز بعد |
| عدم هماهنگی با Adaptive آینده | Rule types جدید | افزودن field actionMeta قابل توسعه |

## 11. API Endpoint
GET `/api/prescriptive/explain/latest` → { success, snapshot }

## 12. Acceptance Test Scenarios
1. Single tighten → snapshot شامل یک رکورد + graph 3 node.
2. All skipped → notes=['all_segments_skipped'].
3. Estimation mode → session.estimationUsed=true.
4. Duplicate constraint adjustments → دو رکورد، hash پایدار.

وضعیت: آماده پیاده‌سازی Trace Recorder.
