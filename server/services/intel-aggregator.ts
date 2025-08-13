// R3.5: Intel Aggregator & Derived Metrics
// نقش: ترکیب snapshots و استخراج شاخص های مشتق (riskIndex اولیه)
// روش: هر چند ثانیه یکبار snapshot پنجره های 60s و 300s گرفته و riskIndex وزن دهی می شود.

import { intelWindowStore } from './intel-window-store';
import { IntelAggregationSnapshot } from './intel-types';

interface DerivedState {
  lastUpdated: number;
  snapshots: IntelAggregationSnapshot[];
  riskIndex: number; // 0..100
  components: {
    governance: number;
    security: number;
    anomaly: number;
  };
}

class IntelAggregator {
  private state: DerivedState = {
    lastUpdated: 0,
    snapshots: [],
    riskIndex: 0,
    components: { governance:0, security:0, anomaly:0 }
  };
  private intervalHandle?: any;
  private weights = { governance:0.4, security:0.35, anomaly:0.25 }; // dynamic adaptive weights

  setWeights(w: Partial<{ governance:number; security:number; anomaly:number }>) {
    // clamp + renormalize
    const merged = { ...this.weights, ...w };
    const clamp = (v:number)=> Math.min(0.8, Math.max(0.05, v));
    let gw = clamp(merged.governance);
    let sw = clamp(merged.security);
    let aw = clamp(merged.anomaly);
    const sum = gw+sw+aw || 1;
    this.weights = { governance: gw/sum, security: sw/sum, anomaly: aw/sum };
  }

  getWeights(){ return this.weights; }

  start(intervalMs = 5000){
    if (this.intervalHandle) return;
    this.intervalHandle = setInterval(()=> this.updateDerived(), intervalMs);
    this.updateDerived();
  }

  stop(){ if (this.intervalHandle) clearInterval(this.intervalHandle); }

  private updateDerived(){
    const snap60 = intelWindowStore.getSnapshot(60_000);
    const snap300 = intelWindowStore.getSnapshot(300_000);
    const snaps: IntelAggregationSnapshot[] = [];
    if (snap60) snaps.push({ windowMs: snap60.windowMs, eventCount: snap60.eventCount, byDomain: snap60.byDomain, byKind: snap60.byKind, lastTs: snap60.to });
    if (snap300) snaps.push({ windowMs: snap300.windowMs, eventCount: snap300.eventCount, byDomain: snap300.byDomain, byKind: snap300.byKind, lastTs: snap300.to });

    // استخراج سیگنال‌ها
    const govAlerts = (snap60?.byKind['governance.alert']||0) + (snap300?.byKind['governance.alert']||0)/2;
    const securitySignals = (snap60?.byKind['security.signal']||0) + (snap300?.byKind['security.signal']||0)/2;
    const anomalies = (snap60?.byKind['user.anomaly']||0) + (snap300?.byKind['user.anomaly']||0)/2;

    // normalization ساده → log dampening
    const norm = (v:number)=> v <=0 ? 0 : Math.min(1, Math.log10(1+v)/2); // v≈99 => ~1

    const gScore = norm(govAlerts);
    const sScore = norm(securitySignals);
    const aScore = norm(anomalies);

  // وزن دهی پویا (fallback به weights داخلی)
  const w = this.weights;
  const riskIndex = Math.round((gScore*w.governance + sScore*w.security + aScore*w.anomaly) * 100);

    this.state = {
      lastUpdated: Date.now(),
      snapshots: snaps,
      riskIndex,
      components: {
        governance: Math.round(gScore*100),
        security: Math.round(sScore*100),
        anomaly: Math.round(aScore*100)
      }
    };
  }

  getState(): DerivedState { return this.state; }
}

export const intelAggregator = new IntelAggregator();
