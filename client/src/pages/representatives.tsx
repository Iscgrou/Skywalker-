import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Users, 
  AlertTriangle,
  Phone,
  Share2,
  Filter
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
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
  salesPartnerId: number | null;
  isActive: boolean;
  totalDebt: string;
  totalSales: string;
  credit: string;
  createdAt: string;
}

interface SalesPartner {
  id: number;
  name: string;
  isActive: boolean;
}

const representativeSchema = z.object({
  code: z.string().min(1, "کد نماینده الزامی است"),
  name: z.string().min(1, "نام فروشگاه الزامی است"),
  ownerName: z.string().optional(),
  panelUsername: z.string().min(1, "نام کاربری پنل الزامی است"),
  phone: z.string().optional(),
  salesPartnerId: z.number().optional(),
  isActive: z.boolean().default(true),
});

type RepresentativeFormData = z.infer<typeof representativeSchema>;

export default function Representatives() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: representatives, isLoading } = useQuery<Representative[]>({
    queryKey: ["/api/representatives"]
  });

  const { data: salesPartners } = useQuery<SalesPartner[]>({
    queryKey: ["/api/sales-partners"]
  });

  const form = useForm<RepresentativeFormData>({
    resolver: zodResolver(representativeSchema),
    defaultValues: {
      code: "",
      name: "",
      ownerName: "",
      panelUsername: "",
      phone: "",
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: RepresentativeFormData) => {
      const response = await apiRequest('POST', '/api/representatives', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "نماینده جدید اضافه شد",
        description: "اطلاعات با موفقیت ثبت شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/representatives'] });
      setIsAddDialogOpen(false);
      form.reset({
        code: "",
        name: "",
        ownerName: "",
        panelUsername: "",
        phone: "",
        isActive: true,
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ایجاد نماینده",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RepresentativeFormData) => {
      if (!editingRep) throw new Error("نماینده انتخاب نشده");
      const response = await apiRequest('PUT', `/api/representatives/${editingRep.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "اطلاعات بروزرسانی شد",
        description: "تغییرات با موفقیت ذخیره شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/representatives'] });
      setEditingRep(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "خطا در بروزرسانی",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/representatives/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "نماینده حذف شد",
        description: "نماینده با موفقیت از سیستم حذف شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/representatives'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در حذف",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: RepresentativeFormData) => {
    if (editingRep) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (rep: Representative) => {
    setEditingRep(rep);
    form.reset({
      code: rep.code,
      name: rep.name,
      ownerName: rep.ownerName || "",
      panelUsername: rep.panelUsername,
      phone: rep.phone || "",
      salesPartnerId: rep.salesPartnerId || undefined,
      isActive: rep.isActive,
    });
  };

  const handleCopyPortalLink = (publicId: string) => {
    const portalLink = `${window.location.origin}/portal/${publicId}`;
    navigator.clipboard.writeText(portalLink);
    toast({
      title: "لینک کپی شد",
      description: "لینک پورتال نماینده در کلیپبورد کپی شد",
    });
  };

  // Sort representatives by debt (highest first) and filter
  const sortedAndFilteredReps = representatives
    ?.sort((a, b) => parseFloat(b.totalDebt) - parseFloat(a.totalDebt))
    .filter(rep => {
      const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rep.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rep.panelUsername.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }) || [];

  // Pagination logic
  const totalItems = sortedAndFilteredReps.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const filteredRepresentatives = sortedAndFilteredReps.slice(startIndex, endIndex);

  const getDebtStatus = (debt: string) => {
    const amount = parseFloat(debt);
    if (amount > 100000) return { color: "text-red-600 dark:text-red-400", label: "بدهی بالا" };
    if (amount > 0) return { color: "text-orange-600 dark:text-orange-400", label: "بدهکار" };
    return { color: "text-green-600 dark:text-green-400", label: "بدون بدهی" };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-4 w-full" />
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">نمایندگان</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            مدیریت فروشگاه‌های موبایل و نمایندگان فروش
          </p>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <div className="flex items-center space-x-2 space-x-reverse border rounded-lg">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              جدول
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
            >
              کارت
            </Button>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                نماینده جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="rtl max-w-md">
              <DialogHeader>
                <DialogTitle>افزودن نماینده جدید</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>کد نماینده</FormLabel>
                        <FormControl>
                          <Input placeholder="REP-001" {...field} />
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
                        <FormLabel>نام فروشگاه</FormLabel>
                        <FormControl>
                          <Input placeholder="فروشگاه موبایل سیمکارت" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>صاحب فروشگاه (اختیاری)</FormLabel>
                        <FormControl>
                          <Input placeholder="نام صاحب فروشگاه" {...field} />
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
                        <FormLabel>نام کاربری پنل</FormLabel>
                        <FormControl>
                          <Input placeholder="mntzresf" {...field} />
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
                        <FormLabel>شماره تماس (اختیاری)</FormLabel>
                        <FormControl>
                          <Input placeholder="09123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="salesPartnerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>همکار فروش معرف (اختیاری)</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                          value={field.value?.toString() || "none"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="انتخاب همکار فروش" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">بدون همکار فروش</SelectItem>
                            {salesPartners?.filter(p => p.isActive).map((partner) => (
                              <SelectItem key={partner.id} value={partner.id.toString()}>
                                {partner.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? "در حال ذخیره..." : "ذخیره"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="جستجو بر اساس نام، کد یا نام کاربری پنل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              فیلتر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Representatives List */}
      {viewMode === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 ml-2" />
              لیست نمایندگان ({toPersianDigits(filteredRepresentatives.length.toString())})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نماینده</TableHead>
                  <TableHead>پنل</TableHead>
                  <TableHead>وضعیت مالی</TableHead>
                  <TableHead>همکار فروش</TableHead>
                  <TableHead>وضعیت</TableHead>
                  <TableHead>عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRepresentatives.map((rep) => {
                  const debtStatus = getDebtStatus(rep.totalDebt);
                  const salesPartner = salesPartners?.find(p => p.id === rep.salesPartnerId);
                  
                  return (
                    <TableRow key={rep.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {rep.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            کد: {rep.code}
                          </div>
                          {rep.ownerName && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {rep.ownerName}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {rep.panelUsername}
                        </div>
                        {rep.phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Phone className="w-3 h-3 ml-1" />
                            {rep.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={`text-sm font-medium ${debtStatus.color}`}>
                            بدهی: {formatCurrency(rep.totalDebt)} ت
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            فروش: {formatCurrency(rep.totalSales)} ت
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {salesPartner ? (
                          <span className="text-sm text-gray-900 dark:text-white">
                            {salesPartner.name}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            مستقل
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={rep.isActive ? "default" : "secondary"}
                          className={rep.isActive ? "bg-green-100 text-green-800" : ""}
                        >
                          {rep.isActive ? "فعال" : "غیرفعال"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyPortalLink(rep.publicId)}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Link href={`/representatives/${rep.code}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(rep)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(rep.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepresentatives.map((rep) => {
            const debtStatus = getDebtStatus(rep.totalDebt);
            const salesPartner = salesPartners?.find(p => p.id === rep.salesPartnerId);
            
            return (
              <Card key={rep.id} className="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        {rep.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        کد: {rep.code}
                      </p>
                      {rep.ownerName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {rep.ownerName}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant={rep.isActive ? "default" : "secondary"}
                      className={rep.isActive ? "bg-green-100 text-green-800" : ""}
                    >
                      {rep.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">پنل:</span>
                      <span className="font-mono text-sm">{rep.panelUsername}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">بدهی:</span>
                      <span className={`text-sm font-medium ${debtStatus.color}`}>
                        {formatCurrency(rep.totalDebt)} ت
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">فروش کل:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(rep.totalSales)} ت
                      </span>
                    </div>
                  </div>
                  
                  {parseFloat(rep.totalDebt) > 100000 && (
                    <div className="flex items-center text-red-600 dark:text-red-400 text-sm mb-4">
                      <AlertTriangle className="w-4 h-4 ml-1" />
                      <span>بدهی بالا</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {salesPartner ? `معرف: ${salesPartner.name}` : "مستقل"}
                    </div>
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopyPortalLink(rep.publicId)}
                      >
                        <Share2 className="w-3 h-3" />
                      </Button>
                      <Link href={`/representatives/${rep.code}`}>
                        <Button size="sm" variant="ghost">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingRep} onOpenChange={() => setEditingRep(null)}>
        <DialogContent className="rtl max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش نماینده</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>کد نماینده</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>نام فروشگاه</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صاحب فروشگاه (اختیاری)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>نام کاربری پنل</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>شماره تماس (اختیاری)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="salesPartnerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>همکار فروش معرف (اختیاری)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))}
                      value={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="انتخاب همکار فروش" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">بدون همکار فروش</SelectItem>
                        {salesPartners?.filter(p => p.isActive).map((partner) => (
                          <SelectItem key={partner.id} value={partner.id.toString()}>
                            {partner.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingRep(null)}
                >
                  انصراف
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Pagination Component */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            قبلی
          </Button>
          
          {/* Page Numbers */}
          {(() => {
            const pages = [];
            const maxVisiblePages = 5;
            const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            for (let i = startPage; i <= endPage; i++) {
              pages.push(
                <Button
                  key={i}
                  variant={i === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i)}
                  className="mx-1"
                >
                  {toPersianDigits(i.toString())}
                </Button>
              );
            }
            return pages;
          })()}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            بعدی
          </Button>
          
          <span className="text-sm text-gray-600 dark:text-gray-400 mr-4">
            صفحه {toPersianDigits(currentPage.toString())} از {toPersianDigits(totalPages.toString())} 
            ({toPersianDigits(totalItems.toString())} نماینده)
          </span>
        </div>
      )}
    </div>
  );
}
