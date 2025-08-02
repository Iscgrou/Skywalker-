import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Phone, Mail, MapPin, Calendar, DollarSign, 
  TrendingUp, TrendingDown, Activity, FileText, Eye, Edit2
} from 'lucide-react';

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

interface RepresentativeDetailsModalProps {
  representative: Representative | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (rep: Representative) => void;
}

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

export default function RepresentativeDetailsModal({ 
  representative, 
  isOpen, 
  onClose, 
  onEdit 
}: RepresentativeDetailsModalProps) {
  if (!representative) return null;

  const debtAmount = parseFloat(representative.totalDebt || '0');
  const salesAmount = parseFloat(representative.totalSales || '0');
  const creditAmount = parseFloat(representative.credit || '0');
  const debtRatio = salesAmount > 0 ? (debtAmount / salesAmount) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-black border-white/20" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                <User className="w-8 h-8 text-blue-400" />
                {representative.name}
              </DialogTitle>
              <DialogDescription className="text-gray-300 mt-2">
                کد نماینده: {representative.code} | مالک: {representative.ownerName}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => onEdit(representative)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="w-4 h-4 ml-2" />
                ویرایش
              </Button>
              <Badge variant={representative.isActive ? "default" : "secondary"} className="text-sm">
                {representative.isActive ? 'فعال' : 'غیرفعال'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 bg-black/30">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
              نمای کلی
            </TabsTrigger>
            <TabsTrigger value="financial" className="data-[state=active]:bg-white/20">
              مالی
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-white/20">
              فعالیت‌ها
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-white/20">
              تحلیل‌ها
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Contact Information */}
              <Card className="bg-black/30 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Phone className="w-5 h-5 ml-2 text-green-400" />
                    اطلاعات تماس
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{representative.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-white">نام کاربری پنل: {representative.panelUsername}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-white">شناسه عمومی: {representative.publicId}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-black/30 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <TrendingUp className="w-5 h-5 ml-2 text-blue-400" />
                    آمار سریع
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">وضعیت:</span>
                    <Badge variant={representative.isActive ? "default" : "secondary"}>
                      {representative.isActive ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">نسبت بدهی:</span>
                    <span className={`font-semibold ${debtRatio > 50 ? 'text-red-400' : debtRatio > 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {debtRatio.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">تاریخ ایجاد:</span>
                    <span className="text-white">
                      {PersianDateFormatter.format(new Date(representative.createdAt))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-300 text-sm">کل فروش</p>
                      <p className="text-2xl font-bold text-white">
                        {CurrencyFormatter.format(salesAmount).replace('IRR', 'تومان')}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-600/20 to-red-800/20 border-red-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-300 text-sm">کل بدهی</p>
                      <p className="text-2xl font-bold text-white">
                        {CurrencyFormatter.format(debtAmount).replace('IRR', 'تومان')}
                      </p>
                    </div>
                    <TrendingDown className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-300 text-sm">اعتبار</p>
                      <p className="text-2xl font-bold text-white">
                        {CurrencyFormatter.format(creditAmount).replace('IRR', 'تومان')}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Analysis */}
            <Card className="bg-black/30 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">تحلیل مالی</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-300">نسبت بدهی به فروش</span>
                      <span className="text-white">{debtRatio.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          debtRatio > 50 ? 'bg-red-500' : 
                          debtRatio > 25 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(debtRatio, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <p className="text-gray-300 text-sm">موجودی خالص</p>
                      <p className={`text-lg font-semibold ${
                        (salesAmount - debtAmount) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {CurrencyFormatter.format(salesAmount - debtAmount).replace('IRR', 'ت')}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <p className="text-gray-300 text-sm">درصد اعتبار</p>
                      <p className="text-blue-400 text-lg font-semibold">
                        {salesAmount > 0 ? ((creditAmount / salesAmount) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card className="bg-black/30 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Activity className="w-5 h-5 ml-2 text-purple-400" />
                  فعالیت‌های اخیر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">آخرین بروزرسانی</p>
                        <p className="text-gray-400 text-sm">
                          {PersianDateFormatter.format(new Date(representative.updatedAt))}
                        </p>
                      </div>
                      <Calendar className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">ایجاد حساب</p>
                        <p className="text-gray-400 text-sm">
                          {PersianDateFormatter.format(new Date(representative.createdAt))}
                        </p>
                      </div>
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <Card className="bg-black/30 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">تحلیل عملکرد</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border border-dashed border-white/20 rounded">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-400">نمودارهای تحلیل عملکرد</p>
                    <p className="text-gray-500 text-sm">به زودی...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}