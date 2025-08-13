// R2.1: User Behavior Analytics Service
// Analyzes audit log patterns to understand user behavior and preferences

import { auditLogger } from './audit-logger';
import { AuditEvents } from './audit-events';

interface UserBehaviorProfile {
  userId: string;
  username: string;
  role: string;
  
  // Access patterns
  loginFrequency: {
    dailyAverage: number;
    weeklyPeak: string; // day of week
    hourlyPeak: number; // hour of day
  };
  
  // Feature usage patterns
  featureUsage: {
    explainabilityViews: number;
    diffRequests: number;
    governanceActions: number;
    preferredRedactionLevel: string;
  };
  
  // Performance indicators
  sessionDuration: {
    average: number;
    median: number;
  };
  
  // Risk indicators
  securityScore: number; // 0-100, higher is better
  anomalyCount: number;
  lastUpdated: Date;
}

interface BehaviorPattern {
  pattern: string;
  confidence: number;
  description: string;
  recommendation?: string;
}

class UserBehaviorAnalytics {
  private profiles = new Map<string, UserBehaviorProfile>();
  private patterns = new Map<string, BehaviorPattern[]>();
  
  // Analyze recent audit logs to build user profiles
  async analyzeUserBehavior(userId: string, timeWindowMs: number = 7 * 24 * 60 * 60 * 1000): Promise<UserBehaviorProfile> {
    // In real implementation, this would query audit logs from database
    // For now, we'll simulate with basic structure
    
    const existingProfile = this.profiles.get(userId);
    const baseProfile: UserBehaviorProfile = {
      userId,
      username: 'unknown',
      role: 'VIEWER',
      loginFrequency: {
        dailyAverage: 2.5,
        weeklyPeak: 'Tuesday',
        hourlyPeak: 14 // 2 PM
      },
      featureUsage: {
        explainabilityViews: 0,
        diffRequests: 0,
        governanceActions: 0,
        preferredRedactionLevel: 'partial'
      },
      sessionDuration: {
        average: 1800000, // 30 minutes
        median: 1200000   // 20 minutes
      },
      securityScore: 85,
      anomalyCount: 0,
      lastUpdated: new Date()
    };
    
    // Update with existing data if available
    if (existingProfile) {
      baseProfile.featureUsage.explainabilityViews = existingProfile.featureUsage.explainabilityViews + 1;
    }
    
    this.profiles.set(userId, baseProfile);
    return baseProfile;
  }
  
  // Detect behavioral patterns and anomalies
  detectPatterns(userId: string): BehaviorPattern[] {
    const profile = this.profiles.get(userId);
    if (!profile) return [];
    
    const patterns: BehaviorPattern[] = [];
    
    // Pattern 1: Heavy explainability user
    if (profile.featureUsage.explainabilityViews > 50) {
      patterns.push({
        pattern: 'power_explainability_user',
        confidence: 0.9,
        description: 'کاربر به طور مکرر از قابلیت‌های explainability استفاده می‌کند',
        recommendation: 'ارائه shortcuts و advanced features'
      });
    }
    
    // Pattern 2: Security conscious user
    if (profile.securityScore > 95 && profile.anomalyCount === 0) {
      patterns.push({
        pattern: 'security_conscious',
        confidence: 0.85,
        description: 'کاربر الگوهای امنیتی بالایی دارد',
        recommendation: 'اختیارات بیشتر و کاهش محدودیت‌ها'
      });
    }
    
    // Pattern 3: Suspicious activity
    if (profile.anomalyCount > 5) {
      patterns.push({
        pattern: 'suspicious_activity',
        confidence: 0.7,
        description: 'فعالیت‌های مشکوک تشخیص داده شده',
        recommendation: 'نظارت بیشتر و محدودیت‌های اضافی'
      });
    }
    
    // Pattern 4: Efficiency seeker
    if (profile.sessionDuration.average < 600000) { // Less than 10 minutes
      patterns.push({
        pattern: 'efficiency_seeker',
        confidence: 0.75,
        description: 'کاربر به دنبال دسترسی سریع و کارآمد است',
        recommendation: 'بهینه‌سازی cache و shortcuts UI'
      });
    }
    
    this.patterns.set(userId, patterns);
    return patterns;
  }
  
  // Get recommendations based on behavior
  getPersonalizedRecommendations(userId: string): string[] {
    const patterns = this.patterns.get(userId) || [];
    return patterns
      .filter(p => p.recommendation)
      .map(p => p.recommendation!)
      .slice(0, 3); // Top 3 recommendations
  }
  
  // Calculate adaptive parameters based on behavior
  getAdaptiveParameters(userId: string): {
    suggestedRedactionLevel: string;
    suggestedCacheTTL: number;
    suggestedRateLimit: number;
  } {
    const profile = this.profiles.get(userId);
    const patterns = this.patterns.get(userId) || [];
    
    let redactionLevel = 'partial';
    let cacheTTL = 120000; // 2 minutes default
    let rateLimit = 30; // requests per window
    
    if (profile) {
      // Adjust based on security score
      if (profile.securityScore > 90) {
        redactionLevel = 'full';
        rateLimit = 50; // Higher limit for trusted users
      } else if (profile.securityScore < 70) {
        redactionLevel = 'minimal';
        rateLimit = 15; // Lower limit for risky users
      }
      
      // Adjust cache TTL based on usage patterns
      if (patterns.some(p => p.pattern === 'efficiency_seeker')) {
        cacheTTL = 300000; // 5 minutes for efficiency seekers
      }
      
      if (patterns.some(p => p.pattern === 'power_explainability_user')) {
        cacheTTL = 600000; // 10 minutes for power users
        rateLimit = 60; // Higher rate limit
      }
    }
    
    return {
      suggestedRedactionLevel: redactionLevel,
      suggestedCacheTTL: cacheTTL,
      suggestedRateLimit: rateLimit
    };
  }
  
  // Get system-wide statistics
  getSystemStats() {
    const totalUsers = this.profiles.size;
    const averageSecurityScore = Array.from(this.profiles.values())
      .reduce((sum, profile) => sum + profile.securityScore, 0) / Math.max(totalUsers, 1);
    
    const patternCounts = new Map<string, number>();
    this.patterns.forEach(userPatterns => {
      userPatterns.forEach(pattern => {
        patternCounts.set(pattern.pattern, (patternCounts.get(pattern.pattern) || 0) + 1);
      });
    });
    
    return {
      totalUsers,
      averageSecurityScore: Math.round(averageSecurityScore),
      topPatterns: Array.from(patternCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      lastAnalyzed: new Date()
    };
  }
}

export const userBehaviorAnalytics = new UserBehaviorAnalytics();
