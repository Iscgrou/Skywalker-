// DA VINCI v2.0 - WORKSPACE HUB - AI-Powered Task Management
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Brain, 
  FileText, 
  Bell,
  TrendingUp,
  Users,
  Target,
  Zap
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
// Import workspace components inline for now

interface WorkspaceTask {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate: string;
  createdAt: string;
  isAiGenerated: boolean;
  culturalContext?: string;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  aiGeneratedTasks: number;
}

export function WorkspaceHub() {
  const [activeTab, setActiveTab] = useState('overview');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workspace tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['/api/workspace/tasks'],
    select: (data: any) => {
      // Handle different response formats
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.tasks)) return data.tasks;
      return [];
    }
  });

  // Fetch task statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/workspace/stats'],
    select: (data: any) => {
      if (data && typeof data === 'object') return data;
      return { totalTasks: 0, completedTasks: 0, pendingTasks: 0, aiGeneratedTasks: 0 };
    }
  });

  // Generate AI tasks mutation
  const generateTasksMutation = useMutation({
    mutationFn: () => fetch('/api/workspace/tasks/generate', { method: 'POST' }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workspace/stats'] });
      toast({
        title: "تولید وظایف هوشمند",
        description: `${data.metadata?.totalGenerated || 0} وظیفه جدید با هوش مصنوعی تولید شد`,
      });
    },
    onError: () => {
      toast({
        title: "خطا در تولید وظایف",
        description: "مشکلی در تولید وظایف هوشمند پیش آمد",
        variant: "destructive",
      });
    }
  });

  const priorityColors = {
    HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
    MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  const statusColors = {
    PENDING: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
    CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            میز کار هوشمند DA VINCI v2.0
          </h1>
          <p className="text-gray-300 mt-2">مدیریت وظایف با هوش مصنوعی و فرهنگ ایرانی</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => generateTasksMutation.mutate()}
            disabled={generateTasksMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            <Brain className="w-4 h-4 ml-2" />
            {generateTasksMutation.isPending ? 'در حال تولید...' : 'تولید وظایف هوشمند'}
          </Button>
          <Button 
            onClick={() => setShowTaskForm(true)}
            className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            وظیفه جدید
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-black/40 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">کل وظایف</CardTitle>
            <Target className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.totalTasks || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">تکمیل شده</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.completedTasks || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">در انتظار</CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.pendingTasks || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">تولید شده AI</CardTitle>
            <Zap className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.aiGeneratedTasks || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-black/30 border border-gray-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-green-600">
            <TrendingUp className="w-4 h-4 ml-2" />
            نمای کلی
          </TabsTrigger>
          <TabsTrigger value="tasks" className="data-[state=active]:bg-blue-600">
            <FileText className="w-4 h-4 ml-2" />
            مدیریت وظایف
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-purple-600">
            <Bell className="w-4 h-4 ml-2" />
            گزارشات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/40 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">وظایف اخیر</CardTitle>
                <CardDescription>آخرین وظایف تولید شده</CardDescription>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>هنوز وظیفه‌ای تعریف نشده</p>
                    <p className="text-sm mt-2">از دکمه "تولید وظایف هوشمند" استفاده کنید</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Array.isArray(tasks) && tasks.slice(0, 5).map((task: WorkspaceTask) => (
                      <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-white">{task.title}</h4>
                            {task.isAiGenerated && <Badge variant="outline" className="text-xs bg-purple-500/20 text-purple-400">AI</Badge>}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{task.assignedTo}</p>
                        </div>
                        <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                          {task.priority === 'HIGH' ? 'بالا' : task.priority === 'MEDIUM' ? 'متوسط' : 'پایین'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">هوش مصنوعی DA VINCI</CardTitle>
                <CardDescription>وضعیت موتور تولید وظایف</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">موتور AI</span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">xAI Grok-4</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">فرهنگ سازمانی</span>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">فارسی</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">آخرین تولید</span>
                    <span className="text-sm text-gray-400">بدون داده</span>
                  </div>
                  <div className="pt-4">
                    <Button 
                      onClick={() => generateTasksMutation.mutate()}
                      disabled={generateTasksMutation.isPending}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <Brain className="w-4 h-4 ml-2" />
                      {generateTasksMutation.isPending ? 'در حال تولید...' : 'تولید وظایف جدید'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasksLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="bg-black/40 border-gray-700">
                  <CardHeader>
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-gray-700 rounded"></div>
                      <div className="h-3 bg-gray-700 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : !Array.isArray(tasks) || tasks.length === 0 ? (
              <div className="col-span-full">
                <Card className="bg-black/40 border-gray-700">
                  <CardContent className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-lg font-semibold text-white mb-2">هنوز وظیفه‌ای ندارید</h3>
                    <p className="text-gray-400 mb-6">از هوش مصنوعی برای تولید وظایف هوشمند استفاده کنید</p>
                    <Button 
                      onClick={() => generateTasksMutation.mutate()}
                      disabled={generateTasksMutation.isPending}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <Brain className="w-4 h-4 ml-2" />
                      {generateTasksMutation.isPending ? 'در حال تولید...' : 'تولید وظایف هوشمند'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              Array.isArray(tasks) && tasks.map((task: WorkspaceTask) => (
                <Card key={task.id} className="bg-black/40 border-gray-700 hover:bg-black/60 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white text-lg flex items-center gap-2">
                        <span>{task.title}</span>
                        {task.isAiGenerated && (
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                            <Zap className="w-3 h-3 ml-1" />
                            AI
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                          {task.priority === 'HIGH' ? 'بالا' : task.priority === 'MEDIUM' ? 'متوسط' : 'پایین'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {task.description}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>مسئول: {task.assignedTo}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>مهلت: {new Date(task.dueDate).toLocaleDateString('fa-IR')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card className="bg-black/40 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">گزارشات عملکرد</CardTitle>
              <CardDescription>تحلیل عملکرد وظایف و بازخورد کارمندان</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Bell className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-lg font-semibold text-white mb-2">بخش گزارشات</h3>
                <p className="text-gray-400">این بخش برای نمایش گزارشات تحلیلی طراحی شده است</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Task Form Modal - Simplified for now */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white">وظیفه جدید</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">فرم ایجاد وظیفه در مراحل بعدی پیاده‌سازی خواهد شد</p>
              <Button onClick={() => setShowTaskForm(false)} className="w-full">
                بستن
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Form Modal - Simplified for now */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-900 border-gray-700 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white">ارسال گزارش</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 mb-4">فرم گزارش‌دهی در مراحل بعدی پیاده‌سازی خواهد شد</p>
              <Button onClick={() => setShowReportForm(false)} className="w-full">
                بستن
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}