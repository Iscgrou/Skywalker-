import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, 
  Search, 
  Filter, 
  Send, 
  Download, 
  Eye, 
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, toPersianDigits, isOverdue } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";

interface Invoice {
  id: number;
  invoiceNumber: string;
  representativeId: number;
  amount: string;
  issueDate: string;
  dueDate: string;
  status: string;
  sentToTelegram: boolean;
  telegramSentAt: string | null;
  telegramSendCount?: number;
  createdAt: string;
  // Additional fields from join
  representativeName?: string;
  representativeCode?: string;
  panelUsername?: string;
}

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [telegramFilter, setTelegramFilter] = useState<string>("all");
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices/with-batch-info"]
  });

  const { data: representatives } = useQuery({
    queryKey: ["/api/representatives"]
  });

  const sendToTelegramMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      const response = await apiRequest('/api/invoices/send-telegram', {
        method: 'POST',
        data: { invoiceIds }
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "ارسال به تلگرام",
        description: `${toPersianDigits(data.success.toString())} فاکتور با موفقیت ارسال شد`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/with-batch-info'] });
      setSelectedInvoices([]);
      setIsSendDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطا در ارسال",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const filteredInvoices = invoices?.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.representativeName && invoice.representativeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (invoice.representativeCode && invoice.representativeCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    const matchesTelegram = 
      telegramFilter === "all" || 
      (telegramFilter === "sent" && invoice.sentToTelegram) ||
      (telegramFilter === "unsent" && !invoice.sentToTelegram);
    
    return matchesSearch && matchesStatus && matchesTelegram;
  }) || [];

  // Pagination calculations
  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedInvoices([]);
  }, [searchTerm, statusFilter, telegramFilter]);

  const handleSelectAll = () => {
    const currentPageInvoiceIds = paginatedInvoices.map(inv => inv.id);
      
    if (currentPageInvoiceIds.every(id => selectedInvoices.includes(id))) {
      setSelectedInvoices(prev => prev.filter(id => !currentPageInvoiceIds.includes(id)));
    } else {
      setSelectedInvoices(prev => Array.from(new Set([...prev, ...currentPageInvoiceIds])));
    }
  };

  const handleInvoiceSelect = (invoiceId: number, isSelected: boolean) => {
    if (isSelected) {
      setSelectedInvoices(prev => [...prev, invoiceId]);
    } else {
      setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
    }
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
    setIsSendDialogOpen(true);
  };

  const handleSingleInvoiceSend = (invoiceId: number) => {
    sendToTelegramMutation.mutate([invoiceId]);
  };

  const handleSendAllUnsent = () => {
    const unsentInvoices = filteredInvoices
      .filter(inv => !inv.sentToTelegram)
      .map(inv => inv.id);
    
    if (unsentInvoices.length > 0) {
      sendToTelegramMutation.mutate(unsentInvoices);
      setSelectedInvoices([]);
    } else {
      toast({
        title: "هیچ فاکتور ارسال نشده‌ای وجود ندارد",
        description: "تمام فاکتورها قبلاً به تلگرام ارسال شده‌اند",
        variant: "destructive",
      });
    }
  };

  const getInvoiceStatusBadge = (invoice: Invoice) => {
    if (invoice.status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">پرداخت شده</Badge>;
    }
    if (invoice.status === 'overdue' || (invoice.dueDate && isOverdue(invoice.dueDate))) {
      return <Badge variant="destructive">سررسید گذشته</Badge>;
    }
    return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">پرداخت نشده</Badge>;
  };

  const getStats = () => {
    if (!invoices) return { total: 0, paid: 0, unpaid: 0, overdue: 0, unsent: 0 };
    
    const total = invoices.length;
    const paid = invoices.filter(inv => inv.status === 'paid').length;
    const unpaid = invoices.filter(inv => inv.status === 'unpaid').length;
    const overdue = invoices.filter(inv => 
      inv.status === 'overdue' || (inv.dueDate && isOverdue(inv.dueDate))
    ).length;
    const unsent = invoices.filter(inv => !inv.sentToTelegram).length;
    
    return { total, paid, unpaid, overdue, unsent };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 space-x-reverse">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">فاکتورها</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            مدیریت فاکتورها و ارسال به تلگرام
          </p>
        </div>
        
        <div className="flex items-center space-x-4 space-x-reverse">
          <Button 
            onClick={handleSendToTelegram}
            disabled={selectedInvoices.length === 0 || sendToTelegramMutation.isPending}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Send className="w-4 h-4 mr-2" />
            ارسال {toPersianDigits(selectedInvoices.length.toString())} فاکتور به تلگرام
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">کل فاکتورها</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {toPersianDigits(stats.total.toString())}
                </p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">پرداخت شده</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {toPersianDigits(stats.paid.toString())}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">پرداخت نشده</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                  {toPersianDigits(stats.unpaid.toString())}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">سررسید گذشته</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {toPersianDigits(stats.overdue.toString())}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">ارسال نشده</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {toPersianDigits(stats.unsent.toString())}
                </p>
              </div>
              <Send className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="جستجو بر اساس شماره فاکتور، نماینده..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pr-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="وضعیت فاکتور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="unpaid">پرداخت نشده</SelectItem>
                <SelectItem value="paid">پرداخت شده</SelectItem>
                <SelectItem value="overdue">سررسید گذشته</SelectItem>
              </SelectContent>
            </Select>

            <Select value={telegramFilter} onValueChange={(value) => {
              setTelegramFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="وضعیت تلگرام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="sent">ارسال شده</SelectItem>
                <SelectItem value="unsent">ارسال نشده</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 ml-2" />
              فاکتورها ({toPersianDigits(filteredInvoices.length.toString())} - صفحه {toPersianDigits(currentPage.toString())} از {toPersianDigits(totalPages.toString())})
            </CardTitle>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  checked={
                    filteredInvoices.length > 0 &&
                    selectedInvoices.length === filteredInvoices.length
                  }
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  انتخاب همه ({toPersianDigits(paginatedInvoices.length.toString())})
                </span>
              </div>
              
              {selectedInvoices.length > 0 && (
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Button
                    size="sm"
                    onClick={() => setIsSendDialogOpen(true)}
                    disabled={sendToTelegramMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className="w-4 h-4 ml-1" />
                    ارسال {toPersianDigits(selectedInvoices.length.toString())} فاکتور به تلگرام
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSendAllUnsent}
                    disabled={sendToTelegramMutation.isPending}
                  >
                    <Send className="w-4 h-4 ml-1" />
                    ارسال تمام فاکتورهای ارسال نشده
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">انتخاب</TableHead>
                <TableHead>شماره فاکتور</TableHead>
                <TableHead>نماینده</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>تاریخ صدور</TableHead>
                <TableHead>سررسید</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>تلگرام</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedInvoices.includes(invoice.id)}
                      onCheckedChange={(checked) => 
                        handleInvoiceSelect(invoice.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {invoice.representativeName || 'نامشخص'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {invoice.representativeCode}
                      </div>
                      {invoice.panelUsername && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {invoice.panelUsername}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    {formatCurrency(invoice.amount)} تومان
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="w-4 h-4 ml-1 text-gray-400" />
                      {invoice.issueDate}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {invoice.dueDate ? (
                      <div className={`text-sm ${
                        isOverdue(invoice.dueDate) 
                          ? 'text-red-600 dark:text-red-400 font-medium' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {invoice.dueDate}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {getInvoiceStatusBadge(invoice)}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <Badge variant={invoice.sentToTelegram ? "default" : "secondary"}>
                        {invoice.sentToTelegram 
                          ? `ارسال شده ${invoice.telegramSendCount ? `(${toPersianDigits(invoice.telegramSendCount.toString())} بار)` : ''}`
                          : "ارسال نشده"
                        }
                      </Badge>
                      {invoice.telegramSentAt && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          آخرین ارسال: {new Date(invoice.telegramSentAt).toLocaleString('fa-IR')}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={invoice.sentToTelegram ? "secondary" : "outline"}
                        onClick={() => handleSingleInvoiceSend(invoice.id)}
                        disabled={sendToTelegramMutation.isPending}
                        className={invoice.sentToTelegram ? 
                          "border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950" : 
                          ""
                        }
                      >
                        <Send className="w-4 h-4 ml-1" />
                        {invoice.sentToTelegram ? "ارسال مجدد" : "ارسال"}
                      </Button>
                      
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronRight className="w-4 h-4" />
                قبلی
              </Button>
              
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {toPersianDigits(page.toString())}
                    </Button>
                  );
                })}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                بعدی
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Confirmation Dialog */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="rtl max-w-md">
          <DialogHeader>
            <DialogTitle>تأیید ارسال به تلگرام</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const selectedInvoiceData = filteredInvoices.filter(inv => selectedInvoices.includes(inv.id));
              const newSends = selectedInvoiceData.filter(inv => !inv.sentToTelegram);
              const resends = selectedInvoiceData.filter(inv => inv.sentToTelegram);
              
              return (
                <>
                  <div className="text-gray-600 dark:text-gray-400">
                    {newSends.length > 0 && resends.length > 0 ? (
                      <p>
                        آیا مطمئن هستید که می‌خواهید {toPersianDigits(newSends.length.toString())} فاکتور جدید و {toPersianDigits(resends.length.toString())} فاکتور مجددا به تلگرام ارسال کنید؟
                      </p>
                    ) : resends.length > 0 ? (
                      <p>
                        آیا مطمئن هستید که می‌خواهید {toPersianDigits(resends.length.toString())} فاکتور را مجددا به تلگرام ارسال کنید؟
                      </p>
                    ) : (
                      <p>
                        آیا مطمئن هستید که می‌خواهید {toPersianDigits(newSends.length.toString())} فاکتور را به تلگرام ارسال کنید؟
                      </p>
                    )}
                  </div>
                  
                  {newSends.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 dark:text-green-200 mb-2">
                        فاکتورهای جدید ({toPersianDigits(newSends.length.toString())}):
                      </h4>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {newSends.map(inv => (
                          <div key={inv.id} className="text-sm text-green-800 dark:text-green-300">
                            • {inv.invoiceNumber} - {inv.representativeName} ({formatCurrency(inv.amount)} ت)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {resends.length > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                      <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">
                        فاکتورهای ارسال مجدد ({toPersianDigits(resends.length.toString())}):
                      </h4>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {resends.map(inv => (
                          <div key={inv.id} className="text-sm text-orange-800 dark:text-orange-300">
                            • {inv.invoiceNumber} - {inv.representativeName} (ارسال #{toPersianDigits((inv.telegramSendCount || 0) + 1)})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            
            <div className="flex justify-end space-x-2 space-x-reverse">
              <Button 
                variant="outline" 
                onClick={() => setIsSendDialogOpen(false)}
              >
                انصراف
              </Button>
              <Button 
                onClick={() => sendToTelegramMutation.mutate(selectedInvoices)}
                disabled={sendToTelegramMutation.isPending}
              >
                {sendToTelegramMutation.isPending ? "در حال ارسال..." : "ارسال"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
