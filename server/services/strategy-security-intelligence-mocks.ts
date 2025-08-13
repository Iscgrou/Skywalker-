/**
 * Simplified mock services for security intelligence validation
 */

export interface MockSecurityMetric {
  timestamp: number;
  threatsDetected: number;
  threatsBlocked: number;
  falsePositives: number;
  responseTime: number;
  businessImpactPrevented: number;
  systemPerformanceImpact: number;
  userExperienceImpact: number;
  complianceScore: number;
}

export const advancedSecurityIntelligenceEngine = {
  async start(){ return { success:true }; },
  getSystemStatus(){ return { active:true }; },
  getSecurityMetrics(timeRangeMs: number){
    const count = Math.min( Math.floor((timeRangeMs||3600000)/60000), 60 );
    const metrics: MockSecurityMetric[] = [];
    for(let i=0;i<count;i++){
      metrics.push({
        timestamp: Date.now() - i*60000,
        threatsDetected: 5+Math.floor(Math.random()*5),
        threatsBlocked: 4+Math.floor(Math.random()*4),
        falsePositives: Math.floor(Math.random()*2),
        responseTime: 1500+Math.floor(Math.random()*1500),
        businessImpactPrevented: Math.floor(Math.random()*5_000_000),
        systemPerformanceImpact: Math.random()*2,
        userExperienceImpact: Math.random(),
        complianceScore: 85 + Math.random()*10
      });
    }
    return metrics.reverse();
  },
  getActiveIncidents(){ return []; },
  updateConfiguration(newConfig: Record<string, any>){ return { updated:true, config: newConfig }; }
};

export function generateMockThreatTrends(timeRangeMs: number){
  const points = Math.min(Math.floor((timeRangeMs||3600000)/300000), 30); // 5m buckets
  return Array.from({length: points}, (_,i)=>({
    timestamp: Date.now() - i*300000,
    totalThreats: 10+Math.floor(Math.random()*20),
    highSeverity: Math.floor(Math.random()*5),
    responseEfficiency: 0.8 + Math.random()*0.15
  })).reverse();
}

export function updateMockIntelligenceConfig(newConfig: Record<string, any>){
  return { success:true, applied: Object.keys(newConfig).length };
}
