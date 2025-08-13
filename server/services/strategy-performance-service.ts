// Iteration 10: Adaptive Strategy Weighting Service
// Aggregates historical decision effectiveness to compute dynamic strategy weights.

import type { InferSelectModel } from 'drizzle-orm';
// Defer schema import to runtime (may be heavy / require pg types). We'll set aiStrategyPerformance when DB present.
let aiStrategyPerformance: any;

let dbPromise: Promise<any> | null = null;
async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  if (!dbPromise) dbPromise = import('../db.ts').then(m => m.db).catch(() => null);
  return dbPromise;
}

export type StrategyPerfRow = {
  id: number;
  strategy: string;
  window: string;
  decisionsCount: number;
  avgEffectiveness: any;
  p90Effectiveness: any;
  decayWeightedScore: any;
  weightsApplied: any;
  updatedAt: Date;
};

const memoryStore: Record<string, StrategyPerfRow> = {};
// Rolling effectiveness buffers per strategy
const effBuffer: Record<string, number[]> = { RISK_MITIGATION: [], EXPEDITE: [], RE_ENGAGE: [], STEADY: [] };
const MAX_BUFFER = 50;
const STRATEGIES = ['RISK_MITIGATION','EXPEDITE','RE_ENGAGE','STEADY'];
type Weights = Record<string, number>;

const DECAY_LAMBDA = 0.93; // exponential decay per decision
const MIN_FLOOR = 0.15;

interface UpdateContext { strategy: string; effectiveness: number | null | undefined; timestamp?: Date; }

function applyDecay(prev: number | undefined) { return (prev ?? 0) * DECAY_LAMBDA; }
function key(strategy: string, window: string) { return `${strategy}::${window}`; }

function normalize(raw: Record<string, number>): Weights {
  const adjusted: Record<string, number> = {};
  STRATEGIES.forEach(s => { adjusted[s] = Math.max(MIN_FLOOR, raw[s] ?? 0); });
  const sum = Object.values(adjusted).reduce((a,b)=>a+b,0) || 1;
  const weights: Weights = {};
  STRATEGIES.forEach(s => { weights[s] = parseFloat((adjusted[s]/sum).toFixed(4)); });
  return weights;
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p/100)*sorted.length)-1);
  return sorted[idx];
}

async function persistRow(row: StrategyPerfRow) {
  const db = await getDb();
  if (!db) { memoryStore[key(row.strategy, row.window)] = row; return; }
  try {
    if (!aiStrategyPerformance) throw new Error('schema not loaded');
    await db.insert(aiStrategyPerformance).values({
      strategy: row.strategy,
      window: row.window,
      decisionsCount: row.decisionsCount,
      avgEffectiveness: row.avgEffectiveness,
      p90Effectiveness: row.p90Effectiveness,
      decayWeightedScore: row.decayWeightedScore,
      weightsApplied: row.weightsApplied
    }).onConflictDoUpdate({
      target: [aiStrategyPerformance.strategy, aiStrategyPerformance.window],
      set: {
        decisionsCount: row.decisionsCount,
        avgEffectiveness: row.avgEffectiveness,
        p90Effectiveness: row.p90Effectiveness,
        decayWeightedScore: row.decayWeightedScore,
        weightsApplied: row.weightsApplied,
        updatedAt: new Date()
      }
    });
  } catch { memoryStore[key(row.strategy, row.window)] = row; }
}

async function loadAll(): Promise<StrategyPerfRow[]> {
  const db = await getDb();
  if (!db) return Object.values(memoryStore);
  try { if (!aiStrategyPerformance) throw new Error('schema not loaded'); return await db.select().from(aiStrategyPerformance); } catch { return Object.values(memoryStore); }
}

interface UnifiedOptions { seed?: number; }
interface UnifiedArtifactStrategy {
  name: string; samples: number; decayScore: number|null; avgEff: number|null; p90Eff: number|null; spread: number|null; earlyGated: boolean;
  basePreModifiers: number; basePostModifiers: number; clampApplied?: number; dominanceCapApplied?: number; floorApplied: boolean; finalWeight: number; rationale: string[];
  modifiers: { stabilityBoostApplied?: boolean; volatilityPenaltyApplied?: boolean; volatilityPenaltyFactor?: number; volatilityClampApplied?: boolean; dominanceCapApplied?: boolean; };
}
interface UnifiedArtifact { version: string; strategies: UnifiedArtifactStrategy[]; normalization: { sumBeforeFloor: number; sumAfterFloor: number; checksum: number }; meta: { earlyGatedStrategies: string[]; params: { DECAY_LAMBDA: number; MIN_FLOOR: number }; seed?: number }; }
const unifiedVersion = 'unified-v1';
function mulberry32(seed: number) { let t = seed >>> 0; return function() { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
async function computeUnifiedWeights(opts: UnifiedOptions = {}): Promise<UnifiedArtifact> {
  const rows = await loadAll();
  const latest: Record<string, StrategyPerfRow | undefined> = {}; rows.forEach(r => { if (r.window === 'LAST_50') latest[r.strategy] = r; });
  const strategies: UnifiedArtifactStrategy[] = []; const early: string[] = [];
  STRATEGIES.forEach(s => {
    const r = latest[s]; const buf = effBuffer[s]; const rationale: string[] = [];
    let earlyGated = false; let decayScore: number|null = null, avgEff: number|null = null, p90Eff: number|null = null, spread: number|null = null;
    let basePre = 0.25; let basePost = 0.25; let floorApplied = false; let clampApplied: number|undefined; let dominanceCapApplied: number|undefined;
    const modifiers: UnifiedArtifactStrategy['modifiers'] = {};
    if (!r || buf.length < 5) { earlyGated = true; early.push(s); strategies.push({ name: s, samples: buf.length, decayScore, avgEff, p90Eff, spread, earlyGated, basePreModifiers: basePre, basePostModifiers: basePost, clampApplied, dominanceCapApplied, floorApplied, finalWeight: 0, rationale, modifiers }); return; }
    decayScore = r.decayWeightedScore ? parseFloat(String(r.decayWeightedScore)) : 0;
    avgEff = r.avgEffectiveness != null ? parseFloat(String(r.avgEffectiveness)) : null;
    p90Eff = r.p90Effectiveness != null ? parseFloat(String(r.p90Effectiveness)) : null;
    spread = (p90Eff!=null && avgEff!=null) ? p90Eff - avgEff : null;
    basePre = Math.max(decayScore, (avgEff ?? 0)/10); basePost = basePre;
    if (spread != null) {
      if (spread < 2) { basePost *= 1.05; modifiers.stabilityBoostApplied = true; rationale.push(`stabilityBoost +5% (spread=${spread.toFixed(2)})`); }
      else if (spread >=4) { const factor = Math.max(0.6, 1 - (spread - 4)*0.08); basePost *= factor; modifiers.volatilityPenaltyApplied = true; modifiers.volatilityPenaltyFactor = factor; rationale.push(`volatilityPenalty factor=${factor.toFixed(3)} (spread=${spread.toFixed(2)})`); }
    }
    strategies.push({ name: s, samples: buf.length, decayScore, avgEff, p90Eff, spread, earlyGated, basePreModifiers: basePre, basePostModifiers: basePost, clampApplied, dominanceCapApplied, floorApplied, finalWeight: 0, rationale, modifiers });
  });
  const stableMax = Math.max(...strategies.map(st => (st.spread!=null && st.spread <2) ? st.basePostModifiers : 0), 0);
  strategies.forEach(st => { if (st.spread!=null && st.spread>=4 && stableMax>0 && st.basePostModifiers > stableMax) { st.basePostModifiers = parseFloat((stableMax*0.95).toFixed(4)); st.clampApplied = st.basePostModifiers; st.modifiers.volatilityClampApplied = true; st.rationale.push(`volatilityClamp -> ${st.basePostModifiers}`); } });
  const withData = strategies.filter(s => !s.earlyGated); if (withData.length === 1) { const st = withData[0]; if (st.spread!=null && st.spread>=4 && st.basePostModifiers > 0.4) { st.basePostModifiers = 0.4; st.dominanceCapApplied = 0.4; st.modifiers.dominanceCapApplied = true; st.rationale.push('dominanceCap 0.4'); } }
  let sumBeforeFloor = 0; strategies.forEach(s => { sumBeforeFloor += s.basePostModifiers; });
  let sumAfterFloor = 0; strategies.forEach(s => { if (s.basePostModifiers < MIN_FLOOR) { s.basePostModifiers = MIN_FLOOR; s.floorApplied = true; s.rationale.push('floorApplied'); } sumAfterFloor += s.basePostModifiers; });
  strategies.forEach(s => { s.finalWeight = parseFloat((s.basePostModifiers / sumAfterFloor).toFixed(4)); });
  const checksum = parseFloat(strategies.reduce((a,b)=>a+b.finalWeight,0).toFixed(6));
  return { version: unifiedVersion, strategies, normalization: { sumBeforeFloor: parseFloat(sumBeforeFloor.toFixed(4)), sumAfterFloor: parseFloat(sumAfterFloor.toFixed(4)), checksum }, meta: { earlyGatedStrategies: early, params: { DECAY_LAMBDA, MIN_FLOOR }, seed: opts.seed } };
}

export const strategyPerformanceService = {
  async updateOnDecision(ctx: UpdateContext) {
    if (!STRATEGIES.includes(ctx.strategy)) return;
    const now = ctx.timestamp ?? new Date();
    const windows = ['LAST_50','7D'];
    for (const w of windows) {
      const k = key(ctx.strategy, w);
      let row = memoryStore[k];
      if (!row) {
        row = { id: 0, strategy: ctx.strategy, window: w, decisionsCount: 0, avgEffectiveness: null, p90Effectiveness: null, decayWeightedScore: null, weightsApplied: null, updatedAt: now } as StrategyPerfRow;
      }
      const prevScore = row.decayWeightedScore ? parseFloat(String(row.decayWeightedScore)) : 0;
      let newScore = applyDecay(prevScore);
      if (ctx.effectiveness != null) newScore += ctx.effectiveness * (1-DECAY_LAMBDA);
      row.decayWeightedScore = parseFloat(newScore.toFixed(4));
      row.decisionsCount = (row.decisionsCount || 0) + 1;
      row.updatedAt = now;
      // Update rolling buffer only for LAST_50 window
      if (w === 'LAST_50' && ctx.effectiveness != null) {
        const buf = effBuffer[ctx.strategy];
        buf.push(ctx.effectiveness);
        if (buf.length > MAX_BUFFER) buf.shift();
        const sorted = [...buf].sort((a,b)=>a-b);
        const avg = buf.reduce((a,b)=>a+b,0)/buf.length;
        const p90 = percentile(sorted, 90);
        row.avgEffectiveness = parseFloat(avg.toFixed(2));
        row.p90Effectiveness = p90 != null ? parseFloat(p90.toFixed(2)) : null;
      }
      memoryStore[k] = row;
      await persistRow(row);
    }
  },
  async getWeights(): Promise<{ weights: Weights; raw: StrategyPerfRow[] }> {
    const artifact = await computeUnifiedWeights();
    const weights: Weights = {} as any;
    artifact.strategies.forEach(s => { weights[s.name] = s.finalWeight; });
    // attach snapshot to LAST_50 rows in memory
    const rows = await loadAll();
    rows.filter(r=>r.window==='LAST_50').forEach(r => { r.weightsApplied = weights; });
    return { weights, raw: rows };
  },
  async getWeightDetails(): Promise<any> {
    return computeUnifiedWeights();
  },
  selectStrategy(opts: { seed?: number } = {}): Promise<{ strategy: string; weights: Weights; artifact: UnifiedArtifact }> {
    return computeUnifiedWeights({ seed: opts.seed }).then(artifact => {
      const weights: Weights = {} as any; artifact.strategies.forEach(s => { weights[s.name] = s.finalWeight; });
      let r = Math.random();
      if (opts.seed != null) { const prng = mulberry32(opts.seed); r = prng(); }
      let acc = 0; let chosen = artifact.strategies[0].name;
      for (const s of artifact.strategies) { acc += s.finalWeight; if (r <= acc) { chosen = s.name; break; } }
      return { strategy: chosen, weights, artifact };
    });
  },
  strategies(): string[] { return [...STRATEGIES]; }
  , _resetForValidation(): void {
    Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
    STRATEGIES.forEach(s => { effBuffer[s] = []; });
  }
  , _testBuffers(): Record<string, number[]> { return effBuffer; }
};

/**
 * Iteration 13 Design (Planned) - Unified Deterministic Strategy Weight Pipeline
 * Goals:
 *  - Single source of truth for computing strategy weights & explainability to eliminate drift.
 *  - Deterministic selection with optional seed for reproducible simulations / A/B tests.
 *  - Structured intermediate artifact capturing stages, modifiers, gating, normalization.
 * Contract Draft:
 *  computeUnifiedWeights(options?: { seed?: number }): {
 *    version: 'unified-v1';
 *    strategies: Array<{
 *      name: string;
 *      samples: number;
 *      decayScore: number|null;
 *      avgEff: number|null;
 *      p90Eff: number|null;
 *      spread: number|null;
 *      earlyGated: boolean;
 *      basePreModifiers: number; // pre stability/volatility mods
 *      basePostModifiers: number; // after stability boost / volatility penalty
 *      clampApplied?: number; // value if volatility clamp triggered
 *      dominanceCapApplied?: number; // value if cap applied
 *      floorApplied: boolean;
 *      finalWeight: number; // normalized
 *      rationale: string[];
 *    }>;
 *    normalization: { sumBeforeFloor: number; sumAfterFloor: number; checksum: number }; // checksum ~1
 *    meta: { earlyGatedStrategies: string[]; params: { DECAY_LAMBDA: number; MIN_FLOOR: number }; seed?: number };
 *  }
 * API Changes:
 *  - getWeights(): wraps computeUnifiedWeights() returning { weights, raw } for backward compatibility.
 *  - getWeightDetails(): returns computeUnifiedWeights() full artifact.
 *  - selectStrategy({ seed? }): uses roulette on unified finalWeight with deterministic PRNG when seed provided.
 * Determinism:
 *  - If seed provided => xorshift32 or mulberry32 PRNG to produce stable selection.
 * Edge Cases / Counterexamples (Validation Set A–E):
 *  A Drift Check: getWeights vs getWeightDetails produce identical weights (tolerance 1e-6)
 *  B Floor Consistency: raw base extremely low (<0.01) -> floorApplied true and finalWeight >= MIN_FLOOR normalized proportionally.
 *  C Volatility Clamp: spread>=4 and score>stableMax triggers clamp (< stableMax * 0.96) rationale contains 'volatilityClamp'.
 *  D Dominance Cap: single strategy with data & volatile spread>=4 -> capped <=0.4 pre-normalization.
 *  E Early Gating: <5 samples => earlyGated true and basePreModifiers=prior (=0.25) with rationale notes.
 * Acceptance Criteria:
 *  - All scenarios pass with no divergence.
 *  - selection({seed}) stable across repeated invocations.
 *  - Performance: O(S) with S=4 strategies trivial; overhead <0.5ms typical in memory mode.
 */
