// CRM API ROUTES - DA VINCI v6.0 Persian Cultural AI System
import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { xaiGrokEngine } from "../services/xai-grok-engine";
import { eq, desc, and, or, like, gte, lte } from "drizzle-orm";
import { representatives } from "@shared/schema";

export function registerCrmRoutes(app: Express) {
  // ==================== REPRESENTATIVES ====================
  
  // Get all representatives with filters
  app.get("/api/crm/representatives", async (req, res) => {
    try {
      const { search, status, level, sortBy } = req.query;
      
      let query = db.select().from(representatives);
      
      if (search) {
        query = query.where(
          or(
            like(representatives.name, `%${search}%`),
            like(representatives.code, `%${search}%`),
            like(representatives.ownerName, `%${search}%`)
          )
        );
      }
      
      if (status === 'active') {
        query = query.where(eq(representatives.isActive, true));
      } else if (status === 'inactive') {
        query = query.where(eq(representatives.isActive, false));
      }
      
      // Add sorting
      if (sortBy === 'debt') {
        query = query.orderBy(desc(representatives.totalDebt));
      } else if (sortBy === 'sales') {
        query = query.orderBy(desc(representatives.totalSales));
      } else {
        query = query.orderBy(representatives.name);
      }
      
      const reps = await query;
      
      // Transform data for frontend
      const responseData = reps.map((rep: any) => ({
        id: rep.id,
        code: rep.code,
        name: rep.name,
        ownerName: rep.ownerName,
        phone: rep.phone,
        isActive: rep.isActive,
        debtAmount: parseFloat(rep.totalDebt || "0"),
        salesAmount: parseFloat(rep.totalSales || "0"),
        publicId: rep.publicId
      }));
      
      res.json(responseData);
    } catch (error) {
      console.error('Error fetching representatives:', error);
      res.status(500).json({ error: 'خطا در دریافت لیست نمایندگان' });
    }
  });

  // ==================== CRM DASHBOARD ====================
  
  app.get("/api/crm/dashboard", async (req, res) => {
    try {
      const reps = await db.select().from(representatives);
      const responseData = reps.map((rep: any) => ({
        id: rep.id,
        code: rep.code,
        name: rep.name,
        debtAmount: parseFloat(rep.totalDebt || "0"),
        totalSales: parseFloat(rep.totalSales || "0"),
        isActive: rep.isActive
      }));
      
      const summary = {
        totalRepresentatives: reps.length,
        activeRepresentatives: reps.filter((r: any) => r.isActive).length,
        totalDebt: reps.reduce((sum: number, r: any) => sum + parseFloat(r.totalDebt || "0"), 0),
        totalSales: reps.reduce((sum: number, r: any) => sum + parseFloat(r.totalSales || "0"), 0),
        pendingTasks: 12,
        completedTasksToday: 8,
        aiInsights: [
          { id: '1', type: 'improvement', title: 'بهبود عملکرد' },
          { id: '2', type: 'alert', title: 'نماینده نیازمند توجه' }
        ],
        recentActivities: [
          { id: '1', type: 'task_completed', description: 'وظیفه پیگیری تکمیل شد' },
          { id: '2', type: 'level_change', description: 'نماینده به سطح فعال ارتقا یافت' }
        ]
      };
      
      res.json({ summary, representatives: responseData.slice(0, 10) });
    } catch (error) {
      console.error('Error fetching CRM dashboard:', error);
      res.status(500).json({ error: 'خطا در دریافت داشبورد CRM' });
    }
  });

  // ==================== CRM AUTHENTICATION ====================
  
  app.post("/api/crm/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (username === 'crm' && password === '8679') {
        const sessionId = `crm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Set CRM session
        (req.session as any).crmAuthenticated = true;
        (req.session as any).crmSessionId = sessionId;
        (req.session as any).crmUser = {
          username: 'crm',
          role: 'CRM',
          panelType: 'CRM_PANEL'
        };
        
        res.json({
          success: true,
          message: 'ورود موفقیت‌آمیز به پنل CRM',
          user: {
            username: 'crm',
            role: 'CRM',
            panelType: 'CRM_PANEL',
            permissions: []
          }
        });
      } else {
        res.status(401).json({ error: 'نام کاربری یا رمز عبور اشتباه است' });
      }
    } catch (error) {
      console.error('CRM Login error:', error);
      res.status(500).json({ error: 'خطا در فرآیند ورود' });
    }
  });

  app.get("/api/crm/auth/user", (req, res) => {
    if ((req.session as any)?.crmAuthenticated) {
      res.json((req.session as any).crmUser);
    } else {
      res.status(401).json({ error: 'احراز هویت نشده' });
    }
  });

  app.post("/api/crm/auth/logout", (req, res) => {
    (req.session as any).crmAuthenticated = false;
    delete (req.session as any).crmSessionId;
    delete (req.session as any).crmUser;
    
    res.json({ success: true, message: 'خروج موفقیت‌آمیز' });
  });

  // ==================== TASKS MANAGEMENT ====================
  
  app.get("/api/crm/tasks", async (req, res) => {
    try {
      const mockTasks = [
        {
          id: '1',
          taskId: 'TASK_001',
          representativeId: 1,
          representativeName: 'فروشگاه اول',
          taskType: 'FOLLOW_UP',
          priority: 'HIGH',
          status: 'PENDING',
          title: 'پیگیری مطالبات',
          description: 'پیگیری مطالبات معوق و هماهنگی برای پرداخت',
          expectedOutcome: 'دریافت پرداخت معوق',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          aiConfidenceScore: 85,
          xpReward: 50,
          difficultyLevel: 3,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          taskId: 'TASK_002',
          representativeId: 2,
          representativeName: 'فروشگاه دوم',
          taskType: 'RELATIONSHIP_BUILDING',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          title: 'تقویت روابط تجاری',
          description: 'برقراری ارتباط منظم و بررسی نیازهای جدید',
          expectedOutcome: 'افزایش میزان سفارشات ماهانه',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          aiConfidenceScore: 92,
          xpReward: 30,
          difficultyLevel: 2,
          createdAt: new Date().toISOString()
        }
      ];
      
      res.json(mockTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'خطا در دریافت وظایف' });
    }
  });

  app.get("/api/crm/tasks/stats", async (req, res) => {
    try {
      const stats = {
        totalTasks: 45,
        pendingTasks: 12,
        completedToday: 8,
        overdueTasks: 3,
        avgCompletionTime: 24,
        successRate: 87
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Error fetching task stats:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار وظایف' });
    }
  });

  // ==================== REPRESENTATIVE ANALYSIS ====================
  
  app.get("/api/crm/representative/:id/analysis", async (req, res) => {
    try {
      const repId = parseInt(req.params.id);
      const representative = await storage.getRepresentative(repId);
      
      if (!representative) {
        return res.status(404).json({ error: 'نماینده یافت نشد' });
      }

      // Get cultural analysis from xAI Grok
      const culturalProfile = await xaiGrokEngine.analyzeCulturalProfile(representative);
      
      res.json({
        representative,
        culturalProfile,
        performanceMetrics: {
          debtRatio: (parseFloat(representative.totalDebt || "0") / parseFloat(representative.totalSales || "1")) * 100,
          activityLevel: representative.isActive ? 'HIGH' : 'LOW',
          riskLevel: parseFloat(representative.totalDebt || "0") > 50000 ? 'HIGH' : 'MEDIUM'
        }
      });
    } catch (error) {
      console.error('Error fetching representative analysis:', error);
      res.status(500).json({ error: 'خطا در تحلیل نماینده' });
    }
  });
}