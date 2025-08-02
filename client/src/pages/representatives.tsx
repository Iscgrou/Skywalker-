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
  ShoppingBag,
  Copy,
  ExternalLink,
  Calendar,
  Settings,
  FileText,
  CreditCard,
  History
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  telegramId?: string;
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
  usageData?: any;
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
  telegramId: z.string().optional(),
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
  const [isInvoiceEditOpen, setIsInvoiceEditOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPaymentCreateOpen, setIsPaymentCreateOpen] = useState(false);
  
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
        data: data
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
        data: data
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

  const handleCopyPortalLink = (publicId: string) => {
    const portalLink = `${window.location.origin}/representative/${publicId}`;
    navigator.clipboard.writeText(portalLink);
    toast({
      title: "کپی شد",
      description: "لینک پورتال عمومی نماینده کپی شد"
    });
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceEditOpen(true);
  };

  // Update representative debt after invoice edit
  const updateRepresentativeDebtMutation = useMutation({
    mutationFn: async ({ id, newDebt }: { id: number, newDebt: string }) => {
      return apiRequest(`/api/representatives/${id}`, {
        method: "PUT",
        data: { totalDebt: newDebt }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives"] });
      queryClient.invalidateQueries({ queryKey: ["/api/representatives/statistics"] });
    }
  });

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
                      <span className="text-gray-600 dark:text-gray-400">آی‌دی تلگرام:</span>
                      <span className="font-mono">{selectedRep.telegramId || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">نام کاربری پنل:</span>
                      <span className="font-mono">{selectedRep.panelUsername}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">شناسه عمومی:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs max-w-32 truncate">{selectedRep.publicId}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyPortalLink(selectedRep.publicId)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">وضعیت:</span>
                      {getStatusBadge(selectedRep.isActive)}
                    </div>
                    <Separator />
                    <div className="pt-2 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.open(`/representative/${selectedRep.publicId}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 ml-2" />
                        نمایش پورتال عمومی
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleCopyPortalLink(selectedRep.publicId)}
                      >
                        <Copy className="w-4 h-4 ml-2" />
                        کپی لینک پورتال
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
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 ml-2" />
                      تاریخچه فاکتورها ({selectedRep.invoices?.length || 0})
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setIsPaymentCreateOpen(true)}
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      ثبت پرداخت
                    </Button>
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
                            <TableHead>عملیات</TableHead>
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
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditInvoice(invoice)}
                                  title="ویرایش جزئیات فاکتور"
                                >
                                  <Settings className="w-4 h-4" />
                                </Button>
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
                    <CreditCard className="w-5 h-5 ml-2" />
                    تاریخچه پرداخت‌ها ({selectedRep.payments?.length || 0})
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
                            <TableHead>فاکتور مرتبط</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRep.payments.map((payment) => (
                            <TableRow key={payment.id}>
                              <TableCell className="font-bold text-green-600">
                                {formatCurrency(parseFloat(payment.amount))}
                              </TableCell>
                              <TableCell>{payment.paymentDate}</TableCell>
                              <TableCell>{payment.description || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={payment.isAllocated ? 'default' : 'secondary'}>
                                  {payment.isAllocated ? 'تخصیص یافته' : 'تخصیص نیافته'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {payment.invoiceId ? (
                                  <span className="font-mono text-sm">
                                    {selectedRep.invoices?.find(inv => inv.id === payment.invoiceId)?.invoiceNumber || `#${payment.invoiceId}`}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">عمومی</span>
                                )}
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

              {/* Financial Summary Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <History className="w-5 h-5 ml-2" />
                    خلاصه مالی و تراز حساب
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">کل پرداخت‌ها</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(selectedRep.payments?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0)}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">کل فاکتورها</div>
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(selectedRep.invoices?.reduce((sum, invoice) => sum + parseFloat(invoice.amount), 0) || 0)}
                      </div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">باقیمانده</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(parseFloat(selectedRep.totalDebt))}
                      </div>
                    </div>
                  </div>
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

      {/* Edit Invoice Dialog */}
      {selectedInvoice && (
        <EditInvoiceDialog
          open={isInvoiceEditOpen}
          onOpenChange={setIsInvoiceEditOpen}
          invoice={selectedInvoice}
          representative={selectedRep}
          onSave={() => {
            // Refresh representative details
            if (selectedRep) {
              handleViewDetails(selectedRep);
            }
            setIsInvoiceEditOpen(false);
          }}
        />
      )}

      {/* Create Payment Dialog */}
      {selectedRep && (
        <CreatePaymentDialog
          open={isPaymentCreateOpen}
          onOpenChange={setIsPaymentCreateOpen}
          representative={selectedRep}
          onSave={() => {
            // Refresh representative details
            handleViewDetails(selectedRep);
            setIsPaymentCreateOpen(false);
          }}
        />
      )}
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
      telegramId: "",
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
      telegramId: representative?.telegramId || "",
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
        telegramId: representative.telegramId || "",
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
              name="telegramId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>آی‌دی تلگرام</FormLabel>
                  <FormControl>
                    <Input placeholder="@username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

// Edit Invoice Dialog Component
function EditInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  representative,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
  representative: RepresentativeWithDetails | null;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(invoice.amount);
  const [issueDate, setIssueDate] = useState(invoice.issueDate);
  const [status, setStatus] = useState(invoice.status);
  const [usageData, setUsageData] = useState(JSON.stringify(invoice.usageData || {}, null, 2));
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      let parsedUsageData = {};
      if (usageData.trim()) {
        try {
          parsedUsageData = JSON.parse(usageData);
        } catch (e) {
          toast({
            title: "خطا",
            description: "فرمت JSON نامعتبر است",
            variant: "destructive"
          });
          return;
        }
      }

      const updateData = {
        amount,
        issueDate,
        status,
        usageData: parsedUsageData
      };

      await apiRequest(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        data: updateData
      });

      // Update representative's total debt if amount changed
      if (representative && amount !== invoice.amount) {
        const oldAmount = parseFloat(invoice.amount);
        const newAmount = parseFloat(amount);
        const currentDebt = parseFloat(representative.totalDebt);
        const newDebt = currentDebt - oldAmount + newAmount;
        
        await apiRequest(`/api/representatives/${representative.id}`, {
          method: "PUT",
          data: { totalDebt: newDebt.toString() }
        });
      }

      toast({
        title: "موفقیت",
        description: "فاکتور با موفقیت بروزرسانی شد"
      });
      
      onSave();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error?.message || "خطا در بروزرسانی فاکتور",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>ویرایش جزئیات فاکتور</DialogTitle>
          <DialogDescription>
            ویرایش اطلاعات فاکتور شماره {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="invoiceNumber">شماره فاکتور</Label>
            <Input
              id="invoiceNumber"
              value={invoice.invoiceNumber}
              disabled
              className="bg-gray-50 dark:bg-gray-800"
            />
          </div>

          <div>
            <Label htmlFor="amount">مبلغ (ریال)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مبلغ فاکتور"
            />
          </div>

          <div>
            <Label htmlFor="issueDate">تاریخ صدور</Label>
            <Input
              id="issueDate"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              placeholder="1403/01/01"
            />
          </div>

          <div>
            <Label htmlFor="status">وضعیت</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unpaid">پرداخت نشده</SelectItem>
                <SelectItem value="paid">پرداخت شده</SelectItem>
                <SelectItem value="partial">پرداخت جزئی</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="usageData">جزئیات مصرف (JSON)</Label>
            <Textarea
              id="usageData"
              value={usageData}
              onChange={(e) => setUsageData(e.target.value)}
              placeholder='{"service": "hosting", "period": "monthly"}'
              rows={6}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              جزئیات مصرف در فرمت JSON - این اطلاعات در پورتال عمومی نمایش داده می‌شود
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="ml-2"
          >
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Create Payment Dialog Component
function CreatePaymentDialog({
  open,
  onOpenChange,
  representative,
  onSave
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representative: Representative;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      if (!amount || !paymentDate) {
        toast({
          title: "خطا",
          description: "مبلغ و تاریخ پرداخت الزامی است",
          variant: "destructive"
        });
        return;
      }

      const paymentData = {
        representativeId: representative.id,
        amount,
        paymentDate,
        description: description || `پرداخت برای ${representative.name}`,
        invoiceId: selectedInvoiceId ? parseInt(selectedInvoiceId) : null,
        isAllocated: !!selectedInvoiceId
      };

      await apiRequest("/api/payments", {
        method: "POST",
        data: paymentData
      });

      // Update representative's debt
      const currentDebt = parseFloat(representative.totalDebt);
      const paymentAmount = parseFloat(amount);
      const newDebt = Math.max(0, currentDebt - paymentAmount);
      
      await apiRequest(`/api/representatives/${representative.id}`, {
        method: "PUT",
        data: { totalDebt: newDebt.toString() }
      });

      toast({
        title: "موفقیت",
        description: "پرداخت با موفقیت ثبت شد"
      });
      
      // Reset form
      setAmount("");
      setPaymentDate("");
      setDescription("");
      setSelectedInvoiceId("");
      
      onSave();
    } catch (error: any) {
      toast({
        title: "خطا",
        description: error?.message || "خطا در ثبت پرداخت",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get today's date in Persian format
  const getCurrentPersianDate = () => {
    const today = new Date();
    return today.toLocaleDateString('fa-IR');
  };

  React.useEffect(() => {
    if (open && !paymentDate) {
      setPaymentDate(getCurrentPersianDate());
    }
  }, [open, paymentDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ثبت پرداخت جدید</DialogTitle>
          <DialogDescription>
            ثبت پرداخت برای {representative.name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="amount">مبلغ پرداخت (ریال) *</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مبلغ پرداخت"
            />
          </div>

          <div>
            <Label htmlFor="paymentDate">تاریخ پرداخت *</Label>
            <Input
              id="paymentDate"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              placeholder="1403/01/01"
            />
          </div>

          <div>
            <Label htmlFor="description">شرح پرداخت</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح پرداخت"
            />
          </div>

          <div>
            <Label htmlFor="invoiceId">تخصیص به فاکتور (اختیاری)</Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب فاکتور برای تخصیص" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">عمومی (بدون تخصیص)</SelectItem>
                {representative && (representative as any).invoices?.map((invoice: Invoice) => (
                  <SelectItem key={invoice.id} value={invoice.id.toString()}>
                    {invoice.invoiceNumber} - {formatCurrency(parseFloat(invoice.amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <div className="flex justify-between">
                <span>بدهی فعلی:</span>
                <span className="font-bold">{formatCurrency(parseFloat(representative.totalDebt))}</span>
              </div>
              {amount && (
                <div className="flex justify-between mt-1">
                  <span>بدهی پس از پرداخت:</span>
                  <span className="font-bold">
                    {formatCurrency(Math.max(0, parseFloat(representative.totalDebt) - parseFloat(amount || "0")))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="ml-2"
          >
            انصراف
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "در حال ثبت..." : "ثبت پرداخت"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}