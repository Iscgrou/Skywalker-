// 🔐 UNIFIED AUTHENTICATION PAGE - Admin & CRM Login
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  CheckCircle2,
  Settings,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function UnifiedAuth() {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [loginType, setLoginType] = useState<'detecting' | 'admin' | 'crm'>('detecting');
  const { toast } = useToast();

  // Get both auth contexts
  const adminAuth = useAuth();
  const crmAuth = useCrmAuth();

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

  // Set panel type without auto-filling credentials
  const selectAdminPanel = () => {
    setLoginType('admin');
  };

  const selectCrmPanel = () => {
    setLoginType('crm');
  };

  const onSubmit = async (data: LoginForm) => {
    try {
      // Determine login type based on username - Fix setState during render
      const targetLoginType = data.username === 'mgr' ? 'admin' : 'crm';
      
      if (targetLoginType === 'admin') {
        // Update state before mutation to avoid setState during render
        setLoginType('admin');
        
        // Try admin login
        adminAuth.loginMutation.mutate(data, {
          onSuccess: () => {
            toast({
              title: "ورود موفق",
              description: "به پنل مدیریت خوش آمدید",
            });
            setLocation('/dashboard');
          },
          onError: (error: any) => {
            toast({
              title: "خطا در ورود",
              description: "نام کاربری یا رمز عبور اشتباه است",
              variant: "destructive",
            });
          }
        });

      } else if (targetLoginType === 'crm') {
        // Update state before mutation to avoid setState during render
        setLoginType('crm');
        
        // Try CRM login
        crmAuth.loginMutation.mutate(data, {
          onSuccess: (response) => {
            console.log('CRM Login Success in unified-auth:', response);
            if (response.success && response.user) {
              toast({
                title: "ورود موفق",
                description: `به پنل CRM خوش آمدید - ${response.user.fullName}`,
              });
              // Force navigation after successful CRM login
              setLocation('/crm/dashboard');
            } else {
              console.error('Invalid success response:', response);
              toast({
                title: "خطا در پردازش",
                description: "پاسخ سرور نامعتبر است",
                variant: "destructive",
              });
            }
          },
          onError: (error: any) => {
            console.error('CRM Login Error in unified-auth:', error);
            toast({
              title: "خطا در ورود",
              description: error.message || "نام کاربری یا رمز عبور اشتباه است",
              variant: "destructive",
            });
          }
        });

      } else {
        // Unknown username
        toast({
          title: "خطا در ورود",
          description: "نام کاربری نامعتبر است. لطفاً 'mgr' یا 'crm' را وارد کنید",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطا در ورود",
        description: "مشکل در ارتباط با سرور",
        variant: "destructive",
      });
    }
  };

  // Check if user is already authenticated - use useEffect to avoid setState during render
  useEffect(() => {
    if (adminAuth.isAuthenticated) {
      setLocation('/dashboard');
    } else if (crmAuth.user) {
      setLocation('/crm/dashboard');
    }
  }, [adminAuth.isAuthenticated, crmAuth.user, setLocation]);

  const isLoading = adminAuth.isLoading || crmAuth.loginMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Hero Section */}
        <div className="space-y-8 text-center lg:text-right">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full">
              <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                سیستم هوشمند مدیریت مالی
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 dark:text-white">
              مارفانت
              <span className="block text-blue-600 dark:text-blue-400 text-2xl lg:text-3xl mt-2">
                MarFaNet
              </span>
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-md mx-auto lg:mx-0">
              سیستم جامع مدیریت مالی با قابلیت‌های پیشرفته هوش مصنوعی و پنل CRM فارسی
            </p>
          </div>

          {/* System Features */}
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <Settings className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">پنل مدیریت</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">کنترل کامل سیستم</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">پنل CRM</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">مدیریت نمایندگان</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">گزارش‌گیری</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">تحلیل هوشمند</div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <Brain className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
              <div className="text-sm font-medium text-gray-900 dark:text-white">هوش مصنوعی</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">تصمیم‌گیری هوشمند</div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="w-full max-w-md mx-auto">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  ورود به سیستم
                </CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-400 mt-2">
                  وارد کردن اطلاعات احراز هویت
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Quick Access Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex flex-col gap-1"
                  onClick={selectAdminPanel}
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-xs">پنل مدیریت</span>
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 flex flex-col gap-1"
                  onClick={selectCrmPanel}
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs">پنل CRM</span>
                </Button>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                    نام کاربری
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="mgr یا crm"
                    className="h-12"
                    {...register('username')}
                  />
                  {errors.username && (
                    <p className="text-sm text-red-500">{errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">
                    رمز عبور
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="رمز عبور"
                      className="h-12 pl-10"
                      {...register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      در حال ورود...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      ورود به سیستم
                    </div>
                  )}
                </Button>
              </form>

              {/* Login Type Indicator */}
              {loginType !== 'detecting' && (
                <div className="flex items-center justify-center gap-2">
                  <Badge 
                    variant={loginType === 'admin' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {loginType === 'admin' ? (
                      <>
                        <Settings className="h-3 w-3 ml-1" />
                        پنل مدیریت
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3 ml-1" />
                        پنل CRM
                      </>
                    )}
                  </Badge>
                </div>
              )}

              {/* Help Text */}
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  دسترسی محدود؟{' '}
                  <span className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">
                    راهنما
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-1">امنیت سیستم</p>
                <p className="text-xs opacity-90">
                  تمامی جلسات کاری ثبت و نظارت می‌شوند. در صورت استفاده غیرمجاز، دسترسی محدود خواهد شد.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}