import React from 'react';
import usePrescriptiveExplain from '../hooks/use-prescriptive-explain';

export const PrescriptiveTraceViewer: React.FC<{ refreshMs?: number }> = ({ refreshMs = 20000 }) => {
  const { data, isLoading, error } = usePrescriptiveExplain(refreshMs);
  if (isLoading) return <div className="p-2 text-sm">در حال بارگذاری تریس...</div>;
  if (error) return <div className="p-2 text-sm text-red-600">خطا در دریافت تریس</div>;
  if (!data?.featureEnabled) return <div className="p-2 text-sm">ویژگی Explainability غیرفعال است</div>;
  if (!data.snapshot) return <div className="p-2 text-sm">جلسه فعالی وجود ندارد</div>;

  const { session, adjustments, lineage } = data.snapshot;
  return (
    <div className="border rounded p-3 space-y-3 text-xs max-w-full overflow-auto">
      <div className="font-semibold">Explainability Session</div>
      <div className="grid grid-cols-2 gap-2">
        <div>SessionId: {session.sessionId}</div>
        <div>Started: {session.startedAt}</div>
        <div>Finished: {session.finishedAt || '-'}</div>
        <div>Adjustments: {session.totalAdjustments}</div>
        <div>EstimationUsed: {session.estimationUsed ? 'Yes' : 'No'}</div>
        <div>PolicyVersion: {session.policyVersionId || '-'}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Adjustments</div>
        <table className="min-w-full border text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-1">ID</th>
              <th className="border px-1">Action</th>
              <th className="border px-1">Expr</th>
              <th className="border px-1">Adj Expr</th>
              <th className="border px-1">Viol Δ</th>
              <th className="border px-1">Feas Δ</th>
              <th className="border px-1">Est?</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map(a => (
              <tr key={a.recordId} className="odd:bg-white even:bg-gray-50">
                <td className="border px-1">{a.constraintId}</td>
                <td className="border px-1">{a.action}</td>
                <td className="border px-1 truncate max-w-[140px]" title={a.originalExpression}>{a.originalExpression}</td>
                <td className="border px-1 truncate max-w-[140px]" title={a.adjustedExpression}>{a.adjustedExpression || '-'}</td>
                <td className="border px-1">{a.violationDelta!=null? a.violationDelta.toFixed(3): '-'}</td>
                <td className="border px-1">{a.feasibilityDelta!=null? a.feasibilityDelta.toFixed(3): '-'}</td>
                <td className="border px-1">{a.estimationMode? 'Y':'N'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <div className="font-semibold mb-1">Lineage Nodes ({lineage.nodes.length})</div>
        <div className="flex flex-wrap gap-2">
          {lineage.nodes.map(n => (
            <div key={n.id} className="border rounded px-2 py-1 bg-gray-50">
              <div className="font-medium">{n.kind}</div>
              <div className="text-[10px] break-all">{n.id}</div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-1">Lineage Edges ({lineage.edges.length})</div>
        <ul className="list-disc pl-4 space-y-1">
          {lineage.edges.slice(0,50).map((e,i) => (
            <li key={i} className="break-all">{e.from} -[{e.type}]-&gt; {e.to}</li>
          ))}
          {lineage.edges.length > 50 && <li>+ {lineage.edges.length - 50} more...</li>}
        </ul>
      </div>
    </div>
  );
};

export default PrescriptiveTraceViewer;
