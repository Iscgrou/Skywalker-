import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InvoiceUpload from "@/components/invoice-upload";
import DebtorRepresentativesCard from "@/components/debtor-representatives-card";
import PrescriptiveTraceViewer from '@/components/prescriptive-trace-viewer';
import PrescriptiveExplainHistory from '@/components/prescriptive-explain-history';
import { formatCurrency, toPersianDigits } from "@/lib/persian-date";
import { Skeleton } from "@/components/ui/skeleton";
import CRMLayout from '@/components/layout/CRMLayout';
import CRMKPI from '@/components/crm/CRMKPI';
import PerformanceRing from '@/components/crm/PerformanceRing';
import InteractionTimeline from '@/components/crm/InteractionTimeline';
import AdaptiveFilterBar from '@/components/crm/AdaptiveFilterBar';
import CRMExplainDiffPanel from '@/components/crm/CRMExplainDiffPanel';

interface DashboardData {
  totalRevenue: string;
  totalDebt: string;
  activeRepresentatives: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalSalesPartners: number;
  unsentInvoices: number; // SHERLOCK v12.2: Add unsent invoices field
  recentActivities: Array<{
    id: number;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

// Replaced legacy StatCard + ActivityItem with CRMKPI + InteractionTimeline

export default function Dashboard() {
  const [showTrace, setShowTrace] = (require('react') as any).useState(false);
  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"]
  });

  const loadingSection = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({length:4}).map((_,i)=>(
        <div key={i} className="crm-kpi animate-pulse h-28" />
      ))}
    </div>
  );

  const kpis = dashboardData ? [
    { title:'کل درآمدها', value: formatCurrency(dashboardData.totalRevenue), unit:'تومان', delta: 4.2, series:[20,22,25,27,30,33,35] },
    { title:'مطالبات معوق', value: formatCurrency(dashboardData.totalDebt), unit:'تومان', delta: -1.8, series:[40,41,40,39,38,37,36], intent:'danger' as const },
    { title:'نمایندگان فعال', value: toPersianDigits(dashboardData.activeRepresentatives.toString()), delta: 2.1, series:[10,11,11,12,12,13,14], intent:'info' as const },
    { title:'فاکتورهای ارسال نشده', value: toPersianDigits((dashboardData.unsentInvoices||0).toString()), delta: 0.0, series:[5,5,5,5,6,5,5], intent:'warning' as const },
  ]: [];

  return (
    <CRMLayout
      sidebar={<div className="flex flex-col gap-4 text-[11px]">
        <AdaptiveFilterBar />
        <div className="crm-card p-3">
          <div className="text-[10px] text-[--crm-text-secondary] mb-2 font-medium">پایش زنده</div>
          <PerformanceRing value={0.72} secondary={0.84} anomaly={0.18} label="SLA" caption="7d" />
        </div>
      </div>}
      contextPanel={<div className="space-y-4">
        <div className="crm-card p-3">
          <div className="text-[10px] font-medium text-[--crm-text-secondary] mb-1">Trace</div>
          <button onClick={()=> setShowTrace((v:boolean)=>!v)} className="crm-chip w-full justify-center mb-2">{showTrace ? 'مخفی سازی' : 'نمایش'}</button>
          {showTrace && <div className="space-y-3">
            <PrescriptiveTraceViewer refreshMs={25000} />
            <PrescriptiveExplainHistory refreshMs={45000} limit={20} />
            <CRMExplainDiffPanel />
          </div>}
        </div>
      </div>}
    >
      <div className="space-y-6">
        {/* KPI Row */}
        {isLoading ? loadingSection : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpis.map(k => <CRMKPI key={k.title} {...k} />)}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="crm-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">آپلود و پردازش فاکتورها</h2>
              </div>
              <InvoiceUpload />
            </div>
            <div className="crm-card p-4">
              <h2 className="text-sm font-semibold mb-3">نمایندگان بدهکار</h2>
              <DebtorRepresentativesCard />
            </div>
          </div>
          <div className="space-y-6">
            <div className="crm-card p-4">
              <h2 className="text-sm font-semibold mb-3">فعالیت‌های اخیر</h2>
              <InteractionTimeline events={(dashboardData?.recentActivities||[]).map(a=>({
                id:a.id,
                time:a.createdAt,
                type:a.type.includes('invoice')?'invoice':a.type.includes('payment')?'payment':a.type.includes('representative')?'contact':'sync',
                title:a.description,
                description:'',
                meta:''
              }))} />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-[--crm-text-faint]">UI نسل جدید CRM - تم Aurora</p>
      </div>
    </CRMLayout>
  );
}
