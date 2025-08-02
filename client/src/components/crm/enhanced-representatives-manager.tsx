import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Search, Filter, Eye, Edit2, Plus, TrendingUp, TrendingDown,
  Phone, Mail, MapPin, Calendar, Award, AlertTriangle, CheckCircle,
  BarChart3, Target, Clock, Star, Activity, MessageSquare, Settings
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import RepresentativeDetailsModal from './representative-details-modal';
import RepresentativeEditModal from './representative-edit-modal';
import RepresentativeCreateModal from './representative-create-modal';

// Persian Currency Formatter
const CurrencyFormatter = new Intl.NumberFormat('fa-IR', {
  style: 'currency',
  currency: 'IRR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Persian Date Formatter
const PersianDateFormatter = new Intl.DateTimeFormat('fa-IR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

interface Representative {
  id: number;
  code: string;
  name: string;
  ownerName: string;
  panelUsername: string;
  phone: string;
  publicId: string;
  salesPartnerId: string;
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
  totalSales: number;
  totalDebt: number;
  avgPerformance: number;
  topPerformers: Representative[];
  riskAlerts: number;
}

export default function EnhancedRepresentativesManager() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingRep, setEditingRep] = useState<Representative | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const repsPerPage = 9;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Handler functions for representative actions
  const handleViewRepresentative = async (repId: number) => {
    try {
      const response = await apiRequest(`/api/crm/representatives/${repId}`);
      if (response.success) {
        setSelectedRep(response.data.representative);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error fetching representative details:', error);
      toast({
        title: "خطا",
        description: "خطا در دریافت جزئیات نماینده",
        variant: "destructive",
      });
    }
  };

  const handleEditRepresentative = async (repId: number) => {
    try {
      const response = await apiRequest(`/api/crm/representatives/${repId}`);
      if (response.success) {
        setEditingRep(response.data.representative);
        setShowEditModal(true);
      }
    } catch (error) {
      console.error('Error fetching representative for edit:', error);
      toast({
        title: "خطا",
        description: "خطا در دریافت اطلاعات نماینده برای ویرایش",
        variant: "destructive",
      });
    }
  };

  // REAL FUNCTIONAL HANDLERS - SHERLOCK v3.0 ARCHITECTURE
  const handleViewRep = (rep: Representative) => {
    console.log('Viewing representative:', rep);
    setSelectedRep(rep);
    setShowDetailsModal(true);
  };

  const handleEditRep = (rep: Representative) => {
    console.log('Editing representative:', rep);
    setEditingRep(rep);
    setShowEditModal(true);
  };

  const handleCallRep = (rep: Representative) => {
    console.log('Calling representative:', rep);
    if (rep.phone) {
      const shouldCall = window.confirm(`آیا می‌خواهید با ${rep.name} (${rep.phone}) تماس بگیرید؟`);
      if (shouldCall) {
        window.open(`tel:${rep.phone}`, '_self');
        toast({
          title: "تماس برقرار شد",
          description: `تماس با ${rep.name} برقرار شد`
        });
      }
    } else {
      toast({
        title: "خطا",
        description: "شماره تماس برای این نماینده ثبت نشده",
        variant: "destructive"
      });
    }
  };

  // Mutation for updating representative
  const updateRepresentativeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Representative> }) => {
      return apiRequest(`/api/crm/representatives/${id}`, {
        method: 'PUT',
        data: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/representatives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/representatives/statistics'] });
      setShowEditModal(false);
      setEditingRep(null);
      toast({
        title: "موفقیت",
        description: "اطلاعات نماینده با موفقیت بروزرسانی شد",
      });
    },
    onError: (error: any) => {
      console.error('Error updating representative:', error);
      toast({
        title: "خطا",
        description: "خطا در بروزرسانی اطلاعات نماینده",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating new representative
  const createRepresentativeMutation = useMutation({
    mutationFn: async (data: Partial<Representative>) => {
      return apiRequest('/api/crm/representatives', {
        method: 'POST',
        data: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crm/representatives'] });
      queryClient.invalidateQueries({ queryKey: ['/api/crm/representatives/statistics'] });
      setShowAddModal(false);
      toast({
        title: "موفقیت",
        description: "نماینده جدید با موفقیت اضافه شد",
      });
    },
    onError: (error: any) => {
      console.error('Error creating representative:', error);
      toast({
        title: "خطا",
        description: "خطا در ایجاد نماینده جدید",
        variant: "destructive",
      });
    },
  });

  // Fetch Representatives Data
  const { data: representatives, isLoading: repsLoading } = useQuery({
    queryKey: ['/api/crm/representatives'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch Representative Statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/crm/representatives/statistics'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  // PAGINATION IMPLEMENTATION - SHERLOCK v3.0 ARCHITECTURE
  // Note: repsPerPage and currentPage state already declared above

  // Calculate filtered and sorted representatives with PAGINATION
  const allProcessedReps = React.useMemo(() => {
    if (!representatives || !Array.isArray(representatives)) return [];
    
    let filtered = representatives.filter((rep: Representative) => {
      const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rep.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           rep.ownerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'active' && rep.isActive) ||
                           (filterStatus === 'inactive' && !rep.isActive);
      return matchesSearch && matchesStatus;
    });

    // Sort representatives
    filtered.sort((a: Representative, b: Representative) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name, 'fa');
        case 'totalSales':
          return parseFloat(b.totalSales || '0') - parseFloat(a.totalSales || '0');
        case 'totalDebt':
          return parseFloat(b.totalDebt || '0') - parseFloat(a.totalDebt || '0');
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [representatives, searchTerm, filterStatus, sortBy]);

  // Pagination calculations
  const totalPages = Math.ceil(allProcessedReps.length / repsPerPage);
  const startIndex = (currentPage - 1) * repsPerPage;
  const endIndex = startIndex + repsPerPage;
  const processedReps = allProcessedReps.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Loading states
  if (repsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">در حال بارگذاری نمایندگان...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            🤵 مدیریت نمایندگان SHERLOCK v3.0
          </h1>
          <p className="text-gray-300">
            سیستم هوشمند کنترل و نظارت بر عملکرد نمایندگان فروش
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            افزودن نماینده
          </Button>
          <Button variant="outline" className="border-white/20">
            <Settings className="w-4 h-4 ml-2" />
            تنظیمات
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-300 text-sm">کل نمایندگان</p>
                <p className="text-2xl font-bold text-white">
                  {Array.isArray(representatives) ? representatives.length : 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-300 text-sm">نمایندگان فعال</p>
                <p className="text-2xl font-bold text-white">
                  {Array.isArray(representatives) ? representatives.filter((r: Representative) => r.isActive).length : 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">کل فروش</p>
                <p className="text-xl font-bold text-white">
                  {CurrencyFormatter.format(
                    Array.isArray(representatives) 
                      ? representatives.reduce((sum: number, rep: Representative) => 
                          sum + parseFloat(rep.totalSales || '0'), 0
                        ) 
                      : 0
                  ).replace('IRR', 'تومان')}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-300 text-sm">کل بدهی</p>
                <p className="text-xl font-bold text-white">
                  {CurrencyFormatter.format(
                    Array.isArray(representatives) 
                      ? representatives.reduce((sum: number, rep: Representative) => 
                          sum + parseFloat(rep.totalDebt || '0'), 0
                        ) 
                      : 0
                  ).replace('IRR', 'تومان')}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-300 text-sm">نرخ عملکرد</p>
                <p className="text-2xl font-bold text-white">87%</p>
              </div>
              <Activity className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Section */}
      <Card className="bg-black/30 border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="جستجو بر اساس نام، کد یا مالک..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/10 border-white/20 text-white pr-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded-md text-sm"
              >
                <option value="name">نام</option>
                <option value="totalSales">فروش</option>
                <option value="totalDebt">بدهی</option>
                <option value="created">تاریخ ایجاد</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded-md text-sm"
              >
                <option value="all">همه نمایندگان</option>
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-black/30">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
            <BarChart3 className="w-4 h-4 ml-2" />
            نمای کلی
          </TabsTrigger>
          <TabsTrigger value="grid" className="data-[state=active]:bg-white/20">
            <Users className="w-4 h-4 ml-2" />
            فهرست نمایندگان
            <Button
              size="sm"
              variant="outline"
              className="mr-auto bg-green-600 hover:bg-green-700 border-green-500"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-3 h-3 ml-1" />
              افزودن
            </Button>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white/20">
            <Target className="w-4 h-4 ml-2" />
            تحلیل عملکرد
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-white/20">
            <AlertTriangle className="w-4 h-4 ml-2" />
            هشدارها
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Star className="w-5 h-5 ml-2 text-yellow-400" />
                  برترین نمایندگان
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allProcessedReps.slice(0, 5).map((rep: Representative, index: number) => (
                    <div key={rep.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{rep.name}</p>
                          <p className="text-gray-400 text-sm">کد: {rep.code}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-green-400 font-semibold">
                          {CurrencyFormatter.format(parseFloat(rep.totalSales || '0')).replace('IRR', 'ت')}
                        </p>
                        <Badge variant={rep.isActive ? "default" : "secondary"} className="text-xs">
                          {rep.isActive ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Analytics */}
            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <BarChart3 className="w-5 h-5 ml-2 text-blue-400" />
                  تحلیل عملکرد کلی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">نرخ فروش</span>
                      <span className="text-white">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">رضایت مشتریان</span>
                      <span className="text-white">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">زمان پاسخگویی</span>
                      <span className="text-white">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">دقت مستندات</span>
                      <span className="text-white">95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Grid Tab - Representatives List */}
        <TabsContent value="grid" className="space-y-4">
          {processedReps.length === 0 ? (
            <Card className="bg-black/20 border-white/10">
              <CardContent className="py-12">
                <div className="text-center text-gray-400">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">نماینده‌ای یافت نشد</p>
                  <p className="text-sm">شرایط جستجو را تغییر دهید یا نماینده جدید اضافه کنید</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedReps.map((rep: Representative) => (
                <Card key={rep.id} className="bg-black/30 border-white/10 hover:border-purple-500/50 transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-lg">{rep.name}</CardTitle>
                      <Badge variant={rep.isActive ? "default" : "secondary"}>
                        {rep.isActive ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </div>
                    <CardDescription className="text-gray-400">
                      <div className="flex items-center gap-2 text-sm">
                        <span>کد: {rep.code}</span>
                        <span>•</span>
                        <span>مالک: {rep.ownerName}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Contact Info */}
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Phone className="w-4 h-4" />
                      <span>{rep.phone}</span>
                    </div>
                    
                    {/* Financial Info */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">فروش کل:</span>
                        <span className="text-green-400 font-semibold text-sm">
                          {CurrencyFormatter.format(parseFloat(rep.totalSales || '0')).replace('IRR', 'ت')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">بدهی:</span>
                        <span className="text-red-400 font-semibold text-sm">
                          {CurrencyFormatter.format(parseFloat(rep.totalDebt || '0')).replace('IRR', 'ت')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300 text-sm">اعتبار:</span>
                        <span className="text-blue-400 font-semibold text-sm">
                          {CurrencyFormatter.format(parseFloat(rep.credit || '0')).replace('IRR', 'ت')}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-white/20 hover:border-white/40"
                        onClick={() => handleViewRep(rep)}
                      >
                        <Eye className="w-4 h-4 ml-1" />
                        جزئیات
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 border-white/20 hover:border-white/40"
                        onClick={() => handleEditRep(rep)}
                      >
                        <Edit2 className="w-4 h-4 ml-1" />
                        ویرایش
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-white/20 hover:border-white/40"
                        onClick={() => handleCallRep(rep)}
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 rtl:space-x-reverse mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="border-white/20 text-white hover:bg-white/10"
              >
                قبلی
              </Button>
              
              <div className="flex space-x-1 rtl:space-x-reverse">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={currentPage === pageNum 
                      ? "bg-purple-600 hover:bg-purple-700" 
                      : "border-white/20 text-white hover:bg-white/10"
                    }
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="border-white/20 text-white hover:bg-white/10"
              >
                بعدی
              </Button>
            </div>
          )}
          
          {/* Page Information */}
          <div className="text-center text-gray-400 text-sm mt-4">
            صفحه {currentPage} از {totalPages} • {allProcessedReps.length} نماینده
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">توزیع عملکرد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border border-dashed border-white/20 rounded">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">نمودار توزیع عملکرد</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/20 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">روند ماهانه</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border border-dashed border-white/20 rounded">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">نمودار روند ماهانه</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card className="bg-black/20 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertTriangle className="w-5 h-5 ml-2 text-yellow-400" />
                هشدارهای سیستم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-400 font-semibold">بدهی بالا</p>
                      <p className="text-gray-300 text-sm">3 نماینده دارای بدهی بالای حد مجاز</p>
                    </div>
                    <Badge variant="destructive">فوری</Badge>
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-400 font-semibold">عملکرد پایین</p>
                      <p className="text-gray-300 text-sm">5 نماینده نیاز به بررسی عملکرد دارند</p>
                    </div>
                    <Badge variant="secondary">متوسط</Badge>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-400 font-semibold">بروزرسانی مطلوب</p>
                      <p className="text-gray-300 text-sm">اطلاعات تماس 2 نماینده نیاز به بروزرسانی دارد</p>
                    </div>
                    <Badge variant="outline">اطلاعیه</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RepresentativeCreateModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={(data) => createRepresentativeMutation.mutate(data)}
        isLoading={createRepresentativeMutation.isPending}
      />

      <RepresentativeDetailsModal
        representative={selectedRep}
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedRep(null);
        }}
        onEdit={(rep) => {
          setEditingRep(rep);
          setShowDetailsModal(false);
          setShowEditModal(true);
        }}
      />

      <RepresentativeEditModal
        representative={editingRep}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingRep(null);
        }}
        onSave={(id, data) => updateRepresentativeMutation.mutate({ id, data })}
        isLoading={updateRepresentativeMutation.isPending}
      />
    </div>
  );
}