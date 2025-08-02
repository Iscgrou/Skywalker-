// SHERLOCK v3.0 CRM INTERFACE - Complete Refactored Architecture
// Six main sections: معاف کنگ یار، نمایندگان، AI Workspace، تحلیل‌ها، گزارشات، تنظیمات
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Users, 
  TrendingUp, 
  MessageSquare, 
  Settings, 
  Brain,
  BarChart3,
  Target,
  Clock,
  Award,
  Zap,
  Bot,
  Sparkles,
  PlusCircle,
  Filter,
  RefreshCw,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Upload,
  Save,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Star,
  TrendingDown,
  Activity,
  Briefcase,
  Home,
  Shield,
  Lock
} from 'lucide-react';
import { CurrencyFormatter } from '@/lib/currency-formatter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import EnhancedAIHelper from './enhanced-ai-helper';

// Main Interface Component
export default function SherlockCrmInterface() {
  const [activeSection, setActiveSection] = useState('helper');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header Navigation */}
      <header className="bg-black/20 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Brain className="w-8 h-8 text-purple-400" />
                <h1 className="text-xl font-bold text-white">SHERLOCK v3.0 CRM</h1>
              </div>
            </div>
            
            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-2 rtl:space-x-reverse">
              <Button
                variant={activeSection === 'helper' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('helper')}
                className="text-white"
              >
                <Bot className="w-4 h-4 ml-2" />
                معاف کنگ یار
              </Button>
              <Button
                variant={activeSection === 'representatives' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('representatives')}
                className="text-white"
              >
                <Users className="w-4 h-4 ml-2" />
                نمایندگان
              </Button>
              <Button
                variant={activeSection === 'ai-workspace' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('ai-workspace')}
                className="text-white"
              >
                <Brain className="w-4 h-4 ml-2" />
                AI Workspace
              </Button>
              <Button
                variant={activeSection === 'analytics' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('analytics')}
                className="text-white"
              >
                <BarChart3 className="w-4 h-4 ml-2" />
                تحلیل‌ها
              </Button>
              <Button
                variant={activeSection === 'reports' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('reports')}
                className="text-white"
              >
                <FileText className="w-4 h-4 ml-2" />
                گزارشات
              </Button>
              <Button
                variant={activeSection === 'settings' ? 'default' : 'ghost'}
                onClick={() => setActiveSection('settings')}
                className="text-white"
              >
                <Settings className="w-4 h-4 ml-2" />
                تنظیمات
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeSection === 'helper' && (
          <div className="space-y-6">
            <EnhancedAIHelper />
          </div>
        )}
        {activeSection === 'representatives' && <RepresentativesSection />}
        {activeSection === 'ai-workspace' && <AIWorkspaceSection />}
        {activeSection === 'analytics' && <AnalyticsSection />}
        {activeSection === 'reports' && <ReportsSection />}
        {activeSection === 'settings' && <SettingsSection />}
      </main>
    </div>
  );
}

// 1. معاف کنگ یار (Helper) Section - Import Advanced Workspace  
function HelperSection() {
  const [query, setQuery] = useState('');
  
  const { data: recentTasks } = useQuery({
    queryKey: ['/api/crm/helper/recent-tasks'],
  });

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">معاف کنگ یار</h2>
        <p className="text-gray-300">دستیار هوشمند CRM شما</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/30 border-purple-500/30">
          <CardContent className="p-6 text-center">
            <PlusCircle className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">ایجاد تسک</h3>
            <p className="text-gray-400 text-sm">تسک جدید ایجاد کنید</p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/30 border-blue-500/30">
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">چت AI</h3>
            <p className="text-gray-400 text-sm">با هوش مصنوعی صحبت کنید</p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/30 border-green-500/30">
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">آنالیز سریع</h3>
            <p className="text-gray-400 text-sm">تحلیل فوری داده‌ها</p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/30 border-orange-500/30">
          <CardContent className="p-6 text-center">
            <Sparkles className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">پیشنهادات</h3>
            <p className="text-gray-400 text-sm">پیشنهادات هوشمند</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 2. نمایندگان (Representatives) Section
function RepresentativesSection() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: representatives, isLoading } = useQuery({
    queryKey: ['/api/crm/representatives'],
    placeholderData: []
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">مدیریت نمایندگان</h2>
        <Button className="bg-purple-600 hover:bg-purple-700">
          <PlusCircle className="w-4 h-4 ml-2" />
          نماینده جدید
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4 rtl:space-x-reverse">
        <Input
          placeholder="جستجو نماینده..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm bg-white/10 border-white/20 text-white"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نمایندگان</SelectItem>
            <SelectItem value="active">فعال</SelectItem>
            <SelectItem value="inactive">غیرفعال</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Representatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(representatives || []).map((rep: any) => (
          <Card key={rep.id} className="bg-black/30 border-white/10 hover:border-purple-500/50 transition-colors">
            <CardHeader>
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <Avatar>
                  <AvatarFallback className="bg-purple-600 text-white">
                    {rep.name?.charAt(0) || 'N'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-white text-lg">{rep.name}</CardTitle>
                  <CardDescription className="text-gray-400">کد: {rep.code}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">بدهی:</span>
                  <span className="text-red-400">{CurrencyFormatter.formatForCRM(rep.totalDebt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">فروش:</span>
                  <span className="text-green-400">{CurrencyFormatter.formatForCRM(rep.totalSales)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">وضعیت:</span>
                  <Badge variant={rep.isActive ? "default" : "secondary"}>
                    {rep.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </div>
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse mt-4">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="w-4 h-4" />
                  مشاهده
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit2 className="w-4 h-4" />
                  ویرایش
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 3. AI Workspace Section
function AIWorkspaceSection() {
  const [mode, setMode] = useState('collaborative');
  
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">AI Workspace</h2>
        <p className="text-gray-300">محیط کار هوشمند با پردازش پیشرفته</p>
      </div>

      {/* AI Mode Selector */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">حالت کاری AI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant={mode === 'autonomous' ? 'default' : 'outline'}
              onClick={() => setMode('autonomous')}
              className="p-4 h-auto flex-col"
            >
              <Zap className="w-6 h-6 mb-2" />
              <span>خودکار</span>
              <span className="text-xs opacity-70">95% فعالیت AI</span>
            </Button>
            <Button
              variant={mode === 'collaborative' ? 'default' : 'outline'}
              onClick={() => setMode('collaborative')}
              className="p-4 h-auto flex-col"
            >
              <Brain className="w-6 h-6 mb-2" />
              <span>همکاری</span>
              <span className="text-xs opacity-70">75% فعالیت AI</span>
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              onClick={() => setMode('manual')}
              className="p-4 h-auto flex-col"
            >
              <User className="w-6 h-6 mb-2" />
              <span>دستی</span>
              <span className="text-xs opacity-70">30% فعالیت AI</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Workspace Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-black/20 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">تحلیل فرهنگی فارسی</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">درک فرهنگی:</span>
                <Badge className="bg-green-600">94%</Badge>
              </div>
              <Progress value={94} className="h-2" />
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">تطبیق زبانی:</span>
                <Badge className="bg-blue-600">89%</Badge>
              </div>
              <Progress value={89} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">عملکرد AI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">زمان پردازش:</span>
                <span className="text-white">156ms</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">اعتماد مدل:</span>
                <Badge className="bg-purple-600">91%</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">دقت داده:</span>
                <Badge className="bg-green-600">96%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// 4. تحلیل‌ها (Analytics) Section
function AnalyticsSection() {
  const { data: analytics } = useQuery({
    queryKey: ['/api/crm/advanced-analytics/last_30_days'],
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">تحلیل‌های پیشرفته</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-black/30 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Users className="w-5 h-5 text-blue-400" />
              <span className="text-blue-400 text-sm">کل نمایندگان</span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">237</div>
            <div className="text-green-400 text-sm">+12% این ماه</div>
          </CardContent>
        </Card>

        <Card className="bg-black/30 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-green-400 text-sm">کل فروش</span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">2.8M</div>
            <div className="text-green-400 text-sm">+18% این ماه</div>
          </CardContent>
        </Card>

        <Card className="bg-black/30 border-red-500/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <span className="text-red-400 text-sm">کل بدهی</span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">1.2M</div>
            <div className="text-red-400 text-sm">-5% این ماه</div>
          </CardContent>
        </Card>

        <Card className="bg-black/30 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Activity className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400 text-sm">نرخ فعالیت</span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">87%</div>
            <div className="text-green-400 text-sm">+3% این ماه</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">نمودار عملکرد</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border border-dashed border-white/20 rounded">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-400">نمودارهای تحلیلی</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 5. گزارشات (Reports) Section
function ReportsSection() {
  const [reportType, setReportType] = useState('monthly');
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white">گزارشات هوشمند</h2>
        <Button className="bg-green-600 hover:bg-green-700">
          <Download className="w-4 h-4 ml-2" />
          دانلود گزارش
        </Button>
      </div>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/30 border-white/10 cursor-pointer hover:border-blue-500/50 transition-colors">
          <CardContent className="p-6 text-center">
            <FileText className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">گزارش ماهانه</h3>
            <p className="text-gray-400 text-sm">عملکرد کلی ماه</p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/30 border-white/10 cursor-pointer hover:border-green-500/50 transition-colors">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">گزارش فروش</h3>
            <p className="text-gray-400 text-sm">تحلیل فروش نمایندگان</p>
          </CardContent>
        </Card>
        
        <Card className="bg-black/30 border-white/10 cursor-pointer hover:border-red-500/50 transition-colors">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <h3 className="text-white font-semibold">گزارش بدهی</h3>
            <p className="text-gray-400 text-sm">وضعیت بدهی‌ها</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Generation */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">تولید گزارش سفارشی</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-white text-sm mb-2 block">نوع گزارش</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">روزانه</SelectItem>
                  <SelectItem value="weekly">هفتگی</SelectItem>
                  <SelectItem value="monthly">ماهانه</SelectItem>
                  <SelectItem value="quarterly">فصلی</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-white text-sm mb-2 block">فرمت خروجی</label>
              <Select defaultValue="pdf">
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
            <Download className="w-4 h-4 ml-2" />
            تولید گزارش
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// 6. تنظیمات (Settings) Section
function SettingsSection() {
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">تنظیمات سیستم</h2>

      {/* General Settings */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">تنظیمات عمومی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">اعلانات</h4>
              <p className="text-gray-400 text-sm">دریافت اعلانات سیستم</p>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
          
          <Separator className="bg-white/10" />
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">پشتیبان‌گیری خودکار</h4>
              <p className="text-gray-400 text-sm">پشتیبان‌گیری روزانه از داده‌ها</p>
            </div>
            <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">تنظیمات هوش مصنوعی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-white text-sm mb-2 block">سطح فعالیت AI</label>
            <Select defaultValue="high">
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">کم</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="high">زیاد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-white text-sm mb-2 block">حساسیت فرهنگی</label>
            <Select defaultValue="high">
              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">کم</SelectItem>
                <SelectItem value="medium">متوسط</SelectItem>
                <SelectItem value="high">زیاد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">تنظیمات امنیتی</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start">
            <Lock className="w-4 h-4 ml-2" />
            تغییر رمز عبور
          </Button>
          
          <Button variant="outline" className="w-full justify-start">
            <Shield className="w-4 h-4 ml-2" />
            تنظیمات احراز هویت
          </Button>
          
          <Button variant="outline" className="w-full justify-start">
            <FileText className="w-4 h-4 ml-2" />
            لاگ‌های امنیتی
          </Button>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end space-x-4 rtl:space-x-reverse">
        <Button variant="outline">لغو</Button>
        <Button className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 ml-2" />
          ذخیره تنظیمات
        </Button>
      </div>
    </div>
  );
}