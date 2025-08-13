import { useQuery } from '@tanstack/react-query';

export interface UseExplainDiffOptions {
  from?: string;
  to?: string;
  includeLineage?: boolean;
  enabled?: boolean;
}

export function usePrescriptiveExplainDiff(opts: UseExplainDiffOptions) {
  const { from, to, includeLineage=false } = opts;
  const canRun = !!from && !!to && from !== to && (opts.enabled ?? true);
  return useQuery({
    queryKey: ['explain-diff', from, to, includeLineage?1:0],
    enabled: canRun,
    queryFn: async () => {
      const params = new URLSearchParams({ from: from!, to: to! });
      if (includeLineage) params.set('lineage','1');
      const res = await fetch(`/api/prescriptive/explain/diff?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || json.ok === false) return json; // propagate reason
      return json;
    },
    staleTime: 15000,
  });
}

export default usePrescriptiveExplainDiff;
