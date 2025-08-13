// R4: Unified Telemetry Hub
// نقش: تجمیع سریع متریک‌های داخلی برای ارائه در API واحد و کاهش کوپل مستقیم سرویس‌ها
// تمرکز: مشاهده‌پذیری (Observability) لایه Real-time قبل از ورود به فازهای پیشرفته بعدی

import { intelBus } from './intel-bus';
import { intelAggregator } from './intel-aggregator';
import { intelWindowStore } from './intel-window-store';

interface TelemetrySummary {
  ts: number;
  riskIndex: number;
  components: { governance:number; security:number; anomaly:number };
  bus: ReturnType<typeof intelBus.getMetrics>;
  windows: { w60s?: WindowBrief; w5m?: WindowBrief };
  memory: { rssMB:number; heapUsedMB:number };
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
    return {
      ts: Date.now(),
      riskIndex: state.riskIndex,
      components: state.components,
      bus,
      windows: {
        w60s: snap60 ? { windowMs: snap60.windowMs, eventCount: snap60.eventCount, domains: Object.keys(snap60.byDomain).length, kinds: Object.keys(snap60.byKind).length } : undefined,
        w5m: snap300 ? { windowMs: snap300.windowMs, eventCount: snap300.eventCount, domains: Object.keys(snap300.byDomain).length, kinds: Object.keys(snap300.byKind).length } : undefined,
      },
      memory: { rssMB: Math.round(mu.rss/1024/1024), heapUsedMB: Math.round(mu.heapUsed/1024/1024) }
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
