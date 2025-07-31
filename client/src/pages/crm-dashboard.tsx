// 🌟 CRM DASHBOARD - Persian Cultural AI Management Interface
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Bell
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';

interface CrmDashboardData {
  totalRepresentatives: number;
  activeRepresentatives: number;
  pendingTasks: number;
  completedTasksToday: number;
  aiInsights: AIInsight[];
  recentActivity: ActivityItem[];
  performanceAlerts: PerformanceAlert[];
}

interface AIInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  confidence: number;
  actionRequired: boolean;
}

interface ActivityItem {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'level_changed' | 'ai_decision';
  description: string;
  timestamp: Date;
  representativeName?: string;
}

interface PerformanceAlert {
  representativeId: number;
  representativeName: string;
  alertType: 'poor_performance' | 'overdue_tasks' | 'inactive' | 'improvement_needed';
  severity: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  recommendedAction: string;
}

export default function CrmDashboard() {
  const { data: dashboardData, isLoading, error } = useQuery<CrmDashboardData>({
    queryKey: ['/api/crm/dashboard'],
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  });

  const { data: representatives } = useQuery({
    queryKey: ['/api/crm/representatives']
  });

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
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 ml-2" />
            تنظیمات
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
            <div className="text-2xl font-bold">{dashboardData?.totalRepresentatives || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">
              {dashboardData?.activeRepresentatives || 0} نماینده فعال
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
            <CardTitle className="text-sm font-medium">وظایف در انتظار</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.pendingTasks || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">
              {dashboardData?.completedTasksToday || 0} انجام شده امروز
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
            <div className="text-2xl font-bold">{dashboardData?.aiInsights?.length || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">
              توصیه‌های جدید
            </p>
            <Link href="/crm/analytics">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Brain className="h-4 w-4" />
                مشاهده آمار
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">هشدارهای عملکرد</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData?.performanceAlerts?.length || 0}</div>
            <p className="text-xs text-muted-foreground mb-3">
              نیاز به بررسی
            </p>
            <Link href="/crm/notifications">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Bell className="h-4 w-4" />
                مشاهده اعلان‌ها
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="ai-insights">بینش‌های AI</TabsTrigger>
          <TabsTrigger value="performance">عملکرد تیم</TabsTrigger>
          <TabsTrigger value="activity">فعالیت‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  هشدارهای عملکرد
                </CardTitle>
                <CardDescription>
                  نمایندگانی که نیاز به توجه دارند
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dashboardData?.performanceAlerts?.map((alert) => (
                  <div key={alert.representativeId} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{alert.representativeName}</h4>
                      <Badge 
                        variant={
                          alert.severity === 'urgent' ? 'destructive' :
                          alert.severity === 'high' ? 'secondary' : 'outline'
                        }
                      >
                        {alert.severity === 'urgent' ? 'فوری' : 
                         alert.severity === 'high' ? 'بالا' : 
                         alert.severity === 'medium' ? 'متوسط' : 'پایین'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {alert.description}
                    </p>
                    <p className="text-sm font-medium">
                      📋 {alert.recommendedAction}
                    </p>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-4">
                    هیچ هشداری وجود ندارد
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  فعالیت‌های اخیر
                </CardTitle>
                <CardDescription>
                  آخرین تغییرات و عملیات
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dashboardData?.recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 border-b pb-2 last:border-b-0">
                    <div className="mt-1">
                      {activity.type === 'task_assigned' && <Target className="h-4 w-4 text-blue-500" />}
                      {activity.type === 'task_completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {activity.type === 'level_changed' && <TrendingUp className="h-4 w-4 text-orange-500" />}
                      {activity.type === 'ai_decision' && <Brain className="h-4 w-4 text-purple-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      {activity.representativeName && (
                        <p className="text-xs text-muted-foreground">
                          نماینده: {activity.representativeName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString('fa-IR')}
                      </p>
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-4">
                    فعالیتی ثبت نشده است
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData?.aiInsights?.map((insight, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      {insight.title}
                    </span>
                    <Badge variant={insight.type === 'success' ? 'default' : insight.type === 'warning' ? 'secondary' : 'outline'}>
                      {insight.confidence}% اطمینان
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {insight.description}
                  </p>
                  <Progress value={insight.confidence} className="mb-3" />
                  {insight.actionRequired && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        این بینش نیاز به اقدام دارد
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )) || (
              <Card className="col-span-2">
                <CardContent className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    دستیار هوشمند در حال تحلیل داده‌ها است...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>عملکرد کلی تیم</CardTitle>
              <CardDescription>
                نمای کلی از عملکرد نمایندگان
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(((dashboardData?.activeRepresentatives || 0) / (dashboardData?.totalRepresentatives || 1)) * 100)}%
                  </div>
                  <p className="text-sm text-muted-foreground">نمایندگان فعال</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round(((dashboardData?.completedTasksToday || 0) / (dashboardData?.pendingTasks || 1)) * 100)}%
                  </div>
                  <p className="text-sm text-muted-foreground">نرخ تکمیل وظایف</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboardData?.aiInsights?.reduce((avg, insight) => avg + insight.confidence, 0) / (dashboardData?.aiInsights?.length || 1) || 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">دقت AI</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>گزارش کامل فعالیت‌ها</CardTitle>
              <CardDescription>
                تمام فعالیت‌های سیستم CRM
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.recentActivity?.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {activity.type === 'task_assigned' && <Target className="h-5 w-5 text-blue-500" />}
                      {activity.type === 'task_completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {activity.type === 'level_changed' && <TrendingUp className="h-5 w-5 text-orange-500" />}
                      {activity.type === 'ai_decision' && <Brain className="h-5 w-5 text-purple-500" />}
                      <div>
                        <p className="font-medium">{activity.description}</p>
                        {activity.representativeName && (
                          <p className="text-sm text-muted-foreground">
                            نماینده: {activity.representativeName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString('fa-IR')}
                    </div>
                  </div>
                )) || (
                  <p className="text-center text-muted-foreground py-8">
                    فعالیتی برای نمایش وجود ندارد
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}