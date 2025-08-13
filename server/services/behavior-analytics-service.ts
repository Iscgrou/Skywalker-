// R2.2: Behavior Analytics Service
// Analyzes user behavior, establishes baselines, and detects anomalies

import { db } from "../db";
import { activityLogs } from "../../shared/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { auditLogger } from "./audit-logger";

// Define additional adaptive audit events
const AdaptiveEvents = {
  BaselineUpdateFailed: 'adaptive_baseline_update_failed',
  AnomalyDetected: 'adaptive_anomaly_detected',
  BehaviorLearned: 'adaptive_behavior_learned',
  ParameterAutotuned: 'adaptive_parameter_autotuned'
};

interface BehaviorMetric {
  name: string;
  value: number;
  timestamp: number;
}

// Baseline entry structure
interface BaselineEntry {
  userId: string;
  metric: string;
  value: number;
  standardDeviation?: number;
  lastUpdated: number;
  sampleSize: number;
}

// Anomaly detection entry
interface AnomalyEntry {
  id: number;
  userId: string;
  eventType: string;
  severity: number;
  timestamp: number;
  metric: string;
  observed: number;
  expected?: number;
  details?: string;
}

// Geographic access pattern entry
interface GeoPatternEntry {
  userId: string;
  ipPrefix: string;
  accessCount: number;
  lastAccess: number;
  firstSeen: number;
}

// Resource access pattern entry
interface ResourcePatternEntry {
  resourceType: string;
  hourOfDay: number;
  dayOfWeek: number;
  accessCount: number;
  lastUpdated: number;
}

// User behavior profile
export interface UserBehaviorProfile {
  userId: string;
  metrics: {
    loginFrequency?: {
      dailyAverage: number;
      weekdayPattern: number[];
      hourPattern: number[];
    };
    sessionDuration?: {
      average: number;
      standardDeviation: number;
    };
    resourceUsage?: {
      byType: Record<string, number>;
      byEndpoint: Record<string, number>;
    };
    anomalyScore?: number;
    lastUpdated?: number;
  };
  geographicAccess?: {
    commonLocations: Array<{ipPrefix: string, accessCount: number}>;
    unusualLocations?: Array<{ipPrefix: string, accessCount: number, firstSeen: number}>;
  };
}

// In-memory storage (would be a proper database in production)
class AdaptiveAnalyticsStore {
  private behaviorBaselines: BaselineEntry[] = [];
  private anomalyDetections: AnomalyEntry[] = [];
  private geoPatterns: GeoPatternEntry[] = [];
  private resourcePatterns: ResourcePatternEntry[] = [];
  private nextAnomalyId = 1;
  
  // Baseline operations
  async getBaselines(userId: string): Promise<BaselineEntry[]> {
    return this.behaviorBaselines.filter(b => b.userId === userId);
  }
  
  async getBaselineForMetric(userId: string, metric: string): Promise<BaselineEntry | undefined> {
    return this.behaviorBaselines.find(b => b.userId === userId && b.metric === metric);
  }
  
  async upsertBaseline(baseline: BaselineEntry): Promise<void> {
    const existing = await this.getBaselineForMetric(baseline.userId, baseline.metric);
    
    if (existing) {
      // Update
      const index = this.behaviorBaselines.indexOf(existing);
      this.behaviorBaselines[index] = baseline;
    } else {
      // Insert
      this.behaviorBaselines.push(baseline);
    }
  }
  
  // Anomaly operations
  async addAnomaly(anomaly: Omit<AnomalyEntry, 'id'>): Promise<AnomalyEntry> {
    const entry: AnomalyEntry = {
      ...anomaly,
      id: this.nextAnomalyId++
    };
    
    this.anomalyDetections.push(entry);
    return entry;
  }
  
  async getRecentAnomalies(userId: string, sinceTimestamp: number): Promise<AnomalyEntry[]> {
    return this.anomalyDetections
      .filter(a => a.userId === userId && a.timestamp >= sinceTimestamp)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
  
  // Geographic pattern operations
  async getGeoPatterns(userId: string): Promise<GeoPatternEntry[]> {
    return this.geoPatterns
      .filter(p => p.userId === userId)
      .sort((a, b) => b.accessCount - a.accessCount);
  }
  
  async getGeoPattern(userId: string, ipPrefix: string): Promise<GeoPatternEntry | undefined> {
    return this.geoPatterns.find(p => p.userId === userId && p.ipPrefix === ipPrefix);
  }
  
  async upsertGeoPattern(pattern: GeoPatternEntry): Promise<void> {
    const existing = await this.getGeoPattern(pattern.userId, pattern.ipPrefix);
    
    if (existing) {
      // Update
      const index = this.geoPatterns.indexOf(existing);
      this.geoPatterns[index] = pattern;
    } else {
      // Insert
      this.geoPatterns.push(pattern);
    }
  }
  
  // Resource pattern operations
  async getResourcePattern(resourceType: string, hourOfDay: number, dayOfWeek: number): Promise<ResourcePatternEntry | undefined> {
    return this.resourcePatterns.find(
      p => p.resourceType === resourceType && 
           p.hourOfDay === hourOfDay && 
           p.dayOfWeek === dayOfWeek
    );
  }
  
  async upsertResourcePattern(pattern: ResourcePatternEntry): Promise<void> {
    const existing = await this.getResourcePattern(
      pattern.resourceType, 
      pattern.hourOfDay,
      pattern.dayOfWeek
    );
    
    if (existing) {
      // Update
      const index = this.resourcePatterns.indexOf(existing);
      this.resourcePatterns[index] = pattern;
    } else {
      // Insert
      this.resourcePatterns.push(pattern);
    }
  }
}

// Create a singleton instance
const analyticsStore = new AdaptiveAnalyticsStore();

// Default time window for analysis: 30 days
const DEFAULT_ANALYSIS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export class BehaviorAnalyticsService {
  // Analysis window in milliseconds
  private analysisWindowMs: number;
  private store: AdaptiveAnalyticsStore;

  constructor(analysisWindowMs = DEFAULT_ANALYSIS_WINDOW_MS) {
    this.analysisWindowMs = analysisWindowMs;
    this.store = analyticsStore;
  }

  /**
   * Calculate baseline for a specific metric for a user
   */
  private async calculateBaselineForMetric(userId: string, metric: string): Promise<{baseline: number, stdDev: number}> {
    // Get all relevant log entries for this metric and user
    const startTime = Date.now() - this.analysisWindowMs;
    let dataPoints: BehaviorMetric[] = [];
    
    switch(metric) {
      case 'login_frequency':
        // Get login events
        const loginLogs = await db.select({
          timestamp: activityLogs.createdAt,
        })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.userId, userId),
            // Use generic login event pattern matching since the exact key may vary
            sql`${activityLogs.type} LIKE '%login%'`,
            gte(activityLogs.createdAt, new Date(startTime))
          )
        )
        .orderBy(desc(activityLogs.createdAt));
        
        // Convert to metrics format
        dataPoints = loginLogs.map(log => ({
          name: 'login_frequency',
          value: 1, // Each login counts as 1
          timestamp: log.timestamp ? log.timestamp.getTime() : Date.now()
        }));
        
        // Group by day and count logins per day
        const loginsByDay = this.groupMetricsByDay(dataPoints);
        const dailyLoginCounts = Object.values(loginsByDay).map(day => day.length);
        
        // Calculate average daily logins
        const avgDailyLogins = dailyLoginCounts.reduce((sum, count) => sum + count, 0) / dailyLoginCounts.length || 0;
        const stdDev = this.calculateStandardDeviation(dailyLoginCounts);
        
        return { baseline: avgDailyLogins, stdDev };
        
      case 'session_duration':
        // This would require session start/end tracking
        // For now return placeholder implementation
        return { baseline: 30, stdDev: 15 }; // 30 minutes average session with 15 min std dev
        
      case 'resource_access_rate':
        // Calculate how many resources accessed per session
        const resourceLogs = await db.select({
          timestamp: activityLogs.createdAt,
          type: activityLogs.type,
        })
        .from(activityLogs)
        .where(
          and(
            eq(activityLogs.userId, userId),
            gte(activityLogs.createdAt, new Date(startTime))
          )
        )
        .orderBy(desc(activityLogs.createdAt));
        
        // Convert to metrics
        const resourceCount = resourceLogs.length;
        // Simplistic approach - access rate per day
        const daysSinceStart = this.analysisWindowMs / (24 * 60 * 60 * 1000);
        const accessRate = resourceCount / daysSinceStart;
        
        // Here we would ideally calculate per session but need more session tracking
        return { baseline: accessRate, stdDev: accessRate * 0.3 }; // Assuming 30% variation
        
      default:
        return { baseline: 0, stdDev: 0 };
    }
  }
  
  /**
   * Update baseline for a specific user and metric
   */
  async updateBaseline(userId: string, metric: string): Promise<void> {
    try {
      const { baseline, stdDev } = await this.calculateBaselineForMetric(userId, metric);
      
      // Get existing baseline if any
      const oldBaseline = await this.store.getBaselineForMetric(userId, metric);
      
      const now = Date.now();
      
      if (oldBaseline) {
        // Update existing baseline with weighted average
        const oldWeight = 0.7; // Give 70% weight to historic data
        const newWeight = 0.3; // Give 30% weight to new calculation
        
        const weightedBaseline = (oldBaseline.value * oldWeight) + (baseline * newWeight);
        const weightedStdDev = (oldBaseline.standardDeviation || stdDev) * oldWeight + stdDev * newWeight;
        const newSampleSize = oldBaseline.sampleSize + 1;
        
        await this.store.upsertBaseline({
          userId,
          metric,
          value: weightedBaseline,
          standardDeviation: weightedStdDev,
          lastUpdated: now,
          sampleSize: newSampleSize
        });
      } else {
        // Insert new baseline
        await this.store.upsertBaseline({
          userId,
          metric,
          value: baseline,
          standardDeviation: stdDev,
          lastUpdated: now,
          sampleSize: 1
        });
      }
      
    } catch (error) {
      console.error(`Failed to update baseline for user ${userId}, metric ${metric}:`, error);
      auditLogger.error(AdaptiveEvents.BaselineUpdateFailed, 
        `Failed to update behavior baseline for ${metric}`,
        { userId, metric, error: error instanceof Error ? error.message : String(error) }
      ).catch(() => {});
    }
  }
  
  /**
   * Update geographic access patterns for a user
   */
  async updateGeographicPatterns(userId: string, ipAddress: string): Promise<void> {
    try {
      if (!ipAddress || ipAddress === 'unknown') return;
      
      // Extract IP prefix (first 3 octets)
      const ipParts = ipAddress.split('.');
      if (ipParts.length !== 4) return;
      
      const ipPrefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
      const now = Date.now();
      
      // Check if this prefix exists for this user
      const existing = await this.store.getGeoPattern(userId, ipPrefix);
      
      if (existing) {
        // Update existing record
        await this.store.upsertGeoPattern({
          ...existing,
          accessCount: existing.accessCount + 1,
          lastAccess: now
        });
      } else {
        // Insert new record
        await this.store.upsertGeoPattern({
          userId,
          ipPrefix,
          accessCount: 1,
          lastAccess: now,
          firstSeen: now
        });
        
        // Check if this is an anomaly (first time seen this IP prefix)
        const commonLocations = await this.store.getGeoPatterns(userId);
        
        // If user already has established locations and this is a new one, flag it
        if (commonLocations.length > 1) {
          await this.detectAnomalousAccess(userId, ipPrefix, now);
        }
      }
    } catch (error) {
      console.error(`Failed to update geographic patterns for user ${userId}:`, error);
    }
  }
  
  /**
   * Detect if an access from an IP prefix is anomalous
   */
  private async detectAnomalousAccess(userId: string, ipPrefix: string, timestamp: number): Promise<void> {
    try {
      // Get user's common locations
      const commonLocations = await this.store.getGeoPatterns(userId);
      
      // If this is first location or one of top 3 common locations, not anomalous
      const isCommon = commonLocations.slice(0, 3).some(loc => loc.ipPrefix === ipPrefix);
      if (isCommon || commonLocations.length <= 1) return;
      
      // Calculate anomaly severity based on how established the user's pattern is
      // and how rare this location is
      const totalAccess = commonLocations.reduce((sum, loc) => sum + loc.accessCount, 0);
      const thisLocationAccess = commonLocations.find(loc => loc.ipPrefix === ipPrefix)?.accessCount || 1;
      const locationRarity = 1 - (thisLocationAccess / totalAccess);
      
      // Higher severity if user has more established patterns
      let severity = locationRarity;
      if (commonLocations.length >= 5 || totalAccess > 50) {
        severity *= 1.5; // Increase severity for well-established users
      }
      
      // Cap severity at 1.0
      severity = Math.min(severity, 1.0);
      
      // Only record if severity is significant
      if (severity > 0.7) {
        await this.store.addAnomaly({
          userId,
          eventType: 'geographic_access',
          severity,
          timestamp,
          metric: 'ip_prefix',
          observed: 1, // Observed this IP
          expected: 0, // Expected established IPs
          details: JSON.stringify({
            ipPrefix,
            commonLocations: commonLocations.slice(0, 3).map(loc => loc.ipPrefix)
          })
        });
        
        // Log this anomaly
        auditLogger.warning(AdaptiveEvents.AnomalyDetected, 
          `Unusual geographic access detected for user ${userId}`,
          { 
            userId, 
            ipPrefix, 
            severity,
            commonLocations: commonLocations.slice(0, 3).map(loc => loc.ipPrefix)
          }
        ).catch(() => {});
      }
    } catch (error) {
      console.error(`Failed to detect anomalous access for user ${userId}:`, error);
    }
  }
  
  /**
   * Update resource access patterns (time-based)
   */
  async updateResourceAccessPattern(resourceType: string, timestamp = Date.now()): Promise<void> {
    try {
      const date = new Date(timestamp);
      const hourOfDay = date.getHours();
      const dayOfWeek = date.getDay();
      
      // Check if record exists
      const existing = await this.store.getResourcePattern(resourceType, hourOfDay, dayOfWeek);
      
      if (existing) {
        // Update existing record
        await this.store.upsertResourcePattern({
          ...existing,
          accessCount: existing.accessCount + 1,
          lastUpdated: timestamp
        });
      } else {
        // Insert new record
        await this.store.upsertResourcePattern({
          resourceType,
          hourOfDay,
          dayOfWeek,
          accessCount: 1,
          lastUpdated: timestamp
        });
      }
    } catch (error) {
      console.error(`Failed to update resource access pattern for ${resourceType}:`, error);
    }
  }
  
  /**
   * Get user behavior profile with baselines and patterns
   */
  async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile> {
    try {
      // Get all baselines for this user
      const baselines = await this.store.getBaselines(userId);
      
      // Get geographic access patterns
      const geoPatterns = await this.store.getGeoPatterns(userId);
      
      // Get recent anomalies
      const recentAnomalies = await this.store.getRecentAnomalies(
        userId, 
        Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
      );
      
      // Calculate overall anomaly score
      const anomalyScore = recentAnomalies.length > 0 
        ? recentAnomalies.reduce((sum, a) => sum + a.severity, 0) / recentAnomalies.length
        : 0;
      
      // Build profile
      const profile: UserBehaviorProfile = {
        userId,
        metrics: {
          lastUpdated: Math.max(...baselines.map(b => b.lastUpdated), 0),
          anomalyScore: anomalyScore > 0 ? anomalyScore : undefined
        },
        geographicAccess: {
          commonLocations: geoPatterns.slice(0, 5).map(p => ({
            ipPrefix: p.ipPrefix,
            accessCount: p.accessCount
          }))
        }
      };
      
      // Add login frequency if available
      const loginFreqBaseline = baselines.find(b => b.metric === 'login_frequency');
      if (loginFreqBaseline) {
        profile.metrics.loginFrequency = {
          dailyAverage: loginFreqBaseline.value,
          weekdayPattern: [0, 0, 0, 0, 0, 0, 0], // Placeholder
          hourPattern: Array(24).fill(0) // Placeholder
        };
      }
      
      // Add session duration if available
      const sessionBaseline = baselines.find(b => b.metric === 'session_duration');
      if (sessionBaseline) {
        profile.metrics.sessionDuration = {
          average: sessionBaseline.value,
          standardDeviation: sessionBaseline.standardDeviation || 0
        };
      }
      
      // Add unusual locations if any
      const unusualLocations = geoPatterns
        .filter(p => p.accessCount === 1 && (Date.now() - p.firstSeen) < (7 * 24 * 60 * 60 * 1000)) // 1-time access in last week
        .map(p => ({
          ipPrefix: p.ipPrefix,
          accessCount: p.accessCount,
          firstSeen: p.firstSeen
        }));
      
      if (unusualLocations.length > 0) {
        profile.geographicAccess!.unusualLocations = unusualLocations;
      }
      
      return profile;
      
    } catch (error) {
      console.error(`Failed to get behavior profile for user ${userId}:`, error);
      return { 
        userId, 
        metrics: {} 
      };
    }
  }

  /**
   * Process an audit log entry to update behavior analytics
   */
  async processAuditLogEntry(entry: any): Promise<void> {
    // Skip if no user associated
    if (!entry.userId) return;
    
    try {
      // Update geographic access pattern
      if (entry.ipAddress) {
        await this.updateGeographicPatterns(entry.userId, entry.ipAddress);
      }
      
      // Update baselines based on event type
      if (entry.type) {
        // Check for login event
        if (entry.type.includes('login')) {
          await this.updateBaseline(entry.userId, 'login_frequency');
        }
        
        // Check for explainability view events
        const explainEvents = ['explain_diff_view', 'explain_full_view', 'explain_history_view'];
        if (explainEvents.includes(entry.type)) {
          // Update resource access pattern
          const resourceType = entry.type === 'explain_diff_view' ? 'diff' : 'full_session';
          await this.updateResourceAccessPattern(resourceType, new Date(entry.createdAt).getTime());
          
          // Update resource access rate
          await this.updateBaseline(entry.userId, 'resource_access_rate');
        }
      }
      
    } catch (error) {
      console.error('Failed to process audit log entry for behavior analytics:', error);
    }
  }
  
  /**
   * Process a batch of recent audit logs to update behavior analytics
   */
  async processRecentLogs(hours = 24): Promise<{processed: number, updated: number}> {
    try {
      const startTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
      
      const logs = await db.select()
        .from(activityLogs)
        .where(gte(activityLogs.createdAt, startTime))
        .orderBy(desc(activityLogs.createdAt));
      
      // Track unique users updated
      const updatedUsers = new Set<string>();
      
      // Process each log
      for (const log of logs) {
        await this.processAuditLogEntry(log);
        if (log.userId) updatedUsers.add(log.userId);
      }
      
      return {
        processed: logs.length,
        updated: updatedUsers.size
      };
    } catch (error) {
      console.error('Failed to process recent logs:', error);
      return { processed: 0, updated: 0 };
    }
  }
  
  // Helper utility methods
  
  /**
   * Group metrics by day for time-based analysis
   */
  private groupMetricsByDay(metrics: BehaviorMetric[]): Record<string, BehaviorMetric[]> {
    const groupedByDay: Record<string, BehaviorMetric[]> = {};
    
    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      const dayKey = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
      
      if (!groupedByDay[dayKey]) {
        groupedByDay[dayKey] = [];
      }
      
      groupedByDay[dayKey].push(metric);
    });
    
    return groupedByDay;
  }
  
  /**
   * Calculate standard deviation for an array of numbers
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length <= 1) return 0;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => {
      const diff = value - avg;
      return diff * diff;
    });
    
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }
}

export const behaviorAnalytics = new BehaviorAnalyticsService();
