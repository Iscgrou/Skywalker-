// 🔔 CRM NOTIFICATIONS & ALERTS SYSTEM
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  BellRing, 
  CheckCircle2, 
  AlertTriangle,
  Brain,
  Target,
  Clock,
  TrendingUp,
  ArrowLeft,
  Settings,
  Filter,
  MarkdownIcon as Mark
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface CrmNotification {
  id: string;
  representativeId?: number;
  representativeName?: string;
  notificationType: 'task_reminder' | 'performance_alert' | 'ai_insight' | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  actionRequired: boolean;
  relatedEntityId?: number;
  culturalSensitivity?: string;
  createdAt: string;
}

interface NotificationSettings {
  taskReminders: boolean;
  performanceAlerts: boolean;
  aiInsights: boolean;
  systemAlerts: boolean;
  emailNotifications: boolean;
  urgentOnlyMode: boolean;
}

export default function CrmNotifications() {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery<CrmNotification[]>({
    queryKey: ['/api/crm/notifications'],
    refetchInterval: 30000
  });

  const { data: settings } = useQuery<NotificationSettings>({
    queryKey: ['/api/crm/notifications/settings']
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest('PATCH', `/api/crm/notifications/${notificationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/notifications'] });
    }
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', '/api/crm/notifications/mark-all-read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/notifications'] });
      toast({
        title: "تمام اعلان‌ها خوانده شد",
        description: "همه اعلان‌ها به عنوان خوانده شده علامت‌گذاری شدند",
      });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<NotificationSettings>) => {
      const response = await apiRequest('PUT', '/api/crm/notifications/settings', newSettings);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/notifications/settings'] });
      toast({
        title: "تنظیمات ذخیره شد",
        description: "تنظیمات اعلان‌ها با موفقیت به‌روزرسانی شد",
      });
    }
  });

  const filteredNotifications = notifications?.filter(notif => {
    const typeMatch = filterType === 'all' || notif.notificationType === filterType;
    const priorityMatch = filterPriority === 'all' || notif.priority === filterPriority;
    const readMatch = !showUnreadOnly || !notif.isRead;
    
    return typeMatch && priorityMatch && readMatch;
  });

  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_reminder':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'performance_alert':
        return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'ai_insight':
        return <Brain className="h-4 w-4 text-purple-600" />;
      case 'system_alert':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">فوری</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-600">بالا</Badge>;
      case 'medium':
        return <Badge variant="secondary">متوسط</Badge>;
      case 'low':
        return <Badge variant="outline">پایین</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'task_reminder':
        return 'یادآوری وظیفه';
      case 'performance_alert':
        return 'هشدار عملکرد';
      case 'ai_insight':
        return 'بینش هوش مصنوعی';
      case 'system_alert':
        return 'هشدار سیستم';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری اعلان‌ها...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 ml-1" />
              بازگشت به داشبورد
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              مرکز اعلان‌ها
              {unreadCount > 0 && (
                <Badge variant="destructive" className="mr-2">
                  {unreadCount} خوانده نشده
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              مدیریت اعلان‌ها و هشدارهای سیستم
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button 
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            علامت‌گذاری همه به عنوان خوانده شده
          </Button>
        )}
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications">اعلان‌ها</TabsTrigger>
          <TabsTrigger value="settings">تنظیمات</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                فیلترها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>نوع اعلان</Label>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="all">همه انواع</option>
                    <option value="task_reminder">یادآوری وظیفه</option>
                    <option value="performance_alert">هشدار عملکرد</option>
                    <option value="ai_insight">بینش AI</option>
                    <option value="system_alert">هشدار سیستم</option>
                  </select>
                </div>

                <div>
                  <Label>اولویت</Label>
                  <select 
                    value={filterPriority} 
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md"
                  >
                    <option value="all">همه اولویت‌ها</option>
                    <option value="urgent">فوری</option>
                    <option value="high">بالا</option>
                    <option value="medium">متوسط</option>
                    <option value="low">پایین</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="unread-only"
                    checked={showUnreadOnly}
                    onCheckedChange={setShowUnreadOnly}
                  />
                  <Label htmlFor="unread-only">فقط خوانده نشده‌ها</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications List */}
          <div className="space-y-4">
            {filteredNotifications?.map(notification => (
              <Card 
                key={notification.id} 
                className={`transition-all duration-200 ${
                  !notification.isRead 
                    ? 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                    : 'hover:shadow-md'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.notificationType)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-semibold ${!notification.isRead ? 'text-blue-900 dark:text-blue-100' : ''}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getTypeLabel(notification.notificationType)}</span>
                          {notification.representativeName && (
                            <>
                              <span>•</span>
                              <span>{notification.representativeName}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{new Date(notification.createdAt).toLocaleDateString('fa-IR')}</span>
                          {notification.culturalSensitivity && (
                            <>
                              <span>•</span>
                              <span>حساسیت فرهنگی: {notification.culturalSensitivity}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {getPriorityBadge(notification.priority)}
                      
                      {notification.actionRequired && (
                        <Badge variant="outline" className="text-xs">
                          نیاز به اقدام
                        </Badge>
                      )}

                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredNotifications?.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {notifications?.length === 0 
                    ? 'هیچ اعلانی موجود نیست' 
                    : 'هیچ اعلانی با این معیارها یافت نشد'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                تنظیمات اعلان‌ها
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settings && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">انواع اعلان‌ها</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="task-reminders">یادآوری وظایف</Label>
                          <Switch
                            id="task-reminders"
                            checked={settings.taskReminders}
                            onCheckedChange={(checked) => 
                              updateSettingsMutation.mutate({ taskReminders: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="performance-alerts">هشدارهای عملکرد</Label>
                          <Switch
                            id="performance-alerts"
                            checked={settings.performanceAlerts}
                            onCheckedChange={(checked) => 
                              updateSettingsMutation.mutate({ performanceAlerts: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="ai-insights">بینش‌های هوش مصنوعی</Label>
                          <Switch
                            id="ai-insights"
                            checked={settings.aiInsights}
                            onCheckedChange={(checked) => 
                              updateSettingsMutation.mutate({ aiInsights: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="system-alerts">هشدارهای سیستم</Label>
                          <Switch
                            id="system-alerts"
                            checked={settings.systemAlerts}
                            onCheckedChange={(checked) => 
                              updateSettingsMutation.mutate({ systemAlerts: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold">تنظیمات عمومی</h4>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="email-notifications">اعلان‌های ایمیل</Label>
                          <Switch
                            id="email-notifications"
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => 
                              updateSettingsMutation.mutate({ emailNotifications: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="urgent-only">فقط اعلان‌های فوری</Label>
                          <Switch
                            id="urgent-only"
                            checked={settings.urgentOnlyMode}
                            onCheckedChange={(checked) => 
                              updateSettingsMutation.mutate({ urgentOnlyMode: checked })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      تنظیمات به صورت خودکار ذخیره می‌شوند. اعلان‌های فوری همیشه نمایش داده می‌شوند.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}