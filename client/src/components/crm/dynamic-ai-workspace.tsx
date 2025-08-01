// 🤖 DYNAMIC AI WORKSPACE - DA VINCI v9.0 Phase 2
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card as BaseCard, CardContent as BaseCardContent, CardDescription as BaseCardDescription, CardHeader as BaseCardHeader, CardTitle as BaseCardTitle } from '@/components/ui/card';
import { Button as BaseButton } from '@/components/ui/button';
import { Badge as BaseBadge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Zap, 
  MessageSquare, 
  Target,
  TrendingUp,
  Users,
  Calendar,
  Clock,
  Send,
  Lightbulb,
  Star,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Bot,
  Sparkles,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { apiRequest } from '@/lib/queryClient';
import { CurrencyFormatter } from '@/lib/currency-formatter';
import { toPersianDigits } from '@/lib/persian-date';

interface AIWorkspaceData {
  activeContexts: AIContext[];
  currentFocus: string;
  suggestions: AISuggestion[];
  workflowStatus: WorkflowStatus;
  intelligentInsights: AIInsight[];
  realTimeMetrics: RealtimeMetrics;
}

interface AIContext {
  id: string;
  type: 'REPRESENTATIVE' | 'TASK' | 'ANALYSIS' | 'CULTURAL';
  title: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED';
  aiConfidence: number;
  relatedData: any;
  lastUpdated: string;
}

interface AISuggestion {
  id: string;
  category: 'OPTIMIZATION' | 'STRATEGY' | 'IMMEDIATE_ACTION' | 'LEARNING';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: number; // 1-5 scale
  aiReasoning: string;
  actionType: string;
  estimatedResults: string;
}

interface WorkflowStatus {
  currentPhase: string;
  completionPercentage: number;
  activeWorkflows: number;
  pendingApprovals: number;
  automatedTasks: number;
  humanInterventionRequired: number;
}

interface AIInsight {
  id: string;
  type: 'PATTERN' | 'ANOMALY' | 'OPPORTUNITY' | 'WARNING';
  title: string;
  description: string;
  relevanceScore: number;
  culturalContext: string;
  suggestedActions: string[];
  dataSource: string;
}

interface RealtimeMetrics {
  aiProcessingLoad: number;
  contextSwitches: number;
  decisionAccuracy: number;
  responseTime: number;
  learningRate: number;
  culturalAdaptationScore: number;
}

// Claymorphism Components
const ClayCard = ({ className = '', children, ...props }: any) => (
  <BaseCard className={`clay-card ${className}`} {...props}>{children}</BaseCard>
);

const ClayCardContent = ({ className = '', children, ...props }: any) => (
  <BaseCardContent className={className} {...props}>{children}</BaseCardContent>
);

const ClayCardHeader = ({ className = '', children, ...props }: any) => (
  <BaseCardHeader className={className} {...props}>{children}</BaseCardHeader>
);

const ClayCardTitle = ({ className = '', children, ...props }: any) => (
  <BaseCardTitle className={className} {...props}>{children}</BaseCardTitle>
);

const ClayButton = ({ className = '', variant = 'default', children, ...props }: any) => {
  const clayVariant = variant === 'default' ? 'clay-primary' : `clay-${variant}`;
  return <BaseButton className={`clay-button ${clayVariant} ${className}`} {...props}>{children}</BaseButton>;
};

const ClayBadge = ({ className = '', children, ...props }: any) => (
  <BaseBadge className={`clay-badge ${className}`} {...props}>{children}</BaseBadge>
);

export default function DynamicAIWorkspace() {
  const [activeTab, setActiveTab] = useState('overview');
  const [chatInput, setChatInput] = useState('');
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [selectedContext, setSelectedContext] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<'AUTONOMOUS' | 'COLLABORATIVE' | 'MANUAL'>('COLLABORATIVE');
  
  const { hasPermission } = useCrmAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI Workspace Data
  const { data: workspaceData, isLoading: workspaceLoading, refetch: refetchWorkspace } = useQuery<AIWorkspaceData>({
    queryKey: ['/api/crm/ai-workspace'],
    refetchInterval: 5000, // Real-time updates every 5 seconds
    enabled: hasPermission('ai_workspace', 'READ')
  });

  // AI Chat Mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('/api/crm/ai-workspace/chat', {
        method: 'POST',
        data: { 
          message, 
          context: selectedContext,
          mode: workspaceMode,
          culturalContext: 'persian'
        }
      });
      return response;
    },
    onSuccess: (response) => {
      setConversationHistory(prev => [...prev, {
        type: 'user',
        message: chatInput,
        timestamp: new Date().toISOString()
      }, {
        type: 'ai',
        message: response.message,
        confidence: response.confidence,
        suggestions: response.suggestions,
        timestamp: new Date().toISOString()
      }]);
      setChatInput('');
      
      // Update workspace context if AI provides new insights
      if (response.contextUpdate) {
        queryClient.invalidateQueries({ queryKey: ['/api/crm/ai-workspace'] });
      }
    },
    onError: (error) => {
      toast({
        title: "خطا در ارتباط با دستیار AI",
        description: "لطفاً مجدداً تلاش کنید",
        variant: "destructive"
      });
    }
  });

  // Execute AI Suggestion
  const executeSuggestionMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      return apiRequest(`/api/crm/ai-workspace/suggestions/${suggestionId}/execute`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "پیشنهاد اجرا شد",
        description: "تغییرات با موفقیت اعمال گردید",
      });
      refetchWorkspace();
    }
  });

  // Change Workspace Mode
  const changeModeMutation = useMutation({
    mutationFn: async (mode: string) => {
      return apiRequest('/api/crm/ai-workspace/mode', {
        method: 'POST',
        data: { mode }
      });
    },
    onSuccess: () => {
      toast({
        title: "حالت کاری تغییر یافت",
        description: `دستیار AI اکنون در حالت ${workspaceMode} فعال است`,
      });
    }
  });

  const handleSendMessage = () => {
    if (chatInput.trim() && !chatMutation.isPending) {
      chatMutation.mutate(chatInput);
    }
  };

  const getContextIcon = (type: string) => {
    switch (type) {
      case 'REPRESENTATIVE': return <Users className="h-4 w-4" />;
      case 'TASK': return <Target className="h-4 w-4" />;
      case 'ANALYSIS': return <TrendingUp className="h-4 w-4" />;
      case 'CULTURAL': return <Brain className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getSuggestionIcon = (category: string) => {
    switch (category) {
      case 'OPTIMIZATION': return <Zap className="h-4 w-4" />;
      case 'STRATEGY': return <Brain className="h-4 w-4" />;
      case 'IMMEDIATE_ACTION': return <AlertTriangle className="h-4 w-4" />;
      case 'LEARNING': return <Lightbulb className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  if (workspaceLoading) {
    return (
      <div className="min-h-screen clay-background relative">
        <div className="container mx-auto px-6 py-8">
          <ClayCard>
            <ClayCardHeader>
              <ClayCardTitle className="flex items-center gap-2 text-white">
                <Brain className="h-6 w-6 animate-pulse" />
                در حال بارگذاری فضای کار AI...
              </ClayCardTitle>
            </ClayCardHeader>
          </ClayCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen clay-background relative" dir="rtl">
      <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">میز کار هوشمند AI</h1>
              <p className="text-gray-300">
                دستیار هوشمند فارسی برای مدیریت CRM پیشرفته
              </p>
            </div>
          </div>
        </div>

        {/* Workspace Mode Selector */}
        <div className="flex items-center gap-3">
          <Label>حالت کاری:</Label>
          <select 
            value={workspaceMode}
            onChange={(e) => {
              setWorkspaceMode(e.target.value as any);
              changeModeMutation.mutate(e.target.value);
            }}
            className="px-3 py-2 border rounded-md"
          >
            <option value="AUTONOMOUS">خودکار</option>
            <option value="COLLABORATIVE">همکاری</option>
            <option value="MANUAL">دستی</option>
          </select>
        </div>
      </div>

      {/* Real-time Metrics Dashboard */}
      <ClayCard>
        <ClayCardHeader>
          <ClayCardTitle className="flex items-center gap-2 text-white">
            <Activity className="h-5 w-5" />
            متریک‌های لحظه‌ای سیستم
          </ClayCardTitle>
        </ClayCardHeader>
        <ClayCardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {workspaceData?.realTimeMetrics?.aiProcessingLoad || 0}%
              </div>
              <p className="text-xs text-gray-300">بار پردازش AI</p>
              <Progress value={workspaceData?.realTimeMetrics?.aiProcessingLoad || 0} className="mt-2" />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {toPersianDigits(workspaceData?.realTimeMetrics?.decisionAccuracy || 0)}%
              </div>
              <p className="text-xs text-gray-300">دقت تصمیم‌گیری</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {toPersianDigits(workspaceData?.realTimeMetrics?.culturalAdaptationScore || 0)}%
              </div>
              <p className="text-xs text-gray-300">سازگاری فرهنگی</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {toPersianDigits(workspaceData?.realTimeMetrics?.responseTime || 0)}ms
              </div>
              <p className="text-xs text-gray-300">زمان پاسخ</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {toPersianDigits(workspaceData?.realTimeMetrics?.contextSwitches || 0)}
              </div>
              <p className="text-xs text-gray-300">تغییر زمینه</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">
                {toPersianDigits(workspaceData?.realTimeMetrics?.learningRate || 0)}%
              </div>
              <p className="text-xs text-gray-300">نرخ یادگیری</p>
            </div>
          </div>
        </ClayCardContent>
      </ClayCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="contexts">زمینه‌های فعال</TabsTrigger>
          <TabsTrigger value="suggestions">پیشنهادات AI</TabsTrigger>
          <TabsTrigger value="chat">گفت‌وگو با AI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Workflow Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  وضعیت گردش کار
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>فاز فعلی:</span>
                  <Badge variant="default">{workspaceData?.workflowStatus?.currentPhase || 'آماده'}</Badge>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>پیشرفت کلی:</span>
                    <span>{toPersianDigits(workspaceData?.workflowStatus?.completionPercentage || 0)}%</span>
                  </div>
                  <Progress value={workspaceData?.workflowStatus?.completionPercentage || 0} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="font-bold text-green-600">
                      {toPersianDigits(workspaceData?.workflowStatus?.automatedTasks || 0)}
                    </div>
                    <div className="text-xs">خودکار</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="font-bold text-orange-600">
                      {toPersianDigits(workspaceData?.workflowStatus?.humanInterventionRequired || 0)}
                    </div>
                    <div className="text-xs">نیاز به دخالت</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Contexts Count */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  زمینه‌های فعال
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-center text-blue-600 mb-2">
                  {toPersianDigits(workspaceData?.activeContexts?.length || 0)}
                </div>
                <p className="text-center text-muted-foreground">زمینه در حال پردازش</p>
              </CardContent>
            </Card>

            {/* AI Suggestions Count */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  پیشنهادات AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-center text-purple-600 mb-2">
                  {toPersianDigits(workspaceData?.suggestions?.length || 0)}
                </div>
                <p className="text-center text-muted-foreground">پیشنهاد آماده اجرا</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                آخرین بینش‌های هوشمند
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workspaceData?.intelligentInsights?.slice(0, 3).map(insight => (
                  <div key={insight.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant="outline">{insight.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span>دقت: {toPersianDigits(insight.relevanceScore)}%</span>
                      <span>{insight.dataSource}</span>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-4">
                    هنوز بینش‌هایی ایجاد نشده است
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contexts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workspaceData?.activeContexts?.map(context => (
              <Card key={context.id} className={`cursor-pointer transition-colors ${
                selectedContext === context.id ? 'ring-2 ring-blue-500' : ''
              }`} onClick={() => setSelectedContext(context.id)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getContextIcon(context.type)}
                      {context.title}
                    </div>
                    <Badge variant={context.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {context.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{context.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>اعتماد AI: {toPersianDigits(context.aiConfidence)}%</span>
                    <span>{new Date(context.lastUpdated).toLocaleDateString('fa-IR')}</span>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <div className="col-span-2 text-center text-muted-foreground py-8">
                هیچ زمینه فعالی وجود ندارد
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          <div className="space-y-3">
            {workspaceData?.suggestions?.map(suggestion => (
              <Card key={suggestion.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getSuggestionIcon(suggestion.category)}
                      {suggestion.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={suggestion.impact === 'HIGH' ? 'destructive' : 
                                   suggestion.impact === 'MEDIUM' ? 'default' : 'secondary'}>
                        تأثیر {suggestion.impact}
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => executeSuggestionMutation.mutate(suggestion.id)}
                        disabled={executeSuggestionMutation.isPending}
                      >
                        اجرا
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-3">{suggestion.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <strong>منطق AI:</strong>
                      <p className="text-muted-foreground">{suggestion.aiReasoning}</p>
                    </div>
                    <div>
                      <strong>نتایج مورد انتظار:</strong>
                      <p className="text-muted-foreground">{suggestion.estimatedResults}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span>تلاش مورد نیاز: {toPersianDigits(suggestion.effort)}/5</span>
                    <Badge variant="outline">{suggestion.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <div className="text-center text-muted-foreground py-8">
                هیچ پیشنهادی در حال حاضر موجود نیست
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                گفت‌وگو با دستیار هوشمند
              </CardTitle>
              <CardDescription>
                دستیار AI فارسی برای پاسخ به سوالات و ارائه راهنمایی
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Chat History */}
              <ScrollArea className="h-96 mb-4 p-4 border rounded-lg">
                {conversationHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    سلام! چطور می‌تونم کمکتون کنم؟
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationHistory.map((msg, index) => (
                      <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-lg ${
                          msg.type === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          <p>{msg.message}</p>
                          {msg.confidence && (
                            <div className="text-xs mt-2 opacity-75">
                              اعتماد: {toPersianDigits(msg.confidence)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Chat Input */}
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                  dir="rtl"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || chatMutation.isPending}
                >
                  {chatMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {selectedContext && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    زمینه فعال: {selectedContext}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}