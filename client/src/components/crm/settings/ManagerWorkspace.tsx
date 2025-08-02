import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle,
  PauseCircle,
  Trash2,
  Edit,
  Filter
} from 'lucide-react';

export function ManagerWorkspace() {
  const [tasks, setTasks] = useState([
    {
      id: 'task-1',
      title: 'بررسی گزارش‌های فروش هفتگی',
      description: 'تحلیل عملکرد نمایندگان و شناسایی نقاط ضعف',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      dueDate: '1403/05/15',
      createdBy: 'CRM_MANAGER'
    },
    {
      id: 'task-2', 
      title: 'بروزرسانی لیست آفرهای ویژه',
      description: 'اضافه کردن آفرهای جدید برای فصل پاییز',
      status: 'PENDING',
      priority: 'MEDIUM',
      dueDate: '1403/05/20',
      createdBy: 'CRM_MANAGER'
    }
  ]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    dueDate: ''
  });

  const [showNewTaskForm, setShowNewTaskForm] = useState(false);

  const handleCreateTask = () => {
    if (!newTask.title.trim()) return;
    
    const task = {
      id: `task-${Date.now()}`,
      ...newTask,
      status: 'PENDING',
      createdBy: 'CRM_MANAGER'
    };
    
    setTasks([task, ...tasks]);
    setNewTask({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
    setShowNewTaskForm(false);
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus } : task
    ));
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'IN_PROGRESS': return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'PAUSED': return <PauseCircle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'تکمیل شده';
      case 'IN_PROGRESS': return 'در حال انجام';
      case 'PAUSED': return 'متوقف شده';
      default: return 'در انتظار';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const statusCounts = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {statusCounts.total}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              کل وظایف
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
              {statusCounts.pending}
            </div>
            <div className="text-sm text-yellow-600 dark:text-yellow-400">
              در انتظار
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {statusCounts.inProgress}
            </div>
            <div className="text-sm text-orange-600 dark:text-orange-400">
              در حال انجام
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {statusCounts.completed}
            </div>
            <div className="text-sm text-green-600 dark:text-green-400">
              تکمیل شده
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header & New Task */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            📋 وظایف مدیریتی
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            مدیریت و نظارت بر عملیات روزانه
          </p>
        </div>
        
        <Button 
          onClick={() => setShowNewTaskForm(!showNewTaskForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 ml-2" />
          وظیفه جدید
        </Button>
      </div>

      {/* New Task Form */}
      {showNewTaskForm && (
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900 dark:text-white">
              ایجاد وظیفه جدید
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="عنوان وظیفه..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="bg-gray-50 dark:bg-gray-900"
            />
            
            <Textarea
              placeholder="توضیحات وظیفه..."
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="bg-gray-50 dark:bg-gray-900"
              rows={3}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اولویت
                </label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="LOW">کم</option>
                  <option value="MEDIUM">متوسط</option>
                  <option value="HIGH">بالا</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  تاریخ انجام
                </label>
                <Input
                  type="text"
                  placeholder="1403/05/30"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="bg-gray-50 dark:bg-gray-900"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleCreateTask} className="bg-green-600 hover:bg-green-700">
                ایجاد وظیفه
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowNewTaskForm(false)}
                className="border-gray-300 dark:border-gray-600"
              >
                انصراف
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card key={task.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(task.status)}
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {task.title}
                    </h4>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority === 'HIGH' ? 'بالا' : task.priority === 'MEDIUM' ? 'متوسط' : 'کم'}
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {task.dueDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{task.dueDate}</span>
                      </div>
                    )}
                    <Badge variant="outline" className="border-gray-300 dark:border-gray-600">
                      {getStatusText(task.status)}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {task.status !== 'COMPLETED' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(task.id, task.status === 'IN_PROGRESS' ? 'PAUSED' : 'IN_PROGRESS')}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                      >
                        {task.status === 'IN_PROGRESS' ? (
                          <>
                            <PauseCircle className="w-4 h-4 ml-1" />
                            توقف
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 ml-1" />
                            شروع
                          </>
                        )}
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                        className="border-green-300 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="w-4 h-4 ml-1" />
                        تکمیل
                      </Button>
                    </>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTask(task.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {tasks.length === 0 && (
          <Card className="bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                هنوز وظیفه‌ای تعریف نشده است
              </p>
              <Button 
                onClick={() => setShowNewTaskForm(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                ایجاد اولین وظیفه
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}