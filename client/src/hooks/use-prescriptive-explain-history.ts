import { useQuery } from '@tanstack/react-query';

export interface ExplainabilitySessionMeta {
  sessionId: string; policyVersionId: string; totalAdjustments: number; estimationUsed: boolean; startedAt?: string; finishedAt?: string;
}
export interface ExplainabilityHistoryResponse { sessions: ExplainabilitySessionMeta[]; nextCursor?: string; reason?: string; }

export function usePrescriptiveExplainHistory(intervalMs: number = 30000, limit: number = 20) {
  return useQuery<ExplainabilityHistoryResponse>({
    queryKey: ['/api/prescriptive/explain/history', limit],
    refetchInterval: intervalMs,
    staleTime: intervalMs/2,
  });
}

export default usePrescriptiveExplainHistory;
