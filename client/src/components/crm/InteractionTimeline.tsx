import React from 'react';

export interface TimelineEvent {
  id: string | number;
  time: string; // ISO or display
  type: string;
  title: string;
  description?: string;
  meta?: string;
}

interface InteractionTimelineProps {
  events: TimelineEvent[];
  emptyText?: string;
}

const typeIcon: Record<string,string> = {
  invoice: '🧾',
  payment: '💰',
  ai: '🤖',
  sync: '🔄',
  contact: '👤'
};

export function InteractionTimeline({ events, emptyText='موردی ثبت نشده' }: InteractionTimelineProps) {
  if(!events.length) return <div className="crm-timeline text-[--crm-text-secondary] text-xs">{emptyText}</div>;
  return (
    <div className="crm-timeline">
      {events.map(ev => (
        <div key={ev.id} className="crm-timeline-item group">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-[var(--crm-radius-sm)] flex items-center justify-center text-[11px] bg-[--crm-surface-raised] border border-[--crm-border] shadow-crm-xs group-hover:shadow-crm-sm transition">
              {typeIcon[ev.type] || '•'}
            </div>
            <div className="flex-1 flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-[11px] text-[--crm-text-secondary]">
                <span>{new Date(ev.time).toLocaleString('fa-IR')}</span>
                <span className="px-1.5 py-0.5 rounded bg-[--crm-surface-raised] border border-[--crm-border] text-[9px]">{ev.type}</span>
              </div>
              <div className="text-xs font-medium text-[--crm-text-primary] leading-snug">{ev.title}</div>
              {ev.description && <div className="text-[11px] text-[--crm-text-secondary] leading-snug">{ev.description}</div>}
              {ev.meta && <div className="text-[10px] text-[--crm-text-faint] leading-snug">{ev.meta}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default InteractionTimeline;
