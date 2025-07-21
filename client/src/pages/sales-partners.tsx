import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Handshake, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  TrendingUp,
  Users,
  DollarSign,
  Percent,
  Phone,
  Mail
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";

interface SalesPartner {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  commissionRate: string;
  totalCommission: string;
  isActive: boolean;
  createdAt: string;
  // Additional calculated fields
  representativeCount?: number;
  currentMonthCommission?: string;
}

const salesPartnerSchema = z.object({
  name: z.string().min(1, "نام همکار فروش الزامی است"),
  phone: z.string().optional(),
  email: z.string().email("ایمیل نامعتبر است").optional().or(z.literal("")),
  commissionRate: z.string().min(1, "نرخ کمیسیون الزامی است"),
  isActive: z.boolean().default(true),
});

type SalesPartnerFormData = z.infer<typeof salesPartnerSchema>;

export default function SalesPartners() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<SalesPartner | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: salesPartners, isLoading } = useQuery<SalesPartner[]>({
    queryKey: ["/api/sales-partners"]
  });

  const form = useForm<SalesPartnerFormData>({
    resolver: zodResolver(salesPartnerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      commissionRate: "",
      isActive: true,
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: SalesPartnerFormData) => {
      const response = await apiRequest('POST', '/api/sales-partners', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "همکار فروش جدید اضافه شد",
        description: "اطلاعات با موفقیت ثبت شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-partners'] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ایجاد همکار فروش",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SalesPartnerFormData) => {
      if (!editingPartner) throw new Error("همکار فروش انتخاب نشده");
      const response = await apiRequest('PUT', `/api/sales-partners/${editingPartner.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "اطلاعات بروزرسانی شد",
        description: "تغییرات با موفقیت ذخیره شد",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-partners'] });
      setEditingPartner(null);
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

  const onSubmit = (data: SalesPartnerFormData) => {
    if (editingPartner) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (partner: SalesPartner) => {
    setEditingPartner(partner);
    form.reset({
      name: partner.name,
      phone: partner.phone || "",
      email: partner.email || "",
      commissionRate: partner.commissionRate,
      isActive: partner.isActive,
    });
  };

  const filteredPartners = salesPartners?.filter(partner =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (partner.phone && partner.phone.includes(searchTerm)) ||
    (partner.email && partner.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const getStats = () => {
    if (!salesPartners) return { 
      total: 0, 
      active: 0, 
      totalCommission: "0",
      avgCommissionRate: "0" 
    };
    
    const total = salesPartners.length;
    const active = salesPartners.filter(p => p.isActive).length;
    const totalCommission = salesPartners.reduce((sum, p) => 
      sum + parseFloat(p.totalCommission), 0
    ).toString();
    const avgCommissionRate = salesPartners.length > 0 ? 
      (salesPartners.reduce((sum, p) => sum + parseFloat(p.commissionRate), 0) / salesPartners.length).toFixed(1) : "0";
    
    return { total, active, totalCommission, avgCommissionRate };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">همکاران فروش</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            مدیریت همکاران فروش و محاسبه کمیسیون
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              همکار فروش جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="rtl max-w-md">
            <DialogHeader>
              <DialogTitle>افزودن همکار فروش جدید</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نام همکار فروش</FormLabel>
                      <FormControl>
                        <Input placeholder="احمد محمدی" {...field} />
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ایمیل (اختیاری)</FormLabel>
                      <FormControl>
                        <Input placeholder="ahmad@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="commissionRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نرخ کمیسیون (درصد)</FormLabel>
                      <FormControl>
                        <Input placeholder="5.5" {...field} />
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">کل همکاران</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {toPersianDigits(stats.total.toString())}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">نفر</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">همکاران فعال</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {toPersianDigits(stats.active.toString())}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">نفر</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">کل کمیسیون</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {formatCurrency(stats.totalCommission)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">تومان</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">میانگین کمیسیون</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {toPersianDigits(stats.avgCommissionRate)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">درصد</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Percent className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="جستجو بر اساس نام، شماره تماس یا ایمیل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Partners Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Handshake className="w-5 h-5 ml-2" />
            همکاران فروش ({toPersianDigits(filteredPartners.length.toString())})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>اطلاعات تماس</TableHead>
                <TableHead>نرخ کمیسیون</TableHead>
                <TableHead>کل کمیسیون</TableHead>
                <TableHead>تعداد نمایندگان</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {partner.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      عضویت: {new Date(partner.createdAt).toLocaleDateString('fa-IR')}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      {partner.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="w-3 h-3 ml-1 text-gray-400" />
                          {partner.phone}
                        </div>
                      )}
                      {partner.email && (
                        <div className="flex items-center text-sm">
                          <Mail className="w-3 h-3 ml-1 text-gray-400" />
                          {partner.email}
                        </div>
                      )}
                      {!partner.phone && !partner.email && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          اطلاعات تماس ثبت نشده
                        </span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center">
                      <Percent className="w-4 h-4 ml-1 text-orange-500" />
                      <span className="font-medium">
                        {toPersianDigits(parseFloat(partner.commissionRate).toString())}%
                      </span>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium text-purple-600 dark:text-purple-400">
                    {formatCurrency(partner.totalCommission)} تومان
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {toPersianDigits((partner.representativeCount || 0).toString())} نماینده
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant={partner.isActive ? "default" : "secondary"}
                      className={partner.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                    >
                      {partner.isActive ? "فعال" : "غیرفعال"}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(partner)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredPartners.length === 0 && (
            <div className="text-center py-8">
              <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ? "همکار فروشی با این مشخصات یافت نشد" : "هنوز همکار فروشی اضافه نشده است"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPartner} onOpenChange={() => setEditingPartner(null)}>
        <DialogContent className="rtl max-w-md">
          <DialogHeader>
            <DialogTitle>ویرایش همکار فروش</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام همکار فروش</FormLabel>
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ایمیل (اختیاری)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نرخ کمیسیون (درصد)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 space-x-reverse pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingPartner(null)}
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
    </div>
  );
}
