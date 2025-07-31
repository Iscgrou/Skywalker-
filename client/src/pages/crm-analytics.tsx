// 📊 CRM ANALYTICS & PERFORMANCE DASHBOARD
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Brain,
  ArrowLeft,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

interface PerformanceData {
  period: string;
  tasksCompleted: number;
  avgCompletionTime: number;
  successRate: number;
  aiAccuracy: number;
}

interface RepresentativeAnalytics {
  id: number;
  name: string;
  level: 'NEW' | 'ACTIVE' | 'INACTIVE';
  tasksCompleted: number;
  avgScore: number;
  relationshipScore: number;
  responseTime: number;
  trend: 'up' | 'down' | 'stable';
}

interface AIInsight {
  id: string;
  type: 'success_pattern' | 'improvement_area' | 'cultural_insight' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function CrmAnalytics() {
  const [timePeriod, setTimePeriod] = useState('30d');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const { data: performanceData, isLoading } = useQuery<PerformanceData[]>({
    queryKey: ['/api/crm/analytics/performance', timePeriod]
  });

  const { data: representativeAnalytics } = useQuery<RepresentativeAnalytics[]>({
    queryKey: ['/api/crm/analytics/representatives', selectedLevel]
  });

  const { data: aiInsights } = useQuery<AIInsight[]>({
    queryKey: ['/api/crm/analytics/ai-insights']
  });

  const taskDistributionData = [
    { name: 'پیگیری', value: 45, color: '#3B82F6' },
    { name: 'وصول مطالبات', value: 30, color: '#EF4444' },
    { name: 'توسعه ارتباط', value: 15, color: '#10B981' },
    { name: 'بررسی عملکرد', value: 10, color: '#F59E0B' }
  ];

  const levelDistribution = [
    { name: 'فعال', value: 65, color: '#10B981' },
    { name: 'جدید', value: 25, color: '#3B82F6' },
    { name: 'غیرفعال', value: 10, color: '#EF4444' }
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success_pattern':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'improvement_area':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'cultural_insight':
        return <Brain className="h-4 w-4 text-purple-600" />;
      case 'prediction':
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">بالا</Badge>;
      case 'medium':
        return <Badge variant="secondary">متوسط</Badge>;
      case 'low':
        return <Badge variant="outline">پایین</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری آمار...</p>
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
              <BarChart className="h-6 w-6" />
              آمار و تحلیل عملکرد
            </h1>
            <p className="text-muted-foreground">
              تحلیل هوشمند عملکرد نمایندگان و سیستم CRM
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 روز گذشته</SelectItem>
              <SelectItem value="30d">30 روز گذشته</SelectItem>
              <SelectItem value="90d">3 ماه گذشته</SelectItem>
              <SelectItem value="365d">سال گذشته</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">عملکرد کلی</TabsTrigger>
          <TabsTrigger value="representatives">نمایندگان</TabsTrigger>
          <TabsTrigger value="ai-insights">بینش‌های AI</TabsTrigger>
          <TabsTrigger value="predictions">پیش‌بینی‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>روند تکمیل وظایف</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="tasksCompleted" 
                      stroke="#3B82F6" 
                      name="وظایف تکمیل شده"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>نرخ موفقیت و دقت AI</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#10B981" 
                      name="نرخ موفقیت (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="aiAccuracy" 
                      stroke="#8B5CF6" 
                      name="دقت AI (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>توزیع انواع وظایف</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={taskDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                    >
                      {taskDistributionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>توزیع سطح نمایندگان</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={levelDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                    >
                      {levelDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="representatives" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">عملکرد نمایندگان</h3>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="فیلتر بر اساس سطح" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه سطوح</SelectItem>
                <SelectItem value="NEW">جدید</SelectItem>
                <SelectItem value="ACTIVE">فعال</SelectItem>
                <SelectItem value="INACTIVE">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {representativeAnalytics?.map(rep => (
              <Card key={rep.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-semibold">{rep.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant={rep.level === 'ACTIVE' ? 'default' : 'secondary'}>
                            {rep.level === 'NEW' ? 'جدید' : rep.level === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                          </Badge>
                          <span>•</span>
                          <span>{rep.tasksCompleted} وظیفه تکمیل شده</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-lg font-bold">{rep.avgScore}%</div>
                        <div className="text-xs text-muted-foreground">میانگین نمره</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{rep.relationshipScore}/100</div>
                        <div className="text-xs text-muted-foreground">ارتباط</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">{rep.responseTime}h</div>
                        <div className="text-xs text-muted-foreground">زمان پاسخ</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {rep.trend === 'up' && <TrendingUp className="h-5 w-5 text-green-600" />}
                      {rep.trend === 'down' && <TrendingUp className="h-5 w-5 text-red-600 rotate-180" />}
                      {rep.trend === 'stable' && <div className="h-5 w-5 bg-gray-400 rounded-full" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-6">
          <h3 className="text-lg font-semibold">بینش‌های هوش مصنوعی</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {aiInsights?.map(insight => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getInsightIcon(insight.type)}
                      <div className="flex-1">
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline">اعتماد: {insight.confidence}%</Badge>
                          {insight.actionable && <Badge variant="secondary">قابل اجرا</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getPriorityBadge(insight.priority)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                پیش‌بینی‌های هوشمند
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    پیش‌بینی عملکرد ماه آینده
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    بر اساس روندهای فعلی، انتظار می‌رود تکمیل وظایف ۱۵٪ افزایش یابد
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    فرصت بهبود شناسایی شده
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    نمایندگان سطح جدید نیاز به آموزش بیشتر در زمینه وصول مطالبات دارند
                  </p>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    هشدار عملکردی
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    ۳ نماینده در معرض تنزل سطح قرار دارند و نیاز به توجه فوری دارند
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}