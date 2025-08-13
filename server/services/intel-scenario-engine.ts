// R10: Scenario Intelligence Engine
// Generates base / surge / mitigated risk scenarios using predictive, correlation and prescriptive layers.

import { intelPredictiveEngine } from './intel-predictive-engine';
import { intelCorrelationGraph } from './intel-correlation-graph';
import { intelPrescriptiveEngine } from './intel-prescriptive-engine';
import { intelAggregator } from './intel-aggregator';

interface Scenario {
  id:string;
  label:string;
  kind:'BASE'|'SURGE'|'MITIGATED';
  horizonMins:number[];
  riskSeries:number[];
  ciLow?:number[];
  ciHigh?:number[];
  deltaVsBase:{ horizonMin:number; riskDelta:number }[];
  assumptions:string[];
  recommendedActions?:string[];
}
interface ScenarioState { lastGenerated:number; scenarios:Scenario[]; }

class IntelScenarioEngine {
  private state: ScenarioState = { lastGenerated:0, scenarios:[] };
  private timer?: any;
  private seq=0;

  start(intervalMs = 120_000){ // every 2 minutes
    if (this.timer) return;
    this.timer = setInterval(()=> this.generate(), intervalMs);
    this.generate();
  }
  stop(){ if (this.timer) clearInterval(this.timer); }
  getState(){ return this.state; }

  private nextId(){ return 'SCN_'+(++this.seq); }

  private generate(){
    const pred = intelPredictiveEngine.getState();
    if (!pred.points.length){
      this.state = { lastGenerated: Date.now(), scenarios: [] };
      return;
    }
    const basePoint = pred.points;
    const baseScenario: Scenario = {
      id: this.nextId(), label:'Current Trajectory', kind:'BASE',
      horizonMins: basePoint.map(p=> p.horizonMin),
      riskSeries: basePoint.map(p=> p.riskIndex),
      ciLow: basePoint.map(p=> p.ciLow),
      ciHigh: basePoint.map(p=> p.ciHigh),
      deltaVsBase: basePoint.map(p=> ({ horizonMin:p.horizonMin, riskDelta:0 })),
      assumptions:['Weights ثابت در بازه کوتاه','بدون شوک بیرونی'],
      recommendedActions: []
    };

    // Surge: amplify component deviation by correlation degrees
    const corr = intelCorrelationGraph.getGraph();
    const degreeFactor = (kind:string)=> {
      const node = corr.nodes.find(n=> n.kind===kind); return node? 1 + 0.1*node.degree : 1; };
    const surgeFactorBase = 1.3; // 30% shock baseline
    const weights = intelAggregator.getWeights();

    const surgeRiskSeries = basePoint.map(p=> {
      // approximate by scaling risk directly (since underlying comp counts not stored here)
      return Math.min(100, Math.round(p.riskIndex * surgeFactorBase * ( (degreeFactor('security.signal')+degreeFactor('governance.alert')+degreeFactor('user.anomaly'))/3 )));
    });
    const surgeScenario: Scenario = {
      id: this.nextId(), label:'Surge Shock (+30%)', kind:'SURGE',
      horizonMins: basePoint.map(p=> p.horizonMin),
      riskSeries: surgeRiskSeries,
      deltaVsBase: surgeRiskSeries.map((r,i)=> ({ horizonMin: basePoint[i].horizonMin, riskDelta: r - basePoint[i].riskIndex })),
      assumptions:['30% افزایش فعالیت سیگنال','تشدید متناسب degree همبستگی'],
      recommendedActions:['برنامه ظرفیت','پایش فعال']
    };

    // Mitigated: apply first pending weight tuning recommendation hypothetically
    const pres = intelPrescriptiveEngine.getState();
    const weightRec = pres.recommendations.find(r=> r.category==='TUNE_WEIGHT' && r.status==='PENDING');
    let mitigatedRiskSeries:number[] = basePoint.map(p=> p.riskIndex);
    if (weightRec?.applies?.weightDelta){
      // naive re-normalization effect: adjust weighted risk proportionally
      const totalDelta = Object.values(weightRec.applies.weightDelta).reduce((a,b)=> a + (b||0),0);
      mitigatedRiskSeries = basePoint.map(p=> Math.max(0, Math.round(p.riskIndex * (1 - 0.05 - totalDelta))));
    }
    const mitigatedScenario: Scenario = {
      id: this.nextId(), label:'Mitigated (Weight Rebalance)', kind:'MITIGATED',
      horizonMins: basePoint.map(p=> p.horizonMin),
      riskSeries: mitigatedRiskSeries,
      deltaVsBase: mitigatedRiskSeries.map((r,i)=> ({ horizonMin: basePoint[i].horizonMin, riskDelta: r - basePoint[i].riskIndex })),
      assumptions:['اعمال فرضی تنظیم وزن'],
      recommendedActions: weightRec? ['اعمال تنظیم وزن پیشنهادی'] : []
    };

    this.state = { lastGenerated: Date.now(), scenarios:[baseScenario, surgeScenario, mitigatedScenario] };
  }
}

export const intelScenarioEngine = new IntelScenarioEngine();
