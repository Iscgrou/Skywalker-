// SHERLOCK v3.0 CRM DASHBOARD - Complete Refactored Architecture
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Brain,
  Settings
} from 'lucide-react';
import NewRepresentativesManager from './new-representatives-manager';
import EnhancedAIHelper from './enhanced-ai-helper';
import { SettingsHub } from './settings/SettingsHub';


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
          <TabsList className="grid w-full grid-cols-3 bg-black/30 border border-gray-700">
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              <Settings className="w-4 h-4 ml-2" />
              تنظیمات
            </TabsTrigger>
            <TabsTrigger value="representatives" className="data-[state=active]:bg-purple-600">
              <Users className="w-4 h-4 ml-2" />
              مدیریت نمایندگان
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-orange-600">
              <Brain className="w-4 h-4 ml-2" />
              دستیار هوش مصنوعی
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="mt-6">
            <SettingsHub />
          </TabsContent>

          <TabsContent value="representatives" className="mt-6">
            <NewRepresentativesManager />
          </TabsContent>

          <TabsContent value="ai" className="mt-6">
            <EnhancedAIHelper />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}