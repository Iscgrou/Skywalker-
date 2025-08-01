// 📊 PERFORMANCE ANALYTICS PANEL - DA VINCI v6.0 Phase 3
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star,
  Trophy,
  Activity,
  PieChart,
  LineChart,
  Filter,
  RefreshCw,
  Download,
  ArrowLeft
} from 'lucide-react';
import { Link } from 'wouter';

interface PerformanceMetrics {
  representativeId: number;
  representativeName: string;
  period: string;
  metrics: {
    salesPerformance: {
      totalSales: number;
      salesGrowth: number;
      averageOrderValue: number;
      conversionRate: number;
      rank: number;
    };
    taskCompletion: {
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
      averageCompletionTime: number;
      overdueCount: number;
    };
    culturalAlignment: {
      adaptationScore: number;
      communicationEffectiveness: number;
      relationshipQuality: number;
      culturalSensitivity: number;
    };
    financialHealth: {
      debtToSalesRatio: number;
      paymentReliability: number;
      creditScore: number;
      riskLevel: string;
    };
    developmentProgress: {
      xpEarned: number;
      levelProgress: number;
      skillImprovements: string[];
      achievementCount: number;
    };
  };
  insights: any[];
  recommendations: string[];
  trendsAnalysis: {
    improving: string[];
    declining: string[];
    stable: string[];
  };
}

interface TeamPerformanceReport {
  period: string;
  teamSize: number;
  overallMetrics: {
    totalSales: number;
    salesGrowth: number;
    taskCompletionRate: number;
    culturalAlignmentAvg: number;
    financialHealthScore: number;
  };
  topPerformers: PerformanceMetrics[];
  underPerformers: PerformanceMetrics[];
  departmentBreakdown: any;
}

export function PerformanceAnalyticsPanel() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('monthly');
  const [selectedView, setSelectedView] = useState<string>('overview');
  const [selectedRepresentative, setSelectedRepresentative] = useState<string>('');

  // Team analytics query
  const { data: teamReport, isLoading: teamLoading, refetch: refetchTeam } = useQuery<TeamPerformanceReport>({
    queryKey: ['/api/crm/analytics/team', selectedPeriod],
    refetchInterval: 60000
  });

  // Individual representative analytics query
  const { data: representativeMetrics, isLoading: repLoading } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/crm/analytics/representative', selectedRepresentative, selectedPeriod],
    enabled: !!selectedRepresentative,
    refetchInterval: 60000
  });

  // Dashboard analytics query
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/crm/analytics/dashboard'],
    refetchInterval: 30000
  });

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال';
  };

  const getRiskLevelBadge = (level: string) => {
    switch (level) {
      case 'LOW':
        return <Badge variant="default" className="bg-green-600">ریسک پایین</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">ریسک متوسط</Badge>;
      case 'HIGH':
        return <Badge variant="default" className="bg-orange-600">ریسک بالا</Badge>;
      case 'CRITICAL':
        return <Badge variant="destructive">ریسک بحرانی</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  if (teamLoading || dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری تحلیل عملکرد...</p>
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
              آمار و گزارش‌های عملکرد با هوش مصنوعی فارسی
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="انتخاب دوره" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">روزانه</SelectItem>
              <SelectItem value="weekly">هفتگی</SelectItem>
              <SelectItem value="monthly">ماهانه</SelectItem>
              <SelectItem value="quarterly">فصلی</SelectItem>
              <SelectItem value="yearly">سالانه</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => refetchTeam()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 ml-1" />
            بروزرسانی
          </Button>
          
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 ml-1" />
            دانلود گزارش
          </Button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      {teamReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                تعداد تیم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamReport.teamSize}</div>
              <p className="text-xs text-muted-foreground">نماینده فعال</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                کل فروش
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(teamReport.overallMetrics.totalSales)}
              </div>
              <p className="text-xs text-muted-foreground">
                رشد: {teamReport.overallMetrics.salesGrowth.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                تکمیل وظایف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {teamReport.overallMetrics.taskCompletionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">میانگین تیم</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Brain className="h-4 w-4" />
                هم‌راستایی فرهنگی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {teamReport.overallMetrics.culturalAlignmentAvg.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">از 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                سلامت مالی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">
                {teamReport.overallMetrics.financialHealthScore.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">امتیاز کلی</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="individual">تحلیل فردی</TabsTrigger>
          <TabsTrigger value="trends">روندها</TabsTrigger>
          <TabsTrigger value="insights">بینش‌های AI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-600" />
                  برترین عملکردها
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {teamReport?.topPerformers?.map((performer, index) => (
                  <div key={performer.representativeId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <h4 className="font-medium">{performer.representativeName}</h4>
                        <p className="text-sm text-muted-foreground">
                          رتبه فروش: {performer.metrics.salesPerformance.rank}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-green-600">
                        {formatCurrency(performer.metrics.salesPerformance.totalSales)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        تکمیل وظایف: {performer.metrics.taskCompletion.completionRate}%
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Performance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  توزیع عملکرد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">عملکرد عالی</span>
                    <span className="text-sm font-medium text-green-600">
                      {teamReport?.topPerformers?.length || 0} نماینده
                    </span>
                  </div>
                  <Progress value={((teamReport?.topPerformers?.length || 0) / (teamReport?.teamSize || 1)) * 100} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">نیاز به بهبود</span>
                    <span className="text-sm font-medium text-orange-600">
                      {teamReport?.underPerformers?.length || 0} نماینده
                    </span>
                  </div>
                  <Progress value={((teamReport?.underPerformers?.length || 0) / (teamReport?.teamSize || 1)) * 100} className="h-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">عملکرد متوسط</span>
                    <span className="text-sm font-medium text-blue-600">
                      {(teamReport?.teamSize || 0) - (teamReport?.topPerformers?.length || 0) - (teamReport?.underPerformers?.length || 0)} نماینده
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Critical Alerts */}
          {teamReport?.underPerformers && teamReport.underPerformers.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-5 w-5" />
                  هشدارهای مهم
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teamReport.underPerformers.map(performer => (
                    <div key={performer.representativeId} className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg">
                      <div>
                        <h4 className="font-medium text-orange-800">{performer.representativeName}</h4>
                        <p className="text-sm text-orange-600">
                          عملکرد زیر انتظار - نیاز به توجه فوری
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {getRiskLevelBadge(performer.metrics.financialHealth.riskLevel)}
                        <Button size="sm" variant="outline">
                          جزئیات
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>انتخاب نماینده برای تحلیل تفصیلی</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedRepresentative} onValueChange={setSelectedRepresentative}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب نماینده" />
                </SelectTrigger>
                <SelectContent>
                  {teamReport?.topPerformers.concat(teamReport.underPerformers).map(performer => (
                    <SelectItem key={performer.representativeId} value={performer.representativeId.toString()}>
                      {performer.representativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {representativeMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    عملکرد فروش
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>کل فروش:</span>
                      <span className="font-medium">{formatCurrency(representativeMetrics.metrics.salesPerformance.totalSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>رشد فروش:</span>
                      <span className={`font-medium ${representativeMetrics.metrics.salesPerformance.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {representativeMetrics.metrics.salesPerformance.salesGrowth.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>رتبه:</span>
                      <span className="font-medium">#{representativeMetrics.metrics.salesPerformance.rank}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cultural Alignment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    هم‌راستایی فرهنگی
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">سازگاری:</span>
                        <span className="text-sm">{representativeMetrics.metrics.culturalAlignment.adaptationScore}/100</span>
                      </div>
                      <Progress value={representativeMetrics.metrics.culturalAlignment.adaptationScore} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">کیفیت ارتباط:</span>
                        <span className="text-sm">{representativeMetrics.metrics.culturalAlignment.communicationEffectiveness}/100</span>
                      </div>
                      <Progress value={representativeMetrics.metrics.culturalAlignment.communicationEffectiveness} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">کیفیت روابط:</span>
                        <span className="text-sm">{representativeMetrics.metrics.culturalAlignment.relationshipQuality}/100</span>
                      </div>
                      <Progress value={representativeMetrics.metrics.culturalAlignment.relationshipQuality} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  در حال بهبود
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {representativeMetrics?.trendsAnalysis?.improving?.map((trend, index) => (
                    <div key={index} className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {trend}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  در حال کاهش
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {representativeMetrics?.trendsAnalysis?.declining?.map((trend, index) => (
                    <div key={index} className="text-sm text-red-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      {trend}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  پایدار
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {representativeMetrics?.trendsAnalysis?.stable?.map((trend, index) => (
                    <div key={index} className="text-sm text-blue-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {trend}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                بینش‌های هوش مصنوعی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  بینش‌های هوش مصنوعی در حال پردازش است...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}