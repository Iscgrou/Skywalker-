// Minimal in-memory Event Bus (Phase 2 - AI Orchestration)
export type EventHandler<T=any> = (event: T) => void | Promise<void>;

interface Subscription {
  topic: string;
  handler: EventHandler;
}

class EventBus {
  private subs: Subscription[] = [];

  publish<T>(topic: string, event: T) {
    for (const sub of this.subs) {
      if (sub.topic === topic) {
        try {
          const r = sub.handler(event);
          if (r instanceof Promise) r.catch(err => console.error('[event-bus] handler error', err));
        } catch (e) {
          console.error('[event-bus] handler sync error', e);
        }
      }
    }
  }

  subscribe(topic: string, handler: EventHandler) {
    this.subs.push({ topic, handler });
    return () => { this.subs = this.subs.filter(s => s.handler !== handler); };
  }
}

export const eventBus = new EventBus();
