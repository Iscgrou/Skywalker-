// R2.2: Security Anomaly Detection Service
// Detects suspicious patterns and potential security threats

import { auditLogger } from './audit-logger';
import { AuditEvents } from './audit-events';

interface SecurityAnomaly {
  id: string;
  userId: string;
  username: string;
  type: 'rate_anomaly' | 'access_pattern' | 'role_escalation' | 'geographic' | 'temporal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  evidence: any;
  status: 'active' | 'investigated' | 'resolved' | 'false_positive';
  riskScore: number; // 0-100
}

interface SecurityMetrics {
  totalAnomalies: number;
  activethreats: number;
  riskScore: number;
  lastAnalysis: Date;
  topThreats: SecurityAnomaly[];
}

class SecurityAnomalyDetection {
  private anomalies = new Map<string, SecurityAnomaly>();
  private userAccessHistory = new Map<string, any[]>();
  private thresholds = {
    maxRequestsPerMinute: 100,
    maxFailedLoginsPerHour: 5,
    maxConcurrentSessions: 3,
    suspiciousHourThreshold: 2, // Access between 2-6 AM
    geographicDistanceKm: 1000  // Impossible travel distance
  };
  
  // Analyze request patterns for rate anomalies
  detectRateAnomalies(userId: string, requestCount: number, timeWindowMs: number): SecurityAnomaly | null {
    const requestsPerMinute = (requestCount / timeWindowMs) * 60000;
    
    if (requestsPerMinute > this.thresholds.maxRequestsPerMinute) {
      const anomaly: SecurityAnomaly = {
        id: `rate_${userId}_${Date.now()}`,
        userId,
        username: 'unknown',
        type: 'rate_anomaly',
        severity: requestsPerMinute > 200 ? 'critical' : 'high',
        description: `نرخ درخواست غیرعادی: ${Math.round(requestsPerMinute)} درخواست در دقیقه`,
        detectedAt: new Date(),
        evidence: { requestsPerMinute, threshold: this.thresholds.maxRequestsPerMinute },
        status: 'active',
        riskScore: Math.min(100, (requestsPerMinute / this.thresholds.maxRequestsPerMinute) * 50)
      };
      
      this.anomalies.set(anomaly.id, anomaly);
      return anomaly;
    }
    
    return null;
  }
  
  // Detect suspicious access patterns
  detectAccessPatternAnomalies(userId: string, accessTime: Date, ipAddress?: string, userAgent?: string): SecurityAnomaly | null {
    const history = this.userAccessHistory.get(userId) || [];
    
    // Check for suspicious time access (2-6 AM)
    const hour = accessTime.getHours();
    if (hour >= 2 && hour <= 6) {
      const recentNightAccess = history.filter(h => {
        const hHour = new Date(h.timestamp).getHours();
        return hHour >= 2 && hHour <= 6 && Date.now() - h.timestamp < 7 * 24 * 60 * 60 * 1000;
      }).length;
      
      if (recentNightAccess > 3) { // More than 3 night accesses in a week
        const anomaly: SecurityAnomaly = {
          id: `temporal_${userId}_${Date.now()}`,
          userId,
          username: 'unknown',
          type: 'temporal',
          severity: 'medium',
          description: `دسترسی مکرر در ساعات غیرعادی (${hour}:00)`,
          detectedAt: new Date(),
          evidence: { accessHour: hour, recentNightAccess },
          status: 'active',
          riskScore: 30 + recentNightAccess * 5
        };
        
        this.anomalies.set(anomaly.id, anomaly);
        return anomaly;
      }
    }
    
    // Check for rapid IP changes (simplified geographic detection)
    if (ipAddress) {
      const recentIPs = history
        .filter(h => Date.now() - h.timestamp < 60 * 60 * 1000) // Last hour
        .map(h => h.ipAddress)
        .filter(ip => ip && ip !== ipAddress);
      
      if (recentIPs.length > 2) { // More than 2 different IPs in an hour
        const anomaly: SecurityAnomaly = {
          id: `geographic_${userId}_${Date.now()}`,
          userId,
          username: 'unknown',
          type: 'geographic',
          severity: 'high',
          description: `تغییر مکان جغرافیایی سریع: ${recentIPs.length + 1} IP در یک ساعت`,
          detectedAt: new Date(),
          evidence: { currentIP: ipAddress, recentIPs },
          status: 'active',
          riskScore: 60 + recentIPs.length * 10
        };
        
        this.anomalies.set(anomaly.id, anomaly);
        return anomaly;
      }
    }
    
    // Update history
    history.push({
      timestamp: Date.now(),
      ipAddress,
      userAgent,
      hour
    });
    
    // Keep only last 100 entries per user
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.userAccessHistory.set(userId, history);
    return null;
  }
  
  // Detect role escalation attempts
  detectRoleEscalationAttempts(userId: string, attemptedRole: string, currentRole: string): SecurityAnomaly | null {
    // Define role hierarchy
    const roleHierarchy = {
      'CRM': 1,
      'VIEWER': 2,
      'CRM_MANAGER': 3,
      'AUDITOR': 4,
      'ANALYST': 5,
      'ADMIN': 6,
      'SUPER_ADMIN': 7
    };
    
    const currentLevel = roleHierarchy[currentRole as keyof typeof roleHierarchy] || 0;
    const attemptedLevel = roleHierarchy[attemptedRole as keyof typeof roleHierarchy] || 0;
    
    if (attemptedLevel > currentLevel + 1) { // Trying to escalate more than one level
      const anomaly: SecurityAnomaly = {
        id: `role_escalation_${userId}_${Date.now()}`,
        userId,
        username: 'unknown',
        type: 'role_escalation',
        severity: attemptedLevel > currentLevel + 2 ? 'critical' : 'high',
        description: `تلاش ارتقای نقش از ${currentRole} به ${attemptedRole}`,
        detectedAt: new Date(),
        evidence: { currentRole, attemptedRole, currentLevel, attemptedLevel },
        status: 'active',
        riskScore: 70 + (attemptedLevel - currentLevel) * 10
      };
      
      this.anomalies.set(anomaly.id, anomaly);
      return anomaly;
    }
    
    return null;
  }
  
  // Get active security threats
  getActiveThreats(): SecurityAnomaly[] {
    return Array.from(this.anomalies.values())
      .filter(anomaly => anomaly.status === 'active')
      .sort((a, b) => b.riskScore - a.riskScore);
  }
  
  // Calculate overall security risk score for the system
  calculateSystemRiskScore(): number {
    const activeThreats = this.getActiveThreats();
    if (activeThreats.length === 0) return 10; // Baseline risk
    
    // Weighted average of threat scores
    const totalRisk = activeThreats.reduce((sum, threat) => {
      const severityWeight = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 5
      }[threat.severity];
      
      return sum + (threat.riskScore * severityWeight);
    }, 0);
    
    const weightedCount = activeThreats.reduce((sum, threat) => {
      const severityWeight = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'critical': 5
      }[threat.severity];
      
      return sum + severityWeight;
    }, 0);
    
    return Math.min(100, totalRisk / Math.max(weightedCount, 1));
  }
  
  // Mark anomaly as resolved or false positive
  resolveAnomaly(anomalyId: string, status: 'resolved' | 'false_positive', note?: string): boolean {
    const anomaly = this.anomalies.get(anomalyId);
    if (!anomaly) return false;
    
    anomaly.status = status;
    
    auditLogger.info(AuditEvents.Security.RoleTamper, `security anomaly ${status}`, {
      anomalyId,
      type: anomaly.type,
      note,
      resolvedAt: new Date()
    }, null as any).catch(() => {});
    
    return true;
  }
  
  // Get security metrics overview
  getSecurityMetrics(): SecurityMetrics {
    const allAnomalies = Array.from(this.anomalies.values());
    const activeThreats = this.getActiveThreats();
    
    return {
      totalAnomalies: allAnomalies.length,
      activethreats: activeThreats.length,
      riskScore: Math.round(this.calculateSystemRiskScore()),
      lastAnalysis: new Date(),
      topThreats: activeThreats.slice(0, 5)
    };
  }
  
  // Auto-remediation recommendations
  getRemediationRecommendations(anomaly: SecurityAnomaly): string[] {
    const recommendations: string[] = [];
    
    switch (anomaly.type) {
      case 'rate_anomaly':
        recommendations.push('افزایش محدودیت نرخ درخواست');
        recommendations.push('فعال‌سازی CAPTCHA');
        recommendations.push('موقتی محدود کردن دسترسی');
        break;
        
      case 'role_escalation':
        recommendations.push('بررسی فوری لاگ‌های کاربر');
        recommendations.push('غیرفعال کردن موقت حساب کاربری');
        recommendations.push('ارسال هشدار به تیم امنیت');
        break;
        
      case 'geographic':
        recommendations.push('درخواست احراز هویت دومرحله‌ای');
        recommendations.push('ارسال نوتیفیکیشن به کاربر');
        recommendations.push('محدود کردن دسترسی‌های حساس');
        break;
        
      case 'temporal':
        recommendations.push('نظارت بیشتر بر فعالیت‌های کاربر');
        recommendations.push('درخواست توضیح دلیل دسترسی');
        break;
    }
    
    return recommendations;
  }
}

export const securityAnomalyDetection = new SecurityAnomalyDetection();
