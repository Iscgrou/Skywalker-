// Load environment variables as early as possible so downstream imports (e.g., db.ts) see them
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseHealth, closeDatabaseConnection, getPool } from "./db";
import { performanceMonitoringMiddleware } from "./middleware/performance";


const app = express();

// Fix for Replit GCE deployment - trust proxy for authentication
app.set('trust proxy', true);

// Enhanced CORS and security headers with special handling for portal routes
app.use((req, res, next) => {
  // Set comprehensive CORS headers for all origins in production
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Check if this is a portal route (public access)
  const isPortalRoute = req.path.startsWith('/portal') || req.path.startsWith('/api/portal');
  
  if (isPortalRoute) {
    // Relaxed security headers for portal routes to improve Android browser compatibility
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'ALLOWALL'); // Allow iframe embedding for portal
    res.header('Referrer-Policy', 'no-referrer-when-downgrade');
    res.header('Cache-Control', 'public, max-age=300'); // Allow caching for portal content
    res.header('Pragma', 'public');
    
    // Additional headers for Android browser compatibility
    res.header('X-UA-Compatible', 'IE=edge,chrome=1');
    res.header('X-DNS-Prefetch-Control', 'on');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  } else {
    // Strict security headers for admin routes
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Session configuration - Skip session for public portal routes
const PgSession = connectPgSimple(session);
const pgPool = getPool();
// Fallback to in-memory store if database pool unavailable (e.g., memory-mode / tests)
const sessionStore = pgPool ? new PgSession({
  pool: pgPool,
  tableName: 'session',
  createTableIfMissing: true
}) : new session.MemoryStore();

const sessionMiddleware = session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in prod behind HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // absolute max cookie lifetime
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'marfanet.sid',
  rolling: true
});

// Apply session middleware for all non-portal routes
app.use((req, res, next) => {
  const isPortalRoute = req.path.startsWith('/portal') || req.path.startsWith('/api/portal');
  
  if (isPortalRoute) {
    // Skip session middleware for portal routes to avoid authentication issues
    next();
  } else {
    // Apply session middleware for admin and CRM routes
    sessionMiddleware(req, res, next);
  }
});

// Performance monitoring middleware
app.use(performanceMonitoringMiddleware);

// Session idle and absolute timeout enforcement
const IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS || 30 * 60 * 1000); // 30m
const ABSOLUTE_TIMEOUT_MS = Number(process.env.SESSION_ABSOLUTE_TIMEOUT_MS || 7 * 24 * 60 * 60 * 1000); // 7d
app.use((req, res, next) => {
  // Skip for portal and health endpoints
  if (req.path.startsWith('/portal') || req.path.startsWith('/api/portal') || req.path === '/health' || req.path === '/ready') {
    return next();
  }
  const s: any = (req as any).session;
  if (!s) return next();
  const now = Date.now();
  if (!s.createdAt) s.createdAt = now;
  if (!s.lastActivity) s.lastActivity = now;
  const idle = now - s.lastActivity;
  const age = now - s.createdAt;
  if (idle > IDLE_TIMEOUT_MS || age > ABSOLUTE_TIMEOUT_MS) {
    // Destroy session and signal expiry
    req.session.destroy(() => {
      res.status(401).json({ error: 'SESSION_EXPIRED', reason: idle > IDLE_TIMEOUT_MS ? 'IDLE_TIMEOUT' : 'ABSOLUTE_TIMEOUT' });
    });
    return;
  }
  // Update last activity timestamp
  s.lastActivity = now;
  next();
});

// Response compression middleware  
// Compression middleware removed for simplified system

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Special middleware for Android browser compatibility
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const isAndroid = /Android/.test(userAgent);
  const isPortalRoute = req.path.startsWith('/portal') || req.path.startsWith('/api/portal');
  
  if (isAndroid && isPortalRoute) {
    // Additional Android-specific headers for better compatibility
    res.header('Accept-Ranges', 'bytes');
    res.header('Content-Security-Policy', 'default-src \'self\' \'unsafe-inline\' \'unsafe-eval\' data: blob:; connect-src \'self\' *');
    res.header('X-Permitted-Cross-Domain-Policies', 'none');
    res.header('X-Download-Options', 'noopen');
    
    // Remove problematic headers that cause issues on some Android browsers
    res.removeHeader('X-XSS-Protection');
    res.removeHeader('Strict-Transport-Security');
  }
  
  next();
});

// Increase timeout for large file processing
app.use((req, res, next) => {
  // Set timeout to 10 minutes for file upload endpoints
  if (req.path === '/api/invoices/generate') {
    req.setTimeout(10 * 60 * 1000); // 10 minutes
    res.setTimeout(10 * 60 * 1000); // 10 minutes
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Database health check before starting server
  log('Checking database connection...');
  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    log('Warning: Database connection failed during startup', 'database');
    // Continue starting server - will retry connections as needed
  } else {
    log('Database connection successful', 'database');
  }

  const server = await registerRoutes(app);

  // R3/R5: Start real-time aggregator & rollup writer
  try {
    // R11: Cluster coordinator (start early to decide leader responsibilities)
    import('./services/cluster-coordinator').then(m=>{
      m.clusterCoordinator.start();
    });
    const { intelAggregator } = await import('./services/intel-aggregator');
    intelAggregator.start(5000);
    log('[Intel] Aggregator started (5s)');
    import('./services/intel-rollup-writer').then(m=>{
      const jitter = 1500 + Math.random()*2000;
      setTimeout(async ()=> { const cc = (await import('./services/cluster-coordinator')).clusterCoordinator; if (cc.isLeader()) { m.intelRollupWriter.start(); log('[Intel] Rollup writer started (leader)'); } else { log('[Intel] Rollup writer skipped (follower)'); } }, jitter);
    });
    // R6: Adaptive thresholds (after short delay to allow initial rollups)
    import('./services/intel-adaptive-thresholds').then(m=>{
      const delay = 5000 + Math.random()*4000; // 5-9s
      setTimeout(()=> { m.intelAdaptiveThresholds.start(); log('[Intel] Adaptive thresholds service started'); }, delay);
    });
    // R7: Correlation graph (start after adaptive thresholds stabilization)
    import('./services/intel-correlation-graph').then(m=>{
      const delay = 12_000 + Math.random()*4000; // ~12-16s post aggregator
      setTimeout(async ()=> { const cc = (await import('./services/cluster-coordinator')).clusterCoordinator; if (cc.isLeader()) { m.intelCorrelationGraph.start(); log('[Intel] Correlation graph service started (leader)'); } else { log('[Intel] Correlation graph skipped (follower)'); } }, delay);
    });
    // R8: Predictive engine (start after correlation graph ~ later)
    import('./services/intel-predictive-engine').then(m=>{
      const delay = 20_000 + Math.random()*5000; // start ~20-25s after aggregator
      setTimeout(async ()=> { const cc = (await import('./services/cluster-coordinator')).clusterCoordinator; if (cc.isLeader()) { m.intelPredictiveEngine.start(); log('[Intel] Predictive engine started (leader)'); } else { log('[Intel] Predictive engine skipped (follower)'); } }, delay);
    });
    // R9: Prescriptive engine (after predictive stabilization)
    import('./services/intel-prescriptive-engine').then(m=>{
      const delay = 30_000 + Math.random()*5000; // ~30-35s after aggregator
      setTimeout(async ()=> { const cc = (await import('./services/cluster-coordinator')).clusterCoordinator; if (cc.isLeader()) { m.intelPrescriptiveEngine.start(); log('[Intel] Prescriptive engine started (leader)'); } else { log('[Intel] Prescriptive engine skipped (follower)'); } }, delay);
    });
    // R10: Scenario engine (after prescriptive)
    import('./services/intel-scenario-engine').then(m=>{
      const delay = 40_000 + Math.random()*5000; // ~40-45s after aggregator
      setTimeout(async ()=> { const cc = (await import('./services/cluster-coordinator')).clusterCoordinator; if (cc.isLeader()) { m.intelScenarioEngine.start(); log('[Intel] Scenario engine started (leader)'); } else { log('[Intel] Scenario engine skipped (follower)'); } }, delay);
    });
  } catch(e:any){
    log(`[Intel] Startup error: ${e.message}`,'error');
  }

  // Ensure unmatched API routes never fall through to SPA (strict)
  app.all(/^\/api\//, (req, res) => {
    return res.status(404).json({ error: 'API route not found', path: req.path, method: req.method });
  });

  // SHERLOCK v16.2 DEPLOYMENT STABILITY: Enhanced health endpoints with comprehensive checks
  app.get('/health', async (req, res) => {
    try {
      const dbHealthy = await checkDatabaseHealth();
      const memoryUsage = process.memoryUsage();
      
      res.status(200).json({ 
        status: 'healthy', 
        timestamp: Date.now(),
        environment: app.get("env"),
        uptime: process.uptime(),
        pid: process.pid,
        services: {
          database: dbHealthy ? 'connected' : 'disconnected',
          financial: 'running',
          crm: 'running',
          auth: 'running',
          sync: 'simplified'
        },
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        }
      });
    } catch (error) {
      log(`Health check error: ${error}`, 'error');
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: Date.now(),
        error: 'Internal service error'
      });
    }
  });
  
  app.get('/ready', (req, res) => {
    res.status(200).json({ 
      status: 'ready', 
      timestamp: Date.now(),
      environment: app.get("env"),
      version: '16.2',
      uptime: process.uptime()
    });
  });

  // Enhanced error handling middleware with logging
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    log(`Error ${status}: ${message} - ${req.method} ${req.path}`, 'error');
    
    // Don't crash the server, just log and respond
    res.status(status).json({ 
      error: message,
      timestamp: new Date().toISOString()
    });
  });

  // Enhanced SPA routing middleware for portal compatibility
  app.use((req, res, next) => {
    // Skip this middleware for API routes
    if (req.path.startsWith('/api/')) {
      return next();
    }
    
    // Special handling for portal routes
    if (req.path.startsWith('/portal/')) {
      // Set portal-specific headers for better Android compatibility
      res.header('Content-Type', 'text/html; charset=utf-8');
      res.header('X-UA-Compatible', 'IE=edge');
      res.header('Viewport', 'width=device-width, initial-scale=1.0');
    }
    
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`Environment: ${app.get("env")}`);
    log(`Health check available at /health`);
    // Iteration 30: Schedule adaptive prune job (hourly)
    import('./services/strategy-adaptive-prune-service.ts').then(m=>{
      const jitter = 60_000 + Math.floor(Math.random()*120_000); // 1-3 min
      setTimeout(()=>{
        const run = async ()=>{
          try { const res = await m.adaptivePruneService.runPrune(); log(`[Prune] totalDeleted=${res.totalDeleted} tables=${res.summary.length}`); }
          catch(e:any){ log(`[Prune] error ${e.message}`,'error'); }
        };
        run();
        setInterval(run, 60*60*1000);
      }, jitter);
    });
    
    // Iteration R2: Initialize Adaptive Intelligence Services
    // Initialize R2 Adaptive Intelligence Services
    setTimeout(async () => {
      try {
        log('[Adaptive] Initializing R2 Adaptive Intelligence Services...');
        
        // Import all services
        const behaviorModule = await import('./services/behavior-analytics-service');
        const anomalyModule = await import('./services/anomaly-analysis-service');
        const autoTuningModule = await import('./services/system-auto-tuning-service');
        
        // Initialize behavior analytics with initial data load
        try {
          const profilesLoaded = await behaviorModule.behaviorAnalytics.processRecentLogs(24);
          log(`[Adaptive] Behavior analytics service initialized: ${profilesLoaded.updated} user profiles loaded`);
        } catch (e: any) {
          log(`[Adaptive] Error initializing behavior analytics: ${e.message}`, 'error');
        }
        
        // Initialize anomaly detection system
        try {
          const anomalyStatus = await anomalyModule.anomalyAnalysis.initialize();
          log(`[Adaptive] Anomaly analysis service initialized: ${anomalyStatus.alertCount} historical alerts loaded`);
        } catch (e: any) {
          log(`[Adaptive] Error initializing anomaly analysis: ${e.message}`, 'error');
        }
        
        // Initialize auto-tuning system
        try {
          const paramCount = autoTuningModule.systemAutoTuning.getAllParameters().length;
          log(`[Adaptive] System auto-tuning service initialized: ${paramCount} parameters configured`);
          
          // Schedule first auto-tuning operation after system stabilizes (5 minutes)
          setTimeout(async () => {
            try {
              const tuningResult = await autoTuningModule.systemAutoTuning.autoTuneParameters();
              log(`[Adaptive] Initial auto-tuning completed: ${tuningResult.tuned} parameters adjusted`);
            } catch (e: any) {
              log(`[Adaptive] Error in initial auto-tuning: ${e.message}`, 'error');
            }
          }, 5 * 60 * 1000);
        } catch (e: any) {
          log(`[Adaptive] Error initializing auto-tuning: ${e.message}`, 'error');
        }
        
      } catch (e: any) {
        log(`[Adaptive] Error initializing adaptive intelligence services: ${e.message}`, 'error');
      }
    }, 2000); // Wait for 2 seconds after server start
    
    // Iteration 33: Initialize Advanced Security Intelligence Engine
    import('./services/strategy-advanced-security-intelligence.ts').then(async (m) => {
      try {
        // Start security intelligence after all other services are ready
        setTimeout(async () => {
          const result = await m.advancedSecurityIntelligenceEngine.start();
          
          if (result.success) {
            log(`[Security] Advanced Security Intelligence Engine started: ${result.message}`);
            
            // Test initial security status
            try {
              const status = m.advancedSecurityIntelligenceEngine.getSystemStatus();
              log(`[Security] Security system operational - Components: ${Object.keys(status.components).length}, Pipeline active: ${status.pipeline.collection.status}`);
              
              // Generate initial security report
              const report = await m.advancedSecurityIntelligenceEngine.generateComprehensiveReport();
              log(`[Security] Initial security report generated - Posture: ${report.executiveSummary.securityPosture}, Threats: ${report.executiveSummary.threatsDetected}`);
              
            } catch (e: any) {
              log(`[Security] Initial security report warning: ${e.message}`, 'warn');
            }
          } else {
            log(`[Security] Failed to start Security Intelligence Engine: ${result.message}`, 'error');
          }
          
        }, 12000); // Wait 12 seconds for all systems to stabilize including Real-time Intelligence
        
      } catch (e: any) {
        log(`[Security] Security Intelligence initialization failed: ${e.message}`, 'error');
      }
    });

    // Iteration 34: Initialize Intelligent Business Operations Engine
    import('./services/strategy-intelligent-business-operations.ts').then(async (m) => {
      try {
        // Start business operations after security and intelligence are ready
        setTimeout(async () => {
          const businessOpsEngine = new m.IntelligentBusinessOperationsEngine({
            enableRealTimeOperations: true,
            enableAutomatedDecisionMaking: true,
            enableProcessOptimization: true,
            enableCrossSystemIntegration: true,
            enableExecutiveDashboard: true,
            operationsPriority: 'balanced',
            maxConcurrentOperations: 50,
            businessValueThreshold: 100000 // 100K rials minimum
          });

          // Make globally available for API access
          (global as any).intelligentBusinessOperationsEngine = businessOpsEngine;
          
          log(`[BusinessOperations] Intelligent Business Operations Engine started`);
          log(`[BusinessOperations] - Real-time operations: ENABLED`);
          log(`[BusinessOperations] - Automated decision making: ENABLED`);
          log(`[BusinessOperations] - Process optimization: ENABLED`);
          log(`[BusinessOperations] - Cross-system integration: ENABLED`);
          log(`[BusinessOperations] - Executive dashboard: ENABLED`);
          
          // Test initial business operations summary
          try {
            const summary = businessOpsEngine.getBusinessOperationsSummary('daily');
            log(`[BusinessOperations] Initial summary generated - Efficiency: ${summary.metrics.operationalEfficiency}%, Value: ${summary.metrics.businessValueGenerated.toLocaleString()} rials`);
            
            const kpis = businessOpsEngine.getExecutiveKPIs();
            log(`[BusinessOperations] Executive KPIs initialized: ${kpis.length} KPIs available`);
            
          } catch (e: any) {
            log(`[BusinessOperations] Initial summary warning: ${e.message}`, 'warn');
          }
          
        }, 15000); // Wait 15 seconds for security and intelligence to be fully operational
        
      } catch (e: any) {
        log(`[BusinessOperations] Business Operations initialization failed: ${e.message}`, 'error');
      }
    });

    // Iteration 32: Initialize Real-time Intelligence Engine
    import('./services/strategy-realtime-intelligence-integration.ts').then(async (m) => {
      try {
        // Start intelligence integration after a brief delay for system warmup
        setTimeout(async () => {
          await m.realTimeIntelligenceIntegrationService.startIntegration();
          log(`[Intelligence] Real-time Intelligence Engine started with business intelligence bridge`);
          
          // Test initial dashboard generation
          try {
            const dashboard = await m.realTimeIntelligenceIntegrationService.generateIntelligenceDashboard();
            log(`[Intelligence] Initial dashboard generated: ${dashboard.systemOverview.activeInsights} insights, health score ${dashboard.systemOverview.healthScore}`);
          } catch (e: any) {
            log(`[Intelligence] Initial dashboard generation warning: ${e.message}`, 'warn');
          }
          
        }, 8000); // Wait 8 seconds for all adaptive services to stabilize
        
      } catch (e: any) {
        log(`[Intelligence] Initialization failed: ${e.message}`, 'error');
      }
    }).catch(e => {
      log(`[Intelligence] Import failed: ${e.message}`, 'error');
    });

    // Iteration 31: Initialize Auto-Policy Evolution Engine
    import('./services/strategy-auto-policy-integration.ts').then(async (m) => {
      try {
        // Start periodic evaluation every 15 minutes
        m.autoPolicyIntegrationService.startPeriodicEvaluation(15);
        log(`[AutoPolicy] Evolution engine started with 15-minute evaluation cycles`);
        
        // Optional: Initialize dependencies if available
        // Dependencies will be injected when services are fully loaded
        setTimeout(async () => {
          try {
            const deps: any = {
              adaptiveRunner: null, // Will be resolved when needed
              suppressionService: null,
              escalationService: null,
              alertQueryService: null
            };
            
            // Try to inject actual services (graceful fallback if not available)
            try {
              const { adaptiveWeightsRunner } = await import('./services/strategy-adaptive-runner.ts');
              deps.adaptiveRunner = adaptiveWeightsRunner;
            } catch (e) { log(`[AutoPolicy] AdaptiveRunner not available: ${e}`); }
            
            try {
              const { governanceAlertSuppressionService } = await import('./services/strategy-governance-alert-suppression-service.ts');
              deps.suppressionService = governanceAlertSuppressionService;
            } catch (e) { log(`[AutoPolicy] SuppressionService not available: ${e}`); }
            
            m.autoPolicyIntegrationService.initializeDependencies(deps);
            log(`[AutoPolicy] Dependencies initialized (some may be mocked)`);
            
          } catch (e: any) {
            log(`[AutoPolicy] Dependency initialization failed: ${e.message}`, 'warn');
          }
        }, 5000); // Wait 5 seconds for services to load
        
      } catch (e: any) {
        log(`[AutoPolicy] Initialization failed: ${e.message}`, 'error');
      }
    }).catch(e => {
      log(`[AutoPolicy] Import failed: ${e.message}`, 'error');
    });
    
    // Iteration 35: Initialize Strategic Decision Support Engine
    import('../strategy-strategic-decision-support-engine.ts').then(async (m) => {
      try {
        // Initialize Strategic Decision Support Engine after all other systems are operational
        setTimeout(async () => {
          const StrategicDecisionSupportEngine = m.default;
          const strategicEngine = new StrategicDecisionSupportEngine();
          
          // Store globally for API access
          (global as any).strategicDecisionSupportEngine = strategicEngine;
          
          // Initialize the strategic engine
          await strategicEngine.initialize();
          
          log(`[Strategic] Strategic Decision Support Engine initialized successfully`);
          log(`[Strategic] - Executive intelligence aggregation: ENABLED`);
          log(`[Strategic] - Advanced scenario planning: ENABLED`);
          log(`[Strategic] - Cognitive bias detection: ENABLED`);
          log(`[Strategic] - Strategic risk assessment: ENABLED`);
          log(`[Strategic] - Executive dashboard engine: ENABLED`);
          log(`[Strategic] - Strategic communication hub: ENABLED`);
          log(`[Strategic] - Cross-functional coordination: ENABLED`);
          
          // Test initial strategic status
          try {
            const status = await strategicEngine.getStrategicSystemStatus();
            log(`[Strategic] Initial status - System health: ${status.systemHealth}%, Executive satisfaction: ${status.businessMetrics.executiveSatisfaction}/10`);
            log(`[Strategic] Performance metrics - Decision quality: ${status.businessMetrics.decisionQuality}, Strategic value: ${status.businessMetrics.strategicValue}`);
            log(`[Strategic] Active executives: ${status.operationalMetrics.activeExecutives}, Daily decisions: ${status.operationalMetrics.dailyDecisions}`);
            
          } catch (e: any) {
            log(`[Strategic] Initial status warning: ${e.message}`, 'warn');
          }
          
        }, 20000); // Wait 20 seconds for all previous systems to be fully operational
        
      } catch (e: any) {
        log(`[Strategic] Strategic Decision Support Engine initialization failed: ${e.message}`, 'error');
      }
    }).catch(e => {
      log(`[Strategic] Import failed: ${e.message}`, 'error');
    });

    // Iteration 36: Initialize Predictive Analytics & Forecasting Engine (PAFE)
    import('../predictive-analytics-engine.ts').then(async (m) => {
      try {
        // Delay to ensure Strategic engine has initialized first and upstream systems stabilized
        setTimeout(async () => {
          const PredictiveAnalyticsEngine = m.PredictiveAnalyticsEngine || (m as any).default || (global as any).PredictiveEngine?.constructor;
          let predictiveEngineInstance: any = (global as any).PredictiveEngine;
          if(!predictiveEngineInstance && PredictiveAnalyticsEngine){
            predictiveEngineInstance = new PredictiveAnalyticsEngine();
            (global as any).PredictiveEngine = predictiveEngineInstance;
          }

          if(!predictiveEngineInstance){
            log(`[Predictive] Predictive engine constructor unresolved`, 'warn');
            return;
          }

            try {
              await predictiveEngineInstance.initialize();
              log(`[Predictive] Predictive Analytics & Forecasting Engine initialized successfully`);
              log(`[Predictive] - Data ingestion & quality signals: ENABLED`);
              log(`[Predictive] - Feature store & aggregations: ENABLED`);
              log(`[Predictive] - Models hub & uncertainty bands: ENABLED`);
              log(`[Predictive] - Governance & performance watchdog: ENABLED`);
              log(`[Predictive] - Serving orchestrator (cache + latency metrics): ENABLED`);
              log(`[Predictive] - Insight synthesis & accuracy tracking: ENABLED`);
              log(`[Predictive] - Integration bridge (publication counters): ENABLED`);
              log(`[Predictive] - Security wrapper (role gating): ENABLED`);

              try {
                const status = predictiveEngineInstance.getStatus();
                log(`[Predictive] Initial status - Initialized: ${status.initialized}, Model versions: ${status.modelVersions?.length}`);
                log(`[Predictive] Serving metrics - Total served: ${status.serving.totalServed}, Cache hits: ${status.serving.cacheHits}, Avg latency: ${status.serving.averageLatencyMs?.toFixed?.(2)}ms`);
              } catch(e:any){
                log(`[Predictive] Initial status retrieval warning: ${e.message}`, 'warn');
              }
            } catch(e:any){
              log(`[Predictive] Initialization error: ${e.message}`, 'error');
            }

        }, 25000); // Wait 25 seconds (after Strategic engine) for ordered startup

      } catch (e: any) {
        log(`[Predictive] Predictive engine import handling failed: ${e.message}`, 'error');
      }
    }).catch(e => {
      log(`[Predictive] Import failed: ${e.message}`, 'error');
    });

    // Iteration 37: Initialize Prescriptive Optimization & Decision Simulation Engine (PODSE)
    import('../prescriptive-orchestrator.ts').then(async (m) => {
      try {
        setTimeout(async () => {
          let prescriptiveEngine: any = (global as any).PrescriptiveEngine;
          if(!prescriptiveEngine){
            const { PrescriptiveEngine } = m as any;
            if(PrescriptiveEngine){
              prescriptiveEngine = new PrescriptiveEngine();
              (global as any).PrescriptiveEngine = prescriptiveEngine;
            }
          }
          if(!prescriptiveEngine){
            log(`[Prescriptive] Engine constructor unresolved`, 'warn');
            return;
          }
          try {
            await prescriptiveEngine.initialize();
            log(`[Prescriptive] Prescriptive Optimization & Decision Simulation Engine initialized`);
            log(`[Prescriptive] - Objective & Policy registry: ENABLED`);
            log(`[Prescriptive] - Constraint & feasibility manager: ENABLED`);
            log(`[Prescriptive] - Scenario sandbox & sampling: ENABLED`);
            log(`[Prescriptive] - Optimization core (heuristic seed): ENABLED`);
            log(`[Prescriptive] - Pareto frontier builder: ENABLED`);
            log(`[Prescriptive] - Guardrails & ethical filters: ENABLED`);
            log(`[Prescriptive] - Explanation generator: ENABLED`);
            log(`[Prescriptive] - Integration readiness (future events): ENABLED`);
            try {
              const status = prescriptiveEngine.getStatus? prescriptiveEngine.getStatus(): { initialized:false };
              log(`[Prescriptive] Initial status - Initialized: ${status.initialized}, Objectives: ${status.objectives?.length}, Constraints: ${status.constraints}`);
            } catch(e:any){
              log(`[Prescriptive] Status retrieval warning: ${e.message}`, 'warn');
            }
          } catch(e:any){
            log(`[Prescriptive] Initialization error: ${e.message}`, 'error');
          }
        }, 30000); // start after predictive (25s) for ordered chain
      } catch(e:any){
        log(`[Prescriptive] Import handling failed: ${e.message}`, 'error');
      }
    }).catch(e => {
      log(`[Prescriptive] Import failed: ${e.message}`, 'error');
    });
    
    // SHERLOCK v16.2 DEPLOYMENT STABILITY: Enhanced process persistence
    if (app.get("env") === "production") {
      log(`Production server started successfully`);
      log(`Process ID: ${process.pid}`);
      
      // Keep process alive and handle unexpected exits
      process.on('SIGTERM', () => log('SIGTERM received, preparing graceful shutdown...'));
      process.on('SIGINT', () => log('SIGINT received, preparing graceful shutdown...'));
      
      // Prevent process exit on uncaught exceptions
      process.on('uncaughtException', (err) => {
        log(`Uncaught Exception: ${err.message}`, 'error');
        // Don't exit in production, just log
      });
      
      process.on('unhandledRejection', (reason, promise) => {
        log(`Unhandled Rejection at Promise: ${reason}`, 'error');
        // Don't exit in production, just log
      });
    }
  });

  // Graceful shutdown handling for production stability
  const gracefulShutdown = async (signal: string) => {
    log(`Received ${signal} signal, starting graceful shutdown...`);
    
    try {
      // Close HTTP server
      server.close(async () => {
        log('HTTP server closed');
        
        // Close database connections
        await closeDatabaseConnection();
        
        log('Graceful shutdown complete');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        log('Force shutdown after timeout');
        process.exit(1);
      }, 10000);
      
    } catch (error) {
      log(`Error during shutdown: ${error}`, 'error');
      process.exit(1);
    }
  };

  // Handle various termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle uncaught exceptions to prevent crashes
  process.on('uncaughtException', (error) => {
    log(`Uncaught Exception: ${error.message}`, 'error');
    console.error(error.stack);
    // Don't exit - let the server continue running
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(`Unhandled Rejection at promise: ${reason}`, 'error');
    // Don't exit - let the server continue running
  });

})();
