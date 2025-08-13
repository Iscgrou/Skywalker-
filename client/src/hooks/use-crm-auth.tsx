// 🔐 CRM Authentication Hook - Dual Panel Support
import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CrmUser {
  id?: number;
  username: string;
  fullName?: string;
  role: 'ADMIN' | 'CRM' | 'CRM_MANAGER';
  panelType: 'ADMIN_PANEL' | 'CRM_PANEL';
  permissions: string[];
}

interface Permission {
  resource: string;
  actions: string[];
  restrictions: DataRestriction[];
}

interface DataRestriction {
  field: string;
  accessLevel: 'FULL' | 'LIMITED' | 'NONE';
  condition?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthContextType {
  user: CrmUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<any, Error, LoginCredentials>;
  logoutMutation: UseMutationResult<void, Error, void>;
  hasPermission: (resource: string, action: string) => boolean;
  hasAction: (action: string) => boolean; // unified resource.action style (align with server RBAC)
  isAdmin: boolean;
  isCrm: boolean;
}

export const CrmAuthContext = createContext<AuthContextType | null>(null);

export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<CrmUser | null, Error>({
    queryKey: ["/api/crm/auth/user"],
    queryFn: async () => {
      try {
        const result = await apiRequest("/api/crm/auth/user", { 
          method: "GET",
          credentials: 'include' // SHERLOCK v2.0 - Critical: Ensure cookies are sent
        });
        console.log('CRM Auth Check Result:', result); // Debug logging
        return result || null; // Ensure we never return undefined
      } catch (error: any) {
        console.log('CRM Auth Check Error:', error); // Debug logging
        if (error.message?.includes('401') || error.status === 401) {
          return null; // Not authenticated - return null instead of undefined
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 0, // No caching - always check authentication
    placeholderData: null, // Use null as placeholder 
    refetchOnWindowFocus: true, // Always recheck when window gets focus
    refetchOnMount: true, // Always check on mount
    refetchInterval: false // Don't auto-refetch in background
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      console.log('CRM Login Request:', credentials);
      const result = await apiRequest("/api/crm/auth/login", { 
        method: "POST", 
        data: credentials,
        credentials: 'include' // SHERLOCK v2.0 - Ensure cookies are set
      });
      console.log('CRM Login Success Response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('CRM Auth Success - Setting user data:', data.user);
      queryClient.setQueryData(["/api/crm/auth/user"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/crm/auth/user"] });
      
      // Don't show duplicate toast here - let the unified-auth page handle it
    },
    onError: (error: any) => {
      let errorMessage = "خطا در ورود به سیستم";
      
      if (error.status === 401) {
        errorMessage = "نام کاربری یا رمز عبور اشتباه است";
      } else if (error.status === 403) {
        errorMessage = "دسترسی به این پنل ندارید";
      } else if (error.status >= 500) {
        errorMessage = "خطای سرور - لطفاً دوباره تلاش کنید";
      }

      toast({
        title: "خطا در ورود",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/crm/auth/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/crm/auth/user"], null);
      queryClient.clear(); // Clear all cached data on logout
      
      toast({
        title: "خروج موفق",
        description: "با موفقیت از سیستم خارج شدید",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطا در خروج",
        description: "مشکل در خروج از سیستم",
        variant: "destructive",
      });
    },
  });

  // Helper function to check permissions
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(action) || user.permissions.includes('*');
    }
    return false;
  };

  const hasAction = (action: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true; // admin escalation
    if (Array.isArray(user.permissions)) {
      return user.permissions.includes(action) || user.permissions.includes('*');
    }
    return false;
  };

  const isAdmin = user?.role === 'ADMIN';
  const isCrm = user?.role === 'CRM' || user?.role === 'CRM_MANAGER';

  return (
    <CrmAuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
  hasPermission,
  hasAction,
        isAdmin,
        isCrm
      }}
    >
      {children}
    </CrmAuthContext.Provider>
  );
}

export function useCrmAuth() {
  const context = useContext(CrmAuthContext);
  if (!context) {
    throw new Error("useCrmAuth must be used within a CrmAuthProvider");
  }
  return context;
}

// HOC for protecting routes based on CRM authentication
export function withCrmAuth<T extends {}>(
  Component: React.ComponentType<T>,
  requiredRole?: 'ADMIN' | 'CRM'
) {
  return function AuthenticatedComponent(props: T) {
    const { user, isLoading } = useCrmAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">در حال بررسی احراز هویت...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = '/crm/auth';
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">دسترسی محدود</h2>
            <p className="text-muted-foreground">
              شما دسترسی به این بخش را ندارید
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}