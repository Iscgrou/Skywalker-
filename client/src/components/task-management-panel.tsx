// Task Management Panel - DA VINCI v6.0 Phase 2 Frontend
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, User, Target, Brain, TrendingUp, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TaskWithDetails {
  id: string;
  taskId: string;
  representativeId: number;
  representativeName: string;
  taskType: 'FOLLOW_UP' | 'RELATIONSHIP_BUILDING' | 'SKILL_DEVELOPMENT' | 'PERFORMANCE_REVIEW' | 'CULTURAL_ADAPTATION';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  title: string;
  description: string;
  expectedOutcome: string;
  dueDate: string;
  aiConfidenceScore: number;
  xpReward: number;
  difficultyLevel: number;
  culturalContext?: string;
  personalityAdaptation?: string;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
}

interface TaskRecommendation {
  taskType: string;
  priority: string;
  title: string;
  description: string;
  expectedOutcome: string;
  aiReasoning: string;
  culturalConsiderations: string;
  estimatedDuration: number;
  difficultyLevel: number;
  xpReward: number;
}

interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  mediumPriorityTasks: number;
  lowPriorityTasks: number;
  urgentTasks: number;
  taskTypeDistribution: {
    FOLLOW_UP: number;
    RELATIONSHIP_BUILDING: number;
    SKILL_DEVELOPMENT: number;
    PERFORMANCE_REVIEW: number;
    CULTURAL_ADAPTATION: number;
  };
  averageAiConfidence: number;
  averageXpReward: number;
  averageDifficulty: number;
  tasksCreatedToday: number;
  tasksCompletedToday: number;
}

export function TaskManagementPanel() {
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedRepId, setSelectedRepId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch all tasks
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskWithDetails[]>({
    queryKey: ['/api/crm/tasks', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      
      const response = await fetch(`/api/crm/tasks?${params}`);
      if (!response.ok) throw new Error('خطا در دریافت وظایف');
      const result = await response.json();
      return result.data || [];
    }
  });

  // Fetch task analytics
  const { data: analytics } = useQuery<TaskAnalytics>({
    queryKey: ['/api/crm/tasks/analytics'],
    queryFn: async () => {
      const response = await fetch('/api/crm/tasks/analytics');
      if (!response.ok) throw new Error('خطا در دریافت آمار وظایف');
      const result = await response.json();
      return result.data;
    }
  });

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/crm/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, completionNotes: notes })
      });
      if (!response.ok) throw new Error('خطا در به‌روزرسانی وظیفه');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/tasks/analytics'] });
      toast({ title: 'موفق', description: 'وضعیت وظیفه به‌روزرسانی شد' });
      setSelectedTask(null);
    },
    onError: () => {
      toast({ title: 'خطا', description: 'خطا در به‌روزرسانی وظیفه', variant: 'destructive' });
    }
  });

  // Get task recommendations mutation
  const getRecommendationsMutation = useMutation({
    mutationFn: async (representativeId: number) => {
      const response = await fetch(`/api/crm/representative/${representativeId}/task-recommendations`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('خطا در تولید پیشنهادات');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'موفق', description: 'پیشنهادات وظیفه تولید شد' });
    }
  });

  const getPriorityColor = (priority: string) => {
    const colors = {
      'URGENT': 'bg-red-500',
      'HIGH': 'bg-orange-500',
      'MEDIUM': 'bg-yellow-500',
      'LOW': 'bg-green-500'
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'COMPLETED': 'bg-green-500',
      'IN_PROGRESS': 'bg-blue-500',
      'PENDING': 'bg-yellow-500',
      'OVERDUE': 'bg-red-500',
      'CANCELLED': 'bg-gray-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getTaskTypeIcon = (taskType: string) => {
    const icons = {
      'FOLLOW_UP': Target,
      'RELATIONSHIP_BUILDING': Users,
      'SKILL_DEVELOPMENT': TrendingUp,
      'PERFORMANCE_REVIEW': CheckCircle,
      'CULTURAL_ADAPTATION': Brain
    };
    const Icon = icons[taskType as keyof typeof icons] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  if (tasksLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">سیستم مدیریت وظایف هوشمند</h2>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowRecommendations(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="h-4 w-4 ml-2" />
            پیشنهادات هوشمند
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">کل وظایف</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalTasks}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">تکمیل شده</p>
                  <p className="text-2xl font-bold text-green-600">{analytics.completedTasks}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">در انتظار</p>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.pendingTasks}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">فوری</p>
                  <p className="text-2xl font-bold text-red-600">{analytics.urgentTasks}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="فیلتر وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">همه وضعیت‌ها</SelectItem>
            <SelectItem value="PENDING">در انتظار</SelectItem>
            <SelectItem value="IN_PROGRESS">در حال انجام</SelectItem>
            <SelectItem value="COMPLETED">تکمیل شده</SelectItem>
            <SelectItem value="OVERDUE">معوق</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="فیلتر اولویت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">همه اولویت‌ها</SelectItem>
            <SelectItem value="URGENT">فوری</SelectItem>
            <SelectItem value="HIGH">بالا</SelectItem>
            <SelectItem value="MEDIUM">متوسط</SelectItem>
            <SelectItem value="LOW">پایین</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks Grid */}
      <div className="grid gap-4">
        {tasks.map((task) => (
          <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getTaskTypeIcon(task.taskType)}
                    <h3 className="font-semibold text-gray-900">{task.title}</h3>
                    <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                      {task.priority}
                    </Badge>
                    <Badge className={`${getStatusColor(task.status)} text-white`}>
                      {task.status}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {task.representativeName}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(task.dueDate).toLocaleDateString('fa-IR')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Brain className="h-4 w-4" />
                      {task.aiConfidenceScore}% اطمینان
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {task.xpReward} امتیاز
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {task.status === 'PENDING' && (
                    <Button
                      size="sm"
                      onClick={() => updateTaskStatusMutation.mutate({ 
                        taskId: task.taskId, 
                        status: 'IN_PROGRESS' 
                      })}
                      disabled={updateTaskStatusMutation.isPending}
                    >
                      شروع
                    </Button>
                  )}
                  
                  {task.status === 'IN_PROGRESS' && (
                    <Button
                      size="sm"
                      onClick={() => updateTaskStatusMutation.mutate({ 
                        taskId: task.taskId, 
                        status: 'COMPLETED' 
                      })}
                      disabled={updateTaskStatusMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      تکمیل
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTask(task)}
                  >
                    جزئیات
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Task Details Dialog */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getTaskTypeIcon(selectedTask.taskType)}
                {selectedTask.title}
              </DialogTitle>
              <DialogDescription>
                جزئیات کامل وظیفه هوشمند
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">نماینده</label>
                  <p className="text-gray-900">{selectedTask.representativeName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">نوع وظیفه</label>
                  <p className="text-gray-900">{selectedTask.taskType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">اولویت</label>
                  <Badge className={`${getPriorityColor(selectedTask.priority)} text-white`}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">وضعیت</label>
                  <Badge className={`${getStatusColor(selectedTask.status)} text-white`}>
                    {selectedTask.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">تاریخ انجام</label>
                  <p className="text-gray-900">{new Date(selectedTask.dueDate).toLocaleDateString('fa-IR')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">امتیاز XP</label>
                  <p className="text-gray-900">{selectedTask.xpReward}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">شرح وظیفه</label>
                <p className="text-gray-900 mt-1">{selectedTask.description}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">نتیجه مورد انتظار</label>
                <p className="text-gray-900 mt-1">{selectedTask.expectedOutcome}</p>
              </div>
              
              {selectedTask.culturalContext && (
                <div>
                  <label className="text-sm font-medium text-gray-700">زمینه فرهنگی</label>
                  <p className="text-gray-900 mt-1">{selectedTask.culturalContext}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-500">
                  اطمینان AI: {selectedTask.aiConfidenceScore}% | 
                  سطح دشواری: {selectedTask.difficultyLevel}/5
                </div>
                
                {selectedTask.status !== 'COMPLETED' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateTaskStatusMutation.mutate({ 
                        taskId: selectedTask.taskId, 
                        status: 'COMPLETED' 
                      })}
                      disabled={updateTaskStatusMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      تکمیل وظیفه
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}