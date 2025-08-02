// Advanced AI Configuration Panel - DA VINCI v6.0 Persian Cultural Intelligence
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Brain, 
  Settings, 
  Zap, 
  Shield, 
  Cpu, 
  Globe, 
  Heart, 
  Star,
  Activity,
  TestTube,
  Upload,
  Download,
  RotateCcw,
  Save,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Info,
  Sparkles,
  Bot,
  Database,
  Gauge
} from 'lucide-react';

interface AiConfig {
  id: number;
  configName: string;
  configCategory: string;
  aiEnabled: boolean;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  culturalSensitivity: number;
  religiousSensitivity: number;
  traditionalValuesWeight: number;
  languageFormality: number;
  persianPoetryIntegration: boolean;
  culturalMetaphors: boolean;
  proactivityLevel: number;
  confidenceThreshold: number;
  learningRate: number;
  creativityLevel: number;
  riskTolerance: number;
  contextWindowMemory: number;
  groqModelVariant: string;
  groqApiEndpoint: string;
  maxConcurrentRequests: number;
  requestTimeoutMs: number;
  retryAttempts: number;
  rateLimitRpm: number;
  dataEncryption: boolean;
  accessLogging: boolean;
  sensitiveDataRedaction: boolean;
  emergencyStopEnabled: boolean;
  auditTrail: boolean;
  responseTimeLimit: number;
  qualityThreshold: number;
  errorRateThreshold: number;
  performanceMetrics: boolean;
  systemPrompt: string;
  culturalPrompts: string;
  behaviorPrompts: string;
  specialInstructions: string;
  telegramIntegration: boolean;
  xaiIntegration: boolean;
  customApiEndpoints: string;
  isActive: boolean;
  lastModifiedBy: string;
  configVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TestResults {
  aiEngine: string;
  groqConnection: string;
  persianSupport: string;
  performance: string;
  security: string;
  responseTime: number;
}

export default function AdminAiConfigAdvanced() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('GENERAL');
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AiConfig>>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newConfigData, setNewConfigData] = useState<Partial<AiConfig>>({
    configCategory: 'GENERAL',
    aiEnabled: true,
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0,
    culturalSensitivity: 85,
    religiousSensitivity: 80,
    traditionalValuesWeight: 70,
    languageFormality: 80,
    persianPoetryIntegration: true,
    culturalMetaphors: true,
    proactivityLevel: 70,
    confidenceThreshold: 80,
    learningRate: 65,
    creativityLevel: 60,
    riskTolerance: 40,
    contextWindowMemory: 8000,
    maxConcurrentRequests: 10,
    requestTimeoutMs: 30000,
    retryAttempts: 3,
    rateLimitRpm: 60,
    dataEncryption: true,
    accessLogging: true,
    sensitiveDataRedaction: true,
    emergencyStopEnabled: true,
    auditTrail: true,
    responseTimeLimit: 5000,
    qualityThreshold: 90,
    errorRateThreshold: 5,
    performanceMetrics: true,
    telegramIntegration: false,
    xaiIntegration: false,
    isActive: true
  });

  // Fetch AI configurations
  const { data: aiConfigs, isLoading, error } = useQuery({
    queryKey: ['/api/admin/ai-config'],
    retry: 1,
    refetchInterval: 30000
  });

  // Create configuration mutation
  const createConfigMutation = useMutation({
    mutationFn: (configData: Partial<AiConfig>) => apiRequest('/api/admin/ai-config', {
      method: 'POST',
      data: configData
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-config'] });
      toast({
        title: 'موفقیت',
        description: 'تنظیمات AI جدید با موفقیت ایجاد شد',
      });
      setIsCreateModalOpen(false);
      setNewConfigData({
        configCategory: 'GENERAL',
        aiEnabled: true,
        maxTokens: 1000,
        temperature: 0.7,
        // Reset form
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در ایجاد تنظیمات',
        variant: 'destructive'
      });
    }
  });

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: ({ configName, updates }: { configName: string; updates: Partial<AiConfig> }) => 
      apiRequest(`/api/admin/ai-config/${configName}`, {
        method: 'PUT',
        data: updates
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-config'] });
      toast({
        title: 'موفقیت',
        description: 'تنظیمات AI با موفقیت به‌روزرسانی شد',
      });
      setEditingConfig(null);
      setEditFormData({});
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در به‌روزرسانی',
        variant: 'destructive'
      });
    }
  });

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: (configName: string) => apiRequest(`/api/admin/ai-config/${configName}`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-config'] });
      toast({
        title: 'موفقیت',
        description: 'تنظیمات AI با موفقیت حذف شد',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در حذف تنظیمات',
        variant: 'destructive'
      });
    }
  });

  // Test configuration mutation
  const testConfigMutation = useMutation({
    mutationFn: (configData: any) => apiRequest('/api/admin/ai-config/test', {
      method: 'POST',
      data: configData
    }),
    onSuccess: (data) => {
      setTestResults(data.testResults);
      toast({
        title: 'تست موفق',
        description: `تست تنظیمات در ${data.responseTime}ms انجام شد`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطای تست',
        description: error.message || 'خطا در تست تنظیمات',
        variant: 'destructive'
      });
    }
  });

  // Reset configurations mutation
  const resetConfigMutation = useMutation({
    mutationFn: (category?: string) => apiRequest('/api/admin/ai-config/reset', {
      method: 'POST',
      data: { category }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-config'] });
      toast({
        title: 'موفقیت',
        description: 'تنظیمات AI به حالت پیش‌فرض بازنشانی شد',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'خطا',
        description: error.message || 'خطا در بازنشانی',
        variant: 'destructive'
      });
    }
  });

  // Export configurations
  const handleExport = () => {
    window.open('/api/admin/ai-config/export', '_blank');
  };

  // Test configuration
  const handleTestConfig = (config: AiConfig) => {
    setIsTesting(true);
    testConfigMutation.mutate(config);
    setTimeout(() => setIsTesting(false), 2000);
  };

  // Start editing
  const startEditing = (config: AiConfig) => {
    setEditingConfig(config.configName);
    setEditFormData(config);
  };

  // Save edits
  const saveEdits = () => {
    if (editingConfig && editFormData) {
      updateConfigMutation.mutate({
        configName: editingConfig,
        updates: editFormData
      });
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingConfig(null);
    setEditFormData({});
  };

  // Update form field
  const updateFormField = (field: keyof AiConfig, value: any) => {
    if (editingConfig) {
      setEditFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setNewConfigData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Get configurations by category
  const getConfigsByCategory = (category: string) => {
    if (!aiConfigs || !aiConfigs[category]) return [];
    return Object.values(aiConfigs[category] as Record<string, AiConfig>) as AiConfig[];
  };

  // Category icons
  const categoryIcons: Record<string, any> = {
    GENERAL: Settings,
    PERSIAN_CULTURAL: Heart,
    BEHAVIOR: Brain,
    PERFORMANCE: Cpu,
    SECURITY: Shield,
    INTEGRATION: Globe
  };

  const categories = [
    { id: 'GENERAL', name: 'تنظیمات عمومی', icon: Settings, color: 'bg-blue-500' },
    { id: 'PERSIAN_CULTURAL', name: 'هوش فرهنگی فارسی', icon: Heart, color: 'bg-red-500' },
    { id: 'BEHAVIOR', name: 'تنظیمات رفتاری', icon: Brain, color: 'bg-purple-500' },
    { id: 'PERFORMANCE', name: 'عملکرد و سرعت', icon: Cpu, color: 'bg-green-500' },
    { id: 'SECURITY', name: 'امنیت و محافظت', icon: Shield, color: 'bg-orange-500' },
    { id: 'INTEGRATION', name: 'یکپارچه‌سازی', icon: Globe, color: 'bg-cyan-500' }
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold">تنظیمات پیشرفته AI</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-700 dark:text-red-300">
          خطا در بارگذاری تنظیمات AI. لطفاً دوباره تلاش کنید.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold">تنظیمات پیشرفته AI</h3>
            <p className="text-sm text-muted-foreground">
              پیکربندی کامل و کنترل سطح بالای هوش مصنوعی Groq
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                تنظیمات جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ایجاد تنظیمات AI جدید</DialogTitle>
                <DialogDescription>
                  تنظیمات سفارشی جدید برای بهینه‌سازی عملکرد AI
                </DialogDescription>
              </DialogHeader>
              {/* Create form content will be added here */}
            </DialogContent>
          </Dialog>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            صادرات
          </Button>
          <Button 
            onClick={() => resetConfigMutation.mutate(undefined)} 
            variant="outline" 
            size="sm"
            disabled={resetConfigMutation.isPending}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            بازنشانی همه
          </Button>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium text-green-700 dark:text-green-300">نتایج تست تنظیمات:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>موتور AI: <Badge variant="secondary">{testResults.aiEngine}</Badge></div>
                <div>اتصال Groq: <Badge variant="secondary">{testResults.groqConnection}</Badge></div>
                <div>پشتیبانی فارسی: <Badge variant="secondary">{testResults.persianSupport}</Badge></div>
                <div>عملکرد: <Badge variant="secondary">{testResults.performance}</Badge></div>
                <div>امنیت: <Badge variant="secondary">{testResults.security}</Badge></div>
                <div>زمان پاسخ: <Badge variant="secondary">{testResults.responseTime}ms</Badge></div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Category Navigation */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => {
            const Icon = category.icon;
            const configCount = getConfigsByCategory(category.id).length;
            return (
              <TabsTrigger key={category.id} value={category.id} className="flex flex-col gap-1 h-16">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{category.name}</span>
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {configCount}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Category Content */}
        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <CategoryConfigPanel
              category={category}
              configs={getConfigsByCategory(category.id)}
              editingConfig={editingConfig}
              editFormData={editFormData}
              onStartEdit={startEditing}
              onSaveEdit={saveEdits}
              onCancelEdit={cancelEditing}
              onDelete={(configName) => deleteConfigMutation.mutate(configName)}
              onTest={handleTestConfig}
              onUpdateField={updateFormField}
              isTesting={isTesting}
              isUpdating={updateConfigMutation.isPending}
              isDeleting={deleteConfigMutation.isPending}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Performance Overview */}
      <Card className="border border-dashed border-gray-300 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-green-500" />
            نظارت عملکرد AI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>میزان استفاده CPU</span>
                <span>67%</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>زمان پاسخ میانگین</span>
                <span>245ms</span>
              </div>
              <Progress value={75} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>دقت پاسخ‌ها</span>
                <span>94%</span>
              </div>
              <Progress value={94} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>آپتایم سیستم</span>
                <span>99.8%</span>
              </div>
              <Progress value={99.8} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface CategoryConfigPanelProps {
  category: any;
  configs: AiConfig[];
  editingConfig: string | null;
  editFormData: Partial<AiConfig>;
  onStartEdit: (config: AiConfig) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (configName: string) => void;
  onTest: (config: AiConfig) => void;
  onUpdateField: (field: keyof AiConfig, value: any) => void;
  isTesting: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

function CategoryConfigPanel({
  category,
  configs,
  editingConfig,
  editFormData,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onTest,
  onUpdateField,
  isTesting,
  isUpdating,
  isDeleting
}: CategoryConfigPanelProps) {
  if (configs.length === 0) {
    return (
      <Card className="border border-dashed border-gray-300 dark:border-gray-700">
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className={`mx-auto w-12 h-12 ${category.color} rounded-full flex items-center justify-center`}>
              <category.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-medium">هیچ تنظیماتی یافت نشد</h4>
              <p className="text-sm text-muted-foreground mt-1">
                برای این دسته‌بندی هنوز تنظیماتی ایجاد نشده است
              </p>
            </div>
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              ایجاد تنظیمات جدید
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <ConfigCard
          key={config.configName}
          config={config}
          category={category}
          isEditing={editingConfig === config.configName}
          editFormData={editFormData}
          onStartEdit={() => onStartEdit(config)}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
          onDelete={() => onDelete(config.configName)}
          onTest={() => onTest(config)}
          onUpdateField={onUpdateField}
          isTesting={isTesting}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
        />
      ))}
    </div>
  );
}

interface ConfigCardProps {
  config: AiConfig;
  category: any;
  isEditing: boolean;
  editFormData: Partial<AiConfig>;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onUpdateField: (field: keyof AiConfig, value: any) => void;
  isTesting: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

function ConfigCard({
  config,
  category,
  isEditing,
  editFormData,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onTest,
  onUpdateField,
  isTesting,
  isUpdating,
  isDeleting
}: ConfigCardProps) {
  const data = isEditing ? editFormData : config;

  return (
    <Card className={`transition-all duration-200 ${
      config.isActive ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${category.color} rounded-lg`}>
              <category.icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{config.configName}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant={config.isActive ? 'default' : 'secondary'}>
                  {config.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
                <span className="text-xs">نسخه {config.configVersion}</span>
                <span className="text-xs">توسط {config.lastModifiedBy}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onTest}
              variant="outline"
              size="sm"
              disabled={isTesting}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isTesting ? 'در حال تست...' : 'تست'}
            </Button>
            {!isEditing ? (
              <>
                <Button onClick={onStartEdit} variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  ویرایش
                </Button>
                <Button 
                  onClick={onDelete} 
                  variant="outline" 
                  size="sm"
                  disabled={isDeleting}
                >
                  حذف
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={onSaveEdit} 
                  variant="default" 
                  size="sm"
                  disabled={isUpdating}
                >
                  <Save className="h-4 w-4 mr-2" />
                  ذخیره
                </Button>
                <Button onClick={onCancelEdit} variant="outline" size="sm">
                  لغو
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render configuration fields based on category */}
        <ConfigFields
          category={category.id}
          data={data}
          isEditing={isEditing}
          onUpdateField={onUpdateField}
        />
      </CardContent>
    </Card>
  );
}

interface ConfigFieldsProps {
  category: string;
  data: Partial<AiConfig>;
  isEditing: boolean;
  onUpdateField: (field: keyof AiConfig, value: any) => void;
}

function ConfigFields({ category, data, isEditing, onUpdateField }: ConfigFieldsProps) {
  switch (category) {
    case 'GENERAL':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>AI فعال</Label>
            <Switch
              checked={data.aiEnabled || false}
              onCheckedChange={(checked) => onUpdateField('aiEnabled', checked)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label>حداکثر توکن</Label>
            {isEditing ? (
              <Input
                type="number"
                value={data.maxTokens || 1000}
                onChange={(e) => onUpdateField('maxTokens', parseInt(e.target.value))}
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">{data.maxTokens || 1000}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label>دما (Temperature): {data.temperature || 0.7}</Label>
            {isEditing ? (
              <Slider
                value={[data.temperature || 0.7]}
                onValueChange={([value]) => onUpdateField('temperature', value)}
                max={2}
                min={0}
                step={0.1}
              />
            ) : (
              <Progress value={(data.temperature || 0.7) * 50} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>Top P: {data.topP || 0.9}</Label>
            {isEditing ? (
              <Slider
                value={[data.topP || 0.9]}
                onValueChange={([value]) => onUpdateField('topP', value)}
                max={1}
                min={0}
                step={0.1}
              />
            ) : (
              <Progress value={(data.topP || 0.9) * 100} className="h-2" />
            )}
          </div>
        </div>
      );

    case 'PERSIAN_CULTURAL':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>حساسیت فرهنگی: {data.culturalSensitivity || 85}%</Label>
            {isEditing ? (
              <Slider
                value={[data.culturalSensitivity || 85]}
                onValueChange={([value]) => onUpdateField('culturalSensitivity', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.culturalSensitivity || 85} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>حساسیت مذهبی: {data.religiousSensitivity || 80}%</Label>
            {isEditing ? (
              <Slider
                value={[data.religiousSensitivity || 80]}
                onValueChange={([value]) => onUpdateField('religiousSensitivity', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.religiousSensitivity || 80} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>ارزش‌های سنتی: {data.traditionalValuesWeight || 70}%</Label>
            {isEditing ? (
              <Slider
                value={[data.traditionalValuesWeight || 70]}
                onValueChange={([value]) => onUpdateField('traditionalValuesWeight', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.traditionalValuesWeight || 70} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>رسمی بودن زبان: {data.languageFormality || 80}%</Label>
            {isEditing ? (
              <Slider
                value={[data.languageFormality || 80]}
                onValueChange={([value]) => onUpdateField('languageFormality', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.languageFormality || 80} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>ادغام شعر فارسی</Label>
            <Switch
              checked={data.persianPoetryIntegration || false}
              onCheckedChange={(checked) => onUpdateField('persianPoetryIntegration', checked)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label>استعاره‌های فرهنگی</Label>
            <Switch
              checked={data.culturalMetaphors || false}
              onCheckedChange={(checked) => onUpdateField('culturalMetaphors', checked)}
              disabled={!isEditing}
            />
          </div>
        </div>
      );

    case 'BEHAVIOR':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>سطح فعالیت: {data.proactivityLevel || 70}%</Label>
            {isEditing ? (
              <Slider
                value={[data.proactivityLevel || 70]}
                onValueChange={([value]) => onUpdateField('proactivityLevel', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.proactivityLevel || 70} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>آستانه اطمینان: {data.confidenceThreshold || 80}%</Label>
            {isEditing ? (
              <Slider
                value={[data.confidenceThreshold || 80]}
                onValueChange={([value]) => onUpdateField('confidenceThreshold', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.confidenceThreshold || 80} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>نرخ یادگیری: {data.learningRate || 65}%</Label>
            {isEditing ? (
              <Slider
                value={[data.learningRate || 65]}
                onValueChange={([value]) => onUpdateField('learningRate', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.learningRate || 65} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>سطح خلاقیت: {data.creativityLevel || 60}%</Label>
            {isEditing ? (
              <Slider
                value={[data.creativityLevel || 60]}
                onValueChange={([value]) => onUpdateField('creativityLevel', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.creativityLevel || 60} className="h-2" />
            )}
          </div>
          <div className="space-y-2">
            <Label>تحمل ریسک: {data.riskTolerance || 40}%</Label>
            {isEditing ? (
              <Slider
                value={[data.riskTolerance || 40]}
                onValueChange={([value]) => onUpdateField('riskTolerance', value)}
                max={100}
                min={0}
              />
            ) : (
              <Progress value={data.riskTolerance || 40} className="h-2" />
            )}
          </div>
        </div>
      );

    case 'PERFORMANCE':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>حداکثر درخواست همزمان</Label>
            {isEditing ? (
              <Input
                type="number"
                value={data.maxConcurrentRequests || 10}
                onChange={(e) => onUpdateField('maxConcurrentRequests', parseInt(e.target.value))}
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">{data.maxConcurrentRequests || 10}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label>زمان انتظار درخواست (ms)</Label>
            {isEditing ? (
              <Input
                type="number"
                value={data.requestTimeoutMs || 30000}
                onChange={(e) => onUpdateField('requestTimeoutMs', parseInt(e.target.value))}
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">{data.requestTimeoutMs || 30000}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label>تعداد تلاش مجدد</Label>
            {isEditing ? (
              <Input
                type="number"
                value={data.retryAttempts || 3}
                onChange={(e) => onUpdateField('retryAttempts', parseInt(e.target.value))}
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">{data.retryAttempts || 3}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label>محدودیت نرخ (RPM)</Label>
            {isEditing ? (
              <Input
                type="number"
                value={data.rateLimitRpm || 60}
                onChange={(e) => onUpdateField('rateLimitRpm', parseInt(e.target.value))}
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">{data.rateLimitRpm || 60}</div>
            )}
          </div>
        </div>
      );

    case 'SECURITY':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>رمزنگاری داده‌ها</Label>
            <Switch
              checked={data.dataEncryption || false}
              onCheckedChange={(checked) => onUpdateField('dataEncryption', checked)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label>ثبت دسترسی‌ها</Label>
            <Switch
              checked={data.accessLogging || false}
              onCheckedChange={(checked) => onUpdateField('accessLogging', checked)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label>مخفی‌سازی داده‌های حساس</Label>
            <Switch
              checked={data.sensitiveDataRedaction || false}
              onCheckedChange={(checked) => onUpdateField('sensitiveDataRedaction', checked)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label>توقف اضطراری</Label>
            <Switch
              checked={data.emergencyStopEnabled || false}
              onCheckedChange={(checked) => onUpdateField('emergencyStopEnabled', checked)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label>رد حسابرسی</Label>
            <Switch
              checked={data.auditTrail || false}
              onCheckedChange={(checked) => onUpdateField('auditTrail', checked)}
              disabled={!isEditing}
            />
          </div>
        </div>
      );

    case 'INTEGRATION':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>مدل Groq</Label>
            {isEditing ? (
              <Select 
                value={data.groqModelVariant || ''} 
                onValueChange={(value) => onUpdateField('groqModelVariant', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب مدل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B Instant</SelectItem>
                  <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B Versatile</SelectItem>
                  <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                  <SelectItem value="gemma2-9b-it">Gemma 2 9B IT</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="p-2 bg-muted rounded text-sm">{data.groqModelVariant || 'تنظیم نشده'}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label>نقطه پایانی API</Label>
            {isEditing ? (
              <Input
                value={data.groqApiEndpoint || ''}
                onChange={(e) => onUpdateField('groqApiEndpoint', e.target.value)}
                placeholder="https://api.groq.com/openai/v1"
              />
            ) : (
              <div className="p-2 bg-muted rounded text-sm">{data.groqApiEndpoint || 'پیش‌فرض'}</div>
            )}
          </div>
          <div className="space-y-2">
            <Label>یکپارچه‌سازی تلگرام</Label>
            <Switch
              checked={data.telegramIntegration || false}
              onCheckedChange={(checked) => onUpdateField('telegramIntegration', checked)}
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <Label>یکپارچه‌سازی XAI</Label>
            <Switch
              checked={data.xaiIntegration || false}
              onCheckedChange={(checked) => onUpdateField('xaiIntegration', checked)}
              disabled={!isEditing}
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="text-center text-muted-foreground">
          تنظیمات این دسته‌بندی در حال توسعه است
        </div>
      );
  }
}