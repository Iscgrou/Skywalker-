// R2.4: AI Anomaly Analysis Service
// Uses behavior analytics to detect and analyze security anomalies
import { behaviorAnalytics } from "./behavior-analytics-service";
import { auditLogger } from "./audit-logger";

// Define anomaly severity levels
export enum AnomalySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Define anomaly types
export enum AnomalyType {
  GEOGRAPHIC = 'geographic_anomaly',
  SESSION = 'session_anomaly',
  RESOURCE_ACCESS = 'resource_access_anomaly',
  PATTERN_DEVIATION = 'pattern_deviation'
}

// Anomaly alert structure
export interface AnomalyAlert {
  id: string;
  userId: string;
  timestamp: number;
  type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number; // 0-1 score
  description: string;
  details: Record<string, any>;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  resolution?: string;
  assignedTo?: string;
}

export class AnomalyAnalysisService {
  // In-memory storage for anomaly alerts
  private anomalyAlerts: Map<string, AnomalyAlert> = new Map();
  private nextAlertId: number = 1;
  
  /**
   * Generate a unique ID for an anomaly alert
   */
  private generateAlertId(): string {
    return `ANM-${Date.now().toString(36)}-${(this.nextAlertId++).toString(36).toUpperCase()}`;
  }
  
  /**
   * Analyze a user's behavior profile for anomalies
   */
  async analyzeUserBehavior(userId: string): Promise<AnomalyAlert[]> {
    try {
      const alerts: AnomalyAlert[] = [];
      
      // Get user behavior profile
      const profile = await behaviorAnalytics.getUserBehaviorProfile(userId);
      
      // Check for geographic anomalies
      if (profile.geographicAccess?.unusualLocations && profile.geographicAccess.unusualLocations.length > 0) {
        for (const location of profile.geographicAccess.unusualLocations) {
          const alert: AnomalyAlert = {
            id: this.generateAlertId(),
            userId,
            timestamp: Date.now(),
            type: AnomalyType.GEOGRAPHIC,
            severity: AnomalySeverity.MEDIUM, // Default severity
            confidence: 0.8,
            description: `Unusual access from IP prefix ${location.ipPrefix}`,
            details: {
              ipPrefix: location.ipPrefix,
              firstSeen: new Date(location.firstSeen).toISOString(),
              commonLocations: profile.geographicAccess.commonLocations.slice(0, 3).map(l => l.ipPrefix)
            },
            status: 'new'
          };
          
          // Adjust severity based on risk factors
          if (profile.metrics.anomalyScore && profile.metrics.anomalyScore > 0.7) {
            alert.severity = AnomalySeverity.HIGH;
          }
          
          // Store and return the alert
          this.anomalyAlerts.set(alert.id, alert);
          alerts.push(alert);
          
          // Log the anomaly
          auditLogger.warning(
            'adaptive_anomaly_detected',
            `AI analysis detected unusual geographic access for user ${userId}`,
            { userId, alertId: alert.id, severity: alert.severity, ipPrefix: location.ipPrefix }
          ).catch(() => {});
        }
      }
      
      // Additional anomaly detection logic can be added here
      // For example, check for unusual resource access patterns
      // or unusual timing patterns
      
      return alerts;
    } catch (error) {
      console.error(`Failed to analyze behavior for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Scan all users for anomalies
   * @param recentHours Only scan users active in the last N hours
   */
  async scanForAnomalies(recentHours = 24): Promise<{ scanned: number, alerts: number }> {
    // In a real implementation, this would fetch active users from the database
    // For now, just return a placeholder result
    return { scanned: 0, alerts: 0 };
  }
  
  /**
   * Get all anomaly alerts, optionally filtered
   */
  getAnomalyAlerts(options?: { 
    userId?: string,
    status?: string,
    severity?: AnomalySeverity,
    type?: AnomalyType,
    limit?: number 
  }): AnomalyAlert[] {
    let alerts = Array.from(this.anomalyAlerts.values());
    
    // Apply filters if provided
    if (options) {
      if (options.userId) {
        alerts = alerts.filter(a => a.userId === options.userId);
      }
      
      if (options.status) {
        alerts = alerts.filter(a => a.status === options.status);
      }
      
      if (options.severity) {
        alerts = alerts.filter(a => a.severity === options.severity);
      }
      
      if (options.type) {
        alerts = alerts.filter(a => a.type === options.type);
      }
    }
    
    // Sort by timestamp descending (newest first)
    alerts.sort((a, b) => b.timestamp - a.timestamp);
    
    // Apply limit if provided
    if (options?.limit && options.limit > 0) {
      alerts = alerts.slice(0, options.limit);
    }
    
    return alerts;
  }
  
  /**
   * Update the status of an anomaly alert
   */
  updateAlertStatus(alertId: string, status: AnomalyAlert['status'], resolution?: string): boolean {
    const alert = this.anomalyAlerts.get(alertId);
    if (!alert) return false;
    
    alert.status = status;
    if (resolution) {
      alert.resolution = resolution;
    }
    
    // Log the status change
    auditLogger.info(
      'adaptive_anomaly_updated',
      `Anomaly alert ${alertId} updated to status: ${status}`,
      { alertId, userId: alert.userId, status, resolution }
    ).catch(() => {});
    
    return true;
  }
  
  /**
   * Get a specific anomaly alert by ID
   */
  getAlertById(alertId: string): AnomalyAlert | undefined {
    return this.anomalyAlerts.get(alertId);
  }
  
  /**
   * Initialize the anomaly analysis service
   * This method ensures the service is properly set up with initial state
   */
  async initialize(): Promise<{ success: boolean; alertCount: number }> {
    // In a real implementation, this would load historical alerts from storage
    // For now, we'll just return the current state
    
    // Simulate loading historical data
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      alertCount: this.anomalyAlerts.size
    };
  }
}

export const anomalyAnalysis = new AnomalyAnalysisService();
