/**
 * 📥 PAFE - Data Ingestion & Harmonization Layer
 * Iteration 36 | Da Vinci v3
 */
import { EventEmitter } from 'events';

export interface CanonicalPredictiveRecord {
  timestamp: number;
  kpi: string;
  value: number;
  dimensions?: Record<string,string|number>;
  qualityFlags?: { completeness?: number; anomaly?: boolean; freshnessLagSec?: number };
}

export class PredictiveDataIngestion extends EventEmitter {
  private sources: string[] = ['internal:kpi', 'internal:ops'];
  private lastIngestionTs = 0;

  constructor(){ super(); }

  async ingestBatch(raw: any[]): Promise<CanonicalPredictiveRecord[]> {
    const now = Date.now();
    this.lastIngestionTs = now;
    const records: CanonicalPredictiveRecord[] = raw.map(r => ({
      timestamp: r.timestamp || now,
      kpi: r.kpi || 'unknown_kpi',
      value: typeof r.value === 'number'? r.value: Number(r.value)||0,
      dimensions: r.dimensions || {},
      qualityFlags: {
        completeness: this.computeCompleteness(r),
        anomaly: false,
        freshnessLagSec: Math.max(0, (now - (r.timestamp||now))/1000)
      }
    }));
    const lowQuality = records.filter(r => (r.qualityFlags?.completeness||0) < 0.9);
    if (lowQuality.length){
      this.emit('PAFE_DATA_QUALITY_ISSUE', { source:'batch', count: lowQuality.length, ts: now });
    }
    this.emit('ingestionCompleted', { count: records.length, ts: now });
    return records;
  }

  private computeCompleteness(r:any){
    const fields = ['kpi','value'];
    const present = fields.filter(f=> r[f]!==undefined && r[f]!==null).length;
    return present / fields.length;
  }

  getStatus(){
    return { sources: this.sources, lastIngestionTs: this.lastIngestionTs };
  }
}
