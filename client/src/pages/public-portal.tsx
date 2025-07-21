import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Shield, 
  User, 
  DollarSign, 
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicPortalData {
  name: string;
  code: string;
  panelUsername: string;
  totalDebt: string;
  totalSales: string;
  credit: string;
  invoices: Array<{
    invoiceNumber: string;
    amount: string;
    issueDate: string;
    dueDate: string;
    status: string;
  }>;
  payments: Array<{
    amount: string;
    paymentDate: string;
    description: string;
  }>;
}

export default function PublicPortal() {
  const { publicId } = useParams<{ publicId: string }>();

  const { data: portalData, isLoading, error } = useQuery<PublicPortalData>({
    queryKey: [`/api/portal/${publicId}`],
    enabled: !!publicId,
    retry: false
  });

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-green-600 text-white hover:bg-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            پرداخت شده
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-600 text-white hover:bg-red-700">
            <AlertTriangle className="w-3 h-3 mr-1" />
            سررسید گذشته
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-600 text-white hover:bg-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            پرداخت نشده
          </Badge>
        );
    }
  };

  const getAccountStatus = () => {
    if (!portalData) return { text: "نامشخص", color: "text-gray-400" };
    
    const debt = parseFloat(portalData.totalDebt);
    if (debt > 100000) {
      return { text: "بدهکار", color: "text-red-400" };
    } else if (debt > 0) {
      return { text: "نیاز به پرداخت", color: "text-yellow-400" };
    } else {
      return { text: "تسویه", color: "text-green-400" };
    }
  };

  const getLastPayment = () => {
    if (!portalData?.payments || portalData.payments.length === 0) {
      return { amount: "0", date: "---" };
    }
    
    const lastPayment = portalData.payments[0]; // Assuming sorted by date
    return {
      amount: lastPayment.amount,
      date: lastPayment.paymentDate
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Skeleton className="h-16 w-full bg-gray-800" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 bg-gray-800" />
              ))}
            </div>
            <Skeleton className="h-64 w-full bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">پورتال یافت نشد</h1>
          <p className="text-gray-400">
            لینک پورتال نامعتبر است یا دسترسی شما محدود شده است
          </p>
        </div>
      </div>
    );
  }

  const accountStatus = getAccountStatus();
  const lastPayment = getLastPayment();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">پورتال مالی نماینده</h1>
                <p className="text-gray-400">{portalData.name}</p>
              </div>
            </div>
            <div className="text-left ltr">
              <p className="text-sm text-gray-400">شناسه پنل</p>
              <p className="font-mono text-yellow-400 text-lg">
                {portalData.panelUsername}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Debt Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">بدهی کل</p>
                    <p className="text-3xl font-bold text-red-400 mt-2">
                      {formatCurrency(portalData.totalDebt)}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">تومان</p>
                  </div>
                  <div className="w-12 h-12 bg-red-900 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-red-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Last Payment Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">آخرین پرداخت</p>
                    <p className="text-3xl font-bold text-green-400 mt-2">
                      {formatCurrency(lastPayment.amount)}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {lastPayment.date}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-900 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Account Status Card */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">وضعیت حساب</p>
                    <p className={`text-2xl font-bold mt-2 ${accountStatus.color}`}>
                      {accountStatus.text}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      {parseFloat(portalData.totalDebt) > 0 ? "نیاز به پرداخت" : "تسویه شده"}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-900 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">خلاصه مالی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">آمار کلی</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">کل فروش:</span>
                      <span className="font-semibold text-white">
                        {formatCurrency(portalData.totalSales)} تومان
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">مانده بدهی:</span>
                      <span className="font-semibold text-red-400">
                        {formatCurrency(portalData.totalDebt)} تومان
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">اعتبار:</span>
                      <span className="font-semibold text-green-400">
                        {formatCurrency(portalData.credit)} تومان
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">آمار فاکتورها</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">کل فاکتورها:</span>
                      <span className="font-semibold text-white">
                        {toPersianDigits(portalData.invoices.length.toString())}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">پرداخت شده:</span>
                      <span className="font-semibold text-green-400">
                        {toPersianDigits(
                          portalData.invoices.filter(inv => inv.status === 'paid').length.toString()
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">در انتظار:</span>
                      <span className="font-semibold text-yellow-400">
                        {toPersianDigits(
                          portalData.invoices.filter(inv => inv.status === 'unpaid').length.toString()
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <FileText className="w-5 h-5 ml-2" />
                فاکتورهای اخیر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">شماره فاکتور</TableHead>
                      <TableHead className="text-gray-300">مبلغ</TableHead>
                      <TableHead className="text-gray-300">تاریخ صدور</TableHead>
                      <TableHead className="text-gray-300">سررسید</TableHead>
                      <TableHead className="text-gray-300">وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portalData.invoices.length > 0 ? (
                      portalData.invoices.slice(0, 10).map((invoice, index) => (
                        <TableRow key={index} className="border-gray-700 hover:bg-gray-700/50">
                          <TableCell className="font-mono text-white">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="font-semibold text-white">
                            {formatCurrency(invoice.amount)} تومان
                          </TableCell>
                          <TableCell className="text-gray-300">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 ml-1 text-gray-400" />
                              {invoice.issueDate}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {invoice.dueDate || "-"}
                          </TableCell>
                          <TableCell>
                            {getInvoiceStatusBadge(invoice.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow className="border-gray-700">
                        <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                          فاکتوری یافت نشد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {portalData.invoices.length > 10 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">
                    و {toPersianDigits((portalData.invoices.length - 10).toString())} فاکتور دیگر...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          {portalData.payments.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="w-5 h-5 ml-2" />
                  پرداخت‌های اخیر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {portalData.payments.slice(0, 5).map((payment, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className="w-10 h-10 bg-green-900 rounded-full flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            پرداخت {formatCurrency(payment.amount)} تومان
                          </p>
                          <p className="text-sm text-gray-400">
                            {payment.paymentDate}
                          </p>
                          {payment.description && (
                            <p className="text-xs text-gray-500">
                              {payment.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        تأیید شده
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center py-6 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              تولید شده توسط سیستم مدیریت مالی MarFaNet 🤖
            </p>
            <p className="text-gray-600 text-xs mt-1">
              این پورتال به‌روزرسانی خودکار می‌شود
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
