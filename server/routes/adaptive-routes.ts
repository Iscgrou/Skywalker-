// R2.3: API routes for adaptive intelligence
import { Router } from "express";
import { behaviorAnalytics } from "../services/behavior-analytics-service";
import { anomalyAnalysis } from "../services/anomaly-analysis-service";
import { systemAutoTuning } from "../services/system-auto-tuning-service";
import { auditLogger } from "../services/audit-logger";
import { rbac } from "../middleware/rbac";

export const adaptiveRoutes = Router();

// Get behavior profile for the current user
adaptiveRoutes.get(
  "/profile",
  async (req, res) => {
    try {
      const userId = req.session?.user?.id?.toString();
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const profile = await behaviorAnalytics.getUserBehaviorProfile(userId);
      
      // Return the behavior profile
      res.json({ success: true, profile });
    } catch (error) {
      console.error("Failed to get behavior profile:", error);
      res.status(500).json({ error: "Failed to retrieve behavior profile" });
    }
  }
);

// Admin endpoint to process recent logs (restricted to admins)
adaptiveRoutes.post(
  "/process-logs",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      const hours = req.body.hours || 24;
      
      // Process recent logs
      const result = await behaviorAnalytics.processRecentLogs(hours);
      
      // Log the action
      await auditLogger.info(
        "adaptive_logs_processed",
        `Processed ${result.processed} logs for ${result.updated} users`,
        { hours, ...result }
      );
      
      res.json({ 
        success: true, 
        processed: result.processed,
        usersUpdated: result.updated
      });
    } catch (error) {
      console.error("Failed to process logs for behavior analytics:", error);
      res.status(500).json({ error: "Failed to process logs" });
    }
  }
);

// Get user anomaly information (admin only)
adaptiveRoutes.get(
  "/anomalies/:userId",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const profile = await behaviorAnalytics.getUserBehaviorProfile(userId);
      
      // Return only the anomaly-related information
      res.json({
        success: true,
        userId,
        anomalyScore: profile.metrics.anomalyScore || 0,
        unusualLocations: profile.geographicAccess?.unusualLocations || []
      });
    } catch (error) {
      console.error(`Failed to get anomalies for user ${req.params.userId}:`, error);
      res.status(500).json({ error: "Failed to retrieve anomaly information" });
    }
  }
);

// Analyze user behavior for anomalies
adaptiveRoutes.post(
  "/analyze/:userId",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN', 'ANALYST'] }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Run AI analysis on user behavior
      const alerts = await anomalyAnalysis.analyzeUserBehavior(userId);
      
      // Return the analysis results
      res.json({
        success: true,
        userId,
        alertCount: alerts.length,
        alerts
      });
    } catch (error) {
      console.error(`Failed to analyze behavior for user ${req.params.userId}:`, error);
      res.status(500).json({ error: "Failed to analyze user behavior" });
    }
  }
);

// Get anomaly alerts with optional filtering
adaptiveRoutes.get(
  "/alerts",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN', 'ANALYST', 'AUDITOR'] }),
  async (req, res) => {
    try {
      // Parse query parameters for filtering
      const { userId, status, severity, type, limit } = req.query;
      
      const alerts = anomalyAnalysis.getAnomalyAlerts({
        userId: userId as string,
        status: status as string,
        severity: severity as any,
        type: type as any,
        limit: limit ? parseInt(limit as string) : undefined
      });
      
      res.json({
        success: true,
        count: alerts.length,
        alerts
      });
    } catch (error) {
      console.error("Failed to get anomaly alerts:", error);
      res.status(500).json({ error: "Failed to retrieve anomaly alerts" });
    }
  }
);

// Update anomaly alert status
adaptiveRoutes.post(
  "/alerts/:alertId",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN', 'ANALYST'] }),
  async (req, res) => {
    try {
      const { alertId } = req.params;
      const { status, resolution } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const updated = anomalyAnalysis.updateAlertStatus(alertId, status, resolution);
      
      if (updated) {
        const alert = anomalyAnalysis.getAlertById(alertId);
        res.json({
          success: true,
          alert
        });
      } else {
        res.status(404).json({ error: "Alert not found" });
      }
    } catch (error) {
      console.error(`Failed to update alert status:`, error);
      res.status(500).json({ error: "Failed to update alert status" });
    }
  }
);

// Auto-tuning API endpoints
// Get all current system parameters
adaptiveRoutes.get(
  "/auto-tuning/parameters",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      const parameters = systemAutoTuning.getAllParameters();
      res.json({
        success: true,
        parameters
      });
    } catch (error) {
      console.error('Error fetching system parameters:', error);
      res.status(500).json({ error: 'Failed to fetch system parameters' });
    }
  }
);

// Get parameters by category
adaptiveRoutes.get(
  "/auto-tuning/parameters/category/:category",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      const { category } = req.params;
      const allParameters = systemAutoTuning.getAllParameters();
      const parameters = allParameters.filter(p => p.category === category);
      
      if (parameters.length === 0) {
        return res.status(404).json({ error: `Category '${category}' not found` });
      }
      
      res.json({
        success: true,
        category,
        parameters
      });
    } catch (error) {
      console.error(`Error fetching parameters for category ${req.params.category}:`, error);
      res.status(500).json({ error: 'Failed to fetch parameters for category' });
    }
  }
);

// Get specific parameter
adaptiveRoutes.get(
  "/auto-tuning/parameters/:paramId",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      const { paramId } = req.params;
      const parameter = systemAutoTuning.getParameter(paramId);
      
      if (parameter) {
        res.json({
          success: true,
          parameter
        });
      } else {
        res.status(404).json({ error: `Parameter ${paramId} not found` });
      }
    } catch (error) {
      console.error(`Error fetching parameter ${req.params.paramId}:`, error);
      res.status(500).json({ error: 'Failed to fetch parameter' });
    }
  }
);

// Update parameter manually (override auto-tuning)
adaptiveRoutes.put(
  "/auto-tuning/parameters/:paramId",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      const { paramId } = req.params;
      const { value, autoTuneEnabled } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ error: 'Parameter value is required' });
      }
      
      // Update parameter value
      const updatedParam = systemAutoTuning.updateParameterValue(paramId, value, false);
      
      // Update auto-tune setting if provided
      if (autoTuneEnabled !== undefined && updatedParam) {
        systemAutoTuning.setAutoTuneEnabled(paramId, autoTuneEnabled);
      }
      
      if (updatedParam) {
        await auditLogger.info(
          "system_parameter_updated",
          `System parameter ${paramId} updated manually`,
          { paramId, newValue: value, autoTuneEnabled, updatedBy: req.session?.user?.id }
        );
        
        res.json({
          success: true,
          message: `Parameter ${paramId} updated successfully`,
          parameter: updatedParam
        });
      } else {
        res.status(404).json({ error: `Parameter ${paramId} not found` });
      }
    } catch (error) {
      console.error(`Error updating parameter ${req.params.paramId}:`, error);
      res.status(500).json({ error: 'Failed to update parameter' });
    }
  }
);

// Trigger auto-tuning for all parameters
adaptiveRoutes.post(
  "/auto-tuning/tune",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      const tuningResults = await systemAutoTuning.autoTuneParameters();
      
      await auditLogger.info(
        "system_auto_tuning",
        'System-wide auto-tuning performed',
        { 
          results: tuningResults,
          triggeredBy: req.session?.user?.id || 'system'
        }
      );
      
      res.json({
        success: true,
        message: 'Auto-tuning completed successfully',
        results: tuningResults
      });
    } catch (error) {
      console.error('Error during auto-tuning:', error);
      res.status(500).json({ error: 'Auto-tuning process failed' });
    }
  }
);

// Get auto-tuning metrics by category
adaptiveRoutes.get(
  "/auto-tuning/metrics",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN', 'ANALYST', 'AUDITOR'] }),
  async (req, res) => {
    try {
      const metrics = systemAutoTuning.getCategoryMetrics();
      
      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      console.error('Error fetching auto-tuning metrics:', error);
      res.status(500).json({ error: 'Failed to fetch auto-tuning metrics' });
    }
  }
);

// Initialize default parameters (admin only)
adaptiveRoutes.post(
  "/auto-tuning/initialize",
  rbac({ allowRoles: ['ADMIN', 'SUPER_ADMIN'] }),
  async (req, res) => {
    try {
      // Reinitialize the auto-tuning service by creating a new instance
      const newService = new SystemAutoTuningService();
      
      // We can't directly replace the exported singleton, but we can get all parameters
      const defaultParams = newService.getAllParameters();
      
      // Update each parameter in our actual service
      for (const param of defaultParams) {
        systemAutoTuning.setParameter({
          ...param,
          lastModified: Date.now()
        });
      }
      
      await auditLogger.info(
        "system_parameters_reset",
        'System parameters reset to defaults',
        { triggeredBy: req.session?.user?.id }
      );
      
      res.json({
        success: true,
        message: 'All parameters reset to default values',
        parameterCount: defaultParams.length
      });
    } catch (error) {
      console.error('Error resetting parameters:', error);
      res.status(500).json({ error: 'Failed to reset parameters' });
    }
  }
);
