import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Layout components
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

// Pages
import Dashboard from "@/pages/dashboard";
import Representatives from "@/pages/representatives";
import RepresentativeDetails from "@/pages/representative-details";
import Invoices from "@/pages/invoices";
import Payments from "@/pages/payments";
import SalesPartners from "@/pages/sales-partners";
import Reports from "@/pages/reports";
import AiAssistant from "@/pages/ai-assistant";
import Settings from "@/pages/settings";
import PublicPortal from "@/pages/public-portal";
import NotFound from "@/pages/not-found";

function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Check if this is a public portal route
  const isPublicPortal = location.startsWith('/portal/');
  
  if (isPublicPortal) {
    return (
      <div className="dark">
        <Route path="/portal/:publicId" component={PublicPortal} />
      </div>
    );
  }
  
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/representatives" component={Representatives} />
        <Route path="/representatives/:code" component={RepresentativeDetails} />
        <Route path="/invoices" component={Invoices} />
        <Route path="/payments" component={Payments} />
        <Route path="/sales-partners" component={SalesPartners} />
        <Route path="/reports" component={Reports} />
        <Route path="/ai-assistant" component={AiAssistant} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="rtl">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
