// Lazy DB import pattern to allow in-memory validation when DATABASE_URL is absent
let dbRef: any = null;
try {
  if (process.env.DATABASE_URL) {
    // dynamic require inside ESM context through await import not feasible here; using static import is fine when env present
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    dbRef = require('../db').db;
  }
} catch { /* silent */ }
import { aiKnowledgeSources, aiKnowledgeEdges, aiDecisionLog } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

interface IngestDecisionParams { decisionId: string; representativeId?: number; effectiveness?: number | null; reasoning?: string; }
interface IngestEvaluationParams { decisionId: string; effectiveness: number | null; }

class KnowledgeGraphService {
  private memory = { sources: [] as any[], edges: [] as any[] };
  private useMemory = !process.env.DATABASE_URL; // fallback for validation harness
  async findOrCreateSource(sourceType: string, referenceId: string, summary?: string, metadata?: any){
    if (this.useMemory){
      const ex = this.memory.sources.find(s=> s.referenceId===referenceId);
      if (ex) return ex;
      const row = { id: this.memory.sources.length+1, sourceType, referenceId, summary, metadata, createdAt: new Date() };
      this.memory.sources.push(row);
      return row;
    }
  const existing = await dbRef.select().from(aiKnowledgeSources).where(eq(aiKnowledgeSources.referenceId as any, referenceId));
    if (existing[0]) return existing[0];
  const rows = await dbRef.insert(aiKnowledgeSources).values({ sourceType, referenceId, summary, metadata }).returning();
    return rows[0];
  }

  async createEdge(fromSourceId: number, toSourceId: number, edgeType: string, weight: number, metadata?: any){
    if (fromSourceId === toSourceId) return null;
    if (this.useMemory){
      const recent = [...this.memory.edges].reverse().slice(0,50);
      const dup = recent.find(e=> e.fromSourceId===fromSourceId && e.toSourceId===toSourceId && e.edgeType===edgeType);
      if (dup) return dup;
      const row = { id: this.memory.edges.length+1, fromSourceId, toSourceId, edgeType, weight: weight.toFixed(4), metadata, createdAt: new Date() };
      this.memory.edges.push(row);
      return row;
    }
    // naive duplicate avoidance: check last few edges
    const recent = await dbRef.select().from(aiKnowledgeEdges)
      .where(eq(aiKnowledgeEdges.fromSourceId as any, fromSourceId))
      .orderBy(desc(aiKnowledgeEdges.createdAt))
      .limit(50);
    const dup = recent.find((e:any)=> e.toSourceId === toSourceId && e.edgeType === edgeType);
    if (dup) return dup;
    const rows = await dbRef.insert(aiKnowledgeEdges).values({ fromSourceId, toSourceId, edgeType, weight: String(weight.toFixed(4)), metadata }).returning();
    return rows[0];
  }

  async ingestDecision(p: IngestDecisionParams | (IngestDecisionParams & { id?: string } )){
    // Support legacy/alias 'id'
    const decisionId = (p as any).decisionId || (p as any).id;
    if (!decisionId) return null;
    if (!this.useMemory && dbRef){
      const decision = await dbRef.select().from(aiDecisionLog).where(eq(aiDecisionLog.decisionId as any, decisionId));
      if (!decision[0]) return null;
    }
    const src = await this.findOrCreateSource('DECISION_LOG', decisionId, p.reasoning?.slice(0,240), { rep: p.representativeId });
    if (p.effectiveness != null) {
      // (Optional) store effectiveness hint inside metadata update (simplistic; full update path omitted)
    }
    return src;
  }

  async ingestEvaluation(p: IngestEvaluationParams){
    if (!this.useMemory && dbRef){
      const dec = await dbRef.select().from(aiDecisionLog).where(eq(aiDecisionLog.decisionId as any, p.decisionId));
      if (!dec[0]) return null;
    }
    const evalRef = `${p.decisionId}:EVAL`;
    const evalNode = await this.findOrCreateSource('TASK_EVALUATION', evalRef, undefined, { effectiveness: p.effectiveness });
    const decisionNode = await this.findOrCreateSource('DECISION_LOG', p.decisionId);
    const weight = (p.effectiveness != null) ? Math.max(0.1, p.effectiveness/10) : 0.1;
    await this.createEdge(decisionNode.id, evalNode.id, 'INFLUENCES', weight, { effectiveness: p.effectiveness });
    return { evaluation: evalNode };
  }

  async relatedSources(referenceId: string, edgeType?: string, limit=10){
    if (this.useMemory){
      const src = this.memory.sources.find(s=> s.referenceId===referenceId);
      if (!src) return [];
      let edges = this.memory.edges.filter(e=> e.fromSourceId===src.id);
      if (edgeType) edges = edges.filter(e=> e.edgeType===edgeType);
      edges = edges.slice(0, limit);
      const targetIds = new Set(edges.map(e=> e.toSourceId));
      return this.memory.sources.filter(s=> targetIds.has(s.id))
        .map(t=> ({ source: referenceId, related: t.referenceId, type: edges.find(e=> e.toSourceId===t.id)?.edgeType, weight: edges.find(e=> e.toSourceId===t.id)?.weight }));
    }
  const srcArr = await dbRef.select().from(aiKnowledgeSources).where(eq(aiKnowledgeSources.referenceId as any, referenceId));
    const src = srcArr[0];
    if (!src) return [];
  let edges: any[] = await dbRef.select().from(aiKnowledgeEdges).where(eq(aiKnowledgeEdges.fromSourceId as any, src.id));
  if (edgeType) edges = edges.filter((e:any)=> e.edgeType === edgeType);
    edges = edges.slice(0, limit);
    if (!edges.length) return [];
  const targetIds = new Set(edges.map((e:any)=> e.toSourceId));
  const allTargets = await dbRef.select().from(aiKnowledgeSources).orderBy(desc(aiKnowledgeSources.createdAt)).limit(200);
  return allTargets.filter((s:any)=> targetIds.has(s.id)).map((t:any)=> ({ source: referenceId, related: t.referenceId, type: edges.find((e:any)=> e.toSourceId===t.id)?.edgeType, weight: edges.find((e:any)=> e.toSourceId===t.id)?.weight }));
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
