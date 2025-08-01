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
  username: string;
  role: 'ADMIN' | 'CRM';
  panelType: 'ADMIN_PANEL' | 'CRM_PANEL';
  permissions: Permission[];
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
  } = useQuery<CrmUser | undefined, Error>({
    queryKey: ["/api/crm/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/crm/auth/user", { method: "GET" });
        return await response.json();
      } catch (error: any) {
        if (error.status === 401) {
          return undefined; // Not authenticated
        }
        throw error;
      }
    },
    retry: false
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiRequest("/api/crm/auth/login", { method: "POST", data: credentials });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/crm/auth/user"], data.user);
      
      toast({
        title: "ورود موفق",
        description: `به ${data.user.panelType === 'ADMIN_PANEL' ? 'پنل ادمین' : 'پنل CRM'} خوش آمدید`,
      });
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
    
    // Admin has full access
    if (user.role === 'ADMIN') return true;
    
    // Check specific permissions for CRM users
    const permission = user.permissions?.find(p => 
      p.resource === resource || p.resource === '*'
    );
    
    return permission ? permission.actions.includes(action) : false;
  };

  const isAdmin = user?.role === 'ADMIN';
  const isCrm = user?.role === 'CRM';

  return (
    <CrmAuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        hasPermission,
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