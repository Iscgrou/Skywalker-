import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import React from "react";
import { 
  Shield, 
  DollarSign, 
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Database,
  TrendingUp,
  Receipt,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PublicPortalData {
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

export default function PublicPortalNew() {
  const { publicId } = useParams<{ publicId: string }>();

  const { data: portalData, isLoading, error } = useQuery<PublicPortalData>({
    queryKey: [`/api/portal/${publicId}`],
    enabled: !!publicId,
    retry: 3,
    retryDelay: 1000,
  });

  console.log('=== PORTAL DEBUG ===');
  console.log('PublicId:', publicId);
  console.log('Portal Data:', portalData);
  console.log('Loading:', isLoading);
  console.log('Error:', error);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">در حال بارگذاری پورتال</h2>
          <p className="text-gray-400">لطفاً صبر کنید...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Portal Error:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">خطا در بارگذاری پورتال</h1>
          <p className="text-gray-300 mb-4">
            خطا در اتصال به سرور: {(error as any)?.message || 'خطای نامشخص'}
          </p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">داده‌ای یافت نشد</h1>
          <p className="text-gray-300 mb-4">هیچ داده‌ای برای این پورتال در دسترس نیست</p>
          <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700">
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  // Safe number formatting
  const formatNumber = (value: string | number): string => {
    const num = parseFloat(value?.toString() || '0');
    return num.toLocaleString('fa-IR');
  };

  // Calculate values
  const totalDebt = parseFloat(portalData.totalDebt || '0');
  const totalSales = parseFloat(portalData.totalSales || '0');
  const credit = parseFloat(portalData.credit || '0');
  const netBalance = credit - totalDebt;

  const invoicesArray = portalData.invoices || [];
  const paymentsArray = portalData.payments || [];
  
  const paidInvoices = invoicesArray.filter(inv => inv.status === 'paid').length;
  const unpaidInvoices = invoicesArray.filter(inv => inv.status !== 'paid').length;
  const totalPayments = paymentsArray.reduce((sum, payment) => sum + parseFloat(payment.amount || '0'), 0);

  console.log('=== CALCULATIONS ===');
  console.log('Total Debt:', totalDebt);
  console.log('Total Sales:', totalSales);
  console.log('Credit:', credit);
  console.log('Net Balance:', netBalance);
  console.log('Invoices:', invoicesArray.length);
  console.log('Payments:', paymentsArray.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-800 border-b border-blue-700 shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 space-x-reverse">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  پرتال عمومی نماینده
                </h1>
                <div className="mt-2 space-y-1">
                  <p className="text-blue-200 text-lg font-medium">{portalData.name}</p>
                  <p className="text-blue-300 text-sm">مشاهده وضعیت مالی و فاکتورهای شما</p>
                </div>
              </div>
            </div>
            <div className="text-left bg-blue-800/50 rounded-xl p-4 border border-blue-600">
              <p className="text-blue-300 text-sm font-medium">شناسه پنل</p>
              <p className="font-mono text-yellow-300 text-xl font-bold">{portalData.panelUsername}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-10">
          
          {/* SECTION 1: Financial Overview */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Wallet className="w-6 h-6 ml-3 text-emerald-400" />
              بخش اول: موجودی مالی و وضعیت حساب
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Debt */}
              <Card className="bg-gradient-to-br from-red-600 to-red-800 border-red-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">بدهی کل</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {formatNumber(totalDebt)} تومان
                      </p>
                      <p className="text-red-200 text-xs">Raw: {portalData.totalDebt}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-700 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Sales */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">فروش کل</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {formatNumber(totalSales)} تومان
                      </p>
                      <p className="text-blue-200 text-xs">Raw: {portalData.totalSales}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Credit */}
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">اعتبار</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {formatNumber(credit)} تومان
                      </p>
                      <p className="text-emerald-200 text-xs">Raw: {portalData.credit}</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Balance */}
              <Card className="bg-gradient-to-br from-purple-600 to-purple-800 border-purple-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">موجودی خالص</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {formatNumber(Math.abs(netBalance))} تومان
                      </p>
                      <p className="text-purple-200 text-xs">
                        {netBalance >= 0 ? 'بستانکار' : 'بدهکار'}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-700 rounded-full flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SECTION 2: Invoices */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <FileText className="w-6 h-6 ml-3 text-blue-400" />
              بخش دوم: فاکتورهای مرتب شده بر اساس تاریخ
            </h2>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">
                  لیست فاکتورها ({invoicesArray.length} فاکتور)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesArray.length > 0 ? (
                  <div className="space-y-4">
                    {invoicesArray.map((invoice, index) => (
                      <div key={index} className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">{invoice.invoiceNumber}</p>
                            <p className="text-slate-300 text-sm">تاریخ: {invoice.issueDate}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-emerald-400 font-bold text-lg">
                              {formatNumber(invoice.amount)} تومان
                            </p>
                            <Badge className={invoice.status === 'paid' ? 'bg-green-600' : 'bg-red-600'}>
                              {invoice.status === 'paid' ? 'پرداخت شده' : 'پرداخت نشده'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>فاکتوری یافت نشد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECTION 3: Usage Breakdown */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Database className="w-6 h-6 ml-3 text-orange-400" />
              بخش سوم: تجزیه مصرف دوره‌ای
            </h2>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">
                  آمار کلی مصرف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-700 rounded-lg text-center">
                    <p className="text-slate-300 text-sm">تعداد فاکتورها</p>
                    <p className="text-2xl font-bold text-white">{invoicesArray.length}</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-lg text-center">
                    <p className="text-slate-300 text-sm">پرداخت شده</p>
                    <p className="text-2xl font-bold text-green-400">{paidInvoices}</p>
                  </div>
                  <div className="p-4 bg-slate-700 rounded-lg text-center">
                    <p className="text-slate-300 text-sm">پرداخت نشده</p>
                    <p className="text-2xl font-bold text-red-400">{unpaidInvoices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SECTION 4: Payments */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <CreditCard className="w-6 h-6 ml-3 text-green-400" />
              بخش چهارم: تاریخچه پرداخت‌ها
            </h2>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white">
                  سوابق پرداخت ({paymentsArray.length} پرداخت)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsArray.length > 0 ? (
                  <div className="space-y-4">
                    {paymentsArray.map((payment, index) => (
                      <div key={index} className="p-4 bg-emerald-800 rounded-lg border border-emerald-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">
                              {formatNumber(payment.amount)} تومان
                            </p>
                            <p className="text-emerald-200 text-sm">تاریخ: {payment.paymentDate}</p>
                            {payment.description && (
                              <p className="text-emerald-300 text-xs">{payment.description}</p>
                            )}
                          </div>
                          <Badge className="bg-emerald-500 text-white">
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
                    <p>پرداختی یافت نشد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Debug Info */}
          <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
            <h3 className="text-white font-semibold mb-2">اطلاعات Debug</h3>
            <pre className="text-xs text-slate-300 overflow-auto">
              {JSON.stringify({
                totalDebt: portalData.totalDebt,
                totalSales: portalData.totalSales,
                credit: portalData.credit,
                invoicesCount: invoicesArray.length,
                paymentsCount: paymentsArray.length,
              }, null, 2)}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}