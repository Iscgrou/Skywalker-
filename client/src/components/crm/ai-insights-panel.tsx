// 🧠 AI INSIGHTS PANEL - DA VINCI v6.0 Persian Cultural Intelligence
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  MessageCircle, 
  Clock, 
  Users,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Zap,
  Heart,
  Star
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AIInsightsPanelProps {
  representativeId: number;
  representativeName: string;
}

interface PsychologicalProfile {
  communicationStyle: 'formal' | 'informal' | 'mixed';
  responsiveness: 'high' | 'medium' | 'low';
  preferredContactTime: 'morning' | 'afternoon' | 'evening' | 'flexible';
  paymentBehavior: 'punctual' | 'delayed' | 'irregular';
  businessOrientation: 'traditional' | 'modern' | 'hybrid';
  culturalAdaptation: number;
  trustLevel: 'high' | 'medium' | 'low';
  motivationFactors: string[];
  concerns: string[];
  opportunities: string[];
}

interface CulturalInsight {
  category: 'communication' | 'business_practice' | 'relationship' | 'timing';
  insight: string;
  actionable: boolean;
  confidence: number;
  culturalRelevance: number;
}

interface AITask {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: 'follow_up' | 'payment_reminder' | 'relationship_building' | 'performance_review';
  culturalContext: string;
  suggestedApproach: string;
  expectedOutcome: string;
  dueDate: string;
  aiConfidence: number;
}

interface LevelAnalysis {
  currentLevel: 'NEW' | 'ACTIVE' | 'INACTIVE';
  suggestedLevel: 'NEW' | 'ACTIVE' | 'INACTIVE';
  reason: string;
  confidence: number;
  actionRequired: boolean;
}

export default function AIInsightsPanel({ representativeId, representativeName }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [generateLoading, setGenerateLoading] = useState(false);

  // Fetch psychological profile
  const { data: profileData, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: [`/api/ai/profile/${representativeId}`],
    queryFn: async () => {
      const response = await apiRequest('POST', `/api/ai/profile/${representativeId}`);
      return response.json();
    },
    enabled: false // Manual trigger
  });

  // Fetch cultural insights
  const { data: insightsData, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: [`/api/ai/insights/${representativeId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/insights/${representativeId}`);
      return response.json();
    },
    enabled: false // Manual trigger
  });

  // Fetch level analysis
  const { data: levelData, isLoading: levelLoading, refetch: refetchLevel } = useQuery({
    queryKey: [`/api/ai/analysis/${representativeId}/level`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/analysis/${representativeId}/level`);
      return response.json();
    },
    enabled: false // Manual trigger
  });

  // Fetch recommendations
  const { data: recommendationsData, isLoading: recommendationsLoading, refetch: refetchRecommendations } = useQuery({
    queryKey: [`/api/ai/recommendations/${representativeId}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/ai/recommendations/${representativeId}`);
      return response.json();
    },
    enabled: false // Manual trigger
  });

  // Generate AI tasks
  const { data: tasksData, isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: [`/api/ai/tasks/${representativeId}/generate`],
    queryFn: async () => {
      const response = await apiRequest('POST', `/api/ai/tasks/${representativeId}/generate`);
      return response.json();
    },
    enabled: false // Manual trigger
  });

  const handleGenerateAllInsights = async () => {
    setGenerateLoading(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchInsights(),
        refetchLevel(),
        refetchRecommendations(),
        refetchTasks()
      ]);
    } catch (error) {
      console.error('Error generating AI insights:', error);
    } finally {
      setGenerateLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTrustLevelIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInsightIcon = (category: string) => {
    switch (category) {
      case 'communication': return <MessageCircle className="h-4 w-4" />;
      case 'business_practice': return <TrendingUp className="h-4 w-4" />;
      case 'relationship': return <Heart className="h-4 w-4" />;
      case 'timing': return <Clock className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              تحلیل هوشمند فرهنگی
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              DA VINCI v6.0 Persian AI Engine - {representativeName}
            </p>
          </div>
        </div>

        <Button 
          onClick={handleGenerateAllInsights}
          disabled={generateLoading}
          className="gap-2"
        >
          {generateLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Zap className="h-4 w-4" />
          )}
          تولید تحلیل جامع
        </Button>
      </div>

      {/* AI Status */}
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <Brain className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          موتور هوش مصنوعی فارسی فعال است. تحلیل‌ها بر اساس الگوهای فرهنگی و رفتاری ایرانی انجام می‌شود.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="gap-2">
            <Users className="h-4 w-4" />
            پروفایل
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            بینش‌ها
          </TabsTrigger>
          <TabsTrigger value="level" className="gap-2">
            <Target className="h-4 w-4" />
            سطح‌بندی
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            وظایف
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Star className="h-4 w-4" />
            توصیه‌ها
          </TabsTrigger>
        </TabsList>

        {/* Psychological Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {profileLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3">در حال تولید پروفایل روانشناختی...</span>
              </CardContent>
            </Card>
          ) : profileData?.profile ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Communication Style */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    سبک ارتباط
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={`mb-2 ${profileData.profile.communicationStyle === 'formal' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {profileData.profile.communicationStyle === 'formal' ? 'رسمی' : 
                     profileData.profile.communicationStyle === 'informal' ? 'غیررسمی' : 'ترکیبی'}
                  </Badge>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    پاسخگویی: {profileData.profile.responsiveness === 'high' ? 'بالا' : 
                               profileData.profile.responsiveness === 'medium' ? 'متوسط' : 'پایین'}
                  </p>
                </CardContent>
              </Card>

              {/* Trust Level */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {getTrustLevelIcon(profileData.profile.trustLevel)}
                    سطح اعتماد
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${profileData.profile.trustLevel === 'high' ? 'bg-green-100 text-green-800' : 
                                       profileData.profile.trustLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                                       'bg-red-100 text-red-800'}`}>
                      {profileData.profile.trustLevel === 'high' ? 'بالا' : 
                       profileData.profile.trustLevel === 'medium' ? 'متوسط' : 'پایین'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    رفتار پرداخت: {profileData.profile.paymentBehavior === 'punctual' ? 'منظم' : 
                                  profileData.profile.paymentBehavior === 'delayed' ? 'تاخیری' : 'نامنظم'}
                  </p>
                </CardContent>
              </Card>

              {/* Cultural Adaptation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Heart className="h-4 w-4" />
                    انطباق فرهنگی
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={profileData.profile.culturalAdaptation} className="mb-2" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {profileData.profile.culturalAdaptation}% انطباق با فرهنگ کسب‌وکار ایرانی
                  </p>
                </CardContent>
              </Card>

              {/* Business Orientation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    گرایش کسب‌وکار
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={`mb-2 ${profileData.profile.businessOrientation === 'modern' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}`}>
                    {profileData.profile.businessOrientation === 'traditional' ? 'سنتی' : 
                     profileData.profile.businessOrientation === 'modern' ? 'مدرن' : 'ترکیبی'}
                  </Badge>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    زمان تماس: {profileData.profile.preferredContactTime === 'morning' ? 'صبح' : 
                                profileData.profile.preferredContactTime === 'afternoon' ? 'عصر' : 
                                profileData.profile.preferredContactTime === 'evening' ? 'شب' : 'انعطاف‌پذیر'}
                  </p>
                </CardContent>
              </Card>

              {/* Motivation Factors */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">عوامل انگیزشی</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profileData.profile.motivationFactors?.map((factor: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center p-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  برای تولید پروفایل روانشناختی، دکمه "تولید تحلیل جامع" را کلیک کنید
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cultural Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {insightsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3">در حال تولید بینش‌های فرهنگی...</span>
              </CardContent>
            </Card>
          ) : insightsData?.insights ? (
            <div className="space-y-4">
              {insightsData.insights.map((insight: CulturalInsight, index: number) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        {getInsightIcon(insight.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {insight.category === 'communication' ? 'ارتباط' :
                             insight.category === 'business_practice' ? 'شیوه کسب‌وکار' :
                             insight.category === 'relationship' ? 'روابط' : 'زمان‌بندی'}
                          </Badge>
                          <Badge className="text-xs bg-green-100 text-green-800">
                            {insight.confidence}% اطمینان
                          </Badge>
                          {insight.actionable && (
                            <Badge className="text-xs bg-blue-100 text-blue-800">
                              قابل اجرا
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {insight.insight}
                        </p>
                        <div className="mt-2">
                          <Progress value={insight.culturalRelevance} className="h-1" />
                          <p className="text-xs text-gray-500 mt-1">
                            ارتباط فرهنگی: {insight.culturalRelevance}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center p-8">
                <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  بینش‌های فرهنگی در دسترس نیست
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Level Analysis Tab */}
        <TabsContent value="level" className="space-y-4">
          {levelLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3">در حال تحلیل سطح...</span>
              </CardContent>
            </Card>
          ) : levelData?.analysis ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  تحلیل سطح نماینده
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">سطح فعلی</label>
                    <Badge className={`mt-1 ${levelData.analysis.currentLevel === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                                           levelData.analysis.currentLevel === 'NEW' ? 'bg-blue-100 text-blue-800' : 
                                           'bg-red-100 text-red-800'}`}>
                      {levelData.analysis.currentLevel === 'ACTIVE' ? 'فعال' : 
                       levelData.analysis.currentLevel === 'NEW' ? 'جدید' : 'غیرفعال'}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">سطح پیشنهادی</label>
                    <Badge className={`mt-1 ${levelData.analysis.suggestedLevel === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                                           levelData.analysis.suggestedLevel === 'NEW' ? 'bg-blue-100 text-blue-800' : 
                                           'bg-red-100 text-red-800'}`}>
                      {levelData.analysis.suggestedLevel === 'ACTIVE' ? 'فعال' : 
                       levelData.analysis.suggestedLevel === 'NEW' ? 'جدید' : 'غیرفعال'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">دلیل تحلیل</label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {levelData.analysis.reason}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">اطمینان هوش مصنوعی</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={levelData.analysis.confidence} className="flex-1" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {levelData.analysis.confidence}%
                    </span>
                  </div>
                </div>

                {levelData.analysis.actionRequired && (
                  <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      این نماینده نیاز به اقدام فوری دارد
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center p-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  تحلیل سطح در دسترس نیست
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {tasksLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3">در حال تولید وظایف هوشمند...</span>
              </CardContent>
            </Card>
          ) : tasksData?.tasks && tasksData.tasks.length > 0 ? (
            <div className="space-y-4">
              {tasksData.tasks.map((task: AITask) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                          {task.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {task.description}
                        </p>
                      </div>
                      <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' ? 'فوری' : 
                         task.priority === 'medium' ? 'متوسط' : 'عادی'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">زمینه فرهنگی:</span>
                        <p className="text-gray-600 dark:text-gray-400">{task.culturalContext}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">رویکرد پیشنهادی:</span>
                        <p className="text-gray-600 dark:text-gray-400">{task.suggestedApproach}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Badge variant="outline" className="text-xs">
                          {task.type === 'follow_up' ? 'پیگیری' :
                           task.type === 'payment_reminder' ? 'یادآوری پرداخت' :
                           task.type === 'relationship_building' ? 'تقویت روابط' : 'بررسی عملکرد'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          اطمینان: {task.aiConfidence}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center p-8">
                <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  وظایف هوشمند تولید نشده است
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {recommendationsLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="mr-3">در حال تولید توصیه‌ها...</span>
              </CardContent>
            </Card>
          ) : recommendationsData?.recommendations && recommendationsData.recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendationsData.recommendations.map((recommendation: string, index: number) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-1 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                        <Star className="h-4 w-4 text-yellow-600" />
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {recommendation}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center p-8">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  توصیه‌های عملکردی در دسترس نیست
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}