import { Express } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { z } from "zod";
import { sql, eq, desc, and, or, like, gte, lte, asc } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { IStorage } from "../storage";
import { db } from "../db";
import { representatives, invoices, payments, crmUsers, activityLogs } from "../../shared/schema";
import { XAIGrokEngine } from "../services/xai-grok-engine";
import { auditLogger } from "../services/audit-logger";
import { dataSnapshotService } from "../services/data-snapshot-service";
// Cleaned CRM routes for representatives management and AI helper only

// Cache invalidation function - exported for use by other modules
let invalidateCrmCacheRef: (() => void) | null = null;

export function invalidateCrmCache() {
  if (invalidateCrmCacheRef) {
    invalidateCrmCacheRef();
  }
}

export function registerCrmRoutes(app: Express, storage: IStorage) {
  // Initialize only essential services for clean CRM
  const xaiGrokEngine = new XAIGrokEngine(storage);
  
  // Initialize multer for audio file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
  });
  
  // CRM Authentication Middleware - Enhanced Cross-Panel Support
  const crmAuthMiddleware = (req: any, res: any, next: any) => {
    // Check multiple session authentication methods
    const isCrmAuthenticated = req.session?.crmAuthenticated === true || req.session?.crmUser;
    const isAdminAuthenticated = req.session?.authenticated === true && 
                                (req.session?.role === 'admin' || req.session?.role === 'ADMIN' || req.session?.role === 'SUPER_ADMIN');
    const isAuthenticated = isCrmAuthenticated || isAdminAuthenticated;
    
    // Debug logging removed - authentication working correctly
    
    if (isAuthenticated) {
      next();
    } else {
      res.status(401).json({ error: 'احراز هویت نشده - دسترسی غیرمجاز' });
    }
  };

  // Lightweight manager-gate utilities
  // Allow overriding TTL via env for testing or ops; default 30 minutes
  const MANAGER_TTL_MS_RAW = process.env.CRM_MANAGER_UNLOCK_TTL_MS;
  const MANAGER_TTL_MS = (() => {
    const def = 30 * 60 * 1000;
    if (!MANAGER_TTL_MS_RAW) return def;
    const n = Number(MANAGER_TTL_MS_RAW);
    return Number.isFinite(n) && n > 0 ? n : def;
  })();
  function isManagerUnlocked(req: any): boolean {
    const unlocked = req.session?.crmManager === true;
    const exp = req.session?.crmManagerExpiry ? Number(req.session.crmManagerExpiry) : 0;
    if (!unlocked || !exp) return false;
    if (Date.now() > exp) {
      // expire session gate
      req.session.crmManager = false;
      req.session.crmManagerExpiry = undefined;
      return false;
    }
    return true;
  }
  
  function getClientIp(req: any): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  
  // Professional rate limiting with express-rate-limit
  const managerUnlockLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 5, // 5 attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'تعداد تلاش‌های ناموفق زیاد است. لطفاً 15 دقیقه صبر کنید.',
      retryAfter: '15 minutes'
    },
    keyGenerator: (req) => getClientIp(req),
    handler: async (req, res) => {
      // Log rate limit hit
      await auditLogger.warning('crm_manager_unlock_rate_limit', 'محدودیت تعداد تلاش برای ورود مدیر CRM', {}, req);
      
      res.status(429).json({
        error: 'تعداد تلاش‌های ناموفق زیاد است. لطفاً 15 دقیقه صبر کنید.',
        retryAfter: '15 minutes'
      });
    }
  });

  // Exponential backoff for consecutive failed unlock attempts
  const unlockAttempts: Record<string, { count: number; lastAttempt: number }> = {};
  function applyExponentialBackoff(req: any, res: any, next: any) {
    const ip = getClientIp(req);
    const now = Date.now();
    const attempts = unlockAttempts[ip];
    
    if (attempts && attempts.count > 3) {
      const backoffTime = Math.min(30000 * Math.pow(2, attempts.count - 3), 300000); // Max 5 minutes
      const timeSinceLastAttempt = now - attempts.lastAttempt;
      
      if (timeSinceLastAttempt < backoffTime) {
        const remainingMs = backoffTime - timeSinceLastAttempt;
        return res.status(429).json({
          error: `تعداد تلاش‌های ناموفق زیاد. ${Math.ceil(remainingMs / 1000)} ثانیه دیگر تلاش کنید.`,
          retryAfterMs: remainingMs
        });
      }
    }
    
    next();
  }

  function trackUnlockAttempt(ip: string, success: boolean) {
    const now = Date.now();
    if (!unlockAttempts[ip]) unlockAttempts[ip] = { count: 0, lastAttempt: now };
    
    if (success) {
      delete unlockAttempts[ip]; // Reset on success
    } else {
      unlockAttempts[ip].count += 1;
      unlockAttempts[ip].lastAttempt = now;
    }
  }

  const generalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 100, // 100 requests per minute for general API
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید.',
      retryAfter: '1 minute'
    },
    keyGenerator: (req) => getClientIp(req)
  });

  // Manager gate middleware for privileged operations
  const requireManagerGate = async (req: any, res: any, next: any) => {
    if (!isManagerUnlocked(req)) {
      await auditLogger.warning('crm_manager_gate_required', 'تلاش دسترسی به عملیات مدیریتی بدون احراز هویت مدیر', {}, req);
      return res.status(403).json({ 
        error: 'برای انجام این عملیات باید ابتدا ورود مدیر را تأیید کنید',
        requiresManagerUnlock: true 
      });
    }
    next();
  };

  // ==================== OPTIMIZED ADMIN-CRM DATA SYNCHRONIZATION SERVICE ====================
  
  // Cache for sync status to avoid unnecessary operations
  let lastSyncTime = 0;
  const SYNC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  let cachedRepresentatives: any[] = [];
  
  // Cache invalidation function - exported globally
  const invalidateCrmCacheLocal = () => {
    console.log('🗑️ CRM Cache invalidated due to financial data change');
    lastSyncTime = 0;
    cachedRepresentatives = [];
  };
  
  // Set the reference so it can be called from outside
  invalidateCrmCacheRef = invalidateCrmCacheLocal;
  
  const syncAdminCrmData = async (forceSync = false) => {
    try {
      const now = Date.now();
      
      // Return cached data if recent sync exists and not forcing
      if (!forceSync && (now - lastSyncTime) < SYNC_CACHE_DURATION && cachedRepresentatives.length > 0) {
        console.log('📈 Using cached representatives data');
        return cachedRepresentatives;
      }
      
      console.log('🔄 Starting optimized representatives sync...');
      const startTime = Date.now();
      
      // Fetch all representatives (no individual sync needed - data already calculated)
      const adminReps = await db.select().from(representatives);
      
      // Cache the results
      cachedRepresentatives = adminReps;
      lastSyncTime = now;
      
      const syncTime = Date.now() - startTime;
      console.log(`✅ Sync completed in ${syncTime}ms for ${adminReps.length} representatives`);
      
      return adminReps;
    } catch (error) {
      console.error('❌ Admin-CRM sync error:', error);
      return cachedRepresentatives.length > 0 ? cachedRepresentatives : [];
    }
  };

  // ==================== UNIFIED CRM REPRESENTATIVES ENDPOINTS ====================
  
  // ==================== REPORT ANALYSIS ENDPOINTS (Explainability Preview) ====================
  app.get('/api/crm/reports/:id/analysis', crmAuthMiddleware, requireManagerGate, async (req, res) => {
    try {
      const reportId = req.params.id;
      const preview = String(req.query.preview || 'false') === 'true';
      // Try to load report
      const result = await db.execute(sql`SELECT id, task_id, staff_id, representative_id, content, submitted_at FROM task_reports WHERE id = ${reportId}`);
      if (!result.rows.length) {
        return res.status(404).json({ error: 'گزارش یافت نشد' });
      }
      const row = result.rows[0];
      const report = {
        id: row.id as string,
        taskId: row.task_id as string,
        staffId: row.staff_id as number,
        representativeId: row.representative_id as number,
        reportContent: row.content as string,
        completedAt: row.submitted_at as string,
        submittedAt: row.submitted_at as string
      };
      // If preview requested, analyze without persisting
      if (preview) {
        const { reportAnalyzer } = await import('../services/report-analyzer');
        const analysis = await reportAnalyzer.analyzeReport(report, { persist: false });
        return res.json({ preview: true, analysis });
      }
      // Otherwise fetch existing analysis, fallback to computing and saving
      const existing = await db.execute(sql`SELECT * FROM task_reports_analysis WHERE report_id = ${reportId} ORDER BY created_at DESC LIMIT 1`);
      if (existing.rows.length) {
        const r = existing.rows[0];
        return res.json({
          reportId,
          analysis: {
            reportId: r.report_id,
            keyInsights: r.key_insights,
            followUpActions: r.follow_up_actions,
            representativeUpdates: r.representative_updates,
            culturalContext: r.cultural_context,
            nextContactDate: r.next_contact_date,
            priorityLevel: r.priority_level,
            aiConfidence: r.ai_confidence
          }
        });
      }
      const { reportAnalyzer } = await import('../services/report-analyzer');
      const analysis = await reportAnalyzer.analyzeReport(report, { persist: true });
      return res.json({
        reportId,
        analysis
      });
    } catch (error) {
      console.error('Error getting report analysis:', error);
      res.status(500).json({ error: 'خطا در دریافت تحلیل گزارش' });
    }
  });

  // Trigger processing of pending reports (batch) - manager-gated
  app.post('/api/crm/reports/process-pending', crmAuthMiddleware, requireManagerGate, async (req, res) => {
    try {
      const { reportAnalyzer } = await import('../services/report-analyzer');
      const result = await reportAnalyzer.processPendingReports();
      res.json(result);
    } catch (error) {
      console.error('Error processing pending reports:', error);
      res.status(500).json({ error: 'خطا در پردازش گزارش‌های در انتظار' });
    }
  });
  
  // Statistics endpoint - Optimized with caching
  // SHERLOCK v11.0: CRM Statistics with Synchronized Batch-Based Active Count
  app.get("/api/crm/representatives/statistics", crmAuthMiddleware, async (req, res) => {
    try {
      const startTime = Date.now();
      const reps = await syncAdminCrmData(); // Use cached data
      
      // SHERLOCK v11.0: Import storage for batch-based calculation
      const { storage } = await import('../storage');
      const batchBasedActiveCount = await storage.getBatchBasedActiveRepresentatives();
      
      const stats = {
        totalCount: reps.length,
        activeCount: batchBasedActiveCount, // 🎯 SYNC: Now matches dashboard and admin panel calculation
        inactiveCount: reps.filter(r => !r.isActive).length,
        totalSales: reps.reduce((sum, r) => sum + parseFloat(r.totalSales || '0'), 0),
        totalDebt: reps.reduce((sum, r) => sum + parseFloat(r.totalDebt || '0'), 0),
        avgPerformance: reps.length > 0 ? Math.round((batchBasedActiveCount / reps.length) * 100) : 0,
        topPerformers: reps
          .sort((a, b) => parseFloat(b.totalSales || '0') - parseFloat(a.totalSales || '0'))
          .slice(0, 5)
          .map(r => ({
            id: r.id,
            name: r.name,
            code: r.code,
            totalSales: parseFloat(r.totalSales || '0'),
            isActive: r.isActive
          })),
        riskAlerts: reps.filter(r => parseFloat(r.totalDebt || '0') > 100000).length
      };
      
      const responseTime = Date.now() - startTime;
      console.log(`📊 SHERLOCK v11.0 CRM-SYNC: Statistics generated in ${responseTime}ms - Active: ${stats.activeCount} (batch-based)`);
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching representatives statistics:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار نمایندگان' });
    }
  });

  // ==================== PERFORMANCE SNAPSHOT ENDPOINTS ====================
  
  // High-performance Representatives with caching and advanced pagination
  app.get("/api/crm/representatives/snapshot", crmAuthMiddleware, generalApiLimiter, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
      const sort = (req.query.sort as string) || 'newest';
      const search = req.query.search as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      const filters: any = {};
      if (search) filters.search = search;
      if (isActive !== undefined) filters.isActive = isActive;

      const snapshot = await dataSnapshotService.getRepresentativesSnapshot({
        page,
        limit,
        sort: sort as any,
        filters
      });

      await auditLogger.info('crm_representatives_snapshot_accessed', `نمایش اسناپ‌شات نمایندگان صفحه ${page}`, {
        page,
        limit,
        sort,
        filters,
        cached: snapshot.cached,
        totalCount: snapshot.pagination.totalCount
      }, req);

      res.json(snapshot);
    } catch (error) {
      console.error('Error fetching representatives snapshot:', error);
      await auditLogger.error('crm_representatives_snapshot_error', 'خطا در دریافت اسناپ‌شات نمایندگان', { error: String(error) }, req);
      res.status(500).json({ error: 'خطا در دریافت اسناپ‌شات نمایندگان' });
    }
  });

  // High-performance Invoices with caching and advanced pagination  
  app.get("/api/crm/invoices/snapshot", crmAuthMiddleware, generalApiLimiter, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sort = (req.query.sort as string) || 'newest';
      const search = req.query.search as string;
      const status = req.query.status as string;
      const representativeId = req.query.representativeId ? parseInt(req.query.representativeId as string) : undefined;
      const sentToTelegram = req.query.sentToTelegram === 'true' ? true : req.query.sentToTelegram === 'false' ? false : undefined;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined;
      const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined;

      const filters: any = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (representativeId) filters.representativeId = representativeId;
      if (sentToTelegram !== undefined) filters.sentToTelegram = sentToTelegram;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (amountMin) filters.amountMin = amountMin;
      if (amountMax) filters.amountMax = amountMax;

      const snapshot = await dataSnapshotService.getInvoicesSnapshot({
        page,
        limit,
        sort: sort as any,
        filters
      });

      await auditLogger.info('crm_invoices_snapshot_accessed', `نمایش اسناپ‌شات فاکتورها صفحه ${page}`, {
        page,
        limit,
        sort,
        filters,
        cached: snapshot.cached,
        totalCount: snapshot.pagination.totalCount
      }, req);

      res.json(snapshot);
    } catch (error) {
      console.error('Error fetching invoices snapshot:', error);
      await auditLogger.error('crm_invoices_snapshot_error', 'خطا در دریافت اسناپ‌شات فاکتورها', { error: String(error) }, req);
      res.status(500).json({ error: 'خطا در دریافت اسناپ‌شات فاکتورها' });
    }
  });

  // High-performance Payments with caching and advanced pagination
  app.get("/api/crm/payments/snapshot", crmAuthMiddleware, generalApiLimiter, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const sort = (req.query.sort as string) || 'newest';
      const representativeId = req.query.representativeId ? parseInt(req.query.representativeId as string) : undefined;
      const isAllocated = req.query.isAllocated === 'true' ? true : req.query.isAllocated === 'false' ? false : undefined;
      const amountMin = req.query.amountMin ? parseFloat(req.query.amountMin as string) : undefined;
      const amountMax = req.query.amountMax ? parseFloat(req.query.amountMax as string) : undefined;

      const filters: any = {};
      if (representativeId) filters.representativeId = representativeId;
      if (isAllocated !== undefined) filters.isAllocated = isAllocated;
      if (amountMin) filters.amountMin = amountMin;
      if (amountMax) filters.amountMax = amountMax;

      const snapshot = await dataSnapshotService.getPaymentsSnapshot({
        page,
        limit,
        sort: sort as any,
        filters
      });

      await auditLogger.info('crm_payments_snapshot_accessed', `نمایش اسناپ‌شات پرداخت‌ها صفحه ${page}`, {
        page,
        limit,
        sort,
        filters,
        cached: snapshot.cached,
        totalCount: snapshot.pagination.totalCount
      }, req);

      res.json(snapshot);
    } catch (error) {
      console.error('Error fetching payments snapshot:', error);
      await auditLogger.error('crm_payments_snapshot_error', 'خطا در دریافت اسناپ‌شات پرداخت‌ها', { error: String(error) }, req);
      res.status(500).json({ error: 'خطا در دریافت اسناپ‌شات پرداخت‌ها' });
    }
  });

  // High-performance Dashboard with aggressive caching
  app.get("/api/crm/dashboard/snapshot", crmAuthMiddleware, generalApiLimiter, async (req, res) => {
    try {
      const snapshot = await dataSnapshotService.getDashboardSnapshot();

      await auditLogger.info('crm_dashboard_snapshot_accessed', 'نمایش اسناپ‌شات داشبورد', {
        cached: snapshot.cached,
        cacheExpiry: snapshot.cacheExpiry
      }, req);

      res.json(snapshot);
    } catch (error) {
      console.error('Error fetching dashboard snapshot:', error);
      await auditLogger.error('crm_dashboard_snapshot_error', 'خطا در دریافت اسناپ‌شات داشبورد', { error: String(error) }, req);
      res.status(500).json({ error: 'خطا در دریافت اسناپ‌شات داشبورد' });
    }
  });

  // ==================== AI ASSISTANT: OFFERS RECOMMENDATION ====================
  app.post('/api/crm/ai/recommendations/offers', crmAuthMiddleware, async (req, res) => {
    try {
      const { representativeId, context } = req.body || {};
      if (!representativeId) {
        return res.status(400).json({ error: 'شناسه نماینده الزامی است' });
      }
      const { settingsStorage } = await import('../services/settings-storage');
      const offers = await settingsStorage.getOffers();
      // Basic ranking: prefer active, within validity, and with higher aiRecommendationScore / acceptanceRate
      const now = Date.now();
      const scored = offers
        .filter((o: any) => o.isActive !== false)
        .map((o: any) => {
          const validFrom = o.validFrom ? new Date(o.validFrom).getTime() : 0;
          const validUntil = o.validUntil ? new Date(o.validUntil).getTime() : Infinity;
          const inWindow = now >= validFrom && now <= validUntil;
          const rec = Number(o.aiRecommendationScore || 0);
          const acc = Number(o.acceptanceRate || 0);
          const base = rec * 0.6 + acc * 0.4;
          const windowBoost = inWindow ? 10 : 0;
          // Simple context signals
          const ctxBoost = context?.debtHigh ? 5 : 0;
          return { offer: o, score: base + windowBoost + ctxBoost };
        })
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5)
        .map((x: any) => ({ ...x.offer, _score: x.score }));

      return res.json({ offers: scored });
    } catch (e) {
      console.error('Offers recommendation error:', e);
      return res.status(500).json({ error: 'خطا در پیشنهاد آفرها' });
    }
  });

  // ==================== AI ASSISTANT: CALL SESSION ====================
  // Start a call session: stores transient session state and returns initial guidance
  app.post('/api/crm/ai/session/start', crmAuthMiddleware, async (req, res) => {
    try {
      const { representativeId, staffId, reason, context } = req.body || {};
      if (!representativeId || !staffId || !reason) {
        return res.status(400).json({ error: 'نماینده، کارمند و دلیل شروع تماس الزامی است' });
      }
      const sessionId = `CALL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const s: any = req.session;
      if (!s.aiCallSessions) s.aiCallSessions = {};
      s.aiCallSessions[sessionId] = {
        representativeId,
        staffId,
        reason,
        context: context || {},
        startedAt: new Date().toISOString()
      };

      // Provide simple initial guidance (no external calls)
      const guidance = {
        checklist: [
          'معرفی کوتاه و محترمانه',
          'هدف تماس را شفاف بیان کنید',
          'وضعیت فعلی نماینده را بپرسید',
          'در صورت مناسب بودن، پیشنهاد مناسب ارائه دهید'
        ],
        tone: 'RESPECTFUL',
        culturalTips: ['با احترام آغاز کنید', 'حفظ ادب و صبر در مکالمه']
      };

      return res.json({ sessionId, initialGuidance: guidance, nextSteps: ['طرح پرسش‌های کلیدی', 'گوش‌دادن فعال'] });
    } catch (e) {
      console.error('AI call session start error:', e);
      return res.status(500).json({ error: 'خطا در شروع جلسه تماس' });
    }
  });

  // Complete a call session: records summary to support logs and returns evaluation
  app.post('/api/crm/ai/session/complete', crmAuthMiddleware, async (req, res) => {
    try {
      const { sessionId, outcome, notes, offerPresentedId, scheduledNextContact } = req.body || {};
      const s: any = req.session;
      if (!sessionId || !s?.aiCallSessions?.[sessionId]) {
        return res.status(400).json({ error: 'جلسه معتبر یافت نشد' });
      }
      const sess = s.aiCallSessions[sessionId];

      // Persist a lightweight support log entry
      const { representativeSupportLogs } = await import('../../shared/schema');
      await db.insert(representativeSupportLogs).values({
        id: sessionId,
        representativeId: Number(sess.representativeId),
        staffId: Number(sess.staffId),
        interactionDate: new Date().toISOString().slice(0, 10).replace(/-/g, '/'),
        taskId: undefined,
        reportId: undefined,
        summary: notes?.summary || outcome?.summary || 'تماس تکمیل شد',
        issues: notes?.issues || [],
        resolution: notes?.resolution || '',
        nextSteps: notes?.nextSteps || [],
        responseTime: undefined,
        satisfactionLevel: notes?.satisfactionLevel || 'MEDIUM',
        followUpRequired: Boolean(scheduledNextContact)
      } as any);

      // Simple evaluation stub
      const evaluation = {
        repScore: 75,
        staffScore: 80,
        tips: ['با تشکر مکالمه را جمع‌بندی کنید', 'زمان تماس بعدی را قطعی کنید']
      };

      // Cleanup session entry
      delete s.aiCallSessions[sessionId];
      return res.json({ evaluation, followUps: scheduledNextContact ? [{ type: 'CALL', when: scheduledNextContact }] : [] });
    } catch (e) {
      console.error('AI call session complete error:', e);
      return res.status(500).json({ error: 'خطا در تکمیل جلسه تماس' });
    }
  });

  // Cache management endpoints (manager access required)
  app.get("/api/crm/cache/stats", crmAuthMiddleware, requireManagerGate, async (req, res) => {
    try {
      const stats = dataSnapshotService.getCacheStats();
      await auditLogger.info('crm_cache_stats_accessed', 'نمایش آمار کش سیستم', stats, req);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار کش' });
    }
  });

  app.delete("/api/crm/cache/clear", crmAuthMiddleware, requireManagerGate, async (req, res) => {
    try {
      const pattern = req.query.pattern as string;
      
      if (pattern) {
        dataSnapshotService.clearCachePattern(pattern);
        await auditLogger.warning('crm_cache_pattern_cleared', `پاک‌سازی کش با الگوی: ${pattern}`, { pattern }, req);
      } else {
        dataSnapshotService.clearCache();
        await auditLogger.warning('crm_cache_full_clear', 'پاک‌سازی کامل کش سیستم', {}, req);
      }

      res.json({ success: true, message: pattern ? `کش با الگوی ${pattern} پاک شد` : 'کش کاملاً پاک شد' });
    } catch (error) {
      console.error('Error clearing cache:', error);
      await auditLogger.error('crm_cache_clear_error', 'خطا در پاک‌سازی کش', { error: String(error) }, req);
      res.status(500).json({ error: 'خطا در پاک‌سازی کش' });
    }
  });

  // GET Representatives with SQL-backed filtering/sorting and cache fallback
  app.get("/api/crm/representatives", crmAuthMiddleware, async (req, res) => {
    const startTime = Date.now();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string || '').trim();
    const sortBy = (req.query.sortBy as string || 'name');
    const sortOrder = (req.query.sortOrder as string || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const offset = (page - 1) * limit;

    // Map sortBy to column
    const sortCol = (() => {
      switch (sortBy) {
        case 'totalSales': return representatives.totalSales;
        case 'totalDebt': return representatives.totalDebt;
        case 'code': return representatives.code;
        case 'ownerName': return representatives.ownerName;
        default: return representatives.name;
      }
    })();

    try {
      // Prefer SQL path for scalability
      const whereClauses: any[] = [];
      if (search) {
        // Use ILIKE for case-insensitive search
        whereClauses.push(or(
          sql`lower(${representatives.name}) like ${`%${search.toLowerCase()}%`}`,
          sql`lower(${representatives.code}) like ${`%${search.toLowerCase()}%`}`,
          sql`lower(${representatives.ownerName}) like ${`%${search.toLowerCase()}%`}`
        ));
      }

      const baseQuery = db.select().from(representatives);
      const countQuery = db.select({ count: sql<number>`count(*)` }).from(representatives);
      const whereExpr = whereClauses.length ? and(...whereClauses) : undefined;

      const [rows, totalRow] = await Promise.all([
        (whereExpr ? baseQuery.where(whereExpr) : baseQuery)
          .orderBy(sortOrder === 'desc' ? desc(sortCol as any) : asc(sortCol as any))
          .limit(limit)
          .offset(offset),
        (whereExpr ? countQuery.where(whereExpr) : countQuery)
      ]);

      const total = Number((totalRow as any)[0]?.count || 0);
      const totalPages = Math.ceil(total / limit) || 1;
      const responseTime = Date.now() - startTime;

      return res.json({
        data: rows,
        pagination: { page, limit, total, totalPages },
        engine: 'SQL',
        responseTimeMs: responseTime
      });
    } catch (err) {
      console.warn('SQL path for representatives failed, falling back to cached path:', err);
      try {
        const allRepresentatives = await syncAdminCrmData();
        let filtered = allRepresentatives;
        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter((r: any) =>
            r.name?.toLowerCase().includes(s) ||
            r.code?.toLowerCase().includes(s) ||
            r.ownerName?.toLowerCase().includes(s)
          );
        }
        const sortFn = (a: any, b: any) => {
          const pick = (r: any) => {
            switch (sortBy) {
              case 'totalSales': return Number(r.totalSales || 0);
              case 'totalDebt': return Number(r.totalDebt || 0);
              case 'code': return r.code || '';
              case 'ownerName': return r.ownerName || '';
              default: return r.name || '';
            }
          };
          const av = pick(a); const bv = pick(b);
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av === bv) return 0;
          return sortOrder === 'desc' ? (av < bv ? 1 : -1) : (av > bv ? 1 : -1);
        };
        filtered.sort(sortFn);
        const total = filtered.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const slice = filtered.slice(offset, offset + limit);
        return res.json({
          data: slice,
          pagination: { page, limit, total, totalPages },
          engine: 'CACHE',
        });
      } catch (e2) {
        console.error('Fallback path failed:', e2);
        return res.status(500).json({ error: 'خطا در دریافت فهرست نمایندگان' });
      }
    }
  });

  // Get single representative details - Optimized with cache (supports both ID and code)
  app.get("/api/crm/representatives/:id", crmAuthMiddleware, async (req, res) => {
    try {
      const allReps = await syncAdminCrmData(); // Use cached data
      
      const identifier = req.params.id;
      const numericId = parseInt(identifier);
      
      // Find by either numeric ID or code for flexibility
      const rep = isNaN(numericId) 
        ? allReps.find(r => r.code === identifier)
        : allReps.find(r => r.id === numericId || r.code === identifier);
      
      if (!rep) {
        return res.status(404).json({ error: 'نماینده یافت نشد' });
      }
      
      const representativeInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.representativeId, rep.id))
        .orderBy(desc(invoices.createdAt))
        .limit(10);
        
      const representativePayments = await db
        .select()
        .from(payments)
        .where(eq(payments.representativeId, rep.id))
        .orderBy(desc(payments.createdAt))
        .limit(10);

      // Fetch last support log if exists
      const { representativeSupportLogs } = await import('../../shared/schema');
      const lastSupportLogRows = await db
        .select()
        .from(representativeSupportLogs)
        .where(eq(representativeSupportLogs.representativeId, rep.id))
        .orderBy(desc(representativeSupportLogs.createdAt))
        .limit(1);
      const lastSupportLog = lastSupportLogRows[0] || null;

      // Compute financial snapshot (read-only mirror)
      const unpaidCountResult = await db
        .select()
        .from(invoices)
        .where(eq(invoices.representativeId, rep.id));
      const unpaidInvoicesCount = unpaidCountResult.filter((inv: any) => inv.status !== 'paid').length;
      const lastPaymentDate = representativePayments[0]?.createdAt || null;

      // Activity log for viewing representative detail
      try {
        await db.insert(activityLogs).values({
          type: 'crm_view_representative',
          description: `نمایش جزئیات نماینده ${rep.name} (${rep.id})`,
          relatedId: rep.id,
          metadata: { by: req.session?.crmUser?.username || 'unknown', at: new Date().toISOString() }
        });
      } catch (e) {
        // non-blocking
      }
      
      res.json({
        representative: rep,
        invoices: representativeInvoices,
        payments: representativePayments,
        syncStatus: 'CACHED_OPTIMIZED',
        financialSnapshot: {
          totalDebt: rep.totalDebt,
          credit: rep.credit,
          unpaidInvoicesCount,
          lastPaymentDate
        },
        support: {
          lastLog: lastSupportLog || undefined
        },
        summary: {
          totalInvoices: representativeInvoices.length,
          totalPayments: representativePayments.length,
          lastActivity: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching representative details:', error);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات نماینده' });
    }
  });

  // Read-only Financial Snapshot endpoint
  app.get("/api/crm/representatives/:id/financial", crmAuthMiddleware, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const repList = await db.select().from(representatives).where(eq(representatives.id, representativeId)).limit(1);
      if (!repList.length) return res.status(404).json({ error: 'نماینده یافت نشد' });
      const rep = repList[0];

      const invs = await db.select().from(invoices).where(eq(invoices.representativeId, representativeId));
      const pays = await db.select().from(payments).where(eq(payments.representativeId, representativeId)).orderBy(desc(payments.createdAt)).limit(1);
      const unpaidInvoicesCount = invs.filter((i: any) => i.status !== 'paid').length;
      const lastPaymentDate = pays[0]?.createdAt || null;

      return res.json({
        totalDebt: rep.totalDebt,
        credit: rep.credit,
        unpaidInvoicesCount,
        lastPaymentDate
      });
    } catch (error) {
      console.error('Error fetching financial snapshot:', error);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات مالی' });
    }
  });

  // Mirror-only policy: Creating representatives from CRM is not allowed
  app.post("/api/crm/representatives", crmAuthMiddleware, async (req, res) => {
    try {
      await auditLogger.warning('crm_representative_create_blocked', 'تلاش برای ایجاد نماینده از CRM مسدود شد (سیاست فقط-آینه)', {
        payloadKeys: Object.keys(req.body || {})
      }, req as any);
    } catch {}
    return res.status(403).json({ error: 'ایجاد نماینده از طریق CRM مجاز نیست. فقط از پنل ادمین.' });
  });

  // Mirror-only policy: Updating representatives from CRM is not allowed
  app.put("/api/crm/representatives/:id", crmAuthMiddleware, async (req, res) => {
    try {
      await auditLogger.warning('crm_representative_update_blocked', 'تلاش برای ویرایش نماینده از CRM مسدود شد (سیاست فقط-آینه)', {
        id: req.params?.id,
        payloadKeys: Object.keys(req.body || {})
      }, req as any);
    } catch {}
    return res.status(403).json({ error: 'ویرایش نماینده از طریق CRM مجاز نیست. فقط از پنل ادمین.' });
  });

  // Deprecated: Debt sync from CRM is not allowed (read-only mirror policy)
  app.post("/api/crm/representatives/:id/sync-debt", crmAuthMiddleware, async (_req, res) => {
    return res.status(403).json({ error: 'این عملیات در CRM مجاز نیست. اطلاعات مالی فقط خواندنی است.' });
  });

  // ==================== CRM AUTHENTICATION ====================
  
  app.post("/api/crm/auth/login", generalApiLimiter, async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است" });
      }

      const crmUser = await db.select().from(crmUsers).where(eq(crmUsers.username, username)).limit(1);
      
      if (!crmUser.length || !crmUser[0].isActive) {
        return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
      }

      const user = crmUser[0];
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: "نام کاربری یا رمز عبور اشتباه است" });
      }

      await db.update(crmUsers).set({ lastLoginAt: new Date() }).where(eq(crmUsers.id, user.id));

      // Enhanced session management with proper persistence
      req.session.crmAuthenticated = true;
      req.session.crmUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName || '',
        role: user.role || '',
        permissions: user.permissions as string[] || [],
        panelType: 'CRM_PANEL'
      };

      // Force session save to ensure persistence
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: "خطا در ذخیره جلسه" });
        }
        
        console.log('✅ CRM Session saved successfully:', {
          sessionId: req.sessionID,
          user: req.session.crmUser,
          authenticated: req.session.crmAuthenticated
        });
        
        res.json({
          success: true,
          message: "ورود موفقیت‌آمیز به سیستم CRM",
          user: req.session.crmUser,
          sessionId: req.sessionID,
          debugInfo: {
            sessionSaved: true,
            timestamp: new Date().toISOString()
          }
        });
      });
    } catch (error) {
      console.error('CRM login error:', error);
      res.status(500).json({ error: "خطا در ورود به سیستم" });
    }
  });

  app.get("/api/crm/auth/user", (req, res) => {
    console.log('🔍 CRM Auth Check - Session Data:', {
      sessionId: req.sessionID,
      crmAuthenticated: req.session?.crmAuthenticated,
      crmUser: req.session?.crmUser,
      hasSession: !!req.session,
      sessionObject: req.session
    });
    
    if (req.session?.crmAuthenticated && req.session?.crmUser) {
      console.log('✅ CRM Auth Success - Returning user:', req.session.crmUser);
      res.json(req.session.crmUser);
    } else {
      console.log('❌ CRM Auth Failed - Session invalid or expired');
      res.status(401).json({ error: "احراز هویت نشده" });
    }
  });

  // CRM Payment routes are disabled (mirror-only). Return 403.
  app.post("/api/crm/payments", crmAuthMiddleware, async (_req, res) => {
    return res.status(403).json({ error: 'ثبت پرداخت از CRM مجاز نیست. فقط نمایش اطلاعات مالی.' });
  });
  app.post("/api/crm/payments/auto-allocate/:representativeId", crmAuthMiddleware, async (_req, res) => {
    return res.status(403).json({ error: 'تخصیص پرداخت از CRM مجاز نیست.' });
  });

  app.post("/api/crm/auth/logout", (req, res) => {
    req.session.crmAuthenticated = false;
    req.session.crmUser = undefined;
    res.json({ success: true, message: "خروج موفقیت‌آمیز" });
  });

  // Manager unlock (UI password → server session gate with TTL)
  app.post('/api/crm/auth/manager-unlock', crmAuthMiddleware, managerUnlockLimiter, applyExponentialBackoff, async (req: any, res: any) => {
    try {
      const { password } = req.body || {};
      const envPassword = process.env.CRM_MANAGER_PASSWORD;
      let expected = envPassword;
      if (!expected) {
        const isDev = (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');
        if (isDev) {
          expected = 'Aa867945';
          console.warn('CRM_MANAGER_PASSWORD not set; using development fallback password. Do NOT use this in production.');
        } else {
          return res.status(500).json({ success: false, error: 'پیکربندی نامعتبر: رمز مدیر تنظیم نشده است' });
        }
      }
      
      const ip = getClientIp(req);
      if (!password || password !== expected) {
        trackUnlockAttempt(ip, false);
        return res.status(401).json({ success: false, error: 'رمز نادرست' });
      }
      
      trackUnlockAttempt(ip, true); // Reset backoff on success
      req.session.crmManager = true;
      req.session.crmManagerExpiry = Date.now() + MANAGER_TTL_MS;
      await new Promise<void>((resolve) => req.session.save(() => resolve()));

      await auditLogger.info('crm_manager_unlock', 'دسترسی مدیر CRM فعال شد', {
        expiresAt: new Date(Number(req.session.crmManagerExpiry)).toISOString()
      }, req);

      return res.json({ success: true, ttlMs: MANAGER_TTL_MS });
    } catch (e) {
      console.error('Manager unlock error:', e);
      return res.status(500).json({ success: false, error: 'خطای داخلی' });
    }
  });

  // Manager gate status endpoint to facilitate UX without triggering 403 flows
  app.get('/api/crm/auth/manager-status', crmAuthMiddleware, async (req: any, res: any) => {
    const unlocked = req.session?.crmManager === true;
    const exp = req.session?.crmManagerExpiry ? Number(req.session.crmManagerExpiry) : 0;
    const remainingMs = unlocked && exp ? Math.max(0, exp - Date.now()) : 0;
    if (unlocked && exp && Date.now() > exp) {
      req.session.crmManager = false;
      req.session.crmManagerExpiry = undefined;
      return res.json({ unlocked: false, remainingMs: 0, ttlMs: MANAGER_TTL_MS });
    }
    return res.json({ unlocked: unlocked && remainingMs > 0, remainingMs, ttlMs: MANAGER_TTL_MS });
  });

  // ==================== AUDIT LOG MANAGEMENT ====================
  
  // Audit logs viewer (manager gate protected)
  app.get('/api/crm/audit/logs', crmAuthMiddleware, requireManagerGate, async (req: any, res: any) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 50));
      const offset = (page - 1) * limit;
      const type = req.query.type as string;
      const severity = req.query.severity as string;

      let logs;
      if (type) {
        logs = await auditLogger.getLogsByType(type, limit);
      } else if (severity) {
        logs = await auditLogger.getLogsBySeverity(severity as any, limit);
      } else {
        logs = await auditLogger.getRecentLogs(limit, offset);
      }

      await auditLogger.info('audit_logs_viewed', 'مشاهده لاگ‌های سیستم', { 
        filters: { type, severity, page, limit } 
      }, req);

      res.json({ success: true, data: logs, page, limit });
    } catch (error) {
      await auditLogger.error('audit_logs_view_error', 'خطا در مشاهده لاگ‌ها', { error: String(error) }, req);
      res.status(500).json({ error: 'خطا در بارگیری لاگ‌ها' });
    }
  });

  // Export audit logs (CSV format)
  app.get('/api/crm/audit/export', crmAuthMiddleware, requireManagerGate, async (req: any, res: any) => {
    try {
      const logs = await auditLogger.getRecentLogs(1000); // Max 1000 for export
      
      // Simple CSV generation
      const csvHeader = 'ID,Type,Description,User,IP,Severity,Created At\n';
      const csvRows = logs.map(log => {
        const safeValue = (val: any) => String(val || '').replace(/"/g, '""');
        return `${log.id},"${safeValue(log.type)}","${safeValue(log.description)}","${safeValue(log.userId)}","${safeValue(log.ipAddress)}","${safeValue(log.severity)}","${safeValue(log.createdAt)}"`;
      }).join('\n');
      
      await auditLogger.info('audit_logs_exported', 'صادرات لاگ‌های سیستم', { 
        exportedCount: logs.length 
      }, req);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csvHeader + csvRows); // BOM for UTF-8
    } catch (error) {
      await auditLogger.error('audit_logs_export_error', 'خطا در صادرات لاگ‌ها', { error: String(error) }, req);
      res.status(500).json({ error: 'خطا در صادرات لاگ‌ها' });
    }
  });
}