import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import React from "react";
import { 
  Shield, 
  User, 
  DollarSign, 
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  ChevronDown,
  ChevronUp,
  Server,
  Database,
  Cpu
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
    usageData?: any; // JSON usage data from uploaded file
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
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  const { data: portalData, isLoading, error } = useQuery<PublicPortalData>({
    queryKey: [`/api/portal/${publicId}`],
    enabled: !!publicId,
    retry: (failureCount, error: any) => {
      // Retry up to 3 times for network errors, but not for 404/403
      const status = error?.response?.status;
      if (status === 404 || status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (TanStack Query v5)
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

  const formatUsageData = (usageData: any) => {
    if (!usageData || typeof usageData !== 'object') return [];

    console.log('Raw usage data:', usageData);

    // Check if data is already an array of usage records
    if (Array.isArray(usageData)) {
      console.log('Data is array, length:', usageData.length);
      return usageData;
    }

    // Handle the specific format from our database: {admin_username: "...", records: [...]}
    if (usageData.records && Array.isArray(usageData.records)) {
      console.log('Found records array, length:', usageData.records.length);
      return usageData.records;
    }

    // If it's an object with admin_username property that contains the records
    if (usageData.admin_username && typeof usageData === 'object') {
      console.log('Single record with admin_username detected');
      // If it has records property, use that
      if (usageData.records && Array.isArray(usageData.records)) {
        return usageData.records;
      }
      // Otherwise treat the whole object as a single record
      return [usageData];
    }

    // Try to find array properties within the object
    const arrayProperties = Object.entries(usageData).find(([key, value]) => Array.isArray(value));
    if (arrayProperties && arrayProperties[1]) {
      console.log('Found array property:', arrayProperties[0]);
      return arrayProperties[1] as any[];
    }

    // Handle legacy format: object with multiple properties
    if (typeof usageData === 'object') {
      const records: any[] = [];
      Object.entries(usageData).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          records.push({
            admin_username: key,
            event_timestamp: (value as any).timestamp || (value as any).event_timestamp || '-',
            event_type: (value as any).type || (value as any).event_type || 'CREATE',
            description: (value as any).description || (value as any).desc || `${key}: ${JSON.stringify(value)}`,
            amount: (value as any).amount || (value as any).price || 0
          });
        } else if (key !== 'admin_username' && key !== 'records') {
          records.push({
            admin_username: usageData.admin_username || key,
            event_timestamp: '-',
            event_type: 'CREATE',
            description: String(value || ''),
            amount: typeof value === 'number' ? value : 0
          });
        }
      });
      console.log('Generated records from object properties:', records.length);
      return records;
    }

    console.log('No valid data format found');
    return [];
  };

  const renderUsageDetailsTable = (usageData: any) => {
    const formattedData = formatUsageData(usageData);
    
    console.log('Rendering table with data:', formattedData);
    
    if (!formattedData || !Array.isArray(formattedData) || formattedData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>هیچ اطلاعات ریز جزئیاتی برای نمایش وجود ندارد</p>
        </div>
      );
    }

    const config = portalData?.portalConfig;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-600">
          <thead className="bg-gray-600">
            <tr>
              {config?.showAdminUsername && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                  نام کاربری ادمین
                </th>
              )}
              {config?.showEventTimestamp && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                  زمان رویداد
                </th>
              )}
              {config?.showEventType && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                  نوع رویداد
                </th>
              )}
              {config?.showDescription && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                  توضیحات
                </th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-200 uppercase tracking-wider">
                مبلغ
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-700 divide-y divide-gray-600">
            {formattedData.map((record: any, index: number) => (
              <tr key={index} className="hover:bg-gray-600/50">
                {config?.showAdminUsername && (
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {record.admin_username || 'نامشخص'}
                  </td>
                )}
                {config?.showEventTimestamp && (
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                    {record.event_timestamp || record.timestamp || '-'}
                  </td>
                )}
                {config?.showEventType && (
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                    <Badge 
                      className={`${
                        record.event_type === 'CREATE' ? 'bg-green-600 hover:bg-green-700' :
                        record.event_type === 'RENEWAL' ? 'bg-blue-600 hover:bg-blue-700' :
                        record.event_type === 'EXPIRE' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-gray-600 hover:bg-gray-700'
                      } text-white`}
                    >
                      {record.event_type || record.type || 'نامشخص'}
                    </Badge>
                  </td>
                )}
                {config?.showDescription && (
                  <td className="px-4 py-4 text-sm text-gray-300 max-w-xs">
                    <div className="truncate" title={record.description || record.desc || ''}>
                      {record.description || record.desc || '-'}
                    </div>
                  </td>
                )}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-400">
                  {record.amount ? `${formatCurrency(record.amount.toString())} تومان` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bg-gray-600 px-4 py-2 text-sm text-gray-300">
          مجموع رکوردها: {toPersianDigits(formattedData.length.toString())} رکورد
        </div>
      </div>
    );
  };

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

  // Add custom CSS if provided
  const customStyles = portalData?.portalConfig?.customCss ? (
    <style dangerouslySetInnerHTML={{ __html: portalData.portalConfig.customCss }} />
  ) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {customStyles}
      {/* Header */}
      <div className="border-b border-gray-800 portal-header">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {portalData?.portalConfig?.title || 'پورتال مالی نماینده'}
                </h1>
                <div className="space-y-1">
                  <p className="text-gray-400">{portalData.name}</p>
                  {portalData?.portalConfig?.showOwnerName && portalData.shopOwnerName && (
                    <p className="text-sm text-gray-500">صاحب فروشگاه: {portalData.shopOwnerName}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    {portalData?.portalConfig?.description || 'مشاهده وضعیت مالی و فاکتورهای شما'}
                  </p>
                </div>
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
                        <React.Fragment key={index}>
                          <TableRow className="border-gray-700 hover:bg-gray-700/50">
                            <TableCell className="font-mono text-white">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                {invoice.invoiceNumber}
                                {invoice.usageData && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => toggleInvoiceExpansion(invoice.invoiceNumber)}
                                    className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                                  >
                                    {expandedInvoices.has(invoice.invoiceNumber) ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                )}
                              </div>
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
                          
                          {/* Usage Data Details Row */}
                          {expandedInvoices.has(invoice.invoiceNumber) && (
                            <TableRow className="border-gray-700 bg-gray-800/50">
                              <TableCell colSpan={5} className="p-0">
                                {/* Invoice Details Card - Mobile First Design */}
                                <div className="bg-gradient-to-br from-gray-800 to-gray-900 m-4 rounded-xl shadow-xl border border-gray-600">
                                  {/* Header Section */}
                                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-xl">
                                    <div className="flex items-center justify-between text-white">
                                      <div className="flex items-center space-x-3 space-x-reverse">
                                        <div className="bg-white/20 p-2 rounded-full">
                                          <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                          <h3 className="text-lg font-bold">جزئیات مصرف فاکتور</h3>
                                          <p className="text-blue-100 text-sm">فاکتور شماره {invoice.invoiceNumber}</p>
                                        </div>
                                      </div>
                                      <Badge className="bg-white/20 text-white border-white/30">
                                        INV-{invoice.invoiceNumber.slice(-4)}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Invoice Summary Cards */}
                                  <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-gray-700">
                                    <div className="bg-gray-700 rounded-lg p-4 text-center">
                                      <div className="text-2xl font-bold text-green-400 mb-1">
                                        {formatCurrency(invoice.amount)} تومان
                                      </div>
                                      <div className="text-sm text-gray-300">مجموع مبلغ</div>
                                    </div>
                                    
                                    <div className="bg-gray-700 rounded-lg p-4 text-center">
                                      <div className="text-2xl font-bold text-white mb-1">
                                        {toPersianDigits((formatUsageData(invoice.usageData) as any[]).length.toString())}
                                      </div>
                                      <div className="text-sm text-gray-300">تعداد رویدادها</div>
                                    </div>

                                    <div className="bg-gray-700 rounded-lg p-4 text-center">
                                      <div className="mb-1">
                                        {getInvoiceStatusBadge(invoice.status)}
                                      </div>
                                      <div className="text-sm text-gray-300">وضعیت فاکتور</div>
                                    </div>
                                  </div>

                                  {/* Usage Details Table */}
                                  <div className="p-6">
                                    <div className="flex items-center mb-4">
                                      <Database className="w-5 h-5 text-blue-400 ml-2" />
                                      <h4 className="text-lg font-semibold text-white">ریز جزئیات مصرف</h4>
                                    </div>
                                    
                                    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                                      {renderUsageDetailsTable(invoice.usageData)}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
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
