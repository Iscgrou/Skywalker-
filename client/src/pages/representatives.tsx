import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  PhoneCall,
  User,
  ShoppingBag
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Representative {
  id: number;
  code: string;
  name: string;
  ownerName: string;
  panelUsername: string;
  phone: string;
  publicId: string;
  salesPartnerId: number;
  isActive: boolean;
  totalDebt: string;
  totalSales: string;
  credit: string;
  createdAt: string;
  updatedAt: string;
}

interface RepresentativeStats {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  totalSales: number;
  totalDebt: number;
  avgPerformance: number;
}

interface RepresentativeWithDetails extends Representative {
  invoices?: Invoice[];
  payments?: Payment[];
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  sentToTelegram: boolean;
  telegramSentAt?: string;
}

interface Payment {
  id: number;
  amount: string;
  paymentDate: string;
  description: string;
  isAllocated: boolean;
  invoiceId?: number;
}

// Form validation schema
const representativeFormSchema = z.object({
  code: z.string().min(1, "کد نماینده الزامی است"),
  name: z.string().min(1, "نام فروشگاه الزامی است"),
  ownerName: z.string().optional(),
  panelUsername: z.string().min(1, "نام کاربری پنل الزامی است"),
  phone: z.string().optional(),
  salesPartnerId: z.number().optional(),
  isActive: z.boolean().default(true)
});

export default function Representatives() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRep, setSelectedRep] = useState<RepresentativeWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: representatives = [], isLoading } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"],
    select: (data: any) => {
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    }
  });

  const { data: stats } = useQuery<RepresentativeStats>({
    queryKey: ["/api/representatives/statistics"],
    select: (data: any) => {
      return data || {
        totalCount: 0,
        activeCount: 0,
        inactiveCount: 0,
        totalSales: 0,
        totalDebt: 0,
        avgPerformance: 0
      };
    }
  });

  // Filter representatives based on search term and status
  const filteredRepresentatives = representatives.filter(rep => {
    const matchesSearch = 
      rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "active" && rep.isActive) ||
      (statusFilter === "inactive" && !rep.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="w-3 h-3 ml-1" />
        فعال
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
        <AlertTriangle className="w-3 h-3 ml-1" />
        غیرفعال
      </Badge>
    );
  };

  const getDebtAlert = (debt: string) => {
    const debtAmount = parseFloat(debt);
    if (debtAmount > 1000000) {
      return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    } else if (debtAmount > 500000) {
      return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800";
    }
    return "";
  };

  // Create representative mutation
  const createRepresentativeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof representativeFormSchema>) => {
      return apiRequest("/api/representatives", {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/representatives/statistics"] });
      toast({
        title: "موفقیت",
        description: "نماینده جدید با موفقیت ایجاد شد"
      });
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error?.message || "خطا در ایجاد نماینده",
        variant: "destructive"
      });
    }
  });

  // Update representative mutation
  const updateRepresentativeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<z.infer<typeof representativeFormSchema>> }) => {
      return apiRequest(`/api/representatives/${id}`, {
        method: "PUT",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/representatives/statistics"] });
      toast({
        title: "موفقیت",
        description: "اطلاعات نماینده بروزرسانی شد"
      });
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطا",
        description: error?.message || "خطا در بروزرسانی نماینده",
        variant: "destructive"
      });
    }
  });

  const handleViewDetails = async (rep: Representative) => {
    try {
      const detailsResponse = await apiRequest(`/api/representatives/${rep.code}`);
      setSelectedRep({
        ...rep,
        invoices: detailsResponse.invoices || [],
        payments: detailsResponse.payments || []
      });
      setIsDetailsOpen(true);
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در دریافت جزئیات نماینده",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (rep: Representative) => {
    setSelectedRep(rep);
    setIsEditOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            مدیریت نمایندگان
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            مدیریت جامع اطلاعات و عملکرد نمایندگان فروش
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 ml-2" />
          نماینده جدید
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  کل نمایندگان
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {toPersianDigits(stats?.totalCount.toString() || "0")}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  نمایندگان فعال
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {toPersianDigits(stats?.activeCount.toString() || "0")}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  کل فروش
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats?.totalSales || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  کل بدهی
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(stats?.totalDebt || 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="relative flex-1 lg:w-80">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="جستجو نماینده..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">همه</SelectItem>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="inactive">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {toPersianDigits(filteredRepresentatives.length.toString())} نماینده یافت شد
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Representatives Table */}
      <Card>
        <CardHeader>
          <CardTitle>فهرست نمایندگان</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کد</TableHead>
                  <TableHead>نام فروشگاه</TableHead>
                  <TableHead>مالک</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>کل فروش</TableHead>
                  <TableHead>بدهی</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepresentatives.map((rep) => (
                  <TableRow 
                    key={rep.id} 
                    className={`${getDebtAlert(rep.totalDebt)} hover:bg-gray-50 dark:hover:bg-gray-800`}
                  >
                    <TableCell className="font-mono text-sm">
                      {rep.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {rep.name}
                    </TableCell>
                    <TableCell>
                      {rep.ownerName || '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(rep.isActive)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatCurrency(parseFloat(rep.totalSales))}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      <span className={parseFloat(rep.totalDebt) > 500000 ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                        {formatCurrency(parseFloat(rep.totalDebt))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(rep)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rep)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Representative Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>جزئیات کامل نماینده</DialogTitle>
            <DialogDescription>
              اطلاعات، تراکنش‌ها و عملکرد نماینده
            </DialogDescription>
          </DialogHeader>
          {selectedRep && (
            <div className="space-y-6">
              {/* Basic Information & Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 ml-2" />
                      اطلاعات کلی
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">کد:</span>
                      <span className="font-mono">{selectedRep.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">نام فروشگاه:</span>
                      <span>{selectedRep.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">مالک:</span>
                      <span>{selectedRep.ownerName || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">تلفن:</span>
                      <span className="font-mono">{selectedRep.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">نام کاربری پنل:</span>
                      <span className="font-mono">{selectedRep.panelUsername}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">شناسه عمومی:</span>
                      <span className="font-mono text-xs">{selectedRep.publicId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">وضعیت:</span>
                      {getStatusBadge(selectedRep.isActive)}
                    </div>
                    <Separator />
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.open(`/representative/${selectedRep.publicId}`, '_blank')}
                      >
                        <PhoneCall className="w-4 h-4 ml-2" />
                        نمایش پورتال عمومی
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <DollarSign className="w-5 h-5 ml-2" />
                      آمار مالی
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">کل فروش:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(parseFloat(selectedRep.totalSales))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">کل بدهی:</span>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(parseFloat(selectedRep.totalDebt))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">اعتبار:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(parseFloat(selectedRep.credit))}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">تعداد فاکتورها:</span>
                      <span>{selectedRep.invoices?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">تعداد پرداخت‌ها:</span>
                      <span>{selectedRep.payments?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">تاریخ ایجاد:</span>
                      <span>{new Date(selectedRep.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Invoices Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <ShoppingBag className="w-5 h-5 ml-2" />
                    فاکتورها ({selectedRep.invoices?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRep.invoices && selectedRep.invoices.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>شماره فاکتور</TableHead>
                            <TableHead>مبلغ</TableHead>
                            <TableHead>تاریخ صدور</TableHead>
                            <TableHead>وضعیت</TableHead>
                            <TableHead>تلگرام</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRep.invoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                              <TableCell>{formatCurrency(parseFloat(invoice.amount))}</TableCell>
                              <TableCell>{invoice.issueDate}</TableCell>
                              <TableCell>
                                <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                                  {invoice.status === 'paid' ? 'پرداخت شده' : 'پرداخت نشده'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {invoice.sentToTelegram ? (
                                  <Badge variant="outline" className="text-green-600">
                                    ✓ ارسال شده
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-red-600">
                                    ✗ ارسال نشده
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      هیچ فاکتوری یافت نشد
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payments Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <TrendingUp className="w-5 h-5 ml-2" />
                    پرداخت‌ها ({selectedRep.payments?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedRep.payments && selectedRep.payments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>مبلغ</TableHead>
                            <TableHead>تاریخ پرداخت</TableHead>
                            <TableHead>شرح</TableHead>
                            <TableHead>وضعیت تخصیص</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRep.payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell>{formatCurrency(parseFloat(payment.amount))}</TableCell>
                              <TableCell>{payment.paymentDate}</TableCell>
                              <TableCell>{payment.description || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={payment.isAllocated ? 'default' : 'secondary'}>
                                  {payment.isAllocated ? 'تخصیص یافته' : 'تخصیص نیافته'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      هیچ پرداختی یافت نشد
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Representative Dialog */}
      <CreateRepresentativeDialog 
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createRepresentativeMutation.mutate(data)}
        isLoading={createRepresentativeMutation.isPending}
      />

      {/* Edit Representative Dialog */}
      <EditRepresentativeDialog 
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        representative={selectedRep}
        onSubmit={(data) => selectedRep && updateRepresentativeMutation.mutate({ 
          id: selectedRep.id, 
          data 
        })}
        isLoading={updateRepresentativeMutation.isPending}
      />
    </div>
  );
}

// Create Representative Form Component
function CreateRepresentativeDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: z.infer<typeof representativeFormSchema>) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof representativeFormSchema>>({
    resolver: zodResolver(representativeFormSchema),
    defaultValues: {
      code: "",
      name: "",
      ownerName: "",
      panelUsername: "",
      phone: "",
      salesPartnerId: undefined,
      isActive: true
    }
  });

  const handleSubmit = (data: z.infer<typeof representativeFormSchema>) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ایجاد نماینده جدید</DialogTitle>
          <DialogDescription>
            اطلاعات نماینده جدید را وارد کنید
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کد نماینده *</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: REP001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام فروشگاه *</FormLabel>
                  <FormControl>
                    <Input placeholder="نام فروشگاه" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="panelUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام کاربری پنل *</FormLabel>
                  <FormControl>
                    <Input placeholder="نام کاربری برای پنل مدیریت" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام مالک</FormLabel>
                    <FormControl>
                      <Input placeholder="نام مالک فروشگاه" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تلفن</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="ml-2"
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "در حال ایجاد..." : "ایجاد نماینده"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Representative Form Component
function EditRepresentativeDialog({ 
  open, 
  onOpenChange, 
  representative,
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representative: Representative | null;
  onSubmit: (data: Partial<z.infer<typeof representativeFormSchema>>) => void;
  isLoading: boolean;
}) {
  const form = useForm<z.infer<typeof representativeFormSchema>>({
    resolver: zodResolver(representativeFormSchema.partial()),
    defaultValues: {
      code: representative?.code || "",
      name: representative?.name || "",
      ownerName: representative?.ownerName || "",
      panelUsername: representative?.panelUsername || "",
      phone: representative?.phone || "",
      isActive: representative?.isActive || true
    }
  });

  // Update form when representative changes
  React.useEffect(() => {
    if (representative) {
      form.reset({
        code: representative.code,
        name: representative.name,
        ownerName: representative.ownerName || "",
        panelUsername: representative.panelUsername,
        phone: representative.phone || "",
        isActive: representative.isActive
      });
    }
  }, [representative, form]);

  const handleSubmit = (data: z.infer<typeof representativeFormSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ویرایش نماینده</DialogTitle>
          <DialogDescription>
            اطلاعات نماینده را ویرایش کنید
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کد نماینده *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام فروشگاه *</FormLabel>
                  <FormControl>
                    <Input placeholder="نام فروشگاه" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="panelUsername"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام کاربری پنل *</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام مالک</FormLabel>
                    <FormControl>
                      <Input placeholder="نام مالک فروشگاه" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تلفن</FormLabel>
                    <FormControl>
                      <Input placeholder="09123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">وضعیت فعال</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      نماینده فعال باشد یا خیر
                    </div>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="ml-2"
              >
                انصراف
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}