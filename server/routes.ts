import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
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
  getCurrentPersianDate,
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
import { registerCrmRoutes } from "./routes/crm-routes";
import { registerSettingsRoutes } from "./routes/settings-routes";
import bcrypt from "bcryptjs";
// Commented out temporarily - import { generateFinancialReport } from "./services/report-generator";

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
  
  // Register Workspace routes (DA VINCI v2.0) - temporarily bypass auth for testing
  const workspaceRoutes = (await import("./routes/workspace-routes")).default;
  app.use("/api/workspace", workspaceRoutes);
  
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
          generationTime: result.generationMetadata.generatedAt,
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
  
  // Authentication API
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

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "خطا در فرآیند خروج" });
      }
      res.clearCookie('connect.sid');
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

  // Representatives API - Protected
  app.get("/api/representatives", requireAuth, async (req, res) => {
    try {
      const representatives = await storage.getRepresentatives();
      res.json(representatives);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت نمایندگان" });
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
      
      // Don't expose sensitive data in public portal
      const publicData = {
        name: representative.name,
        code: representative.code,
        panelUsername: representative.panelUsername,
        totalDebt: representative.totalDebt,
        totalSales: representative.totalSales,
        credit: representative.credit,
        invoices: invoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          status: inv.status,
          usageData: inv.usageData // Include usage data for detailed view
        })),
        payments: payments.map(pay => ({
          amount: pay.amount,
          paymentDate: pay.paymentDate,
          description: pay.description
        }))
      };
      
      res.json(publicData);
    } catch (error) {
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

  // Invoices API - Protected
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت فاکتورها" });
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

      // فاز ۱: دریافت پارامترهای batch از request body
      const { batchName, periodStart, periodEnd, description } = req.body;
      console.log('Batch params:', { batchName, periodStart, periodEnd, description });

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
      const sequentialResult = await processUsageDataSequential(valid, storage);
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

  // فاز ۲: Delete invoice API - حذف فاکتور
  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      console.log('🔧 فاز ۲: حذف فاکتور');
      const invoiceId = parseInt(req.params.id);
      
      // Get invoice details for audit
      const invoice = await storage.getInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: "فاکتور یافت نشد" });
      }

      await storage.deleteInvoice(invoiceId);

      // Update representative financial data
      await storage.updateRepresentativeFinancials(invoice.representativeId);

      await storage.createActivityLog({
        type: "invoice_deleted",
        description: `فاکتور ${invoice.invoiceNumber} حذف شد`,
        relatedId: invoiceId,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          representativeId: invoice.representativeId,
          deletedBy: (req.session as any)?.user?.username || 'admin'
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      res.status(500).json({ error: "خطا در حذف فاکتور" });
    }
  });

  // فاز ۲: Get single invoice details API
  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
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

  // فاز ۲: Get invoices with batch information API
  app.get("/api/invoices/with-batch-info", requireAuth, async (req, res) => {
    try {
      console.log('🔧 فاز ۲: دریافت فاکتورها با اطلاعات batch');
      
      // Get all invoices with representative and batch info
      const invoices = await storage.getInvoices();
      const representatives = await storage.getRepresentatives();
      const batches = await storage.getInvoiceBatches();
      
      // Create lookup maps for performance
      const repMap = new Map(representatives.map(rep => [rep.id, rep]));
      const batchMap = new Map(batches.map(batch => [batch.id, batch]));
      
      // Enhance invoices with additional info
      const enhancedInvoices = invoices.map(invoice => {
        const rep = repMap.get(invoice.representativeId);
        const batch = invoice.batchId ? batchMap.get(invoice.batchId) : null;
        
        return {
          ...invoice,
          representativeName: rep?.name,
          representativeCode: rep?.code,
          batch: batch ? {
            id: batch.id,
            batchName: batch.batchName,
            batchCode: batch.batchCode
          } : null
        };
      });
      
      res.json(enhancedInvoices);
    } catch (error) {
      console.error('Error fetching invoices with batch info:', error);
      res.status(500).json({ error: "خطا در دریافت اطلاعات فاکتورها" });
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
      const result = await storage.autoAllocatePayments(representativeId);
      
      await storage.createActivityLog({
        type: "payment_auto_allocation",
        description: `تخصیص خودکار ${result.allocated} پرداخت برای نماینده ${representativeId}`,
        relatedId: representativeId,
        metadata: {
          allocatedCount: result.allocated,
          totalAmount: result.totalAmount,
          details: result.details
        }
      });

      res.json(result);
    } catch (error) {
      console.error('Error auto-allocating payments:', error);
      res.status(500).json({ error: "خطا در تخصیص خودکار پرداخت‌ها" });
    }
  });

  // Manual payment allocation API
  app.post("/api/payments/allocate", requireAuth, async (req, res) => {
    try {
      const { paymentId, invoiceId } = req.body;
      
      if (!paymentId || !invoiceId) {
        return res.status(400).json({ error: "شناسه پرداخت و فاکتور الزامی است" });
      }

      const updatedPayment = await storage.allocatePaymentToInvoice(paymentId, invoiceId);
      
      await storage.createActivityLog({
        type: "manual_payment_allocation",
        description: `پرداخت ${paymentId} به فاکتور ${invoiceId} تخصیص یافت`,
        relatedId: paymentId,
        metadata: {
          paymentId,
          invoiceId,
          amount: updatedPayment.amount
        }
      });

      res.json({ success: true, payment: updatedPayment });
    } catch (error) {
      console.error('Error allocating payment:', error);
      res.status(500).json({ error: "خطا در تخصیص دستی پرداخت" });
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

  // Send invoices to Telegram
  app.post("/api/invoices/send-telegram", requireAuth, async (req, res) => {
    try {
      const { invoiceIds, template } = req.body;
      
      if (!invoiceIds || !Array.isArray(invoiceIds)) {
        return res.status(400).json({ error: "شناسه فاکتورها مشخص نشده" });
      }

      // Get Telegram settings from environment variables or database
      let botToken = process.env.TELEGRAM_BOT_TOKEN;
      let chatId = process.env.TELEGRAM_CHAT_ID;
      
      console.log('Telegram Bot Token exists:', !!botToken);
      console.log('Telegram Chat ID exists:', !!chatId);
      console.log('Invoice IDs to process:', invoiceIds);
      
      // Fallback to database settings if env vars not available
      if (!botToken || !chatId) {
        const botTokenSetting = await storage.getSetting('telegram_bot_token');
        const chatIdSetting = await storage.getSetting('telegram_chat_id');
        
        console.log('DB Bot Token exists:', !!botTokenSetting?.value);
        console.log('DB Chat ID exists:', !!chatIdSetting?.value);
        
        if (!botTokenSetting || !chatIdSetting) {
          return res.status(400).json({ 
            error: "تنظیمات تلگرام کامل نیست - نیاز به توکن ربات و شناسه چت",
            hasEnvToken: !!botToken,
            hasEnvChatId: !!chatId,
            hasDbToken: !!botTokenSetting?.value,
            hasDbChatId: !!chatIdSetting?.value
          });
        }
        
        botToken = botTokenSetting.value;
        chatId = chatIdSetting.value;
      }

      // Get saved template from database
      const savedTemplate = await storage.getSetting('telegram_template');
      const messageTemplate = template || savedTemplate?.value || getDefaultTelegramTemplate();
      const invoices = [];
      
      // Get invoice details for each ID
      for (const id of invoiceIds) {
        const allInvoices = await storage.getInvoices();
        const invoice = allInvoices.find(inv => inv.id === id);
        
        console.log(`Processing invoice ${id}:`, !!invoice);
        
        if (invoice) {
          const representative = await storage.getRepresentative(invoice.representativeId);
          
          console.log(`Found representative for invoice ${id}:`, !!representative);
          
          if (representative) {
            const portalLink = `https://agent-portal-shield-info9071.replit.app/portal/${representative.publicId}`;
            
            invoices.push({
              representativeName: representative.name,
              representativeCode: representative.code,
              shopOwner: representative.ownerName || representative.name,
              panelId: representative.panelUsername,
              amount: invoice.amount,
              issueDate: invoice.issueDate,
              status: formatInvoiceStatus(invoice.status),
              portalLink,
              invoiceNumber: invoice.invoiceNumber,
              isResend: invoice.sentToTelegram || false,
              sendCount: (invoice.telegramSendCount || 0) + 1
            });
          }
        }
      }
      
      console.log(`Prepared ${invoices.length} invoices for Telegram`);

      const result = await sendBulkInvoicesToTelegram(
        botToken,
        chatId,
        invoices,
        messageTemplate
      );

      if (result.success > 0) {
        // Get user info for history tracking
        const sentBy = (req as any).user?.username || 'مدیر سیستم';
        
        await storage.markInvoicesAsSentToTelegramWithHistory(
          invoiceIds.slice(0, result.success), // Only successful ones
          sentBy,
          botToken,
          chatId,
          messageTemplate
        );
      }

      res.json({
        success: result.success,
        failed: result.failed,
        total: invoices.length
      });
    } catch (error) {
      console.error('خطا در ارسال به تلگرام:', error);
      res.status(500).json({ error: "خطا در ارسال پیام‌های تلگرام" });
    }
  });

  // Payments API - Protected
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت پرداخت‌ها" });
    }
  });

  app.post("/api/payments", requireAuth, async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(validatedData);
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "داده‌های ورودی نامعتبر", details: error.errors });
      } else {
        res.status(500).json({ error: "خطا در ثبت پرداخت" });
      }
    }
  });

  app.put("/api/payments/:id/allocate", requireAuth, async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { invoiceId } = req.body;
      
      await storage.allocatePaymentToInvoice(paymentId, invoiceId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در تخصیص پرداخت" });
    }
  });

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

  app.get("/api/invoices/with-batch-info", requireAuth, async (req, res) => {
    try {
      const invoicesWithBatch = await storage.getInvoicesWithBatchInfo();
      res.json(invoicesWithBatch);
    } catch (error) {
      console.error('Error fetching invoices with batch info:', error);
      res.status(500).json({ error: "خطا در دریافت فاکتورها با اطلاعات دسته" });
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
      const transactions = await storage.getFinancialTransactions();
      res.json(transactions);
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

  const httpServer = createServer(app);
  return httpServer;
}
