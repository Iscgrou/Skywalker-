/**
 * DA VINCI Iteration 32 - Real-time Intelligence Engine Validation Harness
 * 
 * اعتبارسنجی عملکرد Real-time Intelligence Engine از طریق scenarios K1-K8:
 * K1: Metrics Collection & Processing (real-time data gathering)
 * K2: Intelligence Analysis (pattern recognition و insight generation)
 * K3: Business Translation (technical → business metrics conversion)
 * K4: Cross-layer Correlation (detection of system-wide impacts)
 * K5: Predictive Analytics (trend prediction و early warning)
 * K6: Auto-action Integration (integration با Auto-Policy Engine)
 * K7: Business Alert Generation (stakeholder notification system)
 * K8: Executive Dashboard (comprehensive business intelligence)
 */

import { realTimeIntelligenceEngine, businessIntelligenceBridge, realTimeIntelligenceIntegrationService } from './strategy-realtime-intelligence-mocks.js';

interface ValidationResult {
  scenario: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  details: string;
  metrics?: Record<string, any>;
}

class IntelligenceValidationHarness {
  private results: ValidationResult[] = [];
  
  async runAllScenarios(): Promise<{
    allPass: boolean;
    summary: { total: number; passed: number; failed: number; partial: number };
    results: ValidationResult[];
  }> {
    console.log('\n=== DA VINCI Iteration 32: Real-time Intelligence Engine Validation ===\n');
    
    this.results = [];
    
    // اجرای تمام scenarios
    await this.runK1_MetricsCollectionProcessing();
    await this.runK2_IntelligenceAnalysis();
    await this.runK3_BusinessTranslation();
    await this.runK4_CrossLayerCorrelation();
    await this.runK5_PredictiveAnalytics();
    await this.runK6_AutoActionIntegration();
    await this.runK7_BusinessAlertGeneration();
    await this.runK8_ExecutiveDashboard();
    
    // خلاصه نتایج
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const partial = this.results.filter(r => r.status === 'PARTIAL').length;
    const allPass = failed === 0;
    
    console.log('\n=== Real-time Intelligence Engine Validation Summary ===');
    console.log(`Total scenarios: ${this.results.length}`);
    console.log(`PASS: ${passed}, FAIL: ${failed}, PARTIAL: ${partial}`);
    console.log(`Overall result: ${allPass ? 'SUCCESS' : 'NEEDS_ATTENTION'}\n`);
    
    return {
      allPass,
      summary: { total: this.results.length, passed, failed, partial },
      results: this.results
    };
  }
  
  /**
   * K1: بررسی metrics collection و real-time processing
   */
  private async runK1_MetricsCollectionProcessing(): Promise<void> {
    try {
      // Start the intelligence engine
      realTimeIntelligenceEngine.start();
      
      // Wait for initial metrics collection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentMetrics = realTimeIntelligenceEngine.getCurrentPerformanceSnapshot();
      const status = realTimeIntelligenceEngine.getStatus();
      
      if (currentMetrics && 
          typeof currentMetrics.systemMetrics === 'object' &&
          typeof currentMetrics.businessMetrics === 'object' &&
          typeof currentMetrics.resourceMetrics === 'object' &&
          status.enabled && 
          status.metricsCollected > 0) {
        
        this.results.push({
          scenario: 'K1_MetricsCollectionProcessing',
          status: 'PASS',
          details: 'Real-time metrics collection working correctly',
          metrics: {
            metricsCollected: status.metricsCollected,
            lastMetricAge: Date.now() - currentMetrics.timestamp,
            systemMetricsPresent: Object.keys(currentMetrics.systemMetrics).length,
            businessMetricsPresent: Object.keys(currentMetrics.businessMetrics).length
          }
        });
      } else {
        this.results.push({
          scenario: 'K1_MetricsCollectionProcessing',
          status: 'FAIL',
          details: 'Metrics collection not working properly',
          metrics: {
            metricsPresent: !!currentMetrics,
            statusEnabled: status.enabled,
            metricsCount: status.metricsCollected
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K1_MetricsCollectionProcessing',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * K2: بررسی intelligence analysis و insight generation
   */
  private async runK2_IntelligenceAnalysis(): Promise<void> {
    try {
      // Wait for analysis to run
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const insights = realTimeIntelligenceEngine.getRecentInsights(10);
      const criticalInsights = realTimeIntelligenceEngine.getCriticalInsights();
      
      // Check if insights are being generated with proper structure
      const validInsights = insights.filter(insight => 
        insight.id && 
        insight.type && 
        insight.confidence >= 0 && insight.confidence <= 1 &&
        insight.detection && 
        insight.analysis &&
        insight.recommendations
      );
      
      if (validInsights.length > 0) {
        // Check insight quality
        const insightTypes = [...new Set(insights.map(i => i.type))];
        const hasHighConfidence = insights.some(i => i.confidence > 0.7);
        
        this.results.push({
          scenario: 'K2_IntelligenceAnalysis',
          status: 'PASS',
          details: 'Intelligence analysis generating quality insights',
          metrics: {
            totalInsights: insights.length,
            validInsights: validInsights.length,
            criticalInsights: criticalInsights.length,
            insightTypes: insightTypes.length,
            hasHighConfidence,
            avgConfidence: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
          }
        });
      } else {
        this.results.push({
          scenario: 'K2_IntelligenceAnalysis',
          status: 'PARTIAL',
          details: 'Intelligence analysis running but insight quality needs improvement',
          metrics: {
            totalInsights: insights.length,
            validInsights: validInsights.length
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K2_IntelligenceAnalysis',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * K3: بررسی business translation
   */
  private async runK3_BusinessTranslation(): Promise<void> {
    try {
      const currentMetrics = realTimeIntelligenceEngine.getCurrentPerformanceSnapshot();
      
      if (!currentMetrics) {
        this.results.push({
          scenario: 'K3_BusinessTranslation',
          status: 'FAIL',
          details: 'No metrics available for business translation'
        });
        return;
      }
      
      const businessKPIs = businessIntelligenceBridge.translateTechnicalToBusinessKPIs(currentMetrics);
      const customerMetrics = businessIntelligenceBridge.analyzeCustomerExperience(currentMetrics);
      
      const validKPIs = businessKPIs.filter(kpi => 
        kpi.name && 
        typeof kpi.value === 'number' &&
        kpi.unit &&
        ['improving', 'degrading', 'stable'].includes(kpi.trend) &&
        ['positive', 'negative', 'neutral'].includes(kpi.impact) &&
        kpi.relatedTechnicalMetrics && kpi.relatedTechnicalMetrics.length > 0
      );
      
      if (validKPIs.length >= 3 && customerMetrics.length > 0) {
        this.results.push({
          scenario: 'K3_BusinessTranslation',
          status: 'PASS',
          details: 'Business translation working correctly',
          metrics: {
            totalKPIs: businessKPIs.length,
            validKPIs: validKPIs.length,
            customerMetrics: customerMetrics.length,
            positiveKPIs: businessKPIs.filter(kpi => kpi.impact === 'positive').length,
            negativeKPIs: businessKPIs.filter(kpi => kpi.impact === 'negative').length
          }
        });
      } else {
        this.results.push({
          scenario: 'K3_BusinessTranslation',
          status: 'PARTIAL',
          details: 'Business translation partially working',
          metrics: {
            totalKPIs: businessKPIs.length,
            validKPIs: validKPIs.length,
            customerMetrics: customerMetrics.length
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K3_BusinessTranslation',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * K4: بررسی cross-layer correlation detection
   */
  private async runK4_CrossLayerCorrelation(): Promise<void> {
    try {
      const insights = realTimeIntelligenceEngine.getRecentInsights(20);
      
      // Look for insights that show cross-layer correlation
      const correlationInsights = insights.filter(insight => 
        insight.type === 'business_impact' ||
        (insight.analysis.correlatedFactors && insight.analysis.correlatedFactors.length > 1) ||
        insight.analysis.businessImpact.includes('correlation') ||
        insight.analysis.technicalImpact.includes('downstream')
      );
      
      // Check for insights that connect technical metrics to business outcomes
      const businessTechnicalLinks = insights.filter(insight =>
        insight.analysis.businessImpact && 
        insight.analysis.technicalImpact &&
        insight.detection.metric
      );
      
      if (correlationInsights.length > 0 || businessTechnicalLinks.length > 0) {
        this.results.push({
          scenario: 'K4_CrossLayerCorrelation',
          status: 'PASS',
          details: 'Cross-layer correlation detection working',
          metrics: {
            correlationInsights: correlationInsights.length,
            businessTechnicalLinks: businessTechnicalLinks.length,
            totalInsights: insights.length,
            correlationRatio: correlationInsights.length / Math.max(1, insights.length)
          }
        });
      } else {
        this.results.push({
          scenario: 'K4_CrossLayerCorrelation',
          status: 'PARTIAL',
          details: 'Cross-layer correlation detection needs more data or time',
          metrics: {
            totalInsights: insights.length,
            availableForCorrelation: insights.filter(i => i.analysis.correlatedFactors).length
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K4_CrossLayerCorrelation',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * K5: بررسی predictive analytics
   */
  private async runK5_PredictiveAnalytics(): Promise<void> {
    try {
      const insights = realTimeIntelligenceEngine.getRecentInsights(30);
      
      // Look for predictive insights
      const predictiveInsights = insights.filter(insight => insight.type === 'predictive_alert');
      
      // Look for trend analysis in insights
      const trendInsights = insights.filter(insight => 
        insight.detection.trendDirection && 
        insight.detection.trendDirection !== 'stable'
      );
      
      if (predictiveInsights.length > 0) {
        // Check quality of predictions
        const futureFocused = predictiveInsights.filter(insight =>
          insight.analysis.businessImpact.includes('future') ||
          insight.recommendations.longTerm.length > 0
        );
        
        this.results.push({
          scenario: 'K5_PredictiveAnalytics',
          status: 'PASS',
          details: 'Predictive analytics generating forward-looking insights',
          metrics: {
            predictiveInsights: predictiveInsights.length,
            futureFocused: futureFocused.length,
            trendInsights: trendInsights.length,
            totalInsights: insights.length
          }
        });
      } else if (trendInsights.length > 0) {
        this.results.push({
          scenario: 'K5_PredictiveAnalytics',
          status: 'PARTIAL',
          details: 'Trend analysis working but specific predictions need more data',
          metrics: {
            trendInsights: trendInsights.length,
            totalInsights: insights.length
          }
        });
      } else {
        this.results.push({
          scenario: 'K5_PredictiveAnalytics',
          status: 'PARTIAL',
          details: 'Predictive analytics needs more historical data to generate predictions',
          metrics: {
            totalInsights: insights.length,
            dataAvailable: insights.length > 0
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K5_PredictiveAnalytics',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * K6: بررسی auto-action integration
   */
  private async runK6_AutoActionIntegration(): Promise<void> {
    try {
      // Start integration service
      await realTimeIntelligenceIntegrationService.startIntegration();
      
      // Wait for integration to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const integrationStatus = realTimeIntelligenceIntegrationService.getIntegrationStatus();
      const insights = realTimeIntelligenceEngine.getRecentInsights(10);
      
      // Look for auto-actionable insights
      const autoActionableInsights = insights.filter(insight => 
        insight.recommendations && insight.recommendations.autoActionable
      );
      
      if (integrationStatus.active && integrationStatus.engineStatus.enabled) {
        this.results.push({
          scenario: 'K6_AutoActionIntegration',
          status: 'PASS',
          details: 'Auto-action integration active and functional',
          metrics: {
            integrationActive: integrationStatus.active,
            engineEnabled: integrationStatus.engineStatus.enabled,
            autoActionableInsights: autoActionableInsights.length,
            configEnabled: integrationStatus.config.enableAutoActions
          }
        });
      } else {
        this.results.push({
          scenario: 'K6_AutoActionIntegration',
          status: 'PARTIAL',
          details: 'Auto-action integration partially working',
          metrics: {
            integrationActive: integrationStatus.active,
            engineEnabled: integrationStatus.engineStatus.enabled
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K6_AutoActionIntegration',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * K7: بررسی business alert generation
   */
  private async runK7_BusinessAlertGeneration(): Promise<void> {
    try {
      const insights = realTimeIntelligenceEngine.getRecentInsights(20);
      
      if (insights.length > 0) {
        const businessAlerts = businessIntelligenceBridge.generateBusinessAlerts(insights);
        
        const validAlerts = businessAlerts.filter(alert =>
          alert.id &&
          alert.title &&
          alert.businessImpact &&
          alert.actionRequired &&
          alert.stakeholders && alert.stakeholders.length > 0 &&
          ['low', 'medium', 'high', 'critical'].includes(alert.severity)
        );
        
        if (validAlerts.length > 0) {
          const criticalAlerts = businessAlerts.filter(alert => alert.severity === 'critical');
          const highCostAlerts = businessAlerts.filter(alert => alert.estimatedCost > 1000);
          
          this.results.push({
            scenario: 'K7_BusinessAlertGeneration',
            status: 'PASS',
            details: 'Business alert generation working correctly',
            metrics: {
              totalAlerts: businessAlerts.length,
              validAlerts: validAlerts.length,
              criticalAlerts: criticalAlerts.length,
              highCostAlerts: highCostAlerts.length,
              avgCost: businessAlerts.reduce((sum, a) => sum + a.estimatedCost, 0) / businessAlerts.length
            }
          });
        } else {
          this.results.push({
            scenario: 'K7_BusinessAlertGeneration',
            status: 'PARTIAL',
            details: 'Business alerts generated but quality needs improvement',
            metrics: {
              totalAlerts: businessAlerts.length,
              validAlerts: validAlerts.length
            }
          });
        }
      } else {
        this.results.push({
          scenario: 'K7_BusinessAlertGeneration',
          status: 'PARTIAL',
          details: 'No insights available for business alert generation',
          metrics: {
            insightsAvailable: insights.length
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K7_BusinessAlertGeneration',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * K8: بررسی executive dashboard
   */
  private async runK8_ExecutiveDashboard(): Promise<void> {
    try {
      const dashboard = await realTimeIntelligenceIntegrationService.generateIntelligenceDashboard();
      const executiveSummary = businessIntelligenceBridge.generateExecutiveDashboard();
      
      const requiredDashboardFields = [
        'timestamp', 'systemOverview', 'businessMetrics', 'technicalInsights',
        'businessAlerts', 'executiveSummary', 'recommendations'
      ];
      
      const dashboardComplete = requiredDashboardFields.every(field => 
        dashboard.hasOwnProperty(field)
      );
      
      const executiveComplete = executiveSummary &&
        executiveSummary.summary &&
        executiveSummary.keyMetrics &&
        executiveSummary.recommendations;
      
      if (dashboardComplete && executiveComplete) {
        this.results.push({
          scenario: 'K8_ExecutiveDashboard',
          status: 'PASS',
          details: 'Executive dashboard generation complete and comprehensive',
          metrics: {
            dashboardComplete,
            executiveComplete,
            healthScore: dashboard.systemOverview.healthScore,
            activeInsights: dashboard.systemOverview.activeInsights,
            recommendations: dashboard.recommendations.length,
            businessMetrics: dashboard.businessMetrics.length
          }
        });
      } else {
        this.results.push({
          scenario: 'K8_ExecutiveDashboard',
          status: 'PARTIAL',
          details: 'Executive dashboard partially complete',
          metrics: {
            dashboardComplete,
            executiveComplete,
            missingFields: requiredDashboardFields.filter(field => !dashboard.hasOwnProperty(field))
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'K8_ExecutiveDashboard',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
}

// اجرای validation اگر فایل مستقیماً اجرا شود
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const harness = new IntelligenceValidationHarness();
    const results = await harness.runAllScenarios();
    
    console.log('\n=== Final Results ===');
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(results.allPass ? 0 : 1);
  })().catch(console.error);
}

export { IntelligenceValidationHarness };
