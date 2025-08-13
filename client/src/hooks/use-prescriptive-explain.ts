import { useQuery } from '@tanstack/react-query';

export interface PrescriptiveExplainSnapshot {
  success: boolean;
  featureEnabled: boolean;
  snapshot?: {
    session: any;
    adjustments: any[];
    lineage: { nodes: any[]; edges: any[] };
    telemetryCounters: Record<string, number>;
    schemaVersion: string;
  } | null;
  note?: string;
}

export function usePrescriptiveExplain(intervalMs: number = 20000){
  return useQuery<PrescriptiveExplainSnapshot>({
    queryKey: ['/api/prescriptive/explain/latest'],
    refetchInterval: intervalMs,
    staleTime: intervalMs/2,
  });
}

export default usePrescriptiveExplain;
