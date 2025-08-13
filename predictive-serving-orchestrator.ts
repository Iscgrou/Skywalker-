/**
 * 🌐 PAFE - Prediction Orchestrator & Serving
 */
import { EventEmitter } from 'events';
import type { ForecastResult } from './predictive-models-hub';

export class PredictiveServingOrchestrator extends EventEmitter {
  private cache = new Map<string, { data:ForecastResult; ts:number }>();
  private cacheTTLms = 60 * 1000;
  private latencySamples: number[] = [];

  async serveForecast(generator: (h:'P7D'|'P30D',k:string[],c?:any)=>Promise<ForecastResult>, horizon:'P7D'|'P30D', kpis:string[], ctx?:any){
    const key = `${horizon}:${kpis.sort().join(',')}`;
    const start = Date.now();
    if(this.cache.has(key)){
      const entry = this.cache.get(key)!;
      if(Date.now() - entry.ts < this.cacheTTLms){
        this.emit('PAFE_PREDICTION_SERVED', { requestId:key, modelVersion: entry.data.modelVersion, latency: Date.now()-start, cacheHit:true });
        return entry.data;
      } else {
        this.cache.delete(key);
      }
    }
    const forecast = await generator(horizon as any, kpis, ctx);
    this.cache.set(key,{ data: forecast, ts: Date.now() });
    const latency = Date.now()-start;
    this.latencySamples.push(latency);
    this.emit('PAFE_PREDICTION_SERVED', { requestId:key, modelVersion: forecast.modelVersion, latency, cacheHit:false });
    return forecast;
  }

  getServingMetrics(){
    const p95 = this.percentile(this.latencySamples, 95);
    return { cacheSize: this.cache.size, p95LatencyMs: p95 ?? 0 };
  }

  private percentile(arr:number[], p:number){ if(!arr.length) return undefined; const sorted=[...arr].sort((a,b)=>a-b); const idx = Math.floor((p/100)*sorted.length); return sorted[Math.min(idx, sorted.length-1)]; }
}
