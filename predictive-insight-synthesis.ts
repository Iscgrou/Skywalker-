/**
 * 🔍 PAFE - Insight Synthesis & Feedback Loop
 */
import { EventEmitter } from 'events';
import type { ForecastResult } from './predictive-models-hub';

export class PredictiveInsightSynthesis extends EventEmitter {
  private lastForecast: ForecastResult | null = null;
  private realized: Record<string, number[]> = {};

  processForecast(f: ForecastResult){
    this.lastForecast = f;
    this.emit('insightGenerated', { forecastId: f.forecastId, kpis: f.kpis.length });
  }

  ingestActual(kpi:string, value:number){
    if(!this.realized[kpi]) this.realized[kpi]=[];
    this.realized[kpi].push(value);
  }

  computeBasicAccuracy(){
    if(!this.lastForecast) return { horizon: null, mape: null };
    const kp = this.lastForecast.kpis[0];
    const actuals = this.realized[kp.name]||[];
    if(!actuals.length) return { horizon: this.lastForecast.horizon, mape: null };
    const meanActual = actuals.reduce((a,b)=>a+b,0)/actuals.length;
    const mape = Math.abs((kp.p50 - meanActual)/ (meanActual||1));
    return { horizon: this.lastForecast.horizon, mape };
  }
}
