import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Search, Filter, Eye, Edit2, Plus, TrendingUp, TrendingDown,
  Phone, Mail, MapPin, Calendar, Award, AlertTriangle, CheckCircle,
  BarChart3, Target, Clock, Star, Activity, MessageSquare, Settings,
  ChevronLeft, ChevronRight, Zap, UserPlus, Cog
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import RepresentativeDetailsModal from './representative-details-modal';
import RepresentativeEditModal from './representative-edit-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

// Persian Currency Formatter
const CurrencyFormatter = {
  formatForCRM: (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('fa-IR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount) + ' ریال';
  }
};

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

interface Statistics {
  totalRepresentatives: number;
  activeRepresentatives: number;
  inactiveRepresentatives: number;
  totalDebt: number;
  totalSales: number;
  averageDebt: number;
  topPerformers: Representative[];
  riskAlerts: number;
  performanceMetrics: {
    excellentPerformers: number;
    goodPerformers: number;
    needsImprovement: number;
  };
}

export default function EnhancedRepresentativesManager() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(9); // 3x3 grid per page
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedRep, setSelectedRep] = useState<Representative | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch representatives
  const { data: representatives = [], isLoading } = useQuery({
    queryKey: ['/api/crm/representatives'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch statistics
  const { data: statistics } = useQuery<Statistics>({
    queryKey: ['/api/crm/representatives/statistics'],
    refetchInterval: 30000,
  });

  // Handle action buttons
  const handleViewDetails = async (rep: Representative) => {
    setSelectedRep(rep);
    setIsDetailsModalOpen(true);
  };

  const handleEditRep = (rep: Representative) => {
    setSelectedRep(rep);
    setIsEditModalOpen(true);
  };

  const handleContactRep = (rep: Representative) => {
    if (rep.phone) {
      window.open(`tel:${rep.phone}`, '_self');
      toast({
        title: "تماس برقرار شد",
        description: `در حال تماس با ${rep.name}`,
      });
    } else {
      toast({
        title: "خطا",
        description: "شماره تلفن این نماینده موجود نیست",
        variant: "destructive",
      });
    }
  };

  const handleAddNewRep = () => {
    setIsAddModalOpen(true);
    toast({
      title: "افزودن نماینده جدید",
      description: "فرم ثبت نماینده در حال بارگذاری...",
    });
  };

  const handleSettings = () => {
    setIsSettingsModalOpen(true);
    toast({
      title: "تنظیمات سیستم",
      description: "پنل تنظیمات در حال بارگذاری...",
    });
  };

  // Filter and sort representatives
  const filteredReps = representatives.filter((rep: Representative) => {
    const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rep.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && rep.isActive) ||
                         (filterStatus === 'inactive' && !rep.isActive);
    return matchesSearch && matchesFilter;
  });

  // Sort representatives
  const sortedReps = [...filteredReps].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'fa');
      case 'debt':
        return parseFloat(b.totalDebt) - parseFloat(a.totalDebt);
      case 'sales':
        return parseFloat(b.totalSales) - parseFloat(a.totalSales);
      case 'recent':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedReps.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReps = sortedReps.slice(startIndex, startIndex + pageSize);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-white">در حال بارگذاری نمایندگان...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Users className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">مدیریت نمایندگان SHERLOCK v3.0</h1>
              <p className="text-gray-300">سیستم هوشمند کنترل و تحلیل عملکرد نمایندگان فروش</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Button 
              onClick={handleAddNewRep}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <UserPlus className="w-4 h-4 ml-2" />
              افزودن نماینده
            </Button>
            <Button 
              onClick={handleSettings}
              variant="outline" 
              className="border-purple-500 text-purple-300 hover:bg-purple-600/20"
            >
              <Cog className="w-4 h-4 ml-2" />
              تنظیمات
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{statistics.totalRepresentatives}</div>
                <div className="text-sm text-gray-300">کل نمایندگان</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-500/30">
              <CardContent className="p-4 text-center">
                <TrendingDown className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{CurrencyFormatter.formatForCRM(statistics.totalDebt)}</div>
                <div className="text-sm text-gray-300">کل بدهی</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{CurrencyFormatter.formatForCRM(statistics.totalSales)}</div>
                <div className="text-sm text-gray-300">کل فروش</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{statistics.activeRepresentatives}</div>
                <div className="text-sm text-gray-300">فعال</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{statistics.inactiveRepresentatives}</div>
                <div className="text-sm text-gray-300">غیرفعال</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Search and Filter Controls */}
      <Card className="bg-black/20 border-white/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="جستجو بر اساس نام یا کد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 bg-white/5 border-white/20 text-white"
              />
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="فیلتر وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه نمایندگان</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white">
                <SelectValue placeholder="مرتب‌سازی" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">نام</SelectItem>
                <SelectItem value="debt">بدهی</SelectItem>
                <SelectItem value="sales">فروش</SelectItem>
                <SelectItem value="recent">جدیدترین</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-center text-gray-300">
              نمایش {startIndex + 1} تا {Math.min(startIndex + pageSize, sortedReps.length)} از {sortedReps.length} نماینده
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Representatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedReps.map((rep) => (
          <Card key={rep.id} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  {rep.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-white text-lg">{rep.name}</CardTitle>
                  <CardDescription className="text-gray-400">کد: {rep.code}</CardDescription>
                </div>
                <Badge variant={rep.isActive ? "default" : "secondary"}>
                  {rep.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">بدهی:</span>
                  <span className="text-red-400 font-semibold">
                    {CurrencyFormatter.formatForCRM(rep.totalDebt)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">فروش:</span>
                  <span className="text-green-400 font-semibold">
                    {CurrencyFormatter.formatForCRM(rep.totalSales)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">تلفن:</span>
                  <span className="text-blue-400">{rep.phone || 'ثبت نشده'}</span>
                </div>
              </div>

              <div className="flex space-x-2 rtl:space-x-reverse">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 border-blue-500 text-blue-400 hover:bg-blue-500/20"
                  onClick={() => handleViewDetails(rep)}
                >
                  <Eye className="w-4 h-4 ml-1" />
                  جزئیات
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 border-green-500 text-green-400 hover:bg-green-500/20"
                  onClick={() => handleEditRep(rep)}
                >
                  <Edit2 className="w-4 h-4 ml-1" />
                  ویرایش
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-500/20"
                  onClick={() => handleContactRep(rep)}
                >
                  <Phone className="w-4 h-4 ml-1" />
                  تماس
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="border-purple-500 text-purple-300"
              >
                <ChevronRight className="w-4 h-4 ml-2" />
                صفحه قبل
              </Button>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className={page === currentPage ? "bg-purple-600" : "border-purple-500 text-purple-300"}
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="border-purple-500 text-purple-300"
              >
                صفحه بعد
                <ChevronLeft className="w-4 h-4 mr-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {selectedRep && (
        <>
          <RepresentativeDetailsModal 
            representative={selectedRep}
            isOpen={isDetailsModalOpen}
            onClose={() => {
              setIsDetailsModalOpen(false);
              setSelectedRep(null);
            }}
          />
          
          <RepresentativeEditModal 
            representative={selectedRep}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedRep(null);
            }}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/crm/representatives'] });
              toast({
                title: "موفقیت",
                description: "اطلاعات نماینده با موفقیت به‌روزرسانی شد",
              });
            }}
          />
        </>
      )}

      {/* Add New Representative Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-400">افزودن نماینده جدید</DialogTitle>
            <DialogDescription className="text-gray-300">
              فرم ثبت نماینده جدید در سیستم SHERLOCK v3.0
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 text-center">
            <UserPlus className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">این بخش در حال توسعه است</p>
            <Button 
              onClick={() => setIsAddModalOpen(false)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              متوجه شدم
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="bg-slate-900 border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-400">تنظیمات سیستم</DialogTitle>
            <DialogDescription className="text-gray-300">
              پنل تنظیمات و کنترل سیستم مدیریت نمایندگان
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 text-center">
            <Settings className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <p className="text-gray-300 mb-4">پنل تنظیمات در حال توسعه است</p>
            <Button 
              onClick={() => setIsSettingsModalOpen(false)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              متوجه شدم
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}