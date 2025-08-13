// R2.5: Intelligence Dashboard Routes
// API endpoints for adaptive intelligence insights and system tuning

import { Router } from 'express';
import { rbac } from '../middleware/rbac';
import { userBehaviorAnalytics } from '../services/adaptive-behavior-analytics';
import { securityAnomalyDetection } from '../services/security-anomaly-detection';
import { adaptiveCachingIntelligence } from '../services/adaptive-caching-intelligence';
import { adaptiveSystemTuning } from '../services/adaptive-system-tuning';

const router = Router();

// Intelligence Overview Dashboard
router.get('/overview', rbac({ anyOf: ['governance.adaptive.metrics'] }), async (req, res) => {
  try {
    const systemHealth = adaptiveSystemTuning.getSystemHealthScore();
    const securityMetrics = securityAnomalyDetection.getSecurityMetrics();
    const cacheMetrics = adaptiveCachingIntelligence.getMetrics();
    const behaviorStats = userBehaviorAnalytics.getSystemStats();
    
    const overview = {
      systemHealth: {
        score: systemHealth,
        status: systemHealth > 80 ? 'excellent' : systemHealth > 60 ? 'good' : systemHealth > 40 ? 'warning' : 'critical'
      },
      security: {
        riskScore: securityMetrics.riskScore,
        activeThreats: securityMetrics.activethreats,
        totalAnomalies: securityMetrics.totalAnomalies
      },
      performance: {
        cacheHitRate: cacheMetrics.hitRate,
        totalCacheEntries: cacheMetrics.totalEntries,
        recommendations: cacheMetrics.recommendations.length
      },
      users: {
        totalAnalyzed: behaviorStats.totalUsers,
        averageSecurityScore: behaviorStats.averageSecurityScore,
        topPatterns: behaviorStats.topPatterns
      },
      lastUpdated: new Date().toISOString()
    };
    
    res.json({ success: true, data: overview });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در دریافت داشبورد هوش سیستم',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// User Behavior Analytics
router.get('/behavior/users/:userId', rbac({ anyOf: ['governance.adaptive.metrics'] }), async (req, res) => {
  try {
    const userId = req.params.userId;
    const profile = await userBehaviorAnalytics.analyzeUserBehavior(userId);
    const patterns = userBehaviorAnalytics.detectPatterns(userId);
    const recommendations = userBehaviorAnalytics.getPersonalizedRecommendations(userId);
    const adaptiveParams = userBehaviorAnalytics.getAdaptiveParameters(userId);
    
    res.json({
      success: true,
      data: {
        profile,
        patterns,
        recommendations,
        adaptiveParameters: adaptiveParams
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در تحلیل رفتار کاربر',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Security Anomalies
router.get('/security/anomalies', rbac({ anyOf: ['governance.alert.list'] }), async (req, res) => {
  try {
    const activeThreats = securityAnomalyDetection.getActiveThreats();
    const metrics = securityAnomalyDetection.getSecurityMetrics();
    
    res.json({
      success: true,
      data: {
        activeThreats: activeThreats.slice(0, 20), // Limit to 20
        metrics,
        riskLevels: {
          critical: activeThreats.filter(t => t.severity === 'critical').length,
          high: activeThreats.filter(t => t.severity === 'high').length,
          medium: activeThreats.filter(t => t.severity === 'medium').length,
          low: activeThreats.filter(t => t.severity === 'low').length
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در دریافت anomaly های امنیتی',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Resolve Security Anomaly
router.post('/security/anomalies/:anomalyId/resolve', rbac({ anyOf: ['governance.alert.ack'] }), async (req, res) => {
  try {
    const { anomalyId } = req.params;
    const { status, note } = req.body;
    
    if (!['resolved', 'false_positive'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'وضعیت نامعتبر - باید resolved یا false_positive باشد' 
      });
    }
    
    const success = securityAnomalyDetection.resolveAnomaly(anomalyId, status, note);
    
    if (success) {
      res.json({ success: true, message: 'anomaly با موفقیت حل شد' });
    } else {
      res.status(404).json({ success: false, error: 'anomaly یافت نشد' });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در حل anomaly',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Cache Intelligence
router.get('/cache/metrics', rbac({ anyOf: ['governance.adaptive.metrics'] }), async (req, res) => {
  try {
    const metrics = adaptiveCachingIntelligence.getMetrics();
    
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در دریافت متریک‌های cache',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// System Tuning
router.get('/tuning/recommendations', rbac({ anyOf: ['governance.adaptive.metrics'] }), async (req, res) => {
  try {
    const recommendations = adaptiveSystemTuning.analyzeAndRecommend();
    const parameters = adaptiveSystemTuning.getAllParameters();
    const history = adaptiveSystemTuning.getTuningHistory(10);
    
    res.json({
      success: true,
      data: {
        recommendations,
        currentParameters: parameters,
        recentTuning: history
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در دریافت پیشنهادات تنظیم سیستم',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Apply Auto-tuning
router.post('/tuning/auto-apply', rbac({ anyOf: ['settings.manage'] }), async (req, res) => {
  try {
    const result = adaptiveSystemTuning.autoTune();
    
    res.json({
      success: true,
      message: 'تنظیم خودکار انجام شد',
      data: result
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در اعمال تنظیم خودکار',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Manual Parameter Adjustment
router.post('/tuning/parameters/:paramName', rbac({ anyOf: ['settings.manage'] }), async (req, res) => {
  try {
    const { paramName } = req.params;
    const { value, reason } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'مقدار پارامتر الزامی است' 
      });
    }
    
    const recommendation = {
      parameter: paramName,
      currentValue: adaptiveSystemTuning.getParameter(paramName),
      recommendedValue: value,
      reason: reason || 'تنظیم دستی',
      impact: 'medium' as const,
      confidence: 1.0
    };
    
    const success = adaptiveSystemTuning.applyRecommendation(recommendation);
    
    if (success) {
      res.json({ 
        success: true, 
        message: 'پارامتر با موفقیت تنظیم شد',
        newValue: value
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'مقدار پارامتر نامعتبر یا خارج از محدوده' 
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در تنظیم پارامتر',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Reset Parameters
router.post('/tuning/reset', rbac({ anyOf: ['settings.manage'] }), async (req, res) => {
  try {
    const { parameter } = req.body;
    
    if (parameter) {
      // Reset specific parameter
      const success = adaptiveSystemTuning.resetParameter(parameter);
      if (success) {
        res.json({ success: true, message: `پارامتر ${parameter} به حالت پیش‌فرض بازگشت` });
      } else {
        res.status(404).json({ success: false, error: 'پارامتر یافت نشد' });
      }
    } else {
      // Reset all parameters
      adaptiveSystemTuning.resetAllParameters();
      res.json({ success: true, message: 'تمام پارامترها به حالت پیش‌فرض بازگشتند' });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در بازنشانی پارامترها',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// System Health Check
router.get('/health', async (req, res) => {
  try {
    const healthScore = adaptiveSystemTuning.getSystemHealthScore();
    const securityMetrics = securityAnomalyDetection.getSecurityMetrics();
    const cacheMetrics = adaptiveCachingIntelligence.getMetrics();
    
    const health = {
      overall: healthScore,
      components: {
        security: {
          score: Math.max(0, 100 - securityMetrics.riskScore),
          status: securityMetrics.riskScore < 30 ? 'healthy' : securityMetrics.riskScore < 70 ? 'warning' : 'critical'
        },
        performance: {
          score: Math.min(100, cacheMetrics.hitRate + 20), // Adjust formula as needed
          status: cacheMetrics.hitRate > 70 ? 'healthy' : cacheMetrics.hitRate > 40 ? 'warning' : 'critical'
        },
        intelligence: {
          score: healthScore,
          status: healthScore > 80 ? 'optimal' : healthScore > 60 ? 'good' : 'needs_attention'
        }
      },
      timestamp: new Date().toISOString()
    };
    
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'خطا در چک سلامت سیستم',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
