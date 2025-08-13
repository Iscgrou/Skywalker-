// R6: Adaptive Threshold & Dynamic Risk Weights Service
// رویکرد MVP: محاسبه baseline (mean/std) از rollups و تنظیم وزن‌های aggregator با EMA

import { db } from '../db';
import { intelRollups } from '../../shared/schema';
import { intelAggregator } from './intel-aggregator';
import { and, eq, gte } from 'drizzle-orm';

interface BaselineStat { mean:number; std:number; sample:number; threshold:number; }
interface AdaptiveState {
  lastComputed: number;
  baselines: Record<string, BaselineStat>;
  weights: { governance:number; security:number; anomaly:number };
  rawScores: Record<string, number>;
}

const DEFAULT_BASE_WEIGHTS = { governance:0.4, security:0.35, anomaly:0.25 };

class IntelAdaptiveThresholdsService {
  private state: AdaptiveState = { lastComputed:0, baselines:{}, weights:{...DEFAULT_BASE_WEIGHTS}, rawScores:{} };
  private timer?: any;
  private beta = 0.2; // EMA factor
  private lookbackHours = 6; // historical window
  private stdK = 1.8; // threshold multiplier

  start(intervalMs = 60_000){
    if (this.timer) return;
    this.timer = setInterval(()=> this.compute(), intervalMs);
    this.compute();
  }
  stop(){ if (this.timer) clearInterval(this.timer); }

  getState(){ return this.state; }

  setManualWeights(w: Partial<{ governance:number; security:number; anomaly:number }>) {
    // clamp
    const clamp = (v:number)=> Math.min(0.55, Math.max(0.15, v));
    this.state.weights = { ...this.state.weights, ...Object.fromEntries(Object.entries(w).map(([k,v])=> [k, clamp(v!) ])) } as any;
  }

  private async fetchCounts(kind: string, windowMs: number, from: Date): Promise<number[]> {
    // جمع buckets kind/windowMs >= from
    const rows = await db.select({ c: intelRollups.eventCount }).from(intelRollups)
      .where(and(eq(intelRollups.windowMs, windowMs), eq(intelRollups.kind, kind), gte(intelRollups.bucketTs, from)));
    return rows.map(r=> r.c); // ممکن است خالی باشد
  }

  private stats(values: number[]): BaselineStat {
    if (!values.length) return { mean:0, std:0, sample:0, threshold:1 };
    const mean = values.reduce((a,b)=>a+b,0)/values.length;
    const variance = values.reduce((a,b)=> a + Math.pow(b-mean,2),0) / (values.length||1);
    const std = Math.sqrt(variance);
    const threshold = mean + this.stdK * std || (mean>0? mean*1.5:1);
    return { mean, std, sample: values.length, threshold };
  }

  private deviation(current: number, base: BaselineStat): number {
    if (base.sample < 5) return 0; // داده ناکافی
    const denom = base.std || (base.mean>0? base.mean:1);
    return Math.max(0, (current - base.mean)/denom);
  }

  private computeWeights(scores: { governance:number; security:number; anomaly:number }){
    // impactFactor = 1 + alpha * normalizedScore
    const alpha = 0.15;
    const apply = (base:number, score:number)=> base * (1 + alpha * Math.min(3, score));
    let gw = apply(DEFAULT_BASE_WEIGHTS.governance, scores.governance);
    let sw = apply(DEFAULT_BASE_WEIGHTS.security, scores.security);
    let aw = apply(DEFAULT_BASE_WEIGHTS.anomaly, scores.anomaly);
    // normalize
    const sum = gw+sw+aw;
    gw/=sum; sw/=sum; aw/=sum;
    // clamp
    const clamp = (v:number)=> Math.min(0.55, Math.max(0.15, v));
    gw = clamp(gw); sw = clamp(sw); aw = clamp(aw);
    // re-normalize after clamp
    const sum2 = gw+sw+aw; gw/=sum2; sw/=sum2; aw/=sum2;
    // EMA smoothing
    const prev = this.state.weights;
    gw = prev.governance*(1-this.beta)+gw*this.beta;
    sw = prev.security*(1-this.beta)+sw*this.beta;
    aw = prev.anomaly*(1-this.beta)+aw*this.beta;
    return { governance: gw, security: sw, anomaly: aw };
  }

  private async compute(){
    try {
      const from = new Date(Date.now() - this.lookbackHours*60*60*1000);
      const kinds = ['governance.alert','security.signal','user.anomaly'];
      const baselines: Record<string, BaselineStat> = {};
      for (const k of kinds){
        // ترجیح window 1h سپس fallback 5m
        let vals = await this.fetchCounts(k, 3_600_000, from);
        if (vals.length < 5) vals = await this.fetchCounts(k, 300_000, from);
        baselines[k] = this.stats(vals);
      }
      // current short-term counts از snapshot 60s
      const snap60 = (await import('./intel-window-store')).intelWindowStore.getSnapshot(60_000);
      const current = {
        governance: snap60?.byKind['governance.alert']||0,
        security: snap60?.byKind['security.signal']||0,
        anomaly: snap60?.byKind['user.anomaly']||0
      };
      const scores = {
        governance: this.deviation(current.governance, baselines['governance.alert']),
        security: this.deviation(current.security, baselines['security.signal']),
        anomaly: this.deviation(current.anomaly, baselines['user.anomaly'])
      };
      const newWeights = this.computeWeights(scores);
      this.state = { lastComputed: Date.now(), baselines, weights: newWeights, rawScores: scores };
  try { intelAggregator.setWeights(newWeights); } catch {}
    } catch(e){ /* silent */ }
  }
}

export const intelAdaptiveThresholds = new IntelAdaptiveThresholdsService();
