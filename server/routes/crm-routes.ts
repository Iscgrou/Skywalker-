import { Express } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import { sql, eq, desc, and, or, like, gte, lte, asc } from "drizzle-orm";
import { IStorage } from "../storage";
import { db } from "../db";
import { representatives, invoices, payments, crmUsers } from "../../shared/schema";
import { XAIGrokEngine } from "../services/xai-grok-engine";
// Cleaned CRM routes for representatives management and AI helper only

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
  
  // CRM Authentication Middleware
  const crmAuthMiddleware = (req: any, res: any, next: any) => {
    if (req.session?.crmAuthenticated === true) {
      next();
    } else {
      res.status(401).json({ error: 'احراز هویت نشده - دسترسی غیرمجاز' });
    }
  };

  // ==================== ADMIN-CRM DATA SYNCHRONIZATION SERVICE ====================
  
  const syncAdminCrmData = async () => {
    try {
      const adminReps = await db.select().from(representatives);
      
      for (const rep of adminReps) {
        try {
          const invoicesSum = await db.select()
            .from(invoices)
            .where(eq(invoices.representativeId, rep.id));
            
          const paymentsSum = await db.select()
            .from(payments)
            .where(eq(payments.representativeId, rep.id));
          
          const totalSales = invoicesSum.reduce((sum, inv) => sum + parseFloat(inv.amount || '0'), 0);
          const totalPayments = paymentsSum.reduce((sum, pay) => sum + parseFloat(pay.amount || '0'), 0);
          const currentDebt = totalSales - totalPayments;
          
          await db.update(representatives)
            .set({
              totalSales: totalSales.toString(),
              totalDebt: Math.max(0, currentDebt).toString(),
              credit: Math.max(0, -currentDebt).toString(),
              updatedAt: new Date()
            })
            .where(eq(representatives.id, rep.id));
        } catch (repError) {
          console.log(`Sync error for rep ${rep.id}:`, repError);
        }
      }
      
      return adminReps;
    } catch (error) {
      console.error('❌ Admin-CRM sync error:', error);
      return [];
    }
  };

  // ==================== UNIFIED CRM REPRESENTATIVES ENDPOINTS ====================
  
  // Statistics endpoint - Admin-CRM synchronized data
  app.get("/api/crm/representatives/statistics", crmAuthMiddleware, async (req, res) => {
    try {
      await syncAdminCrmData();
      const reps = await db.select().from(representatives);
      
      const stats = {
        totalCount: reps.length,
        activeCount: reps.filter(r => r.isActive).length,
        inactiveCount: reps.filter(r => !r.isActive).length,
        totalSales: reps.reduce((sum, r) => sum + parseFloat(r.totalSales || '0'), 0),
        totalDebt: reps.reduce((sum, r) => sum + parseFloat(r.totalDebt || '0'), 0),
        avgPerformance: reps.length > 0 ? Math.round((reps.filter(r => r.isActive).length / reps.length) * 100) : 0,
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
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching representatives statistics:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار نمایندگان' });
    }
  });

  // List all representatives with pagination and filtering - Admin-CRM synchronized
  app.get("/api/crm/representatives", crmAuthMiddleware, async (req, res) => {
    try {
      await syncAdminCrmData();
      
      const { page = 1, limit = 9, search = '', status = 'all', sortBy = 'name' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      let query = db.select().from(representatives);
      let conditions = [];
      
      if (search) {
        conditions.push(
          or(
            like(representatives.name, `%${search}%`),
            like(representatives.code, `%${search}%`),
            like(representatives.ownerName, `%${search}%`)
          )
        );
      }
      
      if (status === 'active') {
        conditions.push(eq(representatives.isActive, true));
      } else if (status === 'inactive') {
        conditions.push(eq(representatives.isActive, false));
      }
      
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
      }
      
      switch (sortBy) {
        case 'totalSales':
          query = query.orderBy(desc(representatives.totalSales)) as any;
          break;
        case 'totalDebt':
          query = query.orderBy(desc(representatives.totalDebt)) as any;
          break;
        default:
          query = query.orderBy(representatives.name) as any;
      }
      
      const reps = await query.limit(limitNum).offset(offset);
      
      let countQuery = db.select({ count: sql`COUNT(*)` }).from(representatives);
      if (conditions.length > 0) {
        countQuery = countQuery.where(conditions.length === 1 ? conditions[0] : and(...conditions)) as any;
      }
      const [{ count }] = await countQuery;
      
      res.json({
        data: reps,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limitNum)
        },
        syncStatus: 'SYNCED_WITH_ADMIN'
      });
    } catch (error) {
      console.error('Error fetching representatives:', error);
      res.status(500).json({ error: 'خطا در دریافت فهرست نمایندگان' });
    }
  });

  // Get single representative details - Admin-CRM synchronized
  app.get("/api/crm/representatives/:id", crmAuthMiddleware, async (req, res) => {
    try {
      await syncAdminCrmData();
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'شناسه نماینده نامعتبر است' });
      }
      
      const rep = await db
        .select()
        .from(representatives)
        .where(eq(representatives.id, id))
        .limit(1);
      
      if (rep.length === 0) {
        return res.status(404).json({ error: 'نماینده یافت نشد' });
      }
      
      const representativeInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.representativeId, id))
        .orderBy(desc(invoices.createdAt))
        .limit(10);
        
      const representativePayments = await db
        .select()
        .from(payments)
        .where(eq(payments.representativeId, id))
        .orderBy(desc(payments.createdAt))
        .limit(10);
      
      res.json({
        ...rep[0],
        recentInvoices: representativeInvoices,
        recentPayments: representativePayments,
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

  // Create new representative
  app.post("/api/crm/representatives", crmAuthMiddleware, async (req, res) => {
    try {
      const { name, code, ownerName, phone, panelUsername } = req.body;
      
      if (!name || !code) {
        return res.status(400).json({ error: 'نام و کد نماینده الزامی است' });
      }
      
      const existing = await db
        .select()
        .from(representatives)
        .where(eq(representatives.code, code))
        .limit(1);
        
      if (existing.length > 0) {
        return res.status(400).json({ error: 'کد نماینده تکراری است' });
      }
      
      const newRep = await db
        .insert(representatives)
        .values({
          code,
          name,
          ownerName: ownerName || '',
          phone: phone || '',
          panelUsername: panelUsername || '',
          publicId: `pub_${Date.now()}_${code}`,
          salesPartnerId: 0,
          isActive: true,
          totalDebt: '0',
          totalSales: '0',
          credit: '0',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      res.json({
        success: true,
        data: newRep[0],
        message: 'نماینده جدید با موفقیت ایجاد شد'
      });
    } catch (error) {
      console.error('Error creating representative:', error);
      res.status(500).json({ error: 'خطا در ایجاد نماینده جدید' });
    }
  });

  // Update representative
  app.put("/api/crm/representatives/:id", crmAuthMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const updated = await db
        .update(representatives)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(representatives.id, id))
        .returning();
        
      if (updated.length === 0) {
        return res.status(404).json({ error: 'نماینده یافت نشد' });
      }
      
      res.json({
        success: true,
        data: updated[0],
        message: 'اطلاعات نماینده بروزرسانی شد'
      });
    } catch (error) {
      console.error('Error updating representative:', error);
      res.status(500).json({ error: 'خطا در بروزرسانی نماینده' });
    }
  });



  // ==================== CRM AUTHENTICATION ====================
  
  app.post("/api/crm/auth/login", async (req, res) => {
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

      req.session.crmAuthenticated = true;
      req.session.crmUser = {
        id: user.id,
        username: user.username,
        fullName: user.fullName || '',
        role: user.role || '',
        permissions: user.permissions as string[] || [],
        panelType: 'CRM_PANEL'
      };

      res.json({
        success: true,
        message: "ورود موفقیت‌آمیز به سیستم CRM",
        user: req.session.crmUser
      });
    } catch (error) {
      console.error('CRM login error:', error);
      res.status(500).json({ error: "خطا در ورود به سیستم" });
    }
  });

  app.get("/api/crm/auth/user", (req, res) => {
    if (req.session?.crmAuthenticated && req.session?.crmUser) {
      console.log('CRM Auth Check Result:', req.session.crmUser);
      res.json(req.session.crmUser);
    } else {
      res.status(401).json({ error: "احراز هویت نشده" });
    }
  });

  app.post("/api/crm/auth/logout", (req, res) => {
    req.session.crmAuthenticated = false;
    req.session.crmUser = undefined;
    res.json({ success: true, message: "خروج موفقیت‌آمیز" });
  });
}