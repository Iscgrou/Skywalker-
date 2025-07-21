import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  CreditCard, 
  Search, 
  Filter, 
  Plus, 
  Check, 
  X, 
  Calendar,
  DollarSign,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits, getCurrentPersianDate } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";

interface Payment {
  id: number;
  representativeId: number;
  invoiceId: number | null;
  amount: string;
  paymentDate: string;
  description: string | null;
  isAllocated: boolean;
  createdAt: string;
  // Additional fields from join
  representativeName?: string;
  representativeCode?: string;
  invoiceNumber?: string;
}

interface Representative {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  status: string;
}

const paymentSchema = z.object({
  representativeId: z.number().min(1, "نماینده الزامی است"),
  amount: z.string().min(1, "مبلغ الزامی است"),
  paymentDate: z.string().min(1, "تاریخ پرداخت الزامی است"),
  description: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [representativeFilter, setRepresentativeFilter] = useState<string>("all");
  const [allocationFilter, setAllocationFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"]
  });

  const { data: representatives } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"]
  });

  const { data: invoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"]
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentDate: getCurrentPersianDate(),
      description: "",
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiRequest('POST', '/api/payments', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "پرداخت ثبت شد",
        description: "پرداخت با موفقیت در سیستم ثبت شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/representatives'] });
      setIsAddDialogOpen(false);
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

  const allocatePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, invoiceId }: { paymentId: number, invoiceId: number }) => {
      const response = await apiRequest('PUT', `/api/payments/${paymentId}/allocate`, {
        invoiceId
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "پرداخت تخصیص یافت",
        description: "پرداخت با موفقیت به فاکتور تخصیص یافت",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطا در تخصیص پرداخت",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  const handleAllocatePayment = (paymentId: number, invoiceId: number) => {
    allocatePaymentMutation.mutate({ paymentId, invoiceId });
  };

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      (payment.representativeName && payment.representativeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.representativeCode && payment.representativeCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.description && payment.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRepresentative = representativeFilter === "all" || 
      payment.representativeId.toString() === representativeFilter;
    
    const matchesAllocation = 
      allocationFilter === "all" ||
      (allocationFilter === "allocated" && payment.isAllocated) ||
      (allocationFilter === "unallocated" && !payment.isAllocated);
    
    return matchesSearch && matchesRepresentative && matchesAllocation;
  }) || [];

  const getStats = () => {
    if (!payments) return { total: 0, allocated: 0, unallocated: 0, totalAmount: "0" };
    
    const total = payments.length;
    const allocated = payments.filter(p => p.isAllocated).length;
    const unallocated = payments.filter(p => !p.isAllocated).length;
    const totalAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0).toString();
    
    return { total, allocated, unallocated, totalAmount };
  };

  const stats = getStats();

  const getAvailableInvoicesForPayment = (payment: Payment) => {
    return invoices?.filter(invoice => 
      invoice.status === 'unpaid' &&
      // You could add more sophisticated matching logic here
      true
    ) || [];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">پرداخت‌ها</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            مدیریت پرداخت‌ها و تخصیص به فاکتورها
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              ثبت پرداخت جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="rtl max-w-md">
            <DialogHeader>
              <DialogTitle>ثبت پرداخت جدید</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="representativeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نماینده</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="انتخاب نماینده" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {representatives?.filter(rep => rep.isActive).map((rep) => (
                            <SelectItem key={rep.id} value={rep.id.toString()}>
                              {rep.name} ({rep.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    انصراف
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPaymentMutation.isPending}
                  >
                    {createPaymentMutation.isPending ? "در حال ذخیره..." : "ثبت پرداخت"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">کل پرداخت‌ها</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {toPersianDigits(stats.total.toString())}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">مجموع مبلغ</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatCurrency(stats.totalAmount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تومان</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">تخصیص یافته</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {toPersianDigits(stats.allocated.toString())}
                </p>
              </div>
              <Check className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">تخصیص نیافته</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {toPersianDigits(stats.unallocated.toString())}
                </p>
              </div>
              <X className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="جستجو بر اساس نماینده، توضیحات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={representativeFilter} onValueChange={setRepresentativeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="نماینده" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه نمایندگان</SelectItem>
                {representatives?.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id.toString()}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={allocationFilter} onValueChange={setAllocationFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="وضعیت تخصیص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="allocated">تخصیص یافته</SelectItem>
                <SelectItem value="unallocated">تخصیص نیافته</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="w-5 h-5 ml-2" />
            پرداخت‌ها ({toPersianDigits(filteredPayments.length.toString())})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نماینده</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>تاریخ پرداخت</TableHead>
                <TableHead>توضیحات</TableHead>
                <TableHead>وضعیت تخصیص</TableHead>
                <TableHead>فاکتور</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {payment.representativeName || 'نامشخص'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {payment.representativeCode}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium text-green-600 dark:text-green-400">
                    +{formatCurrency(payment.amount)} تومان
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 ml-1 text-gray-400" />
                      {payment.paymentDate}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="max-w-xs truncate">
                      {payment.description || "-"}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant={payment.isAllocated ? "default" : "secondary"}>
                      {payment.isAllocated ? "تخصیص یافته" : "تخصیص نیافته"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    {payment.invoiceNumber ? (
                      <span className="font-mono text-sm">
                        {payment.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">
                        تخصیص نیافته
                      </span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {!payment.isAllocated && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          تخصیص
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Allocation Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="rtl max-w-md">
          <DialogHeader>
            <DialogTitle>تخصیص پرداخت به فاکتور</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                  اطلاعات پرداخت:
                </h4>
                <div className="space-y-1 text-sm">
                  <div>نماینده: {selectedPayment.representativeName}</div>
                  <div>مبلغ: {formatCurrency(selectedPayment.amount)} تومان</div>
                  <div>تاریخ: {selectedPayment.paymentDate}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  فاکتورهای قابل تخصیص:
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getAvailableInvoicesForPayment(selectedPayment).map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(invoice.amount)} تومان
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handleAllocatePayment(selectedPayment.id, invoice.id)}
                        disabled={allocatePaymentMutation.isPending}
                      >
                        تخصیص
                      </Button>
                    </div>
                  ))}
                </div>
                
                {getAvailableInvoicesForPayment(selectedPayment).length === 0 && (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    فاکتور قابل تخصیص یافت نشد
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPayment(null)}
                >
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
