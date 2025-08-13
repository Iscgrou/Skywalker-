import React, { useEffect, useRef } from 'react';

interface PerformanceRingProps {
  value: number; // 0-1
  secondary?: number; // 0-1
  anomaly?: number; // 0-1
  size?: number;
  label?: string;
  caption?: string;
}

export function PerformanceRing({ value, secondary, anomaly, size=130, label, caption }: PerformanceRingProps) {
  const main = Math.min(Math.max(value,0),1);
  const sec = secondary !== undefined ? Math.min(Math.max(secondary,0),1) : undefined;
  const an = anomaly !== undefined ? Math.min(Math.max(anomaly,0),1) : undefined;
  const stroke = 10; const r = (size/2) - stroke - 4; const c = 2*Math.PI*r;
  const offsetMain = c * (1-main);
  const offsetSec = sec !== undefined ? c * (1-sec) : 0;
  const offsetAn = an !== undefined ? c * (1-an) : 0;

  return (
    <div className="relative flex items-center justify-center" style={{width:size,height:size}}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <defs>
          <linearGradient id="ring-main" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B5BFA" />
            <stop offset="100%" stopColor="#35C6F5" />
          </linearGradient>
          <linearGradient id="ring-sec" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F8AF3C" />
            <stop offset="100%" stopColor="#F5558B" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="hsl(228 14% 26% / 40%)" strokeWidth={stroke} fill="none" />
        {sec !== undefined && (
          <circle cx={size/2} cy={size/2} r={r} stroke="url(#ring-sec)" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={offsetSec} className="transition-[stroke-dashoffset] duration-700 ease-out" strokeLinecap="round" />
        )}
        <circle cx={size/2} cy={size/2} r={r} stroke="url(#ring-main)" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={offsetMain} className="transition-[stroke-dashoffset] duration-700 ease-in-out" strokeLinecap="round" />
        {an !== undefined && (
          <circle cx={size/2} cy={size/2} r={r - stroke - 4} stroke="#F5558B" strokeWidth={3} fill="none" strokeDasharray={2*Math.PI*(r-stroke-4)} strokeDashoffset={offsetAn} className="opacity-70 mix-blend-screen transition-[stroke-dashoffset] duration-700 ease-out" strokeLinecap="round" />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-sm font-semibold text-[--crm-text-primary]">{label}</span>
        <span className="text-lg font-bold bg-clip-text text-transparent bg-[--crm-accent-primary]">{Math.round(main*100)}%</span>
        {caption && <span className="text-[10px] mt-1 text-[--crm-text-secondary]">{caption}</span>}
      </div>
    </div>
  );
}

export default PerformanceRing;
