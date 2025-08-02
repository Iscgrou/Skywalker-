import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User, Phone, Mail, MapPin, Save, X, AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface RepresentativeEditModalProps {
  representative: Representative | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<Representative>) => void;
  isLoading?: boolean;
}

export default function RepresentativeEditModal({ 
  representative, 
  isOpen, 
  onClose, 
  onSave,
  isLoading = false
}: RepresentativeEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<Representative>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (representative) {
      setFormData({
        name: representative.name,
        code: representative.code,
        ownerName: representative.ownerName,
        panelUsername: representative.panelUsername,
        phone: representative.phone,
        salesPartnerId: representative.salesPartnerId,
        isActive: representative.isActive,
        totalDebt: representative.totalDebt,
        totalSales: representative.totalSales,
        credit: representative.credit,
      });
      setErrors({});
    }
  }, [representative]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'نام نماینده الزامی است';
    }

    if (!formData.code?.trim()) {
      newErrors.code = 'کد نماینده الزامی است';
    }

    if (!formData.ownerName?.trim()) {
      newErrors.ownerName = 'نام مالک الزامی است';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'شماره تلفن الزامی است';
    } else if (!/^09\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'شماره تلفن معتبر نیست';
    }

    if (formData.totalDebt && isNaN(parseFloat(formData.totalDebt))) {
      newErrors.totalDebt = 'مقدار بدهی معتبر نیست';
    }

    if (formData.totalSales && isNaN(parseFloat(formData.totalSales))) {
      newErrors.totalSales = 'مقدار فروش معتبر نیست';
    }

    if (formData.credit && isNaN(parseFloat(formData.credit))) {
      newErrors.credit = 'مقدار اعتبار معتبر نیست';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!representative) return;
    
    if (validateForm()) {
      onSave(representative.id, formData);
    } else {
      toast({
        title: "خطا در اطلاعات",
        description: "لطفاً اطلاعات را بررسی کنید",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof Representative, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value || '0');
    return new Intl.NumberFormat('fa-IR').format(num);
  };

  if (!representative) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 to-black border-white/20" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <User className="w-8 h-8 text-blue-400" />
            ویرایش نماینده: {representative.name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-black/30 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">اطلاعات پایه</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-white">نام نماینده</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="نام کامل نماینده"
                  />
                  {errors.name && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 ml-1" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="code" className="text-white">کد نماینده</Label>
                  <Input
                    id="code"
                    value={formData.code || ''}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="کد یکتا"
                  />
                  {errors.code && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 ml-1" />
                      {errors.code}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ownerName" className="text-white">نام مالک</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName || ''}
                    onChange={(e) => handleInputChange('ownerName', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="نام مالک فروشگاه"
                  />
                  {errors.ownerName && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 ml-1" />
                      {errors.ownerName}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">شماره تلفن</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="09xxxxxxxxx"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 ml-1" />
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="panelUsername" className="text-white">نام کاربری پنل</Label>
                <Input
                  id="panelUsername"
                  value={formData.panelUsername || ''}
                  onChange={(e) => handleInputChange('panelUsername', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  placeholder="نام کاربری برای دسترسی به پنل"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div>
                  <Label className="text-white font-semibold">وضعیت فعالیت</Label>
                  <p className="text-gray-400 text-sm">آیا این نماینده فعال است؟</p>
                </div>
                <Switch
                  checked={formData.isActive || false}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card className="bg-black/30 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-lg">اطلاعات مالی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalSales" className="text-white">کل فروش (تومان)</Label>
                  <Input
                    id="totalSales"
                    value={formData.totalSales || ''}
                    onChange={(e) => handleInputChange('totalSales', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="0"
                    type="number"
                  />
                  {formData.totalSales && (
                    <p className="text-green-400 text-xs mt-1">
                      {formatCurrency(formData.totalSales)} تومان
                    </p>
                  )}
                  {errors.totalSales && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 ml-1" />
                      {errors.totalSales}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="totalDebt" className="text-white">کل بدهی (تومان)</Label>
                  <Input
                    id="totalDebt"
                    value={formData.totalDebt || ''}
                    onChange={(e) => handleInputChange('totalDebt', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="0"
                    type="number"
                  />
                  {formData.totalDebt && (
                    <p className="text-red-400 text-xs mt-1">
                      {formatCurrency(formData.totalDebt)} تومان
                    </p>
                  )}
                  {errors.totalDebt && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 ml-1" />
                      {errors.totalDebt}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="credit" className="text-white">اعتبار (تومان)</Label>
                  <Input
                    id="credit"
                    value={formData.credit || ''}
                    onChange={(e) => handleInputChange('credit', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="0"
                    type="number"
                  />
                  {formData.credit && (
                    <p className="text-blue-400 text-xs mt-1">
                      {formatCurrency(formData.credit)} تومان
                    </p>
                  )}
                  {errors.credit && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 ml-1" />
                      {errors.credit}
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              {formData.totalSales && formData.totalDebt && (
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-white font-semibold mb-2">خلاصه مالی:</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-300">موجودی خالص:</span>
                      <span className={`font-semibold mr-2 ${
                        (parseFloat(formData.totalSales) - parseFloat(formData.totalDebt)) >= 0 
                          ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency((parseFloat(formData.totalSales) - parseFloat(formData.totalDebt)).toString())} تومان
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-300">نسبت بدهی:</span>
                      <span className="text-yellow-400 font-semibold mr-2">
                        {((parseFloat(formData.totalDebt) / parseFloat(formData.totalSales)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <X className="w-4 h-4 ml-2" />
              لغو
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}