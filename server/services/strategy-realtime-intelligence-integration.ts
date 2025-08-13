/**
 * DA VINCI Iteration 32 - Real-time Intelligence Integration Service
 * 
 * ادغام Intelligence Engine با Infrastructure موجود و 
 * ارائه API endpoints برای dashboard و business stakeholders
 */

import { realTimeIntelligenceEngine } from './strategy-realtime-intelligence-engine.js';
import { businessIntelligenceBridge } from './strategy-business-intelligence-bridge.js';

interface IntelligenceIntegrationConfig {
  enableAutoActions: boolean;
  businessAlertsEnabled: boolean;
  executiveDashboardEnabled: boolean;
  roiCalculationEnabled: boolean;
  customerMetricsEnabled: boolean;
  alertThresholds: {
    businessImpactCost: number;
    customerSatisfactionDrop: number;
    slaComplianceThreshold: number;
  };
}

interface IntelligenceDashboardData {
  timestamp: number;
  systemOverview: {
    healthScore: number;
    activeInsights: number;
    criticalAlerts: number;
    optimizationOpportunities: number;
  };
  businessMetrics: any[];
  technicalInsights: any[];
  businessAlerts: any[];
  executiveSummary: any;
  roiAnalysis: any[];
  customerExperience: any[];
  recommendations: string[];
}

class RealTimeIntelligenceIntegrationService {
  private config: IntelligenceIntegrationConfig;
  private integrationActive = false;
  private updateTimer?: NodeJS.Timeout;
  private lastBusinessUpdate = 0;
  
  constructor() {
    this.config = {
      enableAutoActions: true,
      businessAlertsEnabled: true,
      executiveDashboardEnabled: true,
      roiCalculationEnabled: true,
      customerMetricsEnabled: true,
      alertThresholds: {
        businessImpactCost: 5000,        // Alert if estimated cost > $5000
        customerSatisfactionDrop: 0.5,   // Alert if satisfaction drops > 0.5 points
        slaComplianceThreshold: 0.95     // Alert if SLA compliance < 95%
      }
    };
  }
  
  /**
   * شروع integration service
   */
  async startIntegration(): Promise<void> {
    if (this.integrationActive) return;
    
    this.integrationActive = true;
    
    // Start the intelligence engine
    realTimeIntelligenceEngine.start();
    
    // Start business intelligence updates
    this.startBusinessIntelligenceUpdates();
    
    console.log('[IntelligenceIntegration] Real-time Intelligence Integration started');
  }
  
  /**
   * توقف integration service
   */
  stopIntegration(): void {
    this.integrationActive = false;
    
    realTimeIntelligenceEngine.stop();
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    
    console.log('[IntelligenceIntegration] Real-time Intelligence Integration stopped');
  }
  
  /**
   * شروع business intelligence updates
   */
  private startBusinessIntelligenceUpdates(): void {
    const updateAndSchedule = async () => {
      if (!this.integrationActive) return;
      
      try {
        await this.updateBusinessIntelligence();
      } catch (error) {
        console.error('[IntelligenceIntegration] Business intelligence update failed:', error);
      }
      
      // Schedule next update (every 2 minutes)
      this.updateTimer = setTimeout(updateAndSchedule, 2 * 60 * 1000);
    };
    
    updateAndSchedule();
  }
  
  /**
   * به‌روزرسانی business intelligence data
   */
  private async updateBusinessIntelligence(): Promise<void> {
    try {
      // Get current performance snapshot
      const currentMetrics = realTimeIntelligenceEngine.getCurrentPerformanceSnapshot();
      if (!currentMetrics) return;
      
      // Get recent technical insights
      const technicalInsights = realTimeIntelligenceEngine.getRecentInsights(10);
      
      // Translate to business KPIs
      if (this.config.businessAlertsEnabled) {
        const businessKPIs = businessIntelligenceBridge.translateTechnicalToBusinessKPIs(currentMetrics);
        console.log(`[IntelligenceIntegration] Updated ${businessKPIs.length} business KPIs`);
      }
      
      // Generate business alerts
      if (this.config.businessAlertsEnabled) {
        const businessAlerts = businessIntelligenceBridge.generateBusinessAlerts(technicalInsights);
        
        // Process high-priority business alerts
        for (const alert of businessAlerts) {
          if (alert.severity === 'critical' || alert.estimatedCost > this.config.alertThresholds.businessImpactCost) {
            await this.handleCriticalBusinessAlert(alert);
          }
        }
      }
      
      // Calculate ROI for recent optimizations
      if (this.config.roiCalculationEnabled) {
        await this.updateROICalculations();
      }
      
      // Update customer experience metrics
      if (this.config.customerMetricsEnabled) {
        const customerMetrics = businessIntelligenceBridge.analyzeCustomerExperience(currentMetrics);
        
        // Check for customer satisfaction issues
        for (const metric of customerMetrics) {
          if (metric.improvement < -this.config.alertThresholds.customerSatisfactionDrop) {
            await this.handleCustomerExperienceAlert(metric);
          }
        }
      }
      
      this.lastBusinessUpdate = Date.now();
      
    } catch (error) {
      console.error('[IntelligenceIntegration] Business intelligence update error:', error);
    }
  }
  
  /**
   * مدیریت critical business alerts
   */
  private async handleCriticalBusinessAlert(alert: any): Promise<void> {
    console.warn(`[IntelligenceIntegration] CRITICAL BUSINESS ALERT: ${alert.title}`);
    console.warn(`[IntelligenceIntegration] Business Impact: ${alert.businessImpact}`);
    console.warn(`[IntelligenceIntegration] Estimated Cost: $${alert.estimatedCost}`);
    
    // Integration with notification systems would go here
    // For now, just log the critical alert
    
    // If auto-actions are enabled, trigger automated response
    if (this.config.enableAutoActions && alert.actionRequired.includes('automated')) {
      await this.triggerAutomatedBusinessResponse(alert);
    }
  }
  
  /**
   * مدیریت customer experience alerts
   */
  private async handleCustomerExperienceAlert(metric: any): Promise<void> {
    console.warn(`[IntelligenceIntegration] CUSTOMER EXPERIENCE ALERT: ${metric.metric}`);
    console.warn(`[IntelligenceIntegration] Score: ${metric.score}, Improvement: ${metric.improvement}%`);
    
    // Trigger customer success team notification
    // Integration with CRM or customer success platforms would go here
  }
  
  /**
   * تریگر automated business response
   */
  private async triggerAutomatedBusinessResponse(alert: any): Promise<void> {
    try {
      // Integration with Auto-Policy Engine for business-driven actions
      const { autoPolicyIntegrationService } = await import('./strategy-auto-policy-integration.ts');
      
      console.log(`[IntelligenceIntegration] Triggering automated response for: ${alert.title}`);
      
      // Trigger manual evaluation to reassess system state
      await autoPolicyIntegrationService.triggerManualEvaluation();
      
    } catch (error) {
      console.error('[IntelligenceIntegration] Automated business response failed:', error);
    }
  }
  
  /**
   * به‌روزرسانی ROI calculations
   */
  private async updateROICalculations(): Promise<void> {
    // Calculate ROI for major technical initiatives
    const initiatives = [
      'auto_policy_optimization',
      'real_time_intelligence', 
      'adaptive_suppression'
    ];
    
    for (const initiative of initiatives) {
      businessIntelligenceBridge.calculateTechnicalInitiativeROI(initiative, {
        cost: this.estimateInitiativeCost(initiative)
      });
    }
  }
  
  /**
   * تخمین cost برای technical initiatives
   */
  private estimateInitiativeCost(initiative: string): number {
    const costs: Record<string, number> = {
      'auto_policy_optimization': 8000,
      'real_time_intelligence': 12000,
      'adaptive_suppression': 6000
    };
    
    return costs[initiative] || 10000;
  }
  
  /**
   * تولید comprehensive dashboard data
   */
  async generateIntelligenceDashboard(): Promise<IntelligenceDashboardData> {
    const currentMetrics = realTimeIntelligenceEngine.getCurrentPerformanceSnapshot();
    const technicalInsights = realTimeIntelligenceEngine.getRecentInsights(20);
    const criticalInsights = realTimeIntelligenceEngine.getCriticalInsights();
    const engineStatus = realTimeIntelligenceEngine.getStatus();
    
    // Generate business intelligence
    let businessKPIs: any[] = [];
    let businessAlerts: any[] = [];
    let executiveSummary: any = {};
    let roiAnalysis: any[] = [];
    let customerExperience: any[] = [];
    
    if (currentMetrics) {
      businessKPIs = businessIntelligenceBridge.translateTechnicalToBusinessKPIs(currentMetrics);
      businessAlerts = businessIntelligenceBridge.generateBusinessAlerts(technicalInsights);
      executiveSummary = businessIntelligenceBridge.generateExecutiveDashboard();
      roiAnalysis = businessIntelligenceBridge.getROICalculations();
      customerExperience = businessIntelligenceBridge.analyzeCustomerExperience(currentMetrics);
    }
    
    return {
      timestamp: Date.now(),
      systemOverview: {
        healthScore: this.calculateOverallHealthScore(businessKPIs, criticalInsights),
        activeInsights: engineStatus.insightsGenerated,
        criticalAlerts: criticalInsights.length,
        optimizationOpportunities: this.countOptimizationOpportunities(technicalInsights)
      },
      businessMetrics: businessKPIs,
      technicalInsights: technicalInsights,
      businessAlerts: businessAlerts,
      executiveSummary: executiveSummary,
      roiAnalysis: roiAnalysis,
      customerExperience: customerExperience,
      recommendations: this.generateIntegratedRecommendations(technicalInsights, businessAlerts)
    };
  }
  
  /**
   * محاسبه overall health score
   */
  private calculateOverallHealthScore(businessKPIs: any[], criticalInsights: any[]): number {
    let score = 85; // Base score
    
    // Reduce score for critical insights
    score -= criticalInsights.length * 10;
    
    // Adjust based on business KPIs
    const positiveKPIs = businessKPIs.filter(kpi => kpi.impact === 'positive').length;
    const negativeKPIs = businessKPIs.filter(kpi => kpi.impact === 'negative').length;
    
    score += positiveKPIs * 3;
    score -= negativeKPIs * 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * شمارش optimization opportunities
   */
  private countOptimizationOpportunities(insights: any[]): number {
    return insights.filter(insight => 
      insight.type === 'optimization_opportunity' || 
      (insight.recommendations && insight.recommendations.autoActionable)
    ).length;
  }
  
  /**
   * تولید integrated recommendations
   */
  private generateIntegratedRecommendations(technicalInsights: any[], businessAlerts: any[]): string[] {
    const recommendations: string[] = [];
    
    // Technical recommendations
    const autoActionableInsights = technicalInsights.filter(insight => insight.recommendations?.autoActionable);
    if (autoActionableInsights.length > 0) {
      recommendations.push(`${autoActionableInsights.length} automated optimizations available for immediate implementation`);
    }
    
    // Business recommendations
    const highCostAlerts = businessAlerts.filter(alert => alert.estimatedCost > 10000);
    if (highCostAlerts.length > 0) {
      recommendations.push(`${highCostAlerts.length} high-cost business issues require immediate attention`);
    }
    
    // Integration recommendations
    const predictiveInsights = technicalInsights.filter(insight => insight.type === 'predictive_alert');
    if (predictiveInsights.length > 0) {
      recommendations.push(`Proactive measures recommended based on ${predictiveInsights.length} predictive alerts`);
    }
    
    return recommendations;
  }
  
  /**
   * Configuration management
   */
  updateConfig(newConfig: Partial<IntelligenceIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[IntelligenceIntegration] Configuration updated:', newConfig);
  }
  
  getConfig(): IntelligenceIntegrationConfig {
    return { ...this.config };
  }
  
  /**
   * Health check و status
   */
  getIntegrationStatus(): {
    active: boolean;
    engineStatus: any;
    lastBusinessUpdate: number;
    config: IntelligenceIntegrationConfig;
    uptime: number;
  } {
    return {
      active: this.integrationActive,
      engineStatus: realTimeIntelligenceEngine.getStatus(),
      lastBusinessUpdate: this.lastBusinessUpdate,
      config: this.config,
      uptime: this.integrationActive ? Date.now() - this.lastBusinessUpdate : 0
    };
  }
  
  /**
   * Manual triggers برای testing و emergency responses
   */
  async triggerManualIntelligenceUpdate(): Promise<{
    metricsCollected: boolean;
    insightsGenerated: number;
    businessAlertsCreated: number;
    recommendationsGenerated: number;
  }> {
    await this.updateBusinessIntelligence();
    
    const dashboard = await this.generateIntelligenceDashboard();
    
    return {
      metricsCollected: !!realTimeIntelligenceEngine.getCurrentPerformanceSnapshot(),
      insightsGenerated: dashboard.technicalInsights.length,
      businessAlertsCreated: dashboard.businessAlerts.length,
      recommendationsGenerated: dashboard.recommendations.length
    };
  }
  
  /**
   * Emergency shutdown برای critical situations
   */
  emergencyShutdown(reason: string): void {
    console.warn(`[IntelligenceIntegration] EMERGENCY SHUTDOWN: ${reason}`);
    
    // Disable auto-actions immediately
    this.config.enableAutoActions = false;
    
    // Stop integration but keep basic monitoring
    this.integrationActive = false;
    
    // Keep intelligence engine running for monitoring
    // realTimeIntelligenceEngine.stop(); // Don't stop completely
    
    console.warn('[IntelligenceIntegration] Emergency shutdown complete. Manual intervention required.');
  }
}

// Singleton instance
export const realTimeIntelligenceIntegrationService = new RealTimeIntelligenceIntegrationService();

export { RealTimeIntelligenceIntegrationService };
