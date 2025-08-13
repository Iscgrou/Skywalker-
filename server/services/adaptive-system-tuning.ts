// R2.4: Adaptive System Tuning Service
// Auto-adjusts system parameters based on load, user behavior, and performance metrics

import { userBehaviorAnalytics } from './adaptive-behavior-analytics';
import { securityAnomalyDetection } from './security-anomaly-detection';
import { adaptiveCachingIntelligence } from './adaptive-caching-intelligence';

interface SystemParameter {
  name: string;
  currentValue: number | string;
  defaultValue: number | string;
  min?: number;
  max?: number;
  lastAdjusted: Date;
  adjustmentReason: string;
}

interface SystemLoad {
  cpuPercent: number;
  memoryPercent: number;
  requestsPerSecond: number;
  activeUsers: number;
  cacheHitRate: number;
  averageResponseTime: number;
}

interface TuningRecommendation {
  parameter: string;
  currentValue: any;
  recommendedValue: any;
  reason: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number; // 0-1
}

class AdaptiveSystemTuning {
  private parameters = new Map<string, SystemParameter>();
  private loadHistory: SystemLoad[] = [];
  private tuningHistory: TuningRecommendation[] = [];
  
  constructor() {
    this.initializeParameters();
  }
  
  private initializeParameters(): void {
    // Rate limiting parameters
    this.parameters.set('diff_rate_capacity', {
      name: 'diff_rate_capacity',
      currentValue: 30,
      defaultValue: 30,
      min: 10,
      max: 100,
      lastAdjusted: new Date(),
      adjustmentReason: 'initial_value'
    });
    
    this.parameters.set('diff_rate_window_ms', {
      name: 'diff_rate_window_ms',
      currentValue: 5 * 60 * 1000,
      defaultValue: 5 * 60 * 1000,
      min: 60 * 1000,
      max: 15 * 60 * 1000,
      lastAdjusted: new Date(),
      adjustmentReason: 'initial_value'
    });
    
    // Cache parameters
    this.parameters.set('cache_max_entries', {
      name: 'cache_max_entries',
      currentValue: 100,
      defaultValue: 100,
      min: 50,
      max: 1000,
      lastAdjusted: new Date(),
      adjustmentReason: 'initial_value'
    });
    
    this.parameters.set('cache_ttl_ms', {
      name: 'cache_ttl_ms',
      currentValue: 2 * 60 * 1000,
      defaultValue: 2 * 60 * 1000,
      min: 30 * 1000,
      max: 30 * 60 * 1000,
      lastAdjusted: new Date(),
      adjustmentReason: 'initial_value'
    });
    
    // Security parameters
    this.parameters.set('max_failed_logins', {
      name: 'max_failed_logins',
      currentValue: 5,
      defaultValue: 5,
      min: 3,
      max: 10,
      lastAdjusted: new Date(),
      adjustmentReason: 'initial_value'
    });
    
    this.parameters.set('session_timeout_ms', {
      name: 'session_timeout_ms',
      currentValue: 24 * 60 * 60 * 1000, // 24 hours
      defaultValue: 24 * 60 * 60 * 1000,
      min: 30 * 60 * 1000, // 30 minutes
      max: 7 * 24 * 60 * 60 * 1000, // 7 days
      lastAdjusted: new Date(),
      adjustmentReason: 'initial_value'
    });
  }
  
  // Simulate getting system load (in real implementation, this would use actual system metrics)
  private getCurrentSystemLoad(): SystemLoad {
    const cacheMetrics = adaptiveCachingIntelligence.getMetrics();
    
    return {
      cpuPercent: Math.random() * 100, // Simulated
      memoryPercent: Math.random() * 100, // Simulated
      requestsPerSecond: Math.floor(Math.random() * 50) + 10,
      activeUsers: Math.floor(Math.random() * 20) + 5,
      cacheHitRate: cacheMetrics.hitRate,
      averageResponseTime: Math.floor(Math.random() * 500) + 100
    };
  }
  
  // Analyze system performance and generate tuning recommendations
  analyzeAndRecommend(): TuningRecommendation[] {
    const currentLoad = this.getCurrentSystemLoad();
    const securityMetrics = securityAnomalyDetection.getSecurityMetrics();
    const behaviorStats = userBehaviorAnalytics.getSystemStats();
    
    this.loadHistory.push(currentLoad);
    if (this.loadHistory.length > 100) {
      this.loadHistory.shift(); // Keep last 100 measurements
    }
    
    const recommendations: TuningRecommendation[] = [];
    
    // Analyze rate limiting
    if (currentLoad.cpuPercent > 80 || currentLoad.averageResponseTime > 1000) {
      const currentCapacity = this.parameters.get('diff_rate_capacity')?.currentValue as number;
      recommendations.push({
        parameter: 'diff_rate_capacity',
        currentValue: currentCapacity,
        recommendedValue: Math.max(10, currentCapacity * 0.8),
        reason: 'سیستم تحت فشار - کاهش حد نرخ درخواست',
        impact: 'high',
        confidence: 0.8
      });
    } else if (currentLoad.cpuPercent < 30 && currentLoad.averageResponseTime < 200) {
      const currentCapacity = this.parameters.get('diff_rate_capacity')?.currentValue as number;
      recommendations.push({
        parameter: 'diff_rate_capacity',
        currentValue: currentCapacity,
        recommendedValue: Math.min(100, currentCapacity * 1.2),
        reason: 'سیستم کم‌بار - افزایش حد نرخ درخواست',
        impact: 'medium',
        confidence: 0.6
      });
    }
    
    // Analyze cache performance
    if (currentLoad.cacheHitRate < 50) {
      const currentTTL = this.parameters.get('cache_ttl_ms')?.currentValue as number;
      recommendations.push({
        parameter: 'cache_ttl_ms',
        currentValue: currentTTL,
        recommendedValue: Math.min(30 * 60 * 1000, currentTTL * 1.5),
        reason: 'نرخ hit cache پایین - افزایش TTL',
        impact: 'medium',
        confidence: 0.7
      });
      
      const currentMaxEntries = this.parameters.get('cache_max_entries')?.currentValue as number;
      recommendations.push({
        parameter: 'cache_max_entries',
        currentValue: currentMaxEntries,
        recommendedValue: Math.min(1000, currentMaxEntries * 1.3),
        reason: 'نرخ hit cache پایین - افزایش حداکثر entries',
        impact: 'medium',
        confidence: 0.6
      });
    } else if (currentLoad.cacheHitRate > 90 && currentLoad.memoryPercent > 80) {
      const currentMaxEntries = this.parameters.get('cache_max_entries')?.currentValue as number;
      recommendations.push({
        parameter: 'cache_max_entries',
        currentValue: currentMaxEntries,
        recommendedValue: Math.max(50, currentMaxEntries * 0.8),
        reason: 'استفاده بالای حافظه - کاهش حداکثر entries cache',
        impact: 'low',
        confidence: 0.5
      });
    }
    
    // Analyze security parameters
    if (securityMetrics.riskScore > 70) {
      const currentFailedLogins = this.parameters.get('max_failed_logins')?.currentValue as number;
      recommendations.push({
        parameter: 'max_failed_logins',
        currentValue: currentFailedLogins,
        recommendedValue: Math.max(3, currentFailedLogins - 1),
        reason: 'امتیاز ریسک امنیتی بالا - کاهش حد تلاش‌های ناموفق',
        impact: 'high',
        confidence: 0.9
      });
      
      const currentSessionTimeout = this.parameters.get('session_timeout_ms')?.currentValue as number;
      recommendations.push({
        parameter: 'session_timeout_ms',
        currentValue: currentSessionTimeout,
        recommendedValue: Math.max(30 * 60 * 1000, currentSessionTimeout * 0.5),
        reason: 'امتیاز ریسک امنیتی بالا - کاهش timeout session',
        impact: 'medium',
        confidence: 0.8
      });
    }
    
    // User behavior based adjustments
    if (behaviorStats.averageSecurityScore > 90 && securityMetrics.riskScore < 30) {
      const currentCapacity = this.parameters.get('diff_rate_capacity')?.currentValue as number;
      recommendations.push({
        parameter: 'diff_rate_capacity',
        currentValue: currentCapacity,
        recommendedValue: Math.min(100, currentCapacity * 1.1),
        reason: 'کاربران با امنیت بالا - افزایش حدود',
        impact: 'low',
        confidence: 0.6
      });
    }
    
    return recommendations;
  }
  
  // Apply a tuning recommendation
  applyRecommendation(recommendation: TuningRecommendation): boolean {
    const parameter = this.parameters.get(recommendation.parameter);
    if (!parameter) return false;
    
    // Validate new value is within bounds
    if (parameter.min !== undefined && recommendation.recommendedValue < parameter.min) {
      return false;
    }
    if (parameter.max !== undefined && recommendation.recommendedValue > parameter.max) {
      return false;
    }
    
    // Apply the change
    parameter.currentValue = recommendation.recommendedValue;
    parameter.lastAdjusted = new Date();
    parameter.adjustmentReason = recommendation.reason;
    
    // Record in history
    this.tuningHistory.push({
      ...recommendation,
      impact: recommendation.impact
    });
    
    // Keep last 50 tuning actions
    if (this.tuningHistory.length > 50) {
      this.tuningHistory.shift();
    }
    
    return true;
  }
  
  // Auto-apply high confidence recommendations
  autoTune(): { applied: number; skipped: number; recommendations: TuningRecommendation[] } {
    const recommendations = this.analyzeAndRecommend();
    let applied = 0;
    let skipped = 0;
    
    for (const rec of recommendations) {
      // Auto-apply only high confidence, non-critical changes
      if (rec.confidence > 0.7 && rec.impact !== 'high') {
        if (this.applyRecommendation(rec)) {
          applied++;
        } else {
          skipped++;
        }
      } else {
        skipped++;
      }
    }
    
    return { applied, skipped, recommendations };
  }
  
  // Get current parameter value
  getParameter(name: string): any {
    return this.parameters.get(name)?.currentValue;
  }
  
  // Get all parameters
  getAllParameters(): SystemParameter[] {
    return Array.from(this.parameters.values());
  }
  
  // Get tuning history
  getTuningHistory(limit: number = 20): TuningRecommendation[] {
    return this.tuningHistory.slice(-limit);
  }
  
  // Get system health score based on current metrics
  getSystemHealthScore(): number {
    const currentLoad = this.getCurrentSystemLoad();
    const securityMetrics = securityAnomalyDetection.getSecurityMetrics();
    
    let score = 100;
    
    // CPU penalty
    if (currentLoad.cpuPercent > 80) score -= 20;
    else if (currentLoad.cpuPercent > 60) score -= 10;
    
    // Memory penalty
    if (currentLoad.memoryPercent > 85) score -= 15;
    else if (currentLoad.memoryPercent > 70) score -= 5;
    
    // Response time penalty
    if (currentLoad.averageResponseTime > 1000) score -= 25;
    else if (currentLoad.averageResponseTime > 500) score -= 10;
    
    // Cache performance bonus/penalty
    if (currentLoad.cacheHitRate > 80) score += 5;
    else if (currentLoad.cacheHitRate < 40) score -= 15;
    
    // Security penalty
    score -= securityMetrics.riskScore * 0.3;
    
    return Math.max(0, Math.round(score));
  }
  
  // Reset parameter to default
  resetParameter(name: string): boolean {
    const parameter = this.parameters.get(name);
    if (!parameter) return false;
    
    parameter.currentValue = parameter.defaultValue;
    parameter.lastAdjusted = new Date();
    parameter.adjustmentReason = 'manual_reset';
    
    return true;
  }
  
  // Reset all parameters to defaults
  resetAllParameters(): void {
    this.parameters.forEach(parameter => {
      parameter.currentValue = parameter.defaultValue;
      parameter.lastAdjusted = new Date();
      parameter.adjustmentReason = 'bulk_reset';
    });
  }
}

export const adaptiveSystemTuning = new AdaptiveSystemTuning();
