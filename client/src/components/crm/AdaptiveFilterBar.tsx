import React, { useState } from 'react';

interface AdaptiveFilterBarProps {
  onChange?: (filters: Record<string, any>) => void;
}

const baseFilters = [
  { key: 'status', label: 'وضعیت' },
  { key: 'representative', label: 'نماینده' },
  { key: 'range', label: 'بازه' },
];

export function AdaptiveFilterBar({ onChange }: AdaptiveFilterBarProps) {
  const [active, setActive] = useState<Record<string,string>>({});

  const toggle = (key: string) => {
    setActive(prev => {
      const next = {...prev};
      if(next[key]) delete next[key]; else next[key] = 'on';
      onChange?.(next);
      return next;
    });
  };

  return (
    <div className="crm-filter-bar">
      <div className="flex flex-wrap gap-2">
        {baseFilters.map(f => {
          const isActive = !!active[f.key];
          return (
            <button key={f.key} type="button" onClick={()=>toggle(f.key)} className={`crm-chip ${isActive ? 'crm-chip-active' : ''}`}>{f.label}</button>
          );
        })}
        <div className="relative">
          <input placeholder="جستجو" className="px-3 py-1 text-xs rounded-[var(--crm-radius-pill)] bg-[--crm-surface-raised] border border-[--crm-border] focus:outline-none focus:ring-0 focus-visible:shadow-crm-focus" />
        </div>
      </div>
    </div>
  );
}

export default AdaptiveFilterBar;
