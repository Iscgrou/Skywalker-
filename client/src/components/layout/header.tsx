import { useState, useEffect } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());

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

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              داشبورد مدیریت مالی
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              مدیریت فاکتورها، پرداخت‌ها و نمایندگان
            </p>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Current Time */}
            <div className="text-sm text-gray-500 dark:text-gray-400 ltr">
              {currentTime.toLocaleTimeString('fa-IR')}
            </div>
            
            {/* Telegram Integration Status */}
            <Badge 
              variant={isTelegramConnected ? "default" : "destructive"}
              className="telegram-connected"
            >
              <Send className="w-4 h-4 mr-2" />
              {isTelegramConnected ? "ربات تلگرام متصل" : "ربات تلگرام قطع"}
            </Badge>
            
            {/* AI Assistant Quick Access */}
            <Button 
              variant="outline"
              className="bg-accent hover:bg-accent/90 text-white border-accent"
              onClick={() => window.location.href = '/ai-assistant'}
            >
              <Bot className="w-4 h-4 mr-2" />
              دستیار هوشمند
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
