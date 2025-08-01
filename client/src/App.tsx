import { Switch, Route, useLocation } from "wouter";
import { useState, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { CrmAuthProvider, useCrmAuth } from "./hooks/use-crm-auth";

// Layout components
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

// Pages
import Dashboard from "@/pages/dashboard";
import Representatives from "@/pages/representatives";
import RepresentativeDetails from "@/pages/representative-details";
import Invoices from "@/pages/invoices";
import InvoiceManagement from "@/pages/InvoiceManagement";
import PaymentManagement from "@/pages/PaymentManagement";
import Payments from "@/pages/payments";
import SalesPartners from "@/pages/sales-partners";
import Reports from "@/pages/reports";
import AiAssistant from "@/pages/ai-assistant";
import Settings from "@/pages/settings";
import PublicPortal from "@/pages/public-portal";
import AdminLogin from "@/pages/admin-login";
import NotFound from "@/pages/not-found";
import CrmAuth from "@/pages/crm-auth";
import CrmDashboard from "@/pages/crm-dashboard";
import RepresentativeProfile from "@/pages/representative-profile";
import RepresentativesList from "@/pages/representatives-list";
import CrmTasks from "@/pages/crm-tasks";
import CrmAnalytics from "@/pages/crm-analytics";
import CrmNotifications from "@/pages/crm-notifications";
import PerformanceAnalytics from "@/pages/performance-analytics";
import UnifiedAuth from "@/pages/unified-auth";

// CRM Protected Routes Component
function CrmProtectedRoutes() {
  const { user, isLoading } = useCrmAuth();
  const [, setLocation] = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">در حال بررسی احراز هویت CRM...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    setLocation('/');
    return null;
  }

  // Render CRM routes if authenticated
  return (
    <Switch>
      <Route path="/crm/dashboard" component={CrmDashboard} />
      <Route path="/crm/representatives" component={RepresentativesList} />
      <Route path="/crm/representatives/:id" component={RepresentativeProfile} />
      <Route path="/crm/tasks" component={CrmTasks} />
      <Route path="/crm/analytics" component={CrmAnalytics} />
      <Route path="/crm/performance-analytics" component={PerformanceAnalytics} />
      <Route path="/crm/ai-workspace" component={lazy(() => import('./components/crm/dynamic-ai-workspace'))} />
      <Route path="/crm/admin/ai-config" component={lazy(() => import('./components/crm/admin-ai-config'))} />
      <Route path="/crm/advanced-analytics" component={lazy(() => import('./components/crm/advanced-analytics'))} />
      <Route path="/crm/notifications" component={CrmNotifications} />
      <Route path="/crm/*" component={NotFound} />
    </Switch>
  );
}

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
  const isCrmRoute = location.startsWith('/crm/');
  
  if (isPublicPortal) {
    return (
      <div className="dark">
        <Switch>
          <Route path="/portal/:publicId" component={PublicPortal} />
          <Route path="/portal/*">
            {() => (
              <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-400 text-6xl mb-4">⚠</div>
                  <h1 className="text-2xl font-bold mb-2">پورتال یافت نشد</h1>
                  <p className="text-gray-400">
                    لینک پورتال نامعتبر است. لطفاً لینک صحیح را از مدیر سیستم دریافت کنید.
                  </p>
                </div>
              </div>
            )}
          </Route>
        </Switch>
      </div>
    );
  }

  // Handle CRM routes with authentication check
  if (isCrmRoute) {
    return (
      <CrmAuthProvider>
        <CrmProtectedRoutes />
      </CrmAuthProvider>
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
  
  // Show unified login page if not authenticated
  if (!isAuthenticated) {
    return (
      <CrmAuthProvider>
        <UnifiedAuth />
      </CrmAuthProvider>
    );
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
        <Route path="/invoice-management" component={InvoiceManagement} />
        <Route path="/payment-management" component={PaymentManagement} />
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
