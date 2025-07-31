// CRM API ROUTES - DA VINCI v6.0 Persian Cultural AI System
import type { Express } from "express";
import { storage } from "../storage";
import { xaiGrokEngine } from "../services/xai-grok-engine";
import { eq, desc, and, or, like, gte, lte } from "drizzle-orm";
import { 
  representatives, 
  crmTasks, 
  crmTaskResults, 
  representativeLevels,
  aiKnowledgeBase,
  crmPerformanceAnalytics,
  crmSystemEvents
} from "@shared/schema";

export function registerCrmRoutes(app: Express) {
  // ==================== REPRESENTATIVES ====================
  
  // Get all representatives with filters
  app.get("/api/crm/representatives", async (req, res) => {
    try {
      const { search, status, level, sortBy } = req.query;
      
      let query = storage.db.select().from(representatives);
      
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
      const responseData = reps.map(rep => ({
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
      // Get basic stats
      const allReps = await storage.db.select().from(representatives);
      const activeReps = allReps.filter(rep => rep.isActive);
      
      // Get tasks stats (mock data for now)
      const dashboardData = {
        totalRepresentatives: allReps.length,
        activeRepresentatives: activeReps.length,
        pendingTasks: 12, // Will be calculated from actual tasks
        completedTasksToday: 8,
        aiInsights: [
          { id: '1', type: 'improvement', title: 'بهبود عملکرد' },
          { id: '2', type: 'alert', title: 'نماینده نیازمند توجه' }
        ],
        performanceAlerts: [
          { id: '1', severity: 'medium', message: 'کاهش عملکرد نماینده ۱۲۳' }
        ],
        recentActivities: [
          { id: '1', type: 'task_completed', description: 'وظیفه پیگیری تکمیل شد' },
          { id: '2', type: 'level_change', description: 'نماینده به سطح فعال ارتقا یافت' }
        ]
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: 'خطا در دریافت اطلاعات داشبورد' });
    }
  });

  // ==================== TASKS MANAGEMENT ====================
  
  // Get all tasks with filters
  app.get("/api/crm/tasks", async (req, res) => {
    try {
      const { taskType, status, priority, representativeId } = req.query;
      
      // Mock data - will be replaced with actual database queries
      const mockTasks = [
        {
          id: '1',
          taskId: 'TASK_001',
          representativeId: 1,
          representativeName: 'فروشگاه نمونه',
          aiGeneratedByModel: 'PERSIAN_CRM_AI',
          taskType: 'FOLLOW_UP',
          priority: 'HIGH',
          status: 'ASSIGNED',
          title: 'پیگیری بدهی معوقه',
          description: 'پیگیری وضعیت پرداخت بدهی ۵ میلیون ریالی',
          expectedOutcome: 'تعیین زمان پرداخت یا تنظیم اقساط',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
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
          aiGeneratedByModel: 'PERSIAN_CRM_AI',
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

  // Get task statistics
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

  // Generate AI task for representative
  app.post("/api/crm/tasks/generate", async (req, res) => {
    try {
      const { representativeId } = req.body;
      
      if (!representativeId) {
        return res.status(400).json({ error: 'شناسه نماینده الزامی است' });
      }
      
      // Get representative data
      const rep = await storage.db.select().from(representatives)
        .where(eq(representatives.id, representativeId))
        .limit(1);
      
      if (rep.length === 0) {
        return res.status(404).json({ error: 'نماینده یافت نشد' });
      }
      
      // Use xAI Grok Engine to generate appropriate task
      const culturalProfile = await xaiGrokEngine.analyzeCulturalProfile(rep[0]);
      const generatedTask = await xaiGrokEngine.generateTaskRecommendation(rep[0], culturalProfile);
      
      res.json({ 
        success: true, 
        task: generatedTask,
        message: 'وظیفه هوشمند تولید شد'
      });
    } catch (error) {
      console.error('Error generating task:', error);
      res.status(500).json({ error: 'خطا در تولید وظیفه' });
    }
  });

  // Complete task
  app.post("/api/crm/tasks/:taskId/complete", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { outcome, notes } = req.body;
      
      // Mock completion - will be replaced with actual database update
      const completionResult = {
        taskId,
        outcome,
        notes,
        completedAt: new Date().toISOString(),
        xpEarned: 50,
        qualityScore: 85
      };
      
      res.json({
        success: true,
        result: completionResult,
        message: 'وظیفه با موفقیت تکمیل شد'
      });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({ error: 'خطا در تکمیل وظیفه' });
    }
  });

  // ==================== ANALYTICS ====================
  
  // Get performance analytics
  app.get("/api/crm/analytics/performance", async (req, res) => {
    try {
      const { timePeriod = '30d' } = req.query;
      
      // Mock performance data
      const performanceData = [
        { period: '1403/11/01', tasksCompleted: 12, avgCompletionTime: 4.5, successRate: 85, aiAccuracy: 92 },
        { period: '1403/11/02', tasksCompleted: 15, avgCompletionTime: 3.8, successRate: 88, aiAccuracy: 94 },
        { period: '1403/11/03', tasksCompleted: 10, avgCompletionTime: 5.2, successRate: 82, aiAccuracy: 89 },
        { period: '1403/11/04', tasksCompleted: 18, avgCompletionTime: 4.1, successRate: 90, aiAccuracy: 96 },
        { period: '1403/11/05', tasksCompleted: 14, avgCompletionTime: 4.7, successRate: 87, aiAccuracy: 93 }
      ];
      
      res.json(performanceData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار عملکرد' });
    }
  });

  // Get representative analytics
  app.get("/api/crm/analytics/representatives", async (req, res) => {
    try {
      const { level } = req.query;
      
      // Mock representative analytics
      const repAnalytics = [
        {
          id: 1,
          name: 'فروشگاه نمونه اول',
          level: 'ACTIVE',
          tasksCompleted: 25,
          avgScore: 87,
          relationshipScore: 92,
          responseTime: 2.5,
          trend: 'up'
        },
        {
          id: 2,
          name: 'فروشگاه نمونه دوم',
          level: 'NEW',
          tasksCompleted: 8,
          avgScore: 72,
          relationshipScore: 68,
          responseTime: 4.2,
          trend: 'stable'
        }
      ];
      
      res.json(repAnalytics);
    } catch (error) {
      console.error('Error fetching representative analytics:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار نمایندگان' });
    }
  });

  // Get AI insights
  app.get("/api/crm/analytics/ai-insights", async (req, res) => {
    try {
      const insights = [
        {
          id: '1',
          type: 'success_pattern',
          title: 'الگوی موفقیت شناسایی شد',
          description: 'نمایندگان با پاسخ‌دهی سریع نرخ موفقیت ۳۰٪ بالاتری دارند',
          confidence: 94,
          actionable: true,
          priority: 'high'
        },
        {
          id: '2',
          type: 'cultural_insight',
          title: 'نکته فرهنگی مهم',
          description: 'استفاده از زبان محترمانه در پیگیری‌ها تاثیر مثبت ۲۵٪ دارد',
          confidence: 87,
          actionable: true,
          priority: 'medium'
        },
        {
          id: '3',
          type: 'improvement_area',
          title: 'حوزه بهبود',
          description: 'نمایندگان جدید نیاز به آموزش بیشتر در زمینه وصول مطالبات دارند',
          confidence: 91,
          actionable: true,
          priority: 'high'
        }
      ];
      
      res.json(insights);
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      res.status(500).json({ error: 'خطا در دریافت بینش‌های هوش مصنوعی' });
    }
  });

  // ==================== NOTIFICATIONS ====================
  
  // Get all notifications
  app.get("/api/crm/notifications", async (req, res) => {
    try {
      const notifications = [
        {
          id: '1',
          representativeId: 1,
          representativeName: 'فروشگاه نمونه',
          notificationType: 'task_reminder',
          title: 'یادآوری وظیفه',
          message: 'وظیفه پیگیری بدهی تا فردا باید تکمیل شود',
          priority: 'high',
          isRead: false,
          actionRequired: true,
          culturalSensitivity: 'high',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          notificationType: 'ai_insight',
          title: 'بینش جدید AI',
          message: 'الگوی جدیدی در رفتار نمایندگان شناسایی شد',
          priority: 'medium',
          isRead: true,
          actionRequired: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'خطا در دریافت اعلان‌ها' });
    }
  });

  // Mark notification as read
  app.patch("/api/crm/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Mock update - will be replaced with actual database update
      res.json({ 
        success: true, 
        message: 'اعلان به عنوان خوانده شده علامت‌گذاری شد' 
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'خطا در علامت‌گذاری اعلان' });
    }
  });

  // Mark all notifications as read
  app.patch("/api/crm/notifications/mark-all-read", async (req, res) => {
    try {
      res.json({ 
        success: true, 
        message: 'تمام اعلان‌ها خوانده شدند' 
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'خطا در علامت‌گذاری اعلان‌ها' });
    }
  });

  // Get notification settings
  app.get("/api/crm/notifications/settings", async (req, res) => {
    try {
      const settings = {
        taskReminders: true,
        performanceAlerts: true,
        aiInsights: true,
        systemAlerts: true,
        emailNotifications: false,
        urgentOnlyMode: false
      };
      
      res.json(settings);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({ error: 'خطا در دریافت تنظیمات اعلان‌ها' });
    }
  });

  // Update notification settings
  app.put("/api/crm/notifications/settings", async (req, res) => {
    try {
      const newSettings = req.body;
      
      // Mock update - will be replaced with actual database update
      res.json({ 
        success: true, 
        settings: newSettings,
        message: 'تنظیمات اعلان‌ها به‌روزرسانی شد' 
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      res.status(500).json({ error: 'خطا در به‌روزرسانی تنظیمات' });
    }
  });
}