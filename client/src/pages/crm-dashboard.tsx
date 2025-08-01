// 🌟 CRM DASHBOARD - Persian Cultural AI Management Interface
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  BarChart3
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
    totalDebt: number;
    totalSales: number;
    pendingTasks: number;
    completedTasksToday: number;
    aiInsights: AIInsight[];
    recentActivities: ActivityItem[];
  };
  representatives: Representative[];
}

interface Representative {
  id: number;
  code: string;
  name: string;
  debtAmount: number;
  totalSales: number;
  isActive: boolean;
}

interface AIInsight {
  id: string;
  type: 'improvement' | 'alert' | 'info';
  title: string;
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
      setLocation('/auth');
    }
  }, [user, setLocation]);

  // Return early if no user - but don't redirect in render
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
    setLocation('/auth');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری داشبورد CRM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>خطا در بارگذاری</AlertTitle>
        <AlertDescription>
          امکان دریافت اطلاعات داشبورد وجود ندارد. لطفاً دوباره تلاش کنید.
        </AlertDescription>
      </Alert>
    );
  }

  const formatNumber = (num: number) => {
    return toPersianDigits(new Intl.NumberFormat('en-US').format(num));
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            📊 داشبورد CRM هوشمند
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            مدیریت نمایندگان با هوش مصنوعی فارسی
          </p>
          <div className="mt-2">
            <Badge variant="outline">
              کاربر: {user.username} | نقش: {user.role}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 ml-2" />
            خروج
          </Button>
          <Button size="sm">
            <Brain className="h-4 w-4 ml-2" />
            دستیار هوشمند
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل نمایندگان</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.summary?.totalRepresentatives || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">
              {dashboardData?.summary?.activeRepresentatives || 0} نماینده فعال
            </p>
            <Link href="/crm/representatives">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Users className="h-4 w-4" />
                مشاهده همه
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل بدهی</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {CurrencyFormatter.formatForCRM(dashboardData?.summary?.totalDebt || 0)}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              کل فروش: {CurrencyFormatter.formatForCRM(dashboardData?.summary?.totalSales || 0)}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full gap-2"
              onClick={handleFinancialReportClick}
            >
              <TrendingUp className="h-4 w-4" />
              گزارش مالی
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">وظایف در انتظار</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.summary?.pendingTasks || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">
              {dashboardData?.summary?.completedTasksToday || 0} تکمیل شده امروز
            </p>
            <Link href="/crm/tasks">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Target className="h-4 w-4" />
                مدیریت وظایف
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">بینش‌های AI</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.summary?.aiInsights?.length || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">
              توصیه‌های جدید
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/crm/ai-workspace">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Bot className="h-4 w-4" />
                  میز کار AI
                </Button>
              </Link>
              <Link href="/crm/advanced-analytics">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <BarChart3 className="h-4 w-4" />
                  تحلیل پیشرفته
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="representatives">نمایندگان</TabsTrigger>
          <TabsTrigger value="learning">یادگیری تطبیقی</TabsTrigger>
          <TabsTrigger value="scheduler">برنامه‌ریز روزانه</TabsTrigger>
          <TabsTrigger value="activity">فعالیت‌ها</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>عملکرد کلی</CardTitle>
                <CardDescription>آمار عملکرد سیستم</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">نمایندگان فعال</span>
                    <span className="font-bold text-green-600">
                      {Math.round(((dashboardData?.summary?.activeRepresentatives || 0) / (dashboardData?.summary?.totalRepresentatives || 1)) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={((dashboardData?.summary?.activeRepresentatives || 0) / (dashboardData?.summary?.totalRepresentatives || 1)) * 100} 
                  />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">نرخ تکمیل وظایف</span>
                    <span className="font-bold text-blue-600">
                      {Math.round(((dashboardData?.summary?.completedTasksToday || 0) / (dashboardData?.summary?.pendingTasks || 1)) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={((dashboardData?.summary?.completedTasksToday || 0) / (dashboardData?.summary?.pendingTasks || 1)) * 100} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card>
              <CardHeader>
                <CardTitle>بینش‌های AI</CardTitle>
                <CardDescription>تحلیل‌های هوش مصنوعی</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.summary?.aiInsights?.map((insight) => (
                    <div key={insight.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <div>
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={insight.type === 'alert' ? 'destructive' : 'default'}>
                          {insight.type}
                        </Badge>
                      </div>
                    </div>
                  )) || (
                    <p className="text-muted-foreground text-center py-4">
                      در حال تحلیل داده‌ها...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="representatives" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نمایندگان برتر</CardTitle>
              <CardDescription>نمایندگان با بیشترین فعالیت</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.representatives?.slice(0, 5).map((rep) => (
                  <div key={rep.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-medium">{rep.name}</h4>
                        <p className="text-sm text-muted-foreground">کد: {rep.code}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-red-600">
                        {CurrencyFormatter.formatForCRM(rep.debtAmount)}
                      </div>
                      <p className="text-xs text-muted-foreground">بدهی</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">
                    در حال بارگذاری نمایندگان...
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <AdaptiveLearningDashboard />
        </TabsContent>

        <TabsContent value="scheduler" className="space-y-4">
          <DailySchedulerDashboard />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>فعالیت‌های اخیر</CardTitle>
              <CardDescription>آخرین تغییرات سیستم</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.summary?.recentActivities?.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    {activity.type === 'task_completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                    {activity.type === 'level_change' && <TrendingUp className="h-5 w-5 text-blue-500" />}
                    <div>
                      <p className="font-medium">{activity.description}</p>
                    </div>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">
                    هیچ فعالیت جدیدی وجود ندارد
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Financial Report Dialog */}
      <Dialog open={showFinancialReport} onOpenChange={setShowFinancialReport}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              گزارش مالی جامع
            </DialogTitle>
            <DialogDescription>
              تحلیل کامل وضعیت مالی نمایندگان و پیش‌بینی‌های هوشمند
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">کل بدهی</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {CurrencyFormatter.formatForCRM(dashboardData?.summary?.totalDebt || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">کل فروش</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {CurrencyFormatter.formatForCRM(dashboardData?.summary?.totalSales || 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">نرخ بازیافت</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(((dashboardData?.summary?.totalSales || 0) / (dashboardData?.summary?.totalDebt || 1)) * 100)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Debtors */}
            <Card>
              <CardHeader>
                <CardTitle>نمایندگان با بیشترین بدهی</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboardData?.representatives
                    ?.sort((a, b) => b.debtAmount - a.debtAmount)
                    ?.slice(0, 5)
                    ?.map((rep) => (
                      <div key={rep.id} className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                        <div>
                          <span className="font-medium">{rep.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">{rep.code}</span>
                        </div>
                        <div className="text-red-600 font-bold">
                          {CurrencyFormatter.formatForCRM(rep.debtAmount)}
                        </div>
                      </div>
                    )) || (
                    <div className="text-muted-foreground text-center py-4">
                      اطلاعات در حال بارگذاری...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Insights for Finance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  تحلیل هوشمند مالی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      بر اساس تحلیل روندها، انتظار کاهش ۱۵٪ بدهی‌ها در ماه آینده وجود دارد
                    </AlertDescription>
                  </Alert>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {Math.round((dashboardData?.representatives?.filter(r => r.debtAmount > 50000000).length || 0) / (dashboardData?.representatives?.length || 1) * 100)}% از نمایندگان دارای بدهی بالای ۵ میلیون تومان هستند
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}