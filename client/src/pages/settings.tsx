import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Settings as SettingsIcon, 
  Save, 
  TestTube, 
  Bot, 
  Send, 
  Key,
  MessageSquare,
  Palette,
  Bell,
  Shield,
  FileText,
  Globe
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toPersianDigits } from "@/lib/persian-date";

const telegramSettingsSchema = z.object({
  botToken: z.string().min(1, "توکن ربات الزامی است"),
  chatId: z.string().min(1, "شناسه چت الزامی است"),
  template: z.string().min(1, "قالب پیام الزامی است"),
});

const portalSettingsSchema = z.object({
  portalTitle: z.string().min(1, "عنوان پورتال الزامی است"),
  portalDescription: z.string().optional(),
  showOwnerName: z.boolean(),
  showDetailedUsage: z.boolean(),
  customCss: z.string().optional(),
});

const invoiceTemplateSchema = z.object({
  invoiceHeader: z.string().min(1, "سربرگ فاکتور الزامی است"),
  invoiceFooter: z.string().optional(),
  showUsageDetails: z.boolean(),
  usageFormat: z.string().optional(),
  usageTableColumns: z.string().optional(), // Column configuration for usage details table
  showEventTimestamp: z.boolean().default(true),
  showEventType: z.boolean().default(true),
  showDescription: z.boolean().default(true),
  showAdminUsername: z.boolean().default(true),
});



const aiSettingsSchema = z.object({
  geminiApiKey: z.string().min(1, "کلید API الزامی است"),
  enableAutoAnalysis: z.boolean(),
  analysisFrequency: z.string(),
});

type TelegramSettingsData = z.infer<typeof telegramSettingsSchema>;
type AiSettingsData = z.infer<typeof aiSettingsSchema>;
type PortalSettingsData = z.infer<typeof portalSettingsSchema>;
type InvoiceTemplateData = z.infer<typeof invoiceTemplateSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("telegram");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: telegramBotToken } = useQuery({
    queryKey: ["/api/settings/telegram_bot_token"]
  });
  
  const { data: telegramChatId } = useQuery({
    queryKey: ["/api/settings/telegram_chat_id"]
  });
  
  const { data: telegramTemplate } = useQuery({
    queryKey: ["/api/settings/telegram_template"]
  });
  


  // Fetch invoice template settings
  const { data: showUsageDetails } = useQuery({
    queryKey: ["/api/settings/invoice_show_usage_details"]
  });

  const { data: showEventTimestamp } = useQuery({
    queryKey: ["/api/settings/invoice_show_event_timestamp"]
  });

  const { data: showEventType } = useQuery({
    queryKey: ["/api/settings/invoice_show_event_type"]
  });

  const { data: showDescription } = useQuery({
    queryKey: ["/api/settings/invoice_show_description"]
  });

  const { data: showAdminUsername } = useQuery({
    queryKey: ["/api/settings/invoice_show_admin_username"]
  });

  // Forms
  const telegramForm = useForm<TelegramSettingsData>({
    resolver: zodResolver(telegramSettingsSchema),
    defaultValues: {
      botToken: "",
      chatId: "",
      template: `📋 فاکتور شماره {invoice_number}

🏪 نماینده: {representative_name}
👤 صاحب فروشگاه: {shop_owner}
📱 شناسه پنل: {panel_id}
💰 مبلغ فاکتور: {amount} تومان
📅 تاریخ صدور: {issue_date}
🔍 وضعیت: {status}

ℹ️ برای مشاهده جزئیات کامل فاکتور، وارد لینک زیر بشوید

{portal_link}

تولید شده توسط سیستم مدیریت مالی 🤖`
    }
  });

  const invoiceTemplateForm = useForm<InvoiceTemplateData>({
    resolver: zodResolver(invoiceTemplateSchema),
    defaultValues: {
      invoiceHeader: "سیستم مدیریت مالی MarFaNet",
      invoiceFooter: "",
      showUsageDetails: true,
      usageFormat: "table",
      usageTableColumns: "admin_username,event_timestamp,event_type,description,amount",
      showEventTimestamp: true,
      showEventType: true,
      showDescription: true,
      showAdminUsername: true
    }
  });



  const aiForm = useForm<AiSettingsData>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      geminiApiKey: "",
      enableAutoAnalysis: false,
      analysisFrequency: "daily"
    }
  });

  // Update forms when data is loaded
  useEffect(() => {
    if ((telegramBotToken as any)?.value) telegramForm.setValue('botToken', (telegramBotToken as any).value);
    if ((telegramChatId as any)?.value) telegramForm.setValue('chatId', (telegramChatId as any).value);
    if ((telegramTemplate as any)?.value) telegramForm.setValue('template', (telegramTemplate as any).value);
    
    // Update invoice template form with settings values
    if ((showUsageDetails as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showUsageDetails', (showUsageDetails as any).value === 'true');
    }
    if ((showEventTimestamp as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showEventTimestamp', (showEventTimestamp as any).value === 'true');
    }
    if ((showEventType as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showEventType', (showEventType as any).value === 'true');
    }
    if ((showDescription as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showDescription', (showDescription as any).value === 'true');
    }
    if ((showAdminUsername as any)?.value !== undefined) {
      invoiceTemplateForm.setValue('showAdminUsername', (showAdminUsername as any).value === 'true');
    }
  }, [telegramBotToken, telegramChatId, telegramTemplate, showUsageDetails, showEventTimestamp, showEventType, showDescription, showAdminUsername]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      const response = await apiRequest('PUT', `/api/settings/${key}`, { value });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تنظیمات ذخیره شد",
        description: "تغییرات با موفقیت اعمال شد",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ذخیره تنظیمات",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const testTelegramMutation = useMutation({
    mutationFn: async () => {
      // This would test the Telegram connection
      const response = await apiRequest('POST', '/api/test-telegram');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "اتصال تلگرام موفق",
        description: "پیام تست با موفقیت ارسال شد",
      });
    },
    onError: () => {
      toast({
        title: "خطا در اتصال تلگرام",
        description: "لطفاً تنظیمات را بررسی کنید",
        variant: "destructive",
      });
    }
  });

  const onTelegramSubmit = async (data: TelegramSettingsData) => {
    await updateSettingMutation.mutateAsync({ key: 'telegram_bot_token', value: data.botToken });
    await updateSettingMutation.mutateAsync({ key: 'telegram_chat_id', value: data.chatId });
    await updateSettingMutation.mutateAsync({ key: 'telegram_template', value: data.template });
  };



  const onAiSubmit = async (data: AiSettingsData) => {
    await updateSettingMutation.mutateAsync({ key: 'gemini_api_key', value: data.geminiApiKey });
    await updateSettingMutation.mutateAsync({ key: 'ai_auto_analysis', value: data.enableAutoAnalysis.toString() });
    await updateSettingMutation.mutateAsync({ key: 'ai_analysis_frequency', value: data.analysisFrequency });
  };

  const onInvoiceTemplateSubmit = async (data: InvoiceTemplateData) => {
    await updateSettingMutation.mutateAsync({ key: 'invoice_header', value: data.invoiceHeader });
    await updateSettingMutation.mutateAsync({ key: 'invoice_footer', value: data.invoiceFooter || '' });
    await updateSettingMutation.mutateAsync({ key: 'invoice_show_usage_details', value: data.showUsageDetails.toString() });
    await updateSettingMutation.mutateAsync({ key: 'invoice_usage_format', value: data.usageFormat || 'table' });
    await updateSettingMutation.mutateAsync({ key: 'invoice_usage_table_columns', value: data.usageTableColumns || 'admin_username,event_timestamp,event_type,description,amount' });
    await updateSettingMutation.mutateAsync({ key: 'invoice_show_event_timestamp', value: data.showEventTimestamp.toString() });
    await updateSettingMutation.mutateAsync({ key: 'invoice_show_event_type', value: data.showEventType.toString() });
    await updateSettingMutation.mutateAsync({ key: 'invoice_show_description', value: data.showDescription.toString() });
    await updateSettingMutation.mutateAsync({ key: 'invoice_show_admin_username', value: data.showAdminUsername.toString() });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">تنظیمات</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            تنظیمات سیستم، یکپارچگی‌ها و پیکربندی
          </p>
        </div>
        
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          نسخه ۱.۰.۰
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="telegram" className="flex items-center">
            <Send className="w-4 h-4 mr-2" />
            تلگرام
          </TabsTrigger>
          <TabsTrigger value="invoice-template" className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            قالب فاکتور
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center">
            <Bot className="w-4 h-4 mr-2" />
            هوش مصنوعی
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            امنیت
          </TabsTrigger>
        </TabsList>

        {/* Telegram Settings */}
        <TabsContent value="telegram">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 ml-2" />
                  تنظیمات ربات تلگرام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...telegramForm}>
                  <form onSubmit={telegramForm.handleSubmit(onTelegramSubmit)} className="space-y-4">
                    <FormField
                      control={telegramForm.control}
                      name="botToken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>توکن ربات تلگرام</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" 
                              type="password"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            توکن ربات تلگرام خود را از @BotFather دریافت کنید
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={telegramForm.control}
                      name="chatId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>شناسه چت</FormLabel>
                          <FormControl>
                            <Input placeholder="-1001234567890" {...field} />
                          </FormControl>
                          <FormDescription>
                            شناسه چت یا گروه برای ارسال فاکتورها
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center space-x-4 space-x-reverse pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateSettingMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => testTelegramMutation.mutate()}
                        disabled={testTelegramMutation.isPending}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        {testTelegramMutation.isPending ? "در حال تست..." : "تست اتصال"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 ml-2" />
                  قالب پیام تلگرام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...telegramForm}>
                  <FormField
                    control={telegramForm.control}
                    name="template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>قالب پیام</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="قالب پیام خود را وارد کنید..."
                            rows={12}
                            className="font-mono text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="space-y-1">
                          <div>متغیرهای قابل استفاده:</div>
                          <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                            {`{invoice_number}, {representative_name}, {shop_owner}, {panel_id}, {amount}, {issue_date}, {status}, {portal_link}`}
                          </div>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoice Template Settings */}
        <TabsContent value="invoice-template">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 ml-2" />
                  تنظیمات قالب فاکتور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...invoiceTemplateForm}>
                  <form onSubmit={invoiceTemplateForm.handleSubmit(onInvoiceTemplateSubmit)} className="space-y-4">
                    <FormField
                      control={invoiceTemplateForm.control}
                      name="invoiceHeader"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سربرگ فاکتور</FormLabel>
                          <FormControl>
                            <Input placeholder="سیستم مدیریت مالی MarFaNet" {...field} />
                          </FormControl>
                          <FormDescription>
                            متن سربرگ که در بالای فاکتور نمایش داده می‌شود
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={invoiceTemplateForm.control}
                      name="invoiceFooter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>پاورقی فاکتور</FormLabel>
                          <FormControl>
                            <Textarea placeholder="متن پاورقی اختیاری..." rows={2} {...field} />
                          </FormControl>
                          <FormDescription>
                            متن اختیاری که در پایین فاکتور نمایش داده می‌شود
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showUsageDetails"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش جزئیات مصرف</FormLabel>
                            <FormDescription>
                              نمایش جدول ریز جزئیات مصرف در پورتال عمومی
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={updateSettingMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="w-5 h-5 ml-2" />
                  تنظیمات نمایش جدول ریز جزئیات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Form {...invoiceTemplateForm}>
                  <div className="space-y-4">
                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showAdminUsername"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش نام کاربری ادمین</FormLabel>
                            <FormDescription>
                              نمایش ستون admin_username در جدول
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showEventTimestamp"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش زمان رویداد</FormLabel>
                            <FormDescription>
                              نمایش ستون event_timestamp در جدول
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showEventType"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش نوع رویداد</FormLabel>
                            <FormDescription>
                              نمایش ستون event_type در جدول
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={invoiceTemplateForm.control}
                      name="showDescription"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                          <div className="space-y-0.5">
                            <FormLabel>نمایش توضیحات</FormLabel>
                            <FormDescription>
                              نمایش ستون description در جدول
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </Form>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">
                    پیش‌نمایش قالب جدول
                  </h4>
                  <div className="text-sm text-green-800 dark:text-green-300">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border border-green-200 dark:border-green-700">
                        <thead className="bg-green-100 dark:bg-green-800">
                          <tr>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">نام کاربری ادمین</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">زمان رویداد</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">نوع رویداد</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">توضیحات</th>
                            <th className="px-2 py-1 text-right border border-green-200 dark:border-green-700">مبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">mohamadrzmb</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">2025-07-09 12:53:58</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">CREATE</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">ایجاد کاربر: aghayeyousefi_sh2</td>
                            <td className="px-2 py-1 border border-green-200 dark:border-green-700">27000.00</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>



        {/* AI Settings */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 ml-2" />
                تنظیمات هوش مصنوعی (Gemini AI)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...aiForm}>
                <form onSubmit={aiForm.handleSubmit(onAiSubmit)} className="space-y-6">
                  <FormField
                    control={aiForm.control}
                    name="geminiApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>کلید API گمینی</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="AIza..."
                            type="password"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          کلید API خود را از Google AI Studio دریافت کنید
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>تحلیل خودکار</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          فعال‌سازی تحلیل خودکار وضعیت مالی
                        </p>
                      </div>
                      <FormField
                        control={aiForm.control}
                        name="enableAutoAnalysis"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={aiForm.control}
                      name="analysisFrequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>دوره تحلیل</FormLabel>
                          <select 
                            value={field.value}
                            onChange={field.onChange}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                          >
                            <option value="daily">روزانه</option>
                            <option value="weekly">هفتگی</option>
                            <option value="monthly">ماهانه</option>
                          </select>
                          <FormDescription>
                            فاصله زمانی برای تحلیل خودکار
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">
                      قابلیت‌های هوش مصنوعی
                    </h4>
                    <div className="space-y-1 text-sm text-green-800 dark:text-green-300">
                      <div>✓ تحلیل وضعیت مالی شرکت</div>
                      <div>✓ ارزیابی ریسک نمایندگان</div>
                      <div>✓ پیشنهادات بهبود عملکرد</div>
                      <div>✓ هشدارهای هوشمند</div>
                      <div>✓ تولید گزارشات تحلیلی</div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={updateSettingMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateSettingMutation.isPending ? "در حال ذخیره..." : "ذخیره تنظیمات"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 ml-2" />
                تنظیمات امنیتی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>اعتبارسنجی دو مرحله‌ای</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        فعال‌سازی احراز هویت دو مرحله‌ای برای امنیت بیشتر
                      </p>
                    </div>
                    <Switch />
                  </div>
                </div>

                <div>
                  <Label className="text-base font-medium">بک‌آپ خودکار</Label>
                  <select className="w-full mt-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <option value="daily">روزانه</option>
                    <option value="weekly">هفتگی</option>
                    <option value="monthly">ماهانه</option>
                    <option value="disabled">غیرفعال</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>لاگ فعالیت‌ها</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        ذخیره تمام فعالیت‌های انجام شده در سیستم
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-200 mb-2">
                    تنظیمات پیشرفته امنیتی
                  </h4>
                  <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                    <div>• رمزگذاری داده‌های حساس با AES-256</div>
                    <div>• محدودیت تلاش ورود ناموفق</div>
                    <div>• نظارت بر دسترسی‌های مشکوک</div>
                    <div>• بک‌آپ رمزگذاری شده</div>
                  </div>
                </div>

                <Button className="w-full">
                  <Key className="w-4 h-4 mr-2" />
                  تغییر رمز عبور اصلی
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
