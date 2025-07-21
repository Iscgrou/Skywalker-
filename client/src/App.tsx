import { Switch, Route, useLocation } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

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
import AdminLogin from "@/pages/admin-login";
import NotFound from "@/pages/not-found";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <div className="main-content lg:mr-64 mr-0">
        <Header onMenuClick={toggleSidebar} />
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function AuthenticatedRouter() {
  const { isAuthenticated, isLoading, login } = useAuth();
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
  
  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }
  
  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={login} />;
  }
  
  // Show admin panel if authenticated
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
        <AuthProvider>
          <div className="rtl">
            <Toaster />
            <AuthenticatedRouter />
          </div>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
