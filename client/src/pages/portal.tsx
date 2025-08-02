import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { 
  Shield, 
  DollarSign, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Database,
  TrendingUp,
  Wallet,
  Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Define interface for API response
interface PortalResponse {
  name: string;
  code: string;
  panelUsername: string;
  shopOwnerName?: string;
  totalDebt: string;
  totalSales: string;
  credit: string;
  invoices: Array<{
    invoiceNumber: string;
    amount: string;
    issueDate: string;
    dueDate: string;
    status: string;
    usageData?: any;
  }>;
  payments: Array<{
    amount: string;
    paymentDate: string;
    description: string;
  }>;
}

export default function Portal() {
  const { publicId } = useParams<{ publicId: string }>();

  // Fetch portal data
  const { data, isLoading, error } = useQuery<PortalResponse>({
    queryKey: [`/api/portal/${publicId}`],
    enabled: !!publicId,
    retry: 2,
    retryDelay: 500,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">در حال بارگذاری</h2>
          <p className="text-gray-400">لطفاً صبر کنید...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">خطا در بارگذاری</h1>
          <p className="text-gray-300 mb-6">امکان دسترسی به اطلاعات پورتال وجود ندارد</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  // Helper functions
  const formatNumber = (num: string | number): string => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value)) return '0';
    return value.toLocaleString('fa-IR');
  };

  const toPersianDigits = (str: string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w)]);
  };

  // Calculate financial metrics
  const totalDebt = parseFloat(data.totalDebt || '0');
  const totalSales = parseFloat(data.totalSales || '0');
  const credit = parseFloat(data.credit || '0');
  const netBalance = credit - totalDebt;
  
  const invoices = data.invoices || [];
  const payments = data.payments || [];
  
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid').length;
  const totalPayments = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || '0'), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-800 border-b border-blue-700 shadow-2xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  پرتال عمومی نماینده
                </h1>
                <div className="mt-2 space-y-1">
                  <p className="text-blue-200 text-lg font-medium">{data.name}</p>
                  <p className="text-blue-300 text-sm">مشاهده وضعیت مالی و فاکتورهای شما</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-800/50 rounded-xl p-4 border border-blue-600">
              <p className="text-blue-300 text-sm font-medium">شناسه پنل</p>
              <p className="font-mono text-yellow-300 text-xl font-bold">{data.panelUsername}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Section 1: Financial Overview */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">۱</span>
              </div>
              <h2 className="text-2xl font-bold text-white">موجودی مالی و وضعیت حساب</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Total Debt Card */}
              <Card className="bg-gradient-to-br from-red-600 to-red-800 border-red-500 shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-red-100 text-sm font-medium mb-2">بدهی کل</p>
                      <p className="text-2xl font-bold text-white mb-1">
                        {toPersianDigits(formatNumber(totalDebt))} تومان
                      </p>
                      <p className="text-red-200 text-xs">
                        {totalDebt === 0 ? 'بدون بدهی' : 'دارای بدهی'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-red-700 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Sales Card */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500 shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-blue-100 text-sm font-medium mb-2">فروش کل</p>
                      <p className="text-2xl font-bold text-white mb-1">
                        {toPersianDigits(formatNumber(totalSales))} تومان
                      </p>
                      <p className="text-blue-200 text-xs">
                        مجموع فروش
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Card */}
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-500 shadow-xl hover:shadow-2xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-emerald-100 text-sm font-medium mb-2">اعتبار</p>
                      <p className="text-2xl font-bold text-white mb-1">
                        {toPersianDigits(formatNumber(credit))} تومان
                      </p>
                      <p className="text-emerald-200 text-xs">
                        اعتبار موجود
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Balance Card */}
              <Card className={`${netBalance >= 0 ? 'bg-gradient-to-br from-purple-600 to-purple-800 border-purple-500' : 'bg-gradient-to-br from-orange-600 to-orange-800 border-orange-500'} shadow-xl hover:shadow-2xl transition-shadow`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`${netBalance >= 0 ? 'text-purple-100' : 'text-orange-100'} text-sm font-medium mb-2`}>موجودی خالص</p>
                      <p className="text-2xl font-bold text-white mb-1">
                        {toPersianDigits(formatNumber(Math.abs(netBalance)))} تومان
                      </p>
                      <p className={`${netBalance >= 0 ? 'text-purple-200' : 'text-orange-200'} text-xs`}>
                        {netBalance >= 0 ? 'بستانکار' : 'بدهکار'}
                      </p>
                    </div>
                    <div className={`w-12 h-12 ${netBalance >= 0 ? 'bg-purple-700' : 'bg-orange-700'} rounded-full flex items-center justify-center`}>
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Section 2: Invoices */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">۲</span>
              </div>
              <h2 className="text-2xl font-bold text-white">فاکتورهای مرتب شده بر اساس تاریخ</h2>
            </div>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    لیست فاکتورها ({toPersianDigits(invoices.length.toString())} فاکتور)
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className="bg-emerald-600 text-white">
                      پرداخت شده: {toPersianDigits(paidInvoices.toString())}
                    </Badge>
                    <Badge className="bg-red-600 text-white">
                      پرداخت نشده: {toPersianDigits(unpaidInvoices.toString())}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {invoices.length > 0 ? (
                  <div className="space-y-4">
                    {invoices.map((invoice, index) => (
                      <div key={index} className="p-4 bg-slate-700 rounded-lg border border-slate-600 hover:bg-slate-650 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-white font-semibold text-lg">{invoice.invoiceNumber}</p>
                              <Badge className={invoice.status === 'paid' ? 'bg-emerald-600 text-white' : invoice.status === 'overdue' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}>
                                {invoice.status === 'paid' ? (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    پرداخت شده
                                  </>
                                ) : invoice.status === 'overdue' ? (
                                  <>
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    سررسید گذشته
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 mr-1" />
                                    پرداخت نشده
                                  </>
                                )}
                              </Badge>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-slate-300">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>تاریخ صدور: {invoice.issueDate || 'نامشخص'}</span>
                              </div>
                              {invoice.dueDate && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>سررسید: {invoice.dueDate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-2xl font-bold text-emerald-400">
                              {toPersianDigits(formatNumber(invoice.amount))} تومان
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">فاکتوری یافت نشد</h3>
                    <p>هنوز هیچ فاکتوری برای این نماینده صادر نشده است</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Section 3: Usage Breakdown */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">۳</span>
              </div>
              <h2 className="text-2xl font-bold text-white">تجزیه مصرف دوره‌ای</h2>
            </div>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  آمار کلی مصرف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-700 rounded-lg text-center border border-slate-600">
                    <Database className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm mb-2">تعداد فاکتورها</p>
                    <p className="text-3xl font-bold text-white">{toPersianDigits(invoices.length.toString())}</p>
                  </div>
                  <div className="p-6 bg-slate-700 rounded-lg text-center border border-slate-600">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm mb-2">پرداخت شده</p>
                    <p className="text-3xl font-bold text-emerald-400">{toPersianDigits(paidInvoices.toString())}</p>
                  </div>
                  <div className="p-6 bg-slate-700 rounded-lg text-center border border-slate-600">
                    <Clock className="w-8 h-8 text-red-400 mx-auto mb-3" />
                    <p className="text-slate-300 text-sm mb-2">پرداخت نشده</p>
                    <p className="text-3xl font-bold text-red-400">{toPersianDigits(unpaidInvoices.toString())}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section 4: Payment History */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">۴</span>
              </div>
              <h2 className="text-2xl font-bold text-white">تاریخچه پرداخت‌ها</h2>
            </div>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  سوابق پرداخت ({toPersianDigits(payments.length.toString())} پرداخت)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payments.length > 0 ? (
                  <div className="space-y-4">
                    {payments.map((payment, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-emerald-700 to-emerald-800 rounded-lg border border-emerald-600">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-white font-bold text-lg">
                                {toPersianDigits(formatNumber(payment.amount))} تومان
                              </p>
                              <p className="text-emerald-200 text-sm">
                                تاریخ: {payment.paymentDate}
                              </p>
                              {payment.description && (
                                <p className="text-emerald-300 text-xs mt-1">
                                  {payment.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge className="bg-emerald-500 text-white border-emerald-400">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            تأیید شده
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">پرداختی یافت نشد</h3>
                    <p>هنوز هیچ پرداختی از این نماینده دریافت نشده است</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}