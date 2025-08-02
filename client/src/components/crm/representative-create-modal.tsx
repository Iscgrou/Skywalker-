import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { User, Phone, Mail, MapPin, CreditCard, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RepresentativeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export default function RepresentativeCreateModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false
}: RepresentativeCreateModalProps) {
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    isActive: true,
    credit: '0',
    description: ''
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.code || !formData.name || !formData.ownerName) {
      toast({
        title: "خطا در ورودی",
        description: "لطفاً فیلدهای الزامی را تکمیل کنید",
        variant: "destructive"
      });
      return;
    }

    if (formData.phone && !/^09\d{9}$/.test(formData.phone)) {
      toast({
        title: "خطا در شماره تماس",
        description: "شماره تماس باید با 09 شروع شده و 11 رقم باشد",
        variant: "destructive"
      });
      return;
    }

    try {
      await onSave(formData);
      
      toast({
        title: "موفقیت",
        description: "نماینده جدید با موفقیت ایجاد شد"
      });
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        ownerName: '',
        phone: '',
        email: '',
        address: '',
        isActive: true,
        credit: '0',
        description: ''
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در ایجاد نماینده جدید",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center">
            <User className="w-6 h-6 ml-2 text-green-400" />
            افزودن نماینده جدید
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Information */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-white mb-3">اطلاعات پایه</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code" className="text-gray-300">کد نماینده *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="مثال: REP001"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="name" className="text-gray-300">نام نمایندگی *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="نام نمایندگی"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ownerName" className="text-gray-300">نام مالک *</Label>
                <Input
                  id="ownerName"
                  value={formData.ownerName}
                  onChange={(e) => handleInputChange('ownerName', e.target.value)}
                  placeholder="نام کامل مالک نمایندگی"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-white mb-3">اطلاعات تماس</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone" className="text-gray-300 flex items-center">
                    <Phone className="w-4 h-4 ml-1" />
                    شماره تماس
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="09123456789"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email" className="text-gray-300 flex items-center">
                    <Mail className="w-4 h-4 ml-1" />
                    ایمیل
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="example@email.com"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address" className="text-gray-300 flex items-center">
                  <MapPin className="w-4 h-4 ml-1" />
                  آدرس
                </Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="آدرس کامل نمایندگی"
                  className="bg-slate-700 border-slate-600 text-white"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Settings */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-white mb-3">تنظیمات مالی</h3>
              
              <div>
                <Label htmlFor="credit" className="text-gray-300 flex items-center">
                  <CreditCard className="w-4 h-4 ml-1" />
                  اعتبار اولیه (ریال)
                </Label>
                <Input
                  id="credit"
                  type="number"
                  value={formData.credit}
                  onChange={(e) => handleInputChange('credit', e.target.value)}
                  placeholder="0"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive" className="text-gray-300">وضعیت فعال</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <Label htmlFor="description" className="text-gray-300">توضیحات</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="توضیحات اضافی درباره نماینده"
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <X className="w-4 h-4 ml-1" />
            لغو
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 ml-1" />
            {isLoading ? 'در حال ذخیره...' : 'ذخیره نماینده'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}