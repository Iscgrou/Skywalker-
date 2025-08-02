// SHERLOCK v3.0 CRM DASHBOARD - Complete Refactored Architecture
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  Brain, 
  CheckSquare, 
  TrendingUp, 
  MessageSquare,
  Settings 
} from 'lucide-react';
import NewRepresentativesManager from './new-representatives-manager';
import EnhancedAIHelper from './enhanced-ai-helper';
import { TaskManagementPanel } from '@/components/task-management-panel';
import { PerformanceAnalyticsPanel } from '@/components/performance-analytics-panel';

export default function ModernCrmDashboard() {
  const [activeTab, setActiveTab] = useState('representatives');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            پنل مدیریت CRM - شرلوک v3.0
          </h1>
          <p className="text-gray-300">سیستم هوشمند مدیریت روابط مشتریان با فرهنگ ایرانی</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-black/30 border border-gray-700">
            <TabsTrigger value="representatives" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 ml-2" />
              مدیریت نمایندگان
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600">
              <BarChart3 className="w-4 h-4 ml-2" />
              تحلیل عملکرد
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-green-600">
              <CheckSquare className="w-4 h-4 ml-2" />
              مدیریت وظایف
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-orange-600">
              <Brain className="w-4 h-4 ml-2" />
              دستیار هوش مصنوعی
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-indigo-600">
              <TrendingUp className="w-4 h-4 ml-2" />
              داشبورد کلی
            </TabsTrigger>
          </TabsList>

          <TabsContent value="representatives" className="mt-6">
            <NewRepresentativesManager />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <PerformanceAnalyticsPanel />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <TaskManagementPanel />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <EnhancedAIHelper />
          </TabsContent>

          <TabsContent value="dashboard" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-black/30 border border-blue-500/30 rounded-lg p-6">
                <MessageSquare className="w-8 h-8 text-blue-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">سیستم یکپارچه</h3>
                <p className="text-gray-300">مدیریت کامل نمایندگان، وظایف و تحلیل عملکرد</p>
              </div>
              <div className="bg-black/30 border border-green-500/30 rounded-lg p-6">
                <Brain className="w-8 h-8 text-green-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">هوش مصنوعی</h3>
                <p className="text-gray-300">دستیار هوشمند با درک فرهنگ ایرانی</p>
              </div>
              <div className="bg-black/30 border border-purple-500/30 rounded-lg p-6">
                <TrendingUp className="w-8 h-8 text-purple-400 mb-4" />
                <h3 className="text-xl font-semibold mb-2">تحلیل پیشرفته</h3>
                <p className="text-gray-300">گزارش‌های جامع و تحلیل عملکرد</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}