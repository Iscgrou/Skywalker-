import { useState, useEffect } from "react";
import { Bot, Send, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { logout } = useAuth();
  const { toast } = useToast();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check Telegram connection status
  const { data: telegramBotToken } = useQuery({
    queryKey: ["/api/settings/telegram_bot_token"],
    retry: false
  });

  const isTelegramConnected = (telegramBotToken as any)?.value && (telegramBotToken as any).value.length > 0;

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "خروج موفق",
        description: "از سیستم خارج شدید"
      });
    } catch (error) {
      toast({
        title: "خطا در خروج",
        description: "مشکلی در فرآیند خروج رخ داد",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 lg:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                داشبورد مدیریت مالی
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 hidden sm:block">
                مدیریت فاکتورها، پرداخت‌ها و نمایندگان
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-4 space-x-reverse">
            {/* Current Time */}
            <div className="text-sm text-gray-500 dark:text-gray-400 ltr hidden md:block">
              {currentTime.toLocaleTimeString('fa-IR')}
            </div>
            
            {/* Telegram Integration Status */}
            <Badge 
              variant={isTelegramConnected ? "default" : "destructive"}
              className="telegram-connected hidden sm:flex"
            >
              <Send className="w-3 h-3 mr-1 lg:w-4 lg:h-4 lg:mr-2" />
              <span className="hidden lg:inline">
                {isTelegramConnected ? "ربات تلگرام متصل" : "ربات تلگرام قطع"}
              </span>
              <span className="lg:hidden">
                {isTelegramConnected ? "متصل" : "قطع"}
              </span>
            </Badge>
            
            {/* AI Assistant Quick Access */}
            <Button 
              variant="outline"
              size="sm"
              className="bg-accent hover:bg-accent/90 text-white border-accent"
              onClick={() => window.location.href = '/ai-assistant'}
            >
              <Bot className="w-4 h-4 mr-2" />
              دستیار هوشمند
            </Button>
            
            {/* Logout Button */}
            <Button 
              variant="outline"
              size="sm"
              className="hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:border-red-700 dark:hover:text-red-400"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              خروج
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
