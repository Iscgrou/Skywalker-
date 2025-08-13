// R1.4: Diff Throttling & Caching Service
// In-memory token bucket + LRU cache for explainability diff endpoint.

import { AuditEvents } from './audit-events';
import { auditLogger } from './audit-logger';

interface BucketState { tokens: number; lastRefill: number }
interface CacheEntry { value: any; ts: number; hits: number }

const BUCKET_CAPACITY = Number(process.env.EXPLAIN_DIFF_RATE_CAPACITY || 30); // tokens per window
const BUCKET_REFILL_MS = Number(process.env.EXPLAIN_DIFF_RATE_WINDOW_MS || 5 * 60 * 1000); // 5m default
const CACHE_TTL_MS = Number(process.env.EXPLAIN_DIFF_CACHE_TTL_MS || 2 * 60 * 1000); // 2m
const CACHE_MAX_ENTRIES = Number(process.env.EXPLAIN_DIFF_CACHE_MAX || 100);
const CACHE_MEMORY_WATERMARK_MB = Number(process.env.EXPLAIN_DIFF_CACHE_WATERMARK_MB || 150); // soft limit

const buckets = new Map<string, BucketState>();
const cache = new Map<string, CacheEntry>(); // insertion order => oldest first

function now() { return Date.now(); }

function refillBucket(id: string) {
  const b = buckets.get(id);
  const t = now();
  if (!b) { buckets.set(id, { tokens: BUCKET_CAPACITY - 1, lastRefill: t }); return { allowed:true, remaining: BUCKET_CAPACITY - 1 }; }
  if (t - b.lastRefill >= BUCKET_REFILL_MS) {
    b.tokens = BUCKET_CAPACITY;
    b.lastRefill = t;
  }
  if (b.tokens <= 0) return { allowed:false, remaining:0 };
  b.tokens -= 1;
  return { allowed:true, remaining:b.tokens };
}

export function diffRateLimitConsume(identity: string, context: any): { allowed: boolean; remaining: number } {
  const result = refillBucket(identity);
  if (!result.allowed) {
    auditLogger.warning(AuditEvents.Performance.DiffRateLimited, 'diff rate limited', { identity, remaining: result.remaining }, context as any).catch(()=>{});
  }
  return result;
}

function evictIfNeeded() {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  // remove oldest (Map iteration order)
  const firstKey = cache.keys().next().value;
  if (firstKey) cache.delete(firstKey);
}

export function buildDiffCacheKey(params: { from: string; to: string; lineage: boolean; redaction: string; rbacVersion: number }) {
  return [params.from, params.to, params.lineage?'L1':'L0', params.redaction, 'R'+params.rbacVersion].join('|');
}

export function getCachedDiff(key: string, context: any): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  entry.hits += 1;
  // Move to end (LRU refresh)
  cache.delete(key); cache.set(key, entry);
  auditLogger.info(AuditEvents.Performance.DiffCacheHit, 'diff cache hit', { key, hits: entry.hits }, context as any).catch(()=>{});
  return entry.value;
}

export function setCachedDiff(key: string, value: any) {
  try {
    const mu = (global as any).process?.memoryUsage?.();
    if (mu) {
      const heapUsedMb = Math.round(mu.heapUsed / 1024 / 1024);
      if (heapUsedMb > CACHE_MEMORY_WATERMARK_MB) {
        // Aggressive trim: remove oldest 25% of entries
        const targetRemove = Math.ceil(cache.size * 0.25);
        let removed = 0;
        for (const k of cache.keys()) { cache.delete(k); removed++; if (removed >= targetRemove) break; }
        auditLogger.warning(AuditEvents.Performance.DiffCacheHit, 'diff cache watermark trim', { heapUsedMb, removed, watermarkMb: CACHE_MEMORY_WATERMARK_MB }, {} as any).catch(()=>{});
        if (heapUsedMb > CACHE_MEMORY_WATERMARK_MB + 50) {
          // Skip caching when far above watermark
            return;
        }
      }
    }
  } catch {}
  cache.set(key, { value, ts: now(), hits:0 });
  evictIfNeeded();
}

export function diffCacheStats() {
  let heapUsedMb: number | undefined = undefined;
  try { const mu = (global as any).process?.memoryUsage?.(); if (mu) heapUsedMb = Math.round(mu.heapUsed / 1024 / 1024); } catch {}
  return { size: cache.size, capacity: CACHE_MAX_ENTRIES, watermarkMb: CACHE_MEMORY_WATERMARK_MB, heapUsedMb };
}
