import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  BarChart3, 
  Users, 
  FileText, 
  CreditCard, 
  Handshake, 
  ChartBar, 
  Bot, 
  Settings, 
  Shield,
  LogOut,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "داشبورد", href: "/dashboard", icon: BarChart3 },
  { name: "نمایندگان", href: "/representatives", icon: Users },
  { name: "فاکتورها", href: "/invoices", icon: FileText },
  { name: "پرداخت‌ها", href: "/payments", icon: CreditCard },
  { name: "همکاران فروش", href: "/sales-partners", icon: Handshake },
  { name: "گزارشات", href: "/reports", icon: ChartBar },
  { name: "دستیار هوشمند", href: "/ai-assistant", icon: Bot },
  { name: "تنظیمات", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const [location] = useLocation();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "sidebar-nav fixed right-0 top-0 h-screen z-50 transform transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">MarFaNet</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">سیستم مدیریت مالی</p>
            </div>
          </div>
          
          {/* Close button for mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onToggle}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="mt-6 px-3 flex-1">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || 
                           (item.href === "/dashboard" && location === "/");
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "text-primary bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <item.icon className="ml-3 w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="absolute bottom-0 right-0 left-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">حسابدار اصلی</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">admin@marfanet.com</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
