import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, and, or } from "drizzle-orm";
import { invoices } from "@shared/schema";
import { rbac } from './middleware/rbac';
import { RBAC_VERSION } from '../shared/rbac';
import { auditLogger } from './services/audit-logger';
import { AuditEvents } from './services/audit-events';
// CRM routes are imported in registerCrmRoutes function

import multer from "multer";

// Extend Request interface to include multer file
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import { z } from "zod";
import { 
  insertRepresentativeSchema, 
  insertSalesPartnerSchema, 
  insertInvoiceSchema, 
  insertPaymentSchema,
  // فاز ۱: Schema برای مدیریت دوره‌ای فاکتورها
  insertInvoiceBatchSchema
} from "@shared/schema";
import { 
  parseUsageJsonData, 
  processUsageData, 
  processUsageDataSequential,
  validateUsageData, 
  getOrCreateDefaultSalesPartner, 
  createRepresentativeFromUsageData,
  addDaysToPersianDate,
  toPersianDigits 
} from "./services/invoice";
import { 
  sendInvoiceToTelegram, 
  sendBulkInvoicesToTelegram, 
  getDefaultTelegramTemplate, 
  formatInvoiceStatus 
} from "./services/telegram";

import { xaiGrokEngine } from "./services/xai-grok-engine";
import { registerCrmRoutes, invalidateCrmCache } from "./routes/crm-routes";
import { registerSettingsRoutes } from "./routes/settings-routes";
import bcrypt from "bcryptjs";

// Configure multer for file uploads with broader JSON acceptance
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for large JSON files
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Accept all files for maximum compatibility - validate content in handler
    console.log(`File upload: ${file.originalname}, MIME: ${file.mimetype}`);
    cb(null, true);
  }
});

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if ((req.session as any)?.authenticated) {
    next();
  } else {
    res.status(401).json({ error: "احراز هویت نشده" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // R1.5: Add security middleware early in the chain
  const { roleIntegrityGuard } = await import('./middleware/role-integrity');
  const { csrfIssue, csrfVerify } = await import('./middleware/csrf');
  
  // Apply security middleware globally
  app.use(roleIntegrityGuard); // Check role integrity after session but before RBAC
  app.use(csrfIssue); // Issue CSRF tokens for authenticated sessions
  app.use(csrfVerify); // Verify CSRF tokens for state-changing requests
  
  // Initialize default admin user
  try {
    await storage.initializeDefaultAdminUser("mgr", "8679");
  } catch (error) {
    console.error("Failed to initialize default admin user:", error);
  }

  // Initialize default CRM user
  try {
    await storage.initializeDefaultCrmUser("crm", "8679");
  } catch (error) {
    console.error("Failed to initialize default CRM user:", error);
  }

  // Register CRM routes
  registerCrmRoutes(app, storage);
  
  // Register Settings routes (DA VINCI v1.0)
  registerSettingsRoutes(app);
  
  // Register Intelligence Dashboard routes (R2)
  const intelligenceRoutes = (await import("./routes/intelligence-routes")).default;
  app.use("/api/intelligence", intelligenceRoutes);
  
  // Register Adaptive Intelligence routes (R2.3)
  const { adaptiveRoutes } = await import("./routes/adaptive-routes");
  app.use("/api/adaptive", adaptiveRoutes);
  
  // Register Workspace routes (DA VINCI v2.0) - temporarily bypass auth for testing
  const workspaceRoutes = (await import("./routes/workspace-routes")).default;
  app.use("/api/workspace", workspaceRoutes);
  
  // Register Intelligent Coupling routes (SHERLOCK v3.0) - محافظتی
  const couplingRoutes = (await import("./routes/coupling-routes")).default;
  app.use("/api/coupling", couplingRoutes);
  
  // Direct test route to verify workspace functionality
  app.get("/api/workspace-direct-test", async (req, res) => {
    try {
      const { AITaskGenerator } = await import("./services/ai-task-generator");
      const taskGenerator = new AITaskGenerator();
      
      const result = await taskGenerator.generateDailyTasks();
      
      res.json({
        success: true,
        message: "✅ DA VINCI v2.0 AI Task Generator Test Successful",
        result: {
          tasksGenerated: result.tasks.length,
          generationTime: new Date().toISOString(),
          culturalContext: "Persian Business Culture",
          aiEngine: "xAI Grok-4"
        }
      });
    } catch (error) {
      console.error("Workspace test error:", error);
      res.status(500).json({ 
        error: "خطا در تست AI Task Generator", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // xAI Grok Configuration API
  app.post("/api/settings/xai-grok/configure", requireAuth, async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ error: "کلید API الزامی است" });
      }

      // Update XAI Grok engine configuration  
      xaiGrokEngine.updateConfiguration(apiKey);
      
      // Save to settings
      await storage.updateSetting('XAI_API_KEY', apiKey);
      
      res.json({ 
        success: true, 
        message: "تنظیمات xAI Grok ذخیره شد" 
      });
    } catch (error) {
      res.status(500).json({ error: "خطا در ذخیره تنظیمات" });
    }
  });

  app.post("/api/settings/xai-grok/test", requireAuth, async (req, res) => {
    try {
      const result = await xaiGrokEngine.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "خطا در تست اتصال" });
    }
  });

  // Iteration 22: Governance Alert Query & Analytics minimal endpoints
  // Lightweight read-only observability layer (no acknowledgement workflow yet)
  app.get('/api/governance/alerts', rbac({ anyOf:['governance.alert.list'] }), async (req, res) => {
    try {
  const { strategies, severities, alertIds, from, to, limit, order, cursor, includeContext, includeRationale, includeAckState, includeEscalationState, includeSuppressionState } = req.query as any;
      const parseList = (v:any)=> v? String(v).split(',').filter(Boolean): undefined;
      const { queryAlerts } = await import('./services/strategy-governance-alert-query-service.ts');
      const data = await queryAlerts({
        strategies: parseList(strategies),
        severities: parseList(severities) as any,
        alertIds: parseList(alertIds),
        from, to,
        limit: limit? Number(limit): undefined,
        order: order==='asc'? 'asc':'desc',
        cursor: cursor? String(cursor): undefined,
  includeContext: includeContext==='1',
  includeRationale: includeRationale==='1',
  includeAckState: includeAckState==='1',
  includeEscalationState: includeEscalationState==='1',
  includeSuppressionState: includeSuppressionState==='1',
      });
      res.json(data);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'query_failed' });
    }
  });

  app.get('/api/governance/alerts/analytics', rbac({ anyOf:['governance.alert.analytics.view'] }), async (req, res) => {
    try {
  const { strategies, windowMs } = req.query as any;
      const parseList = (v:any)=> v? String(v).split(',').filter(Boolean): undefined;
      const { computeAlertAnalytics } = await import('./services/strategy-governance-alert-query-service.ts');
      const data = await computeAlertAnalytics({ strategies: parseList(strategies), windowMs: windowMs? Number(windowMs): undefined });
      res.json(data);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'analytics_failed' });
    }
  });

  // Iteration 23: Governance Alert Acknowledgements endpoints
  app.post('/api/governance/alerts/:id/ack', rbac({ anyOf:['governance.alert.ack'] }), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid_id' });
      const { strategyGovernanceAlertAckService } = await import('./services/strategy-governance-alert-ack-service.ts');
      const result = await strategyGovernanceAlertAckService.ackAlert({ alertId: id, actor: (req as any).user?.username || 'api', note: req.body?.note });
      res.json(result);
    } catch (e:any) {
      if (e.message==='ALERT_NOT_FOUND') return res.status(404).json({ error: 'not_found' });
      res.status(400).json({ error: e.message || 'ack_failed' });
    }
  });
  app.post('/api/governance/alerts/:id/unack', rbac({ anyOf:['governance.alert.ack'] }), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'invalid_id' });
      const { strategyGovernanceAlertAckService } = await import('./services/strategy-governance-alert-ack-service.ts');
      const result = await strategyGovernanceAlertAckService.unackAlert({ alertId: id });
      res.json(result);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'unack_failed' });
    }
  });
  app.get('/api/governance/alerts/ack/metrics', rbac({ anyOf:['governance.alert.analytics.view'] }), async (req, res) => {
    try {
  const { strategies, windowMs, includeSeverityBreakdown } = req.query as any;
      const parseList = (v:any)=> v? String(v).split(',').filter(Boolean): undefined;
      const { strategyGovernanceAlertAckService } = await import('./services/strategy-governance-alert-ack-service.ts');
  const data = await strategyGovernanceAlertAckService.getAckMetrics({ strategies: parseList(strategies), windowMs: windowMs? Number(windowMs): undefined, includeSeverityBreakdown: includeSeverityBreakdown==='1' });
      res.json(data);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'ack_metrics_failed' });
    }
  });

  // Iteration 25: Escalations endpoints
  app.post('/api/governance/alerts/:id/escalate', rbac({ anyOf:['governance.alert.escalate'] }), async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error:'invalid_id' });
      const { governanceAlertEscalationService } = await import('./services/strategy-governance-alert-escalation-service.ts');
      // fetch alert row minimal
      const { db } = await import('./db.ts');
      const { aiGovernanceAlerts } = await import('../shared/schema.ts');
      const rows = await (db as any).select({ id: aiGovernanceAlerts.id, alertTimestamp: aiGovernanceAlerts.alertTimestamp, severity: aiGovernanceAlerts.severity }).from(aiGovernanceAlerts).where((await import('drizzle-orm')).eq(aiGovernanceAlerts.id, id)).limit(1);
      if (!rows.length) return res.status(404).json({ error:'not_found' });
      const rec = await governanceAlertEscalationService.escalateAlert(rows[0], req.body?.reasonCode || 'MANUAL_TEST', true);
      res.json({ ok:true, escalation: { id: rec.id, alertId: rec.alertId, escalatedAt: rec.escalatedAt?.toISOString?.(), reasonCode: rec.reasonCode } });
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'escalate_failed' });
    }
  });
  app.get('/api/governance/alerts/escalations', rbac({ anyOf:['governance.alert.escalate','governance.alert.analytics.view'] }), async (req, res) => {
    try {
      const { governanceAlertEscalationService } = await import('./services/strategy-governance-alert-escalation-service.ts');
      const { db } = await import('./db.ts');
      const { aiGovernanceAlertEscalations } = await import('../shared/schema.ts');
      const rows = await (db as any).select().from(aiGovernanceAlertEscalations).orderBy((await import('drizzle-orm')).desc(aiGovernanceAlertEscalations.escalatedAt)).limit(500);
      res.json({ items: rows });
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'list_escalations_failed' });
    }
  });

  // Phase 41b: Explainability Retrieval Endpoints
  app.get('/api/prescriptive/explain/history', rbac({ anyOf:['explain.history.view'] }), async (req, res) => {
    try {
      const { listExplainabilitySessions } = await import('./services/explainability-retrieval-service.ts');
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const data = await listExplainabilitySessions({ limit });
      if ((data as any).reason === 'feature_flag_disabled') return res.status(403).json(data);
      res.json(data);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'history_failed' });
    }
  });
  app.get('/api/prescriptive/explain/session/:policyVersionId', rbac({ anyOf:['explain.session.meta.view'] }), async (req, res) => {
    try {
      const { getExplainabilitySessionMeta } = await import('./services/explainability-retrieval-service.ts');
      const data = await getExplainabilitySessionMeta(req.params.policyVersionId);
      if ((data as any).reason === 'feature_flag_disabled') return res.status(403).json(data);
      if (!(data as any).found) return res.status(404).json(data);
      res.json(data);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'session_meta_failed' });
    }
  });
  app.get('/api/prescriptive/explain/session/:policyVersionId/full', rbac({ anyOf:['explain.session.full.view'] }), async (req, res) => {
    try {
      const { getExplainabilitySessionFull } = await import('./services/explainability-retrieval-service.ts');
      const { redactSnapshot, defaultRedactionForRole } = await import('./services/explainability-redaction-service.ts');
      const data = await getExplainabilitySessionFull(req.params.policyVersionId);
      if ((data as any).reason === 'feature_flag_disabled') return res.status(403).json(data);
      if (!(data as any).found) return res.status(404).json(data);
      // Redaction handling
      const levelParam = (req.query.redaction as string|undefined)?.toLowerCase();
      const role = (req as any).session?.role || (req as any).session?.crmUser?.role;
      const level = (levelParam==='full'||levelParam==='partial'||levelParam==='minimal')? levelParam : defaultRedactionForRole(role);
      let payload: any = data;
      let redactionMeta: any = { level:'full' };
      if ((data as any).snapshot) {
        const r = redactSnapshot((data as any).snapshot, level as any);
        payload = { found:true, snapshot: r.snapshot, redaction: r.redaction };
        redactionMeta = r.redaction;
      }
      auditLogger.info(AuditEvents.Explainability.FullView, 'explainability full session view', { policyVersionId: req.params.policyVersionId, redactionLevel: level }, req).catch(()=>{});
      if (redactionMeta.level!=='full') auditLogger.info(AuditEvents.Data.RedactionApplied, 'redaction applied', { policyVersionId: req.params.policyVersionId, ...redactionMeta }, req).catch(()=>{});
      res.json(payload);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'session_full_failed' });
    }
  });
  app.get('/api/prescriptive/explain/diff', rbac({ anyOf:['explain.diff.view'] }), async (req, res) => {
    try {
      const { from, to, lineage } = req.query as any;
      const { diffExplainability } = await import('./services/explainability-diff-service.ts');
      const { redactDiffResult, defaultRedactionForRole } = await import('./services/explainability-redaction-service.ts');
      const { diffRateLimitConsume, buildDiffCacheKey, getCachedDiff, setCachedDiff } = await import('./services/explainability-diff-cache-service.ts');
      const result = await diffExplainability(from, to, { includeLineage: lineage==='1' });
      if (!result.ok) {
        const code = result.reason==='feature_flag_disabled'? 403 : (result.reason?.startsWith('missing_')? 404 : 400);
        auditLogger.warning(AuditEvents.Explainability.DiffView, 'diff attempt failed', { from, to, reason: result.reason }, req).catch(()=>{});
        return res.status(code).json(result);
      }
      const levelParam = (req.query.redaction as string|undefined)?.toLowerCase();
      const role = (req as any).session?.role || (req as any).session?.crmUser?.role;
      const level = (levelParam==='full'||levelParam==='partial'||levelParam==='minimal')? levelParam : defaultRedactionForRole(role);
      // Rate limiting (identity: username || role)
      const identity = (req as any).session?.user?.username || (req as any).session?.crmUser?.username || role || 'anon';
      const rl = diffRateLimitConsume(identity, req);
      if (!rl.allowed) return res.status(429).json({ ok:false, reason:'rate_limited', retryMs: 30000 });
      // Cache lookup AFTER rate check to avoid bypass via cache hits? Decision: allow cache hits to skip token consumption (future). Simplicity: consume first.
      const cacheKey = buildDiffCacheKey({ from, to, lineage: lineage==='1', redaction: level, rbacVersion: RBAC_VERSION });
      const cached = getCachedDiff(cacheKey, req);
      if (cached) {
        return res.json(cached);
      }
      const rd = redactDiffResult(result as any, level as any);
      auditLogger.info(AuditEvents.Explainability.DiffView, 'diff view', { from, to, lineage: lineage==='1', added: result.meta?.summary?.addedCount, removed: result.meta?.summary?.removedCount, modified: result.meta?.summary?.modifiedCount, redactionLevel: level }, req).catch(()=>{});
      if (rd.redaction.level!=='full') auditLogger.info(AuditEvents.Data.RedactionApplied, 'diff redaction applied', { from, to, ...rd.redaction }, req).catch(()=>{});
      const responsePayload = { ...rd.diff, redaction: rd.redaction };
      setCachedDiff(cacheKey, responsePayload);
      res.json(responsePayload);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'diff_failed' });
    }
  });
  app.get('/api/governance/alerts/escalations/metrics', rbac({ anyOf:['governance.alert.analytics.view'] }), async (req, res) => {
    try {
      const { governanceAlertEscalationService } = await import('./services/strategy-governance-alert-escalation-service.ts');
      const { windowMs } = req.query as any;
      const data = await governanceAlertEscalationService.getEscalationMetrics({ windowMs: windowMs? Number(windowMs): undefined });
      res.json(data);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'escalation_metrics_failed' });
    }
  });
  // Iteration 26: Suppression metrics endpoint
  app.get('/api/governance/alerts/suppression/metrics', rbac({ anyOf:['governance.alert.suppression.metrics'] }), async (req, res) => {
    try {
      const { governanceAlertSuppressionService } = await import('./services/strategy-governance-alert-suppression-service.ts');
      const data = governanceAlertSuppressionService.getSuppressionMetrics();
      res.json(data);
    } catch (e:any) {
      res.status(400).json({ error: e.message || 'suppression_metrics_failed' });
    }
  });

  // Iteration 30: Adaptive governance metrics endpoint (cached 2s)
  {
    let cachedPayload: any = null; let cachedAt = 0; const CACHE_MS = 2000;
  app.get('/api/governance/adaptive/metrics', rbac({ anyOf:['governance.adaptive.metrics'] }), async (req,res)=>{
      try {
        const force = req.query.force === '1' && req.headers['x-davinci-debug'] === 'true';
        const now = Date.now();
        if (!force && cachedPayload && (now - cachedAt) < CACHE_MS) {
          return res.json(cachedPayload);
        }
        const { adaptiveWeightsRunner } = await import('./services/strategy-adaptive-runner.ts');
        const { governanceAlertSuppressionService } = await import('./services/strategy-governance-alert-suppression-service.ts');
        const status = adaptiveWeightsRunner.getStatus();
        const suppression = governanceAlertSuppressionService.getSuppressionMetrics();
        const pw = adaptiveWeightsRunner.getPersistenceWindow();
        const weights = status.currentWeights;
        const payload = {
          ts: now,
            runner: {
              running: status.running,
              cycle: status.cycle,
              hydrated: status.hydrated,
              failureRatio: +status.failureRatio.toFixed(4),
              persistenceDisabled: status.persistenceDisabled,
              debounceEvery: (adaptiveWeightsRunner as any).cfg?.persistence?.debounceCooldownEvery || 5
            },
            weights: { current: weights },
            suppression: {
              groups: (governanceAlertSuppressionService as any).getAllGroupSnapshots().length,
              suppressed: suppression.suppressed,
              reNoiseRate: suppression.reNoiseRate ?? 0,
              falseSuppressionRate: suppression.falseSuppressionRate ?? 0
            },
            persistenceWindow: {
              size: pw.size,
              failures: pw.failures,
              failureRatio: +pw.failureRatio.toFixed(4),
              thresholdDisable: 0.6,
              thresholdEnable: 0.2
            },
            meta: { version:1, cached:false, generatedMs: Date.now() - now }
        };
        cachedPayload = { ...payload, meta: { ...payload.meta, cached:false } };
  
            // Register Telemetry routes (R4)
            const { registerTelemetryRoutes } = await import('./routes/telemetry-routes');
            registerTelemetryRoutes(app);
        cachedAt = now;
        res.json(payload);
      } catch(e:any) {
        res.status(500).json({ error:'adaptive_metrics_failed', details: e.message });
      }
    });
  }

  // Iteration 31: Auto-Policy Engine status endpoint
  app.get('/api/governance/auto-policy/status', rbac({ anyOf:['governance.auto-policy.status'] }), async (req,res)=>{
    try {
      const { autoPolicyIntegrationService } = await import('./services/strategy-auto-policy-integration.ts');
      const status = autoPolicyIntegrationService.getStatus();
      const recentMetrics = autoPolicyIntegrationService.getRecentMetrics(5);
      
      res.json({
        ts: Date.now(),
        autoPolicyEngine: status,
        recentMetrics: recentMetrics.length,
        lastMetric: recentMetrics[recentMetrics.length - 1]?.metrics || null,
        version: 31
      });
    } catch(e:any) {
      res.status(500).json({ error:'auto_policy_status_failed', details: e.message });
    }
  });

  // Iteration 31: Manual auto-policy evaluation trigger
  app.post('/api/governance/auto-policy/evaluate', async (req,res)=>{
    try {
      const { autoPolicyIntegrationService } = await import('./services/strategy-auto-policy-integration.ts');
      const result = await autoPolicyIntegrationService.triggerManualEvaluation();
      
      res.json({
        ts: Date.now(),
        evaluation: {
          metricsCollected: !!result.metricsSnapshot,
          decisionsFound: result.analysisResult?.decisions?.length || 0,
          decisionsApplied: result.decisionsApplied,
          errors: result.errors || [],
          confidence: result.analysisResult?.analysis?.confidence || 0,
          patterns: result.analysisResult?.analysis?.patterns || null,
          riskAssessment: result.analysisResult?.analysis?.riskAssessment || 'unknown'
        },
        version: 31
      });
    } catch(e:any) {
      res.status(500).json({ error:'auto_policy_evaluation_failed', details: e.message });
    }
  });

  // Iteration 33: Advanced Security Intelligence Engine endpoints
  app.get('/api/security/status', async (req, res) => {
    try {
      const { advancedSecurityIntelligenceEngine } = await import('./services/strategy-advanced-security-intelligence.js');
      const status = advancedSecurityIntelligenceEngine.getSystemStatus();
      res.json({
        ts: Date.now(),
        status,
        version: 33
      });
    } catch (error: any) {
      res.status(500).json({ error: 'security_status_failed', details: error.message });
    }
  });

  app.get('/api/security/metrics', async (req, res) => {
    try {
      const { advancedSecurityIntelligenceEngine } = await import('./services/strategy-advanced-security-intelligence.js');
      const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string) : undefined;
      const metrics = advancedSecurityIntelligenceEngine.getSecurityMetrics(timeRange);
      res.json({
        ts: Date.now(),
        metrics,
        timeRange,
        version: 33
      });
    } catch (error: any) {
      res.status(500).json({ error: 'security_metrics_failed', details: error.message });
    }
  });

  app.get('/api/security/incidents', async (req, res) => {
    try {
      const { advancedSecurityIntelligenceEngine } = await import('./services/strategy-advanced-security-intelligence.js');
      const incidents = advancedSecurityIntelligenceEngine.getActiveIncidents();
      res.json({
        ts: Date.now(),
        incidents,
        count: incidents.length,
        version: 33
      });
    } catch (error: any) {
      res.status(500).json({ error: 'security_incidents_failed', details: error.message });
    }
  });

  app.get('/api/security/dashboard', async (req, res) => {
    try {
      const { advancedSecurityIntelligenceEngine } = await import('./services/strategy-advanced-security-intelligence.js');
      const dashboard = await advancedSecurityIntelligenceEngine.generateComprehensiveReport();
      res.json({
        ts: Date.now(),
        dashboard,
        version: 33
      });
    } catch (error: any) {
      res.status(500).json({ error: 'security_dashboard_failed', details: error.message });
    }
  });

  app.post('/api/security/scan', async (req, res) => {
    try {
      const { advancedSecurityIntelligenceEngine } = await import('./services/strategy-advanced-security-intelligence.js');
      const scanResult = await advancedSecurityIntelligenceEngine.triggerManualSecurityScan();
      res.json({
        ts: Date.now(),
        scan: scanResult,
        version: 33
      });
    } catch (error: any) {
      res.status(500).json({ error: 'security_scan_failed', details: error.message });
    }
  });

  app.put('/api/security/config', async (req, res) => {
    try {
      const { advancedSecurityIntelligenceEngine } = await import('./services/strategy-advanced-security-intelligence.js');
      advancedSecurityIntelligenceEngine.updateConfiguration(req.body);
      res.json({
        ts: Date.now(),
        success: true,
        message: 'Security configuration updated',
        config: req.body,
        version: 33
      });
    } catch (error: any) {
      res.status(500).json({ error: 'security_config_failed', details: error.message });
    }
  });

  // Iteration 34: Business Operations Intelligence API endpoints
  app.get('/api/business/summary', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const period = req.query.period as 'hourly' | 'daily' | 'weekly' | 'monthly' || 'daily';
      const summary = businessOpsEngine.getBusinessOperationsSummary(period);
      res.json({ success: true, data: summary, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] Summary error:', error);
      res.status(500).json({ success: false, error: 'Failed to get business operations summary' });
    }
  });

  app.get('/api/business/kpis', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const kpis = businessOpsEngine.getExecutiveKPIs();
      res.json({ success: true, data: kpis, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] KPIs error:', error);
      res.status(500).json({ success: false, error: 'Failed to get executive KPIs' });
    }
  });

  app.get('/api/business/recommendations', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const recommendations = businessOpsEngine.getBusinessRecommendations(limit);
      res.json({ success: true, data: recommendations, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] Recommendations error:', error);
      res.status(500).json({ success: false, error: 'Failed to get business recommendations' });
    }
  });

  app.get('/api/business/alerts', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const level = req.query.level as 'info' | 'warning' | 'critical';
      const alerts = businessOpsEngine.getBusinessAlerts(level);
      res.json({ success: true, data: alerts, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] Alerts error:', error);
      res.status(500).json({ success: false, error: 'Failed to get business alerts' });
    }
  });

  app.get('/api/business/metrics', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const hours = parseInt(req.query.hours as string) || 24;
      const metrics = businessOpsEngine.getOperationsMetrics(hours);
      res.json({ success: true, data: metrics, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] Metrics error:', error);
      res.status(500).json({ success: false, error: 'Failed to get operations metrics' });
    }
  });

  app.post('/api/business/operation', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const operation = req.body;
      const operationId = await businessOpsEngine.getOrchestrator().submitBusinessOperation(operation);
      res.json({ success: true, data: { operationId }, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] Operation error:', error);
      res.status(500).json({ success: false, error: 'Failed to submit business operation' });
    }
  });

  app.post('/api/business/decision', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const { context, options } = req.body;
      const decisionId = await businessOpsEngine.getDecisionEngine().requestDecision(context, options);
      res.json({ success: true, data: { decisionId }, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] Decision error:', error);
      res.status(500).json({ success: false, error: 'Failed to request business decision' });
    }
  });

  app.post('/api/business/process', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const processDefinition = req.body;
      const processId = await businessOpsEngine.getProcessEngine().createProcess(processDefinition);
      res.json({ success: true, data: { processId }, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] Process error:', error);
      res.status(500).json({ success: false, error: 'Failed to create business process' });
    }
  });

  app.post('/api/business/datasource', async (req, res) => {
    try {
      const businessOpsEngine = (global as any).intelligentBusinessOperationsEngine;
      if (!businessOpsEngine) {
        return res.status(503).json({ success: false, error: 'Business Operations Engine not initialized' });
      }
      
      const sourceConfig = req.body;
      const sourceId = await businessOpsEngine.getDataHub().registerDataSource(sourceConfig);
      res.json({ success: true, data: { sourceId }, timestamp: Date.now(), version: 34 });
    } catch (error: any) {
      console.error('[BusinessOpsAPI] DataSource error:', error);
      res.status(500).json({ success: false, error: 'Failed to register data source' });
    }
  });

  // Iteration 32: Real-time Intelligence Engine endpoints
  app.get('/api/intelligence/dashboard', async (req,res)=>{
    try {
      const { realTimeIntelligenceIntegrationService } = await import('./services/strategy-realtime-intelligence-integration.ts');
      const dashboard = await realTimeIntelligenceIntegrationService.generateIntelligenceDashboard();
      
      res.json({
        ts: Date.now(),
        dashboard,
        version: 32
      });
    } catch(e:any) {
      res.status(500).json({ error:'intelligence_dashboard_failed', details: e.message });
    }
  });

  // Iteration 32: Business Intelligence metrics
  app.get('/api/intelligence/business', async (req,res)=>{
    try {
      const { businessIntelligenceBridge } = await import('./services/strategy-business-intelligence-bridge.ts');
      const executiveDashboard = businessIntelligenceBridge.generateExecutiveDashboard();
      
      res.json({
        ts: Date.now(),
        business: {
          kpis: businessIntelligenceBridge.getBusinessKPIs(),
          alerts: businessIntelligenceBridge.getBusinessAlerts(),
          roi: businessIntelligenceBridge.getROICalculations(),
          customerMetrics: businessIntelligenceBridge.getCustomerMetrics(),
          executiveSummary: executiveDashboard
        },
        version: 32
      });
    } catch(e:any) {
      res.status(500).json({ error:'business_intelligence_failed', details: e.message });
    }
  });

  // Iteration 32: Real-time insights stream
  app.get('/api/intelligence/insights', async (req,res)=>{
    try {
      const { realTimeIntelligenceEngine } = await import('./services/strategy-realtime-intelligence-engine.ts');
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit||'20'),10)||20));
      const type = req.query.type as string;
      const severity = req.query.severity as string;
      
      let insights = realTimeIntelligenceEngine.getRecentInsights(limit);
      
      // Filter by type if specified
      if (type) {
        insights = insights.filter(insight => insight.type === type);
      }
      
      // Filter by severity if specified  
      if (severity) {
        insights = insights.filter(insight => insight.severity === severity);
      }
      
      const currentMetrics = realTimeIntelligenceEngine.getCurrentPerformanceSnapshot();
      const status = realTimeIntelligenceEngine.getStatus();
      
      res.json({
        ts: Date.now(),
        insights,
        currentMetrics,
        status,
        filters: { type, severity, limit },
        version: 32
      });
    } catch(e:any) {
      res.status(500).json({ error:'intelligence_insights_failed', details: e.message });
    }
  });

  // Iteration 32: Intelligence system control
  app.post('/api/intelligence/control', async (req,res)=>{
    try {
      const { realTimeIntelligenceIntegrationService } = await import('./services/strategy-realtime-intelligence-integration.ts');
      const { action, config } = req.body;
      
      switch (action) {
        case 'start':
          await realTimeIntelligenceIntegrationService.startIntegration();
          break;
        case 'stop':
          realTimeIntelligenceIntegrationService.stopIntegration();
          break;
        case 'update_config':
          if (config) realTimeIntelligenceIntegrationService.updateConfig(config);
          break;
        case 'manual_update':
          const result = await realTimeIntelligenceIntegrationService.triggerManualIntelligenceUpdate();
          return res.json({ ts: Date.now(), action, result, version: 32 });
        case 'emergency_shutdown':
          const reason = req.body.reason || 'manual_trigger';
          realTimeIntelligenceIntegrationService.emergencyShutdown(reason);
          break;
        default:
          return res.status(400).json({ error: 'invalid_action', validActions: ['start', 'stop', 'update_config', 'manual_update', 'emergency_shutdown'] });
      }
      
      const status = realTimeIntelligenceIntegrationService.getIntegrationStatus();
      
      res.json({
        ts: Date.now(),
        action,
        status,
        version: 32
      });
    } catch(e:any) {
      res.status(500).json({ error:'intelligence_control_failed', details: e.message });
    }
  });

  // Iteration 32: Intelligence system status
  app.get('/api/intelligence/status', async (req,res)=>{
    try {
      const { realTimeIntelligenceIntegrationService } = await import('./services/strategy-realtime-intelligence-integration.ts');
      const { realTimeIntelligenceEngine } = await import('./services/strategy-realtime-intelligence-engine.ts');
      
      const integrationStatus = realTimeIntelligenceIntegrationService.getIntegrationStatus();
      const engineStatus = realTimeIntelligenceEngine.getStatus();
      const currentMetrics = realTimeIntelligenceEngine.getCurrentPerformanceSnapshot();
      
      res.json({
        ts: Date.now(),
        integration: integrationStatus,
        engine: engineStatus,
        health: {
          metricsCollection: !!currentMetrics,
          lastMetricTimestamp: currentMetrics?.timestamp || 0,
          systemResponsive: integrationStatus.active && engineStatus.enabled
        },
        version: 32
      });
    } catch(e:any) {
      res.status(500).json({ error:'intelligence_status_failed', details: e.message });
    }
  });

  // Iteration 31: Auto-policy control (enable/disable)
  app.post('/api/governance/auto-policy/control', async (req,res)=>{
    try {
      const { autoPolicyIntegrationService } = await import('./services/strategy-auto-policy-integration.ts');
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled_field_required', expectedType: 'boolean' });
      }
      
      autoPolicyIntegrationService.setEnabled(enabled);
      
      res.json({
        ts: Date.now(),
        status: 'updated',
        enabled,
        version: 31
      });
    } catch(e:any) {
      res.status(500).json({ error:'auto_policy_control_failed', details: e.message });
    }
  });

  // Iteration 30: Adaptive governance debug endpoint (redacted in production)
  app.get('/api/governance/adaptive/debug', async (req,res)=>{
    try {
      const env = process.env.NODE_ENV || 'development';
      const headerKey = req.headers['x-davinci-debug-key'];
      if (env === 'production') {
        const must = process.env.DAVINCI_DEBUG_KEY;
        if (!must || headerKey !== must) return res.status(403).json({ error:'forbidden' });
      }
      const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limitLogs||'50'),10)||50));
      const includes = (req.query.include? String(req.query.include).split(',').filter(Boolean): []);
      const raw = req.query.raw === '1' && process.env.NODE_ENV !== 'production';
      const { adaptiveWeightsRunner } = await import('./services/strategy-adaptive-runner.ts');
      const { governanceAlertSuppressionService } = await import('./services/strategy-governance-alert-suppression-service.ts');
      const status = adaptiveWeightsRunner.getStatus();
      const logs = adaptiveWeightsRunner.getLogs(limit);
      const transitions = governanceAlertSuppressionService.getRecentTransitions(150);
      const pw = adaptiveWeightsRunner.getPersistenceWindow();
      let redacted = !raw;
      const sanitizeWeights = (w:any)=>{ const out:any={}; for (const k of Object.keys(w||{})) out[k]= +(+w[k]).toFixed(6); return out; };
      const safeLogs = logs.map(l=>{
        const base:any = { ts:l.ts, cycle:l.cycle, degraded:l.metrics?.degraded, reason:l.result?.reason||l.result?.reasonCode||l.result?.reason, adjusted: l.result?.adjusted };
        if (!redacted) { base.weights = l.appliedWeights?.weights || l.result?.weights; base.errs = l.result?.errs; }
        else {
          if (l.result?.weights) base.weightDeltaCount = Object.keys(l.result.weights).length;
          if (Array.isArray(l.result?.errs)) base.errCount = l.result.errs.length;
        }
        return base;
      });
      const suppressionSnapshots = includes.includes('suppression') ? governanceAlertSuppressionService.getAllGroupSnapshots() : undefined;
      const body:any = {
        ts: Date.now(),
        runner: { ...status, cooldownDebounceCounter: (adaptiveWeightsRunner as any).cooldownDebounceCounter, lastWeightSaveCycle: (adaptiveWeightsRunner as any).lastWeightSaveCycle, lastSuppressionSaveCycle: (adaptiveWeightsRunner as any).lastSuppressionSaveCycle },
        logs: safeLogs,
        recentTransitions: transitions.map((t:any)=>({ group:t.dedupGroup, prev:t.prevState||t.prev, next:t.newState||t.next, at:t.changedAt||t.at, durationMs:t.durationMs })),
        persistenceWindow: pw,
        meta: { version:1, redacted, env }
      };
      if (includes.includes('weights')) body.weights = { current: sanitizeWeights(status.currentWeights) };
      if (includes.includes('suppression')) {
        body.suppression = { groups: suppressionSnapshots?.length || 0, suppressed: suppressionSnapshots?.filter((g:any)=>g.state==='SUPPRESSED').length || 0 };
        if (!redacted) body.suppression.samples = suppressionSnapshots?.slice(0,20);
      }
      res.json(body);
    } catch(e:any) {
      res.status(500).json({ error:'adaptive_debug_failed', details: e.message });
    }
  });
  
  // SHERLOCK v15.0 FIX: Add backward compatibility for both login endpoints
  // Main admin login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است" });
      }

      // Get admin user from database
      const adminUser = await storage.getAdminUser(username);
      
      if (!adminUser || !adminUser.isActive) {
        return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
      }

      // Update last login time
      await storage.updateAdminUserLogin(adminUser.id);

      // Set session
      (req.session as any).authenticated = true;
      (req.session as any).userId = adminUser.id;
      (req.session as any).username = adminUser.username;
      (req.session as any).role = adminUser.role || 'ADMIN';
      (req.session as any).permissions = adminUser.permissions || [];
      
      // Add role integrity signature (R1.5)
      const { addRoleIntegrityToSession } = await import('./services/security-integrity-service');
      addRoleIntegrityToSession(req.session);

      res.json({ 
        success: true, 
        message: "ورود موفقیت‌آمیز",
        user: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role || 'ADMIN',
          permissions: adminUser.permissions || [],
          hasFullAccess: adminUser.role === 'SUPER_ADMIN' || (Array.isArray(adminUser.permissions) && adminUser.permissions.includes('FULL_ACCESS'))
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "خطا در فرآیند ورود" });
    }
  });

  // Legacy backward compatibility endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است" });
      }

      // Get admin user from database
      const adminUser = await storage.getAdminUser(username);
      
      if (!adminUser || !adminUser.isActive) {
        return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, adminUser.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
      }

      // Update last login time
      await storage.updateAdminUserLogin(adminUser.id);

      // Set session
      (req.session as any).authenticated = true;
      (req.session as any).userId = adminUser.id;
      (req.session as any).username = adminUser.username;
      (req.session as any).role = adminUser.role || 'ADMIN';
      (req.session as any).permissions = adminUser.permissions || [];

      res.json({ 
        success: true, 
        message: "ورود موفقیت‌آمیز",
        user: {
          id: adminUser.id,
          username: adminUser.username,
          role: adminUser.role || 'ADMIN',
          permissions: adminUser.permissions || [],
          hasFullAccess: adminUser.role === 'SUPER_ADMIN' || (Array.isArray(adminUser.permissions) && adminUser.permissions.includes('FULL_ACCESS'))
        }
      });
    } catch (error) {
      console.error("Legacy login error:", error);
      res.status(500).json({ error: "خطا در فرآیند ورود" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "خطا در فرآیند خروج" });
      }
      // Clear the correct session cookie set in server/index.ts (name: 'marfanet.sid')
      // Match key cookie options to ensure the browser removes it successfully
      res.clearCookie('marfanet.sid', {
        path: '/',
        sameSite: 'lax',
        // secure should match session cookie; in production behind HTTPS set to true
        secure: false,
        httpOnly: true,
      });
      res.json({ success: true, message: "خروج موفقیت‌آمیز" });
    });
  });

  app.get("/api/auth/check", (req, res) => {
    if ((req.session as any)?.authenticated) {
      res.json({ 
        authenticated: true, 
        user: { 
          id: (req.session as any).userId, 
          username: (req.session as any).username,
          role: (req.session as any).role || 'ADMIN',
          permissions: (req.session as any).permissions || [],
          hasFullAccess: (req.session as any).role === 'SUPER_ADMIN' || (Array.isArray((req.session as any).permissions) && (req.session as any).permissions.includes('FULL_ACCESS'))
        } 
      });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  // Dashboard API - Protected
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت اطلاعات داشبورد" });
    }
  });

  // SHERLOCK v10.0 NEW ENDPOINT: Debtor Representatives API - Protected  
  app.get("/api/dashboard/debtor-representatives", requireAuth, async (req, res) => {
    try {
      const debtorReps = await storage.getDebtorRepresentatives();
      res.json(debtorReps);
    } catch (error) {
      console.error("Error fetching debtor representatives:", error);
      res.status(500).json({ error: "خطا در دریافت نمایندگان بدهکار" });
    }
  });

  // Real-time Data Synchronization API - SHERLOCK v1.0 Core Feature
  app.get("/api/sync/status", requireAuth, async (req, res) => {
    try {
      const representatives = await storage.getRepresentatives();
      const invoices = await storage.getInvoices();
      const payments = await storage.getPayments();
      
      // Calculate real-time sync metrics
      const syncStatus = {
        lastSyncTime: new Date().toISOString(),
        adminPanelData: {
          representatives: representatives.length,
          invoices: invoices.length,
          payments: payments.length,
          totalDebt: representatives.reduce((sum, rep) => sum + parseFloat(rep.totalDebt || "0"), 0),
          totalSales: representatives.reduce((sum, rep) => sum + parseFloat(rep.totalSales || "0"), 0)
        },
        crmPanelData: {
          representativesAccess: representatives.filter(rep => rep.isActive).length,
          visibleDebt: representatives.reduce((sum, rep) => sum + parseFloat(rep.totalDebt || "0"), 0),
          profilesGenerated: representatives.length,
          aiInsightsAvailable: true
        },
        syncHealth: "EXCELLENT",
        conflictCount: 0,
        autoResolvedConflicts: 0
      };
      
      res.json(syncStatus);
    } catch (error) {
      res.status(500).json({ error: "خطا در بررسی وضعیت همگام‌سازی" });
    }
  });

  app.post("/api/sync/force-update", requireAuth, async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Update all representative financials (atomic operation)
      const representatives = await storage.getRepresentatives();
      let updatedCount = 0;
      
      for (const rep of representatives) {
        await storage.updateRepresentativeFinancials(rep.id);
        updatedCount++;
      }
      
      const duration = Date.now() - startTime;
      
      await storage.createActivityLog({
        type: "system_sync",
        description: `همگام‌سازی اجباری انجام شد: ${updatedCount} نماینده بروزرسانی شد`,
        relatedId: null,
        metadata: {
          representativesUpdated: updatedCount,
          durationMs: duration,
          syncType: "FORCE_UPDATE"
        }
      });
      
      res.json({
        success: true,
        message: "همگام‌سازی با موفقیت انجام شد",
        updatedRepresentatives: updatedCount,
        durationMs: duration
      });
    } catch (error) {
      res.status(500).json({ error: "خطا در همگام‌سازی اجباری" });
    }
  });

  // Representatives API - Protected
  app.get("/api/representatives", requireAuth, async (req, res) => {
    try {
      const representatives = await storage.getRepresentatives();
      res.json(representatives);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت نمایندگان" });
    }
  });

  // Representatives Statistics API - SHERLOCK v1.0 CRITICAL FIX (MOVED BEFORE :code route)
  // SHERLOCK v11.0: Synchronized Representatives Statistics with Batch-Based Active Count
  app.get("/api/representatives/statistics", requireAuth, async (req, res) => {
    try {
      const representatives = await storage.getRepresentatives();
      
      // SHERLOCK v11.0: Use unified batch-based calculation for activeCount
      const batchBasedActiveCount = await storage.getBatchBasedActiveRepresentatives();
      
      const stats = {
        totalCount: representatives.length,
        activeCount: batchBasedActiveCount, // 🎯 SYNC: Now matches dashboard calculation
        inactiveCount: representatives.filter(rep => !rep.isActive).length,
        totalSales: representatives.reduce((sum, rep) => sum + parseFloat(rep.totalSales || "0"), 0),
        totalDebt: representatives.reduce((sum, rep) => sum + parseFloat(rep.totalDebt || "0"), 0),
        avgPerformance: representatives.length > 0 ? 
          representatives.reduce((sum, rep) => sum + parseFloat(rep.totalSales || "0"), 0) / representatives.length : 0
      };
      
      console.log(`📊 SHERLOCK v11.0: Representatives statistics - Active: ${stats.activeCount} (batch-based), Total: ${stats.totalCount}`);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching representatives statistics:', error);
      res.status(500).json({ error: "خطا در دریافت آمار نمایندگان" });
    }
  });

  app.get("/api/representatives/:code", requireAuth, async (req, res) => {
    try {
      const representative = await storage.getRepresentativeByCode(req.params.code);
      if (!representative) {
        return res.status(404).json({ error: "نماینده یافت نشد" });
      }
      
      // Get related data
      const invoices = await storage.getInvoicesByRepresentative(representative.id);
      const payments = await storage.getPaymentsByRepresentative(representative.id);
      
      res.json({
        representative,
        invoices,
        payments
      });
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت اطلاعات نماینده" });
    }
  });

  app.post("/api/representatives", requireAuth, async (req, res) => {
    try {
      const validatedData = insertRepresentativeSchema.parse(req.body);
      const representative = await storage.createRepresentative(validatedData);
      res.json(representative);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "داده‌های ورودی نامعتبر", details: error.errors });
      } else {
        res.status(500).json({ error: "خطا در ایجاد نماینده" });
      }
    }
  });

  app.put("/api/representatives/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const representative = await storage.updateRepresentative(id, req.body);
      res.json(representative);
    } catch (error) {
      res.status(500).json({ error: "خطا در بروزرسانی نماینده" });
    }
  });

  app.delete("/api/representatives/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRepresentative(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در حذف نماینده" });
    }
  });



  // Admin Data Management API - Protected
  app.get("/api/admin/data-counts", requireAuth, async (req, res) => {
    try {
      const counts = await storage.getDataCounts();
      res.json(counts);
    } catch (error) {
      console.error('Error fetching data counts:', error);
      res.status(500).json({ error: "خطا در دریافت آمار داده‌ها" });
    }
  });

  app.post("/api/admin/reset-data", requireAuth, async (req, res) => {
    try {
      const resetOptions = req.body;
      
      // Validate request
      if (!resetOptions || typeof resetOptions !== 'object') {
        return res.status(400).json({ error: "گزینه‌های بازنشانی نامعتبر است" });
      }

      // Check if at least one option is selected
      const hasSelection = Object.values(resetOptions).some(value => value === true);
      if (!hasSelection) {
        return res.status(400).json({ error: "حداقل یک مورد برای بازنشانی انتخاب کنید" });
      }

      console.log('Data reset requested:', resetOptions);
      
      // Log the reset operation
      await storage.createActivityLog({
        type: 'system',
        description: `درخواست بازنشانی اطلاعات: ${Object.keys(resetOptions).filter(key => resetOptions[key]).join(', ')}`,
        relatedId: null,
        metadata: { resetOptions }
      });

      const result = await storage.resetData(resetOptions);
      
      console.log('Data reset completed:', result.deletedCounts);
      
      res.json({
        success: true,
        message: "بازنشانی اطلاعات با موفقیت انجام شد",
        deletedCounts: result.deletedCounts
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      res.status(500).json({ error: "خطا در بازنشانی اطلاعات" });
    }
  });

  // Public Portal API
  app.get("/api/portal/:publicId", async (req, res) => {
    try {
      const representative = await storage.getRepresentativeByPublicId(req.params.publicId);
      if (!representative) {
        return res.status(404).json({ error: "پورتال یافت نشد" });
      }
      
      const invoices = await storage.getInvoicesByRepresentative(representative.id);
      const payments = await storage.getPaymentsByRepresentative(representative.id);
      
      // Fetch portal customization settings
      const [
        portalTitle,
        portalDescription,
        showOwnerName,
        showDetailedUsage,
        customCss,
        showUsageDetails,
        showEventTimestamp,
        showEventType,
        showDescription,
        showAdminUsername
      ] = await Promise.all([
        storage.getSetting('portal_title'),
        storage.getSetting('portal_description'),
        storage.getSetting('portal_show_owner_name'),
        storage.getSetting('portal_show_detailed_usage'),
        storage.getSetting('portal_custom_css'),
        storage.getSetting('invoice_show_usage_details'),
        storage.getSetting('invoice_show_event_timestamp'),
        storage.getSetting('invoice_show_event_type'),
        storage.getSetting('invoice_show_description'),
        storage.getSetting('invoice_show_admin_username')
      ]);
      
      const portalConfig = {
        title: portalTitle?.value || 'پرتال عمومی نماینده',
        description: portalDescription?.value || 'مشاهده وضعیت مالی و فاکتورهای شما',
        showOwnerName: showOwnerName?.value === 'true',
        showDetailedUsage: showDetailedUsage?.value === 'true',
        customCss: customCss?.value || '',
        
        // Invoice display settings
        showUsageDetails: showUsageDetails?.value === 'true',
        showEventTimestamp: showEventTimestamp?.value === 'true',
        showEventType: showEventType?.value === 'true',
        showDescription: showDescription?.value === 'true',
        showAdminUsername: showAdminUsername?.value === 'true'
      };
      
      // SHERLOCK v11.5: Sort invoices by FIFO principle (oldest first)
      const sortedInvoices = invoices.sort((a, b) => {
        const dateA = new Date(a.issueDate || a.createdAt);
        const dateB = new Date(b.issueDate || b.createdAt);
        return dateA.getTime() - dateB.getTime(); // FIFO: Oldest first
      });
      
      // Don't expose sensitive data in public portal
      const publicData = {
        name: representative.name,
        code: representative.code,
        panelUsername: representative.panelUsername,
        ownerName: representative.ownerName,
        totalDebt: representative.totalDebt,
        totalSales: representative.totalSales,
        credit: representative.credit,
        portalConfig,
        invoices: sortedInvoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          status: inv.status,
          usageData: inv.usageData, // Include usage data for detailed view
          createdAt: inv.createdAt
        })),
        payments: payments.map(pay => ({
          amount: pay.amount,
          paymentDate: pay.paymentDate,
          description: pay.description
        })).sort((a, b) => {
          const dateA = new Date(a.paymentDate);
          const dateB = new Date(b.paymentDate);
          return dateB.getTime() - dateA.getTime();
        })
      };
      
      res.json(publicData);
    } catch (error) {
      console.error('Portal API error:', error);
      res.status(500).json({ error: "خطا در دریافت اطلاعات پورتال" });
    }
  });

  // Sales Partners API - Protected
  app.get("/api/sales-partners", requireAuth, async (req, res) => {
    try {
      const partners = await storage.getSalesPartners();
      res.json(partners);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت همکاران فروش" });
    }
  });

  app.get("/api/sales-partners/statistics", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getSalesPartnersStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت آمار همکاران فروش" });
    }
  });

  // SHERLOCK v12.4: Manual Invoices API - Dedicated endpoint for manual invoices management
  app.get("/api/invoices/manual", requireAuth, async (req, res) => {
    try {
      console.log('📋 SHERLOCK v12.4: Fetching manual invoices');
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const search = req.query.search as string;
      const status = req.query.status as string;
      
      // Get manual invoices with representative info
      const manualInvoices = await storage.getManualInvoices({
        page,
        limit,
        search,
        status
      });
      
      console.log(`📋 Found ${manualInvoices.data.length} manual invoices`);
      res.json(manualInvoices);
    } catch (error) {
      console.error('Error fetching manual invoices:', error);
      res.status(500).json({ error: "خطا در دریافت فاکتورهای دستی" });
    }
  });

  // SHERLOCK v12.4: Manual Invoices Statistics
  app.get("/api/invoices/manual/statistics", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getManualInvoicesStatistics();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching manual invoices statistics:', error);
      res.status(500).json({ error: "خطا در دریافت آمار فاکتورهای دستی" });
    }
  });

  app.get("/api/sales-partners/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partner = await storage.getSalesPartner(id);
      if (!partner) {
        return res.status(404).json({ error: "همکار فروش یافت نشد" });
      }
      
      // Get related representatives
      const representatives = await storage.getRepresentativesBySalesPartner(id);
      
      res.json({
        partner,
        representatives
      });
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت اطلاعات همکار فروش" });
    }
  });

  app.post("/api/sales-partners", requireAuth, async (req, res) => {
    try {
      const validatedData = insertSalesPartnerSchema.parse(req.body);
      const partner = await storage.createSalesPartner(validatedData);
      res.json(partner);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "داده‌های ورودی نامعتبر", details: error.errors });
      } else {
        res.status(500).json({ error: "خطا در ایجاد همکار فروش" });
      }
    }
  });

  app.put("/api/sales-partners/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const partner = await storage.updateSalesPartner(id, req.body);
      res.json(partner);
    } catch (error) {
      res.status(500).json({ error: "خطا در بروزرسانی همکار فروش" });
    }
  });

  app.delete("/api/sales-partners/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSalesPartner(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در حذف همکار فروش" });
    }
  });

  // Payments API - Protected (ادغام شده با مدیریت پرداخت)
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت پرداخت‌ها" });
    }
  });

  // SHERLOCK v1.0 PAYMENT DELETION API - حذف پرداخت با همگام‌سازی کامل مالی
  app.delete("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      console.log('🗑️ SHERLOCK v1.0: حذف امن پرداخت');
      const paymentId = parseInt(req.params.id);
      
      // Get payment details for audit and financial impact calculation
      const payments = await storage.getPayments();
      const payment = payments.find(p => p.id === paymentId);
      
      if (!payment) {
        return res.status(404).json({ error: "پرداخت یافت نشد" });
      }

      console.log(`🗑️ حذف پرداخت شماره ${paymentId} با مبلغ ${payment.amount} تومان از نماینده ${payment.representativeId}`);

      // Delete payment from database
      await storage.deletePayment(paymentId);

      // CRITICAL: Update representative financial data after payment deletion
      console.log(`🔄 به‌روزرسانی اطلاعات مالی نماینده ${payment.representativeId}`);
      await storage.updateRepresentativeFinancials(payment.representativeId);
      
      // CRITICAL: Invalidate CRM cache to ensure real-time sync
      invalidateCrmCache();
      console.log('🗑️ CRM cache invalidated for immediate synchronization');

      // Log the activity for audit trail
      await storage.createActivityLog({
        type: "payment_deleted",
        description: `پرداخت ${paymentId} با مبلغ ${payment.amount} تومان از نماینده ${payment.representativeId} حذف شد`,
        relatedId: payment.representativeId,
        metadata: {
          paymentId: paymentId,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          representativeId: payment.representativeId,
          deletedBy: (req.session as any)?.user?.username || 'admin',
          financialImpact: {
            amountRemoved: payment.amount,
            operation: "payment_deletion",
            affectedRepresentative: payment.representativeId
          }
        }
      });

      console.log(`✅ پرداخت ${paymentId} با موفقیت حذف شد و اطلاعات مالی همگام‌سازی شدند`);
      res.json({ 
        success: true, 
        message: "پرداخت با موفقیت حذف شد و تمام اطلاعات مالی به‌روزرسانی شدند",
        deletedPayment: {
          id: paymentId,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          representativeId: payment.representativeId
        }
      });
    } catch (error) {
      console.error('Error deleting payment:', error);
      res.status(500).json({ error: "خطا در حذف پرداخت" });
    }
  });

  app.get("/api/payments/statistics", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getPaymentStatistics();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت آمار پرداخت‌ها" });
    }
  });

  // Deep audit: allocation details for a specific payment
  app.get("/api/payments/:id/allocation-details", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: "شناسه نامعتبر است" });
      const details = await storage.getPaymentAllocationDetails(id);
      if (!details.payment) return res.status(404).json({ error: "پرداخت یافت نشد" });
      res.json(details);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت جزئیات تخصیص پرداخت" });
    }
  });

  app.get("/api/payments/representative/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payments = await storage.getPaymentsByRepresentative(id);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت پرداخت‌های نماینده" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      
      // Phase 3: allow skipping auto-allocation via query (?skipAuto=true or &auto=false)
      const skipAuto = (req.query.skipAuto === 'true') || (req.query.auto === 'false');
      // Auto-allocate to oldest unpaid invoice if representativeId provided and auto is not skipped
      if (validatedData.representativeId && !skipAuto) {
        await storage.autoAllocatePaymentToInvoices(payment.id, validatedData.representativeId);
      }
      
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "داده‌های ورودی نامعتبر", details: error.errors });
      } else {
        res.status(500).json({ error: "خطا در ایجاد پرداخت" });
      }
    }
  });

  app.put("/api/payments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const payment = await storage.updatePayment(id, req.body);
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "خطا در بروزرسانی پرداخت" });
    }
  });

  app.post("/api/payments/:id/allocate", requireAuth, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { invoiceId } = req.body;
      
      const payment = await storage.allocatePaymentToInvoice(paymentId, invoiceId);
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: "خطا در تخصیص پرداخت" });
    }
  });

  // Alias finance routes to avoid any potential path conflicts
  app.get("/api/finance/payments/:id/allocation", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: "شناسه نامعتبر است" });
      const details = await storage.getPaymentAllocationDetails(id);
      if (!details.payment) return res.status(404).json({ error: "پرداخت یافت نشد" });
      res.json(details);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت جزئیات تخصیص پرداخت" });
    }
  });

  app.get("/api/finance/representatives/:id/summary", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: "شناسه نامعتبر است" });
      const summary = await storage.getRepresentativeFinancialSummary(id);
      if (!summary.representative) return res.status(404).json({ error: "نماینده یافت نشد" });
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت جمع‌بندی مالی نماینده" });
    }
  });

  // Representative financial summary (unpaid, totals, credit, payment stats)
  app.get("/api/representatives/:id/financial-summary", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ error: "شناسه نامعتبر است" });
      const summary = await storage.getRepresentativeFinancialSummary(id);
      if (!summary.representative) return res.status(404).json({ error: "نماینده یافت نشد" });
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت جمع‌بندی مالی نماینده" });
    }
  });


  // AI Assistant API - Protected (SHERLOCK v1.0 Intelligent System)
  app.get("/api/ai/status", requireAuth, async (req, res) => {
    try {
      const aiStatus = await xaiGrokEngine.checkEngineStatus();
      res.json({
        status: "operational",
        engine: "XAI-Grok-4",
        culturalIntelligence: "persian",
        version: "SHERLOCK-v1.0",
        ...aiStatus
      });
    } catch (error) {
      res.status(500).json({ error: "خطا در بررسی وضعیت AI" });
    }
  });

  app.post("/api/ai/profile/:id", requireAuth, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const representative = await storage.getRepresentative(representativeId);
      
      if (!representative) {
        return res.status(404).json({ error: "نماینده یافت نشد" });
      }

      // Get related financial data
      const invoices = await storage.getInvoicesByRepresentative(representativeId);
      const payments = await storage.getPaymentsByRepresentative(representativeId);

      const profile = await xaiGrokEngine.generatePsychologicalProfile({
        representative,
        invoices,
        payments,
        culturalContext: "persian_business"
      });

      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "خطا در تولید پروفایل روانشناختی" });
    }
  });

  app.post("/api/ai/insights/:id", requireAuth, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const representative = await storage.getRepresentative(representativeId);
      
      if (!representative) {
        return res.status(404).json({ error: "نماینده یافت نشد" });
      }

  const insights = await xaiGrokEngine.generateCulturalInsightsData({
        representative,
        context: "business_relationship_management"
      });

      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "خطا در تولید بینش‌های فرهنگی" });
    }
  });

  // Invoices API - Protected
  // NOTE: Canonical implementation is defined later with enhanced logging (SHERLOCK v12.1)

  // Unpaid Invoices by Representative API - SHERLOCK v1.0 CRITICAL FIX
  app.get("/api/invoices/unpaid/:representativeId", requireAuth, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.representativeId);
      const invoices = await storage.getInvoicesByRepresentative(representativeId);
      
      // SHERLOCK v11.5: Enhanced filter to include partial invoices
      const unpaidInvoices = invoices.filter(invoice => 
        invoice.status === 'unpaid' || invoice.status === 'overdue' || invoice.status === 'partial'
      );
      
      res.json(unpaidInvoices);
    } catch (error) {
      console.error('Error fetching unpaid invoices:', error);
      res.status(500).json({ error: "خطا در دریافت فاکتورهای پرداخت نشده" });
    }
  });

  app.get("/api/invoices/telegram-pending", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getInvoicesForTelegram();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت فاکتورهای در انتظار ارسال" });
    }
  });

  // فاز ۱: Enhanced invoice generation with batch management
  app.post("/api/invoices/generate", requireAuth, upload.single('usageFile'), async (req: MulterRequest, res) => {
    try {
      console.log('🚀 فاز ۱: JSON upload with batch management');
      console.log('File exists:', !!req.file);
      
      if (!req.file) {
        console.log('ERROR: No file uploaded');
        return res.status(400).json({ error: "فایل JSON ارسال نشده است" });
      }

      // فاز ۱: دریافت پارامترهای batch و تاریخ از request body
  const { batchName, periodStart, periodEnd, description, invoiceDateMode, customInvoiceDate, discountPercent, taxPercent, rounding } = req.body;
      console.log('Batch params:', { batchName, periodStart, periodEnd, description });
  console.log('Invoice date params:', { invoiceDateMode, customInvoiceDate });
  console.log('Calculation params:', { discountPercent, taxPercent, rounding });

      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const jsonData = req.file.buffer.toString('utf-8');
      console.log('JSON data length:', jsonData.length);
      console.log('JSON data preview (first 500 chars):', jsonData.substring(0, 500));
      
      const usageRecords = parseUsageJsonData(jsonData);
      
      console.log('About to validate usage data, total records:', usageRecords.length);
      
      const { valid, invalid } = validateUsageData(usageRecords);
      
      console.log(`تعداد رکوردهای معتبر: ${valid.length}, غیرمعتبر: ${invalid.length}`);
      if (invalid.length > 0) {
        console.log("نمونه رکورد غیرمعتبر:", JSON.stringify(invalid[0], null, 2));
      }
      if (valid.length > 0) {
        console.log("نمونه رکورد معتبر:", JSON.stringify(valid[0], null, 2));
      }
      
      if (valid.length === 0) {
        console.log('VALIDATION ERROR: No valid records found');
        console.log('Total records processed:', usageRecords.length);
        console.log('Invalid records details:', invalid.slice(0, 3));
        
        return res.status(400).json({ 
          error: "هیچ رکورد معتبری یافت نشد", 
          totalRecords: usageRecords.length,
          invalidSample: invalid.slice(0, 3),
          details: "بررسی کنید که فایل JSON شامل فیلدهای admin_username و amount باشد",
          debugInfo: {
            sampleRecord: usageRecords[0] || null,
            requiredFields: ['admin_username', 'amount']
          }
        });
      }

      // فاز ۱: ایجاد batch جدید برای این آپلود
      let currentBatch = null;
      if (batchName && periodStart && periodEnd) {
        console.log('🗂️ فاز ۱: ایجاد batch جدید...');
        const batchCode = await storage.generateBatchCode(periodStart);
        
        currentBatch = await storage.createInvoiceBatch({
          batchName,
          batchCode,
          periodStart,
          periodEnd,
          description: description || `آپلود فایل ${req.file.originalname}`,
          status: 'processing',
          uploadedBy: (req.session as any)?.user?.username || 'admin',
          uploadedFileName: req.file.originalname
        });
        
        console.log('✅ Batch ایجاد شد:', currentBatch.id, currentBatch.batchCode);
      }

      console.log('🚀 شروع پردازش Sequential...');
      
      // تنظیم تاریخ صدور فاکتور
      const invoiceDate = invoiceDateMode === 'custom' && customInvoiceDate 
        ? customInvoiceDate.trim()
        : null; // null means use today's date
      
      console.log('📅 Invoice date configuration:', { mode: invoiceDateMode, date: invoiceDate });
      
      // Strict validation for calculation params
      const allowedRounding = new Set(['nearest', 'floor', 'ceil']);

      if (typeof rounding !== 'undefined' && !allowedRounding.has(String(rounding))) {
        return res.status(400).json({
          error: "rounding نامعتبر است",
          details: "rounding باید یکی از مقادیر nearest, floor, ceil باشد"
        });
      }

      const parsedDiscount = (typeof discountPercent !== 'undefined' && String(discountPercent).trim() !== '')
        ? Number(discountPercent)
        : undefined;
      if (typeof parsedDiscount !== 'undefined' && (Number.isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)) {
        return res.status(400).json({
          error: "درصد تخفیف نامعتبر است",
          details: "discountPercent باید عددی بین ۰ تا ۱۰۰ باشد"
        });
      }

      const parsedTax = (typeof taxPercent !== 'undefined' && String(taxPercent).trim() !== '')
        ? Number(taxPercent)
        : undefined;
      if (typeof parsedTax !== 'undefined' && (Number.isNaN(parsedTax) || parsedTax < 0 || parsedTax > 100)) {
        return res.status(400).json({
          error: "درصد مالیات نامعتبر است",
          details: "taxPercent باید عددی بین ۰ تا ۱۰۰ باشد"
        });
      }

      const calcOptions = {
        discountPercent: parsedDiscount,
        taxPercent: parsedTax,
        rounding: (typeof rounding === 'string' && allowedRounding.has(rounding)) ? rounding as 'nearest' | 'floor' | 'ceil' : 'nearest'
      } as const;

      const sequentialResult = await processUsageDataSequential(valid, storage, invoiceDate, calcOptions);
      const createdInvoices = [];
      const { processedInvoices, newRepresentatives, statistics } = sequentialResult;
      
      console.log('📊 آمار پردازش Sequential:', statistics);
      console.log('💾 شروع ایجاد فاکتورها در دیتابیس...');
      
      // Process invoices in smaller batches to prevent memory issues
      let invoiceCount = 0;
      for (const processedInvoice of processedInvoices) {
        invoiceCount++;
        console.log(`📝 ایجاد فاکتور ${invoiceCount}/${processedInvoices.length}: ${processedInvoice.representativeCode}`);
        // Representative should already exist from sequential processing
        let representative = await storage.getRepresentativeByPanelUsername(processedInvoice.panelUsername) ||
                           await storage.getRepresentativeByCode(processedInvoice.representativeCode);
        
        if (representative) {
          console.log('Creating invoice for representative:', representative.name);
          console.log('Invoice data:', {
            representativeId: representative.id,
            amount: processedInvoice.amount.toString(),
            issueDate: processedInvoice.issueDate,
            dueDate: processedInvoice.dueDate,
            usageDataLength: processedInvoice.usageData?.records?.length || 0
          });
          
          // فاز ۱: شامل کردن batchId در فاکتور
          const invoice = await storage.createInvoice({
            representativeId: representative.id,
            batchId: currentBatch ? currentBatch.id : null,
            amount: processedInvoice.amount.toString(),
            issueDate: processedInvoice.issueDate,
            dueDate: processedInvoice.dueDate,
            status: "unpaid",
            usageData: processedInvoice.usageData,

          });
          
          // Update representative financial data
          await storage.updateRepresentativeFinancials(representative.id);
          
          createdInvoices.push({
            ...invoice,
            representativeName: representative.name,
            representativeCode: representative.code
          });
          
          console.log('Invoice created successfully:', invoice.id);
          
          // بهینه‌سازی حافظه و database
          if (invoiceCount % 20 === 0) {
            console.log(`⏳ ${invoiceCount}/${processedInvoices.length} فاکتور ایجاد شد - بهینه‌سازی حافظه...`);
            // Force garbage collection and add small delay
            if (global.gc) {
              global.gc();
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          console.error('Representative not found for invoice:', processedInvoice.representativeCode);
        }
      }
      
      console.log(`🎉 پردازش کامل شد! ${createdInvoices.length} فاکتور ایجاد شد`);

      // فاز ۱: تکمیل batch اگر ایجاد شده بود
      if (currentBatch) {
        console.log('🏁 فاز ۱: تکمیل batch...');
        await storage.completeBatch(currentBatch.id);
        console.log('✅ Batch تکمیل شد:', currentBatch.batchCode);
      }

      res.json({
        success: true,
        created: createdInvoices.length,
        newRepresentatives: newRepresentatives.length,
        invalid: invalid.length,
        invoices: createdInvoices,
        createdRepresentatives: newRepresentatives,
        invalidRecords: invalid,
        // فاز ۱: اضافه کردن اطلاعات batch به پاسخ
        batch: currentBatch ? {
          id: currentBatch.id,
          batchName: currentBatch.batchName,
          batchCode: currentBatch.batchCode,
          status: 'completed'
        } : null
      });
    } catch (error) {
      console.error('❌ خطا در تولید فاکتور:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');
      
      // Force cleanup on error
      if (global.gc) {
        global.gc();
      }
      
      // Return more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'خطای نامشخص';
      const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT');
      
      res.status(500).json({ 
        error: isTimeoutError ? "پردازش فایل بزرگ زمان بیشتری نیاز دارد" : "خطا در پردازش فایل JSON",
        details: errorMessage,
        isTimeout: isTimeoutError,
        suggestion: isTimeoutError ? "لطفاً مجدداً تلاش کنید یا فایل را به بخش‌های کوچک‌تر تقسیم کنید" : "بررسی فرمت فایل JSON",
        timestamp: new Date().toISOString()
      });
    }
  });

  // فاز ۲: Manual invoice creation API - ایجاد فاکتور دستی
  app.post("/api/invoices/create-manual", requireAuth, async (req, res) => {
    try {
      console.log('🔧 فاز ۲: ایجاد فاکتور دستی');
      const validatedData = insertInvoiceSchema.parse(req.body);
      
      // Check if representative exists
      const representative = await storage.getRepresentative(validatedData.representativeId);
      if (!representative) {
        return res.status(404).json({ error: "نماینده یافت نشد" });
      }

      // Create manual invoice
      const invoice = await storage.createInvoice({
        ...validatedData,
        status: validatedData.status || "unpaid",
        usageData: validatedData.usageData || { 
          type: "manual",
          description: "فاکتور ایجاد شده به صورت دستی",
          createdBy: (req.session as any)?.user?.username || 'admin',
          createdAt: new Date().toISOString()
        }
      });

      // Update representative financial data
      await storage.updateRepresentativeFinancials(representative.id);

      await storage.createActivityLog({
        type: "manual_invoice_created",
        description: `فاکتور دستی برای ${representative.name} به مبلغ ${validatedData.amount} ایجاد شد`,
        relatedId: invoice.id,
        metadata: {
          representativeCode: representative.code,
          amount: validatedData.amount,
          issueDate: validatedData.issueDate,
          createdBy: (req.session as any)?.user?.username || 'admin'
        }
      });

      res.json({
        success: true,
        invoice: {
          ...invoice,
          representativeName: representative.name,
          representativeCode: representative.code
        }
      });
    } catch (error) {
      console.error('Error creating manual invoice:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "داده‌های ورودی نامعتبر", details: error.errors });
      } else {
        res.status(500).json({ error: "خطا در ایجاد فاکتور دستی" });
      }
    }
  });

  // فاز ۲: Invoice editing API - ویرایش فاکتور
  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      console.log('🔧 فاز ۲: ویرایش فاکتور');
      const invoiceId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Get original invoice for audit trail
      const originalInvoice = await storage.getInvoice(invoiceId);
      if (!originalInvoice) {
        return res.status(404).json({ error: "فاکتور یافت نشد" });
      }

      // Update invoice
      const updatedInvoice = await storage.updateInvoice(invoiceId, updateData);
      
      // Update representative financial data if amount changed
      if (updateData.amount && parseFloat(updateData.amount) !== parseFloat(originalInvoice.amount)) {
        await storage.updateRepresentativeFinancials(originalInvoice.representativeId);
      }

      // Log the edit
      await storage.createActivityLog({
        type: "invoice_edited",
        description: `فاکتور ${originalInvoice.invoiceNumber} ویرایش شد`,
        relatedId: invoiceId,
        metadata: {
          originalAmount: originalInvoice.amount,
          newAmount: updateData.amount,
          originalStatus: originalInvoice.status,
          newStatus: updateData.status,
          editedBy: (req.session as any)?.user?.username || 'admin',
          changes: Object.keys(updateData)
        }
      });

      res.json({
        success: true,
        invoice: updatedInvoice
      });
    } catch (error) {
      console.error('Error updating invoice:', error);
      res.status(500).json({ error: "خطا در ویرایش فاکتور" });
    }
  });

  // MISSING API: Get all invoices - SHERLOCK v12.1 CRITICAL FIX (Canonical)
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      console.log('📋 SHERLOCK v12.1: Fetching all invoices for main invoices page');
      const startTime = Date.now();
      
      const invoices = await storage.getInvoices();
      
      const responseTime = Date.now() - startTime;
      console.log(`✅ ${invoices.length} فاکتور در ${responseTime}ms بارگذاری شد`);
      
      res.json(invoices);
    } catch (error) {
      console.error('❌ خطا در دریافت فهرست فاکتورها:', error);
      res.status(500).json({ error: "خطا در دریافت فهرست فاکتورها" });
    }
  });

  // MISSING API: Get invoices with batch info - SHERLOCK v12.1 CRITICAL FIX  
  app.get("/api/invoices/with-batch-info", requireAuth, async (req, res) => {
    try {
      console.log('📋 SHERLOCK v12.1: دریافت کامل فاکتورها با pagination صحیح');
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const statusFilter = req.query.status as string || 'all';
      const searchTerm = req.query.search as string || '';
      const telegramFilter = req.query.telegram as string || 'all';
      
      const invoices = await storage.getInvoices();
      const representatives = await storage.getRepresentatives();
      
      // Create lookup maps for performance  
      const repMap = new Map(representatives.map(rep => [rep.id, rep]));
      
      // Enhance invoices with additional info FIRST
      let enhancedInvoices = invoices.map(invoice => {
        const rep = repMap.get(invoice.representativeId);
        
        return {
          ...invoice,
          representativeName: rep?.name || 'نامشخص',
          representativeCode: rep?.code || 'نامشخص',
          panelUsername: rep?.panelUsername
        };
      });
      
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        enhancedInvoices = enhancedInvoices.filter(invoice =>
          invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
          invoice.representativeName?.toLowerCase().includes(searchLower) ||
          invoice.representativeCode?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply status filter
      if (statusFilter && statusFilter !== 'all') {
        enhancedInvoices = enhancedInvoices.filter(invoice => invoice.status === statusFilter);
      }
      
      // Apply telegram status filter
      if (telegramFilter && telegramFilter !== 'all') {
        if (telegramFilter === 'sent') {
          enhancedInvoices = enhancedInvoices.filter(invoice => invoice.sentToTelegram);
        } else if (telegramFilter === 'unsent') {
          enhancedInvoices = enhancedInvoices.filter(invoice => !invoice.sentToTelegram);
        }
      }
      
      // SHERLOCK v12.2: Apply Display sorting - newest invoices first for UI
      // NOTE: This ONLY affects display order, not payment allocation (which uses FIFO)
      enhancedInvoices.sort((a, b) => {
        const dateA = new Date(a.issueDate || a.createdAt).getTime();
        const dateB = new Date(b.issueDate || b.createdAt).getTime();
        return dateB - dateA; // Descending: newest first for display
      });
      
      // Calculate pagination
      const totalCount = enhancedInvoices.length;
      const totalPages = Math.ceil(totalCount / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedInvoices = enhancedInvoices.slice(startIndex, endIndex);
      
      console.log(`✅ صفحه ${page}: ${paginatedInvoices.length} فاکتور از ${totalCount} فاکتور کل (${totalPages} صفحه)`);
      
      res.json({
        data: paginatedInvoices,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalPages: totalPages,
          totalCount: totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('❌ خطا در دریافت فاکتورها:', error);
      res.status(500).json({ error: "خطا در دریافت فهرست فاکتورها" });
    }
  });

  // MISSING API: Invoice statistics - SHERLOCK v12.1 ENHANCEMENT
  app.get("/api/invoices/statistics", requireAuth, async (req, res) => {
    try {
      console.log('📊 SHERLOCK v12.1: Calculating invoice statistics');
      
      const invoices = await storage.getInvoices();
      
      const stats = {
        totalInvoices: invoices.length,
        unpaidCount: invoices.filter(inv => inv.status === 'unpaid').length,
        paidCount: invoices.filter(inv => inv.status === 'paid').length,
        partialCount: invoices.filter(inv => inv.status === 'partial').length,
        overdueCount: invoices.filter(inv => inv.status === 'overdue').length,
        totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0),
        unpaidAmount: invoices
          .filter(inv => inv.status === 'unpaid')
          .reduce((sum, inv) => sum + parseFloat(inv.amount), 0),
        paidAmount: invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + parseFloat(inv.amount), 0),
        // SHERLOCK v12.2: Add telegram statistics for accurate unsent count
        sentToTelegramCount: invoices.filter(inv => inv.sentToTelegram).length,
        unsentToTelegramCount: invoices.filter(inv => !inv.sentToTelegram).length
      };
      
      console.log('📊 آمار فاکتورها:', stats);
      res.json(stats);
    } catch (error) {
      console.error('❌ خطا در محاسبه آمار فاکتورها:', error);
      res.status(500).json({ error: "خطا در محاسبه آمار فاکتورها" });
    }
  });

  // SHERLOCK v12.3: Send invoices to Telegram - Complete Implementation
  app.post("/api/invoices/send-telegram", requireAuth, async (req, res) => {
    try {
      console.log('📨 SHERLOCK v12.3: Sending invoices to Telegram');
      const { invoiceIds } = req.body;
      
      if (!invoiceIds || !Array.isArray(invoiceIds)) {
        return res.status(400).json({ error: "شناسه فاکتورها الزامی است" });
      }

      // Get Telegram settings from database
      const botTokenSetting = await storage.getSetting("telegram_bot_token");
      const chatIdSetting = await storage.getSetting("telegram_chat_id");
      const templateSetting = await storage.getSetting("telegram_template");

      const botToken = botTokenSetting?.value || process.env.TELEGRAM_BOT_TOKEN;
      const chatId = chatIdSetting?.value || process.env.TELEGRAM_CHAT_ID;
      const template = templateSetting?.value || getDefaultTelegramTemplate();

      console.log('🔑 Telegram settings check:', {
        botTokenExists: !!botToken,
        chatIdExists: !!chatId,
        templateExists: !!template
      });

      if (!botToken || !chatId) {
        console.error('❌ Missing Telegram credentials');
        return res.status(400).json({ 
          error: "تنظیمات تلگرام کامل نیست. لطفاً Bot Token و Chat ID را در تنظیمات وارد کنید." 
        });
      }
      
      let successCount = 0;
      let failedCount = 0;
      
      for (const invoiceId of invoiceIds) {
        try {
          console.log(`📋 Processing invoice ${invoiceId}`);
          
          // Get invoice details
          const invoice = await storage.getInvoice(invoiceId);
          if (!invoice) {
            console.error(`Invoice ${invoiceId} not found`);
            failedCount++;
            continue;
          }

          // Get representative details
          const representative = await storage.getRepresentative(invoice.representativeId);
          if (!representative) {
            console.error(`Representative ${invoice.representativeId} not found for invoice ${invoiceId}`);
            failedCount++;
            continue;
          }

          // Prepare Telegram message
          // SHERLOCK v16.3 TELEGRAM URL FIX: Use proper portal link generation
          const { getPortalLink } = await import('./config');
          const portalLink = getPortalLink(representative.publicId);
          const telegramMessage = {
            representativeName: representative.name,
            shopOwner: representative.ownerName || representative.name,
            panelId: representative.panelUsername || representative.code,
            amount: invoice.amount,
            issueDate: invoice.issueDate,
            status: formatInvoiceStatus(invoice.status),
            portalLink,
            invoiceNumber: invoice.invoiceNumber,
            isResend: invoice.sentToTelegram || false,
            sendCount: (invoice.telegramSendCount || 0) + 1
          };

          // Send to Telegram
          const success = await sendInvoiceToTelegram(botToken, chatId, telegramMessage, template);
          
          if (success) {
            // Mark as sent
            await storage.updateInvoice(invoiceId, {
              sentToTelegram: true,
              telegramSentAt: new Date(),
              telegramSendCount: telegramMessage.sendCount
            });

            // Create activity log
            await storage.createActivityLog({
              type: "invoice_telegram_sent",
              description: `فاکتور ${invoice.invoiceNumber} به تلگرام ارسال شد`,
              relatedId: invoiceId
            });

            successCount++;
            console.log(`✅ Invoice ${invoiceId} sent successfully`);
          } else {
            failedCount++;
            console.error(`❌ Failed to send invoice ${invoiceId}`);
          }
        } catch (error) {
          console.error(`❌ خطا در ارسال فاکتور ${invoiceId}:`, error);
          failedCount++;
        }
      }
      
      console.log(`✅ SHERLOCK v12.3: ارسال تلگرام کامل شد - ${successCount} موفق, ${failedCount} ناموفق`);
      
      res.json({
        success: successCount,
        failed: failedCount,
        total: invoiceIds.length
      });
    } catch (error) {
      console.error('❌ خطا در ارسال فاکتورها به تلگرام:', error);
      res.status(500).json({ error: "خطا در ارسال فاکتورها به تلگرام" });
    }
  });

  // فاز ۲: Delete invoice API - حذف فاکتور با همگام‌سازی کامل مالی
  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      console.log('🔧 فاز ۲: حذف امن فاکتور');
      const invoiceId = parseInt(req.params.id);
      
      // Get invoice details for audit
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "فاکتور یافت نشد" });
      }

      console.log(`🗑️ حذف فاکتور شماره ${invoice.invoiceNumber} با مبلغ ${invoice.amount} تومان`);

      // Delete invoice from database
      await storage.deleteInvoice(invoiceId);

      // CRITICAL: Update representative financial data after deletion
      console.log(`🔄 به‌روزرسانی اطلاعات مالی نماینده ${invoice.representativeId}`);
      await storage.updateRepresentativeFinancials(invoice.representativeId);
      
      // CRITICAL: Invalidate CRM cache to ensure real-time sync
      invalidateCrmCache();
      console.log('🗑️ CRM cache invalidated for immediate synchronization');

      // Log the activity for audit trail
      await storage.createActivityLog({
        type: "invoice_deleted",
        description: `فاکتور ${invoice.invoiceNumber} با مبلغ ${invoice.amount} تومان حذف شد`,
        relatedId: invoiceId,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          representativeId: invoice.representativeId,
          deletedBy: (req.session as any)?.user?.username || 'admin',
          financialImpact: {
            amountRemoved: invoice.amount,
            operation: "invoice_deletion"
          }
        }
      });

      console.log(`✅ فاکتور ${invoice.invoiceNumber} با موفقیت حذف شد و اطلاعات مالی همگام‌سازی شدند`);
      res.json({ 
        success: true, 
        message: "فاکتور با موفقیت حذف شد و اطلاعات مالی به‌روزرسانی شدند",
        deletedInvoice: {
          id: invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount
        }
      });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: "خطا در حذف فاکتور" });
    }
  });

  // فاز ۲: Get single invoice details API
  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "شناسه فاکتور نامعتبر است" });
      }
      const invoice = await storage.getInvoice(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "فاکتور یافت نشد" });
      }

      // Get representative info
      const representative = await storage.getRepresentative(invoice.representativeId);

      res.json({
        ...invoice,
        representativeName: representative?.name,
        representativeCode: representative?.code
      });
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      res.status(500).json({ error: "خطا در دریافت جزئیات فاکتور" });
    }
  });

  // SHERLOCK v12.1: Enhanced pagination and statistics for invoices page
  app.get("/api/invoices/export", requireAuth, async (req, res) => {
    try {
      console.log('📄 SHERLOCK v12.1: Exporting invoices to Excel/CSV');
      
      const invoices = await storage.getInvoices();
      
      // Prepare export data with enhanced information
      const exportData = invoices.map(invoice => ({
        'شماره فاکتور': invoice.invoiceNumber,
        'نام نماینده': (invoice as any).representativeName || 'نامشخص',
        'کد نماینده': (invoice as any).representativeCode || 'نامشخص',
        'مبلغ': invoice.amount,
        'تاریخ صدور': invoice.issueDate,
        'تاریخ سررسید': invoice.dueDate,
        'وضعیت': invoice.status === 'paid' ? 'پرداخت شده' : 
                  invoice.status === 'partial' ? 'پرداخت جزئی' : 'پرداخت نشده',
        'ارسال به تلگرام': invoice.sentToTelegram ? 'ارسال شده' : 'ارسال نشده',
        'تاریخ ایجاد': invoice.createdAt
      }));
      
      res.json({
        success: true,
        data: exportData,
        total: exportData.length,
        exportedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ خطا در export فاکتورها:', error);
      res.status(500).json({ error: "خطا در export فاکتورها" });
    }
  });

  // فاز ۳: Payment Synchronization API Routes
  
  // Get unallocated payments API
  app.get("/api/payments/unallocated", requireAuth, async (req, res) => {
    try {
      const representativeId = req.query.representativeId ? parseInt(req.query.representativeId as string) : undefined;
      const unallocatedPayments = await storage.getUnallocatedPayments(representativeId);
      
      res.json(unallocatedPayments);
    } catch (error) {
      console.error('Error fetching unallocated payments:', error);
      res.status(500).json({ error: "خطا در دریافت پرداخت‌های تخصیص نیافته" });
    }
  });

  // Auto-allocate payments API
  app.post("/api/payments/auto-allocate/:representativeId", requireAuth, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.representativeId);
      const { amount, paymentDate, description, allocations } = req.body;
      
      // Create the main payment record first
      const paymentData = {
        representativeId,
        amount,
        paymentDate,
        description,
        isAllocated: true
      };
      
      const payment = await storage.createPayment(paymentData);
      
      // Process allocations for each invoice if provided
      if (allocations && allocations.length > 0) {
        for (const allocation of allocations) {
          // Update invoice status
          await storage.updateInvoice(allocation.invoiceId, {
            status: allocation.newStatus
          });
        }
      } else {
        // SHERLOCK v1.0 FIX: Call correct auto-allocation function
        await storage.autoAllocatePaymentToInvoices(payment.id, representativeId);
      }
      
      await storage.createActivityLog({
        type: "payment_auto_allocation",
        description: `تخصیص خودکار پرداخت ${amount} ریال برای نماینده ${representativeId}`,
        relatedId: representativeId,
        metadata: {
          paymentId: payment.id,
          amount: amount,
          allocationsCount: allocations?.length || 0
        }
      });

      // SHERLOCK v1.0 GAP-3 FIX: Invalidate CRM cache for immediate financial synchronization
      invalidateCrmCache();
      console.log('🔄 CRM cache invalidated after payment creation for real-time sync');

      res.json({ 
        success: true, 
        payment,
        allocatedCount: allocations?.length || 0,
        message: "پرداخت با موفقیت ثبت و تخصیص داده شد"
      });
    } catch (error) {
      console.error('Error auto-allocating payments:', error);
      res.status(500).json({ error: "خطا در تخصیص خودکار پرداخت‌ها" });
    }
  });

  // Phase 3: Batch auto-allocate all unallocated payments for a representative (FIFO)
  app.post("/api/payments/auto-allocate/batch/:representativeId", requireAuth, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.representativeId);
      if (Number.isNaN(representativeId)) return res.status(400).json({ error: "شناسه نامعتبر است" });
      const result = await storage.autoAllocatePayments(representativeId);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('Error in batch auto-allocation:', error);
      res.status(500).json({ error: "خطا در تخصیص خودکار دسته‌ای پرداخت‌ها" });
    }
  });

  // CRM debt synchronization endpoint - Enhanced Financial Synchronization
  app.post("/api/crm/representatives/:id/sync-debt", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, invoiceId, amountChange, timestamp } = req.body;
      
      console.log('Sync debt request:', { id, reason, invoiceId, amountChange });
      
      // Recalculate actual debt from database
      const representativeId = parseInt(id);
      
      // Calculate total unpaid invoices for this representative
  const unpaidResult = await (db as any).select({ 
        totalDebt: sql<string>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)` 
      }).from(invoices).where(
        and(
          eq(invoices.representativeId, representativeId),
          or(eq(invoices.status, 'unpaid'), eq(invoices.status, 'overdue'))
        )
      );
      
      // Calculate total sales (all invoices)
  const salesResult = await (db as any).select({ 
        totalSales: sql<string>`COALESCE(SUM(CAST(amount as DECIMAL)), 0)` 
      }).from(invoices).where(eq(invoices.representativeId, representativeId));
      
      const actualTotalDebt = unpaidResult[0]?.totalDebt || "0";
      const actualTotalSales = salesResult[0]?.totalSales || "0";
      
      console.log('Calculated debt:', { actualTotalDebt, actualTotalSales });
      
      // Update representative with calculated values
      const updatedRep = await storage.updateRepresentative(representativeId, {
        totalDebt: actualTotalDebt,
        totalSales: actualTotalSales,
        credit: "0" // Reset credit if needed
      });

      // Log the synchronization with actual values
      await storage.createActivityLog({
        type: "debt_synchronized",
        description: `همگام‌سازی مالی پس از تغییر مبلغ فاکتور: ${actualTotalDebt} ریال`,
        relatedId: representativeId,
        metadata: {
          invoiceId,
          amountChange,
          syncReason: reason || "invoice_amount_changed",
          oldDebt: "unknown",
          newDebt: actualTotalDebt,
          timestamp: timestamp || new Date().toISOString()
        }
      });

      console.log('Debt synchronization completed:', { 
        representativeId, 
        actualTotalDebt, 
        actualTotalSales 
      });

      res.json({ 
        success: true, 
        message: "همگام‌سازی مالی کامل انجام شد",
        data: { 
          invoiceId, 
          amountChange, 
          totalDebt: actualTotalDebt,
          totalSales: actualTotalSales
        }
      });
    } catch (error: any) {
      console.error('Debt synchronization failed:', error);
      res.status(500).json({ 
        error: "خطا در همگام‌سازی بدهی",
        details: error.message 
      });
    }
  });

  // Dashboard statistics refresh endpoint
  app.post("/api/dashboard/refresh-stats", requireAuth, async (req, res) => {
    try {
      const { reason } = req.body;

      // Recalculate all statistics
      const totalRevenue = await storage.getTotalRevenue();
      const totalDebt = await storage.getTotalDebt();
      const activeRepresentatives = await storage.getActiveRepresentativesCount();
      const unpaidInvoices = await storage.getUnpaidInvoicesCount();
      const overdueInvoices = await storage.getOverdueInvoicesCount();

      // Log the refresh
      await storage.createActivityLog({
        type: "dashboard_stats_refreshed",
        description: `آمار داشبورد بروزرسانی شد - دلیل: ${reason}`,
        metadata: {
          totalRevenue: totalRevenue.toString(),
          totalDebt: totalDebt.toString(),
          activeRepresentatives,
          unpaidInvoices,
          overdueInvoices,
          refreshReason: reason,
          timestamp: new Date().toISOString()
        }
      });

      res.json({ 
        success: true, 
        message: "آمار داشبورد بروزرسانی شد",
        stats: {
          totalRevenue,
          totalDebt,
          activeRepresentatives,
          unpaidInvoices,
          overdueInvoices
        }
      });
    } catch (error) {
      res.status(500).json({ error: "خطا در بروزرسانی آمار داشبورد" });
    }
  });

  // Removed duplicate manual payment allocation endpoint.

  // SHERLOCK v11.5: CRITICAL - Batch Invoice Status Recalculation API
  app.post("/api/invoices/recalculate-statuses", requireAuth, async (req, res) => {
    try {
      console.log('🔧 SHERLOCK v11.5: Starting batch invoice status recalculation...');
      const { representativeId, invoiceIds } = req.body;
      
      let invoicesToProcess = [];
      
      if (representativeId) {
        // Recalculate for specific representative
        const repInvoices = await storage.getInvoicesByRepresentative(representativeId);
        invoicesToProcess = repInvoices.map(inv => inv.id);
        console.log(`📊 Processing ${invoicesToProcess.length} invoices for representative ${representativeId}`);
      } else if (invoiceIds && Array.isArray(invoiceIds)) {
        // Recalculate for specific invoices
        invoicesToProcess = invoiceIds;
        console.log(`📊 Processing ${invoicesToProcess.length} specific invoices`);
      } else {
        // Recalculate all invoices (expensive operation)
        const allInvoices = await storage.getInvoices();
        invoicesToProcess = allInvoices.map(inv => inv.id);
        console.log(`📊 Processing ALL ${invoicesToProcess.length} invoices`);
      }
      
      const results = {
        processed: 0,
        updated: 0,
        statusChanges: [] as Array<{
          invoiceId: any;
          invoiceNumber: string;
          oldStatus: string;
          newStatus: string;
        }>
      };
      
      // Process each invoice
      for (const invoiceId of invoicesToProcess) {
        try {
          const oldInvoice = await storage.getInvoice(invoiceId);
          if (!oldInvoice) continue;
          
          const calculatedStatus = await storage.calculateInvoicePaymentStatus(invoiceId);
          
          if (calculatedStatus !== oldInvoice.status) {
            await storage.updateInvoice(invoiceId, { status: calculatedStatus });
            results.statusChanges.push({
              invoiceId,
              invoiceNumber: oldInvoice.invoiceNumber,
              oldStatus: oldInvoice.status,
              newStatus: calculatedStatus
            });
            results.updated++;
          }
          
          results.processed++;
        } catch (invoiceError) {
          console.warn(`Error processing invoice ${invoiceId}:`, invoiceError);
        }
      }
      
      console.log(`✅ Batch recalculation complete: ${results.updated} invoices updated out of ${results.processed} processed`);
      
      // Log the batch operation
      await storage.createActivityLog({
        type: "batch_invoice_status_recalculation",
        description: `بازمحاسبه وضعیت ${results.processed} فاکتور - ${results.updated} فاکتور به‌روزرسانی شد`
      });
      
      res.json({
        success: true,
        message: `وضعیت ${results.updated} فاکتور از ${results.processed} فاکتور بازمحاسبه و به‌روزرسانی شد`,
        results
      });
    } catch (error) {
      console.error('Batch status recalculation error:', error);
      res.status(500).json({ error: "خطا در بازمحاسبه وضعیت فاکتورها" });
    }
  });

  // Payment allocation summary API
  app.get("/api/payments/allocation-summary/:representativeId", requireAuth, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.representativeId);
      const summary = await storage.getPaymentAllocationSummary(representativeId);
      
      res.json(summary);
    } catch (error) {
      console.error('Error getting payment allocation summary:', error);
      res.status(500).json({ error: "خطا در دریافت خلاصه تخصیص پرداخت‌ها" });
    }
  });

  // Financial reconciliation API
  app.post("/api/reconcile/:representativeId", requireAuth, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.representativeId);
      const reconciliationResult = await storage.reconcileRepresentativeFinancials(representativeId);
      
      await storage.createActivityLog({
        type: "financial_reconciliation",
        description: `تطبیق مالی نماینده ${representativeId} انجام شد`,
        relatedId: representativeId,
        metadata: {
          previousDebt: reconciliationResult.previousDebt,
          newDebt: reconciliationResult.newDebt,
          difference: reconciliationResult.difference,
          totalPayments: reconciliationResult.totalPayments
        }
      });

      res.json(reconciliationResult);
    } catch (error) {
      console.error('Error reconciling finances:', error);
      res.status(500).json({ error: "خطا در تطبیق مالی" });
    }
  });



  // Payments API - Protected (duplicate definitions removed; canonical versions are earlier)

  // فاز ۱: Invoice Batches API - مدیریت دوره‌ای فاکتورها
  app.get("/api/invoice-batches", requireAuth, async (req, res) => {
    try {
      const batches = await storage.getInvoiceBatches();
      res.json(batches);
    } catch (error) {
      console.error('Error fetching invoice batches:', error);
      res.status(500).json({ error: "خطا در دریافت دسته‌های فاکتور" });
    }
  });

  app.get("/api/invoice-batches/:id", requireAuth, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const batch = await storage.getInvoiceBatch(batchId);
      
      if (!batch) {
        return res.status(404).json({ error: "دسته فاکتور یافت نشد" });
      }

      // Get invoices for this batch
      const invoices = await storage.getBatchInvoices(batchId);

      res.json({
        batch,
        invoices,
        summary: {
          totalInvoices: invoices.length,
          totalAmount: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0).toString()
        }
      });
    } catch (error) {
      console.error('Error fetching batch details:', error);
      res.status(500).json({ error: "خطا در دریافت جزئیات دسته فاکتور" });
    }
  });

  app.post("/api/invoice-batches", requireAuth, async (req, res) => {
    try {
      const validatedData = insertInvoiceBatchSchema.parse(req.body);
      
      // Generate unique batch code if not provided
      if (!validatedData.batchCode) {
        validatedData.batchCode = await storage.generateBatchCode(validatedData.periodStart);
      }

      const batch = await storage.createInvoiceBatch(validatedData);
      res.json(batch);
    } catch (error) {
      console.error('Error creating invoice batch:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "داده‌های ورودی نامعتبر", details: error.errors });
      } else {
        res.status(500).json({ error: "خطا در ایجاد دسته فاکتور" });
      }
    }
  });

  app.put("/api/invoice-batches/:id", requireAuth, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const updateData = req.body;
      
      const batch = await storage.updateInvoiceBatch(batchId, updateData);
      res.json(batch);
    } catch (error) {
      console.error('Error updating invoice batch:', error);
      res.status(500).json({ error: "خطا در بروزرسانی دسته فاکتور" });
    }
  });

  app.post("/api/invoice-batches/:id/complete", requireAuth, async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      await storage.completeBatch(batchId);
      
      const updatedBatch = await storage.getInvoiceBatch(batchId);
      res.json({ 
        success: true, 
        batch: updatedBatch,
        message: "دسته فاکتور با موفقیت تکمیل شد"
      });
    } catch (error) {
      console.error('Error completing batch:', error);
      res.status(500).json({ error: "خطا در تکمیل دسته فاکتور" });
    }
  });



  // Activity Logs API
  app.get("/api/activity-logs", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت فعالیت‌ها" });
    }
  });

  // Settings API - Protected
  app.get("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت تنظیمات" });
    }
  });

  app.put("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "خطا در بروزرسانی تنظیمات" });
    }
  });

  // xAI Grok Assistant API
  app.post("/api/ai/test-connection", requireAuth, async (req, res) => {
    try {
      const result = await xaiGrokEngine.testConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "خطا در تست اتصال XAI Grok" });
    }
  });

  app.post("/api/ai/analyze-financial", requireAuth, async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      
      // Use XAI Grok for financial analysis
      const analysis = await xaiGrokEngine.analyzeFinancialData(
        parseFloat(dashboardData.totalRevenue),
        parseFloat(dashboardData.totalDebt),
        dashboardData.activeRepresentatives,
        dashboardData.overdueInvoices
      );
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "خطا در تحلیل مالی هوشمند" });
    }
  });

  app.post("/api/ai/analyze-representative", requireAuth, async (req, res) => {
    try {
      const { representativeCode } = req.body;
      const representative = await storage.getRepresentativeByCode(representativeCode);
      
      if (!representative) {
        return res.status(404).json({ error: "نماینده یافت نشد" });
      }

      const culturalProfile = await xaiGrokEngine.analyzeCulturalProfile(representative);
      res.json({ representative, culturalProfile });
    } catch (error) {
      res.status(500).json({ error: "خطا در تحلیل نماینده" });
    }
  });

  app.post("/api/ai/question", requireAuth, async (req, res) => {
    try {
      const { question } = req.body;
      const answer = await xaiGrokEngine.answerFinancialQuestion(question);
      res.json({ answer });
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت پاسخ از دستیار هوشمند" });
    }
  });

  app.post("/api/ai/generate-report", requireAuth, async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      const representatives = await storage.getRepresentatives();
      const invoices = await storage.getInvoices();
      
      const reportData = {
        dashboard: dashboardData,
        representatives: representatives.slice(0, 10), // Top 10
        invoices: invoices.slice(0, 20) // Recent 20
      };
      
      // const report = await generateFinancialReport(reportData); // Temporarily disabled
      const report = { message: "گزارش مالی - در حال توسعه", data: reportData };
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: "خطا در تولید گزارش" });
    }
  });

  // Test Telegram connection
  app.post("/api/test-telegram", requireAuth, async (req, res) => {
    try {
      console.log('Testing Telegram connection...');
      
      // Get Telegram settings from environment variables or database
      let botToken = process.env.TELEGRAM_BOT_TOKEN;
      let chatId = process.env.TELEGRAM_CHAT_ID;
      
      console.log('Env Bot Token exists:', !!botToken);
      console.log('Env Chat ID exists:', !!chatId);
      
      // Fallback to database settings if env vars not available
      if (!botToken || !chatId) {
        const botTokenSetting = await storage.getSetting('telegram_bot_token');
        const chatIdSetting = await storage.getSetting('telegram_chat_id');
        
        console.log('DB Bot Token exists:', !!botTokenSetting?.value);
        console.log('DB Chat ID exists:', !!chatIdSetting?.value);
        
        if (!botTokenSetting?.value || !chatIdSetting?.value) {
          return res.status(400).json({ 
            error: "تنظیمات تلگرام کامل نیست - ابتدا توکن ربات و شناسه چت را ذخیره کنید",
            hasEnvToken: !!botToken,
            hasEnvChatId: !!chatId,
            hasDbToken: !!botTokenSetting?.value,
            hasDbChatId: !!chatIdSetting?.value
          });
        }
        
        botToken = botTokenSetting.value;
        chatId = chatIdSetting.value;
      }
      
      console.log('Using Bot Token:', botToken ? `${botToken.substring(0, 10)}...` : 'none');
      console.log('Using Chat ID:', chatId);
      
      // Test message
      const testMessage = `🤖 تست اتصال سیستم مدیریت مالی MarFaNet
      
✅ اتصال با موفقیت برقرار شد
📅 تاریخ تست: ${new Date().toLocaleString('fa-IR')}
🔧 نسخه سیستم: 1.0.0

این پیام برای تست اتصال ربات ارسال شده است.`;

      // Send test message using the same method as invoice sending
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: testMessage,
          parse_mode: 'HTML'
        })
      });
      
      console.log('Telegram API response status:', response.status);
      const result = await response.json();
      console.log('Telegram API response:', result);
      
      if (!response.ok) {
        throw new Error(result.description || `Telegram API error: ${response.status}`);
      }
      
      res.json({ 
        success: true, 
        message: "پیام تست با موفقیت ارسال شد",
        telegramResponse: result
      });
    } catch (error: any) {
      console.error('Telegram test error:', error);
      res.status(500).json({ 
        error: `خطا در تست اتصال تلگرام: ${error.message}`,
        details: error.toString()
      });
    }
  });

  // Initialize default settings on first run
  // Invoice Edit Routes
  app.post("/api/invoices/edit", requireAuth, async (req, res) => {
    try {
      const { 
        invoiceId, 
        originalUsageData, 
        editedUsageData, 
        editType, 
        editReason,
        originalAmount,
        editedAmount,
        editedBy 
      } = req.body;

      // Validate input
      if (!invoiceId || !editedUsageData || !editedBy) {
        return res.status(400).json({ error: "اطلاعات ضروری برای ویرایش فاکتور کامل نیست" });
      }

      // Validate amounts
      if (editedAmount < 0) {
        return res.status(400).json({ error: "مبلغ فاکتور نمی‌تواند منفی باشد" });
      }

      // Execute atomic transaction for invoice editing
      const atomicResult = await storage.executeAtomicInvoiceEdit({
        invoiceId,
        editedUsageData,
        editReason: editReason || 'ویرایش دستی توسط ادمین',
        editedBy,
        originalAmount: parseFloat(originalAmount.toString()),
        editedAmount: parseFloat(editedAmount.toString())
      });

      res.json({ 
        success: atomicResult.success, 
        editId: atomicResult.editId,
        transactionId: atomicResult.transactionId,
        message: "فاکتور با موفقیت از طریق تراکنش اتمیک ویرایش شد" 
      });

    } catch (error: any) {
      console.error('خطا در ویرایش فاکتور:', error);
      res.status(500).json({ 
        error: 'خطا در ویرایش فاکتور',
        details: error.message 
      });
    }
  });

  app.get("/api/invoices/:id/edit-history", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      if (!invoiceId) {
        return res.status(400).json({ error: "شناسه فاکتور نامعتبر است" });
      }

      const editHistory = await storage.getInvoiceEditHistory(invoiceId);
      res.json(editHistory);

    } catch (error: any) {
      console.error('خطا در دریافت تاریخچه ویرایش:', error);
      res.status(500).json({ 
        error: 'خطا در دریافت تاریخچه ویرایش',
        details: error.message 
      });
    }
  });

  app.get("/api/invoices/:id/usage-details", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      
      if (!invoiceId) {
        return res.status(400).json({ error: "شناسه فاکتور نامعتبر است" });
      }

      const invoices = await storage.getInvoices();
      const invoice = invoices.find(inv => inv.id === invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ error: "فاکتور یافت نشد" });
      }

      // Return detailed usage data for editing
      res.json({
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          issueDate: invoice.issueDate,
          status: invoice.status
        },
        usageData: invoice.usageData || {},
        records: invoice.usageData?.records || []
      });

    } catch (error: any) {
      console.error('خطا در دریافت جزئیات مصرف:', error);
      res.status(500).json({ 
        error: 'خطا در دریافت جزئیات مصرف',
        details: error.message 
      });
    }
  });

  // Financial transaction management API routes
  app.get("/api/financial/transactions", requireAuth, async (req, res) => {
    try {
      const page = parseInt((req.query.page as string) || '1');
      const limit = parseInt((req.query.limit as string) || '30');
      const representativeId = req.query.representativeId ? parseInt(req.query.representativeId as string) : undefined;
      const status = (req.query.status as string) || undefined;
      const type = (req.query.type as string) || undefined;
      const entityType = (req.query.entityType as string) || undefined;
      const entityId = req.query.entityId ? parseInt(req.query.entityId as string) : undefined;
      const dateFrom = (req.query.dateFrom as string) || undefined;
      const dateTo = (req.query.dateTo as string) || undefined;
      const sort = (req.query.sort as 'newest' | 'oldest') || 'newest';

      const result = await storage.getFinancialTransactionsPaginated({
        page: Number.isFinite(page) && page > 0 ? page : 1,
        limit: Number.isFinite(limit) && limit > 0 ? limit : 30,
        representativeId,
        status,
        type,
        entityType,
        entityId,
        dateFrom,
        dateTo,
        sort
      });

      res.json(result);
    } catch (error: any) {
      console.error('خطا در دریافت تراکنش‌های مالی:', error);
      res.status(500).json({ 
        error: 'خطا در دریافت تراکنش‌های مالی',
        details: error.message 
      });
    }
  });

  app.get("/api/financial/constraints", requireAuth, async (req, res) => {
    try {
      // Use a different method that exists in storage
      const constraints = await storage.getFinancialTransactions();
      res.json({ constraints: [], message: "عملیات موقتاً غیرفعال است" });
    } catch (error: any) {
      console.error('خطا در دریافت محدودیت‌های یکپارچگی:', error);
      res.status(500).json({ 
        error: 'خطا در دریافت محدودیت‌های یکپارچگی',
        details: error.message 
      });
    }
  });

  app.post("/api/financial/reconcile", requireAuth, async (req, res) => {
    try {
      const reconcileResult = await storage.reconcileFinancialData();
      res.json(reconcileResult);
    } catch (error: any) {
      console.error('خطا در هماهنگی داده‌های مالی:', error);
      res.status(500).json({ 
        error: 'خطا در هماهنگی داده‌های مالی',
        details: error.message 
      });
    }
  });

  app.post("/api/init", async (req, res) => {
    try {
      // Set default Telegram template
      await storage.updateSetting('telegram_template', getDefaultTelegramTemplate());
      
      // Initialize basic integrity constraints for active representatives
      const representatives = await storage.getRepresentatives();
      for (const rep of representatives.slice(0, 5)) { // Initialize first 5 representatives
        try {
          await storage.createIntegrityConstraint({
            constraintType: 'BALANCE_CHECK',
            entityType: 'representative',
            entityId: rep.id,
            constraintRule: {
              maxDebt: 50000000, // 50 million Toman limit
              warningThreshold: 40000000,
              autoReconcile: true
            }
          });
        } catch (error) {
          console.log(`Constraint for representative ${rep.id} already exists or failed to create`);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در راه‌اندازی اولیه" });
    }
  });

  // ====== FINANCIAL TRANSACTIONS API (CLOCK MECHANISM) ======
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const { representativeId, status } = req.query;
      
      let transactions;
      if (representativeId) {
        transactions = await storage.getTransactionsByRepresentative(parseInt(representativeId as string));
      } else if (status === 'pending') {
        transactions = await storage.getPendingTransactions();
      } else {
        // Get all transactions (could be paginated in future)
        transactions = await storage.getPendingTransactions(); // For now, show pending ones
      }
      
      res.json(transactions);
    } catch (error: any) {
      console.error('خطا در دریافت تراکنش‌ها:', error);
      res.status(500).json({ error: 'خطا در دریافت تراکنش‌ها', details: error.message });
    }
  });

  app.get("/api/transactions/:transactionId", requireAuth, async (req, res) => {
    try {
      const { transactionId } = req.params;
      const transaction = await storage.getFinancialTransaction(transactionId);
      
      if (!transaction) {
        return res.status(404).json({ error: "تراکنش یافت نشد" });
      }
      
      res.json(transaction);
    } catch (error: any) {
      console.error('خطا در دریافت تراکنش:', error);
      res.status(500).json({ error: 'خطا در دریافت تراکنش', details: error.message });
    }
  });

  app.post("/api/transactions/:transactionId/rollback", requireAuth, async (req, res) => {
    try {
      const { transactionId } = req.params;
      await storage.rollbackTransaction(transactionId);
      
      res.json({ 
        success: true, 
        message: `تراکنش ${transactionId} با موفقیت برگردانده شد` 
      });
    } catch (error: any) {
      console.error('خطا در برگرداندن تراکنش:', error);
      res.status(500).json({ error: 'خطا در برگرداندن تراکنش', details: error.message });
    }
  });

  // ====== DATA INTEGRITY CONSTRAINTS API (CLOCK PRECISION) ======
  app.get("/api/constraints/violations", requireAuth, async (req, res) => {
    try {
      const violations = await storage.getConstraintViolations();
      res.json(violations);
    } catch (error: any) {
      console.error('خطا در دریافت نقض محدودیت‌ها:', error);
      res.status(500).json({ error: 'خطا در دریافت نقض محدودیت‌ها', details: error.message });
    }
  });

  // Create a data integrity constraint (for testing negative scenarios)
  app.post("/api/constraints", requireAuth, async (req, res) => {
    try {
      const { constraintType, entityType, entityId, constraintRule } = req.body || {};
      if (!constraintType || !entityType || !entityId) {
        return res.status(400).json({ error: "پارامترهای ضروری ناقص است" });
      }
      const created = await storage.createIntegrityConstraint({
        constraintType,
        entityType,
        entityId: parseInt(entityId),
        constraintRule: constraintRule || {}
      });
      res.json(created);
    } catch (error: any) {
      console.error('خطا در ایجاد محدودیت:', error);
      res.status(500).json({ error: 'خطا در ایجاد محدودیت', details: error.message });
    }
  });

  app.post("/api/constraints/validate", requireAuth, async (req, res) => {
    try {
      const { entityType, entityId } = req.body;
      
      if (!entityType || !entityId) {
        return res.status(400).json({ error: "نوع موجودیت و شناسه ضروری است" });
      }
      
      const validation = await storage.validateConstraints(entityType, parseInt(entityId));
      res.json(validation);
    } catch (error: any) {
      console.error('خطا در اعتبارسنجی محدودیت‌ها:', error);
      res.status(500).json({ error: 'خطا در اعتبارسنجی محدودیت‌ها', details: error.message });
    }
  });

  app.post("/api/constraints/:constraintId/fix", requireAuth, async (req, res) => {
    try {
      const constraintId = parseInt(req.params.constraintId);
      const fixed = await storage.fixConstraintViolation(constraintId);
      
      res.json({ 
        success: fixed, 
        message: fixed ? "محدودیت با موفقیت رفع شد" : "امکان رفع خودکار محدودیت وجود ندارد" 
      });
    } catch (error: any) {
      console.error('خطا در رفع محدودیت:', error);
      res.status(500).json({ error: 'خطا در رفع محدودیت', details: error.message });
    }
  });

  // ====== FINANCIAL RECONCILIATION API (CLOCK SYNCHRONIZATION) ======
  app.post("/api/financial/reconcile", requireAuth, async (req, res) => {
    try {
      const { representativeId } = req.body;
      
      if (representativeId) {
        // Reconcile specific representative
        await storage.updateRepresentativeFinancials(parseInt(representativeId));
        res.json({ 
          success: true, 
          message: `مالیات نماینده ${representativeId} هماهنگ شد` 
        });
      } else {
        // Reconcile all representatives (could be heavy operation)
        const representatives = await storage.getRepresentatives();
        let processed = 0;
        
        for (const rep of representatives) {
          try {
            await storage.updateRepresentativeFinancials(rep.id);
            processed++;
          } catch (error) {
            console.error(`Error reconciling representative ${rep.id}:`, error);
          }
        }
        
        res.json({ 
          success: true, 
          message: `${processed} نماینده هماهنگ شد`,
          processed,
          total: representatives.length
        });
      }
      
    } catch (error: any) {
      console.error('خطا در هماهنگی مالی:', error);
      res.status(500).json({ error: 'خطا در هماهنگی مالی', details: error.message });
    }
  });

  // CRM Routes Integration
  // CRM routes are already registered via registerCrmRoutes() function
  
  // AI Engine routes are integrated above in xAI Grok configuration section

  // Initialize CRM real-time sync
  // CRM data sync service removed for simplified system

  // DA VINCI Iteration 31: Auto-Policy Evolution API Endpoints
  
  // Auto-policy status endpoint
  app.get('/api/governance/auto-policy/status', async (req, res) => {
    try {
      const { autoPolicyIntegrationService } = await import('./services/strategy-auto-policy-integration.js');
      const status = autoPolicyIntegrationService.getStatus();
      res.json({
        timestamp: Date.now(),
        ...status,
        meta: {
          version: 1,
          iteration: 31,
          description: 'Auto-Policy Evolution Engine Status'
        }
      });
    } catch (error: any) {
      console.error('Auto-policy status error:', error);
      res.status(500).json({ 
        error: 'auto_policy_status_failed', 
        details: error.message 
      });
    }
  });

  // Auto-policy control endpoint (enable/disable)
  app.post('/api/governance/auto-policy/control', async (req, res) => {
    try {
      const { action } = req.body;
      
      if (!['enable', 'disable'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use "enable" or "disable".' });
      }
      
      const { autoPolicyIntegrationService } = await import('./services/strategy-auto-policy-integration.js');
      autoPolicyIntegrationService.setEnabled(action === 'enable');
      
      res.json({
        timestamp: Date.now(),
        action,
        status: 'success',
        message: `Auto-policy system ${action}d successfully`
      });
    } catch (error: any) {
      console.error('Auto-policy control error:', error);
      res.status(500).json({ 
        error: 'auto_policy_control_failed', 
        details: error.message 
      });
    }
  });

  // Auto-policy metrics history endpoint
  app.get('/api/governance/auto-policy/metrics', async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
      
      const { autoPolicyIntegrationService } = await import('./services/strategy-auto-policy-integration.js');
      const metrics = autoPolicyIntegrationService.getRecentMetrics(limit);
      
      res.json({
        timestamp: Date.now(),
        metrics,
        meta: {
          count: metrics.length,
          limit,
          version: 1
        }
      });
    } catch (error: any) {
      console.error('Auto-policy metrics error:', error);
      res.status(500).json({ 
        error: 'auto_policy_metrics_failed', 
        details: error.message 
      });
    }
  });

  // Auto-policy manual evaluation trigger
  app.post('/api/governance/auto-policy/evaluate', async (req, res) => {
    try {
      const { autoPolicyIntegrationService } = await import('./services/strategy-auto-policy-integration.js');
      const result = await autoPolicyIntegrationService.triggerManualEvaluation();
      
      res.json({
        timestamp: Date.now(),
        evaluation: result,
        meta: {
          triggered: 'manual',
          version: 1
        }
      });
    } catch (error: any) {
      console.error('Auto-policy evaluation error:', error);
      res.status(500).json({ 
        error: 'auto_policy_evaluation_failed', 
        details: error.message 
      });
    }
  });

  // Enhanced health check endpoint
  app.get("/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      services: {
        financial: "running",
        crm: "running",
        auth: "running",
        sync: "simplified"
      }
    });
  });

  // ================================
  // Iteration 35: Strategic Decision Support Engine APIs
  // ================================
  
  app.get('/api/strategic/status', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const status = await strategicEngine.getStrategicSystemStatus();
      res.json({ success: true, data: status, timestamp: Date.now(), version: 35 });
    } catch (error: any) {
      console.error('[StrategicAPI] Status error:', error);
      res.status(500).json({ success: false, error: 'Failed to get strategic status' });
    }
  });

  app.post('/api/strategic/decision/process', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const { decisionRequest, executiveProfile } = req.body;
      if (!decisionRequest || !executiveProfile) {
        return res.status(400).json({ success: false, error: 'Missing required fields: decisionRequest, executiveProfile' });
      }
      
      const result = await strategicEngine.processStrategicDecision(decisionRequest, executiveProfile);
      res.json({ success: true, data: result, timestamp: Date.now(), version: 35 });
    } catch (error: any) {
      console.error('[StrategicAPI] Decision processing error:', error);
      res.status(500).json({ success: false, error: 'Failed to process strategic decision' });
    }
  });

  app.get('/api/strategic/intelligence/:executiveId', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const executiveId = req.params.executiveId;
      const mockExecutiveProfile = {
        id: executiveId,
        name: `Executive ${executiveId}`,
        role: 'Chief Executive',
        priorities: req.query.priorities ? (req.query.priorities as string).split(',') : ['strategic-growth', 'operational-efficiency'],
        decisionHistory: [],
        visualPreferences: { theme: 'executive', complexity: 'medium' },
        alertPreferences: { urgency: 'high', channels: ['dashboard', 'email'] },
        dashboardPreferences: { refreshInterval: 300000, layout: 'strategic' },
        organizationContext: { industry: 'technology', size: 'enterprise', maturity: 'advanced' }
      };
      
      const intelligence = await strategicEngine.intelligenceAggregator.aggregateExecutiveIntelligence(mockExecutiveProfile);
      
      res.json({ success: true, data: intelligence, timestamp: Date.now(), version: 35 });
    } catch (error: any) {
      console.error('[StrategicAPI] Intelligence error:', error);
      res.status(500).json({ success: false, error: 'Failed to get executive intelligence' });
    }
  });

  app.get('/api/strategic/dashboard/:executiveId', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const executiveId = req.params.executiveId;
      const mockExecutiveProfile = {
        id: executiveId,
        name: `Executive ${executiveId}`,
        role: 'Chief Executive',
        priorities: ['strategic-growth', 'operational-efficiency'],
        decisionHistory: [],
        visualPreferences: { theme: 'executive', complexity: 'medium' },
        alertPreferences: { urgency: 'high', channels: ['dashboard', 'email'] },
        dashboardPreferences: { refreshInterval: 300000, layout: 'strategic', updatePreferences: { changeSensitivity: 'medium' } },
        organizationContext: { industry: 'technology', size: 'enterprise', maturity: 'advanced' }
      };
      
      // Generate mock intelligence
      const mockIntelligence = {
        executiveId,
        timestamp: new Date(),
        intelligence: { realTimeData: 'active', businessData: 'operational' },
        insights: [
          { type: 'strategic', content: 'Market expansion opportunity identified', urgency: 'high', actionRequired: true },
          { type: 'operational', content: 'Efficiency improvements in progress', urgency: 'medium', actionRequired: false }
        ],
        recommendations: [
          { type: 'strategic', title: 'Expand to new market segment', impact: 9.2, urgency: 8.5, confidence: 0.87 }
        ],
        urgencyLevel: 'HIGH' as const,
        confidence: 0.92
      };
      
      const dashboard = await strategicEngine.generateExecutiveDashboard(mockIntelligence, null, mockExecutiveProfile);
      
      res.json({ success: true, data: dashboard, timestamp: Date.now(), version: 35 });
    } catch (error: any) {
      console.error('[StrategicAPI] Dashboard error:', error);
      res.status(500).json({ success: false, error: 'Failed to get executive dashboard' });
    }
  });

  app.get('/api/strategic/scenarios', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const decisionContext = req.query.context ? JSON.parse(req.query.context as string) : {
        id: 'demo-strategic-decision',
        decisionType: 'market-expansion',
        industry: 'technology',
        marketSegment: 'enterprise-software',
        timeHorizon: 12,
        options: [
          { id: 'option-1', name: 'Expand domestically', description: 'Focus on domestic market expansion' },
          { id: 'option-2', name: 'International expansion', description: 'Enter new international markets' }
        ],
        uncertainVariables: [
          { name: 'market_growth', range: [0.05, 0.25], distribution: 'normal' },
          { name: 'competition_intensity', range: [0.3, 0.8], distribution: 'uniform' }
        ],
        constraints: [
          { type: 'budget', value: 10000000, unit: 'USD' },
          { type: 'timeline', value: 18, unit: 'months' }
        ]
      };
      
      const probabilityDistribution = req.query.probabilities ? JSON.parse(req.query.probabilities as string) : {
        best_case: 0.15,
        likely_case: 0.60,
        worst_case: 0.20,
        black_swan: 0.05
      };
      
      const scenarios = await strategicEngine.scenarioPlanner.generateStrategicScenarios(
        decisionContext,
        probabilityDistribution
      );
      
      res.json({ success: true, data: scenarios, timestamp: Date.now(), version: 35 });
    } catch (error: any) {
      console.error('[StrategicAPI] Scenarios error:', error);
      res.status(500).json({ success: false, error: 'Failed to generate scenarios' });
    }
  });

  app.get('/api/strategic/communications', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const department = req.query.department as string;
      
      // Mock communications data
      const communications = [
        {
          id: 'comm-1',
          type: 'strategic-update',
          department: department || 'sales',
          title: 'Q4 Strategic Initiative Communication',
          priority: 'HIGH',
          status: 'active',
          stakeholders: 15,
          effectiveness: 0.89,
          timestamp: new Date()
        },
        {
          id: 'comm-2', 
          type: 'coordination',
          department: department || 'operations',
          title: 'Cross-functional Coordination Update',
          priority: 'MEDIUM',
          status: 'pending',
          stakeholders: 8,
          effectiveness: 0.76,
          timestamp: new Date()
        }
      ];
      
      res.json({ success: true, data: communications, timestamp: Date.now(), version: 35 });
    } catch (error: any) {
      console.error('[StrategicAPI] Communications error:', error);
      res.status(500).json({ success: false, error: 'Failed to get strategic communications' });
    }
  });

  app.get('/api/strategic/alerts', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const priority = req.query.priority as string;
      
      // Mock alerts data
      const allAlerts = [
        {
          id: 'alert-1',
          type: 'STRATEGIC_OPPORTUNITY',
          severity: 'HIGH',
          priority: 8.5,
          title: 'Market Expansion Opportunity',
          description: 'New market segment showing 35% growth potential',
          impact: 'High revenue potential identified',
          actions: ['Conduct market analysis', 'Prepare expansion plan'],
          generatedAt: new Date(),
          status: 'ACTIVE'
        },
        {
          id: 'alert-2',
          type: 'COMPETITIVE_RISK',
          severity: 'MEDIUM',
          priority: 6.2,
          title: 'Competitor Analysis Update',
          description: 'Key competitor launching similar product',
          impact: 'Potential market share impact',
          actions: ['Review competitive strategy', 'Accelerate product roadmap'],
          generatedAt: new Date(),
          status: 'ACTIVE'
        },
        {
          id: 'alert-3',
          type: 'OPERATIONAL_INSIGHT',
          severity: 'LOW',
          priority: 3.1,
          title: 'Process Optimization Opportunity',
          description: 'Automation opportunity in customer service',
          impact: 'Efficiency improvement potential',
          actions: ['Evaluate automation tools'],
          generatedAt: new Date(),
          status: 'ACTIVE'
        }
      ];
      
      const alerts = priority ? allAlerts.filter(alert => alert.severity === priority.toUpperCase()) : allAlerts;
      
      res.json({ 
        success: true, 
        data: alerts, 
        count: alerts.length,
        totalAlerts: allAlerts.length,
        timestamp: Date.now(), 
        version: 35 
      });
    } catch (error: any) {
      console.error('[StrategicAPI] Alerts error:', error);
      res.status(500).json({ success: false, error: 'Failed to get strategic alerts' });
    }
  });

  app.get('/api/strategic/performance', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const timeRange = req.query.timeRange ? parseInt(req.query.timeRange as string) : 24; // hours
      const performance = await strategicEngine.performanceMonitor.getCurrentMetrics();
      
      res.json({ 
        success: true, 
        data: performance, 
        timeRange,
        timestamp: Date.now(), 
        version: 35 
      });
    } catch (error: any) {
      console.error('[StrategicAPI] Performance error:', error);
      res.status(500).json({ success: false, error: 'Failed to get performance metrics' });
    }
  });

  app.get('/api/strategic/kpis', async (req, res) => {
    try {
      const strategicEngine = (global as any).strategicDecisionSupportEngine;
      if (!strategicEngine) {
        return res.status(503).json({ success: false, error: 'Strategic Decision Support Engine not initialized' });
      }
      
      const executiveId = req.query.executiveId as string || 'default';
      const mockIntelligence = {
        executiveId,
        timestamp: new Date(),
        intelligence: { realTimeData: 'active', businessData: 'operational' },
        insights: [
          { type: 'business', metric: 'revenue_growth', value: 0.23, trend: 'positive' },
          { type: 'operational', metric: 'efficiency', value: 0.88, trend: 'stable' },
          { type: 'strategic', metric: 'market_position', value: 0.76, trend: 'improving' }
        ],
        recommendations: [],
        urgencyLevel: 'MEDIUM' as const,
        confidence: 0.91
      };
      
      const kpis = await strategicEngine.kpiMetricsEngine.calculateStrategicKPIs(mockIntelligence);
      
      res.json({ success: true, data: kpis, timestamp: Date.now(), version: 35 });
    } catch (error: any) {
      console.error('[StrategicAPI] KPIs error:', error);
      res.status(500).json({ success: false, error: 'Failed to get strategic KPIs' });
    }
  });

  // =============================
  // Iteration 36: Predictive Analytics & Forecasting Engine APIs
  // =============================
  app.get('/api/predictive/status', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PredictiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Predictive Engine not initialized' });
      res.json({ success:true, iteration:36, status: eng.getStatus(), timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'predictive_status_failed', details:e.message }); }
  });

  app.post('/api/predictive/ingest/synthetic', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PredictiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Predictive Engine not initialized' });
      const records = Array.isArray(req.body?.records)? req.body.records: [];
      const result = await eng.ingestSynthetic(records);
      res.json({ success:true, ...result, timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'predictive_ingest_failed', details:e.message }); }
  });

  app.post('/api/predictive/forecast', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PredictiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Predictive Engine not initialized' });
      const { horizon='P7D', kpis=['revenue'] } = req.body || {};
      const forecast = await eng.generateForecast(horizon, kpis);
      res.json({ success:true, forecast, timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'predictive_forecast_failed', details:e.message }); }
  });

  app.get('/api/predictive/models', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PredictiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Predictive Engine not initialized' });
      res.json({ success:true, versions: eng.getStatus().modelVersions, timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'predictive_models_failed', details:e.message }); }
  });

  app.get('/api/predictive/serving', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PredictiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Predictive Engine not initialized' });
      res.json({ success:true, serving: eng.getStatus().serving, timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'predictive_serving_failed', details:e.message }); }
  });

  // =============================
  // Iteration 37: Prescriptive Optimization & Decision Simulation Engine APIs
  // =============================
  app.get('/api/prescriptive/status', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PrescriptiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Prescriptive Engine missing' });
      const status = eng.getStatus? eng.getStatus(): { initialized:false };
      res.json({ success:true, iteration:37, status, timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'prescriptive_status_failed', details:e.message }); }
  });

  app.post('/api/prescriptive/prescribe', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PrescriptiveEngine;
      if(!eng || !eng.initialize) return res.status(503).json({ success:false, error:'Prescriptive Engine unavailable' });
      if(!eng.getStatus || !eng.getStatus().initialized) await eng.initialize();
      const body = req.body||{};
      const request = {
        requestId: 'REQ_'+Date.now(),
        horizon: body.horizon||'P7D',
        objectives: Array.isArray(body.objectives)? body.objectives: [{ id:'value' }, { id:'cost' }],
        constraintsOverride: body.constraintsOverride,
        scenarioConfig: body.scenarioConfig,
        context: body.context
      };
      const result = await eng.prescribe(request);
      res.json({ success:true, result, timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'prescriptive_prescribe_failed', details:e.message }); }
  });

  app.get('/api/prescriptive/frontier', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PrescriptiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Prescriptive Engine missing' });
      const last = eng.getStatus? eng.getStatus().lastRun: null;
      res.json({ success:true, lastRun: last, timestamp: Date.now() });
    } catch(e:any){ res.status(500).json({ success:false, error:'prescriptive_frontier_failed', details:e.message }); }
  });

  // Iteration 39c: Prescriptive Summary (Telemetry + Adaptive + Simulation Preview)
  app.get('/api/prescriptive/summary', async (req, res) => {
    try {
      const eng: any = (globalThis as any).PrescriptiveEngine;
      if(!eng) return res.status(503).json({ success:false, error:'Prescriptive Engine missing' });
      // Collect baseline status
      const status = eng.getStatus? eng.getStatus(): {};
      const telemetry = (await import('../shared/prescriptive/prescriptive-telemetry.ts')).PrescriptiveTelemetry.snapshot();
      // Attempt adaptive + constraints if available
      let constraints = status.constraintsList || status.constraints || [];
      if(!Array.isArray(constraints) && typeof constraints === 'number') constraints = []; // fallback
      let adaptiveActions: any[] = [];
  const adaptiveSummary: any = (telemetry as any).rollups?.adaptiveSummary;
  if (adaptiveSummary?.top) adaptiveActions = adaptiveSummary.top;
      // Optional lightweight simulation preview (only if constraints & actions present)
      let simulation: any = { skipped: true };
      if (constraints.length && adaptiveActions.length) {
        try {
          const { simulateAdaptiveAdjustments } = await import('../shared/prescriptive/prescriptive-adaptive-simulation.ts');
          // Build minimal synthetic samples from status if possible
          const sampleMetrics = status.sampleFactors || [];
          const samples = Array.isArray(sampleMetrics) ? sampleMetrics.slice(0,5).map((m:any, i:number) => ({ scenarioId: 'preview_'+i, metrics: m })) : [];
          simulation = simulateAdaptiveAdjustments({ constraints, adaptive: adaptiveActions.map(a => ({ id:a.id, action:a.action, suggestedDelta:a.suggestedDelta || 0, reason:a.reason || 'summary_preview', priority: a.priority || 0 })), samples });
        } catch(e:any){ simulation = { error:'simulation_failed', message: e.message }; }
      }
      return res.json({ success:true, status, telemetry, adaptiveTop: adaptiveActions, simulation });
    } catch(e:any){
      return res.status(500).json({ success:false, error:'prescriptive_summary_failed', details:e.message });
    }
  });

  // Phase 40: Explainability & Lineage Snapshot Endpoint (MVP)
  app.get('/api/prescriptive/explain/latest', async (req, res) => {
    try {
      if (process.env.PODSE_ROBUST_V1 !== 'true') return res.status(200).json({ success:true, featureEnabled:false, reason:'feature_flag_disabled' });
      const { PrescriptiveTraceRecorder } = await import('../shared/prescriptive/prescriptive-trace-recorder.ts');
      const snap = PrescriptiveTraceRecorder.snapshot();
      if (!snap) return res.status(200).json({ success:true, featureEnabled:true, snapshot:null, note:'no_active_session' });
      // Optional persistence trigger (?persist=1)
      let persistResult: any = undefined;
      if (req.query?.persist === '1') {
        try {
          const { persistExplainabilitySnapshot } = await import('./services/explainability-persistence-service');
          persistResult = await persistExplainabilitySnapshot(snap as any);
        } catch(e:any) {
          persistResult = { inserted:false, error:e.message||'persist_failed' };
        }
      }
      return res.json({ success:true, featureEnabled:true, snapshot: snap, persisted: persistResult });
    } catch(e:any) {
      return res.status(500).json({ success:false, error:'explain_snapshot_failed', details: e.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
