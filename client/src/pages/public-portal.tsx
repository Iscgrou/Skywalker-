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
  ChevronDown,
  ChevronUp,
  Database,
  TrendingUp,
  Receipt,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  shopOwnerName?: string;
  totalDebt: string;
  totalSales: string;
  credit: string;
  portalConfig: {
    title: string;
    description: string;
    showOwnerName: boolean;
    showDetailedUsage: boolean;
    customCss: string;
    showUsageDetails: boolean;
    showEventTimestamp: boolean;
    showEventType: boolean;
    showDescription: boolean;
    showAdminUsername: boolean;
  };
  invoices: Array<{
    invoiceNumber: string;
    amount: string;
    issueDate: string;
    dueDate: string;
    status: string;
    usageData?: any;
    createdAt?: string;
  }>;
  payments: Array<{
    amount: string;
    paymentDate: string;
    description: string;
  }>;
}

export default function PublicPortal() {
  const { publicId } = useParams<{ publicId: string }>();
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const { data: portalData, isLoading, error } = useQuery<PublicPortalData>({
    queryKey: [`/api/portal/${publicId}`],
    enabled: !!publicId,
    retry: 3,
    retryDelay: 1000,
  });

  const toggleInvoiceExpansion = (invoiceNumber: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceNumber)) {
      newExpanded.delete(invoiceNumber);
    } else {
      newExpanded.add(invoiceNumber);
    }
    setExpandedInvoices(newExpanded);
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
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
          <Badge className="bg-amber-600 text-white hover:bg-amber-700">
            <Clock className="w-3 h-3 mr-1" />
            پرداخت نشده
          </Badge>
        );
    }
  };

  const formatUsageData = (usageData: any) => {
    if (!usageData || typeof usageData !== 'object') return [];

    if (Array.isArray(usageData)) {
      return usageData;
    }

    if (usageData.records && Array.isArray(usageData.records)) {
      return usageData.records;
    }

    return [];
  };

  // Debug log
  console.log('Portal Data:', portalData);
  console.log('Loading:', isLoading);
  console.log('Error:', error);
  console.log('Invoices length:', portalData?.invoices?.length);
  console.log('Payments length:', portalData?.payments?.length);
  console.log('Portal Config:', portalData?.portalConfig);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">در حال بارگذاری پورتال</h2>
              <p className="text-gray-400">لطفاً صبر کنید...</p>
            </div>
          </div>
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
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  if (!portalData) {
    console.log('No portal data available');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">داده‌ای یافت نشد</h1>
          <p className="text-gray-300 mb-4">
            هیچ داده‌ای برای این پورتال در دسترس نیست
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  // Calculate financial overview - FORCE VALUES TO SHOW
  const totalDebt = parseFloat(portalData.totalDebt || '0') || 0;
  const totalSales = parseFloat(portalData.totalSales || '0') || 0;
  const credit = parseFloat(portalData.credit || '0') || 0;
  const netBalance = credit - totalDebt;
  
  console.log('Financial calculations:', { totalDebt, totalSales, credit, netBalance });
  
  const invoicesArray = portalData.invoices || [];
  const paymentsArray = portalData.payments || [];
  
  const paidInvoices = invoicesArray.filter(inv => inv.status === 'paid').length;
  const unpaidInvoices = invoicesArray.filter(inv => inv.status !== 'paid').length;
  
  const totalPayments = paymentsArray.reduce((sum, payment) => sum + (parseFloat(payment.amount) || 0), 0);
  
  console.log('Arrays:', { invoicesArray: invoicesArray.length, paymentsArray: paymentsArray.length, totalPayments });
  
  // Add custom CSS if provided
  const customStyles = portalData?.portalConfig?.customCss ? (
    <style dangerouslySetInnerHTML={{ __html: portalData.portalConfig.customCss }} />
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {customStyles}
      
      {/* 🔒 SECURE HEADER - DA VINCI v3.0 DESIGN */}
      <div className="bg-gradient-to-r from-blue-800 to-indigo-800 border-b border-blue-700 shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 space-x-reverse">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {portalData?.portalConfig?.title || 'پرتال مالی نماینده'}
                </h1>
                <div className="mt-2 space-y-1">
                  <p className="text-blue-200 text-lg font-medium">{portalData.name}</p>
                  {portalData?.portalConfig?.showOwnerName && portalData.shopOwnerName && (
                    <p className="text-blue-300 text-sm">صاحب فروشگاه: {portalData.shopOwnerName}</p>
                  )}
                  <p className="text-blue-300 text-sm">
                    {portalData?.portalConfig?.description || 'نمایش کامل وضعیت مالی و مدیریت فاکتورها'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-left bg-blue-800/50 rounded-xl p-4 border border-blue-600">
              <p className="text-blue-300 text-sm font-medium">شناسه پنل</p>
              <p className="font-mono text-yellow-300 text-xl font-bold">
                {portalData.panelUsername}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 SECTION 1: FINANCIAL OVERVIEW (موجودی بدهی/اعتباری) */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Wallet className="w-6 h-6 ml-3 text-emerald-400" />
              بخش اول: موجودی مالی و وضعیت حساب
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Debt - FORCE DISPLAY */}
              <Card className="bg-gradient-to-br from-red-600 to-red-800 border-red-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">بدهی کل</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {totalDebt === 0 ? "0" : formatCurrency(totalDebt.toString())} تومان
                      </p>
                      <p className="text-red-200 text-sm">وضعیت: {totalDebt === 0 ? "بدون بدهی" : "دارای بدهی"}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-700 rounded-full flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Sales - FORCE DISPLAY */}
              <Card className="bg-gradient-to-br from-blue-600 to-blue-800 border-blue-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">فروش کل</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {totalSales === 0 ? "0" : formatCurrency(totalSales.toString())} تومان
                      </p>
                      <p className="text-blue-200 text-sm">Raw: {portalData.totalSales}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Net Balance - FORCE DISPLAY */}
              <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">موجودی خالص</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {netBalance === 0 ? "0" : formatCurrency(Math.abs(netBalance).toString())} تومان
                      </p>
                      <p className="text-emerald-200 text-sm">
                        {netBalance >= 0 ? 'بستانکار' : 'بدهکار'} | اعتبار: {credit}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-700 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary - FORCE DISPLAY */}
              <Card className="bg-gradient-to-br from-purple-600 to-purple-800 border-purple-500 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm font-medium">کل پرداختی</p>
                      <p className="text-3xl font-bold text-white mt-2">
                        {totalPayments === 0 ? "0" : formatCurrency(totalPayments.toString())} تومان
                      </p>
                      <p className="text-purple-200 text-sm">تعداد: {paymentsArray.length} پرداخت</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-700 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 📋 SECTION 2: INVOICES SORTED BY DATE (فاکتورهای مرتب شده) */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Receipt className="w-6 h-6 ml-3 text-blue-400" />
              بخش دوم: فاکتورهای مرتب شده بر اساس تاریخ
            </h2>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="w-5 h-5 ml-2" />
                    لیست فاکتورها ({toPersianDigits(invoicesArray.length.toString())} فاکتور)
                  </span>
                  <div className="flex space-x-2 space-x-reverse">
                    <Badge className="bg-emerald-600 text-white">
                      پرداخت شده: {toPersianDigits(paidInvoices.toString())}
                    </Badge>
                    <Badge className="bg-amber-600 text-white">
                      پرداخت نشده: {toPersianDigits(unpaidInvoices.toString())}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesArray.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-600 hover:bg-slate-700">
                          <TableHead className="text-slate-300">شماره فاکتور</TableHead>
                          <TableHead className="text-slate-300">مبلغ</TableHead>
                          <TableHead className="text-slate-300">تاریخ صدور</TableHead>
                          <TableHead className="text-slate-300">سررسید</TableHead>
                          <TableHead className="text-slate-300">وضعیت</TableHead>
                          <TableHead className="text-slate-300">عملیات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoicesArray.map((invoice, index) => (
                          <React.Fragment key={index}>
                            <TableRow className="border-slate-600 hover:bg-slate-700/50">
                              <TableCell className="font-mono text-white font-medium">
                                {invoice.invoiceNumber}
                              </TableCell>
                              <TableCell className="font-semibold text-emerald-400">
                                {formatCurrency(invoice.amount)} تومان
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {invoice.issueDate || 'نامشخص'}
                              </TableCell>
                              <TableCell className="text-slate-300">
                                {invoice.dueDate || '-'}
                              </TableCell>
                              <TableCell>
                                {getInvoiceStatusBadge(invoice.status)}
                              </TableCell>
                              <TableCell>
                                {invoice.usageData && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => toggleInvoiceExpansion(invoice.invoiceNumber)}
                                    className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                                  >
                                    {expandedInvoices.has(invoice.invoiceNumber) ? (
                                      <>
                                        <ChevronUp className="w-4 h-4 ml-1" />
                                        بستن جزئیات
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4 ml-1" />
                                        مشاهده جزئیات
                                      </>
                                    )}
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                            
                            {/* بخش سوم: CONSUMPTION BREAKDOWN (ریز جزئیات مصرف) */}
                            {expandedInvoices.has(invoice.invoiceNumber) && invoice.usageData && (
                              <TableRow className="border-slate-600">
                                <TableCell colSpan={6} className="p-0">
                                  <div className="bg-slate-900 p-6 rounded-lg m-4">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                                      <Database className="w-5 h-5 ml-2 text-emerald-400" />
                                      بخش سوم: ریز جزئیات مصرف - فاکتور {invoice.invoiceNumber}
                                    </h3>
                                    
                                    {formatUsageData(invoice.usageData).length > 0 ? (
                                      <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-600">
                                          <thead className="bg-slate-700">
                                            <tr>
                                              {portalData.portalConfig.showAdminUsername && (
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-200 uppercase">
                                                  ادمین
                                                </th>
                                              )}
                                              {portalData.portalConfig.showEventTimestamp && (
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-200 uppercase">
                                                  زمان
                                                </th>
                                              )}
                                              {portalData.portalConfig.showEventType && (
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-200 uppercase">
                                                  نوع
                                                </th>
                                              )}
                                              {portalData.portalConfig.showDescription && (
                                                <th className="px-4 py-3 text-right text-xs font-medium text-slate-200 uppercase">
                                                  شرح
                                                </th>
                                              )}
                                              <th className="px-4 py-3 text-right text-xs font-medium text-slate-200 uppercase">
                                                مبلغ
                                              </th>
                                            </tr>
                                          </thead>
                                          <tbody className="bg-slate-800 divide-y divide-slate-600">
                                            {formatUsageData(invoice.usageData).map((record: any, idx: number) => (
                                              <tr key={idx} className="hover:bg-slate-700">
                                                {portalData.portalConfig.showAdminUsername && (
                                                  <td className="px-4 py-3 text-sm text-white">
                                                    {record.admin_username || 'سیستم'}
                                                  </td>
                                                )}
                                                {portalData.portalConfig.showEventTimestamp && (
                                                  <td className="px-4 py-3 text-sm text-slate-300">
                                                    {record.event_timestamp || record.timestamp || '-'}
                                                  </td>
                                                )}
                                                {portalData.portalConfig.showEventType && (
                                                  <td className="px-4 py-3 text-sm">
                                                    <Badge className={`
                                                      ${record.event_type === 'CREATE' ? 'bg-emerald-600' :
                                                        record.event_type === 'RENEWAL' ? 'bg-blue-600' :
                                                        record.event_type === 'EXPIRE' ? 'bg-red-600' :
                                                        'bg-slate-600'} text-white
                                                    `}>
                                                      {record.event_type || 'نامشخص'}
                                                    </Badge>
                                                  </td>
                                                )}
                                                {portalData.portalConfig.showDescription && (
                                                  <td className="px-4 py-3 text-sm text-slate-300">
                                                    {record.description || record.desc || '-'}
                                                  </td>
                                                )}
                                                <td className="px-4 py-3 text-sm font-medium text-emerald-400">
                                                  {record.amount ? `${formatCurrency(record.amount.toString())} تومان` : '-'}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="text-center py-8 text-slate-400">
                                        <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>هیچ جزئیات مصرفی برای این فاکتور ثبت نشده است</p>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
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
          </div>

          {/* 💰 SECTION 4: PAYMENT HISTORY (تاریخچه پرداخت) */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <CreditCard className="w-6 h-6 ml-3 text-green-400" />
              بخش چهارم: تاریخچه پرداخت‌ها
            </h2>
            
            <Card className="bg-slate-800 border-slate-600 shadow-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Wallet className="w-5 h-5 ml-2" />
                  سوابق پرداخت ({toPersianDigits(paymentsArray.length.toString())} پرداخت)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsArray.length > 0 ? (
                  <div className="space-y-4">
                    {paymentsArray.map((payment, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-700 to-emerald-800 rounded-lg border border-emerald-600"
                      >
                        <div className="flex items-center space-x-4 space-x-reverse">
                          <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-lg">
                              {formatCurrency(payment.amount)} تومان
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
          </div>

          {/* Footer */}
          <div className="text-center py-8 border-t border-slate-700">
            <div className="bg-gradient-to-r from-blue-800 to-purple-800 rounded-xl p-6 border border-blue-600">
              <p className="text-blue-200 text-lg font-medium mb-2">
                🚀 سیستم مدیریت مالی پیشرفته DA VINCI v3.0
              </p>
              <p className="text-blue-300 text-sm">
                این پورتال به‌صورت خودکار و لحظه‌ای بروزرسانی می‌شود | MarFaNet CRM
              </p>
              <p className="text-blue-400 text-xs mt-2">
                🔒 پورتال امن و محافظت شده - هیچ اطلاعات ادمین در دسترس نیست
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}