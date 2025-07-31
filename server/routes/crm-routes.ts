// 🏢 CRM Routes - Persian Cultural AI Management
import { Router, Request, Response } from 'express';
import CrmAuthService from '../services/crm-auth-service';
import { storage } from '../storage';

const router = Router();

// Extend Request interface for CRM
declare global {
  namespace Express {
    interface Request {
      crmUser?: any;
    }
    interface Session {
      crmSessionId?: string;
    }
  }
}

// Authentication routes
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'نام کاربری و رمز عبور الزامی است' 
      });
    }

    const result = await CrmAuthService.authenticate({ username, password });

    if (!result.success) {
      return res.status(401).json({ 
        error: result.error 
      });
    }

    // Store session in Express session
    if (req.session) {
      req.session.crmSessionId = (result.user as any).sessionId;
    }

    res.json({
      success: true,
      user: result.user,
      message: `ورود موفق به ${result.user?.panelType === 'ADMIN_PANEL' ? 'پنل ادمین' : 'پنل CRM'}`
    });

  } catch (error: any) {
    console.error('CRM login error:', error);
    res.status(500).json({ 
      error: 'خطای سرور در احراز هویت' 
    });
  }
});

router.post('/auth/logout', (req, res) => {
  try {
    const sessionId = req.session?.crmSessionId;
    
    if (sessionId) {
      CrmAuthService.logout(sessionId);
      if (req.session) {
        req.session.crmSessionId = undefined;
      }
    }

    res.json({ 
      success: true, 
      message: 'خروج موفق از سیستم' 
    });

  } catch (error: any) {
    console.error('CRM logout error:', error);
    res.status(500).json({ 
      error: 'خطا در خروج از سیستم' 
    });
  }
});

router.get('/auth/user', (req, res) => {
  try {
    const sessionId = req.session?.crmSessionId;
    
    if (!sessionId) {
      return res.status(401).json({ 
        error: 'احراز هویت مورد نیاز است' 
      });
    }

    const user = CrmAuthService.getUser(sessionId);
    
    if (!user) {
      return res.status(401).json({ 
        error: 'جلسه نامعتبر است' 
      });
    }

    res.json(user);

  } catch (error: any) {
    console.error('CRM user check error:', error);
    res.status(500).json({ 
      error: 'خطا در بررسی کاربر' 
    });
  }
});

// Protected routes with authentication middleware
const authMiddleware = CrmAuthService.createAuthMiddleware();

// Dashboard data
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = req.crmUser;
    
    // Get representatives count
    const representatives = await storage.getRepresentatives();
    const activeRepresentatives = representatives.filter(rep => rep.isActive);

    // Mock data for now - will be replaced with real CRM data
    const dashboardData = {
      totalRepresentatives: representatives.length,
      activeRepresentatives: activeRepresentatives.length,
      pendingTasks: 15,
      completedTasksToday: 8,
      aiInsights: [
        {
          type: 'success' as const,
          title: 'عملکرد بهتر از انتظار',
          description: 'نمایندگان در این ماه عملکرد بهتری نسبت به ماه گذشته داشته‌اند',
          confidence: 92,
          actionRequired: false
        },
        {
          type: 'warning' as const,
          title: 'نیاز به پیگیری',
          description: '5 نماینده نیاز به پیگیری بیشتر دارند',
          confidence: 85,
          actionRequired: true
        }
      ],
      recentActivity: [
        {
          id: '1',
          type: 'task_assigned' as const,
          description: 'وظیفه جدید به نماینده احمدی واگذار شد',
          timestamp: new Date(),
          representativeName: 'احمدی'
        },
        {
          id: '2',
          type: 'level_changed' as const,
          description: 'سطح نماینده رضایی به فعال تغییر یافت',
          timestamp: new Date(Date.now() - 3600000),
          representativeName: 'رضایی'
        }
      ],
      performanceAlerts: [
        {
          representativeId: 1,
          representativeName: 'محمدی',
          alertType: 'poor_performance' as const,
          severity: 'medium' as const,
          description: 'عملکرد در هفته اخیر کاهش یافته',
          recommendedAction: 'تماس تلفنی و بررسی مشکلات'
        }
      ]
    };

    // Filter data based on user permissions
    const filteredData = CrmAuthService.filterData(user, 'dashboard', dashboardData);

    res.json(filteredData);

  } catch (error: any) {
    console.error('CRM dashboard error:', error);
    res.status(500).json({ 
      error: 'خطا در دریافت اطلاعات داشبورد' 
    });
  }
});

// Representatives list
router.get('/representatives', authMiddleware, async (req, res) => {
  try {
    const user = req.crmUser;
    const representatives = await storage.getRepresentatives();

    // Filter data based on user permissions
    const filteredData = representatives.map(rep => 
      CrmAuthService.filterData(user, 'representatives', {
        id: rep.id,
        code: rep.code,
        name: rep.name,
        ownerName: rep.ownerName,
        phone: rep.phone,
        isActive: rep.isActive,
        debtAmount: rep.totalDebt || 0,
        salesAmount: rep.totalSales || 0, // This will be filtered for CRM users
        publicId: rep.publicId
      })
    );

    res.json(filteredData);

  } catch (error: any) {
    console.error('CRM representatives error:', error);
    res.status(500).json({ 
      error: 'خطا در دریافت لیست نمایندگان' 
    });
  }
});

// Individual representative profile
router.get('/representatives/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.crmUser;
    const representativeId = parseInt(req.params.id);

    if (!representativeId) {
      return res.status(400).json({ 
        error: 'شناسه نماینده نامعتبر است' 
      });
    }

    const representatives = await storage.getRepresentatives();
    const representative = representatives.find(rep => rep.id === representativeId);

    if (!representative) {
      return res.status(404).json({ 
        error: 'نماینده یافت نشد' 
      });
    }

    // Build comprehensive profile
    const profile = {
      representativeId,
      basicProfile: {
        id: representative.id,
        code: representative.code,
        name: representative.name,
        ownerName: representative.ownerName,
        phone: representative.phone,
        isActive: representative.isActive
      },
      financialSummary: {
        debtAmount: representative.totalDebt || 0,
        salesAmount: representative.totalSales || 0, // Will be filtered for CRM
        creditLevel: representative.totalDebt && Number(representative.totalDebt) > 100000 ? 'بالا' : 
                    representative.totalDebt && Number(representative.totalDebt) > 50000 ? 'متوسط' : 'پایین',
        paymentStatus: representative.totalDebt && Number(representative.totalDebt) > 0 ? 'معوقه' : 'منظم',
        lastPaymentDate: null
      },
      level: {
        currentLevel: 'ACTIVE' as const,
        communicationStyle: 'رسمی و مودبانه',
        levelChangeReason: 'عملکرد مناسب در ماه اخیر'
      },
      performance: {
        overallScore: 75,
        taskStats: {
          assigned: 12,
          completed: 9,
          overdue: 1,
          successRate: 75
        },
        trendAnalysis: {
          trend: 'بهبود' as const,
          changePercent: 15,
          periodComparison: 'نسبت به ماه گذشته'
        },
        recommendations: [
          'افزایش تعامل با مشتریان',
          'بهبود زمان پاسخگویی',
          'شرکت در دوره‌های آموزشی'
        ]
      },
      aiRecommendations: {
        recommendations: [
          'تماس هفتگی برای پیگیری وضعیت',
          'ارائه مشوق‌های تشویقی',
          'بررسی چالش‌های موجود'
        ],
        insights: [
          {
            type: 'info' as const,
            title: 'الگوی فعالیت مناسب',
            description: 'این نماینده در روزهای ابتدای هفته فعالیت بیشتری دارد',
            confidence: 88,
            actionRequired: false
          }
        ],
        nextActions: [
          'تماس تلفنی',
          'ارسال پیامک',
          'برنامه‌ریزی جلسه'
        ]
      }
    };

    // Filter data based on user permissions
    const filteredProfile = CrmAuthService.filterData(user, 'representatives', profile);

    res.json(filteredProfile);

  } catch (error: any) {
    console.error('CRM representative profile error:', error);
    res.status(500).json({ 
      error: 'خطا در دریافت پروفایل نماینده' 
    });
  }
});

// Update representative level
router.put('/representatives/:id/level', 
  authMiddleware, 
  CrmAuthService.createRoleMiddleware(undefined, { resource: 'representative_levels', action: 'UPDATE' }),
  async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);
      const { newLevel, reason } = req.body;

      if (!representativeId || !newLevel || !reason) {
        return res.status(400).json({ 
          error: 'اطلاعات کامل نیست' 
        });
      }

      // Mock update - in real implementation, this would update the database
      console.log(`Updating representative ${representativeId} level to ${newLevel}: ${reason}`);

      res.json({
        success: true,
        message: 'سطح نماینده با موفقیت تغییر یافت',
        newLevel,
        reason
      });

    } catch (error: any) {
      console.error('CRM level update error:', error);
      res.status(500).json({ 
        error: 'خطا در تغییر سطح نماینده' 
      });
    }
  }
);

// Generate task for representative
router.post('/representatives/:id/tasks/generate',
  authMiddleware,
  CrmAuthService.createRoleMiddleware(undefined, { resource: 'crm_tasks', action: 'CREATE' }),
  async (req, res) => {
    try {
      const representativeId = parseInt(req.params.id);

      if (!representativeId) {
        return res.status(400).json({ 
          error: 'شناسه نماینده نامعتبر است' 
        });
      }

      // Mock task generation
      const task = {
        id: Date.now(),
        title: 'پیگیری وضعیت مشتریان',
        description: 'تماس با مشتریان و بررسی رضایت آن‌ها',
        priority: 'متوسط',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        assignedBy: 'سیستم هوشمند'
      };

      res.json({
        success: true,
        task,
        message: 'وظیفه جدید با موفقیت تولید شد'
      });

    } catch (error: any) {
      console.error('CRM task generation error:', error);
      res.status(500).json({ 
        error: 'خطا در تولید وظیفه' 
      });
    }
  }
);

export default router;