// 🔐 CRM AUTHENTICATION PAGE - Dual Panel Login
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Brain, 
  TrendingUp, 
  Lock, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useCrmAuth } from '@/hooks/use-crm-auth';

const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function CrmAuth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPanel, setSelectedPanel] = useState<'admin' | 'crm'>('admin');
  
  // Use CRM authentication context
  const { user, loginMutation } = useCrmAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  // Redirect if already authenticated
  if (user) {
    if (user.role === 'ADMIN') {
      setLocation('/admin/dashboard');
    } else if (user.role === 'CRM') {
      setLocation('/crm/dashboard');
    }
    return null;
  }

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data, {
      onSuccess: (response) => {
        console.log('Login successful:', response);
        
        // Redirect based on role
        if (response.user.role === 'ADMIN') {
          setLocation('/admin/dashboard');
        } else if (response.user.role === 'CRM') {
          setLocation('/crm/dashboard');
        }
      }
    });
  };

  // Set credentials based on panel selection
  const handlePanelSelect = (panel: 'admin' | 'crm') => {
    setSelectedPanel(panel);
    if (panel === 'admin') {
      setValue('username', 'mgr');
      setValue('password', '8679');
    } else {
      setValue('username', 'crm');
      setValue('password', '8679');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Hero Section */}
        <div className="flex flex-col justify-center space-y-6 text-center lg:text-right">
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white">
              🏢 سیستم مدیریت مالی
              <span className="block text-blue-600 dark:text-blue-400">MarFaNet CRM</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              مدیریت هوشمند نمایندگان با قدرت هوش مصنوعی فارسی
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto lg:max-w-none">
            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-lg backdrop-blur-sm">
              <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">امنیت بالا</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                کنترل دسترسی نقش‌محور
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-lg backdrop-blur-sm">
              <Brain className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">هوش مصنوعی</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                تحلیل فرهنگی و روانشناختی
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-lg backdrop-blur-sm">
              <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">مدیریت تیم</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                سطح‌بندی و ارزیابی عملکرد
              </p>
            </div>
            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-lg backdrop-blur-sm">
              <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-1">گزارش‌گیری</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                آنالیز کامل عملکرد مالی
              </p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex flex-col justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                <Lock className="h-6 w-6" />
                ورود به سیستم
              </CardTitle>
              <CardDescription>
                انتخاب پنل و وارد کردن اطلاعات کاربری
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Panel Selection */}
              <Tabs value={selectedPanel} onValueChange={(value) => handlePanelSelect(value as 'admin' | 'crm')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="admin" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    پنل ادمین
                  </TabsTrigger>
                  <TabsTrigger value="crm" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    پنل CRM
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="admin" className="space-y-3 mt-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">
                        پنل مدیریت (Admin)
                      </span>
                    </div>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>✅ دسترسی کامل به اطلاعات مالی</li>
                      <li>✅ مدیریت نمایندگان و فروش</li>
                      <li>✅ گزارش‌گیری پیشرفته</li>
                      <li>✅ تنظیمات سیستم CRM</li>
                    </ul>
                  </div>
                </TabsContent>

                <TabsContent value="crm" className="space-y-3 mt-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-orange-900 dark:text-orange-100">
                        پنل CRM (محدود)
                      </span>
                    </div>
                    <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-1">
                      <li>🔸 دسترسی به بدهی و پروفایل نمایندگان</li>
                      <li>🔸 مدیریت وظایف CRM</li>
                      <li>🔸 دستیار هوشمند AI</li>
                      <li>❌ عدم دسترسی به مبالغ فروش</li>
                    </ul>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {loginMutation.isError && (
                  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800 dark:text-red-200">
                      نام کاربری یا رمز عبور اشتباه است
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">نام کاربری</Label>
                  <Input
                    id="username"
                    {...register('username')}
                    className="text-center font-mono"
                    placeholder="mgr یا crm"
                    disabled={loginMutation.isPending}
                  />
                  {errors.username && (
                    <p className="text-sm text-red-600">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      className="text-center font-mono pl-10"
                      placeholder="8679"
                      disabled={loginMutation.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      در حال ورود...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      ورود به {selectedPanel === 'admin' ? 'پنل ادمین' : 'پنل CRM'}
                    </div>
                  )}
                </Button>
              </form>

              {/* Panel Info */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    پنل انتخاب شده:
                  </span>
                  <Badge variant={selectedPanel === 'admin' ? 'default' : 'secondary'}>
                    {selectedPanel === 'admin' ? 'ادمین (کامل)' : 'CRM (محدود)'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {selectedPanel === 'admin' 
                    ? 'دسترسی کامل به تمام قابلیت‌های سیستم مالی و CRM'
                    : 'دسترسی محدود به بدهی، پروفایل نمایندگان و وظایف CRM'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}