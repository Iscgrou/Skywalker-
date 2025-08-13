import React from 'react';
import usePrescriptiveExplainHistory from '../hooks/use-prescriptive-explain-history';
import usePrescriptiveExplain from '../hooks/use-prescriptive-explain';

export const PrescriptiveExplainHistory: React.FC<{ refreshMs?: number; limit?: number }> = ({ refreshMs = 30000, limit = 20 }) => {
  const { data, isLoading, error } = usePrescriptiveExplainHistory(refreshMs, limit);
  const latest = usePrescriptiveExplain(refreshMs).data?.snapshot?.session?.policyVersionId;
  if (isLoading) return <div className="p-2 text-xs">در حال بارگذاری تاریخچه...</div>;
  if (error) return <div className="p-2 text-xs text-red-600">خطا در تاریخچه</div>;
  if ((data as any)?.reason === 'feature_flag_disabled') return <div className="p-2 text-xs">ویژگی غیرفعال است</div>;
  return (
    <div className="border rounded p-3 text-xs space-y-2">
      <div className="font-semibold">Explainability History</div>
      <table className="min-w-full border text-[10px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-1">PV</th>
            <th className="border px-1">Session</th>
            <th className="border px-1">Adj</th>
            <th className="border px-1">Est</th>
            <th className="border px-1">Started</th>
            <th className="border px-1">Finished</th>
          </tr>
        </thead>
        <tbody>
          {data?.sessions?.map(s => (
            <tr key={s.policyVersionId} className={(s.policyVersionId===latest? 'bg-yellow-50':'')+ ' odd:bg-white even:bg-gray-50'}>
              <td className="border px-1 truncate max-w-[120px]" title={s.policyVersionId}>{s.policyVersionId}</td>
              <td className="border px-1 truncate max-w-[100px]" title={s.sessionId}>{s.sessionId}</td>
              <td className="border px-1">{s.totalAdjustments}</td>
              <td className="border px-1">{s.estimationUsed? 'Y':'N'}</td>
              <td className="border px-1 truncate max-w-[140px]" title={s.startedAt}>{s.startedAt}</td>
              <td className="border px-1 truncate max-w-[140px]" title={s.finishedAt}>{s.finishedAt||'-'}</td>
            </tr>
          ))}
          {!data?.sessions?.length && <tr><td colSpan={6} className="border px-2 text-center">موردی نیست</td></tr>}
        </tbody>
      </table>
    </div>
  );
};

export default PrescriptiveExplainHistory;
