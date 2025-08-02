// MODERN CRM DASHBOARD - DA VINCI v9.0 Unified Architecture
// Single comprehensive CRM interface following Admin Panel design patterns
import { useState, useEffect, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
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
  RefreshCw
} from 'lucide-react';
import { CurrencyFormatter } from '@/lib/currency-formatter';

// Lazy load advanced components
const DynamicAIWorkspace = lazy(() => import('./dynamic-ai-workspace'));
const AdvancedAnalytics = lazy(() => import('./advanced-analytics'));
const AdminAIConfig = lazy(() => import('./admin-ai-config-advanced'));

interface CrmDashboardData {
  summary: {
    totalRepresentatives: number;
    activeRepresentatives: number;
    totalDebt: string;
    totalSales: string;
    pendingTasks: number;
    completedTasksToday: number;
  };
  recentRepresentatives: any[];
  topPerformers: any[];
  urgentTasks: any[];
  dailyInstructions: any;
}

export default function ModernCrmDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  // Main CRM Dashboard Data
  const { data: dashboardData, isLoading, refetch } = useQuery<CrmDashboardData>({
    queryKey: ['/api/crm/dashboard', refreshKey],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Daily AI Instructions
  const { data: dailyInstructions } = useQuery({
    queryKey: ['/api/crm/learning/daily-instructions'],
    refetchInterval: 60000, // Refresh every minute
  });

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen clay-background relative flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">در حال بارگذاری داشبورد CRM...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen clay-background relative">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">پنل مدیریت CRM</h1>
                  <p className="text-blue-200 text-sm">سیستم هوشمند مدیریت روابط مشتریان</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleRefresh}
                variant="outline" 
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                بروزرسانی
              </Button>
              
              <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                <Zap className="w-3 h-3 mr-1" />
                آنلاین
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-6 mb-8 bg-white/10 backdrop-blur-sm border border-white/20">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>نمای کلی</span>
            </TabsTrigger>
            <TabsTrigger value="representatives" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>نمایندگان</span>
            </TabsTrigger>
            <TabsTrigger value="ai-workspace" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>AI Workspace</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>تحلیل‌ها</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center space-x-2">
              <Target className="w-4 h-4" />
              <span>وظایف</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>تنظیمات</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <CrmOverview dashboardData={dashboardData} dailyInstructions={dailyInstructions} />
          </TabsContent>

          {/* Representatives Tab */}
          <TabsContent value="representatives" className="space-y-6">
            <RepresentativesManager dashboardData={dashboardData} />
          </TabsContent>

          {/* AI Workspace Tab */}
          <TabsContent value="ai-workspace" className="space-y-6">
            <Suspense fallback={<LoadingSpinner text="بارگذاری فضای کار AI..." />}>
              <DynamicAIWorkspace />
            </Suspense>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Suspense fallback={<LoadingSpinner text="بارگذاری تحلیل‌های پیشرفته..." />}>
              <AdvancedAnalytics />
            </Suspense>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <TasksManager />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Suspense fallback={<LoadingSpinner text="بارگذاری تنظیمات AI..." />}>
              <AdminAIConfig />
            </Suspense>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}

// Overview Component
function CrmOverview({ dashboardData, dailyInstructions }: { dashboardData?: CrmDashboardData; dailyInstructions?: any }) {
  if (!dashboardData) return <LoadingSpinner text="بارگذاری داده‌ها..." />;

  const { summary, recentRepresentatives, topPerformers, urgentTasks } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="کل نمایندگان" 
          value={summary.totalRepresentatives.toLocaleString('fa-IR')} 
          icon={Users}
          subtitle={`${summary.activeRepresentatives} فعال`}
          trend="+12%"
        />
        <StatCard 
          title="کل فروش" 
          value={CurrencyFormatter.formatForCRM(summary.totalSales)} 
          icon={TrendingUp}
          subtitle="این ماه"
          trend="+8.2%"
        />
        <StatCard 
          title="کل بدهی" 
          value={CurrencyFormatter.formatForCRM(summary.totalDebt)} 
          icon={Clock}
          subtitle="نیاز به پیگیری"
          trend="-2.1%"
          trendDown
        />
        <StatCard 
          title="وظایف امروز" 
          value={summary.completedTasksToday.toString()} 
          icon={Target}
          subtitle={`از ${summary.pendingTasks} وظیفه`}
          trend=""
        />
      </div>

      {/* AI Daily Instructions */}
      {dailyInstructions?.data && (
        <Card className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-400/30">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Bot className="w-5 h-5" />
              <span>دستورات هوشمند روزانه</span>
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dailyInstructions.data.map((instruction: any, index: number) => (
                <div key={index} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="font-semibold text-white mb-2">{instruction.title}</h4>
                  <p className="text-blue-200 text-sm">{instruction.description}</p>
                  <Badge variant="outline" className="mt-2 text-xs border-white/30 text-white">
                    اولویت: {instruction.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRepresentatives representatives={recentRepresentatives} />
        <TopPerformers performers={topPerformers} />
      </div>

      {/* Urgent Tasks */}
      <UrgentTasksList tasks={urgentTasks} />
    </div>
  );
}

// Supporting Components
function StatCard({ title, value, icon: Icon, subtitle, trend, trendDown = false }: any) {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-blue-300 text-xs">{subtitle}</p>
          </div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            trendDown ? 'bg-red-500/20' : 'bg-green-500/20'
          }`}>
            <Icon className={`w-6 h-6 ${trendDown ? 'text-red-400' : 'text-green-400'}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-2">
            <Badge variant="outline" className={`text-xs ${
              trendDown ? 'border-red-500/30 text-red-300' : 'border-green-500/30 text-green-300'
            }`}>
              {trend}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
        <p className="text-white">{text}</p>
      </div>
    </div>
  );
}

function RecentRepresentatives({ representatives }: { representatives?: any[] }) {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>نمایندگان جدید</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {representatives?.slice(0, 5).map((rep: any) => (
              <div key={rep.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <Avatar>
                  <AvatarFallback className="bg-blue-500/20 text-blue-300">
                    {rep.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{rep.name}</p>
                  <p className="text-blue-200 text-sm">کد: {rep.code}</p>
                </div>
                <Badge variant={rep.isActive ? "secondary" : "outline"} className="text-xs">
                  {rep.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function TopPerformers({ performers }: { performers?: any[] }) {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Award className="w-5 h-5" />
          <span>برترین نمایندگان</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {performers?.slice(0, 5).map((performer: any, index: number) => (
              <div key={performer.id} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-yellow-500/20 rounded-full">
                  <span className="text-yellow-400 font-bold text-sm">{index + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{performer.name}</p>
                  <p className="text-blue-200 text-sm">
                    {CurrencyFormatter.formatForCRM(performer.totalSales)}
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  برتر
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function UrgentTasksList({ tasks }: { tasks?: any[] }) {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>وظایف فوری</span>
          <Badge variant="destructive" className="ml-auto">
            {tasks?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks?.slice(0, 3).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex-1">
                <p className="text-white font-medium">{task.title}</p>
                <p className="text-blue-200 text-sm">{task.description}</p>
              </div>
              <Badge variant="destructive" className="ml-2">
                فوری
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RepresentativesManager({ dashboardData }: { dashboardData?: CrmDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">مدیریت نمایندگان</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white">
            <Filter className="w-4 h-4 mr-2" />
            فیلتر
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="w-4 h-4 mr-2" />
            نماینده جدید
          </Button>
        </div>
      </div>
      
      {/* Representatives content will be implemented here */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-6">
          <p className="text-white text-center">بخش مدیریت نمایندگان در حال توسعه...</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TasksManager() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">مدیریت وظایف</h2>
        <Button size="sm" className="bg-green-600 hover:bg-green-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          وظیفه جدید
        </Button>
      </div>
      
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-6">
          <p className="text-white text-center">سیستم مدیریت وظایف در حال توسعه...</p>
        </CardContent>
      </Card>
    </div>
  );
}