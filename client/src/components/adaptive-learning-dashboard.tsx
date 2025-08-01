// 🧠 ADAPTIVE LEARNING DASHBOARD - نمایش سیستم یادگیری تطبیقی
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Brain, TrendingUp, Target, Clock, Users, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';

interface DailyInstructions {
  date: string;
  generalStrategy: string;
  representativeSpecificTasks: Array<{
    representativeId: number;
    representativeName: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    specificInstructions: string[];
    culturalContext: string;
    expectedOutcomes: string[];
    timeAllocation: string;
    followUpPlan: string;
  }>;
  teamLevelGuidance: {
    focusAreas: string[];
    commonChallenges: string[];
    successStrategies: string[];
    culturalConsiderations: string[];
  };
  aiConfidence: number;
  basedOnExperiences: number;
}

interface LearningAnalytics {
  totalLearningExperiences: number;
  successRate: number;
  mostEffectiveApproaches: string[];
  culturalFactorsImportance: {
    religiousConsideration: number;
    familyOrientation: number;
    businessFormality: number;
    timeFlexibility: number;
  };
  improvementTrends: {
    lastMonth: string;
    lastQuarter: string;
    yearToDate: string;
  };
}

interface LearningPatterns {
  successPatterns: number;
  failurePatterns: number;
  partialSuccessPatterns: number;
  totalExperiences: number;
  averageReliability: number;
  culturalInsights: string[];
}

export function AdaptiveLearningDashboard() {
  const [activeTab, setActiveTab] = useState<'instructions' | 'analytics' | 'patterns'>('instructions');

  // Daily Instructions Query
  const { data: dailyInstructions, isLoading: instructionsLoading, refetch: refetchInstructions } = useQuery<{
    success: boolean;
    data: DailyInstructions;
    message: string;
  }>({
    queryKey: ['/api/crm/learning/daily-instructions'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Learning Analytics Query
  const { data: learningAnalytics, isLoading: analyticsLoading } = useQuery<{
    success: boolean;
    data: LearningAnalytics;
  }>({
    queryKey: ['/api/crm/learning/analytics']
  });

  // Learning Patterns Query
  const { data: learningPatterns, isLoading: patternsLoading } = useQuery<{
    success: boolean;
    data: LearningPatterns;
  }>({
    queryKey: ['/api/crm/learning/patterns']
  });

  const instructions = dailyInstructions?.data;
  const analytics = learningAnalytics?.data;
  const patterns = learningPatterns?.data;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-black';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6 p-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold">سیستم یادگیری تطبیقی</h1>
            <p className="text-muted-foreground">تولید دستورالعمل‌های روزانه بر اساس تجربیات واقعی</p>
          </div>
        </div>
        <Button
          onClick={() => refetchInstructions()}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Brain className="h-4 w-4" />
          بروزرسانی دستورالعمل‌ها
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'instructions' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('instructions')}
          className="flex items-center gap-2"
        >
          <Target className="h-4 w-4" />
          دستورالعمل‌های امروز
        </Button>
        <Button
          variant={activeTab === 'analytics' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('analytics')}
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          تحلیل‌های یادگیری
        </Button>
        <Button
          variant={activeTab === 'patterns' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('patterns')}
          className="flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          الگوهای یادگیری
        </Button>
      </div>

      {/* Instructions Tab */}
      {activeTab === 'instructions' && (
        <div className="space-y-6">
          {instructionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : instructions ? (
            <>
              {/* AI Confidence & Experience Base */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">اعتماد هوش مصنوعی</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{instructions.aiConfidence}%</div>
                    <Progress value={instructions.aiConfidence} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">تجربیات واقعی</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{instructions.basedOnExperiences}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      تجربه یادگیری شده
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">تاریخ تولید</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatDate(instructions.date)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      آخرین بروزرسانی
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* General Strategy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    استراتژی کلی امروز
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg leading-relaxed">{instructions.generalStrategy}</p>
                </CardContent>
              </Card>

              {/* Representative Specific Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    وظایف اختصاصی نمایندگان ({instructions.representativeSpecificTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {instructions.representativeSpecificTasks.map((task, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{task.representativeName}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline">{task.timeAllocation}</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium mb-2">دستورالعمل‌های اختصاصی:</h5>
                            <ul className="text-sm space-y-1">
                              {task.specificInstructions.map((instruction, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                  {instruction}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-medium mb-2">نتایج مورد انتظار:</h5>
                            <ul className="text-sm space-y-1">
                              {task.expectedOutcomes.map((outcome, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                  {outcome}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <Separator className="my-3" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">زمینه فرهنگی: </span>
                            <span className="text-muted-foreground">{task.culturalContext}</span>
                          </div>
                          <div>
                            <span className="font-medium">برنامه پیگیری: </span>
                            <span className="text-muted-foreground">{task.followUpPlan}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Team Level Guidance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">حوزه‌های کانونی</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {instructions.teamLevelGuidance.focusAreas.map((area, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span>{area}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">ملاحظات فرهنگی</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {instructions.teamLevelGuidance.culturalConsiderations.map((consideration, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span>{consideration}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">دستورالعمل‌های روزانه در دسترس نیست</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">کل تجربیات</CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.totalLearningExperiences}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">نرخ موفقیت</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.successRate}%</div>
                    <Progress value={analytics.successRate} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">رشد ماهانه</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{analytics.improvementTrends.lastMonth}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">رشد سالانه</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{analytics.improvementTrends.yearToDate}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Most Effective Approaches */}
              <Card>
                <CardHeader>
                  <CardTitle>مؤثرترین رویکردها</CardTitle>
                  <CardDescription>بر اساس تجربیات موفق ثبت شده</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.mostEffectiveApproaches.map((approach, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <span className="flex-1">{approach}</span>
                        <Badge variant="secondary">مؤثر</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cultural Factors Importance */}
              <Card>
                <CardHeader>
                  <CardTitle>اهمیت عوامل فرهنگی</CardTitle>
                  <CardDescription>میزان تأثیر هر عامل فرهنگی در موفقیت</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.culturalFactorsImportance).map(([factor, importance]) => (
                      <div key={factor} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            {factor === 'religiousConsideration' && 'ملاحظات مذهبی'}
                            {factor === 'familyOrientation' && 'گرایش خانوادگی'}
                            {factor === 'businessFormality' && 'رسمی بودن کسب‌وکار'}
                            {factor === 'timeFlexibility' && 'انعطاف‌پذیری زمانی'}
                          </span>
                          <span className="text-sm text-muted-foreground">{importance}%</span>
                        </div>
                        <Progress value={importance} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">آمار یادگیری در دسترس نیست</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-6">
          {patternsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : patterns ? (
            <>
              {/* Pattern Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الگوهای موفق</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{patterns.successPatterns}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الگوهای ناموفق</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{patterns.failurePatterns}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">موفقیت جزئی</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{patterns.partialSuccessPatterns}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">قابلیت اعتماد</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{patterns.averageReliability}%</div>
                    <Progress value={patterns.averageReliability} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Cultural Insights */}
              <Card>
                <CardHeader>
                  <CardTitle>بینش‌های فرهنگی کسب شده</CardTitle>
                  <CardDescription>
                    درس‌های آموخته شده از {patterns.totalExperiences} تجربه واقعی
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patterns.culturalInsights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm leading-relaxed">{insight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">الگوهای یادگیری در دسترس نیست</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}