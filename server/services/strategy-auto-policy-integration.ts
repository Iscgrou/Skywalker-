/**
 * DA VINCI Iteration 31 - Auto-Policy Evolution Integration Layer
 * 
 * ادغام AutoPolicyEngine با existing adaptive infrastructure
 * شامل metrics collection، decision scheduling، outcome tracking
 */

import { createAutoPolicyEngine, AutoPolicyEngine } from './strategy-auto-policy-engine.js';

interface AutoPolicyMetricsSnapshot {
  timestamp: number;
  metrics: {
    reNoiseRate: number;
    failureRatio: number;
    escalationEffectiveness: number;
    suppressionAccuracy: number;
    systemStability: number;
    alertVolume: number;
    falsePositiveRate: number;
    meanTimeToAck: number;
  };
  source: {
    adaptiveRunner: any;
    suppressionService: any;
    escalationService: any;
    alertQuery: any;
  };
}

class AutoPolicyIntegrationService {
  private policyEngine: AutoPolicyEngine;
  private metricsHistory: AutoPolicyMetricsSnapshot[] = [];
  private scheduledEvaluationInterval?: NodeJS.Timeout;
  private lastEvaluationTime: number = 0;
  private enabled: boolean = true;
  
  // Dependencies (در production از actual services استفاده می‌شود)
  private adaptiveRunner: any;
  private suppressionService: any;
  private escalationService: any;
  private alertQueryService: any;
  
  constructor() {
    this.policyEngine = createAutoPolicyEngine();
  }
  
  /**
   * تزریق dependencies از existing services
   */
  initializeDependencies(deps: {
    adaptiveRunner: any;
    suppressionService: any;
    escalationService: any;
    alertQueryService: any;
  }): void {
    this.adaptiveRunner = deps.adaptiveRunner;
    this.suppressionService = deps.suppressionService;
    this.escalationService = deps.escalationService;
    this.alertQueryService = deps.alertQueryService;
    
    console.log('[AutoPolicyIntegration] Dependencies initialized');
  }
  
  /**
   * شروع automated evaluation cycles
   */
  startPeriodicEvaluation(intervalMinutes: number = 15): void {
    if (this.scheduledEvaluationInterval) {
      clearInterval(this.scheduledEvaluationInterval);
    }
    
    this.scheduledEvaluationInterval = setInterval(async () => {
      if (this.enabled) {
        await this.performEvaluationCycle();
      }
    }, intervalMinutes * 60 * 1000);
    
    console.log(`[AutoPolicyIntegration] Started periodic evaluation every ${intervalMinutes} minutes`);
    
    // اولین evaluation فوری (بعد از 2 دقیقه برای warm-up)
    setTimeout(() => {
      if (this.enabled) {
        this.performEvaluationCycle().catch(console.error);
      }
    }, 2 * 60 * 1000);
  }
  
  /**
   * توقف periodic evaluation
   */
  stopPeriodicEvaluation(): void {
    if (this.scheduledEvaluationInterval) {
      clearInterval(this.scheduledEvaluationInterval);
      this.scheduledEvaluationInterval = undefined;
    }
    console.log('[AutoPolicyIntegration] Stopped periodic evaluation');
  }
  
  /**
   * جمع‌آوری metrics از تمام لایه‌ها
   */
  async collectCurrentMetrics(): Promise<AutoPolicyMetricsSnapshot> {
    const timestamp = Date.now();
    
    // جمع‌آوری metrics از adaptive runner (Iteration 30)
    const adaptiveMetrics = await this.getAdaptiveRunnerMetrics();
    
    // جمع‌آوری metrics از suppression service
    const suppressionMetrics = await this.getSuppressionMetrics();
    
    // جمع‌آوری metrics از escalation service (Iteration 25)
    const escalationMetrics = await this.getEscalationMetrics();
    
    // جمع‌آوری metrics از alert query (Iteration 22-24)
    const alertMetrics = await this.getAlertMetrics();
    
    const snapshot: AutoPolicyMetricsSnapshot = {
      timestamp,
      metrics: {
        reNoiseRate: adaptiveMetrics.reNoiseRate || 0,
        failureRatio: adaptiveMetrics.failureRatio || 0,
        escalationEffectiveness: escalationMetrics.effectivenessRate || 0.8,
        suppressionAccuracy: suppressionMetrics.accuracy || 0.9,
        systemStability: this.calculateSystemStability(adaptiveMetrics, suppressionMetrics),
        alertVolume: alertMetrics.totalCount || 0,
        falsePositiveRate: suppressionMetrics.falsePositiveRate || 0,
        meanTimeToAck: alertMetrics.mttaAvgMs || 0
      },
      source: {
        adaptiveRunner: adaptiveMetrics,
        suppressionService: suppressionMetrics,
        escalationService: escalationMetrics,
        alertQuery: alertMetrics
      }
    };
    
    // ذخیره در history
    this.metricsHistory.push(snapshot);
    
    // حداکثر 100 snapshot نگه داریم
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
    
    return snapshot;
  }
  
  /**
   * اجرای یک چرخه کامل evaluation و decision making
   */
  async performEvaluationCycle(): Promise<{
    metricsSnapshot: AutoPolicyMetricsSnapshot;
    analysisResult: any;
    decisionsApplied: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let decisionsApplied = 0;
    
    try {
      console.log('[AutoPolicyIntegration] Starting evaluation cycle...');
      
      // 1. جمع‌آوری metrics فعلی
      const currentSnapshot = await this.collectCurrentMetrics();
      
      // 2. تحلیل و تصمیم‌گیری
      const historicalMetrics = this.metricsHistory.map(h => h.metrics);
      const analysisResult = await this.policyEngine.analyzeAndDecide(
        currentSnapshot.metrics,
        historicalMetrics,
        {
          from: this.metricsHistory.length > 0 ? this.metricsHistory[0].timestamp : Date.now() - 3600000,
          to: Date.now()
        }
      );
      
      console.log(`[AutoPolicyIntegration] Analysis complete. Found ${analysisResult.decisions.length} potential decisions`);
      console.log(`[AutoPolicyIntegration] Pattern analysis:`, analysisResult.analysis.patterns);
      console.log(`[AutoPolicyIntegration] Confidence: ${analysisResult.analysis.confidence.toFixed(2)}`);
      console.log(`[AutoPolicyIntegration] Risk assessment: ${analysisResult.analysis.riskAssessment}`);
      
      // 3. اعمال decisions
      for (const decision of analysisResult.decisions) {
        try {
          const result = await this.policyEngine.applyDecision(decision);
          if (result.applied) {
            await this.executeDecisionOnSystem(decision);
            decisionsApplied++;
            console.log(`[AutoPolicyIntegration] Applied decision ${decision.id}: ${decision.action.type}`);
          } else {
            console.log(`[AutoPolicyIntegration] Skipped decision ${decision.id}:`, result.reasons);
          }
        } catch (error) {
          errors.push(`Failed to apply decision ${decision.id}: ${error}`);
          console.error(`[AutoPolicyIntegration] Error applying decision:`, error);
        }
      }
      
      // 4. بررسی outcomes قبلی
      const outcomes = await this.policyEngine.evaluateOutcomes();
      console.log(`[AutoPolicyIntegration] Historical success rate: ${(outcomes.overallSuccessRate * 100).toFixed(1)}%`);
      
      this.lastEvaluationTime = Date.now();
      
      return {
        metricsSnapshot: currentSnapshot,
        analysisResult,
        decisionsApplied,
        errors
      };
      
    } catch (error) {
      errors.push(`Evaluation cycle failed: ${error}`);
      console.error('[AutoPolicyIntegration] Evaluation cycle failed:', error);
      
      return {
        metricsSnapshot: {} as AutoPolicyMetricsSnapshot,
        analysisResult: null,
        decisionsApplied: 0,
        errors
      };
    }
  }
  
  /**
   * اعمال یک decision بر روی system واقعی
   */
  private async executeDecisionOnSystem(decision: any): Promise<void> {
    switch (decision.domain) {
      case 'weight_nudging':
        await this.executeWeightNudging(decision);
        break;
      case 'threshold_adaptation':
        await this.executeThresholdAdaptation(decision);
        break;
      case 'suppression_tuning':
        await this.executeSuppressionTuning(decision);
        break;
      case 'persistence_policy':
        await this.executePersistencePolicy(decision);
        break;
      default:
        throw new Error(`Unknown decision domain: ${decision.domain}`);
    }
  }
  
  private async executeWeightNudging(decision: any): Promise<void> {
    if (!this.adaptiveRunner) {
      console.log('[AutoPolicyIntegration] Adaptive runner not available, simulating weight nudging');
      return;
    }
    
    const adjustment = decision.action.parameters.adjustment;
    console.log(`[AutoPolicyIntegration] Executing weight nudging: ${adjustment}`);
    
    // در production باید با actual runner interface کار کند
    // this.adaptiveRunner.adjustWeights(adjustment);
  }
  
  private async executeThresholdAdaptation(decision: any): Promise<void> {
    if (!this.escalationService) {
      console.log('[AutoPolicyIntegration] Escalation service not available, simulating threshold adaptation');
      return;
    }
    
    const adjustment = decision.action.parameters.adjustment;
    console.log(`[AutoPolicyIntegration] Executing threshold adaptation: ${adjustment}`);
    
    // در production باید با actual escalation service interface کار کند
    // this.escalationService.adjustThresholds(adjustment);
  }
  
  private async executeSuppressionTuning(decision: any): Promise<void> {
    if (!this.suppressionService) {
      console.log('[AutoPolicyIntegration] Suppression service not available, simulating suppression tuning');
      return;
    }
    
    const adjustment = decision.action.parameters.adjustment;
    console.log(`[AutoPolicyIntegration] Executing suppression tuning: ${adjustment}`);
    
    // در production باید با actual suppression service interface کار کند
    // this.suppressionService.adjustAggressiveness(adjustment);
  }
  
  private async executePersistencePolicy(decision: any): Promise<void> {
    if (!this.adaptiveRunner) {
      console.log('[AutoPolicyIntegration] Adaptive runner not available, simulating persistence policy');
      return;
    }
    
    const adjustment = decision.action.parameters.adjustment;
    console.log(`[AutoPolicyIntegration] Executing persistence policy: ${adjustment}`);
    
    // در production باید با actual persistence interface کار کند
    // this.adaptiveRunner.adjustDebounce(adjustment);
  }
  
  // Helper methods for metrics collection
  
  private async getAdaptiveRunnerMetrics(): Promise<any> {
    if (!this.adaptiveRunner) {
      return { reNoiseRate: 0.1, failureRatio: 0.05 }; // Mock data
    }
    
    // در production باید از actual metrics endpoint استفاده کند
    // return await this.adaptiveRunner.getMetrics();
    return { reNoiseRate: 0.15, failureRatio: 0.08 }; // Mock data
  }
  
  private async getSuppressionMetrics(): Promise<any> {
    if (!this.suppressionService) {
      return { accuracy: 0.9, falsePositiveRate: 0.02 }; // Mock data
    }
    
    // در production باید از actual suppression metrics استفاده کند
    return { accuracy: 0.92, falsePositiveRate: 0.025 }; // Mock data
  }
  
  private async getEscalationMetrics(): Promise<any> {
    if (!this.escalationService) {
      return { effectivenessRate: 0.8 }; // Mock data
    }
    
    // در production باید از actual escalation metrics استفاده کند
    return { effectivenessRate: 0.78 }; // Mock data
  }
  
  private async getAlertMetrics(): Promise<any> {
    if (!this.alertQueryService) {
      return { totalCount: 150, mttaAvgMs: 320000 }; // Mock data
    }
    
    // در production باید از actual alert analytics استفاده کند
    return { totalCount: 142, mttaAvgMs: 285000 }; // Mock data
  }
  
  private calculateSystemStability(adaptiveMetrics: any, suppressionMetrics: any): number {
    // محاسبه stability بر اساس ترکیب metrics مختلف
    const adaptiveStability = 1 - (adaptiveMetrics.failureRatio || 0);
    const suppressionStability = suppressionMetrics.accuracy || 0.9;
    
    return (adaptiveStability * 0.6 + suppressionStability * 0.4);
  }
  
  /**
   * API endpoints برای monitoring و control
   */
  
  getStatus(): {
    enabled: boolean;
    lastEvaluationTime: number;
    metricsHistorySize: number;
    policyEngineStatus: any;
  } {
    return {
      enabled: this.enabled,
      lastEvaluationTime: this.lastEvaluationTime,
      metricsHistorySize: this.metricsHistory.length,
      policyEngineStatus: this.policyEngine.getStatus()
    };
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.policyEngine.setEnabled(enabled);
    
    if (enabled) {
      console.log('[AutoPolicyIntegration] Auto-policy system enabled');
    } else {
      console.log('[AutoPolicyIntegration] Auto-policy system disabled');
    }
  }
  
  getRecentMetrics(limit: number = 20): AutoPolicyMetricsSnapshot[] {
    return this.metricsHistory.slice(-limit);
  }
  
  async triggerManualEvaluation(): Promise<any> {
    console.log('[AutoPolicyIntegration] Manual evaluation triggered');
    return await this.performEvaluationCycle();
  }
}

// Singleton instance
export const autoPolicyIntegrationService = new AutoPolicyIntegrationService();

export { AutoPolicyIntegrationService };
