// R4: Unified Telemetry Hub
// نقش: تجمیع سریع متریک‌های داخلی برای ارائه در API واحد و کاهش کوپل مستقیم سرویس‌ها
// تمرکز: مشاهده‌پذیری (Observability) لایه Real-time قبل از ورود به فازهای پیشرفته بعدی

import { intelBus } from './intel-bus';
import { intelAggregator } from './intel-aggregator';
import { intelWindowStore } from './intel-window-store';
import { intelCorrelationGraph } from './intel-correlation-graph';
import { intelPredictiveEngine } from './intel-predictive-engine';
import { intelPrescriptiveEngine } from './intel-prescriptive-engine';
import { intelScenarioEngine } from './intel-scenario-engine';
import { clusterCoordinator } from './cluster-coordinator';

interface TelemetrySummary {
  ts: number;
  riskIndex: number;
  components: { governance:number; security:number; anomaly:number };
  bus: ReturnType<typeof intelBus.getMetrics>;
  windows: { w60s?: WindowBrief; w5m?: WindowBrief };
  memory: { rssMB:number; heapUsedMB:number };
  correlations?: { edges:number; strongest?: { pair:[string,string]; r:number } };
  forecast?: { horizons:number[]; riskIndex:number[]; ciLow:number[]; ciHigh:number[] };
  prescriptive?: { pending:number; lastEval:number };
  scenarios?: { count:number; lastGen:number; worstSurge?:number };
  cluster?: { nodeId:string; isLeader:boolean; leaderNodeId?:string; nodeCount:number };
}
interface WindowBrief { windowMs:number; eventCount:number; domains:number; kinds:number; }
interface DetailedTelemetry extends TelemetrySummary {
  snapshots: any[]; // raw snapshots
}

class TelemetryHub {
  getSummary(): TelemetrySummary {
    const state = intelAggregator.getState();
    const bus = intelBus.getMetrics();
    const snap60 = intelWindowStore.getSnapshot(60_000);
    const snap300 = intelWindowStore.getSnapshot(300_000);
    const mu = process.memoryUsage();
    const forecastState = intelPredictiveEngine.getState();
  const prescriptive = intelPrescriptiveEngine.getState();
  const scenariosState = intelScenarioEngine.getState();
    return {
      ts: Date.now(),
      riskIndex: state.riskIndex,
      components: state.components,
      bus,
      windows: {
        w60s: snap60 ? { windowMs: snap60.windowMs, eventCount: snap60.eventCount, domains: Object.keys(snap60.byDomain).length, kinds: Object.keys(snap60.byKind).length } : undefined,
        w5m: snap300 ? { windowMs: snap300.windowMs, eventCount: snap300.eventCount, domains: Object.keys(snap300.byDomain).length, kinds: Object.keys(snap300.byKind).length } : undefined,
      },
  memory: { rssMB: Math.round(mu.rss/1024/1024), heapUsedMB: Math.round(mu.heapUsed/1024/1024) },
      correlations: ( ()=> { const g = intelCorrelationGraph.getGraph(); if (!g.edges.length) return { edges:0 }; const strongest = g.edges.slice().sort((a,b)=> Math.abs(b.r)-Math.abs(a.r))[0]; return { edges:g.edges.length, strongest:{ pair:[strongest.source, strongest.target], r: strongest.r } }; })(),
      forecast: forecastState.points.length ? {
        horizons: forecastState.points.map(p=> p.horizonMin),
        riskIndex: forecastState.points.map(p=> p.riskIndex),
        ciLow: forecastState.points.map(p=> p.ciLow),
        ciHigh: forecastState.points.map(p=> p.ciHigh)
      } : undefined,
  prescriptive: { pending: prescriptive.recommendations.filter(r=> r.status==='PENDING').length, lastEval: prescriptive.lastEvaluated },
  scenarios: (()=> { const surge = scenariosState.scenarios.find(s=> s.kind==='SURGE'); return { count: scenariosState.scenarios.length, lastGen: scenariosState.lastGenerated, worstSurge: surge ? surge.riskSeries[surge.riskSeries.length-1] : undefined }; })(),
  cluster: (()=> {
    // best-effort local view (no async round trip here)
    const isLeader = clusterCoordinator.isLeader();
    return {
      nodeId: clusterCoordinator.getNodeId(),
      isLeader,
      leaderNodeId: isLeader ? clusterCoordinator.getNodeId() : undefined,
      nodeCount: 1 // followers would report 1 locally; detailed list via /intel/cluster/status
    };
  })()
    };
  }
  getDetailed(): DetailedTelemetry {
    const summary = this.getSummary();
    const snap60 = intelWindowStore.getSnapshot(60_000);
    const snap300 = intelWindowStore.getSnapshot(300_000);
    const snap1h = intelWindowStore.getSnapshot(3_600_000);
    return { ...summary, snapshots: [snap60, snap300, snap1h].filter(Boolean) } as DetailedTelemetry;
  }
}

export const telemetryHub = new TelemetryHub();
