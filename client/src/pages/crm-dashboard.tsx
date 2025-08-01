// 🎨 CRM DASHBOARD - Claymorphism Design with Persian Cultural AI
import { useState, useEffect } from 'react';
import { ClayCard, ClayCardContent, ClayCardDescription, ClayCardHeader, ClayCardTitle } from '@/components/ui/clay-card';
import { ClayButton } from '@/components/ui/clay-button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Users, 
  Brain, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  MessageSquare,
  Target,
  Activity,
  Settings,
  Bell,
  LogOut,
  BarChart3,
  Bot,
  Sparkles,
  Zap,
  Award,
  Heart
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { useToast } from '@/hooks/use-toast';
import { AdaptiveLearningDashboard } from '@/components/adaptive-learning-dashboard';
import { DailySchedulerDashboard } from '@/components/daily-scheduler-dashboard';
import { CurrencyFormatter } from '@/lib/currency-formatter';
import { toPersianDigits } from '@/lib/persian-date';

interface CrmDashboardData {
  summary: {
    totalRepresentatives: number;
    activeRepresentatives: number;
    totalSales: number;
    totalDebt: number;
    pendingTasks: number;
    completedTasksToday: number;
  };
  representatives: Array<{
    id: number;
    code: string;
    name: string;
    debtAmount: number;
    totalSales: number;
    isActive: boolean;
  }>;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'task_completed' | 'level_change';
  description: string;
}

export default function CrmDashboard() {
  const [, setLocation] = useLocation();
  const [showFinancialReport, setShowFinancialReport] = useState(false);

  const { toast } = useToast();

  const handleFinancialReportClick = () => {
    setShowFinancialReport(true);
    toast({
      title: "گزارش مالی",
      description: "در حال تولید گزارش جامع مالی...",
    });
  };
  const { user, logoutMutation } = useCrmAuth();
  
  const { data: dashboardData, isLoading, error } = useQuery<CrmDashboardData>({
    queryKey: ['/api/crm/dashboard'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    enabled: !!user // Only run query if user is authenticated
  });

  // Use useEffect to handle redirect - avoid setState during render
  useEffect(() => {
    if (!user) {
      setLocation('/'); // Redirect to root login page
    }
  }, [user, setLocation]);

  // Return early if no user - but don't redirect in render
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation('/'); // Redirect to root login page
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ClayCard className="clay-pulse">
          <ClayCardContent className="flex flex-col items-center p-8">
            <div className="w-16 h-16 rounded-full clay-metric-card flex items-center justify-center text-2xl mb-4">
              🧠
            </div>
            <p className="text-muted-foreground">در حال بارگذاری داشبورد CRM...</p>
          </ClayCardContent>
        </ClayCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ClayCard className="clay-alert">
          <ClayCardContent className="flex items-center gap-4 p-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <h3 className="font-bold text-lg">خطا در بارگذاری</h3>
              <p className="text-muted-foreground">
                امکان دریافت اطلاعات داشبورد وجود ندارد. لطفاً دوباره تلاش کنید.
              </p>
            </div>
          </ClayCardContent>
        </ClayCard>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return toPersianDigits(new Intl.NumberFormat('en-US').format(num));
  };

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="clay-floating absolute top-20 left-10 w-32 h-32 rounded-full" 
             style={{background: 'var(--clay-lavender)', opacity: 0.15, filter: 'blur(1px)'}}></div>
        <div className="clay-floating absolute top-40 right-20 w-24 h-24 rounded-full" 
             style={{background: 'var(--clay-mint)', opacity: 0.12, animationDelay: '1s', filter: 'blur(1px)'}}></div>
        <div className="clay-floating absolute bottom-32 left-1/3 w-20 h-20 rounded-full" 
             style={{background: 'var(--clay-baby-blue)', opacity: 0.18, animationDelay: '2s', filter: 'blur(1px)'}}></div>
        <div className="clay-floating absolute top-1/2 right-10 w-16 h-16 rounded-full" 
             style={{background: 'var(--clay-peach)', opacity: 0.1, animationDelay: '0.5s', filter: 'blur(2px)'}}></div>
        <div className="clay-floating absolute bottom-20 right-1/4 w-28 h-28 rounded-full" 
             style={{background: 'var(--clay-rose)', opacity: 0.08, animationDelay: '1.5s', filter: 'blur(2px)'}}></div>
      </div>

      <div className="relative container mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl clay-metric-card flex items-center justify-center text-2xl">
                🧠
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  داشبورد CRM هوشمند
                </h1>
                <p className="text-lg text-gray-300">
                  مدیریت نمایندگان با هوش مصنوعی فارسی
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="clay-badge">
                کاربر: {user.username}
              </div>
              <div className="clay-badge" style={{background: 'var(--clay-mint)'}}>
                نقش: {user.role}
              </div>
              <div className="clay-badge clay-pulse" style={{background: 'var(--clay-baby-blue)'}}>
                🔗 متصل
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <ClayButton variant="secondary" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 ml-2" />
              خروج
            </ClayButton>
            <ClayButton variant="primary" size="lg">
              <Brain className="h-5 w-5 ml-2" />
              دستیار هوشمند
            </ClayButton>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ClayCard variant="metric" className="clay-floating">
            <ClayCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <ClayCardTitle className="text-sm font-medium text-white/90">کل نمایندگان</ClayCardTitle>
              <Users className="h-6 w-6 text-white/80" />
            </ClayCardHeader>
            <ClayCardContent>
              <div className="text-3xl font-bold text-white">{dashboardData?.summary?.totalRepresentatives || 0}</div>
              <p className="text-xs text-white/70">
                {dashboardData?.summary?.activeRepresentatives || 0} فعال
              </p>
            </ClayCardContent>
          </ClayCard>

          <ClayCard variant="default" className="clay-floating" style={{animationDelay: '0.2s', background: 'linear-gradient(135deg, var(--clay-mint) 0%, var(--clay-sage) 100%)'}}>
            <ClayCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <ClayCardTitle className="text-sm font-medium text-white/90">کل فروش</ClayCardTitle>
              <TrendingUp className="h-6 w-6 text-white/80" />
            </ClayCardHeader>
            <ClayCardContent>
              <div className="text-3xl font-bold text-white">
                {dashboardData?.summary?.totalSales ? 
                  CurrencyFormatter.formatForCRM(dashboardData.summary.totalSales) : '۰'}
              </div>
              <p className="text-xs text-white/70 mb-4">
                کل مبلغ فروش
              </p>
              <ClayButton 
                variant="ghost" 
                size="sm" 
                className="w-full gap-2 bg-white/05 hover:bg-white/10"
                onClick={handleFinancialReportClick}
              >
                <TrendingUp className="h-4 w-4" />
                گزارش مالی
              </ClayButton>
            </ClayCardContent>
          </ClayCard>

          <ClayCard variant="default" className="clay-floating" style={{animationDelay: '0.4s', background: 'linear-gradient(135deg, var(--clay-baby-blue) 0%, var(--clay-lavender) 100%)'}}>
            <ClayCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <ClayCardTitle className="text-sm font-medium text-white/90">وظایف در انتظار</ClayCardTitle>
              <Clock className="h-6 w-6 text-white/80" />
            </ClayCardHeader>
            <ClayCardContent>
              <div className="text-3xl font-bold text-white">{dashboardData?.summary?.pendingTasks || 0}</div>
              <p className="text-xs text-white/70 mb-4">
                {dashboardData?.summary?.completedTasksToday || 0} تکمیل شده امروز
              </p>
              <ClayButton 
                variant="ghost" 
                size="sm" 
                className="w-full gap-2 bg-white/05 hover:bg-white/10"
              >
                <Target className="h-4 w-4" />
                مشاهده وظایف
              </ClayButton>
            </ClayCardContent>
          </ClayCard>

          <ClayCard variant="default" className="clay-floating" style={{animationDelay: '0.6s', background: 'linear-gradient(135deg, var(--clay-peach) 0%, var(--clay-rose) 100%)'}}>
            <ClayCardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <ClayCardTitle className="text-sm font-medium text-white/90">کل بدهی</ClayCardTitle>
              <AlertTriangle className="h-6 w-6 text-white/80" />
            </ClayCardHeader>
            <ClayCardContent>
              <div className="text-3xl font-bold text-white">
                {CurrencyFormatter.formatForCRM(dashboardData?.summary?.totalDebt || 0)}
              </div>
              <p className="text-xs text-white/70 mb-4">
                نیاز به پیگیری
              </p>
              <ClayButton 
                variant="ghost" 
                size="sm" 
                className="w-full gap-2 bg-white/05 hover:bg-white/10"
              >
                <TrendingUp className="h-4 w-4" />
                گزارش مالی
              </ClayButton>
            </ClayCardContent>
          </ClayCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ClayCard className="clay-nav-item">
            <ClayCardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl clay-metric-card flex items-center justify-center">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-200">فضای کار هوشمند</h3>
                  <p className="text-sm text-gray-400">دستیار AI با درک فرهنگی</p>
                </div>
                <Link href="/crm/ai-workspace">
                  <ClayButton variant="accent" size="sm">
                    <Sparkles className="h-4 w-4 ml-2" />
                    ورود
                  </ClayButton>
                </Link>
              </div>
            </ClayCardContent>
          </ClayCard>

          <ClayCard className="clay-nav-item">
            <ClayCardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl" style={{background: 'linear-gradient(135deg, var(--clay-mint) 0%, var(--clay-sage) 100%)'}}>
                  <div className="w-full h-full flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-200">تحلیل پیشرفته</h3>
                  <p className="text-sm text-gray-400">آنالیز هوشمند و پیش‌بینی</p>
                </div>
                <Link href="/crm/advanced-analytics">
                  <ClayButton variant="secondary" size="sm">
                    <Activity className="h-4 w-4 ml-2" />
                    مشاهده
                  </ClayButton>
                </Link>
              </div>
            </ClayCardContent>
          </ClayCard>

          <ClayCard className="clay-nav-item">
            <ClayCardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl" style={{background: 'linear-gradient(135deg, var(--clay-baby-blue) 0%, var(--clay-lavender) 100%)'}}>
                  <div className="w-full h-full flex items-center justify-center">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-200">تنظیمات AI</h3>
                  <p className="text-sm text-gray-400">کنترل هوش مصنوعی</p>
                </div>
                <Link href="/crm/admin/ai-config">
                  <ClayButton variant="primary" size="sm">
                    <Zap className="h-4 w-4 ml-2" />
                    تنظیم
                  </ClayButton>
                </Link>
              </div>
            </ClayCardContent>
          </ClayCard>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/crm/representatives">
            <ClayCard className="clay-nav-item group cursor-pointer">
              <ClayCardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-purple-400 group-hover:text-white transition-colors" />
                <h3 className="font-semibold text-gray-200 group-hover:text-white">نمایندگان</h3>
                <p className="text-sm text-gray-400 group-hover:text-white/80">مدیریت نمایندگان</p>
              </ClayCardContent>
            </ClayCard>
          </Link>

          <Link href="/crm/tasks">
            <ClayCard className="clay-nav-item group cursor-pointer">
              <ClayCardContent className="p-6 text-center">
                <Target className="h-8 w-8 mx-auto mb-3 text-blue-400 group-hover:text-white transition-colors" />
                <h3 className="font-semibold text-gray-200 group-hover:text-white">وظایف</h3>
                <p className="text-sm text-gray-400 group-hover:text-white/80">مدیریت وظایف</p>
              </ClayCardContent>
            </ClayCard>
          </Link>

          <Link href="/crm/analytics">
            <ClayCard className="clay-nav-item group cursor-pointer">
              <ClayCardContent className="p-6 text-center">
                <BarChart3 className="h-8 w-8 mx-auto mb-3 text-green-400 group-hover:text-white transition-colors" />
                <h3 className="font-semibold text-gray-200 group-hover:text-white">تحلیل عملکرد</h3>
                <p className="text-sm text-gray-400 group-hover:text-white/80">آمار و گزارشات</p>
              </ClayCardContent>
            </ClayCard>
          </Link>

          <Link href="/crm/notifications">
            <ClayCard className="clay-nav-item group cursor-pointer">
              <ClayCardContent className="p-6 text-center">
                <Bell className="h-8 w-8 mx-auto mb-3 text-orange-400 group-hover:text-white transition-colors" />
                <h3 className="font-semibold text-gray-200 group-hover:text-white">اعلانات</h3>
                <p className="text-sm text-gray-400 group-hover:text-white/80">پیام‌ها و هشدارها</p>
              </ClayCardContent>
            </ClayCard>
          </Link>
        </div>

        {/* Performance Overview */}
        <ClayCard className="clay-floating">
          <ClayCardHeader>
            <ClayCardTitle className="flex items-center gap-2 text-gray-200">
              <Award className="h-5 w-5 text-purple-400" />
              عملکرد کلی سیستم
            </ClayCardTitle>
            <ClayCardDescription className="text-gray-400">
              آخرین وضعیت نمایندگان و فعالیت‌های هوشمند
            </ClayCardDescription>
          </ClayCardHeader>
          <ClayCardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">پیشرفت کلی</span>
                <span className="text-sm text-gray-400">87%</span>
              </div>
              <div className="clay-progress h-3">
                <div className="clay-progress-fill h-full" style={{width: '87%'}}></div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">156</div>
                  <div className="text-xs text-gray-400">تعامل AI</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">94%</div>
                  <div className="text-xs text-gray-400">دقت پیش‌بینی</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">23</div>
                  <div className="text-xs text-gray-400">وظیفه هوشمند</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">91%</div>
                  <div className="text-xs text-gray-400">رضایت کاربر</div>
                </div>
              </div>
            </div>
          </ClayCardContent>
        </ClayCard>

        {/* Smart Learning & Scheduling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClayCard>
            <ClayCardHeader>
              <ClayCardTitle className="flex items-center gap-2 text-gray-200">
                <Brain className="h-5 w-5 text-blue-400" />
                یادگیری انطباقی
              </ClayCardTitle>
              <ClayCardDescription className="text-gray-400">
                سیستم یادگیری هوشمند و بهینه‌سازی خودکار
              </ClayCardDescription>
            </ClayCardHeader>
            <ClayCardContent>
              <AdaptiveLearningDashboard />
            </ClayCardContent>
          </ClayCard>

          <ClayCard>
            <ClayCardHeader>
              <ClayCardTitle className="flex items-center gap-2 text-gray-200">
                <Clock className="h-5 w-5 text-green-400" />
                برنامه‌ریز روزانه
              </ClayCardTitle>
              <ClayCardDescription className="text-gray-400">
                زمان‌بندی هوشمند و مدیریت وظایف خودکار
              </ClayCardDescription>
            </ClayCardHeader>
            <ClayCardContent>
              <DailySchedulerDashboard />
            </ClayCardContent>
          </ClayCard>
        </div>

        {/* Footer with Love */}
        <div className="text-center py-8">
          <ClayCard className="clay-floating inline-block">
            <ClayCardContent className="px-6 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <span>ساخته شده با</span>
                <Heart className="h-4 w-4 text-red-400 clay-pulse" />
                <span>برای مدیریت بهتر نمایندگان</span>
              </div>
            </ClayCardContent>
          </ClayCard>
        </div>

      </div>

      {/* Financial Report Dialog */}
      <Dialog open={showFinancialReport} onOpenChange={setShowFinancialReport}>
        <DialogContent className="clay-card">
          <DialogHeader>
            <DialogTitle>گزارش مالی جامع</DialogTitle>
            <DialogDescription>
              تحلیل جامع وضعیت مالی نمایندگان
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ClayCard>
              <ClayCardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {CurrencyFormatter.formatForCRM(dashboardData?.summary?.totalSales || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">کل فروش</div>
                </div>
              </ClayCardContent>
            </ClayCard>
            <ClayCard>
              <ClayCardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {CurrencyFormatter.formatForCRM(dashboardData?.summary?.totalDebt || 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">کل بدهی</div>
                </div>
              </ClayCardContent>
            </ClayCard>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}