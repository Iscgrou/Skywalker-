// R7: Correlative Signal Graph Service
// Computes Pearson correlation coefficients between event kinds over historical rollups.
// Output: graph of nodes (kinds) and edges (|r| >= threshold)

import { db } from '../db';
import { intelRollups } from '../../shared/schema';
import { and, eq, gte } from 'drizzle-orm';

interface CorrelationEdge { source:string; target:string; r:number; strength:'moderate'|'strong'; samples:number; overlap:number; }
interface CorrelationNode { kind:string; mean:number; variance:number; degree:number; total:number; }
interface GraphState {
  lastComputed:number;
  windowMs:number;
  lookbackHours:number;
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
}

const KINDS = ['governance.alert','security.signal','user.anomaly']; // extensible

class IntelCorrelationGraphService {
  private state: GraphState = { lastComputed:0, windowMs:300_000, lookbackHours:24, nodes:[], edges:[] };
  private timer?: any;
  private threshold = 0.6; // absolute r
  private strongCut = 0.75;
  private minOverlap = 10;

  start(intervalMs = 10*60*1000){ // every 10 minutes
    if (this.timer) return;
    this.timer = setInterval(()=> this.compute().catch(()=>{}), intervalMs);
    this.compute();
  }
  stop(){ if (this.timer) clearInterval(this.timer); }
  getGraph(){ return this.state; }

  private async fetchSeries(kind:string, windowMs:number, from:Date){
    const rows = await db.select({ ts:intelRollups.bucketTs, c:intelRollups.eventCount }).from(intelRollups)
      .where(and(eq(intelRollups.windowMs, windowMs), eq(intelRollups.kind, kind), gte(intelRollups.bucketTs, from)))
      .orderBy(intelRollups.bucketTs);
    return rows.map(r=> ({ ts:r.ts, c:r.c }));
  }

  private pearson(a:number[], b:number[]): number | null {
    const n = a.length;
    if (n !== b.length || n < this.minOverlap) return null;
    const mean = (arr:number[])=> arr.reduce((x,y)=>x+y,0)/arr.length;
    const ma = mean(a), mb = mean(b);
    let num = 0, da = 0, db = 0;
    for (let i=0;i<n;i++){
      const xa = a[i]-ma; const xb = b[i]-mb;
      num += xa*xb; da += xa*xa; db += xb*xb;
    }
    const denom = Math.sqrt(da*db) || 0;
    if (!denom) return null;
    return num/denom;
  }

  private alignAndCompute(seriesA:{ts:Date;c:number;}[], seriesB:{ts:Date;c:number;}[]) {
    // join on exact bucket timestamp
    const mapB = new Map(seriesB.map(r=> [r.ts.getTime(), r.c]));
    const aVals:number[] = []; const bVals:number[] = [];
    for (const r of seriesA){
      const valB = mapB.get(r.ts.getTime());
      if (valB !== undefined){ aVals.push(r.c); bVals.push(valB); }
    }
    const r = this.pearson(aVals, bVals);
    return { r, overlap: aVals.length };
  }

  private async compute(){
    const from = new Date(Date.now() - this.state.lookbackHours*60*60*1000);
    let windowMs = this.state.windowMs;
    // try preferred window; if sparse fallback to 1h
    const seriesMap: Record<string, {ts:Date;c:number;}[]> = {};
    for (const k of KINDS){
      seriesMap[k] = await this.fetchSeries(k, windowMs, from);
    }
    const totalCounts = Object.values(seriesMap).reduce((a,s)=> a+s.length,0);
    if (totalCounts < KINDS.length * this.minOverlap){
      windowMs = 3_600_000; // fallback
      for (const k of KINDS){
        seriesMap[k] = await this.fetchSeries(k, windowMs, from);
      }
    }
    const nodes: CorrelationNode[] = [];
    for (const k of KINDS){
      const vals = seriesMap[k].map(r=> r.c);
      if (!vals.length){ nodes.push({ kind:k, mean:0, variance:0, degree:0, total:0 }); continue; }
      const mean = vals.reduce((x,y)=>x+y,0)/vals.length;
      const variance = vals.reduce((x,y)=> x + Math.pow(y-mean,2),0) / vals.length;
      const total = vals.reduce((x,y)=>x+y,0);
      nodes.push({ kind:k, mean, variance, degree:0, total });
    }

    const edges: CorrelationEdge[] = [];
    for (let i=0;i<KINDS.length;i++){
      for (let j=i+1;j<KINDS.length;j++){
        const A = KINDS[i], B = KINDS[j];
        const { r, overlap } = this.alignAndCompute(seriesMap[A], seriesMap[B]);
        if (r === null) continue;
        const abs = Math.abs(r);
        if (abs >= this.threshold){
          edges.push({ source:A, target:B, r, strength: abs>=this.strongCut? 'strong':'moderate', samples: Math.min(seriesMap[A].length, seriesMap[B].length), overlap });
        }
      }
    }
    // degree calc
    const degMap: Record<string, number> = {};
    for (const e of edges){ degMap[e.source] = (degMap[e.source]||0)+1; degMap[e.target] = (degMap[e.target]||0)+1; }
    for (const n of nodes){ n.degree = degMap[n.kind]||0; }

    this.state = { lastComputed: Date.now(), windowMs, lookbackHours:this.state.lookbackHours, nodes, edges };
  }
}

export const intelCorrelationGraph = new IntelCorrelationGraphService();
