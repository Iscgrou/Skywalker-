// R9: Prescriptive Intelligence Engine
// Generates actionable recommendations leveraging real-time risk, adaptive weights, correlations, and short-horizon forecast.

import { intelAggregator } from './intel-aggregator';
import { intelAdaptiveThresholds } from './intel-adaptive-thresholds';
import { intelCorrelationGraph } from './intel-correlation-graph';
import { intelPredictiveEngine } from './intel-predictive-engine';

export type RecommendationCategory = 'ESCALATE_RISK' | 'TUNE_WEIGHT' | 'SUPPRESS_NOISE' | 'INVESTIGATE_SIGNAL' | 'ADJUST_THRESHOLD';

export interface Recommendation {
  id: string;
  ts: number;
  category: RecommendationCategory;
  title: string;
  description: string;
  rationale: string;
  impactScore: number; // 1..100 rough heuristic
  applies?: { weightDelta?: Partial<{ governance:number; security:number; anomaly:number }>; };
  status: 'PENDING' | 'APPLIED' | 'SKIPPED';
}

interface PrescriptiveState {
  lastEvaluated: number;
  recommendations: Recommendation[];
  applied: number;
}

class IntelPrescriptiveEngine {
  private state: PrescriptiveState = { lastEvaluated:0, recommendations:[], applied:0 };
  private timer?: any;
  private seq = 0;

  start(intervalMs = 120_000){ // every 2 minutes
    if (this.timer) return;
    this.timer = setInterval(()=> this.evaluate(), intervalMs);
    this.evaluate();
  }
  stop(){ if (this.timer) clearInterval(this.timer); }
  getState(){ return this.state; }

  private nextId(){ return 'R9_'+(++this.seq); }

  private evaluate(){
    const recs: Recommendation[] = [];
    const agg = intelAggregator.getState();
    const adaptive = intelAdaptiveThresholds.getState();
    const corr = intelCorrelationGraph.getGraph();
    const forecast = intelPredictiveEngine.getState();

    const curRisk = agg.riskIndex;
    const forecast10 = forecast.points.find(p=> p.horizonMin===10);

    // Rule 1: Escalate if forecast shows high sustained risk
    if (forecast10 && forecast10.riskIndex > 70 && forecast10.ciLow > 55){
      recs.push({
        id: this.nextId(), ts: Date.now(), category:'ESCALATE_RISK', status:'PENDING',
        title: 'Forecasted High Risk (10m)',
        description: 'Predicted risk index exceeds 70 with tight lower confidence. Prepare escalation / resource allocation.',
        rationale: `riskIndex(forecast10)=${forecast10.riskIndex} ciLow=${forecast10.ciLow}`,
        impactScore: Math.min(100, forecast10.riskIndex)
      });
    }

    // Rule 2: Weight tuning if one component weight drifting high vs peers
    const w = intelAggregator.getWeights();
    const maxWeightKind = Object.entries(w).sort((a,b)=> b[1]-a[1])[0][0];
    const minWeightKind = Object.entries(w).sort((a,b)=> a[1]-b[1])[0][0];
    if (w[maxWeightKind as keyof typeof w] - w[minWeightKind as keyof typeof w] > 0.18){
      // propose small re-balance
      const delta = 0.03;
      const weightDelta: any = {};
      weightDelta[maxWeightKind] = -delta;
      weightDelta[minWeightKind] = delta;
      recs.push({
        id: this.nextId(), ts: Date.now(), category:'TUNE_WEIGHT', status:'PENDING',
        title: 'Rebalance Adaptive Weights',
        description: `Reduce overweight ${maxWeightKind} and boost ${minWeightKind} to maintain diversity`,
        rationale: `weightSpread=${(w[maxWeightKind as keyof typeof w]-w[minWeightKind as keyof typeof w]).toFixed(2)}`,
        impactScore: 55,
        applies: { weightDelta }
      });
    }

    // Rule 3: Investigate strongly correlated pair if both components elevated
    if (corr.edges.length){
      const strong = corr.edges.filter(e=> Math.abs(e.r) >= 0.75);
      if (strong.length){
        const top = strong[0];
        const aComp = top.source.includes('security') ? 'security' : top.source.includes('anomaly') ? 'anomaly':'governance';
        const bComp = top.target.includes('security') ? 'security' : top.target.includes('anomaly') ? 'anomaly':'governance';
        const aVal = agg.components[aComp as keyof typeof agg.components];
        const bVal = agg.components[bComp as keyof typeof agg.components];
        if (aVal>50 && bVal>50){
          recs.push({
            id: this.nextId(), ts: Date.now(), category:'INVESTIGATE_SIGNAL', status:'PENDING',
            title: 'Correlated Elevation Detected',
            description: `Strong correlation between ${top.source} and ${top.target} with concurrent elevation. Investigate shared root cause.`,
            rationale: `r=${top.r.toFixed(2)} a=${aVal} b=${bVal}`,
            impactScore: 65
          });
        }
      }
    }

    // Rule 4: Adjust threshold suggestion if governance baseline low but risk high
    const gBase = adaptive.baselines['governance.alert'];
    if (gBase && gBase.mean < 2 && curRisk > 60){
      recs.push({
        id: this.nextId(), ts: Date.now(), category:'ADJUST_THRESHOLD', status:'PENDING',
        title: 'Tighten Governance Threshold',
        description: 'Low governance baseline with elevated overall risk suggests lowering alert threshold to capture early drift.',
        rationale: `gMean=${gBase.mean.toFixed(2)} risk=${curRisk}`,
        impactScore: 50
      });
    }

    this.state = { lastEvaluated: Date.now(), recommendations: recs, applied: this.state.applied };
  }

  apply(id:string){
    const rec = this.state.recommendations.find(r=> r.id === id);
    if (!rec || rec.status !== 'PENDING') return { ok:false, error:'NOT_FOUND_OR_INVALID' };
    if (rec.applies?.weightDelta){
      // apply weight tuning
      const w = intelAggregator.getWeights();
      const newWeights:any = { ...w };
      for (const [k,v] of Object.entries(rec.applies.weightDelta)){
        newWeights[k] = Math.max(0.05, (newWeights[k]||0)+v!);
      }
      intelAggregator.setWeights(newWeights);
    }
    rec.status = 'APPLIED';
    this.state.applied += 1;
    return { ok:true, applied: rec };
  }
}

export const intelPrescriptiveEngine = new IntelPrescriptiveEngine();
