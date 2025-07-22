import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Always authenticated
  const [isLoading, setIsLoading] = useState(false); // No loading needed

  const checkAuth = async () => {
    // Authentication disabled for cross-environment deployment
    setIsAuthenticated(true);
    setIsLoading(false);
  };

  const login = () => {
    // Always authenticated in open access mode
    setIsAuthenticated(true);
  };

  const logout = async () => {
    // No logout needed in open access mode
    setIsAuthenticated(true);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}