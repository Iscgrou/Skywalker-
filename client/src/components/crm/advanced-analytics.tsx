// 📊 ADVANCED ANALYTICS & SCHEDULING - DA VINCI v9.0 Phase 4
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { 
  TrendingUp, 
  TrendingDown,
  Calendar as CalendarIcon,
  Clock,
  Target,
  Brain,
  Zap,
  Users,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Download,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Filter,
  Eye,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { apiRequest } from '@/lib/queryClient';
import { CurrencyFormatter } from '@/lib/currency-formatter';
import { toPersianDigits } from '@/lib/persian-date';

interface AdvancedAnalyticsData {
  timeRange: string;
  generatedAt: string;
  insights: AnalyticsInsight[];
  performance: AnalyticsPerformance;
  scheduledReports: ScheduledReport[];
}

interface AnalyticsInsight {
  id: string;
  type: 'TREND_ANALYSIS' | 'PREDICTIVE_ANALYSIS' | 'ANOMALY_DETECTION' | 'PATTERN_RECOGNITION';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  dataPoints?: DataPoint[];
  predictions?: Prediction[];
  recommendations: string[];
  actionItems?: string[];
}

interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

interface Prediction {
  period: string;
  probability: number;
  estimatedIncrease: number;
}

interface AnalyticsPerformance {
  processingTime: number;
  dataAccuracy: number;
  modelConfidence: number;
  culturalAdaptation: number;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  nextRun: string;
  recipients: string[];
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
}

export default function AdvancedAnalytics() {
  const [activeTab, setActiveTab] = useState('insights');
  const [timeRange, setTimeRange] = useState('last_30_days');
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [newReportConfig, setNewReportConfig] = useState({
    name: '',
    type: 'PERFORMANCE_SUMMARY',
    frequency: 'MONTHLY',
    recipients: [''],
    includeCharts: true,
    includePredictions: true
  });

  const { hasPermission } = useCrmAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Advanced Analytics
  const { data: analyticsData, isLoading, refetch } = useQuery<AdvancedAnalyticsData>({
    queryKey: ['/api/crm/advanced-analytics', timeRange],
    refetchInterval: 60000 // Refresh every minute
  });

  // Schedule Report Mutation
  const scheduleReportMutation = useMutation({
    mutationFn: async (reportConfig: any) => {
      return apiRequest('/api/crm/advanced-analytics/schedule', {
        method: 'POST',
        data: {
          reportType: reportConfig.type,
          frequency: reportConfig.frequency,
          recipients: reportConfig.recipients.filter((r: string) => r.trim()),
          parameters: {
            includeCharts: reportConfig.includeCharts,
            includePredictions: reportConfig.includePredictions,
            timeRange
          }
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "گزارش زمان‌بندی شد",
        description: "گزارش جدید با موفقیت برنامه‌ریزی شد",
      });
      setNewReportConfig({
        name: '',
        type: 'PERFORMANCE_SUMMARY',
        frequency: 'MONTHLY',
        recipients: [''],
        includeCharts: true,
        includePredictions: true
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "خطا در زمان‌بندی",
        description: "مشکلی در برنامه‌ریزی گزارش رخ داده است",
        variant: "destructive"
      });
    }
  });

  // Export Report Mutation
  const exportReportMutation = useMutation({
    mutationFn: async (format: string) => {
      return apiRequest(`/api/crm/advanced-analytics/export?format=${format}&timeRange=${timeRange}`, {
        method: 'GET'
      });
    },
    onSuccess: () => {
      toast({
        title: "گزارش صادر شد",
        description: "فایل گزارش آماده دانلود است",
      });
    }
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'TREND_ANALYSIS': return <TrendingUp className="h-4 w-4" />;
      case 'PREDICTIVE_ANALYSIS': return <Brain className="h-4 w-4" />;
      case 'ANOMALY_DETECTION': return <AlertTriangle className="h-4 w-4" />;
      case 'PATTERN_RECOGNITION': return <Target className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'text-red-600 bg-red-50';
      case 'MEDIUM': return 'text-orange-600 bg-orange-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const addRecipient = () => {
    setNewReportConfig(prev => ({
      ...prev,
      recipients: [...prev.recipients, '']
    }));
  };

  const updateRecipient = (index: number, value: string) => {
    setNewReportConfig(prev => ({
      ...prev,
      recipients: prev.recipients.map((r, i) => i === index ? value : r)
    }));
  };

  const removeRecipient = (index: number) => {
    setNewReportConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال تحلیل داده‌های پیشرفته...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold">تحلیل‌های پیشرفته</h1>
              <p className="text-muted-foreground">
                بینش‌های هوشمند و پیش‌بینی‌های دقیق با AI
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">هفته گذشته</SelectItem>
              <SelectItem value="last_30_days">ماه گذشته</SelectItem>
              <SelectItem value="last_90_days">سه ماه گذشته</SelectItem>
              <SelectItem value="last_year">سال گذشته</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            onClick={() => refetch()}
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
            تازه‌سازی
          </Button>

          <Button 
            onClick={() => exportReportMutation.mutate('pdf')}
            disabled={exportReportMutation.isPending}
            size="sm"
          >
            {exportReportMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            صدور گزارش
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            عملکرد سیستم تحلیل
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {toPersianDigits(analyticsData?.performance?.processingTime || 0)}ms
              </div>
              <p className="text-sm text-muted-foreground mb-2">زمان پردازش</p>
              <Progress value={(analyticsData?.performance?.processingTime || 0) / 5} />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {toPersianDigits(analyticsData?.performance?.dataAccuracy || 0)}%
              </div>
              <p className="text-sm text-muted-foreground mb-2">دقت داده‌ها</p>
              <Progress value={analyticsData?.performance?.dataAccuracy || 0} />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 mb-2">
                {toPersianDigits(analyticsData?.performance?.modelConfidence || 0)}%
              </div>
              <p className="text-sm text-muted-foreground mb-2">اعتماد مدل</p>
              <Progress value={analyticsData?.performance?.modelConfidence || 0} />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 mb-2">
                {toPersianDigits(analyticsData?.performance?.culturalAdaptation || 0)}%
              </div>
              <p className="text-sm text-muted-foreground mb-2">سازگاری فرهنگی</p>
              <Progress value={analyticsData?.performance?.culturalAdaptation || 0} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">بینش‌های هوشمند</TabsTrigger>
          <TabsTrigger value="predictions">پیش‌بینی‌ها</TabsTrigger>
          <TabsTrigger value="schedule">گزارش‌های زمان‌بندی</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Insights List */}
            <div className="lg:col-span-2 space-y-4">
              {analyticsData?.insights?.map(insight => (
                <Card 
                  key={insight.id} 
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedInsight === insight.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedInsight(insight.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getInsightIcon(insight.type)}
                        {insight.title}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getImpactColor(insight.impact)}>
                          {insight.impact}
                        </Badge>
                        <div className="text-sm text-muted-foreground">
                          {toPersianDigits(insight.confidence)}% اطمینان
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4">{insight.description}</p>
                    
                    {insight.recommendations && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">توصیه‌ها:</h4>
                        <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                          {insight.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Detailed View */}
            <div>
              {selectedInsight ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      جزئیات تحلیل
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analyticsData?.insights?.find(i => i.id === selectedInsight)?.dataPoints && (
                        <div>
                          <h4 className="font-medium mb-2">نمودار روند:</h4>
                          <div className="space-y-2">
                            {analyticsData.insights.find(i => i.id === selectedInsight)!.dataPoints!.map((point, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{new Date(point.date).toLocaleDateString('fa-IR')}</span>
                                <span className="font-medium">{toPersianDigits(point.value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {analyticsData?.insights?.find(i => i.id === selectedInsight)?.actionItems && (
                        <div>
                          <h4 className="font-medium mb-2">اقدامات پیشنهادی:</h4>
                          <ul className="space-y-1">
                            {analyticsData.insights.find(i => i.id === selectedInsight)!.actionItems!.map((action, index) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <CheckCircle2 className="h-3 w-3 mt-1 text-green-600" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">
                      یک بینش را برای مشاهده جزئیات انتخاب کنید
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analyticsData?.insights?.filter(insight => insight.type === 'PREDICTIVE_ANALYSIS').map(prediction => (
              <Card key={prediction.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    {prediction.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{prediction.description}</p>
                  
                  {prediction.predictions && (
                    <div className="space-y-3">
                      <h4 className="font-medium">پیش‌بینی‌های کمی:</h4>
                      {prediction.predictions.map((pred, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">{pred.period}</div>
                            <div className="text-sm text-muted-foreground">
                              احتمال: {toPersianDigits(pred.probability)}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">
                              +{toPersianDigits(pred.estimatedIncrease)}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              افزایش پیش‌بینی
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Existing Scheduled Reports */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    گزارش‌های زمان‌بندی شده
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analyticsData?.scheduledReports?.map(report => (
                      <div key={report.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{report.name}</h4>
                          <Badge variant={report.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>تناوب: {report.frequency}</div>
                          <div>اجرای بعدی: {new Date(report.nextRun).toLocaleDateString('fa-IR')}</div>
                          <div>گیرندگان: {report.recipients.length} نفر</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* New Report Configuration */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    ایجاد گزارش جدید
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>نام گزارش</Label>
                    <Input
                      value={newReportConfig.name}
                      onChange={(e) => setNewReportConfig(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="نام گزارش را وارد کنید"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>نوع گزارش</Label>
                    <Select 
                      value={newReportConfig.type}
                      onValueChange={(value) => setNewReportConfig(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERFORMANCE_SUMMARY">خلاصه عملکرد</SelectItem>
                        <SelectItem value="TREND_ANALYSIS">تحلیل روند</SelectItem>
                        <SelectItem value="PREDICTIVE_INSIGHTS">بینش‌های پیش‌بینی</SelectItem>
                        <SelectItem value="CULTURAL_ANALYSIS">تحلیل فرهنگی</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>تناوب ارسال</Label>
                    <Select 
                      value={newReportConfig.frequency}
                      onValueChange={(value) => setNewReportConfig(prev => ({ ...prev, frequency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">روزانه</SelectItem>
                        <SelectItem value="WEEKLY">هفتگی</SelectItem>
                        <SelectItem value="MONTHLY">ماهانه</SelectItem>
                        <SelectItem value="QUARTERLY">فصلی</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>گیرندگان</Label>
                    {newReportConfig.recipients.map((recipient, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={recipient}
                          onChange={(e) => updateRecipient(index, e.target.value)}
                          placeholder="آدرس ایمیل"
                          type="email"
                        />
                        {newReportConfig.recipients.length > 1 && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeRecipient(index)}
                          >
                            حذف
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addRecipient}
                      className="w-full"
                    >
                      افزودن گیرنده
                    </Button>
                  </div>

                  <Button 
                    onClick={() => scheduleReportMutation.mutate(newReportConfig)}
                    disabled={!newReportConfig.name || scheduleReportMutation.isPending}
                    className="w-full"
                  >
                    {scheduleReportMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    زمان‌بندی گزارش
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}