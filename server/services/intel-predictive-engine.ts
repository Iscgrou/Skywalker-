// R8: Intel Predictive Engine (Short-Horizon Risk Forecast)
// هدف: پیش‌بینی riskIndex و component scores برای افق کوتاه (15m داخلی: 3 گام 5 دقیقه‌ای)

import { intelWindowStore } from './intel-window-store';
import { intelAggregator } from './intel-aggregator';

interface ForecastPoint { horizonMin:number; governance:number; security:number; anomaly:number; riskIndex:number; ciLow:number; ciHigh:number; }
interface PredictiveState { lastUpdated:number; points:ForecastPoint[]; residualStd:number; model:{ alpha:number; ar:number; }; }

class IntelPredictiveEngine {
  private state: PredictiveState = { lastUpdated:0, points:[], residualStd:0, model:{ alpha:0.4, ar:0.5 } };
  private timer?: any;
  private horizons = [5,10,15];
  private residuals: number[] = [];
  private maxResiduals = 200;

  start(intervalMs = 60_000){ // refresh each minute
    if (this.timer) return;
    this.timer = setInterval(()=> this.compute(), intervalMs);
    this.compute();
  }
  stop(){ if (this.timer) clearInterval(this.timer); }
  getState(){ return this.state; }

  private extractCurrent(){
    const snap5m = intelWindowStore.getSnapshot(300_000);
    const snap1m = intelWindowStore.getSnapshot(60_000);
    const cur = {
      governance: (snap1m?.byKind['governance.alert']||0) + (snap5m?.byKind['governance.alert']||0)/5,
      security: (snap1m?.byKind['security.signal']||0) + (snap5m?.byKind['security.signal']||0)/5,
      anomaly: (snap1m?.byKind['user.anomaly']||0) + (snap5m?.byKind['user.anomaly']||0)/5,
    };
    return cur;
  }

  private ema(prev:number, cur:number, alpha:number){ return prev === undefined ? cur : alpha*cur + (1-alpha)*prev; }

  private compute(){
    const weights = intelAggregator.getWeights();
    const cur = this.extractCurrent();

    // baseline last point values
    const prev = this.state.points[0];
    const alpha = this.state.model.alpha;
    const ar = this.state.model.ar;

    const base = {
      governance: prev? this.ema(prev.governance, cur.governance, alpha): cur.governance,
      security: prev? this.ema(prev.security, cur.security, alpha): cur.security,
      anomaly: prev? this.ema(prev.anomaly, cur.anomaly, alpha): cur.anomaly,
    };

    // Forecast recursion: F_t+h = base + ar^h * (lastObserved - base)
    const lastObserved = cur;
    const points: ForecastPoint[] = [];
    for (const h of this.horizons){
      const factor = Math.pow(ar, h/5); // scaled per 5m step
      const governance = base.governance + factor*(lastObserved.governance - base.governance);
      const security = base.security + factor*(lastObserved.security - base.security);
      const anomaly = base.anomaly + factor*(lastObserved.anomaly - base.anomaly);
      const riskIndex = (this.normalize(governance)*weights.governance + this.normalize(security)*weights.security + this.normalize(anomaly)*weights.anomaly) * 100;
      points.push({ horizonMin:h, governance, security, anomaly, riskIndex: Math.round(riskIndex), ciLow:0, ciHigh:0 });
    }

    // Residual update (use immediate horizon 5 vs actual in next iteration; here placeholder until next tick)
    if (prev){
      const realized = cur.governance + cur.security + cur.anomaly;
      const predicted = prev.governance + prev.security + prev.anomaly; // from last cycle horizon 5 approx
      const resid = realized - predicted;
      this.residuals.push(resid); if (this.residuals.length > this.maxResiduals) this.residuals.shift();
    }
    const residStd = this.std(this.residuals);
    // set CI (simple symmetric): riskIndex ± 1.28 * (residStd scaled)
    const riskScale =  (x:number)=> x; // identity since already additive before normalization simplification
    const ciMult = 1.28; // ~80% interval
    for (const p of points){
      const adj = ciMult * (residStd||0);
      p.ciLow = Math.max(0, Math.round(p.riskIndex - adj));
      p.ciHigh = Math.min(100, Math.round(p.riskIndex + adj));
    }

    this.state = { lastUpdated: Date.now(), points, residualStd: residStd, model:{ alpha, ar } };
  }

  private normalize(v:number){
    if (v<=0) return 0;
    return Math.min(1, Math.log10(1+v)/2);
  }
  private std(arr:number[]){
    if (!arr.length) return 0;
    const m = arr.reduce((a,b)=>a+b,0)/arr.length;
    const v = arr.reduce((a,b)=> a + (b-m)**2, 0)/arr.length;
    return Math.sqrt(v);
  }
}

export const intelPredictiveEngine = new IntelPredictiveEngine();
