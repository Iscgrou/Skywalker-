import React, { useState, useMemo } from 'react';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { usePrescriptiveExplainHistory, ExplainabilitySessionMeta } from '@/hooks/use-prescriptive-explain-history';
import { usePrescriptiveExplainDiff } from '@/hooks/use-prescriptive-explain-diff';

interface CRMExplainDiffPanelProps {
  historyLimit?: number;
}

const reasonMessages: Record<string,string> = {
  feature_flag_disabled: 'ویژگی غیرفعال است (PODSE_ROBUST_V1)',
  missing_from: 'نسخه مبدا یافت نشد یا انتخاب نشده',
  missing_to: 'نسخه مقصد یافت نشد یا انتخاب نشده',
  same_version: 'امکان مقایسه یک نسخه با خودش وجود ندارد',
};

export function CRMExplainDiffPanel({ historyLimit = 40 }: CRMExplainDiffPanelProps) {
  const { data: history } = usePrescriptiveExplainHistory(40000, historyLimit);
  const { user, hasAction } = useCrmAuth();
  const sessions = history?.sessions || [];
  const [fromId, setFromId] = useState<string | undefined>();
  const [toId, setToId] = useState<string | undefined>();
  const [includeLineage, setIncludeLineage] = useState(false);

  const { data: diff, isFetching } = usePrescriptiveExplainDiff({ from: fromId, to: toId, includeLineage, enabled: true });

  const summary = diff?.meta?.summary;
  const adjustments = diff?.adjustments;

  const added = adjustments?.added || [];
  const removed = adjustments?.removed || [];
  const modified = adjustments?.modified || [];

  const hasChanges = (added.length + removed.length + modified.length) > 0;
  const reason = diff?.reason && !diff?.ok ? diff.reason : undefined;

  const disableDiff = !fromId || !toId || fromId === toId;

  const orderedSessions = useMemo(()=> (sessions as ExplainabilitySessionMeta[]).slice().sort((a,b)=> (b.startedAt||'').localeCompare(a.startedAt||'')),[sessions]);

  return (
    <div className="crm-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">مقایسه نسخه‌های تجویزی</h3>
        {hasAction('explain.lineage.view') && (
          <div className="flex items-center gap-2 text-[10px] text-[--crm-text-secondary]">
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" checked={includeLineage} onChange={e=> setIncludeLineage(e.target.checked)} className="accent-[--crm-focus-ring]" />
              <span>Lineage</span>
            </label>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-[10px] text-[--crm-text-secondary]">نسخه مبدا (قدیمی‌تر)</label>
          <select value={fromId||''} onChange={e=> setFromId(e.target.value||undefined)} className="crm-chip bg-[--crm-surface-raised] pr-2">
            <option value="">-- انتخاب --</option>
            {orderedSessions.map((s:any)=> (
              <option key={s.policyVersionId} value={s.policyVersionId}>{s.policyVersionId}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-[10px] text-[--crm-text-secondary]">نسخه مقصد (جدیدتر)</label>
          <select value={toId||''} onChange={e=> setToId(e.target.value||undefined)} className="crm-chip bg-[--crm-surface-raised] pr-2">
            <option value="">-- انتخاب --</option>
            {orderedSessions.map((s:any)=> (
              <option key={s.policyVersionId} value={s.policyVersionId}>{s.policyVersionId}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 md:col-span-1">
          <button type="button" className="crm-chip flex-1" disabled={disableDiff} onClick={()=>{ if(!disableDiff){ /* trigger refetch by state change; react-query auto */ }}}>{isFetching? '...' : 'Diff'}</button>
          <button type="button" className="crm-chip" disabled={disableDiff} onClick={()=> { if(fromId && toId){ setFromId(toId); setToId(fromId);} }}>{'⇄'}</button>
        </div>
      </div>

      {/* State Messages */}
      {disableDiff && <p className="text-[10px] text-[--crm-text-secondary]">دو نسخه متفاوت را انتخاب کنید.</p>}
      {reason && <p className="text-[11px] text-[--crm-intent-danger]">{reasonMessages[reason] || reason}</p>}

      {/* Summary */}
      {summary && !reason && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-[10px]">
          <div className="crm-chip py-2"><div>افزوده</div><div className="text-[--crm-intent-success] font-semibold">{summary.addedCount}</div></div>
          <div className="crm-chip py-2"><div>حذف</div><div className="text-[--crm-intent-danger] font-semibold">{summary.removedCount}</div></div>
            <div className="crm-chip py-2"><div>تغییر</div><div className="text-[--crm-intent-warning] font-semibold">{summary.modifiedCount}</div></div>
            <div className="crm-chip py-2"><div>بدون تغییر نمونه</div><div className="font-semibold">{summary.unchangedCount}</div></div>
            <div className="crm-chip py-2"><div>Δ کل</div><div className={summary.adjustmentCountDelta>0? 'text-[--crm-intent-success]' : summary.adjustmentCountDelta<0? 'text-[--crm-intent-danger]' : ''}>{summary.adjustmentCountDelta}</div></div>
            <div className="crm-chip py-2"><div>Estimation تغییر؟</div><div className={summary.estimationStateChanged? 'text-[--crm-intent-info]' : 'text-[--crm-text-faint]'}>{summary.estimationStateChanged? 'بله':'خیر'}</div></div>
        </div>
      )}

      {!reason && !isFetching && !disableDiff && diff?.ok && !hasChanges && (
        <p className="text-[11px] text-[--crm-text-secondary]">هیچ تغییری بین این دو نسخه ثبت نشده است.</p>
      )}

      {/* Sections */}
  {hasChanges && (
        <div className="space-y-6">
          {added.length>0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2 text-[--crm-intent-success]">افزوده شده ({added.length})</h4>
              <div className="grid gap-2">
                {added.slice(0,200).map((a:any)=> (
                  <div key={a.constraintId} className="crm-chip flex flex-wrap gap-2 justify-between">
                    <span className="text-[10px] font-mono">{a.constraintId}</span>
                    <span className="text-[9px] text-[--crm-text-secondary]">{a.action}</span>
                  </div>
                ))}
                {added.length>200 && <div className="text-[9px] text-[--crm-text-secondary]">+ {added.length-200} بیشتر (خلاصه شده)</div>}
              </div>
            </div>
          )}
          {removed.length>0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2 text-[--crm-intent-danger]">حذف شده ({removed.length})</h4>
              <div className="grid gap-2">
                {removed.slice(0,200).map((a:any)=> (
                  <div key={a.constraintId} className="crm-chip flex flex-wrap gap-2 justify-between">
                    <span className="text-[10px] font-mono">{a.constraintId}</span>
                    <span className="text-[9px] text-[--crm-text-secondary]">{a.action}</span>
                  </div>
                ))}
                {removed.length>200 && <div className="text-[9px] text-[--crm-text-secondary]">+ {removed.length-200} بیشتر (خلاصه شده)</div>}
              </div>
            </div>
          )}
          {modified.length>0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2 text-[--crm-intent-warning]">تغییر یافته ({modified.length})</h4>
              <div className="space-y-2">
                {modified.slice(0,200).map((m:any)=> (
                  <div key={m.constraintId} className="crm-card p-2 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono">{m.constraintId}</span>
                      <div className="flex gap-1 text-[9px]">
                        {m.deltas.expressionChanged && <span className="crm-chip px-1 py-0 bg-[--crm-intent-info]/15 text-[--crm-intent-info]">expr</span>}
                        {m.deltas.actionChanged && <span className="crm-chip px-1 py-0 bg-[--crm-intent-warning]/15 text-[--crm-intent-warning]">act</span>}
                        {m.deltas.estimationModeChanged && <span className="crm-chip px-1 py-0 bg-[--crm-intent-success]/15 text-[--crm-intent-success]">estim</span>}
                        {m.deltas.violationDeltaDiff !== undefined && <span className="crm-chip px-1 py-0">Δv {m.deltas.violationDeltaDiff}</span>}
                        {m.deltas.feasibilityDeltaDiff !== undefined && <span className="crm-chip px-1 py-0">Δf {m.deltas.feasibilityDeltaDiff}</span>}
                      </div>
                    </div>
                    {(m.from.originalExpression !== m.to.originalExpression || m.from.adjustedExpression !== m.to.adjustedExpression) && (
                      <div className="grid grid-cols-2 gap-2 text-[9px] mt-1">
                        <div className="crm-card p-1">
                          <div className="text-[--crm-text-secondary] mb-0.5">قبلی</div>
                          <code className="break-words">{m.from.adjustedExpression || m.from.originalExpression}</code>
                        </div>
                        <div className="crm-card p-1">
                          <div className="text-[--crm-text-secondary] mb-0.5">جدید</div>
                          <code className="break-words">{m.to.adjustedExpression || m.to.originalExpression}</code>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {modified.length>200 && <div className="text-[9px] text-[--crm-text-secondary]">+ {modified.length-200} بیشتر (خلاصه شده)</div>}
              </div>
            </div>
          )}
          {includeLineage && diff?.lineage && hasAction('explain.lineage.view') && (
            <div>
              <h4 className="text-xs font-semibold mb-2 text-[--crm-intent-info]">Lineage Δ</h4>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-[10px]">
                <div className="crm-chip py-2"><div>Δ Nodes</div><div className="font-semibold">{diff.lineage.nodeCountDelta}</div></div>
                <div className="crm-chip py-2"><div>Δ Edges</div><div className="font-semibold">{diff.lineage.edgeCountDelta}</div></div>
                <div className="crm-chip py-2"><div>Nodes+</div><div className="text-[--crm-intent-success] font-semibold">{diff.lineage.addedNodes.length}</div></div>
                <div className="crm-chip py-2"><div>Nodes-</div><div className="text-[--crm-intent-danger] font-semibold">{diff.lineage.removedNodes.length}</div></div>
                <div className="crm-chip py-2"><div>Edges+</div><div className="text-[--crm-intent-success] font-semibold">{diff.lineage.addedEdges}</div></div>
                <div className="crm-chip py-2"><div>Edges-</div><div className="text-[--crm-intent-danger] font-semibold">{diff.lineage.removedEdges}</div></div>
              </div>
              {diff.lineage.affectedConstraints.length>0 && (
                <p className="text-[9px] text-[--crm-text-secondary] mt-2">Constraints متاثر: {diff.lineage.affectedConstraints.slice(0,30).join(', ')}{diff.lineage.affectedConstraints.length>30? ' ...':''}</p>
              )}
            </div>
          )}
        </div>
      )}
      {!hasAction('explain.diff.view') && (
        <p className="text-[10px] text-[--crm-intent-danger]">دسترسی مشاهده Diff را ندارید.</p>
      )}
    </div>
  );
}

export default CRMExplainDiffPanel;
