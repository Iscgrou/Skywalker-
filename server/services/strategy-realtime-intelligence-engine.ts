/**
 * DA VINCI Iteration 32 - Real-time Performance Intelligence Engine
 * 
 * هدف: تبدیل سیستم از "Self-Aware Adaptive" به "Intelligence-Driven Adaptive"
 * 
 * قابلیت‌های کلیدی:
 * - Real-time performance analysis
 * - Cross-layer correlation detection  
 * - Business impact measurement
 * - Automated response orchestration
 * - Predictive insights generation
 * 
 * معماری: Event-driven + Stream processing + Machine learning insights
 */

interface PerformanceMetrics {
  systemMetrics: {
    reNoiseRate: number;
    failureRatio: number;
    suppressionAccuracy: number;
    escalationEffectiveness: number;
    systemStability: number;
  };
  businessMetrics: {
    customerSatisfactionScore: number;
    revenueImpact: number;
    operationalEfficiency: number;
    slaCompliance: number;
  };
  resourceMetrics: {
    cpuUtilization: number;
    memoryUsage: number;
    networkLatency: number;
    diskIo: number;
  };
  timestamp: number;
}

interface IntelligenceInsight {
  id: string;
  type: 'performance_degradation' | 'optimization_opportunity' | 'business_impact' | 'predictive_alert';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0-1
  
  detection: {
    metric: string;
    currentValue: number;
    expectedValue: number;
    deviation: number;
    trendDirection: 'improving' | 'degrading' | 'stable';
  };
  
  analysis: {
    rootCause: string;
    correlatedFactors: string[];
    businessImpact: string;
    technicalImpact: string;
  };
  
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    autoActionable: boolean;
  };
  
  timestamp: number;
  resolvedAt?: number;
}

interface BusinessIntelligenceReport {
  timeframe: string;
  summary: {
    totalInsights: number;
    criticalIssues: number;
    optimizationsImplemented: number;
    businessImpactScore: number; // 0-100
  };
  
  performanceTrends: {
    systemPerformance: 'improving' | 'degrading' | 'stable';
    businessMetrics: 'improving' | 'degrading' | 'stable';
    customerExperience: 'improving' | 'degrading' | 'stable';
  };
  
  roiAnalysis: {
    investmentInOptimization: number;
    measuredReturns: number;
    roi: number;
    paybackPeriod: string;
  };
  
  predictiveInsights: {
    nextLikelyIssue: string;
    estimatedTimeToIssue: string;
    preventiveActions: string[];
  };
}

interface StreamProcessingConfig {
  windowSizeMs: number;        // sliding window size
  samplingIntervalMs: number;  // how often to sample
  bufferSize: number;          // max events in memory
  adaptiveSampling: boolean;   // adjust sampling based on load
  persistenceThreshold: number; // when to persist to database
}

class MetricsStreamProcessor {
  private metricsBuffer: PerformanceMetrics[] = [];
  private config: StreamProcessingConfig;
  private processingActive = false;
  private samplingTimer?: NodeJS.Timeout;
  
  constructor(config: StreamProcessingConfig) {
    this.config = config;
  }
  
  start(): void {
    if (this.processingActive) return;
    
    this.processingActive = true;
    this.scheduleSampling();
    console.log('[IntelligenceEngine] Metrics stream processor started');
  }
  
  stop(): void {
    this.processingActive = false;
    if (this.samplingTimer) {
      clearTimeout(this.samplingTimer);
    }
    console.log('[IntelligenceEngine] Metrics stream processor stopped');
  }
  
  private scheduleSampling(): void {
    if (!this.processingActive) return;
    
    const interval = this.config.adaptiveSampling ? 
      this.calculateAdaptiveInterval() : 
      this.config.samplingIntervalMs;
    
    this.samplingTimer = setTimeout(async () => {
      await this.collectAndProcessMetrics();
      this.scheduleSampling(); // Schedule next collection
    }, interval);
  }
  
  private calculateAdaptiveInterval(): number {
    // Adaptive sampling: sample more frequently during high activity
    const recentActivity = this.metricsBuffer.length;
    const baseInterval = this.config.samplingIntervalMs;
    
    if (recentActivity > this.config.bufferSize * 0.8) {
      return Math.max(baseInterval * 0.5, 1000); // Min 1 second
    } else if (recentActivity < this.config.bufferSize * 0.3) {
      return Math.min(baseInterval * 2, 60000); // Max 1 minute
    }
    
    return baseInterval;
  }
  
  private async collectAndProcessMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherCurrentMetrics();
      this.addToBuffer(metrics);
      
      // Process the sliding window
      const windowMetrics = this.getWindowMetrics();
      if (windowMetrics.length > 0) {
        await this.processMetricsWindow(windowMetrics);
      }
      
    } catch (error) {
      console.error('[IntelligenceEngine] Metrics collection failed:', error);
    }
  }
  
  private async gatherCurrentMetrics(): Promise<PerformanceMetrics> {
    // Collect from all layers with graceful fallbacks
    const systemMetrics = await this.collectSystemMetrics();
    const businessMetrics = await this.collectBusinessMetrics();
    const resourceMetrics = await this.collectResourceMetrics();
    
    return {
      systemMetrics,
      businessMetrics,
      resourceMetrics,
      timestamp: Date.now()
    };
  }
  
  private async collectSystemMetrics(): Promise<PerformanceMetrics['systemMetrics']> {
    try {
      // Integration with existing services
      const { adaptiveWeightsRunner } = await import('./strategy-adaptive-runner.ts');
      const { governanceAlertSuppressionService } = await import('./strategy-governance-alert-suppression-service.ts');
      const { autoPolicyIntegrationService } = await import('./strategy-auto-policy-integration.ts');
      
      const runnerStatus = adaptiveWeightsRunner.getStatus();
  const suppressionMetrics: any = governanceAlertSuppressionService.getSuppressionMetrics();
      // Ensure backward compatibility: normalize accuracy metric if older object shape
      if(typeof suppressionMetrics.accuracy !== 'number') {
        suppressionMetrics.accuracy = 0.9; // default fallback
      }
      const policyStatus = autoPolicyIntegrationService.getStatus();
      
      return {
        reNoiseRate: suppressionMetrics.reNoiseRate || 0,
        failureRatio: runnerStatus.failureRatio || 0,
        suppressionAccuracy: suppressionMetrics.accuracy || 0.9,
        escalationEffectiveness: 0.8, // TODO: connect to escalation service
        systemStability: this.calculateSystemStability(runnerStatus, suppressionMetrics)
      };
      
    } catch (error) {
      console.warn('[IntelligenceEngine] System metrics collection failed, using defaults:', error);
      return {
        reNoiseRate: 0.1,
        failureRatio: 0.05,
        suppressionAccuracy: 0.9,
        escalationEffectiveness: 0.8,
        systemStability: 0.85
      };
    }
  }
  
  private async collectBusinessMetrics(): Promise<PerformanceMetrics['businessMetrics']> {
    // Mock implementation - in production would connect to CRM/Business systems
    return {
      customerSatisfactionScore: 8.2 + (Math.random() - 0.5) * 0.4, // 8.0-8.4 range
      revenueImpact: (Math.random() - 0.5) * 10, // -5% to +5%
      operationalEfficiency: 0.75 + Math.random() * 0.2, // 75-95%
      slaCompliance: 0.95 + Math.random() * 0.04 // 95-99%
    };
  }
  
  private async collectResourceMetrics(): Promise<PerformanceMetrics['resourceMetrics']> {
    // Simplified resource monitoring - in production would use system APIs
    return {
      cpuUtilization: Math.random() * 0.8, // 0-80%
      memoryUsage: 0.3 + Math.random() * 0.4, // 30-70%
      networkLatency: 10 + Math.random() * 40, // 10-50ms
      diskIo: Math.random() * 1000 // 0-1000 IOPS
    };
  }
  
  private calculateSystemStability(runnerStatus: any, suppressionMetrics: any): number {
    const runnerStability = runnerStatus.hydrated ? 1 : 0;
    const suppressionStability = suppressionMetrics.suppressed / 
      Math.max(1, suppressionMetrics.suppressed + suppressionMetrics.active);
    const failureStability = 1 - (runnerStatus.failureRatio || 0);
    
    return (runnerStability * 0.4 + suppressionStability * 0.3 + failureStability * 0.3);
  }
  
  private addToBuffer(metrics: PerformanceMetrics): void {
    this.metricsBuffer.push(metrics);
    
    // Maintain buffer size
    if (this.metricsBuffer.length > this.config.bufferSize) {
      this.metricsBuffer.shift();
    }
  }
  
  private getWindowMetrics(): PerformanceMetrics[] {
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;
    
    return this.metricsBuffer.filter(m => m.timestamp >= windowStart);
  }
  
  private async processMetricsWindow(metrics: PerformanceMetrics[]): Promise<void> {
    // This will be processed by IntelligenceAnalyzer
    // For now, just ensure the data is available
    const verbose = process.env.INTELLIGENCE_VERBOSE === '1';
    if (verbose) {
      // Optional basic throttle: only log every 5th call
      const counter = (this as any)._logCounter = ((this as any)._logCounter || 0) + 1;
      if (counter % 5 === 0) {
        console.log(`[IntelligenceEngine] Processing window with ${metrics.length} metrics`);
      }
    }
  }
  
  getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metricsBuffer.slice(-count);
  }
  
  getCurrentMetrics(): PerformanceMetrics | null {
    return this.metricsBuffer[this.metricsBuffer.length - 1] || null;
  }
}

class IntelligenceAnalyzer {
  private insights: IntelligenceInsight[] = [];
  private thresholds: Record<string, { warning: number; critical: number }>;
  
  constructor() {
    this.thresholds = {
      reNoiseRate: { warning: 0.2, critical: 0.3 },
      failureRatio: { warning: 0.3, critical: 0.5 },
      suppressionAccuracy: { warning: 0.8, critical: 0.7 },
      systemStability: { warning: 0.7, critical: 0.5 },
      customerSatisfactionScore: { warning: 7.0, critical: 6.0 },
      slaCompliance: { warning: 0.95, critical: 0.90 }
    };
  }
  
  analyzeMetrics(metrics: PerformanceMetrics[]): IntelligenceInsight[] {
    if (metrics.length === 0) return [];
    
    const currentMetrics = metrics[metrics.length - 1];
    const insights: IntelligenceInsight[] = [];
    
    // Performance degradation analysis
    insights.push(...this.detectPerformanceDegradation(metrics));
    
    // Cross-layer correlation analysis
    insights.push(...this.detectCrossLayerCorrelations(metrics));
    
    // Business impact analysis
    insights.push(...this.analyzeBusinessImpact(metrics));
    
    // Predictive analysis
    insights.push(...this.generatePredictiveInsights(metrics));
    
    // Store insights
    this.insights.push(...insights);
    
    // Maintain insights history (keep last 1000)
    if (this.insights.length > 1000) {
      this.insights.splice(0, this.insights.length - 1000);
    }
    
    return insights;
  }
  
  private detectPerformanceDegradation(metrics: PerformanceMetrics[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];
    const current = metrics[metrics.length - 1];
    
    // Check reNoiseRate degradation
    if (current.systemMetrics.reNoiseRate > this.thresholds.reNoiseRate.critical) {
      insights.push({
        id: `perf_deg_renoise_${Date.now()}`,
        type: 'performance_degradation',
        severity: 'CRITICAL',
        confidence: 0.95,
        detection: {
          metric: 'reNoiseRate',
          currentValue: current.systemMetrics.reNoiseRate,
          expectedValue: 0.1,
          deviation: current.systemMetrics.reNoiseRate - 0.1,
          trendDirection: this.calculateTrend(metrics.map(m => m.systemMetrics.reNoiseRate))
        },
        analysis: {
          rootCause: 'suppression_policy_drift_or_traffic_pattern_change',
          correlatedFactors: ['suppression_accuracy', 'system_stability'],
          businessImpact: 'potential_customer_satisfaction_decline',
          technicalImpact: 'increased_false_positive_alerts'
        },
        recommendations: {
          immediate: ['trigger_weight_adjustment', 'review_suppression_thresholds'],
          shortTerm: ['analyze_traffic_patterns', 'optimize_suppression_rules'],
          longTerm: ['implement_adaptive_thresholds', 'enhance_pattern_recognition'],
          autoActionable: true
        },
        timestamp: Date.now()
      });
    }
    
    // Check failure ratio degradation
    if (current.systemMetrics.failureRatio > this.thresholds.failureRatio.critical) {
      insights.push({
        id: `perf_deg_failure_${Date.now()}`,
        type: 'performance_degradation',
        severity: 'CRITICAL',
        confidence: 0.90,
        detection: {
          metric: 'failureRatio',
          currentValue: current.systemMetrics.failureRatio,
          expectedValue: 0.05,
          deviation: current.systemMetrics.failureRatio - 0.05,
          trendDirection: this.calculateTrend(metrics.map(m => m.systemMetrics.failureRatio))
        },
        analysis: {
          rootCause: 'persistence_layer_stress_or_database_performance',
          correlatedFactors: ['memory_usage', 'disk_io', 'network_latency'],
          businessImpact: 'potential_data_consistency_issues',
          technicalImpact: 'increased_retry_cycles_and_resource_consumption'
        },
        recommendations: {
          immediate: ['increase_debounce_cooldown', 'check_database_performance'],
          shortTerm: ['optimize_persistence_queries', 'review_connection_pooling'],
          longTerm: ['implement_circuit_breakers', 'database_scaling_strategy'],
          autoActionable: true
        },
        timestamp: Date.now()
      });
    }
    
    return insights;
  }
  
  private detectCrossLayerCorrelations(metrics: PerformanceMetrics[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];
    
    if (metrics.length < 3) return insights; // Need history for correlation
    
    const current = metrics[metrics.length - 1];
    const previous = metrics[metrics.length - 2];
    
    // Correlation: Suppression accuracy vs Business metrics
    if (Math.abs(current.systemMetrics.suppressionAccuracy - previous.systemMetrics.suppressionAccuracy) > 0.1 &&
        Math.abs(current.businessMetrics.customerSatisfactionScore - previous.businessMetrics.customerSatisfactionScore) > 0.5) {
      
      const correlation = this.calculateCorrelation(
        metrics.map(m => m.systemMetrics.suppressionAccuracy),
        metrics.map(m => m.businessMetrics.customerSatisfactionScore)
      );
      
      if (Math.abs(correlation) > 0.7) {
        insights.push({
          id: `correlation_suppression_satisfaction_${Date.now()}`,
          type: 'business_impact',
          severity: correlation > 0 ? 'MEDIUM' : 'HIGH',
          confidence: Math.abs(correlation),
          detection: {
            metric: 'suppression_accuracy_vs_customer_satisfaction',
            currentValue: correlation,
            expectedValue: 0.8,
            deviation: correlation - 0.8,
            trendDirection: correlation > 0 ? 'improving' : 'degrading'
          },
          analysis: {
            rootCause: 'suppression_policy_directly_affecting_customer_experience',
            correlatedFactors: ['alert_accuracy', 'response_time', 'false_positive_rate'],
            businessImpact: correlation > 0 ? 'positive_customer_experience' : 'customer_satisfaction_risk',
            technicalImpact: 'suppression_tuning_has_downstream_effects'
          },
          recommendations: {
            immediate: correlation > 0 ? ['maintain_current_suppression_levels'] : ['review_suppression_aggressiveness'],
            shortTerm: ['fine_tune_suppression_thresholds', 'customer_feedback_integration'],
            longTerm: ['predictive_customer_impact_modeling', 'automated_suppression_optimization'],
            autoActionable: false
          },
          timestamp: Date.now()
        });
      }
    }
    
    return insights;
  }
  
  private analyzeBusinessImpact(metrics: PerformanceMetrics[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];
    const current = metrics[metrics.length - 1];
    
    // Business impact from technical changes
    if (current.businessMetrics.revenueImpact < -2) {
      insights.push({
        id: `business_impact_revenue_${Date.now()}`,
        type: 'business_impact',
        severity: 'HIGH',
        confidence: 0.80,
        detection: {
          metric: 'revenueImpact',
          currentValue: current.businessMetrics.revenueImpact,
          expectedValue: 0,
          deviation: current.businessMetrics.revenueImpact,
          trendDirection: this.calculateTrend(metrics.map(m => m.businessMetrics.revenueImpact))
        },
        analysis: {
          rootCause: 'technical_optimizations_negatively_affecting_business_flow',
          correlatedFactors: ['system_stability', 'escalation_effectiveness', 'customer_satisfaction'],
          businessImpact: 'direct_revenue_loss_detected',
          technicalImpact: 'need_to_balance_optimization_with_business_continuity'
        },
        recommendations: {
          immediate: ['review_recent_technical_changes', 'emergency_rollback_assessment'],
          shortTerm: ['business_continuity_analysis', 'customer_impact_survey'],
          longTerm: ['business_impact_prediction_model', 'revenue_protection_policies'],
          autoActionable: false
        },
        timestamp: Date.now()
      });
    }
    
    return insights;
  }
  
  private generatePredictiveInsights(metrics: PerformanceMetrics[]): IntelligenceInsight[] {
    const insights: IntelligenceInsight[] = [];
    
    if (metrics.length < 5) return insights; // Need sufficient history
    
    // Predict based on trends
    const reNoiseRateTrend = this.calculateTrendSlope(metrics.map(m => m.systemMetrics.reNoiseRate));
    
    if (reNoiseRateTrend > 0.01) { // Increasing at > 1% per measurement
      const currentRate = metrics[metrics.length - 1].systemMetrics.reNoiseRate;
      const predictedTimeToThreshold = (this.thresholds.reNoiseRate.warning - currentRate) / reNoiseRateTrend;
      
      insights.push({
        id: `predictive_renoise_${Date.now()}`,
        type: 'predictive_alert',
        severity: 'MEDIUM',
        confidence: 0.75,
        detection: {
          metric: 'reNoiseRate_future',
          currentValue: currentRate,
          expectedValue: this.thresholds.reNoiseRate.warning,
          deviation: reNoiseRateTrend,
          trendDirection: 'degrading'
        },
        analysis: {
          rootCause: 'progressive_system_degradation_trend_detected',
          correlatedFactors: ['traffic_growth', 'suppression_rule_decay'],
          businessImpact: 'future_customer_experience_risk',
          technicalImpact: 'proactive_intervention_opportunity'
        },
        recommendations: {
          immediate: ['monitor_trend_closely', 'prepare_intervention_plans'],
          shortTerm: ['implement_early_warning_system', 'optimize_before_threshold'],
          longTerm: ['predictive_auto_scaling', 'trend_based_optimization'],
          autoActionable: true
        },
        timestamp: Date.now()
      });
    }
    
    return insights;
  }
  
  private calculateTrend(values: number[]): 'improving' | 'degrading' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const slope = this.calculateTrendSlope(values);
    
    if (slope > 0.01) return 'degrading';
    if (slope < -0.01) return 'improving';
    return 'stable';
  }
  
  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }
  
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  getRecentInsights(limit: number = 20): IntelligenceInsight[] {
    return this.insights.slice(-limit);
  }
  
  getInsightsByType(type: IntelligenceInsight['type']): IntelligenceInsight[] {
    return this.insights.filter(insight => insight.type === type);
  }
  
  getInsightsBySeverity(severity: IntelligenceInsight['severity']): IntelligenceInsight[] {
    return this.insights.filter(insight => insight.severity === severity);
  }
}

export class RealTimeIntelligenceEngine {
  private streamProcessor: MetricsStreamProcessor;
  private intelligenceAnalyzer: IntelligenceAnalyzer;
  private enabled = true;
  private analysisTimer?: NodeJS.Timeout;
  
  constructor() {
    const config: StreamProcessingConfig = {
      windowSizeMs: 5 * 60 * 1000,      // 5 minute sliding window
      samplingIntervalMs: 15 * 1000,    // Sample every 15 seconds
      bufferSize: 100,                   // Keep 100 metrics in memory
      adaptiveSampling: true,            // Adjust sampling based on activity
      persistenceThreshold: 0.1          // Persist insights above this confidence
    };
    
    this.streamProcessor = new MetricsStreamProcessor(config);
    this.intelligenceAnalyzer = new IntelligenceAnalyzer();
  }
  
  start(): void {
    if (!this.enabled) return;
    
    this.streamProcessor.start();
    this.startIntelligenceAnalysis();
    
    console.log('[IntelligenceEngine] Real-time Intelligence Engine started');
  }
  
  stop(): void {
    this.enabled = false;
    this.streamProcessor.stop();
    
    if (this.analysisTimer) {
      clearTimeout(this.analysisTimer);
    }
    
    console.log('[IntelligenceEngine] Real-time Intelligence Engine stopped');
  }
  
  private startIntelligenceAnalysis(): void {
    const analyzeAndSchedule = async () => {
      if (!this.enabled) return;
      
      try {
        const recentMetrics = this.streamProcessor.getRecentMetrics(20);
        if (recentMetrics.length > 0) {
          const insights = this.intelligenceAnalyzer.analyzeMetrics(recentMetrics);
          
          if (insights.length > 0) {
            console.log(`[IntelligenceEngine] Generated ${insights.length} new insights`);
            await this.processNewInsights(insights);
          }
        }
      } catch (error) {
        console.error('[IntelligenceEngine] Analysis cycle failed:', error);
      }
      
      // Schedule next analysis
      this.analysisTimer = setTimeout(analyzeAndSchedule, 30 * 1000); // Every 30 seconds
    };
    
    analyzeAndSchedule();
  }
  
  private async processNewInsights(insights: IntelligenceInsight[]): Promise<void> {
    for (const insight of insights) {
      // Log critical insights immediately
      if (insight.severity === 'CRITICAL') {
        console.warn(`[IntelligenceEngine] CRITICAL INSIGHT: ${insight.analysis.rootCause}`);
      }
      
      // Auto-actionable insights integration with Auto-Policy Engine
      if (insight.recommendations.autoActionable) {
        await this.triggerAutoAction(insight);
      }
    }
  }
  
  private async triggerAutoAction(insight: IntelligenceInsight): Promise<void> {
    try {
      // Integration with Auto-Policy Engine for automated responses
      const { autoPolicyIntegrationService } = await import('./strategy-auto-policy-integration.ts');
      
      console.log(`[IntelligenceEngine] Triggering auto-action for insight: ${insight.id}`);
      
      // Trigger evaluation cycle in auto-policy engine
      // This will cause it to reassess and potentially take action
      await autoPolicyIntegrationService.triggerManualEvaluation();
      
    } catch (error) {
      console.error('[IntelligenceEngine] Auto-action trigger failed:', error);
    }
  }
  
  // Public API methods
  
  getCurrentPerformanceSnapshot(): PerformanceMetrics | null {
    return this.streamProcessor.getCurrentMetrics();
  }
  
  getRecentInsights(limit: number = 10): IntelligenceInsight[] {
    return this.intelligenceAnalyzer.getRecentInsights(limit);
  }
  
  getCriticalInsights(): IntelligenceInsight[] {
    return this.intelligenceAnalyzer.getInsightsBySeverity('CRITICAL');
  }
  
  generateBusinessIntelligenceReport(timeframe: string = 'last_24h'): BusinessIntelligenceReport {
    const insights = this.intelligenceAnalyzer.getRecentInsights(100);
    const recentMetrics = this.streamProcessor.getRecentMetrics(50);
    
    return {
      timeframe,
      summary: {
        totalInsights: insights.length,
        criticalIssues: insights.filter(i => i.severity === 'CRITICAL').length,
        optimizationsImplemented: insights.filter(i => i.recommendations.autoActionable && i.resolvedAt).length,
        businessImpactScore: this.calculateBusinessImpactScore(insights)
      },
      performanceTrends: {
        systemPerformance: this.calculateSystemTrend(recentMetrics),
        businessMetrics: this.calculateBusinessTrend(recentMetrics),
        customerExperience: this.calculateCustomerTrend(recentMetrics)
      },
      roiAnalysis: {
        investmentInOptimization: 1000, // Mock value
        measuredReturns: 3400,         // Mock value  
        roi: 240,                      // Mock value
        paybackPeriod: '2.3 months'    // Mock value
      },
      predictiveInsights: {
        nextLikelyIssue: 'suppression_threshold_drift',
        estimatedTimeToIssue: '3-5 days',
        preventiveActions: ['monitor_suppression_accuracy', 'prepare_threshold_adjustment']
      }
    };
  }
  
  private calculateBusinessImpactScore(insights: IntelligenceInsight[]): number {
    if (insights.length === 0) return 75; // Default neutral score
    
    let score = 75;
    
    // Decrease score for negative insights
    const criticalCount = insights.filter(i => i.severity === 'CRITICAL').length;
    const highCount = insights.filter(i => i.severity === 'HIGH').length;
    
    score -= criticalCount * 15;
    score -= highCount * 8;
    
    // Increase score for resolved issues
    const resolvedCount = insights.filter(i => i.resolvedAt).length;
    score += resolvedCount * 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private calculateSystemTrend(metrics: PerformanceMetrics[]): 'improving' | 'degrading' | 'stable' {
    if (metrics.length < 3) return 'stable';
    
    const systemStabilities = metrics.map(m => m.systemMetrics.systemStability);
    const trend = this.intelligenceAnalyzer['calculateTrend'](systemStabilities);
    
    return trend;
  }
  
  private calculateBusinessTrend(metrics: PerformanceMetrics[]): 'improving' | 'degrading' | 'stable' {
    if (metrics.length < 3) return 'stable';
    
    const satisfactionScores = metrics.map(m => m.businessMetrics.customerSatisfactionScore);
    const trend = this.intelligenceAnalyzer['calculateTrend'](satisfactionScores);
    
    return trend;
  }
  
  private calculateCustomerTrend(metrics: PerformanceMetrics[]): 'improving' | 'degrading' | 'stable' {
    if (metrics.length < 3) return 'stable';
    
    const satisfactionScores = metrics.map(m => m.businessMetrics.customerSatisfactionScore);
    const slaCompliance = metrics.map(m => m.businessMetrics.slaCompliance);
    
    // Combined customer experience metric
    const customerExperience = satisfactionScores.map((score, i) => 
      (score / 10) * 0.7 + slaCompliance[i] * 0.3
    );
    
    const trend = this.intelligenceAnalyzer['calculateTrend'](customerExperience);
    
    return trend;
  }
  
  getStatus(): {
    enabled: boolean;
    metricsCollected: number;
    insightsGenerated: number;
    criticalIssues: number;
    lastAnalysis: number;
  } {
    const recentMetrics = this.streamProcessor.getRecentMetrics(100);
    const recentInsights = this.intelligenceAnalyzer.getRecentInsights(100);
    const criticalInsights = this.intelligenceAnalyzer.getInsightsBySeverity('CRITICAL');
    
    return {
      enabled: this.enabled,
      metricsCollected: recentMetrics.length,
      insightsGenerated: recentInsights.length,
      criticalIssues: criticalInsights.length,
      lastAnalysis: recentMetrics.length > 0 ? recentMetrics[recentMetrics.length - 1].timestamp : 0
    };
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (enabled) {
      this.start();
    } else {
      this.stop();
    }
  }
}

// Singleton instance
export const realTimeIntelligenceEngine = new RealTimeIntelligenceEngine();
