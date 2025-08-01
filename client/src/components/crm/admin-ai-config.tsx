// 🔧 ADMIN AI CONFIGURATION PANEL - DA VINCI v9.0 Phase 3
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card as BaseCard, CardContent as BaseCardContent, CardDescription as BaseCardDescription, CardHeader as BaseCardHeader, CardTitle as BaseCardTitle } from '@/components/ui/card';
import { Button as BaseButton } from '@/components/ui/button';
import { Badge as BaseBadge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Brain, 
  Zap, 
  Shield,
  Target,
  Sliders,
  Database,
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Bot,
  Sparkles,
  Activity,
  Users,
  TrendingUp,
  MessageSquare,
  Lock,
  Unlock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { apiRequest } from '@/lib/queryClient';
import { CurrencyFormatter } from '@/lib/currency-formatter';
import { toPersianDigits } from '@/lib/persian-date';

// Claymorphism components
const ClayCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`clay-card ${className}`}>{children}</div>
);
const ClayCardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6 pb-0">{children}</div>
);
const ClayCardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`text-xl font-semibold ${className}`}>{children}</h3>
);
const ClayCardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="p-6">{children}</div>
);
const ClayButton = ({ children, variant = "primary", size = "default", onClick, disabled = false, className = "" }: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) => {
  const variants = {
    primary: "clay-button-primary",
    secondary: "clay-button-secondary", 
    ghost: "clay-button-ghost"
  };
  const sizes = {
    default: "px-4 py-2",
    sm: "px-3 py-1 text-sm",
    lg: "px-6 py-3 text-lg"
  };
  return (
    <button 
      className={`${variants[variant]} ${sizes[size]} ${className} transition-all duration-200`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

interface AIConfig {
  general: GeneralConfig;
  persian: PersianConfig;
  behavior: BehaviorConfig;
  performance: PerformanceConfig;
  security: SecurityConfig;
  integration: IntegrationConfig;
  advanced: AdvancedConfig;
}

interface GeneralConfig {
  aiEnabled: boolean;
  defaultMode: 'AUTONOMOUS' | 'COLLABORATIVE' | 'MANUAL';
  maxConcurrentTasks: number;
  responseTimeout: number;
  retryAttempts: number;
  debugMode: boolean;
  loggingLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

interface PersianConfig {
  culturalIntelligence: boolean;
  persianContextWeight: number; // 0-100
  traditionalValues: boolean;
  modernAdaptation: boolean;
  formalCommunication: boolean;
  relationshipFocus: boolean;
  temporalPatterns: boolean;
  religiousSensitivity: boolean;
}

interface BehaviorConfig {
  proactivity: number; // 0-100
  confidenceThreshold: number; // 0-100
  learningRate: number; // 0-100
  creativityLevel: number; // 0-100
  riskTolerance: number; // 0-100
  humanInterventionTrigger: number; // 0-100
  adaptationSpeed: number; // 0-100
  memoryRetention: number; // 0-100
}

interface PerformanceConfig {
  processingPriority: 'SPEED' | 'ACCURACY' | 'BALANCED';
  cacheStrategy: 'AGGRESSIVE' | 'MODERATE' | 'MINIMAL';
  resourceAllocation: number; // 0-100
  batchProcessing: boolean;
  parallelExecution: boolean;
  optimizationLevel: number; // 0-100
  monitoringInterval: number; // seconds
}

interface SecurityConfig {
  dataEncryption: boolean;
  accessLogging: boolean;
  sensitiveDataMasking: boolean;
  adminApprovalRequired: boolean;
  ipWhitelist: string[];
  sessionTimeout: number; // minutes
  maxFailedAttempts: number;
  auditTrail: boolean;
}

interface IntegrationConfig {
  groqEnabled: boolean;
  groqModel: string;
  groqApiKey: string;
  xaiEnabled: boolean;
  xaiModel: string;
  telegramEnabled: boolean;
  telegramBotToken: string;
  webhookEnabled: boolean;
  webhookUrl: string;
}

interface AdvancedConfig {
  experimentalFeatures: boolean;
  betaMode: boolean;
  customPrompts: string[];
  aiPersonality: string;
  responseTemplates: { [key: string]: string };
  customRules: string[];
  emergencyShutdown: boolean;
  maintenanceMode: boolean;
}

export default function AdminAIConfig() {
  const [activeTab, setActiveTab] = useState('general');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [config, setConfig] = useState<AIConfig | null>(null);

  const { hasPermission } = useCrmAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has admin permissions (removed check since this is admin panel only)
  // Admin panel access is controlled at route level

  // Fetch AI Configuration
  const { data: aiConfig, isLoading, error } = useQuery<AIConfig>({
    queryKey: ['/api/admin/ai-config']
  });

  useEffect(() => {
    if (aiConfig) {
      setConfig(aiConfig);
    }
  }, [aiConfig]);

  // Save Configuration Mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (configData: Partial<AIConfig>) => {
      return apiRequest('/api/admin/ai-config', {
        method: 'PUT',
        data: configData
      });
    },
    onSuccess: () => {
      toast({
        title: "تنظیمات ذخیره شد",
        description: "پیکربندی AI با موفقیت به‌روزرسانی شد",
      });
      setHasUnsavedChanges(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-config'] });
    },
    onError: (error) => {
      toast({
        title: "خطا در ذخیره‌سازی",
        description: "مشکلی در ذخیره تنظیمات رخ داده است",
        variant: "destructive"
      });
    }
  });

  // Reset Configuration Mutation
  const resetConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/ai-config/reset', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "تنظیمات بازنشانی شد",
        description: "پیکربندی به حالت پیش‌فرض بازگردانده شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ai-config'] });
    }
  });

  // Test Configuration Mutation  
  const testConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/ai-config/test', {
        method: 'POST',
        data: config
      });
    },
    onSuccess: (result) => {
      toast({
        title: "تست موفقیت‌آمیز",
        description: `تنظیمات AI با موفقیت تست شد. زمان پاسخ: ${result.responseTime}ms`,
      });
    },
    onError: (error) => {
      toast({
        title: "تست ناموفق",
        description: "مشکلی در تست تنظیمات رخ داده است",
        variant: "destructive"
      });
    }
  });

  const updateConfig = (section: keyof AIConfig, key: string, value: any) => {
    if (!config) return;
    
    setConfig(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (config) {
      saveConfigMutation.mutate(config);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری تنظیمات AI...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>خطا در بارگذاری</AlertTitle>
          <AlertDescription>
            مشکلی در دریافت تنظیمات AI رخ داده است. لطفاً صفحه را تازه‌سازی کنید.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Settings className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold">پیکربندی سیستم AI</h1>
              <p className="text-muted-foreground">
                تنظیمات پیشرفته دستیار هوشمند فارسی
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            size="sm"
          >
            {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSensitiveData ? 'مخفی کردن' : 'نمایش کلیدها'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => testConfigMutation.mutate()}
            disabled={testConfigMutation.isPending}
            size="sm"
          >
            {testConfigMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            تست تنظیمات
          </Button>

          <Button 
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveConfigMutation.isPending}
            size="sm"
          >
            {saveConfigMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            ذخیره تغییرات
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تغییرات ذخیره نشده</AlertTitle>
          <AlertDescription>
            شما تغییراتی اعمال کرده‌اید که ذخیره نشده‌اند. حتماً تغییرات را ذخیره کنید.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">عمومی</TabsTrigger>
          <TabsTrigger value="persian">فرهنگ ایرانی</TabsTrigger>
          <TabsTrigger value="behavior">رفتار AI</TabsTrigger>
          <TabsTrigger value="advanced">پیشرفته</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="h-5 w-5" />
                  تنظیمات پایه
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-enabled">فعال‌سازی AI</Label>
                  <Switch
                    id="ai-enabled"
                    checked={config?.general?.aiEnabled || false}
                    onCheckedChange={(value) => updateConfig('general', 'aiEnabled', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>حالت پیش‌فرض</Label>
                  <Select
                    value={config?.general?.defaultMode || 'COLLABORATIVE'}
                    onValueChange={(value) => updateConfig('general', 'defaultMode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTONOMOUS">خودکار</SelectItem>
                      <SelectItem value="COLLABORATIVE">همکاری</SelectItem>
                      <SelectItem value="MANUAL">دستی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>حداکثر وظایف همزمان: {toPersianDigits(config?.general?.maxConcurrentTasks || 10)}</Label>
                  <Slider
                    value={[config?.general?.maxConcurrentTasks || 10]}
                    onValueChange={([value]) => updateConfig('general', 'maxConcurrentTasks', value)}
                    max={50}
                    min={1}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>زمان انتظار پاسخ (ثانیه): {toPersianDigits(config?.general?.responseTimeout || 30)}</Label>
                  <Slider
                    value={[config?.general?.responseTimeout || 30]}
                    onValueChange={([value]) => updateConfig('general', 'responseTimeout', value)}
                    max={300}
                    min={5}
                    step={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Performance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  عملکرد سیستم
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>اولویت پردازش</Label>
                  <Select
                    value={config?.performance?.processingPriority || 'BALANCED'}
                    onValueChange={(value) => updateConfig('performance', 'processingPriority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPEED">سرعت</SelectItem>
                      <SelectItem value="ACCURACY">دقت</SelectItem>
                      <SelectItem value="BALANCED">متعادل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>تخصیص منابع: {toPersianDigits(config?.performance?.resourceAllocation || 70)}%</Label>
                  <Slider
                    value={[config?.performance?.resourceAllocation || 70]}
                    onValueChange={([value]) => updateConfig('performance', 'resourceAllocation', value)}
                    max={100}
                    min={10}
                    step={5}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="batch-processing">پردازش دسته‌ای</Label>
                  <Switch
                    id="batch-processing"
                    checked={config?.performance?.batchProcessing || false}
                    onCheckedChange={(value) => updateConfig('performance', 'batchProcessing', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="parallel-execution">اجرای موازی</Label>
                  <Switch
                    id="parallel-execution"
                    checked={config?.performance?.parallelExecution || false}
                    onCheckedChange={(value) => updateConfig('performance', 'parallelExecution', value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="persian" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cultural Intelligence */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  هوش فرهنگی
                </CardTitle>
                <CardDescription>
                  تنظیمات مربوط به درک و سازگاری با فرهنگ ایرانی
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cultural-intelligence">فعال‌سازی هوش فرهنگی</Label>
                  <Switch
                    id="cultural-intelligence"
                    checked={config?.persian?.culturalIntelligence || false}
                    onCheckedChange={(value) => updateConfig('persian', 'culturalIntelligence', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ضریب زمینه فارسی: {toPersianDigits(config?.persian?.persianContextWeight || 80)}%</Label>
                  <Slider
                    value={[config?.persian?.persianContextWeight || 80]}
                    onValueChange={([value]) => updateConfig('persian', 'persianContextWeight', value)}
                    max={100}
                    min={0}
                    step={5}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="traditional-values">ارزش‌های سنتی</Label>
                  <Switch
                    id="traditional-values"
                    checked={config?.persian?.traditionalValues || false}
                    onCheckedChange={(value) => updateConfig('persian', 'traditionalValues', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="modern-adaptation">سازگاری مدرن</Label>
                  <Switch
                    id="modern-adaptation"
                    checked={config?.persian?.modernAdaptation || false}
                    onCheckedChange={(value) => updateConfig('persian', 'modernAdaptation', value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Communication Style */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  سبک ارتباطی
                </CardTitle>
                <CardDescription>
                  تنظیمات مربوط به نحوه برقراری ارتباط
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="formal-communication">ارتباط رسمی</Label>
                  <Switch
                    id="formal-communication"
                    checked={config?.persian?.formalCommunication || false}
                    onCheckedChange={(value) => updateConfig('persian', 'formalCommunication', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="relationship-focus">تمرکز بر روابط</Label>
                  <Switch
                    id="relationship-focus"
                    checked={config?.persian?.relationshipFocus || false}
                    onCheckedChange={(value) => updateConfig('persian', 'relationshipFocus', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="temporal-patterns">الگوهای زمانی</Label>
                  <Switch
                    id="temporal-patterns"
                    checked={config?.persian?.temporalPatterns || false}
                    onCheckedChange={(value) => updateConfig('persian', 'temporalPatterns', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="religious-sensitivity">حساسیت مذهبی</Label>
                  <Switch
                    id="religious-sensitivity"
                    checked={config?.persian?.religiousSensitivity || false}
                    onCheckedChange={(value) => updateConfig('persian', 'religiousSensitivity', value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                تنظیمات رفتاری AI
              </CardTitle>
              <CardDescription>
                کنترل نحوه رفتار و تصمیم‌گیری دستیار هوشمند
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>پیش‌فعالی: {toPersianDigits(config?.behavior?.proactivity || 50)}%</Label>
                    <Slider
                      value={[config?.behavior?.proactivity || 50]}
                      onValueChange={([value]) => updateConfig('behavior', 'proactivity', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      میزان ابتکار عمل AI در پیشنهاد اقدامات
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>آستانه اعتماد: {toPersianDigits(config?.behavior?.confidenceThreshold || 75)}%</Label>
                    <Slider
                      value={[config?.behavior?.confidenceThreshold || 75]}
                      onValueChange={([value]) => updateConfig('behavior', 'confidenceThreshold', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      حداقل درجه اطمینان برای اجرای خودکار
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>نرخ یادگیری: {toPersianDigits(config?.behavior?.learningRate || 60)}%</Label>
                    <Slider
                      value={[config?.behavior?.learningRate || 60]}
                      onValueChange={([value]) => updateConfig('behavior', 'learningRate', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      سرعت تطبیق با الگوهای جدید
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>سطح خلاقیت: {toPersianDigits(config?.behavior?.creativityLevel || 40)}%</Label>
                    <Slider
                      value={[config?.behavior?.creativityLevel || 40]}
                      onValueChange={([value]) => updateConfig('behavior', 'creativityLevel', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      میزان نوآوری در راه‌حل‌ها
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label>تحمل ریسک: {toPersianDigits(config?.behavior?.riskTolerance || 30)}%</Label>
                    <Slider
                      value={[config?.behavior?.riskTolerance || 30]}
                      onValueChange={([value]) => updateConfig('behavior', 'riskTolerance', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      میزان پذیرش راه‌حل‌های پرریسک
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>محرک دخالت انسان: {toPersianDigits(config?.behavior?.humanInterventionTrigger || 85)}%</Label>
                    <Slider
                      value={[config?.behavior?.humanInterventionTrigger || 85]}
                      onValueChange={([value]) => updateConfig('behavior', 'humanInterventionTrigger', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      آستانه درخواست کمک از کاربر
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>سرعت تطبیق: {toPersianDigits(config?.behavior?.adaptationSpeed || 70)}%</Label>
                    <Slider
                      value={[config?.behavior?.adaptationSpeed || 70]}
                      onValueChange={([value]) => updateConfig('behavior', 'adaptationSpeed', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      سرعت تطبیق با تغییرات محیط
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>نگهداری حافظه: {toPersianDigits(config?.behavior?.memoryRetention || 90)}%</Label>
                    <Slider
                      value={[config?.behavior?.memoryRetention || 90]}
                      onValueChange={([value]) => updateConfig('behavior', 'memoryRetention', value)}
                      max={100}
                      min={0}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground">
                      مدت زمان حفظ اطلاعات یادگیری
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Integration Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  تنظیمات ادغام
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="groq-enabled">Groq AI</Label>
                    <Switch
                      id="groq-enabled"
                      checked={config?.integration?.groqEnabled || false}
                      onCheckedChange={(value) => updateConfig('integration', 'groqEnabled', value)}
                    />
                  </div>
                  
                  {config?.integration?.groqEnabled && (
                    <div className="space-y-2 mr-4">
                      <Label>API Key</Label>
                      <Input
                        type={showSensitiveData ? 'text' : 'password'}
                        value={config?.integration?.groqApiKey || ''}
                        onChange={(e) => updateConfig('integration', 'groqApiKey', e.target.value)}
                        placeholder="کلید API Groq"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="xai-enabled">xAI (Grok)</Label>
                    <Switch
                      id="xai-enabled"
                      checked={config?.integration?.xaiEnabled || false}
                      onCheckedChange={(value) => updateConfig('integration', 'xaiEnabled', value)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="telegram-enabled">Telegram Bot</Label>
                    <Switch
                      id="telegram-enabled"
                      checked={config?.integration?.telegramEnabled || false}
                      onCheckedChange={(value) => updateConfig('integration', 'telegramEnabled', value)}
                    />
                  </div>
                  
                  {config?.integration?.telegramEnabled && (
                    <div className="space-y-2 mr-4">
                      <Label>Bot Token</Label>
                      <Input
                        type={showSensitiveData ? 'text' : 'password'}
                        value={config?.integration?.telegramBotToken || ''}
                        onChange={(e) => updateConfig('integration', 'telegramBotToken', e.target.value)}
                        placeholder="توکن ربات تلگرام"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  تنظیمات امنیتی
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="data-encryption">رمزنگاری داده‌ها</Label>
                  <Switch
                    id="data-encryption"
                    checked={config?.security?.dataEncryption || false}
                    onCheckedChange={(value) => updateConfig('security', 'dataEncryption', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="access-logging">ثبت دسترسی‌ها</Label>
                  <Switch
                    id="access-logging"
                    checked={config?.security?.accessLogging || false}
                    onCheckedChange={(value) => updateConfig('security', 'accessLogging', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sensitive-masking">پوشاندن داده‌های حساس</Label>
                  <Switch
                    id="sensitive-masking"
                    checked={config?.security?.sensitiveDataMasking || false}
                    onCheckedChange={(value) => updateConfig('security', 'sensitiveDataMasking', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="admin-approval">تأیید مدیر</Label>
                  <Switch
                    id="admin-approval"
                    checked={config?.security?.adminApprovalRequired || false}
                    onCheckedChange={(value) => updateConfig('security', 'adminApprovalRequired', value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>زمان انقضای جلسه (دقیقه): {toPersianDigits(config?.security?.sessionTimeout || 60)}</Label>
                  <Slider
                    value={[config?.security?.sessionTimeout || 60]}
                    onValueChange={([value]) => updateConfig('security', 'sessionTimeout', value)}
                    max={480}
                    min={15}
                    step={15}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Danger Zone */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                منطقه خطر
              </CardTitle>
              <CardDescription>
                عملیات خطرناک که می‌تواند سیستم را تحت تأثیر قرار دهد
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>بازنشانی تنظیمات</Label>
                  <p className="text-sm text-muted-foreground">
                    همه تنظیمات به حالت پیش‌فرض بازمی‌گردد
                  </p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => resetConfigMutation.mutate()}
                  disabled={resetConfigMutation.isPending}
                >
                  {resetConfigMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    'بازنشانی'
                  )}
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>حالت اضطراری</Label>
                  <p className="text-sm text-muted-foreground">
                    خاموش کردن فوری تمام عملکردهای AI
                  </p>
                </div>
                <Switch
                  checked={config?.advanced?.emergencyShutdown || false}
                  onCheckedChange={(value) => updateConfig('advanced', 'emergencyShutdown', value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}