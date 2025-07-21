import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
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
  insertPaymentSchema 
} from "@shared/schema";
import { parseUsageJsonData, processUsageData, validateUsageData, getOrCreateDefaultSalesPartner, createRepresentativeFromUsageData } from "./services/invoice";
import { 
  sendInvoiceToTelegram, 
  sendBulkInvoicesToTelegram, 
  getDefaultTelegramTemplate, 
  formatInvoiceStatus 
} from "./services/telegram";
import { 
  analyzeFinancialData, 
  analyzeRepresentative, 
  generateFinancialReport, 
  answerFinancialQuestion 
} from "./services/gemini";

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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Dashboard API
  app.get("/api/dashboard", async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      res.json(dashboardData);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت اطلاعات داشبورد" });
    }
  });

  // Representatives API
  app.get("/api/representatives", async (req, res) => {
    try {
      const representatives = await storage.getRepresentatives();
      res.json(representatives);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت نمایندگان" });
    }
  });

  app.get("/api/representatives/:code", async (req, res) => {
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

  app.post("/api/representatives", async (req, res) => {
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

  app.put("/api/representatives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const representative = await storage.updateRepresentative(id, req.body);
      res.json(representative);
    } catch (error) {
      res.status(500).json({ error: "خطا در بروزرسانی نماینده" });
    }
  });

  app.delete("/api/representatives/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRepresentative(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در حذف نماینده" });
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
          status: inv.status
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

  // Sales Partners API
  app.get("/api/sales-partners", async (req, res) => {
    try {
      const partners = await storage.getSalesPartners();
      res.json(partners);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت همکاران فروش" });
    }
  });

  app.post("/api/sales-partners", async (req, res) => {
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

  // Invoices API
  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت فاکتورها" });
    }
  });

  app.get("/api/invoices/telegram-pending", async (req, res) => {
    try {
      const invoices = await storage.getInvoicesForTelegram();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت فاکتورهای در انتظار ارسال" });
    }
  });

  // Invoice generation from JSON file
  app.post("/api/invoices/generate", upload.single('usageFile'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "فایل JSON ارسال نشده است" });
      }

      const jsonData = req.file.buffer.toString('utf-8');
      const usageRecords = parseUsageJsonData(jsonData);
      
      const { valid, invalid } = validateUsageData(usageRecords);
      
      console.log(`تعداد رکوردهای معتبر: ${valid.length}, غیرمعتبر: ${invalid.length}`);
      if (invalid.length > 0) {
        console.log("نمونه رکورد غیرمعتبر:", invalid[0]);
      }
      if (valid.length > 0) {
        console.log("نمونه رکورد معتبر:", valid[0]);
      }
      
      if (valid.length === 0) {
        return res.status(400).json({ 
          error: "هیچ رکورد معتبری یافت نشد", 
          totalRecords: usageRecords.length,
          invalidSample: invalid.slice(0, 3),
          details: "بررسی کنید که فایل JSON شامل فیلدهای admin_username و amount باشد"
        });
      }

      const processedInvoices = processUsageData(valid);
      const createdInvoices = [];
      const newRepresentatives = [];
      
      // Get or create default sales partner for new representatives  
      const defaultSalesPartnerId = await getOrCreateDefaultSalesPartner(db);
      
      // Process each invoice and auto-create representatives if needed
      for (const processedInvoice of processedInvoices) {
        // Try to find representative by admin_username (panelUsername)
        let representative = await storage.getRepresentativeByPanelUsername(processedInvoice.panelUsername) ||
                           await storage.getRepresentativeByCode(processedInvoice.representativeCode);
        
        // If representative doesn't exist, create new one
        if (!representative) {
          const newRepData = await createRepresentativeFromUsageData(
            processedInvoice.panelUsername, 
            db,
            defaultSalesPartnerId
          );
          
          representative = await storage.createRepresentative(newRepData);
          newRepresentatives.push(representative);
        }
        
        if (representative) {
          const invoice = await storage.createInvoice({
            representativeId: representative.id,
            amount: processedInvoice.amount.toString(),
            issueDate: processedInvoice.issueDate,
            dueDate: processedInvoice.dueDate,
            status: "unpaid",
            usageData: processedInvoice.usageData
          });
          createdInvoices.push({
            ...invoice,
            representativeName: representative.name,
            representativeCode: representative.code
          });
        }
      }

      res.json({
        success: true,
        created: createdInvoices.length,
        newRepresentatives: newRepresentatives.length,
        invalid: invalid.length,
        invoices: createdInvoices,
        createdRepresentatives: newRepresentatives,
        invalidRecords: invalid
      });
    } catch (error) {
      console.error('خطا در تولید فاکتور:', error);
      res.status(500).json({ error: "خطا در پردازش فایل JSON" });
    }
  });

  // Send invoices to Telegram
  app.post("/api/invoices/send-telegram", async (req, res) => {
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

      const messageTemplate = template || getDefaultTelegramTemplate();
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
            const portalLink = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/portal/${representative.publicId}`;
            
            invoices.push({
              representativeName: representative.name,
              representativeCode: representative.code,
              shopOwner: representative.ownerName || representative.name,
              panelId: representative.panelUsername,
              amount: invoice.amount,
              issueDate: invoice.issueDate,
              status: formatInvoiceStatus(invoice.status),
              portalLink,
              invoiceNumber: invoice.invoiceNumber
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
        await storage.markInvoicesAsSentToTelegram(invoiceIds);
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

  // Payments API
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await storage.getPayments();
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت پرداخت‌ها" });
    }
  });

  app.post("/api/payments", async (req, res) => {
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

  app.put("/api/payments/:id/allocate", async (req, res) => {
    try {
      const paymentId = parseInt(req.params.id);
      const { invoiceId } = req.body;
      
      await storage.allocatePaymentToInvoice(paymentId, invoiceId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در تخصیص پرداخت" });
    }
  });

  // Activity Logs API
  app.get("/api/activity-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getActivityLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت فعالیت‌ها" });
    }
  });

  // Settings API
  app.get("/api/settings/:key", async (req, res) => {
    try {
      const setting = await storage.getSetting(req.params.key);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت تنظیمات" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const { value } = req.body;
      const setting = await storage.updateSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      res.status(500).json({ error: "خطا در بروزرسانی تنظیمات" });
    }
  });

  // AI Assistant API
  app.post("/api/ai/analyze-financial", async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      const analysis = await analyzeFinancialData(
        dashboardData.totalRevenue,
        dashboardData.totalDebt,
        dashboardData.activeRepresentatives,
        dashboardData.overdueInvoices
      );
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "خطا در تحلیل مالی هوشمند" });
    }
  });

  app.post("/api/ai/analyze-representative", async (req, res) => {
    try {
      const { representativeCode } = req.body;
      const representative = await storage.getRepresentativeByCode(representativeCode);
      
      if (!representative) {
        return res.status(404).json({ error: "نماینده یافت نشد" });
      }

      const invoices = await storage.getInvoicesByRepresentative(representative.id);
      
      const analysis = await analyzeRepresentative({
        name: representative.name,
        totalDebt: representative.totalDebt || "0",
        totalSales: representative.totalSales || "0",
        invoiceCount: invoices.length
      });
      
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "خطا در تحلیل نماینده" });
    }
  });

  app.post("/api/ai/question", async (req, res) => {
    try {
      const { question } = req.body;
      const answer = await answerFinancialQuestion(question);
      res.json({ answer });
    } catch (error) {
      res.status(500).json({ error: "خطا در دریافت پاسخ از دستیار هوشمند" });
    }
  });

  app.post("/api/ai/generate-report", async (req, res) => {
    try {
      const dashboardData = await storage.getDashboardData();
      const representatives = await storage.getRepresentatives();
      const invoices = await storage.getInvoices();
      
      const reportData = {
        dashboard: dashboardData,
        representatives: representatives.slice(0, 10), // Top 10
        invoices: invoices.slice(0, 20) // Recent 20
      };
      
      const report = await generateFinancialReport(reportData);
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: "خطا در تولید گزارش" });
    }
  });

  // Initialize default settings on first run
  app.post("/api/init", async (req, res) => {
    try {
      // Set default Telegram template
      await storage.updateSetting('telegram_template', getDefaultTelegramTemplate());
      
      // Set default calculation settings
      await storage.updateSetting('invoice_base_rate', '1000');
      await storage.updateSetting('invoice_due_days', '30');
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "خطا در راه‌اندازی اولیه" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
