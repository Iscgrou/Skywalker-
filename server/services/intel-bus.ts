// R3: In-Memory Intel Event Bus
// مسئولیت: انتشار رویدادهای Real-time Intelligence و توزیع به مشترکین داخلی
// ویژگی‌ها: ظرفیت محدود، backpressure ساده (drop oldest / reject), شمارنده‌ها، hook متریک

import { IntelEventEnvelope, IntelPriority, redactEnvelope } from './intel-types';
import { intelWindowStore } from './intel-window-store';

export interface IntelSubscriber {
  id: string;
  domains?: string[];          // لیست دامنه‌های مورد علاقه (اختیاری)
  kinds?: string[];            // لیست انواع مورد علاقه (اختیاری)
  minPriority?: IntelPriority; // حداقل اولویت
  handle: (evt: IntelEventEnvelope) => void | Promise<void>;
}

interface BusOptions {
  maxQueueSize?: number;          // حداکثر صف داخلی
  dropPolicy?: 'drop-oldest' | 'reject-new';
  redactRestricted?: boolean;     // اجرای redaction قبل از تحویل
}

interface PublishResult { accepted: boolean; reason?: string; queueLength: number; }

// متریک های پایه برای observability
export interface IntelBusMetrics {
  published: number;
  delivered: number;
  dropped: number;
  rejected: number;
  subscribers: number;
  queueSize: number;
  lastEventTs?: number;
}

export class IntelEventBus {
  private subscribers: Map<string, IntelSubscriber> = new Map();
  private queue: IntelEventEnvelope[] = [];
  private opts: Required<BusOptions>;
  private metrics: IntelBusMetrics = {
    published: 0,
    delivered: 0,
    dropped: 0,
    rejected: 0,
    subscribers: 0,
    queueSize: 0
  };
  private dispatching = false;

  constructor(options?: BusOptions){
    this.opts = {
      maxQueueSize: options?.maxQueueSize ?? 2000,
      dropPolicy: options?.dropPolicy ?? 'drop-oldest',
      redactRestricted: options?.redactRestricted ?? true,
    };
  }

  getMetrics(): IntelBusMetrics { return { ...this.metrics, queueSize: this.queue.length, subscribers: this.subscribers.size }; }

  subscribe(sub: IntelSubscriber){
    this.subscribers.set(sub.id, sub);
    this.metrics.subscribers = this.subscribers.size;
    return () => {
      this.subscribers.delete(sub.id);
      this.metrics.subscribers = this.subscribers.size;
    };
  }

  publish(evt: IntelEventEnvelope): PublishResult {
    this.metrics.published++;
    this.metrics.lastEventTs = evt.ts;

    if (this.queue.length >= this.opts.maxQueueSize){
      if (this.opts.dropPolicy === 'drop-oldest') {
        const dropped = this.queue.shift();
        if (dropped) this.metrics.dropped++;
      } else {
        this.metrics.rejected++;
        return { accepted:false, reason:'queue_full', queueLength: this.queue.length };
      }
    }

    this.queue.push(evt);
    this.scheduleDispatch();
    return { accepted:true, queueLength: this.queue.length };
  }

  private scheduleDispatch(){
    if (this.dispatching) return;
    this.dispatching = true;
    setImmediate(()=> this.drain());
  }

  private async drain(){
    try {
      while(this.queue.length){
        const evt = this.queue.shift()!;
        for (const sub of this.subscribers.values()) {
          if (!this.filterMatch(sub, evt)) continue;
          try {
            const deliver = this.opts.redactRestricted ? redactEnvelope(evt) : evt;
            await sub.handle(deliver);
            this.metrics.delivered++;
          } catch(e){
            // عدم توقف روی خطای یک مشترک
          }
        }
      }
    } finally {
      this.dispatching = false;
    }
  }

  private filterMatch(sub: IntelSubscriber, evt: IntelEventEnvelope): boolean {
    if (sub.minPriority && evt.priority < sub.minPriority) return false;
    if (sub.domains && sub.domains.length && !sub.domains.includes(evt.domain)) return false;
    if (sub.kinds && sub.kinds.length && !sub.kinds.includes(evt.kind)) return false;
    return true;
  }
}

export const intelBus = new IntelEventBus({ maxQueueSize: 3000, dropPolicy: 'drop-oldest', redactRestricted: true });

// Subscriber برای window store
intelBus.subscribe({
  id: 'window-store-subscriber',
  handle: (evt)=> { intelWindowStore.ingest(evt); },
  minPriority: 1,
});
