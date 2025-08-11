// SHERLOCK v3.0 CRM DASHBOARD - Performance Optimized Architecture  
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Brain,
  Settings,
  Briefcase,
  LogOut,
  Lock
} from 'lucide-react';
import { lazy, Suspense } from 'react';
import { WorkspaceHub } from './workspace/WorkspaceHub';

// Lazy load heavy components to improve initial load time
const NewRepresentativesManager = lazy(() => import('./new-representatives-manager'));
const EnhancedAIHelper = lazy(() => import('./enhanced-ai-helper'));
const SettingsHub = lazy(() => import('./settings/SettingsHub').then(module => ({ default: module.SettingsHub })));
import { SettingsPasswordModal } from './settings/SettingsPasswordModal';
import { useCrmAuth } from '@/hooks/use-crm-auth';
import { useToast } from '@/hooks/use-toast';
import { useCrmManagerStatus } from '@/hooks/use-crm-manager-status';


export default function ModernCrmDashboard() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [isSettingsPasswordModalOpen, setIsSettingsPasswordModalOpen] = useState(false);
  const [hasSettingsAccess, setHasSettingsAccess] = useState(false);
  const { logoutMutation } = useCrmAuth();
  const { toast } = useToast();
  const manager = useCrmManagerStatus(10000);

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "خروج موفق",
          description: "با موفقیت از پنل CRM خارج شدید",
        });
        // The CRM auth context will automatically redirect to login
      },
      onError: () => {
        toast({
          title: "خطا در خروج",
          description: "خطایی در فرآیند خروج رخ داد",
          variant: "destructive",
        });
      }
    });
  };

  const handleTabChange = (newTab: string) => {
    if (newTab === 'settings') {
      if (!hasSettingsAccess) {
        setIsSettingsPasswordModalOpen(true);
        return;
      }
    }
    setActiveTab(newTab);
  };

  const handleSettingsPasswordSuccess = () => {
    setHasSettingsAccess(true);
    setActiveTab('settings');
  };

  const handleSettingsPasswordModalClose = () => {
    setIsSettingsPasswordModalOpen(false);
    // Keep current tab if user cancels password entry
  };

  // Re-open unlock modal when server signals 403 via custom event
  useEffect(() => {
    const handler = () => {
      setHasSettingsAccess(false);
      setIsSettingsPasswordModalOpen(true);
    };
    window.addEventListener('crm-manager-locked' as any, handler);
    return () => window.removeEventListener('crm-manager-locked' as any, handler);
  }, []);

  // Show warning toast when manager access is expiring soon
  useEffect(() => {
    const handler = (e: any) => {
      const remainingSeconds = Math.ceil(e.detail?.remainingMs / 1000);
      toast({
        title: "⏰ هشدار انقضای دسترسی",
        description: `دسترسی مدیر در ${remainingSeconds} ثانیه منقضی می‌شود`,
        variant: "destructive",
        action: (
          <Button 
            size="sm" 
            onClick={() => setIsSettingsPasswordModalOpen(true)}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            تمدید
          </Button>
        ),
      });
    };
    window.addEventListener('crm-manager-expiring-soon' as any, handler);
    return () => window.removeEventListener('crm-manager-expiring-soon' as any, handler);
  }, [toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                پنل مدیریت CRM - شرلوک v3.0
              </h1>
              <p className="text-gray-300">سیستم هوشمند مدیریت روابط مشتریان با فرهنگ ایرانی</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="bg-red-600/20 border-red-500 text-red-300 hover:bg-red-600/30 hover:text-red-200 transition-colors"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4 ml-2" />
              {logoutMutation.isPending ? 'خروج...' : 'خروج از پنل'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-black/30 border border-gray-700">
            <TabsTrigger value="workspace" className="data-[state=active]:bg-green-600">
              <Briefcase className="w-4 h-4 ml-2" />
              میز کار
            </TabsTrigger>
            <TabsTrigger value="representatives" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 ml-2" />
              مدیریت نمایندگان
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-orange-600">
              <Brain className="w-4 h-4 ml-2" />
              دستیار هوش مصنوعی
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className={`data-[state=active]:bg-blue-600 ${!hasSettingsAccess ? 'opacity-75' : ''}`}
            >
              {hasSettingsAccess ? (
                <Settings className="w-4 h-4 ml-2" />
              ) : (
                <Lock className="w-4 h-4 ml-2" />
              )}
              تنظیمات
              {!hasSettingsAccess && (
                <span className="text-xs bg-red-600 text-white px-1 rounded mr-1">محفوظ</span>
              )}
              {hasSettingsAccess && manager.unlocked && (
                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                  manager.isExpiringWarning 
                    ? 'bg-orange-600/80 text-orange-100 animate-pulse' 
                    : 'bg-blue-700/60 text-blue-100'
                }`}>
                  {manager.formatted}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workspace" className="mt-6">
            <WorkspaceHub />
          </TabsContent>

          <TabsContent value="representatives" className="mt-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <p className="text-white">بارگذاری مدیریت نمایندگان...</p>
                </div>
              </div>
            }>
              <NewRepresentativesManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400 mx-auto mb-4"></div>
                  <p className="text-white">بارگذاری دستیار هوش مصنوعی...</p>
                </div>
              </div>
            }>
              <EnhancedAIHelper />
            </Suspense>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                  <p className="text-white">بارگذاری تنظیمات...</p>
                </div>
              </div>
            }>
              <SettingsHub />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Password Protection Modal for Settings */}
        <SettingsPasswordModal
          isOpen={isSettingsPasswordModalOpen}
          onClose={handleSettingsPasswordModalClose}
          onSuccess={handleSettingsPasswordSuccess}
        />
      </div>
    </div>
  );
}