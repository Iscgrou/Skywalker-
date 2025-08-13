import React from 'react';
import { usePrescriptiveSummary } from '@/hooks/use-prescriptive-summary';

export const PrescriptiveInsightWidget: React.FC<{ refreshMs?: number }>= ({ refreshMs=15000 }) => {
  const { data, isLoading, error } = usePrescriptiveSummary(refreshMs);
  if (isLoading) return <div className='p-3 text-sm'>بارگذاری داده های تصمیم گیری...</div>;
  if (error) return <div className='p-3 text-red-500 text-sm'>خطا در واکشی خلاصه تجویزی</div>;
  if (!data?.success) return <div className='p-3 text-sm'>داده در دسترس نیست</div>;

  const adaptive = data.adaptiveTop || [];
  const sim = data.simulation || {};
  const telemetry = data.telemetry?.rollups;

  return (
    <div className='border rounded-md p-4 space-y-3 bg-white shadow-sm'>
      <h3 className='font-semibold text-sm'>هوش تجویزی (پیش نمایش)</h3>
      <div className='grid grid-cols-2 gap-3 text-xs'>
        <Stat label='Constraints Evaluated' value={telemetry?.derived?.constraintsEvaluated} />
        <Stat label='Hard Violations' value={telemetry?.derived?.hardViolations} />
        <Stat label='Soft Violations' value={telemetry?.derived?.softViolations} />
        <Stat label='Adaptive Tighten' value={telemetry?.adaptiveSummary?.stats?.tighten} />
        <Stat label='Adaptive Relax' value={telemetry?.adaptiveSummary?.stats?.relax} />
        <Stat label='Simulation Adjusted' value={sim?.adjustments?.filter?.((a:any)=>a.applied).length} />
      </div>
      <div>
        <h4 className='font-medium text-xs mb-1'>Top اقدام‌ها</h4>
        {adaptive.length? (
          <ul className='list-disc ms-4 space-y-1'>
            {adaptive.map((a:any)=> <li key={a.id} className='text-xs'><span className='font-mono'>{a.action}</span> → {a.id} <span className='text-gray-500'>{a.reason}</span></li>)}
          </ul>
        ) : <div className='text-gray-500 text-xs'>موردی نیست</div>}
      </div>
      {sim.aggregate && <div className='text-xs'>Feasible Δ: {sim.aggregate.feasibleRatioDelta ?? 'n/a'}</div>}
      {sim.notes?.length? <div className='text-[10px] text-gray-400'>Notes: {sim.notes.join(', ')}</div>: null}
    </div>
  );
};

const Stat: React.FC<{label:string; value:any}> = ({ label, value }) => (
  <div className='flex flex-col'>
    <span className='text-[10px] text-gray-500'>{label}</span>
    <span className='font-mono text-xs'>{value ?? '-'}</span>
  </div>
);

export default PrescriptiveInsightWidget;
