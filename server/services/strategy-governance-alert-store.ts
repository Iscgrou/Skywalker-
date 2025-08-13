// Iteration 20 Draft: Governance Alert Persistence (In-Memory Ring Buffer)
// هدف: ذخیره و بازیابی هشدارهای Governance برای ممیزی، تحلیل روند و نرخ تریگر.
// طراحی:
//  - Ring buffer حداکثر N (default 500) رکورد. بر حذف قدیمی‌ترین با ورود جدید.
//  - API:
//      persist(report, context?) => تعداد ثبت شده + متادیتا
//      list({limit?, severity?, strategy?, id?, sinceMs?, afterTimestamp?}) => فیلترینگ سبک
//      stats({windowMs?}) => شمارش بر پایه severity و نرخ تریگر در بازه
//      clear() => تخلیه (برای هارنس)
//  - رکورد AlertRecord: { id, strategy, severity, message, timestamp, governanceGeneratedAt, rationale, hash, context }
//  - Dedup cooldown: اگر همان strategy+id+message در ≤ cooldownMs (default 30000) تکرار شود، چشم‌پوشی (ثبت نشدن).
//  - Hash ساده JSON.stringify برای کمک به تشخیص تغییر rationale.
//  - Thread safety: Node single-thread (بدون قفل). آینده: lock سبک اگر worker threads.
//  - توسعه آینده: مسیر DB + شاخص زمانی.
// سناریوهای اعتبارسنجی در هارنس جدا پیاده می‌شود.

let _db: any = null; let _alertsTable: any = null; let _dbInitTried = false;
async function _ensureDb() {
  if (_dbInitTried) return _db;
  _dbInitTried = true;
  try {
    if (!process.env.DATABASE_URL) throw new Error('No DATABASE_URL');
    const mod = await import('../../server/db.ts');
    const schemaMod = await import('../../shared/schema.ts');
    _db = mod.db; _alertsTable = (schemaMod as any).aiGovernanceAlerts;
  } catch (e) {
    _state.dbReady = false;
  }
  return _db;
}

export interface AlertRecord {
  id: string; strategy: string; severity: 'info'|'warn'|'critical'; message: string; timestamp: string;
  governanceGeneratedAt: string; rationale: any; hash: string; context?: any;
}

interface PersistInput { report: { strategies: Record<string, { alerts: any[] }> ; generatedAt: string }; context?: any; }
interface ListFilters { limit?: number; severity?: ('info'|'warn'|'critical')[]; strategy?: string; id?: string; sinceMs?: number; afterTimestamp?: string; }

const _state = {
  buffer: [] as AlertRecord[],
  max: 500,
  cooldownMs: 30000,
  mode: 'memory' as 'memory'|'db',
  dbReady: true,
  _seq: 0,
};

function _hash(alert: any) {
  try { return Buffer.from(JSON.stringify({ id: alert.id, message: alert.message, rationale: alert.rationale })).toString('base64').slice(0,32); } catch { return 'hash_err'; }
}

export const strategyGovernanceAlertStore = {
  configure(params: { max?: number; cooldownMs?: number; mode?: 'memory'|'db' } = {}) { if (params.max) _state.max = params.max; if (params.cooldownMs) _state.cooldownMs = params.cooldownMs; if (params.mode) _state.mode = params.mode; },
  persist({ report, context }: PersistInput) {
    let added = 0;
    const now = Date.now();
    Object.entries(report.strategies).forEach(([strategy, data]) => {
      data.alerts.forEach(alert => {
        const hash = _hash(alert);
        // Dedup cooldown (strategy+id+message OR same hash) using timestamp recency
        for (let i = _state.buffer.length -1; i >=0; i--) {
          const r = _state.buffer[i];
          const sameCore = r.strategy===strategy && r.id===alert.id && r.message===alert.message;
          const sameHash = r.hash === hash;
          if (sameCore || sameHash) {
            if (now - new Date(r.timestamp).getTime() <= _state.cooldownMs) {
              return; // skip duplicate
            }
            break;
          }
        }
  const rec: AlertRecord = {
          id: alert.id, strategy, severity: alert.severity, message: alert.message,
          timestamp: new Date().toISOString(), governanceGeneratedAt: report.generatedAt, rationale: alert.rationale, hash, context
        };
  // @ts-ignore assign internal stable memory id
  (rec as any)._memId = _state._seq++;
        _state.buffer.push(rec); added++;
        if (_state.buffer.length > _state.max) _state.buffer.splice(0, _state.buffer.length - _state.max);
      });
    });
    // Async fire-and-forget DB insert if mode=db
    if (_state.mode==='db' && added>0) {
      (async () => {
        try {
          await _ensureDb();
          if (!_state.dbReady || !_db) return;
          const rows = _state.buffer.slice(-added);
          for (const r of rows) {
            await _db.insert(_alertsTable).values({
              alertTimestamp: new Date(r.timestamp),
              generatedAt: new Date(r.governanceGeneratedAt),
              strategy: r.strategy,
              alertId: r.id,
              severity: r.severity,
              message: r.message,
              hash: r.hash,
              rationale: r.rationale,
              context: r.context,
              dedupGroup: `${r.strategy}|${r.id}|${r.message}`,
            });
          }
        } catch (e) { console.warn('AlertStore DB insert failed (fallback memory only)', e); _state.dbReady=false; }
      })();
    }
    return { added, total: _state.buffer.length };
  },
  list(filters: ListFilters = {}) {
    let arr = _state.buffer.slice();
    // NOTE: For DB-backed historical queries, future extension: direct SELECT with filters
    if (filters.afterTimestamp) arr = arr.filter(r => r.timestamp > filters.afterTimestamp!);
    if (filters.sinceMs) { const cutoff = Date.now() - filters.sinceMs; arr = arr.filter(r => new Date(r.timestamp).getTime() >= cutoff); }
    if (filters.strategy) arr = arr.filter(r => r.strategy === filters.strategy);
    if (filters.id) arr = arr.filter(r => r.id === filters.id);
    if (filters.severity) arr = arr.filter(r => filters.severity!.includes(r.severity));
    arr.sort((a,b)=> a.timestamp.localeCompare(b.timestamp));
    const limit = filters.limit ?? 100;
    return arr.slice(-limit);
  },
  stats({ windowMs = 60000 }: { windowMs?: number } = {}) {
    const cutoff = Date.now() - windowMs; const recent = _state.buffer.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    const bySeverity: Record<string, number> = { info:0, warn:0, critical:0 };
    recent.forEach(r => bySeverity[r.severity]++);
    return { windowMs, total: recent.length, bySeverity };
  },
  async purgeOlderThan(days: number) {
    if (_state.mode==='db') {
      try {
        await _ensureDb();
        if (_state.dbReady && _db) {
          const cutoff = new Date(Date.now() - days*24*60*60*1000);
          // delete where alert_timestamp < cutoff
          await _db.execute(`DELETE FROM ai_governance_alerts WHERE alert_timestamp < $1`, [cutoff]);
        }
      } catch (e) { console.warn('AlertStore purge failed', e); }
    }
    // memory purge
    const memCutoff = Date.now() - days*24*60*60*1000;
    _state.buffer = _state.buffer.filter(r => new Date(r.timestamp).getTime() >= memCutoff);
  },
  clear() { _state.buffer = []; },
  _state,
};

export function _debugListAlerts() { console.log(strategyGovernanceAlertStore.list({ limit: 10 })); }
