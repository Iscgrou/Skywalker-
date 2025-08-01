// CRM API ROUTES - DA VINCI v6.0 Persian Cultural AI System
import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { xaiGrokEngine } from "../services/xai-grok-engine";
import { eq, desc, and, or, like, gte, lte } from "drizzle-orm";
import { representatives } from "@shared/schema";
import { CrmService } from "../services/crm-service";
import { taskManagementService, TaskWithDetails } from "../services/task-management-service";
import { performanceAnalyticsService } from "../services/performance-analytics-service";
import { gamificationEngine } from "../services/gamification-engine";

export function registerCrmRoutes(app: Express) {
  // Initialize CRM Service
  const crmService = new CrmService();
  
  // CRM Authentication Middleware
  const crmAuthMiddleware = (req: any, res: any, next: any) => {
    if ((req.session as any)?.crmAuthenticated) {
      next();
    } else {
      res.status(401).json({ error: 'احراز هویت نشده' });
    }
  };
  // ==================== REPRESENTATIVES ====================
  
  // Get all representatives with filters
  app.get("/api/crm/representatives", async (req, res) => {
    try {
      const { search, status, level, sortBy } = req.query;
      
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
        query = query.where(and(...conditions));
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

  // ==================== PERSIAN AI ENGINE ENDPOINTS ====================
  
  // Persian AI Analysis
  app.get("/api/crm/representative/:id/analysis", crmAuthMiddleware, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const analysis = await crmService.generateIntelligentTasks(representativeId);
      
      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('خطا در تحلیل نماینده:', error);
      res.status(500).json({ error: 'خطا در تحلیل هوشمند نماینده' });
    }
  });

  // Cultural Profile
  app.get("/api/crm/representative/:id/cultural-profile", crmAuthMiddleware, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const culturalProfile = await crmService.analyzeCulturalProfile(representativeId);
      
      res.json({
        success: true,
        data: culturalProfile
      });
    } catch (error) {
      console.error('خطا در پروفایل فرهنگی:', error);
      res.status(500).json({ error: 'خطا در دریافت پروفایل فرهنگی' });
    }
  });

  // Representative Level Assessment
  app.get("/api/crm/representative/:id/level", crmAuthMiddleware, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const level = await crmService.getRepresentativeLevel(representativeId);
      
      res.json({
        success: true,
        data: level
      });
    } catch (error) {
      console.error('خطا در ارزیابی سطح:', error);
      res.status(500).json({ error: 'خطا در ارزیابی سطح نماینده' });
    }
  });

  // ==================== INTELLIGENT TASK MANAGEMENT - PHASE 2 ====================
  
  // Get all tasks with filters
  app.get("/api/crm/tasks", crmAuthMiddleware, async (req, res) => {
    try {
      const { status, priority, representativeId } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (representativeId) filters.representativeId = parseInt(representativeId as string);
      
      const tasks = await taskManagementService.getAllTasks(filters);
      
      res.json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('خطا در دریافت وظایف:', error);
      res.status(500).json({ error: 'خطا در دریافت لیست وظایف' });
    }
  });

  // Get tasks for specific representative
  app.get("/api/crm/representative/:id/tasks", crmAuthMiddleware, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const { status, priority, taskType } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (taskType) filters.taskType = taskType;
      
      const tasks = await taskManagementService.getRepresentativeTasks(representativeId, filters);
      
      res.json({
        success: true,
        data: tasks,
        count: tasks.length
      });
    } catch (error) {
      console.error('خطا در دریافت وظایف نماینده:', error);
      res.status(500).json({ error: 'خطا در دریافت وظایف نماینده' });
    }
  });

  // Generate task recommendations for representative
  app.post("/api/crm/representative/:id/task-recommendations", crmAuthMiddleware, async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const recommendations = await taskManagementService.generateTaskRecommendations(representativeId);
      
      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      console.error('خطا در تولید پیشنهادات وظایف:', error);
      res.status(500).json({ error: 'خطا در تولید پیشنهادات وظایف' });
    }
  });

  // Create intelligent task
  app.post("/api/crm/tasks", crmAuthMiddleware, async (req, res) => {
    try {
      const { representativeId, ...taskData } = req.body;
      
      const newTask = await taskManagementService.createIntelligentTask(representativeId, taskData);
      
      res.json({
        success: true,
        data: newTask,
        message: 'وظیفه هوشمند با موفقیت ایجاد شد'
      });
    } catch (error) {
      console.error('خطا در ایجاد وظیفه:', error);
      res.status(500).json({ error: 'خطا در ایجاد وظیفه هوشمند' });
    }
  });

  // Update task status
  app.patch("/api/crm/tasks/:taskId/status", crmAuthMiddleware, async (req, res) => {
    try {
      const { taskId } = req.params;
      const { status, completionNotes } = req.body;
      
      const updatedTask = await taskManagementService.updateTaskStatus(taskId, status, completionNotes);
      
      res.json({
        success: true,
        data: updatedTask,
        message: 'وضعیت وظیفه به‌روزرسانی شد'
      });
    } catch (error) {
      console.error('خطا در به‌روزرسانی وظیفه:', error);
      res.status(500).json({ error: 'خطا در به‌روزرسانی وضعیت وظیفه' });
    }
  });

  // Task analytics and performance metrics
  app.get("/api/crm/tasks/analytics", crmAuthMiddleware, async (req, res) => {
    try {
      // Get task completion statistics
      const allTasks = await taskManagementService.getAllTasks();
      
      const analytics = {
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.status === 'COMPLETED').length,
        pendingTasks: allTasks.filter(t => t.status === 'PENDING').length,
        inProgressTasks: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
        overdueTasks: allTasks.filter(t => {
          return t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date();
        }).length,
        
        // Priority distribution
        highPriorityTasks: allTasks.filter(t => t.priority === 'HIGH').length,
        mediumPriorityTasks: allTasks.filter(t => t.priority === 'MEDIUM').length,
        lowPriorityTasks: allTasks.filter(t => t.priority === 'LOW').length,
        urgentTasks: allTasks.filter(t => t.priority === 'URGENT').length,
        
        // Task type distribution
        taskTypeDistribution: {
          FOLLOW_UP: allTasks.filter(t => t.taskType === 'FOLLOW_UP').length,
          RELATIONSHIP_BUILDING: allTasks.filter(t => t.taskType === 'RELATIONSHIP_BUILDING').length,
          SKILL_DEVELOPMENT: allTasks.filter(t => t.taskType === 'SKILL_DEVELOPMENT').length,
          PERFORMANCE_REVIEW: allTasks.filter(t => t.taskType === 'PERFORMANCE_REVIEW').length,
          CULTURAL_ADAPTATION: allTasks.filter(t => t.taskType === 'CULTURAL_ADAPTATION').length
        },
        
        // Average metrics
        averageAiConfidence: allTasks.reduce((sum, t) => sum + t.aiConfidenceScore, 0) / (allTasks.length || 1),
        averageXpReward: allTasks.reduce((sum, t) => sum + t.xpReward, 0) / (allTasks.length || 1),
        averageDifficulty: allTasks.reduce((sum, t) => sum + t.difficultyLevel, 0) / (allTasks.length || 1),
        
        // Recent activity
        tasksCreatedToday: allTasks.filter(t => {
          const today = new Date();
          const taskDate = new Date(t.createdAt);
          return taskDate.toDateString() === today.toDateString();
        }).length,
        
        tasksCompletedToday: allTasks.filter(t => {
          if (!t.completedAt) return false;
          const today = new Date();
          const completedDate = new Date(t.completedAt);
          return completedDate.toDateString() === today.toDateString();
        }).length
      };
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('خطا در تحلیل وظایف:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار وظایف' });
    }
  });

  // ==================== PERFORMANCE ANALYTICS ====================
  
  app.get("/api/crm/analytics/representative/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { period = 'monthly', includeInsights = 'true' } = req.query;
      
      const performanceMetrics = await performanceAnalyticsService.analyzeRepresentativePerformance(
        parseInt(id as string),
        period as string,
        includeInsights === 'true'
      );
      
      res.json(performanceMetrics);
    } catch (error) {
      console.error('Error fetching representative analytics:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار نماینده' });
    }
  });

  app.get("/api/crm/analytics/team", async (req, res) => {
    try {
      const { period = 'monthly', includeForecasting = 'true' } = req.query;
      
      const teamReport = await performanceAnalyticsService.generateTeamPerformanceReport(
        period as string,
        includeForecasting === 'true'
      );
      
      res.json(teamReport);
    } catch (error) {
      console.error('Error fetching team analytics:', error);
      res.status(500).json({ error: 'خطا در دریافت آمار تیم' });
    }
  });

  app.get("/api/crm/analytics/dashboard", async (req, res) => {
    try {
      // Get summary analytics for dashboard
      const teamReport = await performanceAnalyticsService.generateTeamPerformanceReport('monthly', false);
      
      const dashboardData = {
        teamOverview: teamReport.overallMetrics,
        topPerformers: teamReport.topPerformers.slice(0, 3),
        criticalAlerts: teamReport.underPerformers.length,
        trendsData: {
          salesGrowth: teamReport.overallMetrics.salesGrowth,
          taskCompletion: teamReport.overallMetrics.taskCompletionRate,
          culturalAlignment: teamReport.overallMetrics.culturalAlignmentAvg
        },
        departmentStats: teamReport.departmentBreakdown
      };
      
      res.json(dashboardData);
    } catch (error) {
      console.error('Error fetching analytics dashboard:', error);
      res.status(500).json({ error: 'خطا در دریافت داشبورد آمار' });
    }
  });

  // ==================== GAMIFICATION SYSTEM ====================
  
  app.get("/api/crm/gamification/profile/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const gamifiedProfile = await gamificationEngine.getGamifiedProfile(parseInt(id as string));
      
      res.json(gamifiedProfile);
    } catch (error) {
      console.error('Error fetching gamified profile:', error);
      res.status(500).json({ error: 'خطا در دریافت پروفایل گیمیفیکیشن' });
    }
  });

  app.get("/api/crm/gamification/leaderboard", async (req, res) => {
    try {
      const { period = 'monthly' } = req.query;
      
      const leaderboard = await gamificationEngine.generateLeaderboard(period as any);
      
      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'خطا در دریافت جدول امتیازات' });
    }
  });

  app.post("/api/crm/gamification/award-xp", async (req, res) => {
    try {
      const { representativeId, xpAmount, reason } = req.body;
      
      await gamificationEngine.awardXP(representativeId, xpAmount, reason);
      
      res.json({ success: true, message: `${xpAmount} امتیاز اعطا شد` });
    } catch (error) {
      console.error('Error awarding XP:', error);
      res.status(500).json({ error: 'خطا در اعطای امتیاز' });
    }
  });

  app.get("/api/crm/gamification/challenges/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const dailyChallenges = await gamificationEngine.createDailyChallenges();
      
      res.json({
        success: true,
        data: dailyChallenges,
        count: dailyChallenges.length
      });
    } catch (error) {
      console.error('Error fetching challenges:', error);
      res.status(500).json({ error: 'خطا در دریافت چالش‌ها' });
    }
  });

  app.post("/api/crm/gamification/check-achievements", async (req, res) => {
    try {
      const { representativeId } = req.body;
      
      const newAchievements = await gamificationEngine.checkAchievements(representativeId);
      
      res.json({
        success: true,
        data: newAchievements,
        count: newAchievements.length,
        message: newAchievements.length > 0 ? 'دستاوردهای جدید کسب شد!' : 'هیچ دستاورد جدیدی یافت نشد'
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
      res.status(500).json({ error: 'خطا در بررسی دستاوردها' });
    }
  });
}