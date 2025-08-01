// 👤 REPRESENTATIVE PROFILE - CRM Individual Management
import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Brain, 
  TrendingUp, 
  Clock, 
  Target,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Activity,
  MessageSquare,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { apiRequest } from '@/lib/queryClient';
import AIInsightsPanel from '@/components/crm/ai-insights-panel';
import VoiceBiographyPanel from '@/components/crm/voice-biography-panel';
import VoiceTaskCreator from '@/components/crm/voice-task-creator';
import { CurrencyFormatter } from '@/lib/currency-formatter';

interface RepresentativeProfile {
  representativeId: number;
  basicProfile: {
    id: number;
    code: string;
    name: string;
    ownerName: string | null;
    phone: string | null;
    isActive: boolean;
  };
  financialSummary: {
    debtAmount: number;
    creditLevel: 'بالا' | 'متوسط' | 'پایین';
    paymentStatus: 'منظم' | 'نامنظم' | 'معوقه';
    lastPaymentDate: string | null;
  };
  level?: {
    currentLevel: 'NEW' | 'ACTIVE' | 'INACTIVE';
    previousLevel?: string;
    levelChangeReason?: string;
    psychologicalProfile?: any;
    communicationStyle?: string;
  };
  performance?: {
    overallScore: number;
    taskStats: {
      assigned: number;
      completed: number;
      overdue: number;
      successRate: number;
    };
    trendAnalysis: {
      trend: 'بهبود' | 'ثابت' | 'افت';
      changePercent: number;
      periodComparison: string;
    };
    recommendations: string[];
  };
  aiRecommendations?: {
    recommendations: string[];
    insights: AIInsight[];
    nextActions: string[];
  };
  restrictedData: boolean;
}

interface AIInsight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  confidence: number;
  actionRequired: boolean;
}

export default function RepresentativeProfile() {
  const params = useParams();
  const { toast } = useToast();
  const { hasPermission, isCrm } = useCrmAuth();
  const queryClient = useQueryClient();
  const representativeId = parseInt(params.id as string);

  const [showLevelChangeDialog, setShowLevelChangeDialog] = useState(false);
  const [newLevel, setNewLevel] = useState<'NEW' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [levelChangeReason, setLevelChangeReason] = useState('');

  const { data: profile, isLoading, error } = useQuery<RepresentativeProfile>({
    queryKey: ['/api/crm/representatives', representativeId],
    enabled: !!representativeId
  });

  const levelChangeMutation = useMutation({
    mutationFn: async ({ newLevel, reason }: { newLevel: string; reason: string }) => {
      const response = await apiRequest(`/api/crm/representatives/${representativeId}/level`, {
        method: 'PUT',
        data: {
          newLevel,
          reason
        }
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/representatives', representativeId] });
      setShowLevelChangeDialog(false);
      toast({
        title: "سطح نماینده تغییر یافت",
        description: "تغییرات با موفقیت اعمال شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا در تغییر سطح",
        description: "امکان تغییر سطح نماینده وجود ندارد",
        variant: "destructive",
      });
    }
  });

  const generateTaskMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/crm/representatives/${representativeId}/tasks/generate`, {
        method: 'POST'
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "وظیفه جدید تولید شد",
        description: data.task?.title || "وظیفه با موفقیت ایجاد شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا در تولید وظیفه",
        description: "امکان تولید وظیفه جدید وجود ندارد",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری پروفایل...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>خطا در بارگذاری</AlertTitle>
        <AlertDescription>
          امکان دریافت اطلاعات نماینده وجود ندارد.
        </AlertDescription>
      </Alert>
    );
  }

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'NEW':
        return <Badge variant="secondary">جدید</Badge>;
      case 'ACTIVE':
        return <Badge variant="default">فعال</Badge>;
      case 'INACTIVE':
        return <Badge variant="destructive">غیرفعال</Badge>;
      default:
        return <Badge variant="outline">نامشخص</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'منظم':
        return <Badge variant="default" className="bg-green-600">منظم</Badge>;
      case 'نامنظم':
        return <Badge variant="secondary">نامنظم</Badge>;
      case 'معوقه':
        return <Badge variant="destructive">معوقه</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 ml-1" />
            بازگشت
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {profile.basicProfile.name}
            </h1>
            <p className="text-muted-foreground">
              کد نماینده: {profile.basicProfile.code}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {hasPermission('crm_tasks', 'CREATE') && (
            <>
              <VoiceTaskCreator
                representativeId={representativeId}
                representativeName={profile.basicProfile.name}
                onTaskCreated={(task) => {
                  toast({
                    title: "وظیفه صوتی ایجاد شد",
                    description: `وظیفه "${task.title}" با موفقیت ثبت شد`,
                  });
                }}
              />
              <Button 
                onClick={() => generateTaskMutation.mutate()}
                disabled={generateTaskMutation.isPending}
                variant="outline"
              >
                <Target className="h-4 w-4 ml-2" />
                تولید وظیفه
              </Button>
            </>
          )}
          {hasPermission('representative_levels', 'UPDATE') && (
            <Dialog open={showLevelChangeDialog} onOpenChange={setShowLevelChangeDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 ml-2" />
                  تغییر سطح
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>تغییر سطح نماینده</DialogTitle>
                  <DialogDescription>
                    سطح جدید نماینده و دلیل تغییر را مشخص کنید
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>سطح جدید</Label>
                    <Select value={newLevel} onValueChange={(value: any) => setNewLevel(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">جدید</SelectItem>
                        <SelectItem value="ACTIVE">فعال</SelectItem>
                        <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>دلیل تغییر</Label>
                    <Textarea 
                      value={levelChangeReason}
                      onChange={(e) => setLevelChangeReason(e.target.value)}
                      placeholder="دلیل تغییر سطح را شرح دهید..."
                    />
                  </div>
                  <Button 
                    onClick={() => levelChangeMutation.mutate({ newLevel, reason: levelChangeReason })}
                    disabled={!levelChangeReason.trim() || levelChangeMutation.isPending}
                    className="w-full"
                  >
                    تایید تغییر
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Basic Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">وضعیت</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {profile.basicProfile.isActive ? (
                <Badge variant="default">فعال</Badge>
              ) : (
                <Badge variant="secondary">غیرفعال</Badge>
              )}
              {profile.level && getLevelBadge(profile.level.currentLevel)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">بدهی</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-red-600">
              {CurrencyFormatter.formatForCRM(profile.financialSummary.debtAmount)}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs text-muted-foreground">
                اعتبار: {profile.financialSummary.creditLevel}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">وضعیت پرداخت</CardTitle>
          </CardHeader>
          <CardContent>
            {getPaymentStatusBadge(profile.financialSummary.paymentStatus)}
            {profile.financialSummary.lastPaymentDate && (
              <p className="text-xs text-muted-foreground mt-1">
                آخرین پرداخت: {new Date(profile.financialSummary.lastPaymentDate).toLocaleDateString('fa-IR')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">عملکرد کلی</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {profile.performance?.overallScore || 0}%
            </div>
            <Progress value={profile.performance?.overallScore || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">اطلاعات کلی</TabsTrigger>
          <TabsTrigger value="performance">عملکرد</TabsTrigger>
          <TabsTrigger value="ai-analysis" className="gap-2">
            <Brain className="h-4 w-4" />
            تحلیل هوشمند
          </TabsTrigger>
          <TabsTrigger value="contact">تماس</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Representative Level Info */}
            {profile.level && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    اطلاعات سطح نماینده
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>سطح فعلی:</span>
                    {getLevelBadge(profile.level.currentLevel)}
                  </div>
                  {profile.level.previousLevel && (
                    <div className="flex justify-between items-center">
                      <span>سطح قبلی:</span>
                      <span className="text-muted-foreground">{profile.level.previousLevel}</span>
                    </div>
                  )}
                  {profile.level.communicationStyle && (
                    <div className="flex justify-between items-center">
                      <span>سبک ارتباطی:</span>
                      <Badge variant="outline">{profile.level.communicationStyle}</Badge>
                    </div>
                  )}
                  {profile.level.levelChangeReason && (
                    <div className="border-t pt-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>دلیل تغییر سطح:</strong> {profile.level.levelChangeReason}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  خلاصه مالی
                </CardTitle>
                <CardDescription>
                  {isCrm && "نمایش محدود - مطابق سطح دسترسی CRM"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>میزان بدهی:</span>
                  <span className="font-bold">
                    {profile.financialSummary.debtAmount.toLocaleString('fa-IR')} ریال
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>سطح اعتبار:</span>
                  <Badge variant={
                    profile.financialSummary.creditLevel === 'بالا' ? 'default' :
                    profile.financialSummary.creditLevel === 'متوسط' ? 'secondary' : 'outline'
                  }>
                    {profile.financialSummary.creditLevel}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>وضعیت پرداخت:</span>
                  {getPaymentStatusBadge(profile.financialSummary.paymentStatus)}
                </div>
                {isCrm && (
                  <Alert className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      اطلاعات مالی تفصیلی و مبالغ فروش در پنل CRM قابل نمایش نیست
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {profile.performance ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>آمار وظایف</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {profile.performance.taskStats.assigned}
                      </div>
                      <p className="text-sm text-muted-foreground">واگذار شده</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {profile.performance.taskStats.completed}
                      </div>
                      <p className="text-sm text-muted-foreground">تکمیل شده</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {profile.performance.taskStats.overdue}
                      </div>
                      <p className="text-sm text-muted-foreground">معوقه</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {profile.performance.taskStats.successRate}%
                      </div>
                      <p className="text-sm text-muted-foreground">نرخ موفقیت</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>تحلیل روند</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>روند عملکرد:</span>
                    <Badge variant={
                      profile.performance.trendAnalysis.trend === 'بهبود' ? 'default' :
                      profile.performance.trendAnalysis.trend === 'ثابت' ? 'secondary' : 'destructive'
                    }>
                      {profile.performance.trendAnalysis.trend}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>درصد تغییر:</span>
                    <span className={`font-bold ${
                      profile.performance.trendAnalysis.changePercent > 0 ? 'text-green-600' : 
                      profile.performance.trendAnalysis.changePercent < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {profile.performance.trendAnalysis.changePercent > 0 ? '+' : ''}
                      {profile.performance.trendAnalysis.changePercent}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile.performance.trendAnalysis.periodComparison}
                  </p>
                </CardContent>
              </Card>

              {profile.performance.recommendations.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>توصیه‌های بهبود</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {profile.performance.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  اطلاعات عملکرد در دسترس نیست
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ai-insights" className="space-y-4">
          {profile.aiRecommendations ? (
            <div className="space-y-6">
              {/* AI Insights */}
              {profile.aiRecommendations.insights.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {profile.aiRecommendations.insights.map((insight, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            {insight.title}
                          </span>
                          <Badge variant="outline">
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
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {profile.aiRecommendations.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>توصیه‌های هوش مصنوعی</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {profile.aiRecommendations.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Brain className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Next Actions */}
              {profile.aiRecommendations.nextActions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>اقدامات پیشنهادی</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {profile.aiRecommendations.nextActions.map((action, index) => (
                        <Button key={index} variant="outline" size="sm" className="justify-start">
                          <Target className="h-4 w-4 ml-2" />
                          {action}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  بینش‌های هوش مصنوعی در حال پردازش است...
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="ai-analysis" className="space-y-4">
          <AIInsightsPanel 
            representativeId={profile.basicProfile.id}
            representativeName={profile.basicProfile.name}
          />
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                اطلاعات تماس
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile.basicProfile.name}</p>
                    <p className="text-sm text-muted-foreground">نام نماینده</p>
                  </div>
                </div>
                
                {profile.basicProfile.ownerName && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{profile.basicProfile.ownerName}</p>
                      <p className="text-sm text-muted-foreground">نام مالک</p>
                    </div>
                  </div>
                )}
                
                {profile.basicProfile.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{profile.basicProfile.phone}</p>
                      <p className="text-sm text-muted-foreground">شماره تماس</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{profile.basicProfile.code}</p>
                    <p className="text-sm text-muted-foreground">کد نماینده</p>
                  </div>
                </div>
              </div>
              
              {isCrm && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    برخی اطلاعات تماس ممکن است در پنل CRM محدود باشد
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}