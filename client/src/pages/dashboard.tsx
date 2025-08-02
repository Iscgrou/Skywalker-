import { useQuery } from "@tanstack/react-query";
import { 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  FileText, 
  Activity,
  Upload,
  Bot
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InvoiceUpload from "@/components/invoice-upload";
import AiChat from "@/components/ai-chat";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardData {
  totalRevenue: string;
  totalDebt: string;
  activeRepresentatives: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalSalesPartners: number;
  recentActivities: Array<{
    id: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  colorClass = "text-primary",
  onClick 
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  trend?: string;
  colorClass?: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={`stat-card ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">
              {title}
            </p>
            <p className="text-2xl font-bold text-white mt-2">
              {toPersianDigits(value)}
            </p>
            {subtitle && (
              <p className="text-sm text-blue-300 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Icon className={`w-6 h-6 ${colorClass}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-400">{trend}</span>
            <span className="text-blue-200 mr-2">نسبت به ماه گذشته</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invoice_created':
        return '📄';
      case 'payment_received':
        return '💰';
      case 'telegram_sent':
        return '📱';
      case 'representative_created':
        return '👤';
      default:
        return '📋';
    }
  };

  return (
    <div className="activity-item">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg">
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1">
        <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(activity.createdAt).toLocaleString('fa-IR')}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"]
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">خطا در بارگذاری اطلاعات داشبورد</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="درآمد کل (ماه جاری)"
          value={formatCurrency(dashboardData.totalRevenue)}
          subtitle="تومان"
          icon={TrendingUp}
          trend="+۸.۵%"
          colorClass="text-green-600"
          onClick={() => window.location.href = '/invoices'}
        />
        
        <StatCard
          title="مطالبات معوق"
          value={formatCurrency(dashboardData.totalDebt)}
          subtitle="تومان"
          icon={AlertTriangle}
          trend={`${toPersianDigits(dashboardData.overdueInvoices.toString())} نماینده`}
          colorClass="text-red-600"
          onClick={() => window.location.href = '/invoices'}
        />
        
        <StatCard
          title="نمایندگان فعال"
          value={dashboardData.activeRepresentatives.toString()}
          subtitle="فروشگاه موبایل"
          icon={Users}
          trend="+۳ نماینده جدید این ماه"
          colorClass="text-blue-600"
          onClick={() => window.location.href = '/representatives'}
        />
        
        <StatCard
          title="فاکتورهای در انتظار"
          value={dashboardData.pendingInvoices.toString()}
          subtitle="فاکتور"
          icon={FileText}
          trend="آماده ارسال به تلگرام"
          colorClass="text-orange-600"
          onClick={() => window.location.href = '/invoices'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Invoice Generation Section */}
        <div className="lg:col-span-2">
          <InvoiceUpload />
        </div>

        {/* Quick Actions & AI Assistant */}
        <div className="space-y-6">
          {/* AI Financial Assistant */}
          <Card className="ai-assistant-card">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center ml-3 backdrop-blur-sm">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">دستیار هوشمند مالی</h3>
                  <p className="text-sm text-blue-200 font-normal">مبتنی بر xAI Grok</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AiChat />
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="w-5 h-5 ml-2" />
                فعالیت‌های اخیر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {dashboardData.recentActivities.length > 0 ? (
                  dashboardData.recentActivities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <p className="text-sm text-blue-200 text-center py-4">
                    فعالیت اخیری وجود ندارد
                  </p>
                )}
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-sm text-blue-300 hover:text-white hover:bg-white/10"
                onClick={() => window.location.href = '/activity-logs'}
              >
                مشاهده همه فعالیت‌ها
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>آمار سریع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-200">نرخ وصولی</span>
                  <span className="text-sm font-semibold text-green-400">
                    {toPersianDigits('87%')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-200">میانگین زمان پرداخت</span>
                  <span className="text-sm font-semibold text-white">
                    {toPersianDigits('12')} روز
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-200">همکاران فروش فعال</span>
                  <span className="text-sm font-semibold text-white">
                    {toPersianDigits(dashboardData.totalSalesPartners.toString())} نفر
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-200">کل کمیسیون ماه</span>
                  <span className="text-sm font-semibold text-accent">
                    {toPersianDigits('1,250,000')} ت
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Representative Portal Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>پورتال عمومی نمایندگان</CardTitle>
            <Badge variant="secondary" className="bg-gray-900 text-white">
              حالت تاریک
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Portal Preview */}
          <div className="portal-dark rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-white">پورتال مالی نماینده</h3>
                <p className="text-gray-400 text-sm">فروشگاه موبایل سیمکارت</p>
              </div>
              <div className="text-left ltr">
                <p className="text-sm text-gray-400">شناسه پنل</p>
                <p className="font-mono text-yellow-400">mntzresf</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="portal-card">
                <p className="text-gray-400 text-sm">بدهی کل</p>
                <p className="portal-stat-value portal-debt">{toPersianDigits('1,230,000')}</p>
                <p className="text-gray-500 text-sm">تومان</p>
              </div>
              <div className="portal-card">
                <p className="text-gray-400 text-sm">آخرین پرداخت</p>
                <p className="portal-stat-value portal-credit">{toPersianDigits('500,000')}</p>
                <p className="text-gray-500 text-sm">{toPersianDigits('1404/4/28')}</p>
              </div>
              <div className="portal-card">
                <p className="text-gray-400 text-sm">وضعیت حساب</p>
                <p className="text-lg font-bold portal-warning">بدهکار</p>
                <p className="text-gray-500 text-sm">نیاز به پرداخت</p>
              </div>
            </div>

            <div className="portal-card">
              <h4 className="font-semibold mb-3 text-white">فاکتورهای اخیر</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <span className="text-sm text-white">فاکتور #1001 - {toPersianDigits('1404/4/30')}</span>
                  <span className="text-sm portal-debt">{toPersianDigits('690,000')} ت</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gray-700 rounded">
                  <span className="text-sm text-white">فاکتور #1000 - {toPersianDigits('1404/4/15')}</span>
                  <span className="text-sm portal-credit">{toPersianDigits('540,000')} ت (پرداخت شده)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                تولید شده توسط سیستم مدیریت مالی MarFaNet 🤖
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              هر نماینده با لینک منحصر به فرد می‌تواند به پورتال خود دسترسی پیدا کند
            </p>
            <Button 
              onClick={() => window.location.href = '/representatives'}
            >
              <Users className="w-4 h-4 mr-2" />
              مدیریت لینک‌ها
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
