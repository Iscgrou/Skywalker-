import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export default function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const { toast } = useToast();

  // Auto-login for open access deployment
  useEffect(() => {
    const autoLogin = () => {
      toast({
        title: "ورود خودکار",
        description: "احراز هویت غیرفعال - دسترسی آزاد به تمام بخش‌ها"
      });
      onLoginSuccess();
    };

    // Auto login after short delay
    const timer = setTimeout(autoLogin, 1000);
    return () => clearTimeout(timer);
  }, [onLoginSuccess, toast]);

  const handleManualLogin = () => {
    toast({
      title: "ورود موفق",
      description: "به پنل مدیریت خوش آمدید"
    });
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md mx-4 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            سیستم مالی MarFaNet
          </CardTitle>
          <CardDescription className="text-gray-600">
            ورود به پنل مدیریت - دسترسی آزاد
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              احراز هویت غیرفعال برای استفاده در محیط‌های مختلف توسعه
            </AlertDescription>
          </Alert>
          
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              در حال ورود خودکار...
            </p>
            
            <Button 
              onClick={handleManualLogin}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              ورود فوری به پنل
            </Button>
            
            <p className="text-xs text-gray-500">
              تمام ویژگی‌های سیستم در دسترس است
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}