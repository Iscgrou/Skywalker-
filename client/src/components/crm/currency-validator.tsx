// 💰 CURRENCY VALIDATION COMPONENT - DA VINCI v9.0 Phase 1 Enhancement
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CurrencyFormatter } from '@/lib/currency-formatter';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface CurrencyValidatorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  context: 'debt' | 'payment' | 'sales';
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  userId?: string;
}

export default function CurrencyValidator({
  label,
  value,
  onChange,
  context,
  placeholder = "مبلغ را وارد کنید",
  disabled = false,
  required = false,
  userId
}: CurrencyValidatorProps) {
  const [validation, setValidation] = useState<{ isValid: boolean; error?: string; warnings?: string[] }>({ isValid: true });
  const [auditInfo, setAuditInfo] = useState<any>(null);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    if (!inputValue.trim()) {
      setValidation({ isValid: true });
      setAuditInfo(null);
      return;
    }

    // Basic validation
    const basicValidation = CurrencyFormatter.validateCurrencyInput(inputValue);
    
    if (!basicValidation.isValid) {
      setValidation(basicValidation);
      return;
    }

    // Business validation
    const businessValidation = CurrencyFormatter.validateBusinessCurrency(inputValue, context);
    setValidation(businessValidation);

    // Audit trail
    if (userId) {
      const auditResult = CurrencyFormatter.parseWithAuditTrail(inputValue, userId);
      setAuditInfo(auditResult);
    }
  };

  const getContextLabel = (context: string) => {
    switch (context) {
      case 'debt': return 'بدهی';
      case 'payment': return 'پرداخت';
      case 'sales': return 'فروش';
      default: return 'مالی';
    }
  };

  const formatPreview = () => {
    if (!value || !validation.isValid) return null;
    
    try {
      const formatted = CurrencyFormatter.formatForCRM(value);
      return (
        <div className="text-sm text-muted-foreground mt-1">
          پیش‌نمایش: <span className="font-medium">{formatted}</span>
        </div>
      );
    } catch (error) {
      return null;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={`currency-${context}`} className={required ? 'after:content-["*"] after:text-red-500' : ''}>
          {label}
        </Label>
        <Badge variant="outline" className="text-xs">
          {getContextLabel(context)}
        </Badge>
      </div>
      
      <Input
        id={`currency-${context}`}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={!validation.isValid ? 'border-red-500' : validation.warnings ? 'border-orange-400' : ''}
        dir="rtl"
      />

      {formatPreview()}

      {/* Validation Errors */}
      {!validation.isValid && validation.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validation.error}</AlertDescription>
        </Alert>
      )}

      {/* Business Warnings */}
      {validation.isValid && validation.warnings && validation.warnings.length > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {validation.isValid && value && !validation.warnings && (
        <div className="flex items-center gap-2 text-green-600 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          <span>مقدار معتبر</span>
        </div>
      )}

      {/* Audit Information (Development Mode) */}
      {auditInfo && process.env.NODE_ENV === 'development' && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">اطلاعات audit</summary>
          <div className="mt-1 space-y-1">
            <div>فرمت ورودی: {auditInfo.auditInfo.inputFormat}</div>
            <div>زمان: {new Date(auditInfo.auditInfo.timestamp).toLocaleString('fa-IR')}</div>
            <div>نسبت تبدیل: {auditInfo.auditInfo.conversionRatio}</div>
          </div>
        </details>
      )}
    </div>
  );
}