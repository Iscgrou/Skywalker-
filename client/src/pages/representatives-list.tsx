// 📋 REPRESENTATIVES LIST - CRM Navigation & Management
import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Filter,
  ArrowLeft,
  Phone,
  DollarSign,
  Activity,
  Eye,
  Brain
} from 'lucide-react';
import { CurrencyFormatter } from '@/lib/currency-formatter';

interface Representative {
  id: number;
  code: string;
  name: string;
  ownerName: string | null;
  phone: string | null;
  isActive: boolean;
  debtAmount: number;
  salesAmount: number;
  publicId: string;
}

export default function RepresentativesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'debt' | 'sales'>('name');

  const { data: representatives, isLoading, error } = useQuery<Representative[]>({
    queryKey: ['/api/crm/representatives']
  });

  const filteredRepresentatives = representatives?.filter(rep => {
    const matchesSearch = 
      rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.ownerName && rep.ownerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && rep.isActive) ||
      (statusFilter === 'inactive' && !rep.isActive);

    return matchesSearch && matchesStatus;
  })?.sort((a, b) => {
    switch (sortBy) {
      case 'debt':
        return b.debtAmount - a.debtAmount;
      case 'sales':
        return b.salesAmount - a.salesAmount;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری لیست نمایندگان...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-destructive">خطا در بارگذاری لیست نمایندگان</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/crm">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 ml-1" />
              بازگشت به داشبورد
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              مدیریت نمایندگان
            </h1>
            <p className="text-muted-foreground">
              {filteredRepresentatives?.length || 0} نماینده از مجموع {representatives?.length || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            فیلترها و جستجو
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو در نام، کد یا نام مالک..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="وضعیت نماینده" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="مرتب سازی بر اساس" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">نام</SelectItem>
                <SelectItem value="debt">میزان بدهی</SelectItem>
                <SelectItem value="sales">میزان فروش</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Representatives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRepresentatives?.map(rep => (
          <Card key={rep.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{rep.name}</CardTitle>
                <Badge variant={rep.isActive ? 'default' : 'secondary'}>
                  {rep.isActive ? 'فعال' : 'غیرفعال'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                کد: {rep.code}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {rep.ownerName && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{rep.ownerName}</span>
                </div>
              )}
              
              {rep.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{rep.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>بدهی: {CurrencyFormatter.formatForCRM(rep.debtAmount)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span>فروش: {CurrencyFormatter.formatForCRM(rep.salesAmount)}</span>
              </div>

              <div className="flex gap-2 pt-3">
                <Link href={`/crm/representatives/${rep.id}`} className="flex-1">
                  <Button variant="default" size="sm" className="w-full gap-2">
                    <Eye className="h-4 w-4" />
                    مشاهده پروفایل
                  </Button>
                </Link>
                
                <Link href={`/crm/representatives/${rep.id}?tab=ai-analysis`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <Brain className="h-4 w-4" />
                    تحلیل AI
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRepresentatives?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm || statusFilter !== 'all' 
                ? 'نماینده‌ای با این معیارها یافت نشد'
                : 'هیچ نماینده‌ای موجود نیست'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}