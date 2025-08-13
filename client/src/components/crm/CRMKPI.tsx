import React, { useMemo } from 'react';

interface CRMKPIProps {
  title: string;
  value: string | number;
  unit?: string;
  delta?: number; // positive / negative trend
  series?: number[]; // sparkline data
  intent?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

const gradientId = (title: string) => 'spark-' + title.replace(/\s+/g,'-');

export function CRMKPI({ title, value, unit, delta, series = [], intent='default', loading }: CRMKPIProps) {
  const minMax = useMemo(()=>{
    if(!series.length) return {min:0,max:0};
    let min = Infinity, max = -Infinity; series.forEach(v=>{ if(v<min) min=v; if(v>max) max=v; });
    if(min===max){ max = min + 1; }
    return {min,max};
  },[series]);

  const pathD = useMemo(()=>{
    if(!series.length) return '';
    const w = 80; const h = 28; const len = series.length -1;
    return series.map((v,i)=> {
      const x = (i/len)*w; const y = h - ((v - minMax.min)/(minMax.max-minMax.min))*h;
      return `${i===0?'M':'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  },[series,minMax]);

  const deltaBadge = delta !== undefined && !isNaN(delta);
  const deltaSign = delta && delta > 0 ? '+' : '';
  const deltaIntent = delta === 0 ? 'neutral' : (delta && delta > 0 ? 'up' : 'down');

  const intentColorClass = intent === 'success' ? 'text-[--crm-intent-success]' : intent === 'warning' ? 'text-[--crm-intent-warning]' : intent === 'danger' ? 'text-[--crm-intent-danger]' : intent === 'info' ? 'text-[--crm-intent-info]' : 'text-[--crm-text-primary]';
  const deltaBg = deltaIntent === 'up' ? 'bg-[--crm-intent-success]/15 text-[--crm-intent-success]' : deltaIntent === 'down' ? 'bg-[--crm-intent-danger]/15 text-[--crm-intent-danger]' : 'bg-[--crm-text-secondary]/10 text-[--crm-text-secondary]';

  return (
    <div className="crm-kpi animate-crm-reveal">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium tracking-wide text-[--crm-text-secondary] leading-none">{title}</span>
          <div className={`flex items-baseline gap-1 ${intentColorClass}`}>
            <span className="crm-kpi-value">{value}{unit && <span className="text-xs font-normal text-[--crm-text-secondary] mr-1">{unit}</span>}</span>
          </div>
        </div>
        {deltaBadge && (
          <span className={`crm-kpi-delta ${deltaBg}`}>{deltaSign}{delta?.toFixed(1)}%</span>
        )}
      </div>
      <div className="mt-2 h-7 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        )}
        {series.length > 1 && (
          <svg viewBox="0 0 80 28" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={gradientId(title)} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7B5BFA" />
                <stop offset="100%" stopColor="#35C6F5" />
              </linearGradient>
            </defs>
            <path d={pathD} fill="none" stroke={`url(#${gradientId(title)})`} strokeWidth={2} strokeLinecap="round" />
            <path d={pathD + ' L80,28 L0,28 Z'} fill="url(#${gradientId(title)})" opacity={0.18} />
          </svg>
        )}
      </div>
    </div>
  );
}

export default CRMKPI;
