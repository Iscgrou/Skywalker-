import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  Bot, 
  Send, 
  User, 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle,
  FileText,
  Download,
  Loader2,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'analysis' | 'suggestion';
}

interface FinancialAnalysis {
  summary: string;
  recommendations: string[];
  insights: string[];
  alerts: string[];
}

interface RepresentativeAnalysis {
  riskLevel: "low" | "medium" | "high";
  paymentPattern: string;
  recommendations: string[];
  creditScore: number;
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'سلام! من دستیار هوشمند مالی شما هستم. می‌توانم به شما در تحلیل وضعیت مالی، ارائه پیشنهادات بهبود عملکرد و پاسخ به سوالات مربوط به حسابداری کمک کنم. چه کاری می‌توانم برایتان انجام دهم؟',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedRepresentative, setSelectedRepresentative] = useState<string>('');

  const { toast } = useToast();

  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard"]
  });

  const { data: representatives } = useQuery({
    queryKey: ["/api/representatives"]
  });

  const questionMutation = useMutation({
    mutationFn: async (question: string) => {
      const response = await apiRequest('POST', '/api/ai/question', { question });
      return response.json();
    },
    onSuccess: (data) => {
      const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        content: data.answer,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        content: 'متاسفانه در حال حاضر قادر به پاسخگویی نیستم. لطفاً بعداً تلاش کنید.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: "خطا در دستیار هوشمند",
        description: "لطفاً اتصال اینترنت و تنظیمات API را بررسی کنید",
        variant: "destructive",
      });
    }
  });

  const financialAnalysisMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/analyze-financial');
      return response.json();
    },
    onSuccess: (data: FinancialAnalysis) => {
      const analysisMessage: Message = {
        id: Date.now().toString() + '-analysis',
        content: JSON.stringify(data),
        sender: 'ai',
        timestamp: new Date(),
        type: 'analysis'
      };
      setMessages(prev => [...prev, analysisMessage]);
    },
    onError: () => {
      toast({
        title: "خطا در تحلیل مالی",
        description: "امکان دریافت تحلیل مالی وجود ندارد",
        variant: "destructive",
      });
    }
  });

  const representativeAnalysisMutation = useMutation({
    mutationFn: async (representativeCode: string) => {
      const response = await apiRequest('POST', '/api/ai/analyze-representative', {
        representativeCode
      });
      return response.json();
    },
    onSuccess: (data: RepresentativeAnalysis) => {
      const analysisMessage: Message = {
        id: Date.now().toString() + '-rep-analysis',
        content: JSON.stringify(data),
        sender: 'ai',
        timestamp: new Date(),
        type: 'analysis'
      };
      setMessages(prev => [...prev, analysisMessage]);
    }
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/generate-report');
      return response.json();
    },
    onSuccess: (data) => {
      const reportMessage: Message = {
        id: Date.now().toString() + '-report',
        content: data.report,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, reportMessage]);
    }
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    questionMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFinancialAnalysis = () => {
    const analysisRequestMessage: Message = {
      id: Date.now().toString() + '-user-analysis',
      content: 'لطفاً تحلیل کاملی از وضعیت مالی فعلی ارائه دهید',
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, analysisRequestMessage]);
    financialAnalysisMutation.mutate();
  };

  const handleRepresentativeAnalysis = () => {
    if (!selectedRepresentative) {
      toast({
        title: "نماینده انتخاب نشده",
        description: "لطفاً یک نماینده برای تحلیل انتخاب کنید",
        variant: "destructive",
      });
      return;
    }

    const rep = (representatives as any)?.find((r: any) => r.id.toString() === selectedRepresentative);
    const analysisRequestMessage: Message = {
      id: Date.now().toString() + '-user-rep-analysis',
      content: `لطفاً نماینده "${rep?.name}" را تحلیل کنید`,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, analysisRequestMessage]);
    representativeAnalysisMutation.mutate(rep.code);
  };

  const renderMessage = (message: Message) => {
    if (message.type === 'analysis') {
      try {
        const analysis = JSON.parse(message.content);
        
        if (analysis.riskLevel) {
          // Representative analysis
          const repAnalysis = analysis as RepresentativeAnalysis;
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">تحلیل نماینده</h4>
                <Badge variant={
                  repAnalysis.riskLevel === 'low' ? 'default' : 
                  repAnalysis.riskLevel === 'medium' ? 'secondary' : 'destructive'
                }>
                  ریسک {repAnalysis.riskLevel === 'low' ? 'پایین' : 
                           repAnalysis.riskLevel === 'medium' ? 'متوسط' : 'بالا'}
                </Badge>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h5 className="font-medium mb-2">امتیاز اعتباری</h5>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        repAnalysis.creditScore >= 70 ? 'bg-green-500' : 
                        repAnalysis.creditScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${repAnalysis.creditScore}%` }}
                    />
                  </div>
                  <span className="font-bold text-lg">
                    {toPersianDigits(repAnalysis.creditScore.toString())}
                  </span>
                </div>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">الگوی پرداخت</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {repAnalysis.paymentPattern}
                </p>
              </div>
              
              <div>
                <h5 className="font-medium mb-2">پیشنهادات</h5>
                <ul className="space-y-1">
                  {repAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-blue-500 ml-2">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        } else {
          // Financial analysis
          const finAnalysis = analysis as FinancialAnalysis;
          return (
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 ml-2" />
                تحلیل مالی جامع
              </h4>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h5 className="font-medium mb-2">خلاصه</h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {finAnalysis.summary}
                </p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h5 className="font-medium mb-2">بینش‌های کلیدی</h5>
                <ul className="space-y-1">
                  {finAnalysis.insights.map((insight, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <Lightbulb className="w-4 h-4 text-blue-500 ml-2 mt-0.5 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <h5 className="font-medium mb-2">پیشنهادات</h5>
                <ul className="space-y-1">
                  {finAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="text-yellow-600 ml-2">💡</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
              
              {finAnalysis.alerts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h5 className="font-medium mb-2 flex items-center">
                    <AlertTriangle className="w-4 h-4 ml-2 text-red-600" />
                    هشدارها
                  </h5>
                  <ul className="space-y-1">
                    {finAnalysis.alerts.map((alert, index) => (
                      <li key={index} className="text-sm flex items-start">
                        <span className="text-red-500 ml-2">⚠️</span>
                        {alert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        }
      } catch (error) {
        return <div className="text-sm text-gray-600 dark:text-gray-400">{message.content}</div>;
      }
    }
    
    return <div className="text-sm">{message.content}</div>;
  };

  const predefinedQuestions = [
    "وضعیت مالی فعلی شرکت چگونه است؟",
    "کدام نمایندگان بیشترین بدهی را دارند؟",
    "روند درآمد ماهانه چگونه بوده است؟",
    "چگونه می‌توانم نرخ وصولی مطالبات را بهبود دهم؟",
    "بهترین استراتژی برای مدیریت ریسک چیست؟"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">دستیار هوشمند</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تحلیل مالی هوشمند با قدرت Gemini AI
          </p>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Sparkles className="w-3 h-3 ml-1" />
            Gemini AI
          </Badge>
          <Button
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            variant="outline"
          >
            <FileText className="w-4 h-4 mr-2" />
            {generateReportMutation.isPending ? "در حال تولید..." : "گزارش هوشمند"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Actions Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">عملیات سریع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={handleFinancialAnalysis}
                disabled={financialAnalysisMutation.isPending}
                className="w-full justify-start"
                variant="outline"
              >
                <TrendingUp className="w-4 h-4 ml-2" />
                {financialAnalysisMutation.isPending ? "در حال تحلیل..." : "تحلیل مالی"}
              </Button>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">تحلیل نماینده</label>
                <select 
                  value={selectedRepresentative} 
                  onChange={(e) => setSelectedRepresentative(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">انتخاب نماینده...</option>
                  {(representatives as any)?.map((rep: any) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} ({rep.code})
                    </option>
                  ))}
                </select>
                <Button 
                  onClick={handleRepresentativeAnalysis}
                  disabled={representativeAnalysisMutation.isPending || !selectedRepresentative}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  {representativeAnalysisMutation.isPending ? "در حال تحلیل..." : "تحلیل نماینده"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">سوالات متداول</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {predefinedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setInputMessage(question);
                      const userMessage: Message = {
                        id: Date.now().toString(),
                        content: question,
                        sender: 'user',
                        timestamp: new Date(),
                        type: 'text'
                      };
                      setMessages(prev => [...prev, userMessage]);
                      questionMutation.mutate(question);
                    }}
                    className="w-full text-right justify-start h-auto p-2 text-xs text-wrap"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="flex-shrink-0 border-b">
              <CardTitle className="flex items-center">
                <Bot className="w-6 h-6 ml-2 text-blue-600" />
                گفتگو با دستیار هوشمند
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-3 space-x-reverse ${
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className={`flex items-start space-x-2 space-x-reverse max-w-[80%]`}>
                        {message.sender === 'ai' && (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        
                        <div
                          className={`px-4 py-3 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                          }`}
                        >
                          {renderMessage(message)}
                          <div className="text-xs opacity-70 mt-2">
                            {message.timestamp.toLocaleTimeString('fa-IR')}
                          </div>
                        </div>
                        
                        {message.sender === 'user' && (
                          <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {questionMutation.isPending && (
                    <div className="flex items-start space-x-3 space-x-reverse justify-start">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-lg">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">در حال تایپ...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex space-x-2 space-x-reverse">
                  <Textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="سوال خود را بپرسید..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    disabled={questionMutation.isPending}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || questionMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 self-end"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Insights Panel */}
      {dashboardData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="w-5 h-5 ml-2 text-yellow-600" />
              بینش‌های هوشمند خودکار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                  📊 تحلیل عملکرد
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  درآمد این ماه نسبت به ماه گذشته ۸.۵% رشد داشته است. این روند مثبت قابل تحسین است.
                </p>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">
                  ⚠️ هشدار مطالبات
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  {(dashboardData as any).overdueInvoices} نماینده دارای مطالبات معوق هستند. توصیه می‌شود پیگیری شود.
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">
                  💡 پیشنهاد بهبود
                </h4>
                <p className="text-sm text-green-800 dark:text-green-300">
                  با ارسال یادآوری‌های منظم از طریق تلگرام، می‌توانید نرخ وصولی را تا ۱۵% افزایش دهید.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
