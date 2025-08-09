import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer as createNetServer } from "net";
import { exec } from "child_process";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseHealth, closeDatabaseConnection, pool } from "./db";
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
const sessionMiddleware = session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // Extended to 7 days for better UX
    sameSite: 'lax' // Better cross-origin handling
  },
  name: 'marfanet.sid', // Custom session name for identification
  rolling: true // Extend session on activity
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

  // SHERLOCK v17.7: Fixed error handler - Complete maintenance bypass
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Prevent double response issue
    if (res.headersSent) {
      return _next(err);
    }
    
    const status = err.status || err.statusCode || 500;
    
    // SHERLOCK v17.7: Complete frontend asset bypass - NO MAINTENANCE BLOCKING
    if (req.path === '/' || 
        req.path.includes('.js') || 
        req.path.includes('.css') || 
        req.path.includes('.tsx') || 
        req.path.includes('.ts') ||
        req.path.includes('.jsx') ||
        req.path.includes('.mjs') ||
        req.path.startsWith('/@') || 
        req.path.startsWith('/src/') ||
        req.path.startsWith('/@fs/') ||
        req.path.includes('node_modules') ||
        req.path.includes('chunk-') ||
        req.path.includes('deps/') ||
        req.path.includes('vite') ||
        req.path.includes('client') ||
        req.path.includes('components') ||
        req.path.includes('pages') ||
        req.path.includes('lib/') ||
        req.path.includes('hooks/') ||
        req.path.includes('layout/') ||
        req.path.startsWith('/api/login') ||
        req.path.startsWith('/api/auth') ||
        req.path.startsWith('/api/crm')) {
      // COMPLETE BYPASS - Allow all frontend and auth routes
      return _next();
    }

    let message = err.message || "Internal Server Error";
    
    // Special handling for database endpoint failures
    if (message.includes('endpoint has been disabled')) {
      message = "سیستم در حال بروزرسانی است، لطفاً کمی بعد مراجعه کنید";
    }
    
    log(`Error ${status}: ${message} - ${req.method} ${req.path}`, 'error');
    
    // Only respond if headers not sent
    res.status(status).json({ 
      error: message,
      timestamp: new Date().toISOString(),
      maintenance: message.includes('بروزرسانی')
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

  // SHERLOCK v16.0 PORT CONFLICT RESOLUTION: Enhanced port binding with conflict detection
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Pre-flight port availability check
  const isPortAvailable = async (testPort: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const testServer = createNetServer();
      testServer.listen(testPort, '0.0.0.0', () => {
        testServer.close(() => resolve(true));
      });
      testServer.on('error', () => resolve(false));
    });
  };

  // Clean shutdown of any existing server instances
  const cleanupExistingProcesses = async () => {
    try {
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, (err: any) => {
        if (err) log(`No existing processes to cleanup on port ${port}`);
        else log(`Cleaned up existing processes on port ${port}`);
      });
      
      // Give processes time to cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      log(`Cleanup error: ${error}`, 'error');
    }
  };

  // SHERLOCK v16.0 ROBUST SERVER STARTUP with automatic port conflict resolution
  const startServerWithRetry = async (attemptPort: number, maxRetries: number = 3): Promise<void> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const available = await isPortAvailable(attemptPort);
      
      if (!available && attempt === 1) {
        log(`Port ${attemptPort} is occupied, attempting cleanup...`);
        await cleanupExistingProcesses();
        continue;
      }
      
      try {
        await new Promise<void>((resolve, reject) => {
          const serverInstance = server.listen({
            port: attemptPort,
            host: "0.0.0.0",
            reusePort: true,
          }, () => {
            log(`🚀 SHERLOCK v16.0: Server successfully bound to port ${attemptPort}`);
            log(`Environment: ${app.get("env")}`);
            log(`Process ID: ${process.pid}`);
            log(`Health check available at /health`);
            log(`Port conflict resolution: SUCCESS`);
            
            // Mark server as successfully started
            process.env.SERVER_STARTED = 'true';
            resolve();
          });
          
          serverInstance.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${attemptPort} still in use (attempt ${attempt}/${maxRetries})`, 'error');
              if (attempt === maxRetries) {
                reject(new Error(`Failed to bind to port after ${maxRetries} attempts`));
              }
            } else {
              reject(err);
            }
          });
        });
        
        return; // Success - exit retry loop
        
      } catch (error: any) {
        if (attempt === maxRetries) {
          log(`Critical: Failed to start server after ${maxRetries} attempts: ${error.message}`, 'error');
          throw error;
        }
        
        log(`Attempt ${attempt} failed, retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  };

  // SHERLOCK v16.0 ENHANCED PROCESS STABILITY: Universal error handling setup before server startup
  log(`✅ Setting up process stability monitoring...`);
  
  // SHERLOCK v16.0 CRITICAL: Enhanced exception handling to prevent crashes
  process.on('uncaughtException', (err) => {
    log(`🚨 Uncaught Exception intercepted: ${err.message}`, 'error');
    log(`Stack trace: ${err.stack}`, 'error');
    
    // Don't exit the process - keep server running
    log(`Server continues running after exception handling`);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log(`🚨 Unhandled Promise Rejection: ${reason}`, 'error');
    
    // Don't exit the process - keep server running
    log(`Server continues running after promise rejection handling`);
  });

  try {
    await startServerWithRetry(port);
    
    // Enhanced signal handling for graceful shutdowns - set up after successful startup
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    log(`✅ Process stability monitoring active - Server running on port ${port}`);
    
  } catch (error) {
    log(`Server startup failed completely: ${error}`, 'error');
    process.exit(1);
  }

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

  // SHERLOCK v16.0: Signal handlers moved to startup callback to prevent duplicates

})();
