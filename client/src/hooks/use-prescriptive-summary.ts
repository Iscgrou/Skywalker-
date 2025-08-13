import { useQuery } from '@tanstack/react-query';

export interface PrescriptiveSummaryResponse {
  success: boolean;
  status?: any;
  telemetry?: any;
  adaptiveTop?: any[];
  simulation?: any;
}

export function usePrescriptiveSummary(intervalMs: number = 15000){
  return useQuery<PrescriptiveSummaryResponse>({
    queryKey: ['/api/prescriptive/summary'],
    refetchInterval: intervalMs,
    staleTime: intervalMs/2,
  });
}

export default usePrescriptiveSummary;
