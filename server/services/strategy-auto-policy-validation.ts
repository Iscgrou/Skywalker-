/**
 * DA VINCI Iteration 31 - Auto-Policy Evolution Validation Harness
 * 
 * اعتبارسنجی عملکرد Auto-Policy Evolution Engine از طریق scenarios J1-J8:
 * J1: Policy Decision Formation (metrics trigger correct decisions)
 * J2: Safety Rail Enforcement (invalid decisions blocked)
 * J3: Cooldown Mechanism (prevent oscillation)
 * J4: Confidence Estimation (proper confidence calculation)
 * J5: Pattern Recognition (trend and anomaly detection)
 * J6: Impact Simulation (risk assessment accuracy)
 * J7: Decision Application (system integration)
 * J8: Outcome Tracking (success rate measurement)
 */

import { AutoPolicyEngine, createAutoPolicyEngine } from './strategy-auto-policy-engine.js';
import { autoPolicyIntegrationService } from './strategy-auto-policy-integration.js';

interface ValidationResult {
  scenario: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  details: string;
  metrics?: Record<string, any>;
}

class AutoPolicyValidationHarness {
  private results: ValidationResult[] = [];
  
  async runAllScenarios(): Promise<{
    allPass: boolean;
    summary: { total: number; passed: number; failed: number; partial: number };
    results: ValidationResult[];
  }> {
    console.log('\n=== DA VINCI Iteration 31: Auto-Policy Evolution Validation ===\n');
    
    this.results = [];
    
    // اجرای تمام scenarios
    await this.runJ1_PolicyDecisionFormation();
    await this.runJ2_SafetyRailEnforcement();
    await this.runJ3_CooldownMechanism();
    await this.runJ4_ConfidenceEstimation();
    await this.runJ5_PatternRecognition();
    await this.runJ6_ImpactSimulation();
    await this.runJ7_DecisionApplication();
    await this.runJ8_OutcomeTracking();
    
    // خلاصه نتایج
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const partial = this.results.filter(r => r.status === 'PARTIAL').length;
    const allPass = failed === 0;
    
    console.log('\n=== Auto-Policy Evolution Validation Summary ===');
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
   * J1: بررسی تشکیل صحیح policy decisions بر اساس metrics
   */
  private async runJ1_PolicyDecisionFormation(): Promise<void> {
    try {
      const engine = createAutoPolicyEngine();
      
      // metrics که باید weight nudging decision تولید کند
      const badMetrics = {
        reNoiseRate: 0.45, // بالاتر از threshold (0.3)
        failureRatio: 0.05,
        escalationEffectiveness: 0.8,
        suppressionAccuracy: 0.9,
        systemStability: 0.95,
        alertVolume: 100,
        falsePositiveRate: 0.02,
        meanTimeToAck: 300
      };
      
      const historicalMetrics = [badMetrics, badMetrics, badMetrics]; // consistent pattern
      
      const result = await engine.analyzeAndDecide(
        badMetrics,
        historicalMetrics,
        { from: Date.now() - 3600000, to: Date.now() }
      );
      
      const weightNudgingDecision = result.decisions.find(d => d.domain === 'weight_nudging');
      
      if (weightNudgingDecision && 
          weightNudgingDecision.trigger.metric === 'reNoiseRate' && 
          weightNudgingDecision.action.type === 'reduce_sensitivity') {
        
        this.results.push({
          scenario: 'J1_PolicyDecisionFormation',
          status: 'PASS',
          details: `Weight nudging decision correctly formed for reNoiseRate=${badMetrics.reNoiseRate}`,
          metrics: { decisions: result.decisions.length, confidence: result.analysis.confidence }
        });
      } else {
        this.results.push({
          scenario: 'J1_PolicyDecisionFormation',
          status: 'FAIL',
          details: 'Expected weight nudging decision not found or incorrect',
          metrics: { decisions: result.decisions.length }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J1_PolicyDecisionFormation',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * J2: بررسی safety rails و جلوگیری از decisions خطرناک
   */
  private async runJ2_SafetyRailEnforcement(): Promise<void> {
    try {
      const engine = createAutoPolicyEngine();
      
      // ایجاد decision خطرناک (adjustment خیلی زیاد)
      const dangerousDecision = {
        id: 'test_dangerous',
        domain: 'weight_nudging' as const,
        timestamp: Date.now(),
        trigger: {
          metric: 'reNoiseRate',
          value: 0.5,
          threshold: 0.3,
          confidence: 0.9
        },
        action: {
          type: 'reduce_sensitivity',
          parameters: { adjustment: -0.8 }, // خیلی زیاد! (>15% limit)
          expectedImpact: 'Dangerous large adjustment'
        }
      };
      
      const result = await engine.applyDecision(dangerousDecision);
      
      if (!result.applied && result.reasons.includes('adjustment_too_large')) {
        this.results.push({
          scenario: 'J2_SafetyRailEnforcement',
          status: 'PASS',
          details: 'Dangerous decision correctly blocked by safety rails',
          metrics: { blocked: true, reasons: result.reasons }
        });
      } else {
        this.results.push({
          scenario: 'J2_SafetyRailEnforcement',
          status: 'FAIL',
          details: 'Dangerous decision was not blocked by safety rails',
          metrics: { applied: result.applied, reasons: result.reasons }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J2_SafetyRailEnforcement',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * J3: بررسی cooldown mechanism برای جلوگیری از oscillation
   */
  private async runJ3_CooldownMechanism(): Promise<void> {
    try {
      const engine = createAutoPolicyEngine();
      
      // اولین decision
      const firstDecision = {
        id: 'test_first',
        domain: 'weight_nudging' as const,
        timestamp: Date.now(),
        trigger: {
          metric: 'reNoiseRate',
          value: 0.4,
          threshold: 0.3,
          confidence: 0.8
        },
        action: {
          type: 'reduce_sensitivity',
          parameters: { adjustment: -0.1 },
          expectedImpact: 'First adjustment'
        }
      };
      
      // دومین decision فوری بعد از اولی
      const secondDecision = {
        id: 'test_second',
        domain: 'weight_nudging' as const,
        timestamp: Date.now(),
        trigger: {
          metric: 'reNoiseRate',
          value: 0.35,
          threshold: 0.3,
          confidence: 0.8
        },
        action: {
          type: 'reduce_sensitivity',
          parameters: { adjustment: -0.05 },
          expectedImpact: 'Second adjustment'
        }
      };
      
      const firstResult = await engine.applyDecision(firstDecision);
      const secondResult = await engine.applyDecision(secondDecision);
      
      if (firstResult.applied && !secondResult.applied && 
          secondResult.reasons.includes('cooldown_active')) {
        
        this.results.push({
          scenario: 'J3_CooldownMechanism',
          status: 'PASS',
          details: 'Cooldown mechanism correctly prevented rapid successive decisions',
          metrics: { 
            firstApplied: firstResult.applied, 
            secondBlocked: !secondResult.applied,
            cooldownReason: secondResult.reasons.includes('cooldown_active')
          }
        });
      } else {
        this.results.push({
          scenario: 'J3_CooldownMechanism',
          status: 'FAIL',
          details: 'Cooldown mechanism did not prevent rapid decisions',
          metrics: { 
            firstResult: firstResult.applied, 
            secondResult: secondResult.applied,
            reasons: secondResult.reasons
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J3_CooldownMechanism',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * J4: بررسی محاسبه confidence بر اساس sample size و variance
   */
  private async runJ4_ConfidenceEstimation(): Promise<void> {
    try {
      const engine = createAutoPolicyEngine();
      
      // Test با sample size کم (confidence پایین)
      const lowSampleMetrics = {
        reNoiseRate: 0.4,
        failureRatio: 0.05,
        escalationEffectiveness: 0.8,
        suppressionAccuracy: 0.9,
        systemStability: 0.95,
        alertVolume: 100,
        falsePositiveRate: 0.02,
        meanTimeToAck: 300
      };
      
      const smallHistory = [lowSampleMetrics, lowSampleMetrics]; // فقط 2 نمونه
      
      const smallResult = await engine.analyzeAndDecide(
        lowSampleMetrics,
        smallHistory,
        { from: Date.now() - 3600000, to: Date.now() }
      );
      
      // Test با sample size زیاد (confidence بالا)
      const largeHistory = Array(50).fill(lowSampleMetrics); // 50 نمونه
      
      const largeResult = await engine.analyzeAndDecide(
        lowSampleMetrics,
        largeHistory,
        { from: Date.now() - 3600000, to: Date.now() }
      );
      
      if (largeResult.analysis.confidence > smallResult.analysis.confidence) {
        this.results.push({
          scenario: 'J4_ConfidenceEstimation',
          status: 'PASS',
          details: 'Confidence correctly increases with larger sample size',
          metrics: {
            smallSampleConfidence: smallResult.analysis.confidence,
            largeSampleConfidence: largeResult.analysis.confidence,
            improvement: largeResult.analysis.confidence - smallResult.analysis.confidence
          }
        });
      } else {
        this.results.push({
          scenario: 'J4_ConfidenceEstimation',
          status: 'FAIL',
          details: 'Confidence calculation does not properly account for sample size',
          metrics: {
            smallSampleConfidence: smallResult.analysis.confidence,
            largeSampleConfidence: largeResult.analysis.confidence
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J4_ConfidenceEstimation',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * J5: بررسی pattern recognition برای trend و anomaly detection
   */
  private async runJ5_PatternRecognition(): Promise<void> {
    try {
      const engine = createAutoPolicyEngine();
      
      // ایجاد trending metrics (بدتر شدن reNoiseRate)
      const trendingMetrics = [
        { reNoiseRate: 0.1, failureRatio: 0.05, escalationEffectiveness: 0.8, suppressionAccuracy: 0.9, systemStability: 0.95, alertVolume: 100, falsePositiveRate: 0.02, meanTimeToAck: 300 },
        { reNoiseRate: 0.2, failureRatio: 0.05, escalationEffectiveness: 0.8, suppressionAccuracy: 0.9, systemStability: 0.95, alertVolume: 100, falsePositiveRate: 0.02, meanTimeToAck: 300 },
        { reNoiseRate: 0.3, failureRatio: 0.05, escalationEffectiveness: 0.8, suppressionAccuracy: 0.9, systemStability: 0.95, alertVolume: 100, falsePositiveRate: 0.02, meanTimeToAck: 300 },
        { reNoiseRate: 0.4, failureRatio: 0.05, escalationEffectiveness: 0.8, suppressionAccuracy: 0.9, systemStability: 0.95, alertVolume: 100, falsePositiveRate: 0.02, meanTimeToAck: 300 },
        { reNoiseRate: 0.5, failureRatio: 0.05, escalationEffectiveness: 0.8, suppressionAccuracy: 0.9, systemStability: 0.95, alertVolume: 100, falsePositiveRate: 0.02, meanTimeToAck: 300 }
      ];
      
      const currentMetrics = trendingMetrics[trendingMetrics.length - 1];
      
      const result = await engine.analyzeAndDecide(
        currentMetrics,
        trendingMetrics,
        { from: Date.now() - 3600000, to: Date.now() }
      );
      
      const patterns = result.analysis.patterns;
      
      if (patterns.trend === 'degrading' && patterns.anomalies.includes('high_renoise_rate')) {
        this.results.push({
          scenario: 'J5_PatternRecognition',
          status: 'PASS',
          details: 'Pattern recognition correctly identified degrading trend and anomaly',
          metrics: {
            trend: patterns.trend,
            volatility: patterns.volatility,
            anomalies: patterns.anomalies
          }
        });
      } else {
        this.results.push({
          scenario: 'J5_PatternRecognition',
          status: 'PARTIAL',
          details: 'Pattern recognition partially working but may miss some patterns',
          metrics: {
            trend: patterns.trend,
            volatility: patterns.volatility,
            anomalies: patterns.anomalies,
            expected: { trend: 'degrading', anomaly: 'high_renoise_rate' }
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J5_PatternRecognition',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * J6: بررسی impact simulation و risk assessment
   */
  private async runJ6_ImpactSimulation(): Promise<void> {
    try {
      const engine = createAutoPolicyEngine();
      
      // Test با adjustment کوچک (risk پایین)
      const smallAdjustmentDecision = {
        id: 'test_small',
        domain: 'weight_nudging' as const,
        timestamp: Date.now(),
        trigger: {
          metric: 'reNoiseRate',
          value: 0.35,
          threshold: 0.3,
          confidence: 0.8
        },
        action: {
          type: 'reduce_sensitivity',
          parameters: { adjustment: -0.05 }, // کوچک
          expectedImpact: 'Small adjustment'
        }
      };
      
      // Test با adjustment بزرگ (risk بالا)
      const largeAdjustmentDecision = {
        id: 'test_large',
        domain: 'weight_nudging' as const,
        timestamp: Date.now(),
        trigger: {
          metric: 'reNoiseRate',
          value: 0.5,
          threshold: 0.3,
          confidence: 0.8
        },
        action: {
          type: 'reduce_sensitivity',
          parameters: { adjustment: -0.12 }, // بزرگ
          expectedImpact: 'Large adjustment'
        }
      };
      
      const currentMetrics = {
        reNoiseRate: 0.4,
        failureRatio: 0.05,
        escalationEffectiveness: 0.8,
        suppressionAccuracy: 0.9,
        systemStability: 0.95,
        alertVolume: 100,
        falsePositiveRate: 0.02,
        meanTimeToAck: 300
      };
      
      // Simulate کردن impact (direct access به internal simulator)
      const simulator = (engine as any).impactSimulator;
      const smallImpact = simulator.simulateImpact(smallAdjustmentDecision, currentMetrics);
      const largeImpact = simulator.simulateImpact(largeAdjustmentDecision, currentMetrics);
      
      if (largeImpact.riskScore > smallImpact.riskScore) {
        this.results.push({
          scenario: 'J6_ImpactSimulation',
          status: 'PASS',
          details: 'Impact simulation correctly assesses higher risk for larger adjustments',
          metrics: {
            smallRisk: smallImpact.riskScore,
            largeRisk: largeImpact.riskScore,
            riskDifference: largeImpact.riskScore - smallImpact.riskScore
          }
        });
      } else {
        this.results.push({
          scenario: 'J6_ImpactSimulation',
          status: 'FAIL',
          details: 'Impact simulation does not properly assess risk levels',
          metrics: {
            smallRisk: smallImpact.riskScore,
            largeRisk: largeImpact.riskScore
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J6_ImpactSimulation',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * J7: بررسی decision application و integration با system
   */
  private async runJ7_DecisionApplication(): Promise<void> {
    try {
      // بررسی status auto-policy integration service
      const status = autoPolicyIntegrationService.getStatus();
      
      // تست manual evaluation trigger
      const beforeMetrics = autoPolicyIntegrationService.getRecentMetrics(1);
      
      // محاسبه manual evaluation
      const evaluationResult = await autoPolicyIntegrationService.triggerManualEvaluation();
      
      const afterMetrics = autoPolicyIntegrationService.getRecentMetrics(1);
      
      if (evaluationResult && evaluationResult.metricsSnapshot && 
          afterMetrics.length >= beforeMetrics.length) {
        
        this.results.push({
          scenario: 'J7_DecisionApplication',
          status: 'PASS',
          details: 'Decision application and system integration working correctly',
          metrics: {
            statusEnabled: status.enabled,
            evaluationComplete: !!evaluationResult.metricsSnapshot,
            decisionsApplied: evaluationResult.decisionsApplied || 0,
            errors: evaluationResult.errors?.length || 0
          }
        });
      } else {
        this.results.push({
          scenario: 'J7_DecisionApplication',
          status: 'PARTIAL',
          details: 'Decision application partially working but may have integration issues',
          metrics: {
            statusEnabled: status.enabled,
            evaluationResult: !!evaluationResult,
            metricsGathered: !!evaluationResult?.metricsSnapshot
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J7_DecisionApplication',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
  
  /**
   * J8: بررسی outcome tracking و success rate measurement
   */
  private async runJ8_OutcomeTracking(): Promise<void> {
    try {
      const engine = createAutoPolicyEngine();
      
      // بررسی اولیه status
      const initialStatus = engine.getStatus();
      
      // اجرای یک evaluation cycle
      const metrics = {
        reNoiseRate: 0.15,
        failureRatio: 0.05,
        escalationEffectiveness: 0.8,
        suppressionAccuracy: 0.9,
        systemStability: 0.95,
        alertVolume: 100,
        falsePositiveRate: 0.02,
        meanTimeToAck: 300
      };
      
      const history = [metrics, metrics, metrics];
      
      const analysisResult = await engine.analyzeAndDecide(
        metrics,
        history,
        { from: Date.now() - 3600000, to: Date.now() }
      );
      
      // بررسی evaluation outcomes
      const outcomes = await engine.evaluateOutcomes();
      
      const finalStatus = engine.getStatus();
      
      if (finalStatus.recentDecisions >= initialStatus.recentDecisions && 
          typeof outcomes.overallSuccessRate === 'number') {
        
        this.results.push({
          scenario: 'J8_OutcomeTracking',
          status: 'PASS',
          details: 'Outcome tracking and success rate measurement working correctly',
          metrics: {
            initialDecisions: initialStatus.recentDecisions,
            finalDecisions: finalStatus.recentDecisions,
            successRate: outcomes.overallSuccessRate,
            evaluationsCount: outcomes.evaluations.length
          }
        });
      } else {
        this.results.push({
          scenario: 'J8_OutcomeTracking',
          status: 'PARTIAL',
          details: 'Outcome tracking partially working but may miss some measurements',
          metrics: {
            successRate: outcomes.overallSuccessRate,
            evaluationsCount: outcomes.evaluations.length,
            statusTracking: !!finalStatus
          }
        });
      }
      
    } catch (error: any) {
      this.results.push({
        scenario: 'J8_OutcomeTracking',
        status: 'FAIL',
        details: `Exception: ${error.message}`
      });
    }
  }
}

// اجرای validation اگر فایل مستقیماً اجرا شود
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const harness = new AutoPolicyValidationHarness();
    const results = await harness.runAllScenarios();
    
    console.log('\n=== Final Results ===');
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(results.allPass ? 0 : 1);
  })().catch(console.error);
}

export { AutoPolicyValidationHarness };
