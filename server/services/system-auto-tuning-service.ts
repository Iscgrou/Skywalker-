// R2.5: System Auto-Tuning Service
// Uses behavior analytics to auto-tune system parameters for optimal performance
import { auditLogger } from "./audit-logger";

// Parameter definition with constraints
export interface SystemParameter {
  id: string;
  name: string;
  description: string;
  currentValue: number;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  unit: string;
  category: 'performance' | 'security' | 'resource' | 'feature';
  autoTuneEnabled: boolean;
  lastModified: number;
  lastAutoTuned?: number;
  tuningMetric?: string;
}

export class SystemAutoTuningService {
  // In-memory storage for system parameters
  private parameters: Map<string, SystemParameter> = new Map();
  
  constructor() {
    // Initialize with default system parameters
    this.initializeDefaultParameters();
  }
  
  /**
   * Initialize default system parameters
   */
  private initializeDefaultParameters(): void {
    // Cache and performance parameters
    this.setParameter({
      id: 'cache.ttl.diff',
      name: 'Diff Cache TTL',
      description: 'Time-to-live for diff operation cache entries in seconds',
      currentValue: 3600,
      defaultValue: 3600, // 1 hour
      minValue: 300, // 5 minutes
      maxValue: 86400, // 24 hours
      unit: 'seconds',
      category: 'performance',
      autoTuneEnabled: true,
      lastModified: Date.now(),
      tuningMetric: 'cache_hit_ratio'
    });
    
    this.setParameter({
      id: 'cache.max_size',
      name: 'Cache Max Size',
      description: 'Maximum number of entries in the cache',
      currentValue: 1000,
      defaultValue: 1000,
      minValue: 100,
      maxValue: 10000,
      unit: 'entries',
      category: 'resource',
      autoTuneEnabled: true,
      lastModified: Date.now(),
      tuningMetric: 'memory_usage'
    });
    
    // Rate limiting parameters
    this.setParameter({
      id: 'rate_limit.diff',
      name: 'Diff Rate Limit',
      description: 'Maximum diff operations per minute',
      currentValue: 60,
      defaultValue: 60, // 1 per second
      minValue: 10,
      maxValue: 600,
      unit: 'ops/min',
      category: 'performance',
      autoTuneEnabled: true,
      lastModified: Date.now(),
      tuningMetric: 'system_load'
    });
    
    // Security parameters
    this.setParameter({
      id: 'security.session_timeout',
      name: 'Session Timeout',
      description: 'Session timeout in minutes',
      currentValue: 30,
      defaultValue: 30,
      minValue: 5,
      maxValue: 240,
      unit: 'minutes',
      category: 'security',
      autoTuneEnabled: false, // Security parameters disabled by default
      lastModified: Date.now()
    });
    
    this.setParameter({
      id: 'security.anomaly_threshold',
      name: 'Anomaly Detection Threshold',
      description: 'Threshold for anomaly detection (0-1)',
      currentValue: 0.7,
      defaultValue: 0.7,
      minValue: 0.5,
      maxValue: 0.95,
      unit: 'score',
      category: 'security',
      autoTuneEnabled: true,
      lastModified: Date.now(),
      tuningMetric: 'false_positive_rate'
    });
  }
  
  /**
   * Get all system parameters
   */
  getAllParameters(): SystemParameter[] {
    return Array.from(this.parameters.values());
  }
  
  /**
   * Get a specific parameter by ID
   */
  getParameter(id: string): SystemParameter | undefined {
    return this.parameters.get(id);
  }
  
  /**
   * Update or create a parameter
   */
  setParameter(param: SystemParameter): SystemParameter {
    this.parameters.set(param.id, param);
    return param;
  }
  
  /**
   * Update a parameter's current value
   */
  updateParameterValue(id: string, value: number, isAutoTuned = false): SystemParameter | undefined {
    const param = this.parameters.get(id);
    if (!param) return undefined;
    
    // Ensure value is within constraints
    const constrainedValue = Math.min(Math.max(value, param.minValue), param.maxValue);
    
    // Update the parameter
    param.currentValue = constrainedValue;
    param.lastModified = Date.now();
    
    if (isAutoTuned) {
      param.lastAutoTuned = Date.now();
    }
    
    // Log the update
    auditLogger.info(
      isAutoTuned ? 'adaptive_parameter_autotuned' : 'parameter_updated',
      `Parameter ${param.name} ${isAutoTuned ? 'auto-tuned' : 'updated'} to ${constrainedValue} ${param.unit}`,
      { 
        parameterId: id, 
        value: constrainedValue, 
        previousValue: param.currentValue,
        isAutoTuned 
      }
    ).catch(() => {});
    
    return param;
  }
  
  /**
   * Enable or disable auto-tuning for a parameter
   */
  setAutoTuneEnabled(id: string, enabled: boolean): SystemParameter | undefined {
    const param = this.parameters.get(id);
    if (!param) return undefined;
    
    param.autoTuneEnabled = enabled;
    param.lastModified = Date.now();
    
    return param;
  }
  
  /**
   * Auto-tune parameters based on metrics
   */
  async autoTuneParameters(): Promise<{ tuned: number, parameters: string[] }> {
    const tunedParams: string[] = [];
    
    // Get auto-tune enabled parameters
    const autoTuneParams = Array.from(this.parameters.values())
      .filter(p => p.autoTuneEnabled);
    
    for (const param of autoTuneParams) {
      try {
        // In a real implementation, we would analyze metrics and tune accordingly
        // For now, just use a simple algorithm as a placeholder
        
        // Mock metrics-based tuning
        let newValue = param.currentValue;
        
        if (param.id === 'cache.ttl.diff') {
          // Simulate tuning cache TTL based on hit ratio
          // Higher hit ratio -> longer TTL
          const hitRatio = Math.random(); // In real impl, get from metrics
          if (hitRatio > 0.8) {
            // High hit ratio, increase TTL
            newValue = Math.min(param.currentValue * 1.2, param.maxValue);
          } else if (hitRatio < 0.4) {
            // Low hit ratio, decrease TTL
            newValue = Math.max(param.currentValue * 0.8, param.minValue);
          }
        } else if (param.id === 'rate_limit.diff') {
          // Simulate tuning rate limit based on system load
          // Higher load -> lower rate limit
          const systemLoad = Math.random() * 100; // In real impl, get from metrics
          if (systemLoad > 70) {
            // High load, decrease rate limit
            newValue = Math.max(param.currentValue * 0.8, param.minValue);
          } else if (systemLoad < 30) {
            // Low load, increase rate limit
            newValue = Math.min(param.currentValue * 1.2, param.maxValue);
          }
        }
        
        // Only update if value changed
        if (newValue !== param.currentValue) {
          this.updateParameterValue(param.id, newValue, true);
          tunedParams.push(param.id);
        }
      } catch (error) {
        console.error(`Failed to auto-tune parameter ${param.id}:`, error);
      }
    }
    
    return {
      tuned: tunedParams.length,
      parameters: tunedParams
    };
  }
  
  /**
   * Get category metrics for dashboard visualization
   */
  getCategoryMetrics(): Record<string, { count: number, autoTuned: number }> {
    const metrics: Record<string, { count: number, autoTuned: number }> = {
      performance: { count: 0, autoTuned: 0 },
      security: { count: 0, autoTuned: 0 },
      resource: { count: 0, autoTuned: 0 },
      feature: { count: 0, autoTuned: 0 }
    };
    
    for (const param of this.parameters.values()) {
      metrics[param.category].count++;
      if (param.autoTuneEnabled) {
        metrics[param.category].autoTuned++;
      }
    }
    
    return metrics;
  }
}

export const systemAutoTuning = new SystemAutoTuningService();
