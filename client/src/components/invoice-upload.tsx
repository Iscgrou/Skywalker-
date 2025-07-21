import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  Download,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";

interface ProcessedInvoice {
  id: number;
  invoiceNumber: string;
  representativeName: string;
  representativeCode: string;
  amount: string;
  issueDate: string;
  status: string;
  sentToTelegram: boolean;
}

interface UploadResult {
  success: boolean;
  created: number;
  invalid: number;
  invoices: ProcessedInvoice[];
  invalidRecords: any[];
}

export default function InvoiceUpload() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('usageFile', file);
      
      const response = await apiRequest('POST', '/api/invoices/generate', formData);
      return response.json();
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data);
      setUploadProgress(100);
      toast({
        title: "فایل با موفقیت پردازش شد",
        description: `${toPersianDigits(data.created.toString())} فاکتور ایجاد شد`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: "خطا در پردازش فایل",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const sendToTelegramMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      const response = await apiRequest('POST', '/api/invoices/send-telegram', {
        invoiceIds
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "ارسال به تلگرام",
        description: `${toPersianDigits(data.success.toString())} فاکتور با موفقیت ارسال شد`,
      });
      setUploadResult(prev => prev ? {
        ...prev,
        invoices: prev.invoices.map(inv => 
          selectedInvoices.includes(inv.id) 
            ? { ...inv, sentToTelegram: true }
            : inv
        )
      } : null);
      setSelectedInvoices([]);
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ارسال",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/json') {
      setUploadProgress(10);
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "نوع فایل نامعتبر",
        description: "لطفاً فقط فایل‌های JSON آپلود کنید",
        variant: "destructive",
      });
    }
  }, [uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleSelectAll = () => {
    if (!uploadResult) return;
    
    const unsentInvoices = uploadResult.invoices
      .filter(inv => !inv.sentToTelegram)
      .map(inv => inv.id);
      
    if (selectedInvoices.length === unsentInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(unsentInvoices);
    }
  };

  const handleInvoiceSelect = (invoiceId: number) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId)
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    );
  };

  const handleSendToTelegram = () => {
    if (selectedInvoices.length === 0) {
      toast({
        title: "هیچ فاکتوری انتخاب نشده",
        description: "لطفاً حداقل یک فاکتور برای ارسال انتخاب کنید",
        variant: "destructive",
      });
      return;
    }
    sendToTelegramMutation.mutate(selectedInvoices);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>تولید فاکتور از فایل JSON</span>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            آماده
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`upload-area ${isDragActive ? 'dragover' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {isDragActive 
              ? "فایل را اینجا رها کنید..."
              : "فایل JSON حاوی داده‌های مصرف را اینجا رها کنید"
            }
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            یا کلیک کنید تا فایل را انتخاب کنید
          </p>
          <Button disabled={uploadMutation.isPending}>
            {uploadMutation.isPending ? "در حال پردازش..." : "انتخاب فایل"}
          </Button>
        </div>

        {/* Upload Progress */}
        {uploadMutation.isPending && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>در حال پردازش فایل...</span>
              <span>{toPersianDigits(uploadProgress.toString())}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Processing Status */}
        {uploadResult && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">وضعیت پردازش</h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                <span>فایل JSON بارگذاری شد</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 ml-2" />
                <span>{toPersianDigits(uploadResult.created.toString())} فاکتور ایجاد شد</span>
              </div>
              {uploadResult.invalid > 0 && (
                <div className="flex items-center text-sm text-orange-600">
                  <AlertCircle className="w-4 h-4 ml-2" />
                  <span>{toPersianDigits(uploadResult.invalid.toString())} رکورد نامعتبر نادیده گرفته شد</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Generated Invoices List */}
        {uploadResult && uploadResult.invoices.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">
                فاکتورهای تولید شده ({toPersianDigits(uploadResult.invoices.length.toString())} فاکتور)
              </h3>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Button
                  size="sm"
                  onClick={handleSendToTelegram}
                  disabled={selectedInvoices.length === 0 || sendToTelegramMutation.isPending}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {sendToTelegramMutation.isPending 
                    ? "در حال ارسال..." 
                    : `ارسال ${toPersianDigits(selectedInvoices.length.toString())} فاکتور`
                  }
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="w-3 h-3 mr-1" />
                  دانلود گزارش
                </Button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center mb-4">
                <Checkbox
                  checked={
                    uploadResult.invoices
                      .filter(inv => !inv.sentToTelegram).length > 0 &&
                    selectedInvoices.length === 
                      uploadResult.invoices.filter(inv => !inv.sentToTelegram).length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                  انتخاب همه فاکتورهای ارسال نشده
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {uploadResult.invoices.map((invoice) => (
                  <div 
                    key={invoice.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <Checkbox
                        checked={selectedInvoices.includes(invoice.id)}
                        onCheckedChange={() => handleInvoiceSelect(invoice.id)}
                        disabled={invoice.sentToTelegram}
                      />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invoice.representativeName} ({invoice.representativeCode})
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          مبلغ: {formatCurrency(invoice.amount)} تومان
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 space-x-reverse">
                      {invoice.sentToTelegram ? (
                        <Badge className="invoice-status-paid">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          ارسال شده
                        </Badge>
                      ) : (
                        <Badge className="invoice-status-unpaid">
                          <Clock className="w-3 h-3 mr-1" />
                          در انتظار ارسال
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
