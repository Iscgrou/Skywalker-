/**
 * 🧩 PAFE - Feature Store & Engineering
 */
import { EventEmitter } from 'events';
import type { CanonicalPredictiveRecord } from './predictive-data-ingestion';

export interface FeatureDefinition {
  name: string; version: string; dataType: 'number'|'string'|'categorical'; source: 'batch'|'realtime'|'hybrid';
  transformation: string; lineage: string[]; driftStatus?: 'stable'|'warning'|'drifted';
}

export class PredictiveFeatureStore extends EventEmitter {
  private featureRegistry: Map<string, FeatureDefinition> = new Map();
  private latestFeatureVector: Record<string, number> = {};

  constructor(){ super(); }

  registerFeature(def: FeatureDefinition){
    this.featureRegistry.set(def.name, def);
  }

  listFeatures(){ return Array.from(this.featureRegistry.values()); }

  async buildBatchFeatures(records: CanonicalPredictiveRecord[]): Promise<Record<string, number>> {
    const grouped: Record<string,{sum:number;count:number}> = {};
    for(const r of records){
      if(!grouped[r.kpi]) grouped[r.kpi]={sum:0,count:0};
      grouped[r.kpi].sum += r.value; grouped[r.kpi].count++;
    }
    const feats: Record<string, number> = {};
    Object.entries(grouped).forEach(([k,v])=> feats[`avg_${k}`] = v.sum / v.count);
    this.latestFeatureVector = feats;
    this.emit('featuresUpdated', { ts: Date.now(), size: Object.keys(feats).length });
    return feats;
  }

  getLatestFeatureVector(){ return this.latestFeatureVector; }
}
