import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowRight, 
  Copy, 
  CreditCard, 
  FileText, 
  Phone, 
  User, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Plus,
  Share2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits, getCurrentPersianDate } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface Representative {
  id: number;
  code: string;
  name: string;
  ownerName: string | null;
  panelUsername: string;
  phone: string | null;
  publicId: string;
  isActive: boolean;
  totalDebt: string;
  totalSales: string;
  credit: string;
  createdAt: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  sentToTelegram: boolean;
}

interface Payment {
  id: number;
  amount: string;
  paymentDate: string;
  description: string | null;
  isAllocated: boolean;
}

interface RepresentativeDetails {
  representative: Representative;
  invoices: Invoice[];
  payments: Payment[];
}

const paymentSchema = z.object({
  representativeId: z.number(),
  amount: z.string().min(1, "مبلغ الزامی است"),
  paymentDate: z.string().min(1, "تاریخ پرداخت الزامی است"),
  description: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function RepresentativeDetails() {
  const { code } = useParams<{ code: string }>();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: repData, isLoading } = useQuery<RepresentativeDetails>({
    queryKey: [`/api/representatives/${code}`],
    enabled: !!code
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentDate: getCurrentPersianDate(),
      description: "",
    }
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiRequest('POST', '/api/payments', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "پرداخت ثبت شد",
        description: "پرداخت با موفقیت در سیستم ثبت شد",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/representatives/${code}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsPaymentDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ثبت پرداخت",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmitPayment = (data: PaymentFormData) => {
    if (!repData?.representative) return;
    
    const paymentData = {
      ...data,
      representativeId: repData.representative.id,
    };
    
    paymentMutation.mutate(paymentData);
  };

  const handleCopyPortalLink = () => {
    if (!repData?.representative) return;
    
    const portalLink = `https://agent-portal-shield-info9071.replit.app/portal/${repData.representative.publicId}`;
    navigator.clipboard.writeText(portalLink);
    toast({
      title: "لینک کپی شد",
      description: "لینک پورتال نماینده در کلیپبورد کپی شد",
    });
  };

  const getInvoiceStatusBadge = (status: string) => {
    const statusMap = {
      'unpaid': { variant: 'destructive', label: 'پرداخت نشده' },
      'paid': { variant: 'default', label: 'پرداخت شده' },
      'overdue': { variant: 'destructive', label: 'سررسید گذشته' },
      'partial': { variant: 'secondary', label: 'پرداخت جزئی' },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || 
                  { variant: 'secondary', label: 'نامشخص' };
    
    return (
      <Badge variant={config.variant as any}>
        {config.label}
      </Badge>
    );
  };

  const calculateStats = () => {
    if (!repData) return { paidInvoices: 0, totalInvoices: 0, avgPaymentDays: 0 };
    
    const paidInvoices = repData.invoices.filter(inv => inv.status === 'paid').length;
    const totalInvoices = repData.invoices.length;
    
    // Simple calculation for average payment days
    const avgPaymentDays = 12; // This would need proper calculation in real implementation
    
    return { paidInvoices, totalInvoices, avgPaymentDays };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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

  if (!repData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">نماینده یافت نشد</p>
        <Link href="/representatives">
          <Button className="mt-4">
            <ArrowRight className="w-4 h-4 mr-2" />
            بازگشت به لیست نمایندگان
          </Button>
        </Link>
      </div>
    );
  }

  const { representative, invoices, payments } = repData;
  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 space-x-reverse">
          <Link href="/representatives">
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {representative.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              کد نماینده: {representative.code} | پنل: {representative.panelUsername}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <Button
            variant="outline"
            onClick={handleCopyPortalLink}
          >
            <Share2 className="w-4 h-4 mr-2" />
            اشتراک لینک پورتال
          </Button>
          
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => form.setValue('representativeId', representative.id)}>
                <Plus className="w-4 h-4 mr-2" />
                ثبت پرداخت جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="rtl max-w-md">
              <DialogHeader>
                <DialogTitle>ثبت پرداخت جدید</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitPayment)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>مبلغ پرداخت (تومان)</FormLabel>
                        <FormControl>
                          <Input placeholder="1000000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاریخ پرداخت</FormLabel>
                        <FormControl>
                          <Input placeholder="1404/5/15" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>توضیحات (اختیاری)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="توضیحات پرداخت..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsPaymentDialogOpen(false)}
                    >
                      انصراف
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={paymentMutation.isPending}
                    >
                      {paymentMutation.isPending ? "در حال ذخیره..." : "ثبت پرداخت"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Main Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {representative.name}
                </h3>
                {representative.ownerName && (
                  <p className="text-gray-600 dark:text-gray-400">
                    صاحب فروشگاه: {representative.ownerName}
                  </p>
                )}
                {representative.phone && (
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mt-1">
                    <Phone className="w-4 h-4 ml-1" />
                    {representative.phone}
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-left">
              <div className={`text-2xl font-bold ${
                parseFloat(representative.totalDebt) > 0 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {formatCurrency(representative.totalDebt)} تومان
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">مانده حساب جاری</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">بدهی کل</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {formatCurrency(representative.totalDebt)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تومان</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">فروش کل</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {formatCurrency(representative.totalSales)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تومان</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">فاکتورهای پرداخت شده</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {toPersianDigits(stats.paidInvoices.toString())} / {toPersianDigits(stats.totalInvoices.toString())}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">فاکتور</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">اعتبار</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {formatCurrency(representative.credit)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تومان</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="invoices">فاکتورها</TabsTrigger>
          <TabsTrigger value="payments">پرداخت‌ها</TabsTrigger>
          <TabsTrigger value="ledger">دفتر حساب</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>آخرین فاکتورها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {invoice.issueDate}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(invoice.amount)} ت
                        </p>
                        {getInvoiceStatusBadge(invoice.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader>
                <CardTitle>آخرین پرداخت‌ها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          پرداخت نقدی
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.paymentDate}
                        </p>
                        {payment.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {payment.description}
                          </p>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-green-600 dark:text-green-400">
                          +{formatCurrency(payment.amount)} ت
                        </p>
                        <Badge variant={payment.isAllocated ? "default" : "secondary"}>
                          {payment.isAllocated ? "تخصیص یافته" : "تخصیص نیافته"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>
                فاکتورها ({toPersianDigits(invoices.length.toString())})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>شماره فاکتور</TableHead>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>تاریخ صدور</TableHead>
                    <TableHead>سررسید</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>تلگرام</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(invoice.amount)} تومان
                      </TableCell>
                      <TableCell>
                        {invoice.issueDate}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate || "-"}
                      </TableCell>
                      <TableCell>
                        {getInvoiceStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoice.sentToTelegram ? "default" : "secondary"}>
                          {invoice.sentToTelegram ? "ارسال شده" : "ارسال نشده"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>
                پرداخت‌ها ({toPersianDigits(payments.length.toString())})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>مبلغ</TableHead>
                    <TableHead>تاریخ پرداخت</TableHead>
                    <TableHead>توضیحات</TableHead>
                    <TableHead>وضعیت تخصیص</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium text-green-600 dark:text-green-400">
                        +{formatCurrency(payment.amount)} تومان
                      </TableCell>
                      <TableCell>
                        {payment.paymentDate}
                      </TableCell>
                      <TableCell>
                        {payment.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.isAllocated ? "default" : "secondary"}>
                          {payment.isAllocated ? "تخصیص یافته" : "تخصیص نیافته"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <CardTitle>دفتر حساب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    خلاصه حساب
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">کل فروش: </span>
                      <span className="font-medium">{formatCurrency(representative.totalSales)} ت</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">کل پرداخت‌ها: </span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toString())} ت
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">مانده: </span>
                      <span className={`font-medium ${
                        parseFloat(representative.totalDebt) > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        {formatCurrency(representative.totalDebt)} ت
                      </span>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>تاریخ</TableHead>
                      <TableHead>شرح</TableHead>
                      <TableHead>بدهکار</TableHead>
                      <TableHead>بستانکار</TableHead>
                      <TableHead>مانده</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Combined invoices and payments sorted by date */}
                    {[
                      ...invoices.map(inv => ({
                        date: inv.issueDate,
                        description: `فاکتور ${inv.invoiceNumber}`,
                        debit: inv.amount,
                        credit: "0",
                        type: "invoice" as const
                      })),
                      ...payments.map(pay => ({
                        date: pay.paymentDate,
                        description: pay.description || "پرداخت نقدی",
                        debit: "0",
                        credit: pay.amount,
                        type: "payment" as const
                      }))
                    ].sort((a, b) => a.date.localeCompare(b.date)).map((item, index) => (
                      <TableRow key={`${item.type}-${index}`}>
                        <TableCell>{item.date}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-red-600 dark:text-red-400">
                          {item.debit !== "0" ? formatCurrency(item.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-green-600 dark:text-green-400">
                          {item.credit !== "0" ? formatCurrency(item.credit) : "-"}
                        </TableCell>
                        <TableCell>
                          {/* This would need proper running balance calculation */}
                          -
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
