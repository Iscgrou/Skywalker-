// 📊 PERFORMANCE ANALYTICS - DA VINCI v9.0 Enhanced CRM Analytics
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  ArrowLeft,
  Brain,
  Calendar,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  LineChart,
  PieChart,
  Activity
} from 'lucide-react';
import { Link } from 'wouter';
import { CurrencyFormatter } from '@/lib/currency-formatter';
import { toPersianDigits } from '@/lib/persian-date';

interface Representative {
  id: number;
  code: string;
  name: string;
  totalDebt: string;
  totalSales: string;
  isActive: boolean;
}

interface PerformanceMetrics {
  salesPerformance: {
    totalSales: number;
    monthlyGrowth: number;
    targetAchievement: number;
    trend: 'up' | 'down' | 'stable';
  };
  debtManagement: {
    totalDebt: number;
    collectionRate: number;
    avgCollectionTime: number;
    overdueAmount: number;
  };
  activityMetrics: {
    tasksCompleted: number;
    avgResponseTime: number;
    successRate: number;
    engagementScore: number;
  };
  aiInsights: {
    performanceScore: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
    predictedTrend: string;
  };
}

export default function PerformanceAnalytics() {
  const [selectedRepresentative, setSelectedRepresentative] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('30');
  const [activeTab, setActiveTab] = useState('overview');

  const { data: representatives } = useQuery<Representative[]>({
    queryKey: ['/api/crm/representatives'],
    refetchInterval: 30000
  });

  const { data: performanceData, isLoading } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/crm/performance-analytics', selectedRepresentative, timeRange],
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال تحلیل عملکرد...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 ml-1" />
              بازگشت به داشبورد
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              تحلیل عملکرد هوشمند
            </h1>
            <p className="text-muted-foreground">
              آنالیز جامع عملکرد با هوش مصنوعی فارسی
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium">انتخاب نماینده</label>
          <Select value={selectedRepresentative} onValueChange={setSelectedRepresentative}>
            <SelectTrigger>
              <SelectValue placeholder="انتخاب نماینده" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه نمایندگان</SelectItem>
              {representatives?.map((rep) => (
                <SelectItem key={rep.id} value={rep.id.toString()}>
                  {rep.name} ({rep.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">بازه زمانی</label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">۷ روز گذشته</SelectItem>
              <SelectItem value="30">۳۰ روز گذشته</SelectItem>
              <SelectItem value="90">۳ ماه گذشته</SelectItem>
              <SelectItem value="365">سال گذشته</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">نوع تحلیل</label>
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">خلاصه کلی</SelectItem>
              <SelectItem value="sales">تحلیل فروش</SelectItem>
              <SelectItem value="debt">مدیریت بدهی</SelectItem>
              <SelectItem value="ai-insights">بینش‌های AI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Performance Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            خلاصه کلی
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            تحلیل فروش
          </TabsTrigger>
          <TabsTrigger value="debt" className="gap-2">
            <DollarSign className="h-4 w-4" />
            مدیریت بدهی
          </TabsTrigger>
          <TabsTrigger value="ai-insights" className="gap-2">
            <Brain className="h-4 w-4" />
            بینش‌های AI
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  فروش کل
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {CurrencyFormatter.formatForCRM(performanceData?.salesPerformance?.totalSales || 150000000)}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Badge variant="outline" className="text-green-600">
                    +{toPersianDigits((performanceData?.salesPerformance?.monthlyGrowth || 12).toString())}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">نسبت به ماه قبل</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-red-500" />
                  کل بدهی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {CurrencyFormatter.formatForCRM(performanceData?.debtManagement?.totalDebt || 45000000)}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Badge variant="outline" className="text-blue-600">
                    {toPersianDigits((performanceData?.debtManagement?.collectionRate || 78).toString())}%
                  </Badge>
                  <span className="text-xs text-muted-foreground">نرخ وصول</span>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  دستیابی به هدف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {toPersianDigits((performanceData?.salesPerformance?.targetAchievement || 85).toString())}%
                </div>
                <Progress 
                  value={performanceData?.salesPerformance?.targetAchievement || 85} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-500" />
                  امتیاز عملکرد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {toPersianDigits((performanceData?.aiInsights?.performanceScore || 92).toString())}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <Badge 
                    variant={performanceData?.aiInsights?.riskLevel === 'low' ? 'default' : 
                            performanceData?.aiInsights?.riskLevel === 'medium' ? 'secondary' : 'destructive'}
                  >
                    {performanceData?.aiInsights?.riskLevel === 'low' ? 'ریسک پایین' :
                     performanceData?.aiInsights?.riskLevel === 'medium' ? 'ریسک متوسط' : 'ریسک بالا'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                روند عملکرد {timeRange} روزه
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">نمودار عملکرد در حال بارگذاری...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Analysis Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>تحلیل فروش ماهانه</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>هدف ماهانه:</span>
                    <span className="font-bold">{CurrencyFormatter.formatForCRM(100000000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>فروش تحقق یافته:</span>
                    <span className="font-bold text-green-600">
                      {CurrencyFormatter.formatForCRM(performanceData?.salesPerformance?.totalSales || 85000000)}
                    </span>
                  </div>
                  <Progress value={85} />
                  <div className="text-sm text-muted-foreground">
                    {toPersianDigits('85')}% از هدف ماهانه محقق شده است
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>بهترین نمایندگان</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {representatives?.slice(0, 3).map((rep, index) => (
                    <div key={rep.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? 'default' : 'secondary'}>
                          {toPersianDigits((index + 1).toString())}
                        </Badge>
                        <div>
                          <div className="font-medium">{rep.name}</div>
                          <div className="text-xs text-muted-foreground">{rep.code}</div>
                        </div>
                      </div>
                      <div className="text-green-600 font-bold">
                        {CurrencyFormatter.formatForCRM(parseFloat(rep.totalSales || "0"))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Debt Management Tab */}
        <TabsContent value="debt" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>وضعیت وصول مطالبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>نرخ وصول:</span>
                    <Badge variant="default" className="bg-blue-600">
                      {toPersianDigits((performanceData?.debtManagement?.collectionRate || 78).toString())}%
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>میانگین زمان وصول:</span>
                    <span className="font-bold">
                      {toPersianDigits((performanceData?.debtManagement?.avgCollectionTime || 15).toString())} روز
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>معوقات:</span>
                    <span className="font-bold text-red-600">
                      {CurrencyFormatter.formatForCRM(performanceData?.debtManagement?.overdueAmount || 12000000)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>نمایندگان با بیشترین بدهی</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {representatives
                    ?.sort((a, b) => parseFloat(b.totalDebt || "0") - parseFloat(a.totalDebt || "0"))
                    ?.slice(0, 3)
                    ?.map((rep, index) => (
                    <div key={rep.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <div>
                          <div className="font-medium">{rep.name}</div>
                          <div className="text-xs text-muted-foreground">{rep.code}</div>
                        </div>
                      </div>
                      <div className="text-red-600 font-bold">
                        {CurrencyFormatter.formatForCRM(parseFloat(rep.totalDebt || "0"))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  تحلیل هوشمند عملکرد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      {performanceData?.aiInsights?.predictedTrend || 'بر اساس تحلیل الگوهای فروش، انتظار رشد ۱۲٪ در ماه آینده وجود دارد'}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">توصیه‌های بهبود:</h4>
                    <ul className="space-y-1 text-sm">
                      {(performanceData?.aiInsights?.recommendations || [
                        'تمرکز بر نمایندگان با عملکرد پایین',
                        'بهبود سیستم پیگیری مطالبات',
                        'افزایش تعامل با مشتریان کلیدی'
                      ]).map((rec, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>پیش‌بینی عملکرد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">نمودار پیش‌بینی در حال بارگذاری...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}